
const { query } = require('../database');
const path = require('path');

exports.abrirCrudCliente = (req, res) => {
    res.sendFile(
        path.join(__dirname, '../../frontend/cliente/cliente.html')
    );
};

// LISTAR CLIENTES
exports.listarClientes = async (req, res) => {
    try {
        const result = await query(
            `SELECT
                cli.pessoa_cpf_pessoa,
                p.nome_pessoa,
                cli.data_cadastro_cliente
             FROM cliente cli
             INNER JOIN pessoa p
                ON cli.pessoa_cpf_pessoa = p.cpf_pessoa
             ORDER BY cli.pessoa_cpf_pessoa`
        );

        res.json({
            sucesso: true,
            clientes: result.rows
        });
    } catch (error) {
        console.error('Erro ao listar clientes:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        });
    }
};

// CADASTRAR CLIENTE
exports.criarCliente = async (req, res) => {
    try {
        const {
            pessoa_cpf_pessoa,
            data_cadastro_cliente
        } = req.body;

        if (!pessoa_cpf_pessoa || !data_cadastro_cliente) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'CPF e data de cadastro são obrigatórios'
            });
        }

        const result = await query(
            `INSERT INTO cliente
                (pessoa_cpf_pessoa, data_cadastro_cliente)
             VALUES ($1, $2)
             RETURNING pessoa_cpf_pessoa, data_cadastro_cliente`,
            [pessoa_cpf_pessoa, data_cadastro_cliente]
        );

        res.status(201).json({
            sucesso: true,
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao criar cliente:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Pessoa não encontrada'
            });
        }

        if (error.code === '23505') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Esta pessoa já está cadastrada como cliente'
            });
        }

        if (error.code === '23502') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Dados obrigatórios não fornecidos'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        });
    }
};

// BUSCAR CLIENTE
exports.obterCliente = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await query(
            `SELECT pessoa_cpf_pessoa, data_cadastro_cliente
             FROM cliente
             WHERE pessoa_cpf_pessoa = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado'
            });
        }

        res.json({
            sucesso: true,
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao obter cliente:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        });
    }
};

// ATUALIZAR CLIENTE
exports.atualizarCliente = async (req, res) => {
    try {
        const id = req.params.id;
        const { data_cadastro_cliente } = req.body;

        const atual = await query(
            `SELECT pessoa_cpf_pessoa, data_cadastro_cliente
             FROM cliente
             WHERE pessoa_cpf_pessoa = $1`,
            [id]
        );

        if (atual.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado'
            });
        }

        const dataCadastro = data_cadastro_cliente !== undefined
            ? data_cadastro_cliente
            : atual.rows[0].data_cadastro_cliente;

        const result = await query(
            `UPDATE cliente
             SET data_cadastro_cliente = $1
             WHERE pessoa_cpf_pessoa = $2
             RETURNING pessoa_cpf_pessoa, data_cadastro_cliente`,
            [dataCadastro, id]
        );

        res.json({
            sucesso: true,
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        });
    }
};

// EXCLUIR CLIENTE
exports.deletarCliente = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await query(
            `DELETE FROM cliente
             WHERE pessoa_cpf_pessoa = $1
             RETURNING pessoa_cpf_pessoa`
            ,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Cliente excluído com sucesso'
        });
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);

        if (error.code === '23503') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Não é possível excluir este cliente porque existem registros associados'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        });
    }
};
