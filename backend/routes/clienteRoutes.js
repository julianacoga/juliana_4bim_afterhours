
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// CRUD DE CLIENTES
router.get('/abrirCrudCliente', clienteController.abrirCrudCliente);
router.get('/', clienteController.listarClientes);
router.post('/', clienteController.criarCliente);

// MINHA CONTA
router.get('/minhaConta', clienteController.obterMeuPerfil);
router.put('/minhaConta', clienteController.atualizarMeuPerfil);

// CRUD POR CPF
router.get('/:id', clienteController.obterCliente);
router.put('/:id', clienteController.atualizarCliente);
router.delete('/:id', clienteController.deletarCliente);

module.exports = router;
