
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { query } = require('./database');

const app = express();

// Configurações
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Arquivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/imagens', express.static(path.join(__dirname, '../imagens')));

// Rotas
const ingressoRoutes = require('./routes/ingressoRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const cargoRoutes = require('./routes/cargoRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const funcionarioRoutes = require('./routes/funcionarioRoutes');
const pessoaRoutes = require('./routes/pessoaRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const loginRoutes = require('./routes/loginRoutes');
const menuRoutes = require('./routes/menuRoutes');

app.use('/ingresso', ingressoRoutes);
app.use('/categoria', categoriaRoutes);
app.use('/cliente', clienteRoutes);
app.use('/funcionario', funcionarioRoutes);
app.use('/pessoa', pessoaRoutes);
app.use('/cargo', cargoRoutes);
app.use('/evento', eventoRoutes);
app.use('/pedido', pedidoRoutes);
app.use('/login', loginRoutes);
app.use('/menu', menuRoutes);

// Página inicial pública
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    console.log('\n=================================');
    console.log(`🚀 Servidor executando na porta ${PORT}`);

    try {
        await query('SELECT 1');
        console.log(`✅ Banco de Dados ${process.env.DB_NAME} conectado com sucesso!`);
    } catch (error) {
        console.error('❌ FALHA NA CONEXÃO COM O BANCO DE DADOS:');
        console.error(`Motivo: ${error.message}`);
        console.error('👉 Confira o arquivo .env.');
    }

    console.log('=================================\n');
});
