
const { query } = require('../database');
const path = require('path');

// Abrir a página do CRUD
exports.abrirCrudPessoa = (req, res) => {
    const usuario = req.cookies ? req.cookies.usuarioLogado : null;

    if (usuario) {
        res.sendFile(
            path.join(__dirname, '../../frontend/pessoa/pessoa.html')
        );
    } else {
        res.redirect('/login');
    }
};

// Listar pessoas
exports.listarPessoas = async (req, res) => {
    try {
        const result = await query(`
            SELECT
                cpf_pessoa,
                nome_pessoa,
                data_nascimento_pessoa,
                genero_pessoa,
                email_pessoa,
                telefone_pessoa
            FROM pessoa
            ORDER BY nome_pessoa
        `);

        res.json({
            sucesso: true,
            pessoas: result.rows
        });

    } catch (error) {
        console.error('Erro ao listar pessoas:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar pessoas.'
        });
    }
};

// Criar pessoa
exports.criarPessoa = async (req, res) => {
    try {
        const {
            cpf_pessoa,
            nome_pessoa,
            data_nascimento_pessoa,
            genero_pessoa,
            senha_pessoa,
            email_pessoa,
            telefone_pessoa
        } = req.body;

        if (!cpf_pessoa || !/^\d{11}$/.test(cpf_pessoa)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um CPF válido com 11 números.'
            });
        }

        if (
            !nome_pessoa ||
            !genero_pessoa ||
            !senha_pessoa ||
            !email_pessoa ||
            !telefone_pessoa
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nome, gênero, senha, email e telefone são obrigatórios.'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email_pessoa)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Formato de email inválido.'
            });
        }

        const result = await query(
            `INSERT INTO pessoa (
                cpf_pessoa,
                nome_pessoa,
                data_nascimento_pessoa,
                genero_pessoa,
                senha_pessoa,
                email_pessoa,
                telefone_pessoa
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                cpf_pessoa,
                nome_pessoa,
                data_nascimento_pessoa,
                genero_pessoa,
                email_pessoa,
                telefone_pessoa`,
            [
                cpf_pessoa,
                nome_pessoa,
                data_nascimento_pessoa || null,
                genero_pessoa,
                senha_pessoa,
                email_pessoa,
                telefone_pessoa
            ]
        );

        res.status(201).json({
            sucesso: true,
            mensagem: 'Pessoa cadastrada com sucesso.',
            pessoa: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar pessoa:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'CPF ou email já cadastrado.'
            });
        }

        if (error.code === '23502') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preencha todos os campos obrigatórios.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao cadastrar pessoa.'
        });
    }
};

// Buscar pessoa pelo CPF
exports.obterPessoa = async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'CPF é obrigatório.'
            });
        }

        const result = await query(
            `SELECT
                cpf_pessoa,
                nome_pessoa,
                data_nascimento_pessoa,
                genero_pessoa,
                email_pessoa,
                telefone_pessoa
            FROM pessoa
            WHERE cpf_pessoa = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pessoa não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            pessoa: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao obter pessoa:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao buscar pessoa.'
        });
    }
};

// Atualizar pessoa
exports.atualizarPessoa = async (req, res) => {
    try {
        const id = req.params.id;

        const {
            nome_pessoa,
            data_nascimento_pessoa,
            genero_pessoa,
            senha_pessoa,
            email_pessoa,
            telefone_pessoa
        } = req.body;

        const pessoaExistente = await query(
            'SELECT * FROM pessoa WHERE cpf_pessoa = $1',
            [id]
        );

        if (pessoaExistente.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pessoa não encontrada.'
            });
        }

        const pessoaAtual = pessoaExistente.rows[0];

        const emailAtualizado =
            email_pessoa !== undefined
                ? email_pessoa
                : pessoaAtual.email_pessoa;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailAtualizado)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Formato de email inválido.'
            });
        }

        const senhaAtualizada =
            senha_pessoa && senha_pessoa.trim() !== ''
                ? senha_pessoa
                : pessoaAtual.senha_pessoa;

        const result = await query(
            `UPDATE pessoa
             SET
                nome_pessoa = $1,
                data_nascimento_pessoa = $2,
                genero_pessoa = $3,
                senha_pessoa = $4,
                email_pessoa = $5,
                telefone_pessoa = $6
             WHERE cpf_pessoa = $7
             RETURNING
                cpf_pessoa,
                nome_pessoa,
                data_nascimento_pessoa,
                genero_pessoa,
                email_pessoa,
                telefone_pessoa`,
            [
                nome_pessoa !== undefined ? nome_pessoa : pessoaAtual.nome_pessoa,
                data_nascimento_pessoa !== undefined
                    ? data_nascimento_pessoa
                    : pessoaAtual.data_nascimento_pessoa,
                genero_pessoa !== undefined
                    ? genero_pessoa
                    : pessoaAtual.genero_pessoa,
                senhaAtualizada,
                emailAtualizado,
                telefone_pessoa !== undefined
                    ? telefone_pessoa
                    : pessoaAtual.telefone_pessoa,
                id
            ]
        );

        res.json({
            sucesso: true,
            mensagem: 'Pessoa alterada com sucesso.',
            pessoa: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar pessoa:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Este CPF ou email já está cadastrado.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao atualizar pessoa.'
        });
    }
};

// Excluir pessoa
exports.deletarPessoa = async (req, res) => {
    try {
        const id = req.params.id;

        const pessoaExistente = await query(
            'SELECT cpf_pessoa FROM pessoa WHERE cpf_pessoa = $1',
            [id]
        );

        if (pessoaExistente.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pessoa não encontrada.'
            });
        }

        await query(
            'DELETE FROM pessoa WHERE cpf_pessoa = $1',
            [id]
        );

        res.json({
            sucesso: true,
            mensagem: 'Pessoa excluída com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao excluir pessoa:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível excluir esta pessoa porque existem registros relacionados a ela.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao excluir pessoa.'
        });
    }
};

// Buscar pessoa pelo email
exports.obterPessoaPorEmail = async (req, res) => {
    try {
        const { email_pessoa } = req.params;

        if (!email_pessoa) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email é obrigatório.'
            });
        }

        const result = await query(
            `SELECT
                cpf_pessoa,
                nome_pessoa,
                data_nascimento_pessoa,
                genero_pessoa,
                email_pessoa,
                telefone_pessoa
            FROM pessoa
            WHERE email_pessoa = $1`,
            [email_pessoa]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pessoa não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            pessoa: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao buscar pessoa por email:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao buscar pessoa.'
        });
    }
};
