
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
require('dotenv').config();

// Importa a conexão com o banco
const { query, pool } = require('./database');

const app = express();

// ORIGENS PERMITIDAS
const origensPermitidas = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

// CONFIGURAÇÕES
app.use(cors({
    origin: origensPermitidas,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// SESSÕES DOS USUÁRIOS
if (!process.env.SESSION_SECRET) {
    throw new Error(
        'Configure SESSION_SECRET no arquivo backend/.env'
    );
}

app.use(session({
    store: new PgSession({
        pool: pool,
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'afterhours.sid',
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ARQUIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, '../frontend')));

app.use(
    '/imagens',
    express.static(path.join(__dirname, '../imagens'))
);

// IMPORTAR ROTAS
const ingressoRoutes = require('./routes/ingressoRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const cargoRoutes = require('./routes/cargoRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const formaPagamentoRoutes = require('./routes/formaPagamentoRoutes');
const funcionarioRoutes = require('./routes/funcionarioRoutes');
const pessoaRoutes = require('./routes/pessoaRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const loginRoutes = require('./routes/loginRoutes');
const menuRoutes = require('./routes/menuRoutes');
const pagamentoRoutes = require('./routes/pagamentoRoutes');

// REGISTRAR ROTAS
app.use('/ingresso', ingressoRoutes);
app.use('/categoria', categoriaRoutes);
app.use('/cliente', clienteRoutes);
app.use('/formaPagamento', formaPagamentoRoutes);
app.use('/funcionario', funcionarioRoutes);
app.use('/pessoa', pessoaRoutes);
app.use('/cargo', cargoRoutes);
app.use('/evento', eventoRoutes);
app.use('/pedido', pedidoRoutes);
app.use('/login', loginRoutes);
app.use('/menu', menuRoutes);
app.use('/pagamento', pagamentoRoutes);
// PÁGINA INICIAL PÚBLICA
app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../frontend/index.html')
    );
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    console.log('\n=================================');
    console.log(`🚀 Servidor executando na porta ${PORT}`);
    console.log(`🌐 Abra o sistema em: http://localhost:${PORT}/`);

    try {
        await query('SELECT 1');
        console.log(
            `✅ Banco de Dados ${process.env.DB_NAME} conectado com sucesso!`
        );
    } catch (error) {
        console.error('❌ FALHA NA CONEXÃO COM O BANCO DE DADOS:');
        console.error(`Motivo: ${error.message}`);
        console.error('👉 Confira o arquivo .env.');
    }

    console.log('=================================\n');
});
