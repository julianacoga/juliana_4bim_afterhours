DROP TABLE IF EXISTS public.pagamento_has_forma_pagamento CASCADE;
DROP TABLE IF EXISTS public.pagamento CASCADE;
DROP TABLE IF EXISTS public.pedido_has_ingresso CASCADE;
DROP TABLE IF EXISTS public.pedido CASCADE;
DROP TABLE IF EXISTS public.ingresso CASCADE;
DROP TABLE IF EXISTS public.evento CASCADE;
DROP TABLE IF EXISTS public.forma_pagamento CASCADE;
DROP TABLE IF EXISTS public.cliente CASCADE;
DROP TABLE IF EXISTS public.funcionario CASCADE;
DROP TABLE IF EXISTS public.cargo CASCADE;
DROP TABLE IF EXISTS public.pessoa CASCADE;


-- ==========================================
-- TABELA PESSOA
-- ==========================================

CREATE TABLE public.pessoa (
    cpf_pessoa VARCHAR(14) PRIMARY KEY,
    nome_pessoa VARCHAR(60) NOT NULL,
    data_nascimento_pessoa DATE,
    genero_pessoa VARCHAR(30),
    senha_pessoa VARCHAR(255) NOT NULL,
    email_pessoa VARCHAR(75) UNIQUE NOT NULL,
	telefone_pessoa VARCHAR(20)
);


-- ==========================================
-- TABELA CARGO
-- ==========================================

CREATE TABLE public.cargo (
    id_cargo SERIAL PRIMARY KEY,
    nome_cargo VARCHAR(45) NOT NULL UNIQUE
);


-- ==========================================
-- TABELA FUNCIONARIO
-- ==========================================

CREATE TABLE public.funcionario (
    pessoa_cpf_pessoa VARCHAR(14) PRIMARY KEY,
    salario_funcionario NUMERIC(10,2),
    cargo_id_cargo INTEGER NOT NULL,

    FOREIGN KEY (pessoa_cpf_pessoa)
        REFERENCES public.pessoa(cpf_pessoa),

    FOREIGN KEY (cargo_id_cargo)
        REFERENCES public.cargo(id_cargo)
);


-- ==========================================
-- TABELA CLIENTE
-- ==========================================

CREATE TABLE public.cliente (
    pessoa_cpf_pessoa VARCHAR(14) PRIMARY KEY,
    data_cadastro_cliente DATE DEFAULT CURRENT_DATE,

    FOREIGN KEY (pessoa_cpf_pessoa)
        REFERENCES public.pessoa(cpf_pessoa)
);


-- ==========================================
-- TABELA CATEGORIA
-- ==========================================

CREATE TABLE public.categoria (
    id_categoria SERIAL PRIMARY KEY,
    nome_categoria VARCHAR(50) NOT NULL UNIQUE
);

-- ==========================================
-- TABELA EVENTO
-- ==========================================

CREATE TABLE public.evento (
    id_evento SERIAL PRIMARY KEY,
    titulo_evento VARCHAR(80) NOT NULL,
    descricao_evento TEXT,
    local_evento VARCHAR(150) NOT NULL,
    endereco_evento VARCHAR(200),
    data_evento DATE NOT NULL,
    horario_evento TIME NOT NULL,
    imagem_evento VARCHAR(255),
    status_evento VARCHAR(30) DEFAULT 'Ativo',

    funcionario_pessoa_cpf_pessoa VARCHAR(14) NOT NULL,

    FOREIGN KEY (funcionario_pessoa_cpf_pessoa)
        REFERENCES public.funcionario(pessoa_cpf_pessoa),

		categoria_id_categoria INTEGER NOT NULL,

	FOREIGN KEY (categoria_id_categoria)
    	REFERENCES public.categoria(id_categoria)
);


-- ==========================================
-- TABELA INGRESSO
-- ==========================================

CREATE TABLE public.ingresso (
    id_ingresso SERIAL PRIMARY KEY,
    nome_ingresso VARCHAR(45) NOT NULL,
    quantidade_estoque_ingresso INTEGER NOT NULL,
    preco_unitario_ingresso NUMERIC(10,2) NOT NULL,

    evento_id_evento INTEGER NOT NULL,

    FOREIGN KEY (evento_id_evento)
        REFERENCES public.evento(id_evento),

    CHECK (quantidade_estoque_ingresso >= 0),
    CHECK (preco_unitario_ingresso >= 0)
);


-- ==========================================
-- TABELA PEDIDO
-- ==========================================

CREATE TABLE public.pedido (
    id_pedido SERIAL PRIMARY KEY,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_pedido VARCHAR(30) DEFAULT 'Pendente',

    cliente_pessoa_cpf_pessoa VARCHAR(14) NOT NULL,
    funcionario_pessoa_cpf_pessoa VARCHAR(14) NOT NULL,

    FOREIGN KEY (cliente_pessoa_cpf_pessoa)
        REFERENCES public.cliente(pessoa_cpf_pessoa),

    FOREIGN KEY (funcionario_pessoa_cpf_pessoa)
        REFERENCES public.funcionario(pessoa_cpf_pessoa)
);


-- ==========================================
-- TABELA PEDIDO_HAS_INGRESSO
-- ==========================================

CREATE TABLE public.pedido_has_ingresso (
    ingresso_id_ingresso INTEGER NOT NULL,
    pedido_id_pedido INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,

    PRIMARY KEY (ingresso_id_ingresso, pedido_id_pedido),

    FOREIGN KEY (ingresso_id_ingresso)
        REFERENCES public.ingresso(id_ingresso),

    FOREIGN KEY (pedido_id_pedido)
        REFERENCES public.pedido(id_pedido),

    CHECK (quantidade > 0),
    CHECK (preco_unitario >= 0)
);


-- ==========================================
-- TABELA FORMA_PAGAMENTO
-- ==========================================

CREATE TABLE public.forma_pagamento (
    id_forma_pagamento SERIAL PRIMARY KEY,
    nome_forma_pagamento VARCHAR(100) NOT NULL UNIQUE
);


-- ==========================================
-- TABELA PAGAMENTO
-- ==========================================

CREATE TABLE public.pagamento (
    pedido_id_pedido INTEGER PRIMARY KEY,
    data_pagamento TIMESTAMP,
    valor_total_pagamento NUMERIC(10,2) NOT NULL,
    status_pagamento VARCHAR(30) DEFAULT 'Pendente',

    FOREIGN KEY (pedido_id_pedido)
        REFERENCES public.pedido(id_pedido),

    CHECK (valor_total_pagamento >= 0)
);


-- ==========================================
-- TABELA PAGAMENTO_HAS_FORMA_PAGAMENTO
-- ==========================================

CREATE TABLE public.pagamento_has_forma_pagamento (
    pagamento_id_pedido INTEGER NOT NULL,
    forma_pagamento_id_forma_pagamento INTEGER NOT NULL,
    valor_pago NUMERIC(10,2) NOT NULL,

    PRIMARY KEY (
        pagamento_id_pedido,
        forma_pagamento_id_forma_pagamento
    ),

    FOREIGN KEY (pagamento_id_pedido)
        REFERENCES public.pagamento(pedido_id_pedido),

    FOREIGN KEY (forma_pagamento_id_forma_pagamento)
        REFERENCES public.forma_pagamento(id_forma_pagamento),

    CHECK (valor_pago >= 0)
);