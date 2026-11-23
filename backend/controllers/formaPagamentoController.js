
const { query } = require('../database');

// LISTAR
exports.listar = async (req, res) => {
    try {
        const resultado = await query(`
            SELECT *
            FROM public.forma_pagamento
            ORDER BY id_forma_pagamento
        `);

        res.json({
            sucesso: true,
            formasPagamento: resultado.rows
        });
    } catch (erro) {
        console.error('Erro ao listar formas:', erro);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar formas de pagamento.'
        });
    }
};

// CADASTRAR
exports.criar = async (req, res) => {
    try {
        const nome = String(
            req.body.nome_forma_pagamento || ''
        ).trim();

        if (!nome || nome.length > 100) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um nome de até 100 caracteres.'
            });
        }

        const resultado = await query(`
            INSERT INTO public.forma_pagamento
                (nome_forma_pagamento)
            VALUES ($1)
            RETURNING *
        `, [nome]);

        res.status(201).json({
            sucesso: true,
            mensagem: 'Forma de pagamento cadastrada!',
            formaPagamento: resultado.rows[0]
        });

    } catch (erro) {
        if (erro.code === '23505') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Essa forma de pagamento já existe.'
            });
        }

        console.error('Erro ao cadastrar:', erro);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar forma de pagamento.'
        });
    }
};

// ATUALIZAR
exports.atualizar = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const nome = String(
            req.body.nome_forma_pagamento || ''
        ).trim();

        if (!Number.isInteger(id) || id <= 0 ||
            !nome || nome.length > 100) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Dados inválidos.'
            });
        }

        const resultado = await query(`
            UPDATE public.forma_pagamento
            SET nome_forma_pagamento = $1
            WHERE id_forma_pagamento = $2
            RETURNING *
        `, [nome, id]);

        if (!resultado.rowCount) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Forma de pagamento não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Forma de pagamento atualizada!'
        });

    } catch (erro) {
        if (erro.code === '23505') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Esse nome já está cadastrado.'
            });
        }

        console.error('Erro ao atualizar:', erro);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar forma de pagamento.'
        });
    }
};

// EXCLUIR
exports.excluir = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID inválido.'
            });
        }

        const resultado = await query(`
            DELETE FROM public.forma_pagamento
            WHERE id_forma_pagamento = $1
            RETURNING *
        `, [id]);

        if (!resultado.rowCount) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Forma de pagamento não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Forma de pagamento excluída!'
        });

    } catch (erro) {
        if (erro.code === '23503') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Esta forma já está vinculada a um pagamento.'
            });
        }

        console.error('Erro ao excluir:', erro);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao excluir forma de pagamento.'
        });
    }
};
