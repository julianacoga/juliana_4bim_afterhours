
const { query, pool } = require('../database');

// LISTAR PEDIDOS
exports.listarPedidos = async (req, res) => {
    try {
        const resultado = await query(`
            SELECT
                p.*,
                COUNT(phi.ingresso_id_ingresso)::INTEGER AS total_itens,
                COALESCE(
                    SUM(phi.quantidade * phi.preco_unitario),
                    0
                ) AS valor_total
            FROM public.pedido p
            LEFT JOIN public.pedido_has_ingresso phi
                ON phi.pedido_id_pedido = p.id_pedido
            GROUP BY p.id_pedido
            ORDER BY p.data_pedido DESC
        `);

        return res.status(200).json({
            sucesso: true,
            pedidos: resultado.rows
        });

    } catch (erro) {
        console.error('Erro ao listar pedidos:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar pedidos.'
        });
    }
};

// BUSCAR PEDIDO E SEUS ITENS
exports.obterPedido = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID do pedido inválido.'
            });
        }

        const pedido = await query(`
            SELECT *
            FROM public.pedido
            WHERE id_pedido = $1
        `, [id]);

        if (pedido.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        const itens = await query(`
            SELECT
                phi.ingresso_id_ingresso,
                phi.quantidade,
                phi.preco_unitario,
                i.nome_ingresso,
                e.titulo_evento
            FROM public.pedido_has_ingresso phi
            JOIN public.ingresso i
                ON i.id_ingresso = phi.ingresso_id_ingresso
            JOIN public.evento e
                ON e.id_evento = i.evento_id_evento
            WHERE phi.pedido_id_pedido = $1
            ORDER BY i.nome_ingresso
        `, [id]);

        return res.status(200).json({
            sucesso: true,
            pedido: pedido.rows[0],
            itens: itens.rows
        });

    } catch (erro) {
        console.error('Erro ao buscar pedido:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar pedido.'
        });
    }
};

// VALIDAR INGRESSOS
function validarCarrinho(ingressos) {
    if (!Array.isArray(ingressos) || ingressos.length === 0) {
        return {
            valido: false,
            mensagem: 'Informe pelo menos um ingresso.'
        };
    }

    const ids = new Set();
    const itens = [];

    for (const item of ingressos) {
        const id = Number(item?.ingresso_id_ingresso);
        const quantidade = Number(item?.quantidade);

        if (
            !Number.isSafeInteger(id) ||
            id <= 0 ||
            !Number.isSafeInteger(quantidade) ||
            quantidade <= 0 ||
            ids.has(id)
        ) {
            return {
                valido: false,
                mensagem: 'Confira os ingressos e suas quantidades. Não repita ingressos.'
            };
        }

        ids.add(id);

        itens.push({
            ingresso_id_ingresso: id,
            quantidade
        });
    }

    return {
        valido: true,
        itens
    };
}

// VALIDAR CLIENTE, FUNCIONÁRIO E INGRESSOS
async function validarDados(cliente, funcionario, ingressos) {
    if (!cliente) {
        return {
            valido: false,
            mensagem: 'Informe o CPF do cliente.'
        };
    }

    const cpfCliente = String(cliente).trim();

    const cpfFuncionario = funcionario
        ? String(funcionario).trim()
        : null;

    if (
        !/^\d{11}$/.test(cpfCliente) ||
        (
            cpfFuncionario !== null &&
            !/^\d{11}$/.test(cpfFuncionario)
        )
    ) {
        return {
            valido: false,
            mensagem: 'Informe CPFs válidos.'
        };
    }

    const validacao = validarCarrinho(ingressos);

    if (!validacao.valido) {
        return validacao;
    }

    const pessoas = await query(`
        SELECT
            EXISTS (
                SELECT 1
                FROM public.cliente
                WHERE pessoa_cpf_pessoa = $1
            ) AS cliente_existe,

            EXISTS (
                SELECT 1
                FROM public.funcionario
                WHERE pessoa_cpf_pessoa = $2
            ) AS funcionario_existe
    `, [cpfCliente, cpfFuncionario]);

    if (!pessoas.rows[0].cliente_existe) {
        return {
            valido: false,
            mensagem: 'O CPF informado não está cadastrado como cliente.'
        };
    }

    if (
        cpfFuncionario !== null &&
        !pessoas.rows[0].funcionario_existe
    ) {
        return {
            valido: false,
            mensagem: 'O CPF informado não está cadastrado como funcionário.'
        };
    }

    const ids = validacao.itens.map(
        item => item.ingresso_id_ingresso
    );

    const encontrados = await query(`
        SELECT id_ingresso
        FROM public.ingresso
        WHERE id_ingresso = ANY($1::INTEGER[])
    `, [ids]);

    if (encontrados.rows.length !== ids.length) {
        return {
            valido: false,
            mensagem: 'Um ou mais ingressos não foram encontrados.'
        };
    }

    return {
        valido: true,
        cpfCliente,
        cpfFuncionario,
        itens: validacao.itens
    };
}

// VALIDAR STATUS
function validarStatus(status) {
    return [
        'Pendente',
        'Confirmado',
        'Aprovado',
        'Cancelado'
    ].includes(status);
}

// CADASTRAR PEDIDO
exports.criarPedido = async (req, res) => {
    let conexao;

    try {
        const {
            cliente_pessoa_cpf_pessoa,
            funcionario_pessoa_cpf_pessoa,
            status_pedido = 'Pendente',
            ingressos
        } = req.body;

        if (!validarStatus(status_pedido)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Status inválido.'
            });
        }

        const validacao = await validarDados(
            cliente_pessoa_cpf_pessoa,
            funcionario_pessoa_cpf_pessoa,
            ingressos
        );

        if (!validacao.valido) {
            return res.status(400).json({
                sucesso: false,
                mensagem: validacao.mensagem
            });
        }

        conexao = await pool.connect();

        await conexao.query('BEGIN');

        const resultado = await conexao.query(`
            INSERT INTO public.pedido (
                cliente_pessoa_cpf_pessoa,
                funcionario_pessoa_cpf_pessoa,
                status_pedido
            )
            VALUES ($1, $2, $3)
            RETURNING id_pedido
        `, [
            validacao.cpfCliente,
            validacao.cpfFuncionario,
            status_pedido
        ]);

        const idPedido = resultado.rows[0].id_pedido;

        for (const item of validacao.itens) {
            const resultadoItem = await conexao.query(`
                INSERT INTO public.pedido_has_ingresso (
                    ingresso_id_ingresso,
                    pedido_id_pedido,
                    quantidade,
                    preco_unitario
                )
                SELECT
                    id_ingresso,
                    $2,
                    $3,
                    preco_unitario_ingresso
                FROM public.ingresso
                WHERE id_ingresso = $1
            `, [
                item.ingresso_id_ingresso,
                idPedido,
                item.quantidade
            ]);

            if (resultadoItem.rowCount !== 1) {
                throw new Error('Ingresso não encontrado.');
            }
        }

        await conexao.query('COMMIT');

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Pedido cadastrado com sucesso!',
            id_pedido: idPedido
        });

    } catch (erro) {
        if (conexao) {
            await conexao.query('ROLLBACK').catch(console.error);
        }

        console.error('Erro ao cadastrar pedido:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar pedido.'
        });

    } finally {
        if (conexao) conexao.release();
    }
};

// ALTERAR PEDIDO
exports.atualizarPedido = async (req, res) => {
    let conexao;

    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID do pedido inválido.'
            });
        }

        const {
            cliente_pessoa_cpf_pessoa,
            funcionario_pessoa_cpf_pessoa,
            status_pedido,
            ingressos
        } = req.body;

        if (!validarStatus(status_pedido)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Status inválido.'
            });
        }

        const validacao = await validarDados(
            cliente_pessoa_cpf_pessoa,
            funcionario_pessoa_cpf_pessoa,
            ingressos
        );

        if (!validacao.valido) {
            return res.status(400).json({
                sucesso: false,
                mensagem: validacao.mensagem
            });
        }

        conexao = await pool.connect();

        await conexao.query('BEGIN');

        const resultado = await conexao.query(`
            UPDATE public.pedido
            SET
                cliente_pessoa_cpf_pessoa = $1,
                funcionario_pessoa_cpf_pessoa = $2,
                status_pedido = $3
            WHERE id_pedido = $4
            RETURNING id_pedido
        `, [
            validacao.cpfCliente,
            validacao.cpfFuncionario,
            status_pedido,
            id
        ]);

        if (resultado.rows.length === 0) {
            await conexao.query('ROLLBACK');

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        const ids = validacao.itens.map(
            item => item.ingresso_id_ingresso
        );

        // REMOVER APENAS OS INGRESSOS RETIRADOS
        await conexao.query(`
            DELETE FROM public.pedido_has_ingresso
            WHERE pedido_id_pedido = $1
            AND NOT (
                ingresso_id_ingresso = ANY($2::INTEGER[])
            )
        `, [id, ids]);

        // ATUALIZAR OU INSERIR INGRESSOS
        for (const item of validacao.itens) {
            const resultadoItem = await conexao.query(`
                INSERT INTO public.pedido_has_ingresso (
                    ingresso_id_ingresso,
                    pedido_id_pedido,
                    quantidade,
                    preco_unitario
                )
                SELECT
                    id_ingresso,
                    $2,
                    $3,
                    preco_unitario_ingresso
                FROM public.ingresso
                WHERE id_ingresso = $1

                ON CONFLICT (
                    ingresso_id_ingresso,
                    pedido_id_pedido
                )
                DO UPDATE SET
                    quantidade = EXCLUDED.quantidade
            `, [
                item.ingresso_id_ingresso,
                id,
                item.quantidade
            ]);

            if (resultadoItem.rowCount !== 1) {
                throw new Error('Ingresso não encontrado.');
            }
        }

        await conexao.query('COMMIT');

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pedido alterado com sucesso!'
        });

    } catch (erro) {
        if (conexao) {
            await conexao.query('ROLLBACK').catch(console.error);
        }

        console.error('Erro ao alterar pedido:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao alterar pedido.'
        });

    } finally {
        if (conexao) conexao.release();
    }
};

// EXCLUIR PEDIDO
exports.deletarPedido = async (req, res) => {
    let conexao;

    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID do pedido inválido.'
            });
        }

        conexao = await pool.connect();

        await conexao.query('BEGIN');

        const pedido = await conexao.query(`
            SELECT id_pedido
            FROM public.pedido
            WHERE id_pedido = $1
            FOR UPDATE
        `, [id]);

        if (pedido.rows.length === 0) {
            await conexao.query('ROLLBACK');

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        await conexao.query(`
            DELETE FROM public.pedido_has_ingresso
            WHERE pedido_id_pedido = $1
        `, [id]);

        await conexao.query(`
            DELETE FROM public.pedido
            WHERE id_pedido = $1
        `, [id]);

        await conexao.query('COMMIT');

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pedido excluído com sucesso!'
        });

    } catch (erro) {
        if (conexao) {
            await conexao.query('ROLLBACK').catch(console.error);
        }

        console.error('Erro ao excluir pedido:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: erro.code === '23503'
                ? 'O pedido possui registros vinculados e não pode ser excluído.'
                : 'Erro ao excluir pedido.'
        });

    } finally {
        if (conexao) conexao.release();
    }
};


// ========================================
// COMPRA DE INGRESSOS PELO CLIENTE
// ========================================


// FINALIZAR COMPRA DO CLIENTE
exports.finalizarCompraCliente = async (req, res) => {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Faça login para finalizar a compra.'
        });
    }

    const cpf = usuario.cpf_pessoa;

    const validacao = validarCarrinho(req.body?.ingressos);

    if (!validacao.valido) {
        return res.status(400).json({
            sucesso: false,
            mensagem: validacao.mensagem
        });
    }

    let conexao;

    try {
        conexao = await pool.connect();

        await conexao.query('BEGIN');

        const cliente = await conexao.query(`
            SELECT pessoa_cpf_pessoa
            FROM public.cliente
            WHERE pessoa_cpf_pessoa = $1
        `, [cpf]);

        if (cliente.rows.length === 0) {
            await conexao.query('ROLLBACK');

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Usuário não cadastrado como cliente.'
            });
        }

        const itens = validacao.itens;

        const ids = itens.map(
            item => item.ingresso_id_ingresso
        );

        const resultadoIngressos = await conexao.query(`
            SELECT
                id_ingresso,
                nome_ingresso,
                preco_unitario_ingresso
            FROM public.ingresso
            WHERE id_ingresso = ANY($1::INTEGER[])
            ORDER BY id_ingresso
            FOR SHARE
        `, [ids]);

        if (resultadoIngressos.rows.length !== itens.length) {
            await conexao.query('ROLLBACK');

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Um ou mais ingressos não existem.'
            });
        }

        const ingressosBanco = new Map(
            resultadoIngressos.rows.map(ingresso => [
                Number(ingresso.id_ingresso),
                ingresso
            ])
        );

        // CRIAR PEDIDO SEM FUNCIONÁRIO
        const resultadoPedido = await conexao.query(`
            INSERT INTO public.pedido (
                cliente_pessoa_cpf_pessoa,
                funcionario_pessoa_cpf_pessoa,
                status_pedido
            )
            VALUES ($1, NULL, 'Pendente')
            RETURNING id_pedido, data_pedido
        `, [cpf]);

        const pedido = resultadoPedido.rows[0];

        let valorTotalCentavos = 0;

        // SALVAR INGRESSOS DO PEDIDO
        for (const item of itens) {
            const ingresso = ingressosBanco.get(
                item.ingresso_id_ingresso
            );

            const preco = Number(
                ingresso.preco_unitario_ingresso
            );

            if (!Number.isFinite(preco) || preco < 0) {
                throw new Error('Preço inválido no banco.');
            }

            valorTotalCentavos +=
                Math.round(preco * 100) * item.quantidade;

            await conexao.query(`
                INSERT INTO public.pedido_has_ingresso (
                    ingresso_id_ingresso,
                    pedido_id_pedido,
                    quantidade,
                    preco_unitario
                )
                VALUES ($1, $2, $3, $4)
            `, [
                item.ingresso_id_ingresso,
                pedido.id_pedido,
                item.quantidade,
                ingresso.preco_unitario_ingresso
            ]);
        }

        await conexao.query('COMMIT');

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Pedido criado com sucesso!',
            id_pedido: pedido.id_pedido,
            data_pedido: pedido.data_pedido,
            status_pedido: 'Pendente',
            valor_total: valorTotalCentavos / 100
        });

    } catch (erro) {
        if (conexao) {
            await conexao.query('ROLLBACK').catch(console.error);
        }

        console.error('Erro ao finalizar compra:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível finalizar o pedido.'
        });

    } finally {
        if (conexao) conexao.release();
    }
};

// LISTAR COMPRAS DO CLIENTE LOGADO
exports.listarMeusPedidos = async (req, res) => {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Faça login para consultar suas compras.'
        });
    }

    try {
        const resultado = await query(`
            SELECT
                p.id_pedido,
                p.data_pedido,
                p.status_pedido,
                COUNT(phi.ingresso_id_ingresso)::INTEGER
                    AS total_itens,
                COALESCE(
                    SUM(phi.quantidade * phi.preco_unitario),
                    0
                ) AS valor_total
            FROM public.pedido p
            LEFT JOIN public.pedido_has_ingresso phi
                ON phi.pedido_id_pedido = p.id_pedido
            WHERE p.cliente_pessoa_cpf_pessoa = $1
            GROUP BY p.id_pedido
            ORDER BY p.data_pedido DESC
        `, [usuario.cpf_pessoa]);

        return res.status(200).json({
            sucesso: true,
            pedidos: resultado.rows
        });

    } catch (erro) {
        console.error('Erro ao listar compras:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar compras.'
        });
    }
};

// CONSULTAR DETALHES DA COMPRA DO CLIENTE
exports.obterMeuPedido = async (req, res) => {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Faça login para consultar o pedido.'
        });
    }

    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'ID do pedido inválido.'
        });
    }

    try {
        const resultadoPedido = await query(`
            SELECT
                p.id_pedido,
                p.data_pedido,
                p.status_pedido
            FROM public.pedido p
            WHERE p.id_pedido = $1
            AND p.cliente_pessoa_cpf_pessoa = $2
        `, [
            id,
            usuario.cpf_pessoa
        ]);

        if (resultadoPedido.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        const resultadoItens = await query(`
            SELECT
                phi.ingresso_id_ingresso,
                phi.quantidade,
                phi.preco_unitario,
                i.nome_ingresso,
                e.titulo_evento
            FROM public.pedido_has_ingresso phi
            INNER JOIN public.ingresso i
                ON i.id_ingresso = phi.ingresso_id_ingresso
            INNER JOIN public.evento e
                ON e.id_evento = i.evento_id_evento
            WHERE phi.pedido_id_pedido = $1
        `, [id]);

        return res.status(200).json({
            sucesso: true,
            pedido: resultadoPedido.rows[0],
            itens: resultadoItens.rows
        });

    } catch (erro) {
        console.error('Erro ao consultar pedido:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar pedido.'
        });
    }
};
