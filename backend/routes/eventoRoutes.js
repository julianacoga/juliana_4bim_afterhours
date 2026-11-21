const express = require('express');
const multer = require('multer');
const router = express.Router();
const eventoController = require('../controllers/eventoController');

// Configura o Multer para armazenar em memória temporária para o Sharp processar
const upload = multer({ storage: multer.memoryStorage() });

// Rotas do CRUD de eventos
router.get('/listar', eventoController.listarEvento);
router.get('/publicos', eventoController.listarEventosPublicos);
router.get('/:id', eventoController.obterEvento);
router.post('/', eventoController.criarEvento);
router.put('/:id', eventoController.atualizarEvento);
router.delete('/:id', eventoController.deletarEvento);

// Rota para upload da imagem
router.post('/upload/:id', upload.single('imagem'), eventoController.uploadImagem);

module.exports = router;

