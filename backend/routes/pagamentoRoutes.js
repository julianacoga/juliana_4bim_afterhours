
const express = require('express');
const router = express.Router();

const pagamentoController = require('../controllers/pagamentoController');

router.get('/:id', pagamentoController.consultarPagamento);

router.post('/:id', pagamentoController.registrarPagamento);

module.exports = router;
