
const { pool } = require('../database');

// CONSULTAR PAGAMENTO DO PEDIDO
exports.consultarPagamento = async (req, res) => {
    const usuario = req.session?.usuario;
    const idPedido = Number(req.params.id);

    if (!usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Faça login para continuar.'
        });
    }

    if (!Number.isSafeInteger(idPedido) || idPedido <= 0) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Pedido inválido.'
        });
    }

    try {
        const resultado = await pool.query(
            `SELECT
                p.id_pedido,
                p.status_pedido,
                COALESCE(
                    SUM(phi.quantidade * phi.preco_unitario),
                    0
                ) AS valor_total,
                pg.status_pagamento
             FROM public.pedido p
             LEFT JOIN public.pedido_has_ingresso phi
                ON phi.pedido_id_pedido = p.id_pedido
             LEFT JOIN public.pagamento pg
                ON pg.pedido_id_pedido = p.id_pedido
             WHERE p.id_pedido = $1
               AND p.cliente_pessoa_cpf_pessoa = $2
             GROUP BY
                p.id_pedido,
                pg.status_pagamento`,
            [idPedido, usuario.cpf_pessoa]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        return res.json({
            sucesso: true,
            pedido: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao consultar pagamento:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar pagamento.'
        });
    }
};

// REGISTRAR PAGAMENTO 
exports.registrarPagamento = async (req, res) => {
    const usuario = req.session?.usuario;
    const idPedido = Number(req.params.id);
    const formasPagamento = req.body?.formasPagamento;

    if (!usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Faça login para continuar.'
        });
    }

    if (!Number.isSafeInteger(idPedido) || idPedido <= 0) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Pedido inválido.'
        });
    }

    if (
        !Array.isArray(formasPagamento) ||
        formasPagamento.length === 0
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Selecione uma forma de pagamento.'
        });
    }

    const formas = [];
    const ids = new Set();

    for (const forma of formasPagamento) {
        const id = Number(forma.id_forma_pagamento);
        const valor = Number(forma.valor);

        if (
            !Number.isSafeInteger(id) ||
            id <= 0 ||
            !Number.isFinite(valor) ||
            valor <= 0 ||
            ids.has(id)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Confira as formas e valores do pagamento.'
            });
        }

        ids.add(id);
        formas.push({
            id,
            centavos: Math.round(valor * 100)
        });
    }

    const conexao = await pool.connect();

    try {
        await conexao.query('BEGIN');

        // BLOQUEAR PEDIDO DURANTE A OPERAÇÃO
        const resultadoPedido = await conexao.query(
            `SELECT id_pedido, status_pedido
             FROM public.pedido
             WHERE id_pedido = $1
               AND cliente_pessoa_cpf_pessoa = $2
             FOR UPDATE`,
            [idPedido, usuario.cpf_pessoa]
        );

        if (!resultadoPedido.rows.length) {
            await conexao.query('ROLLBACK');

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        if (resultadoPedido.rows[0].status_pedido !== 'Pendente') {
            await conexao.query('ROLLBACK');

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este pedido não está pendente.'
            });
        }

        const pagamentoExistente = await conexao.query(
            `SELECT pedido_id_pedido
             FROM public.pagamento
             WHERE pedido_id_pedido = $1`,
            [idPedido]
        );

        if (pagamentoExistente.rows.length) {
            await conexao.query('ROLLBACK');

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este pedido já possui pagamento registrado.'
            });
        }

        // TOTAL CALCULADO NO BANCO
        const resultadoTotal = await conexao.query(
            `SELECT
                COALESCE(
                    SUM(quantidade * preco_unitario),
                    0
                ) AS total
             FROM public.pedido_has_ingresso
             WHERE pedido_id_pedido = $1`,
            [idPedido]
        );

        const total = Number(resultadoTotal.rows[0].total);
        const totalCentavos = Math.round(total * 100);

        if (!Number.isFinite(total) || totalCentavos <= 0) {
            throw new Error('Total do pedido inválido.');
        }

        const somaCentavos = formas.reduce(
            (soma, forma) => soma + forma.centavos,
            0
        );

        if (somaCentavos !== totalCentavos) {
            await conexao.query('ROLLBACK');

            return res.status(400).json({
                sucesso: false,
                mensagem: 'A soma dos pagamentos deve ser igual ao total do pedido.'
            });
        }

        // VALIDAR FORMAS EXISTENTES
        const formasBanco = await conexao.query(
            `SELECT id_forma_pagamento
             FROM public.forma_pagamento
             WHERE id_forma_pagamento = ANY($1::INTEGER[])`,
            [formas.map(forma => forma.id)]
        );

        if (formasBanco.rows.length !== formas.length) {
            await conexao.query('ROLLBACK');

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Forma de pagamento não encontrada.'
            });
        }

        // CRIAR REGISTRO DE PAGAMENTO
        await conexao.query(
            `INSERT INTO public.pagamento (
                pedido_id_pedido,
                data_pagamento,
                valor_total_pagamento,
                status_pagamento
             )
             VALUES ($1, CURRENT_TIMESTAMP, $2, 'Aprovado')`,
            [idPedido, total.toFixed(2)]
        );

        // REGISTRAR FORMAS UTILIZADAS
        for (const forma of formas) {
            await conexao.query(
                `INSERT INTO public.pagamento_has_forma_pagamento (
                    pagamento_id_pedido,
                    forma_pagamento_id_forma_pagamento,
                    valor_pago
                 )
                 VALUES ($1, $2, $3)`,
                [
                    idPedido,
                    forma.id,
                    (forma.centavos / 100).toFixed(2)
                ]
            );
        }

        // ATUALIZAR STATUS DO PEDIDO
        await conexao.query(
            `UPDATE public.pedido
             SET status_pedido = 'Aprovado'
             WHERE id_pedido = $1`,
            [idPedido]
        );

        await conexao.query('COMMIT');

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Pagamento registrado com sucesso!',
            id_pedido: idPedido,
            valor_total: total,
            status_pagamento: 'Aprovado'
        });

    } catch (erro) {
        await conexao.query('ROLLBACK').catch(console.error);

        console.error('Erro ao registrar pagamento:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao registrar pagamento.'
        });

    } finally {
        conexao.release();
    }
};
