
const express = require('express');
const path = require('path');
const router = express.Router();

const loginController = require('../controllers/loginController');

// VERIFICAR SE ESTÁ LOGADO
function verificarLogin(req, res, next) {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.redirect('/login');
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

router.get(
    '/visaoclientecarrinho',
    verificarLogin,
    loginController.abrirVisaoClienteCarrinho
);

router.get(
    '/visaoclientefinalizar',
    verificarLogin,
    loginController.abrirVisaoClienteFinalizar
);

router.get(
    '/visaoclientepagamento',
    verificarLogin,
    loginController.abrirVisaoClientePagamento
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

module.exports = router;
