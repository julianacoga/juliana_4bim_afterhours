
const db = require('../database.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ========================================
// ABRIR TELAS
// ========================================

// ABRIR TELA DE LOGIN
exports.abrirTelaLogin = (req, res) => {
    res.sendFile(
        path.join(__dirname, '../../frontend/login/login.html')
    );
};

// ABRIR ÁREA DO CLIENTE
exports.abrirVisaoCliente = (req, res) => {
    res.sendFile(
        path.join(__dirname, '../../frontend/visaoCliente/index.html')
    );
};

// ABRIR CARRINHO
exports.abrirVisaoClienteCarrinho = (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '../../frontend/visaoCliente/carrinho/carrinho.html'
        )
    );
};

// ABRIR FINALIZAÇÃO
exports.abrirVisaoClienteFinalizar = (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '../../frontend/visaoCliente/finalizar/finalizar.html'
        )
    );
};

// ABRIR PAGAMENTO
exports.abrirVisaoClientePagamento = (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '../../frontend/visaoCliente/pagamento/pagamento.html'
        )
    );
};

// ========================================
// VERIFICAR SESSÃO
// ========================================

exports.verificaSeUsuarioEstaLogado = (req, res) => {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            status: 'nao_logado',
            mensagem: 'Faça login para acessar esta página.'
        });
    }

    if (
        usuario.ehCliente !== true &&
        usuario.ehFuncionario !== true
    ) {
        return res.status(403).json({
            status: 'sem_permissao',
            mensagem: 'Usuário sem permissão de acesso.'
        });
    }

    return res.json({
        status: 'ok',
        usuario
    });
};

// ========================================
// VERIFICAR E-MAIL
// ========================================

exports.verificarEmail = async (req, res) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Informe o email.'
        });
    }

    try {
        const resultado = await db.query(
            `SELECT nome_pessoa
             FROM pessoa
             WHERE LOWER(email_pessoa) = LOWER($1)`,
            [email.trim()]
        );

        if (resultado.rows.length === 0) {
            return res.json({
                status: 'nao_encontrado'
            });
        }

        return res.json({
            status: 'existe',
            nome: resultado.rows[0].nome_pessoa
        });

    } catch (erro) {
        console.error('Erro ao verificar email:', erro);

        return res.status(500).json({
            status: 'erro',
            mensagem: 'Erro ao verificar email.'
        });
    }
};

// ========================================
// LOGIN
// ========================================

exports.verificarSenha = async (req, res) => {
    const { email, senha } = req.body;

    if (
        !email ||
        !senha ||
        typeof email !== 'string' ||
        typeof senha !== 'string'
    ) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Informe email e senha.'
        });
    }

    try {
        // BUSCAR PESSOA
        const resultadoPessoa = await db.query(
            `SELECT cpf_pessoa, nome_pessoa, senha_pessoa
             FROM pessoa
             WHERE LOWER(email_pessoa) = LOWER($1)`,
            [email.trim()]
        );

        if (resultadoPessoa.rows.length === 0) {
            return res.status(401).json({
                status: 'senha_incorreta',
                mensagem: 'Email ou senha incorretos.'
            });
        }

        const pessoa = resultadoPessoa.rows[0];

        // CONFERIR SENHA
        const senhaCorreta = await bcrypt.compare(
            senha,
            pessoa.senha_pessoa
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                status: 'senha_incorreta',
                mensagem: 'Email ou senha incorretos.'
            });
        }

        const cpf = pessoa.cpf_pessoa;

        // VERIFICAR SE É CLIENTE
        const resultadoCliente = await db.query(
            `SELECT pessoa_cpf_pessoa
             FROM cliente
             WHERE pessoa_cpf_pessoa = $1`,
            [cpf]
        );

        const ehCliente = resultadoCliente.rows.length > 0;

        // VERIFICAR SE É FUNCIONÁRIO
        const resultadoFuncionario = await db.query(
            `SELECT c.id_cargo, c.nome_cargo
             FROM funcionario f
             INNER JOIN cargo c
                ON c.id_cargo = f.cargo_id_cargo
             WHERE f.pessoa_cpf_pessoa = $1`,
            [cpf]
        );

        const ehFuncionario =
            resultadoFuncionario.rows.length > 0;

        if (!ehCliente && !ehFuncionario) {
            return res.status(403).json({
                status: 'sem_acesso',
                mensagem: 'Usuário não possui acesso ao sistema.'
            });
        }

        const cargo = ehFuncionario
            ? resultadoFuncionario.rows[0]
            : null;

        // DEFINIR PARA ONDE O USUÁRIO VAI
        const destino = ehFuncionario
            ? '/login/escolher-acesso'
            : '/login/visaocliente';

        // DADOS GUARDADOS NA SESSÃO
        const dadosUsuario = {
            cpf_pessoa: cpf,
            nome: pessoa.nome_pessoa,
            ehCliente,
            ehFuncionario,
            cargo
        };

        // RECRIAR SESSÃO AO FAZER LOGIN
        req.session.regenerate((erroSessao) => {
            if (erroSessao) {
                console.error(
                    'Erro ao criar sessão:',
                    erroSessao
                );

                return res.status(500).json({
                    status: 'erro',
                    mensagem: 'Erro ao iniciar sessão.'
                });
            }

            req.session.usuario = dadosUsuario;

            req.session.save((erroSalvar) => {
                if (erroSalvar) {
                    console.error(
                        'Erro ao salvar sessão:',
                        erroSalvar
                    );

                    return res.status(500).json({
                        status: 'erro',
                        mensagem: 'Erro ao salvar sessão.'
                    });
                }

                // REMOVER COOKIE ANTIGO, SE EXISTIR
                res.clearCookie('usuarioLogado', {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    path: '/'
                });

                return res.json({
                    status: 'ok',
                    nome: pessoa.nome_pessoa,
                    destino
                });
            });
        });

    } catch (erro) {
        console.error('Erro ao verificar senha:', erro);

        return res.status(500).json({
            status: 'erro',
            mensagem: 'Erro ao realizar login.'
        });
    }
};

// ========================================
// LOGOUT
// ========================================

exports.logout = (req, res) => {
    res.clearCookie('usuarioLogado', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/'
    });

    if (!req.session) {
        return res.json({
            status: 'deslogado',
            mensagem: 'Logout realizado com sucesso.'
        });
    }

    req.session.destroy((erro) => {
        if (erro) {
            console.error('Erro ao sair:', erro);

            return res.status(500).json({
                status: 'erro',
                mensagem: 'Erro ao encerrar sessão.'
            });
        }

        res.clearCookie('afterhours.sid', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });

        return res.json({
            status: 'deslogado',
            mensagem: 'Logout realizado com sucesso.'
        });
    });
};

// ========================================
// CADASTRAR PESSOA COMO CLIENTE
// ========================================

exports.criarPessoa = async (req, res) => {
    const {
        cpf_pessoa,
        nome_pessoa,
        data_nascimento_pessoa,
        genero_pessoa,
        senha_pessoa,
        email_pessoa,
        telefone_pessoa
    } = req.body;

    if (
        !cpf_pessoa ||
        !nome_pessoa ||
        !senha_pessoa ||
        !email_pessoa ||
        typeof senha_pessoa !== 'string' ||
        typeof email_pessoa !== 'string'
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'CPF, nome, senha e email são obrigatórios.'
        });
    }

    const cpf = String(cpf_pessoa).replace(/\D/g, '');
    const email = email_pessoa.trim();

    if (cpf.length !== 11) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O CPF deve conter 11 números.'
        });
    }

    if (senha_pessoa.length < 8) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'A senha deve ter pelo menos 8 caracteres.'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Informe um email válido.'
        });
    }

    try {
        const senhaHash = await bcrypt.hash(
            senha_pessoa,
            12
        );

        const resultado = await db.query(
            `WITH nova_pessoa AS (
                INSERT INTO pessoa (
                    cpf_pessoa,
                    nome_pessoa,
                    data_nascimento_pessoa,
                    genero_pessoa,
                    senha_pessoa,
                    email_pessoa,
                    telefone_pessoa
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING cpf_pessoa
            )
            INSERT INTO cliente (
                pessoa_cpf_pessoa,
                data_cadastro_cliente
            )
            SELECT cpf_pessoa, CURRENT_DATE
            FROM nova_pessoa
            RETURNING pessoa_cpf_pessoa`,
            [
                cpf,
                nome_pessoa.trim(),
                data_nascimento_pessoa || null,
                genero_pessoa || null,
                senhaHash,
                email,
                telefone_pessoa || null
            ]
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Cadastro realizado com sucesso!',
            cliente: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao cadastrar pessoa:', erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'CPF ou email já cadastrado.'
            });
        }

        if (erro.code === '23502') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preencha os campos obrigatórios.'
            });
        }

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao realizar cadastro.'
        });
    }
};

// ========================================
// BUSCAR PESSOA PELO CPF
// ========================================

exports.obterPessoa = async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await db.query(
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

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Pessoa não encontrada.'
            });
        }

        return res.json(resultado.rows[0]);

    } catch (erro) {
        console.error('Erro ao obter pessoa:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao buscar pessoa.'
        });
    }
};

// ========================================
// BUSCAR PESSOA PELO EMAIL
// ========================================

exports.obterPessoaPorEmail = async (req, res) => {
    try {
        const { email } = req.params;

        const resultado = await db.query(
            `SELECT
                cpf_pessoa,
                nome_pessoa,
                email_pessoa
             FROM pessoa
             WHERE LOWER(email_pessoa) = LOWER($1)`,
            [email]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Pessoa não encontrada.'
            });
        }

        return res.json(resultado.rows[0]);

    } catch (erro) {
        console.error('Erro ao buscar pessoa por email:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao buscar pessoa.'
        });
    }
};

// ========================================
// ALTERAR SENHA
// ========================================

exports.atualizarSenha = async (req, res) => {
    try {
        const usuario = req.session?.usuario;

        if (!usuario?.cpf_pessoa) {
            return res.status(401).json({
                mensagem: 'Faça login para alterar sua senha.'
            });
        }

        const cpf = usuario.cpf_pessoa;
        const { senha_atual, nova_senha } = req.body;

        if (
            !senha_atual ||
            !nova_senha ||
            typeof senha_atual !== 'string' ||
            typeof nova_senha !== 'string'
        ) {
            return res.status(400).json({
                mensagem: 'Informe a senha atual e a nova senha.'
            });
        }

        if (nova_senha.length < 8) {
            return res.status(400).json({
                mensagem: 'A nova senha deve ter pelo menos 8 caracteres.'
            });
        }

        const resultadoPessoa = await db.query(
            `SELECT senha_pessoa
             FROM pessoa
             WHERE cpf_pessoa = $1`,
            [cpf]
        );

        if (resultadoPessoa.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Pessoa não encontrada.'
            });
        }

        const senhaCorreta = await bcrypt.compare(
            senha_atual,
            resultadoPessoa.rows[0].senha_pessoa
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: 'Senha atual incorreta.'
            });
        }

        const novaSenhaHash = await bcrypt.hash(
            nova_senha,
            12
        );

        await db.query(
            `UPDATE pessoa
             SET senha_pessoa = $1
             WHERE cpf_pessoa = $2`,
            [novaSenhaHash, cpf]
        );

        return res.json({
            sucesso: true,
            mensagem: 'Senha atualizada com sucesso.'
        });

    } catch (erro) {
        console.error('Erro ao atualizar senha:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao atualizar senha.'
        });
    }
};

 // ========================================
 // RECUPERAÇÃO DE SENHA
 // ========================================

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ABRIR TELA ESQUECI SENHA
exports.abrirEsqueciSenha = (req, res) => {
    res.sendFile(
        path.join(__dirname, '../../frontend/login/esqueciSenha.html')
    );
};

// ABRIR TELA REDEFINIR SENHA
exports.abrirRedefinirSenha = (req, res) => {
    res.sendFile(
        path.join(__dirname, '../../frontend/login/redefinirSenha.html')
    );
};

// ENVIAR EMAIL DE RECUPERAÇÃO
exports.esqueciSenha = async (req, res) => {
    try {
        const { email } = req.body;

        if (
            typeof email !== 'string' ||
            !email.trim()
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe seu e-mail.'
            });
        }

        const resposta = {
            sucesso: true,
            mensagem: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.'
        };

        const resultado = await db.query(
            `SELECT cpf_pessoa, nome_pessoa, email_pessoa
             FROM pessoa
             WHERE LOWER(email_pessoa) = LOWER($1)`,
            [email.trim()]
        );

        if (resultado.rows.length !== 1) {
            return res.json(resposta);
        }

        const pessoa = resultado.rows[0];

        // GERAR TOKEN
        const token = crypto.randomBytes(32).toString('hex');

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const validade = new Date(
            Date.now() + 15 * 60 * 1000
        );

        // SALVAR TOKEN NO BANCO
        await db.query(
            `UPDATE pessoa
             SET token_recuperacao = $1,
                 validade_token = $2
             WHERE cpf_pessoa = $3`,
            [tokenHash, validade, pessoa.cpf_pessoa]
        );

        const link = `${process.env.APP_URL}/login/redefinirSenha?token=${token}`;

        // ENVIAR EMAIL
        await transporter.sendMail({
            from: `"After Hours" <${process.env.EMAIL_USER}>`,
            to: pessoa.email_pessoa,
            subject: 'Recuperação de senha | After Hours',

            html: `
                <div style="
                    background: #101010;
                    color: #ffffff;
                    padding: 40px;
                    font-family: Arial, sans-serif;
                    border-radius: 16px;
                ">
                    <h1>
                        AFTER<span style="color: #a855f7;">HOURS.</span>
                    </h1>

                    <h2>Recuperação de senha</h2>

                    <p>Recebemos uma solicitação para redefinir sua senha.</p>

                    <p>Clique no botão abaixo para criar uma nova senha.</p>

                    <a href="${link}" style="
                        display: inline-block;
                        background: #a855f7;
                        color: white;
                        padding: 15px 25px;
                        border-radius: 30px;
                        text-decoration: none;
                        font-weight: bold;
                    ">
                        REDEFINIR SENHA
                    </a>

                    <p>Este link é válido por 15 minutos.</p>

                    <p>Se você não solicitou a alteração, ignore este e-mail.</p>

                    <hr style="border-color: #333;">

                    <p>Equipe After Hours.</p>
                </div>
            `
        });

        return res.json(resposta);

    } catch (erro) {
        console.error('Erro na recuperação:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível processar a solicitação.'
        });
    }
};

// REDEFINIR SENHA
exports.redefinirSenha = async (req, res) => {
    try {
        const { token, novaSenha } = req.body;

        if (
            typeof token !== 'string' ||
            !/^[a-f0-9]{64}$/.test(token) ||
            typeof novaSenha !== 'string'
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Dados inválidos.'
            });
        }

        if (
            novaSenha.length < 8 ||
            Buffer.byteLength(novaSenha, 'utf8') > 72
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.'
            });
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const senhaHash = await bcrypt.hash(novaSenha, 12);

        const resultado = await db.query(
            `UPDATE pessoa
             SET senha_pessoa = $1,
                 token_recuperacao = NULL,
                 validade_token = NULL
             WHERE token_recuperacao = $2
               AND validade_token > NOW()
             RETURNING cpf_pessoa`,
            [senhaHash, tokenHash]
        );

        if (resultado.rows.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Link inválido ou expirado.'
            });
        }

        return res.json({
            sucesso: true,
            mensagem: 'Senha redefinida com sucesso!'
        });

    } catch (erro) {
        console.error('Erro ao redefinir senha:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao redefinir senha.'
        });
    }
};

exports.abrirDetalhesEvento = (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '../../frontend/visaoCliente/detalhesEvento/detalhesEvento.html'
        )
    );
};