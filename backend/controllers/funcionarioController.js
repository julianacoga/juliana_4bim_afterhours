
const { query } = require('../database');
const path = require('path');

exports.abrirCrudFuncionario = (req, res) => {
    const usuario = req.cookies ? req.cookies.usuarioLogado : null;

    if (usuario) {
        res.sendFile(
            path.join(__dirname, '../../frontend/funcionario/funcionario.html')
        );
    } else {
        res.redirect('/login');
    }
};

exports.listarFuncionarios = async (req, res) => {
    try {
        const result = await query(
            `SELECT
                func.pessoa_cpf_pessoa,
                p.nome_pessoa,
                func.salario_funcionario,
                func.cargo_id_cargo
            FROM funcionario func
            INNER JOIN pessoa p
                ON func.pessoa_cpf_pessoa = p.cpf_pessoa
            ORDER BY func.pessoa_cpf_pessoa`
        );

        res.json({
            sucesso: true,
            funcionarios: result.rows
        });
    } catch (error) {
        console.error('Erro ao listar funcionários:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        });
    }
};

exports.criarFuncionario = async (req, res) => {
    try {
        const {
            pessoa_cpf_pessoa,
            salario_funcionario,
            cargo_id_cargo
        } = req.body;

        if (!pessoa_cpf_pessoa || salario_funcionario === undefined || !cargo_id_cargo) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'CPF, salário e cargo são obrigatórios'
            });
        }

        const result = await query(
            `INSERT INTO funcionario
                (pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo)
             VALUES ($1, $2, $3)
             RETURNING pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo`,
            [pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo]
        );

        res.status(201).json({
            sucesso: true,
            funcionario: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao criar funcionário:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Pessoa ou cargo não encontrado'
            });
        }

        if (error.code === '23505') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Esta pessoa já está cadastrada como funcionária'
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

exports.obterFuncionario = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await query(
            `SELECT
                pessoa_cpf_pessoa,
                salario_funcionario,
                cargo_id_cargo
             FROM funcionario
             WHERE pessoa_cpf_pessoa = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Funcionário não encontrado'
            });
        }

        res.json({
            sucesso: true,
            funcionario: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao obter funcionário:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        });
    }
};

exports.atualizarFuncionario = async (req, res) => {
    try {
        const id = req.params.id;

        const {
            salario_funcionario,
            cargo_id_cargo
        } = req.body;

        const atual = await query(
            `SELECT pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo
             FROM funcionario
             WHERE pessoa_cpf_pessoa = $1`,
            [id]
        );

        if (atual.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Funcionário não encontrado'
            });
        }

        const funcionarioAtual = atual.rows[0];

        const salario = salario_funcionario !== undefined
            ? salario_funcionario
            : funcionarioAtual.salario_funcionario;

        const cargo = cargo_id_cargo !== undefined
            ? cargo_id_cargo
            : funcionarioAtual.cargo_id_cargo;

        const result = await query(
            `UPDATE funcionario
             SET salario_funcionario = $1,
                 cargo_id_cargo = $2
             WHERE pessoa_cpf_pessoa = $3
             RETURNING pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo`,
            [salario, cargo, id]
        );

        res.json({
            sucesso: true,
            funcionario: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar funcionário:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Cargo não encontrado'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        });
    }
};

exports.deletarFuncionario = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await query(
            `DELETE FROM funcionario
             WHERE pessoa_cpf_pessoa = $1
             RETURNING pessoa_cpf_pessoa`
            ,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Funcionário não encontrado'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Funcionário excluído com sucesso'
        });
    } catch (error) {
        console.error('Erro ao deletar funcionário:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível excluir funcionário com eventos associados'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        });
    }
};
