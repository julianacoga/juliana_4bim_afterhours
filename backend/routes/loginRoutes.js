
const express = require('express');
const path = require('path');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');

const loginController = require('../controllers/loginController');

// VERIFICAR SE ESTÁ LOGADO
function verificarLogin(req, res, next) {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.redirect('/login');
    }

    next();
}

// VERIFICAR LOGIN PARA COMPRA
function verificarLoginCompra(req, res, next) {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.redirect('/login?compra=1');
    }

    next();
}

// VERIFICAR SE É FUNCIONÁRIO
function verificarFuncionario(req, res, next) {
    const usuario = req.session?.usuario;

    if (!usuario || usuario.ehFuncionario !== true) {
        return res.redirect('/login');
    }

    next();
}

// TELAS
router.get('/', loginController.abrirTelaLogin);

router.get(
    '/visaocliente',
    verificarLogin,
    loginController.abrirVisaoCliente
);

// CARRINHO PÚBLICO
router.get(
    '/visaoclientecarrinho',
    loginController.abrirVisaoClienteCarrinho
);

// FINALIZAÇÃO PROTEGIDA
router.get(
    '/visaoclientefinalizar',
    verificarLoginCompra,
    loginController.abrirVisaoClienteFinalizar
);

// PAGAMENTO PROTEGIDO
router.get(
    '/visaoclientepagamento',
    verificarLoginCompra,
    loginController.abrirVisaoClientePagamento
);

// DETALHES PÚBLICOS
router.get(
    '/detalhesEvento',
    loginController.abrirDetalhesEvento
);

// ESCOLHER ENTRE ADMINISTRAÇÃO E CLIENTE
router.get('/escolher-acesso', verificarFuncionario, (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '../../frontend/login/escolher-acesso.html'
        )
    );
});

// AUTENTICAÇÃO
router.post('/verificarEmail', loginController.verificarEmail);
router.post('/verificarSenha', loginController.verificarSenha);

router.get(
    '/verificaSeUsuarioEstaLogado',
    loginController.verificaSeUsuarioEstaLogado
);

router.get('/logout', loginController.logout);

// CADASTRO
router.post('/cadastro', loginController.criarPessoa);

// ALTERAR SENHA
router.put(
    '/alterarSenha',
    verificarLogin,
    loginController.atualizarSenha
);

// RECUPERAÇÃO DE SENHA
const limiteRecuperacao = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: {
        sucesso: false,
        mensagem: 'Muitas tentativas. Aguarde 15 minutos.'
    }
});

const limiteRedefinicao = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: {
        sucesso: false,
        mensagem: 'Muitas tentativas. Tente novamente mais tarde.'
    }
});

// ABRIR TELAS
router.get('/esqueciSenha', loginController.abrirEsqueciSenha);
router.get('/redefinirSenha', loginController.abrirRedefinirSenha);

// ENVIAR EMAIL
router.post(
    '/esqueciSenha',
    limiteRecuperacao,
    loginController.esqueciSenha
);

// REDEFINIR SENHA
router.post(
    '/redefinirSenha',
    limiteRedefinicao,
    loginController.redefinirSenha
);

module.exports = router;
