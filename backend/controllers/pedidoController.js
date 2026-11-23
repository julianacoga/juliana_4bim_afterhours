const { query } = require('../database');


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
        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
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


// VALIDAR CLIENTE, FUNCIONÁRIO E INGRESSOS
async function validarDados(cliente, funcionario, ingressos) {
    if (
        !cliente ||
        !funcionario ||
        !Array.isArray(ingressos) ||
        ingressos.length === 0
    ) {
        return {
            valido: false,
            mensagem: 'Informe o cliente, o funcionário e pelo menos um ingresso.'
        };
    }

    const cpfCliente = Number(cliente);
    const cpfFuncionario = Number(funcionario);

    if (
        !Number.isSafeInteger(cpfCliente) ||
        !Number.isSafeInteger(cpfFuncionario) ||
        cpfCliente <= 0 ||
        cpfFuncionario <= 0
    ) {
        return {
            valido: false,
            mensagem: 'Informe CPFs válidos.'
        };
    }

    const ids = [];
    const quantidades = new Set();

    for (const item of ingressos) {
        const id = Number(item.ingresso_id_ingresso);
        const quantidade = Number(item.quantidade);

        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            !Number.isInteger(quantidade) ||
            quantidade <= 0 ||
            quantidades.has(id)
        ) {
            return {
                valido: false,
                mensagem: 'Confira os ingressos e suas quantidades. Não repita ingressos.'
            };
        }

        ids.push(id);
        quantidades.add(id);
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

    if (!pessoas.rows[0].funcionario_existe) {
        return {
            valido: false,
            mensagem: 'O CPF informado não está cadastrado como funcionário.'
        };
    }

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
        ids
    };
}


// CADASTRAR PEDIDO COM VÁRIOS INGRESSOS
exports.criarPedido = async (req, res) => {
    try {
        const {
            cliente_pessoa_cpf_pessoa,
            funcionario_pessoa_cpf_pessoa,
            ingressos
        } = req.body;

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

        const itensJSON = JSON.stringify(ingressos.map(item => ({
            ingresso_id_ingresso: Number(item.ingresso_id_ingresso),
            quantidade: Number(item.quantidade)
        })));

        const resultado = await query(`
            WITH novo_pedido AS (
                INSERT INTO public.pedido (
                    cliente_pessoa_cpf_pessoa,
                    funcionario_pessoa_cpf_pessoa
                )
                VALUES ($1, $2)
                RETURNING *
            ),
            novos_itens AS (
                INSERT INTO public.pedido_has_ingresso (
                    ingresso_id_ingresso,
                    pedido_id_pedido,
                    quantidade,
                    preco_unitario
                )
                SELECT
                    dados.ingresso_id_ingresso,
                    pedido.id_pedido,
                    dados.quantidade,
                    ingresso.preco_unitario_ingresso
                FROM novo_pedido pedido
                CROSS JOIN jsonb_to_recordset($3::JSONB) AS dados(
                    ingresso_id_ingresso INTEGER,
                    quantidade INTEGER
                )
                JOIN public.ingresso ingresso
                    ON ingresso.id_ingresso = dados.ingresso_id_ingresso
                RETURNING *
            )
            SELECT
                pedido.id_pedido,
                COUNT(itens.ingresso_id_ingresso)::INTEGER AS itens_salvos
            FROM novo_pedido pedido
            CROSS JOIN novos_itens itens
            GROUP BY pedido.id_pedido
        `, [
            validacao.cpfCliente,
            validacao.cpfFuncionario,
            itensJSON
        ]);

        if (
            resultado.rows.length === 0 ||
            resultado.rows[0].itens_salvos !== ingressos.length
        ) {
            throw new Error('Não foi possível salvar todos os itens do pedido.');
        }

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Pedido cadastrado com sucesso!',
            id_pedido: resultado.rows[0].id_pedido
        });

    } catch (erro) {
        console.error('Erro ao cadastrar pedido:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar pedido.'
        });
    }
};


// ALTERAR PEDIDO E SUBSTITUIR SEUS ITENS
exports.atualizarPedido = async (req, res) => {
    try {
        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
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

        const itensJSON = JSON.stringify(ingressos.map(item => ({
            ingresso_id_ingresso: Number(item.ingresso_id_ingresso),
            quantidade: Number(item.quantidade)
        })));

        const resultado = await query(`
            WITH pedido_atualizado AS (
                UPDATE public.pedido
                SET
                    cliente_pessoa_cpf_pessoa = $1,
                    funcionario_pessoa_cpf_pessoa = $2,
                    status_pedido = $3
                WHERE id_pedido = $4
                RETURNING id_pedido
            ),
            dados AS (
                SELECT *
                FROM jsonb_to_recordset($5::JSONB) AS item(
                    ingresso_id_ingresso INTEGER,
                    quantidade INTEGER
                )
            ),
            itens_atualizados AS (
                INSERT INTO public.pedido_has_ingresso (
                    ingresso_id_ingresso,
                    pedido_id_pedido,
                    quantidade,
                    preco_unitario
                )
                SELECT
                    dados.ingresso_id_ingresso,
                    pedido.id_pedido,
                    dados.quantidade,
                    ingresso.preco_unitario_ingresso
                FROM pedido_atualizado pedido
                CROSS JOIN dados
                JOIN public.ingresso ingresso
                    ON ingresso.id_ingresso = dados.ingresso_id_ingresso
                ON CONFLICT (ingresso_id_ingresso, pedido_id_pedido)
                DO UPDATE SET
                    quantidade = EXCLUDED.quantidade,
                    preco_unitario = EXCLUDED.preco_unitario
                RETURNING ingresso_id_ingresso
            ),
            itens_removidos AS (
                DELETE FROM public.pedido_has_ingresso antigo
                USING pedido_atualizado pedido
                WHERE antigo.pedido_id_pedido = pedido.id_pedido
                AND NOT EXISTS (
                    SELECT 1
                    FROM dados
                    WHERE dados.ingresso_id_ingresso =
                        antigo.ingresso_id_ingresso
                )
                RETURNING antigo.ingresso_id_ingresso
            )
            SELECT
                pedido.id_pedido,
                (SELECT COUNT(*) FROM itens_atualizados)::INTEGER AS itens_salvos
            FROM pedido_atualizado pedido
        `, [
            validacao.cpfCliente,
            validacao.cpfFuncionario,
            status_pedido || 'Pendente',
            id,
            itensJSON
        ]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        if (resultado.rows[0].itens_salvos !== ingressos.length) {
            throw new Error('Não foi possível salvar todos os itens do pedido.');
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pedido alterado com sucesso!'
        });

    } catch (erro) {
        console.error('Erro ao alterar pedido:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao alterar pedido.'
        });
    }
};


// EXCLUIR PEDIDO
exports.deletarPedido = async (req, res) => {
    try {
        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID do pedido inválido.'
            });
        }

        const resultado = await query(`
            DELETE FROM public.pedido
            WHERE id_pedido = $1
            RETURNING id_pedido
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pedido excluído com sucesso!'
        });

    } catch (erro) {
        console.error('Erro ao excluir pedido:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao excluir pedido.'
        });
    }
};


/*
========================================
COMPRA DE INGRESSOS PELO CLIENTE
========================================
*/

const { pool } = require('../database');

// VALIDAR ITENS RECEBIDOS DO CARRINHO
function validarCarrinho(ingressos) {
    if (!Array.isArray(ingressos) || ingressos.length === 0) {
        return {
            valido: false,
            mensagem: 'O carrinho está vazio.'
        };
    }

    const ids = new Set();
    const itens = [];

    for (const item of ingressos) {
        const id = Number(item.ingresso_id_ingresso);
        const quantidade = Number(item.quantidade);

        if (
            !Number.isSafeInteger(id) ||
            id <= 0 ||
            !Number.isSafeInteger(quantidade) ||
            quantidade <= 0 ||
            ids.has(id)
        ) {
            return {
                valido: false,
                mensagem: 'Confira os ingressos e suas quantidades.'
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

// FINALIZAR PEDIDO DO CLIENTE LOGADO
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

    const conexao = await pool.connect().catch(erro => {
        console.error('Erro ao conectar ao banco:', erro);
        return null;
    });

    if (!conexao) {
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível conectar ao banco.'
        });
    }

    try {
        await conexao.query('BEGIN');

        // CONFIRMAR SE O USUÁRIO É CLIENTE
        const cliente = await conexao.query(
            `SELECT pessoa_cpf_pessoa
             FROM public.cliente
             WHERE pessoa_cpf_pessoa = $1`,
            [cpf]
        );

        if (cliente.rows.length === 0) {
            await conexao.query('ROLLBACK');

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Usuário não cadastrado como cliente.'
            });
        }

        const itens = validacao.itens;
        const ids = itens.map(item => item.ingresso_id_ingresso);

        // CONSULTAR PREÇOS REAIS NO BANCO
        const resultadoIngressos = await conexao.query(
            `SELECT
                id_ingresso,
                nome_ingresso,
                preco_unitario_ingresso
             FROM public.ingresso
             WHERE id_ingresso = ANY($1::INTEGER[])
             ORDER BY id_ingresso
             FOR SHARE`,
            [ids]
        );

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
        const resultadoPedido = await conexao.query(
            `INSERT INTO public.pedido (
                cliente_pessoa_cpf_pessoa,
                funcionario_pessoa_cpf_pessoa,
                status_pedido
             )
             VALUES ($1, NULL, 'Pendente')
             RETURNING id_pedido, data_pedido`,
            [cpf]
        );

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
                throw new Error('Preço inválido no banco de dados.');
            }

            const precoCentavos = Math.round(preco * 100);

            valorTotalCentavos +=
                precoCentavos * item.quantidade;

            await conexao.query(
                `INSERT INTO public.pedido_has_ingresso (
                    ingresso_id_ingresso,
                    pedido_id_pedido,
                    quantidade,
                    preco_unitario
                 )
                 VALUES ($1, $2, $3, $4)`,
                [
                    item.ingresso_id_ingresso,
                    pedido.id_pedido,
                    item.quantidade,
                    ingresso.preco_unitario_ingresso
                ]
            );
        }

        // CONFIRMAR TODAS AS ALTERAÇÕES
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
        await conexao.query('ROLLBACK').catch(console.error);

        console.error('Erro ao finalizar compra:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível finalizar o pedido.'
        });

    } finally {
        conexao.release();
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
        const resultado = await query(
            `SELECT
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
             ORDER BY p.data_pedido DESC`,
            [usuario.cpf_pessoa]
        );

        return res.json({
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

// CONSULTAR DETALHES DE UMA COMPRA DO CLIENTE
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
        const resultadoPedido = await query(
            `SELECT
                p.id_pedido,
                p.data_pedido,
                p.status_pedido
             FROM public.pedido p
             WHERE p.id_pedido = $1
               AND p.cliente_pessoa_cpf_pessoa = $2`,
            [id, usuario.cpf_pessoa]
        );

        if (resultadoPedido.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        const resultadoItens = await query(
            `SELECT
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
             WHERE phi.pedido_id_pedido = $1`,
            [id]
        );

        return res.json({
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

