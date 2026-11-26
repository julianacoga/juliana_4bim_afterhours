DROP TABLE IF EXISTS public.pagamento_has_forma_pagamento CASCADE;
DROP TABLE IF EXISTS public.pagamento CASCADE;
DROP TABLE IF EXISTS public.pedido_has_ingresso CASCADE;
DROP TABLE IF EXISTS public.pedido CASCADE;
DROP TABLE IF EXISTS public.ingresso CASCADE;
DROP TABLE IF EXISTS public.evento CASCADE;
DROP TABLE IF EXISTS public.categoria CASCADE;
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
	telefone_pessoa VARCHAR(20),
	telefone_pessoa VARCHAR(20),
	token_recuperacao VARCHAR(64),
	validade_token TIMESTAMPTZ
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

ALTER TABLE pessoa
ADD COLUMN IF NOT EXISTS token_recuperacao VARCHAR(64),
ADD COLUMN IF NOT EXISTS validade_token TIMESTAMPTZ;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SELECT setval(
    pg_get_serial_sequence('public.cargo', 'id_cargo'),
    COALESCE(MAX(id_cargo), 1),
    COUNT(*) > 0
) FROM public.cargo;

SELECT setval(
    pg_get_serial_sequence('public.categoria', 'id_categoria'),
    COALESCE(MAX(id_categoria), 1),
    COUNT(*) > 0
) FROM public.categoria;

SELECT setval(
    pg_get_serial_sequence('public.evento', 'id_evento'),
    COALESCE(MAX(id_evento), 1),
    COUNT(*) > 0
) FROM public.evento;

SELECT setval(
    pg_get_serial_sequence('public.ingresso', 'id_ingresso'),
    COALESCE(MAX(id_ingresso), 1),
    COUNT(*) > 0
) FROM public.ingresso;

SELECT setval(
    pg_get_serial_sequence('public.pedido', 'id_pedido'),
    COALESCE(MAX(id_pedido), 1),
    COUNT(*) > 0
) FROM public.pedido;

SELECT setval(
    pg_get_serial_sequence(
        'public.forma_pagamento',
        'id_forma_pagamento'
    ),
    COALESCE(MAX(id_forma_pagamento), 1),
    COUNT(*) > 0
) FROM public.forma_pagamento;

INSERT INTO public.cargo (nome_cargo)
VALUES
    ('Administrador'),
    ('Gerente'),
    ('Produtor de Eventos'),
    ('Coordenador'),
    ('Atendente'),
    ('Analista Financeiro'),
    ('Supervisor'),
    ('Assistente Administrativo'),
    ('Analista de Marketing'),
    ('Organizador de Eventos')
ON CONFLICT (nome_cargo) DO NOTHING;

INSERT INTO public.categoria (nome_categoria)
VALUES
    ('Shows'),
    ('Festivais'),
    ('Teatro'),
    ('Stand-up'),
    ('Gastronomia'),
    ('Cultura'),
    ('Experiências'),
    ('Esportes'),
    ('Musicais'),
    ('Exposições')
ON CONFLICT (nome_categoria) DO NOTHING;

INSERT INTO public.pessoa (
    cpf_pessoa,
    nome_pessoa,
    data_nascimento_pessoa,
    genero_pessoa,
    senha_pessoa,
    email_pessoa,
    telefone_pessoa
)
SELECT
    '990000000' || LPAD(i::TEXT, 2, '0'),
    nomes[i],
    DATE '1995-01-01' + (i * 137),
    CASE
        WHEN i % 2 = 0 THEN 'Masculino'
        ELSE 'Feminino'
    END,
    crypt('AfterHours123!', gen_salt('bf', 12)),
    'testeafterhours' || i || '@example.com',
    '44000000000'
FROM generate_series(1, 20) AS g(i)
CROSS JOIN (
    SELECT ARRAY[
        'Helena Monteiro',
        'Gabriel Almeida',
        'Isadora Moretti',
        'Lucas Martins',
        'Sofia Nakamura',
        'Rafael Bellini',
        'Manuela Ferraz',
        'Matheus Ribeiro',
        'Catarina Rossi',
        'Pedro Carvalho',
        'Valentina Costa',
        'Arthur Mendes',
        'Olivia Fernandes',
        'Leonardo Gomes',
        'Antonella Duarte',
        'Bruno Oliveira',
        'Laura Cardoso',
        'Felipe Andrade',
        'Beatriz Lima',
        'Miguel Rocha'
    ] AS nomes
) AS dados
ON CONFLICT DO NOTHING;

INSERT INTO public.funcionario (
    pessoa_cpf_pessoa,
    salario_funcionario,
    cargo_id_cargo
)
SELECT
    '990000000' || LPAD(i::TEXT, 2, '0'),
    2500 + (i * 350),
    c.id_cargo
FROM generate_series(1, 10) AS g(i)
JOIN (
    SELECT
        id_cargo,
        ROW_NUMBER() OVER (ORDER BY id_cargo) AS numero
    FROM public.cargo
) AS c ON c.numero = i
ON CONFLICT DO NOTHING;

INSERT INTO public.cliente (
    pessoa_cpf_pessoa,
    data_cadastro_cliente
)
SELECT
    '990000000' || LPAD(i::TEXT, 2, '0'),
    CURRENT_DATE - i
FROM generate_series(11, 20) AS g(i)
ON CONFLICT DO NOTHING;

INSERT INTO public.forma_pagamento (
    nome_forma_pagamento
)
VALUES
    ('PIX'),
    ('Cartão de Crédito'),
    ('Cartão de Débito'),
    ('Boleto Bancário'),
    ('Dinheiro'),
    ('Transferência Bancária'),
    ('PayPal'),
    ('Apple Pay'),
    ('Google Pay'),
    ('Carteira Digital')
ON CONFLICT DO NOTHING;

INSERT INTO public.categoria (nome_categoria)
VALUES
    ('Sertanejo'),
    ('Pagode'),
    ('MPB'),
    ('Pop'),
    ('Indie'),
    ('Rock'),
    ('Rap e Trap'),
    ('Eletrônica'),
    ('Funk'),
    ('Musicais'),
    ('Teatro'),
    ('Festas'),
    ('Festivais'),
    ('Stand-up')
ON CONFLICT (nome_categoria) DO NOTHING;

INSERT INTO public.evento (
    titulo_evento,
    descricao_evento,
    local_evento,
    endereco_evento,
    data_evento,
    horario_evento,
    status_evento,
    funcionario_pessoa_cpf_pessoa,
    categoria_id_categoria
)
SELECT
    e.titulo,
    e.descricao,
    e.local,
    e.cidade,
    e.data::DATE,
    e.horario::TIME,
    'Ativo',
    '99000000001',
    c.id_categoria
FROM (
    VALUES

    -- SERTANEJO

    ('Luan Santana - Ao Vivo',
    'Uma noite emocionante com os maiores sucessos de Luan Santana.',
    'Arena da Baixada', 'Curitiba - PR',
    '2027-02-06', '21:00', 'Sertanejo'),

    ('Matheus & Kauan - Na Praia',
    'Uma experiência especial com grandes sucessos da dupla.',
    'Arena Sunset', 'Florianópolis - SC',
    '2027-01-23', '18:00', 'Sertanejo'),

    ('Henrique & Juliano',
    'Uma noite de música, emoção e grandes clássicos do sertanejo.',
    'Estádio do Café', 'Londrina - PR',
    '2027-03-13', '21:00', 'Sertanejo'),

    ('Zé Neto & Cristiano',
    'Os maiores sucessos da dupla em uma apresentação especial.',
    'Parque de Exposições', 'Maringá - PR',
    '2027-02-20', '22:00', 'Sertanejo'),

    ('Ana Castela - Boiadeira',
    'Uma experiência que mistura sertanejo e energia do agronejo.',
    'Arena de Eventos', 'Campo Mourão - PR',
    '2027-04-10', '20:00', 'Sertanejo'),

    -- PAGODE

    ('Menos é Mais - Churrasquinho',
    'Uma tarde de pagode, música ao vivo e grandes sucessos.',
    'Pedreira Paulo Leminski', 'Curitiba - PR',
    '2027-02-14', '16:00', 'Pagode'),

    ('Ferrugem - Ao Vivo',
    'Uma apresentação especial com os maiores sucessos do pagode.',
    'Arena Music', 'Maringá - PR',
    '2027-03-06', '20:00', 'Pagode'),

    -- MPB

    ('Djavan - Uma Noite Especial',
    'Uma viagem musical pelos clássicos da música brasileira.',
    'Teatro Guaíra', 'Curitiba - PR',
    '2027-04-17', '20:00', 'MPB'),

    ('ANAVITÓRIA - Acústico',
    'Uma apresentação intimista com músicas que marcaram gerações.',
    'Teatro Positivo', 'Curitiba - PR',
    '2027-03-21', '19:00', 'MPB'),

    -- POP INTERNACIONAL

    ('Olivia Rodrigo - Live in Brazil',
    'Uma noite de pop, emoção e grandes sucessos.',
    'Allianz Parque', 'São Paulo - SP',
    '2027-05-15', '20:00', 'Pop'),

    ('The Weeknd - After Hours',
    'Uma experiência musical e visual inspirada no universo do artista.',
    'Estádio Morumbi', 'São Paulo - SP',
    '2027-06-12', '21:00', 'Pop'),

    ('One Direction - Reunion',
    'Uma reunião fictícia da banda para celebrar seus maiores sucessos.',
    'Allianz Parque', 'São Paulo - SP',
    '2027-07-24', '20:00', 'Pop'),

    ('Pitbull - World Party',
    'Uma noite de grandes sucessos internacionais e muita energia.',
    'Arena Music', 'Rio de Janeiro - RJ',
    '2027-03-27', '20:00', 'Pop'),

    ('SIENNA SPIRO - Live',
    'Uma apresentação intimista com vocais marcantes e música ao vivo.',
    'Teatro Bradesco', 'São Paulo - SP',
    '2027-05-22', '19:30', 'Pop'),

    -- INDIE

    ('The Neighbourhood - Live',
    'Uma noite de indie rock e atmosfera alternativa.',
    'Espaço Unimed', 'São Paulo - SP',
    '2027-05-08', '20:00', 'Indie'),

    ('Arctic Monkeys - Live in Brazil',
    'Uma apresentação dedicada aos grandes sucessos da banda.',
    'Pedreira Paulo Leminski', 'Curitiba - PR',
    '2027-06-19', '20:00', 'Indie'),

    ('Chase Atlantic - Live',
    'Uma experiência alternativa que mistura pop, R&B e sonoridades eletrônicas.',
    'Vibra São Paulo', 'São Paulo - SP',
    '2027-04-24', '20:00', 'Indie'),

    -- ROCK

    ('Metallica - World Tour',
    'Uma noite de heavy metal com clássicos e performances marcantes.',
    'Estádio Morumbi', 'São Paulo - SP',
    '2027-08-14', '20:00', 'Rock'),

    -- RAP E TRAP

    ('Drake - Live in Brazil',
    'Uma apresentação com grandes sucessos do rap e R&B.',
    'Allianz Parque', 'São Paulo - SP',
    '2027-07-10', '21:00', 'Rap e Trap'),

    ('Orochi - Ao Vivo',
    'Uma noite dedicada ao rap e ao trap nacional.',
    'Arena Music', 'Curitiba - PR',
    '2027-02-27', '20:00', 'Rap e Trap'),

    ('Veigh - Live',
    'Uma experiência com os maiores sucessos do trap brasileiro.',
    'Espaço Unimed', 'São Paulo - SP',
    '2027-03-20', '20:00', 'Rap e Trap'),

    ('Travis Scott - Live Experience',
    'Uma apresentação de rap com produção audiovisual imersiva.',
    'Estádio Morumbi', 'São Paulo - SP',
    '2027-09-18', '21:00', 'Rap e Trap'),

    -- FUNK

    ('Felipe Amorim - Ao Vivo',
    'Uma apresentação animada com ritmos brasileiros e grandes sucessos.',
    'Arena de Eventos', 'Maringá - PR',
    '2027-02-13', '20:00', 'Funk'),

    -- ELETRÔNICA

    ('Alok - Sunset Experience',
    'Uma experiência de música eletrônica e produção audiovisual.',
    'Arena Sunset', 'Florianópolis - SC',
    '2027-01-30', '17:00', 'Eletrônica'),

    ('David Guetta - Live',
    'Uma apresentação com grandes sucessos da música eletrônica.',
    'Arena Music', 'Rio de Janeiro - RJ',
    '2027-06-05', '20:00', 'Eletrônica'),

    ('DJ Petroski - Live Session',
    'Uma apresentação especial de música eletrônica.',
    'Arena After Hours', 'Campo Mourão - PR',
    '2027-02-05', '19:00', 'Eletrônica'),

    -- MUSICAIS

    ('Mamma Mia! - O Musical',
    'Uma história divertida e emocionante embalada pelas músicas do ABBA.',
    'Teatro Santander', 'São Paulo - SP',
    '2027-03-07', '19:00', 'Musicais'),

    ('Wicked - O Musical',
    'Uma nova perspectiva sobre o universo mágico de Oz.',
    'Teatro Renault', 'São Paulo - SP',
    '2027-04-11', '18:00', 'Musicais'),

    ('O Rei Leão - O Musical',
    'Uma experiência teatral com música, figurinos e cenários encantadores.',
    'Teatro Renault', 'São Paulo - SP',
    '2027-05-09', '17:00', 'Musicais'),

    ('Hamilton - O Musical',
    'Uma produção musical que mistura história e hip-hop.',
    'Teatro Santander', 'São Paulo - SP',
    '2027-06-20', '19:00', 'Musicais'),

    ('O Fantasma da Ópera',
    'Um clássico do teatro musical com uma história de mistério e emoção.',
    'Teatro Bradesco', 'São Paulo - SP',
    '2027-07-18', '19:30', 'Musicais'),

    -- TEATRO

    ('Romeu e Julieta',
    'Uma adaptação teatral do clássico de William Shakespeare.',
    'Teatro Guaíra', 'Curitiba - PR',
    '2027-03-14', '19:00', 'Teatro'),

    ('O Auto da Compadecida',
    'Uma apresentação inspirada no clássico do teatro brasileiro.',
    'Teatro Municipal', 'Campo Mourão - PR',
    '2027-04-04', '18:00', 'Teatro'),

    ('Alice no País das Maravilhas',
    'Uma aventura teatral em um universo fantástico.',
    'Teatro Marista', 'Maringá - PR',
    '2027-05-16', '16:00', 'Teatro'),

    -- FESTAS

    ('After Hours - Neon Party',
    'Uma festa temática com luzes neon, música e decoração imersiva.',
    'Arena After Hours', 'Campo Mourão - PR',
    '2027-02-19', '19:00', 'Festas'),

    ('Dancing Queen - ABBA Experience',
    'Uma festa temática inspirada na música e na estética dos anos 70.',
    'Espaço Cultural', 'Maringá - PR',
    '2027-03-05', '19:00', 'Festas'),

    ('Back to the 2000s',
    'Uma viagem pelos maiores sucessos musicais dos anos 2000.',
    'Arena Music', 'Curitiba - PR',
    '2027-04-09', '19:00', 'Festas'),

    -- FESTIVAIS

    ('Lollapalooza Brasil',
    'Um festival com diferentes estilos musicais e experiências culturais.',
    'Autódromo de Interlagos', 'São Paulo - SP',
    '2027-03-26', '12:00', 'Festivais'),

    ('The Town',
    'Um festival que reúne música, arte e entretenimento.',
    'Autódromo de Interlagos', 'São Paulo - SP',
    '2027-09-04', '12:00', 'Festivais'),

    -- STAND-UP

    ('Noite de Comédia',
    'Uma apresentação de stand-up com diferentes comediantes.',
    'Teatro Municipal', 'Campo Mourão - PR',
    '2027-02-21', '19:00', 'Stand-up')

) AS e(
    titulo,
    descricao,
    local,
    cidade,
    data,
    horario,
    categoria
)
JOIN public.categoria c
    ON c.nome_categoria = e.categoria
WHERE NOT EXISTS (
    SELECT 1
    FROM public.evento ev
    WHERE ev.titulo_evento = e.titulo
);

INSERT INTO public.ingresso (
    nome_ingresso,
    quantidade_estoque_ingresso,
    preco_unitario_ingresso,
    evento_id_evento
)
SELECT
    t.nome,
    t.estoque,
    CASE t.nome
        WHEN 'Pista' THEN p.pista
        WHEN 'VIP' THEN p.vip
        WHEN 'Camarote' THEN p.camarote
    END,
    e.id_evento
FROM public.evento e
JOIN public.categoria c
    ON c.id_categoria = e.categoria_id_categoria
JOIN (
    VALUES
        ('Sertanejo', 90, 180, 350),
        ('Pagode', 70, 140, 280),
        ('MPB', 120, 240, 400),
        ('Pop', 350, 650, 1200),
        ('Indie', 250, 450, 800),
        ('Rock', 350, 700, 1300),
        ('Rap e Trap', 180, 350, 650),
        ('Eletrônica', 150, 300, 600),
        ('Funk', 80, 150, 300),
        ('Musicais', 100, 200, 400),
        ('Teatro', 50, 90, 150),
        ('Festas', 40, 80, 150),
        ('Festivais', 450, 850, 1500),
        ('Stand-up', 50, 90, 150)
) AS p(categoria, pista, vip, camarote)
    ON p.categoria = c.nome_categoria
CROSS JOIN (
    VALUES
        ('Pista', 500),
        ('VIP', 200),
        ('Camarote', 80)
) AS t(nome, estoque)
WHERE e.funcionario_pessoa_cpf_pessoa = '99000000001'
AND NOT EXISTS (
    SELECT 1
    FROM public.ingresso i
    WHERE i.evento_id_evento = e.id_evento
      AND i.nome_ingresso = t.nome
);


BEGIN;
WITH novosPedidos AS (
    INSERT INTO public.pedido (
        data_pedido,
        status_pedido,
        cliente_pessoa_cpf_pessoa,
        funcionario_pessoa_cpf_pessoa
    )
    SELECT
        CURRENT_TIMESTAMP - (i * INTERVAL '1 day'),
        'Confirmado',
        '990000000' || LPAD(i::TEXT, 2, '0'),
        '99000000001'
    FROM generate_series(11, 20) AS g(i)
    RETURNING id_pedido
),

pedidosNumerados AS (
    SELECT
        id_pedido,
        ROW_NUMBER() OVER (
            ORDER BY id_pedido
        ) AS numero
    FROM novosPedidos
),

ingressosNumerados AS (
    SELECT
        i.id_ingresso,
        i.preco_unitario_ingresso,
        ROW_NUMBER() OVER (
            ORDER BY i.id_ingresso
        ) AS numero
    FROM public.ingresso i
    JOIN public.evento e
        ON e.id_evento = i.evento_id_evento
    WHERE i.nome_ingresso = 'Pista'
      AND i.quantidade_estoque_ingresso >= 2
      AND e.funcionario_pessoa_cpf_pessoa = '99000000001'
),

novosItens AS (
    INSERT INTO public.pedido_has_ingresso (
        ingresso_id_ingresso,
        pedido_id_pedido,
        quantidade,
        preco_unitario
    )
    SELECT
        i.id_ingresso,
        p.id_pedido,
        2,
        i.preco_unitario_ingresso
    FROM pedidosNumerados p
    JOIN ingressosNumerados i
        ON i.numero = p.numero
    RETURNING *
),

atualizarEstoque AS (
    UPDATE public.ingresso i
    SET quantidade_estoque_ingresso =
        i.quantidade_estoque_ingresso - ni.quantidade
    FROM novosItens ni
    WHERE i.id_ingresso = ni.ingresso_id_ingresso
    RETURNING i.id_ingresso
),

novosPagamentos AS (
    INSERT INTO public.pagamento (
        pedido_id_pedido,
        data_pagamento,
        valor_total_pagamento,
        status_pagamento
    )
    SELECT
        pedido_id_pedido,
        CURRENT_TIMESTAMP,
        quantidade * preco_unitario,
        'Aprovado'
    FROM novosItens
    RETURNING *
)

INSERT INTO public.pagamento_has_forma_pagamento (
    pagamento_id_pedido,
    forma_pagamento_id_forma_pagamento,
    valor_pago
)
SELECT
    p.pedido_id_pedido,
    f.id_forma_pagamento,
    p.valor_total_pagamento
FROM novosPagamentos p
CROSS JOIN public.forma_pagamento f
WHERE f.nome_forma_pagamento = 'PIX';

COMMIT;

SELECT 'pessoa' AS tabela, COUNT(*) AS registros
FROM public.pessoa
UNION ALL
SELECT 'cargo', COUNT(*) FROM public.cargo
UNION ALL
SELECT 'funcionario', COUNT(*) FROM public.funcionario
UNION ALL
SELECT 'cliente', COUNT(*) FROM public.cliente
UNION ALL
SELECT 'categoria', COUNT(*) FROM public.categoria
UNION ALL
SELECT 'evento', COUNT(*) FROM public.evento
UNION ALL
SELECT 'ingresso', COUNT(*) FROM public.ingresso
UNION ALL
SELECT 'pedido', COUNT(*) FROM public.pedido
UNION ALL
SELECT 'pedido_has_ingresso', COUNT(*) FROM public.pedido_has_ingresso
UNION ALL
SELECT 'forma_pagamento', COUNT(*) FROM public.forma_pagamento
UNION ALL
SELECT 'pagamento', COUNT(*) FROM public.pagamento
UNION ALL
SELECT 'pagamento_has_forma_pagamento', COUNT(*)
FROM public.pagamento_has_forma_pagamento;