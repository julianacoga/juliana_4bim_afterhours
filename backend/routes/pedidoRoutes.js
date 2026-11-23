
const express = require('express');
const router = express.Router();

const pedidoController = require('../controllers/pedidoController');

// VERIFICAR LOGIN
function verificarLogin(req, res, next) {
    if (!req.session?.usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Faça login para continuar.'
        });
    }

    next();
}

// VERIFICAR FUNCIONÁRIO
function verificarFuncionario(req, res, next) {
    const usuario = req.session?.usuario;

    if (!usuario || usuario.ehFuncionario !== true) {
        return res.status(403).json({
            sucesso: false,
            mensagem: 'Acesso exclusivo para funcionários.'
        });
    }

    next();
}

// ========================================
// ROTAS DO CLIENTE
// ========================================

// FINALIZAR COMPRA
router.post(
    '/finalizar-compra',
    verificarLogin,
    pedidoController.finalizarCompraCliente
);

// LISTAR MINHAS COMPRAS
router.get(
    '/minhas-compras',
    verificarLogin,
    pedidoController.listarMeusPedidos
);

// DETALHES DE UMA COMPRA
router.get(
    '/minhas-compras/:id',
    verificarLogin,
    pedidoController.obterMeuPedido
);

// ========================================
// ROTAS ADMINISTRATIVAS
// ========================================

// LISTAR TODOS OS PEDIDOS
router.get(
    '/listar',
    verificarFuncionario,
    pedidoController.listarPedidos
);

// CONSULTAR PEDIDO
router.get(
    '/:id',
    verificarFuncionario,
    pedidoController.obterPedido
);

// CADASTRAR PEDIDO
router.post(
    '/',
    verificarFuncionario,
    pedidoController.criarPedido
);

// ATUALIZAR PEDIDO
router.put(
    '/:id',
    verificarFuncionario,
    pedidoController.atualizarPedido
);

// EXCLUIR PEDIDO
router.delete(
    '/:id',
    verificarFuncionario,
    pedidoController.deletarPedido
);

module.exports = router;