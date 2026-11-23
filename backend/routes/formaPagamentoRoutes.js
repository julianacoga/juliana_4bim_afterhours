
const express = require('express');
const router = express.Router();

const controller = require(
    '../controllers/formaPagamentoController'
);

router.get('/listar', controller.listar);
router.post('/', controller.criar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.excluir);

module.exports = router;
