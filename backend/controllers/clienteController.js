
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

// BUSCAR DADOS DO CLIENTE LOGADO
exports.obterMeuPerfil = async (req, res) => {
    try {
        const usuario = req.session?.usuario;

        if (!usuario?.cpf_pessoa || usuario.ehCliente !== true) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Faça login como cliente para acessar seu perfil.'
            });
        }

        const resultado = await query(
            `SELECT
                p.cpf_pessoa,
                p.nome_pessoa,
                p.data_nascimento_pessoa,
                p.genero_pessoa,
                p.email_pessoa,
                p.telefone_pessoa,
                c.data_cadastro_cliente
             FROM pessoa p
             INNER JOIN cliente c
                ON c.pessoa_cpf_pessoa = p.cpf_pessoa
             WHERE p.cpf_pessoa = $1`,
            [usuario.cpf_pessoa]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado.'
            });
        }

        return res.json({
            sucesso: true,
            cliente: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao buscar meu perfil:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao buscar perfil.'
        });
    }
};

// ATUALIZAR DADOS DO CLIENTE LOGADO
exports.atualizarMeuPerfil = async (req, res) => {
    try {
        const usuario = req.session?.usuario;

        if (!usuario?.cpf_pessoa || usuario.ehCliente !== true) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Faça login como cliente para editar seu perfil.'
            });
        }

        const {
            nome_pessoa,
            data_nascimento_pessoa,
            genero_pessoa,
            email_pessoa,
            telefone_pessoa
        } = req.body;

        const cpf = usuario.cpf_pessoa;

        const resultado = await query(
            `UPDATE pessoa
             SET
                nome_pessoa = COALESCE($1, nome_pessoa),
                data_nascimento_pessoa = COALESCE($2, data_nascimento_pessoa),
                genero_pessoa = COALESCE($3, genero_pessoa),
                email_pessoa = COALESCE($4, email_pessoa),
                telefone_pessoa = COALESCE($5, telefone_pessoa)
             WHERE cpf_pessoa = $6
             AND EXISTS (
                 SELECT 1 FROM cliente
                 WHERE pessoa_cpf_pessoa = $6
             )
             RETURNING
                cpf_pessoa,
                nome_pessoa,
                data_nascimento_pessoa,
                genero_pessoa,
                email_pessoa,
                telefone_pessoa`,
            [
                nome_pessoa ?? null,
                data_nascimento_pessoa ?? null,
                genero_pessoa ?? null,
                email_pessoa ?? null,
                telefone_pessoa ?? null,
                cpf
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado.'
            });
        }

        req.session.usuario.nome = resultado.rows[0].nome_pessoa;

        return req.session.save((erro) => {
            if (erro) {
                console.error('Erro ao salvar sessão:', erro);
                return res.status(500).json({
                    sucesso: false,
                    mensagem: 'Dados atualizados, mas houve um erro ao salvar a sessão.'
                });
            }

            return res.json({
                sucesso: true,
                mensagem: 'Perfil atualizado com sucesso!',
                cliente: resultado.rows[0]
            });
        });

    } catch (erro) {
        console.error('Erro ao atualizar perfil:', erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este email já está cadastrado.'
            });
        }

        if (erro.code === '22007' || erro.code === '22008') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Data de nascimento inválida.'
            });
        }

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar perfil.'
        });
    }
};
