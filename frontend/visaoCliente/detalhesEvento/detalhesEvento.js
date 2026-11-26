
const API_BASE_URL = `http://${window.location.hostname}:3001`;

const parametros = new URLSearchParams(window.location.search);
const idEvento = Number(parametros.get('id'));

let eventoAtual = null;
let ingressos = [];
let quantidades = {};
let autenticado = false;

// FORMATAR VALORES
function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// FORMATAR DATA
function formatarData(data) {
    if (!data) return 'Data a definir';

    return new Date(data).toLocaleDateString('pt-BR', {
        timeZone: 'UTC'
    });
}

// LER CARRINHO
function lerCarrinho() {
    try {
        const dados = JSON.parse(
            sessionStorage.getItem('carrinho') || '[]'
        );

        return Array.isArray(dados) ? dados : [];

    } catch {
        return [];
    }
}

// SALVAR CARRINHO
function salvarCarrinho(carrinho) {
    sessionStorage.setItem(
        'carrinho',
        JSON.stringify(carrinho)
    );

    atualizarContadorCarrinho();
}

// ATUALIZAR CONTADOR
function atualizarContadorCarrinho() {
    const total = lerCarrinho().reduce(
        (soma, item) => soma + Number(item.quantidade),
        0
    );

    document.getElementById('contadorCarrinho').textContent =
        total;
}

// VERIFICAR LOGIN SEM REDIRECIONAR
async function verificarLogin() {
    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/verificaSeUsuarioEstaLogado`,
            {
                credentials: 'include'
            }
        );

        if (!resposta.ok) return false;

        const dados = await resposta.json();

        autenticado = dados.status === 'ok';

        if (autenticado) {
            document.getElementById('linkConta').textContent =
                dados.usuario.nome || 'Minha conta';

            document.getElementById('linkConta').href =
                `${API_BASE_URL}/login/visaocliente`;

            document.getElementById('linkVoltar').href =
                `${API_BASE_URL}/login/visaocliente`;
        }

        return autenticado;

    } catch (erro) {
        console.error('Erro ao verificar login:', erro);
        return false;
    }
}

// CARREGAR EVENTO
async function carregarEvento() {
    try {
        if (!Number.isInteger(idEvento) || idEvento <= 0) {
            throw new Error('Evento inválido.');
        }

        const resposta = await fetch(
            `${API_BASE_URL}/evento/publicos`
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error('Não foi possível carregar o evento.');
        }

        eventoAtual = dados.eventos.find(
            evento => Number(evento.id_evento) === idEvento
        );

        if (!eventoAtual) {
            throw new Error('Evento não encontrado ou indisponível.');
        }

        document.title =
            `${eventoAtual.titulo_evento} | After Hours`;

        document.getElementById('tituloEvento').textContent =
            eventoAtual.titulo_evento;

        document.getElementById('categoriaEvento').textContent =
            eventoAtual.nome_categoria || 'Evento';

        document.getElementById('descricaoEvento').textContent =
            eventoAtual.descricao_evento ||
            'Confira os ingressos disponíveis para este evento.';

        document.getElementById('localEvento').textContent =
            eventoAtual.local_evento || 'Local a definir';

        document.getElementById('dataEvento').textContent =
            formatarData(eventoAtual.data_evento);

        document.getElementById('horarioEvento').textContent =
            eventoAtual.horario_evento || 'Horário a definir';

        const imagem = document.getElementById('imagemEvento');

        if (eventoAtual.imagem_evento) {
            imagem.src =
                `${API_BASE_URL}/imagens/${encodeURIComponent(eventoAtual.imagem_evento)}`;

            imagem.alt = eventoAtual.titulo_evento;

            imagem.onerror = () => {
                imagem.hidden = true;
            };

        } else {
            imagem.hidden = true;
        }

        document.getElementById('mensagem').hidden = true;
        document.getElementById('conteudoEvento').hidden = false;

        await carregarIngressos();

    } catch (erro) {
        console.error(erro);

        document.getElementById('mensagem').textContent =
            erro.message;
    }
}

// CARREGAR INGRESSOS DO EVENTO
async function carregarIngressos() {
    const lista = document.getElementById('listaIngressos');

    try {
        lista.textContent = 'Carregando ingressos...';

        const resposta = await fetch(
            `${API_BASE_URL}/ingresso/evento/${idEvento}`,
            {
                credentials: 'include'
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error('Erro ao carregar ingressos.');
        }

        ingressos = dados.ingressos || [];

        ingressos.forEach(ingresso => {
            quantidades[ingresso.id_ingresso] = 0;
        });

        renderizarIngressos();

    } catch (erro) {
        console.error(erro);
        lista.textContent = erro.message;
    }
}

// CALCULAR ESTOQUE DISPONÍVEL
function obterLimite(ingresso) {
    const existente = lerCarrinho().find(
        item => Number(item.id) === Number(ingresso.id_ingresso)
    );

    const quantidadeCarrinho = existente
        ? Number(existente.quantidade)
        : 0;

    return Math.max(
        0,
        Number(ingresso.quantidade_estoque_ingresso) -
        quantidadeCarrinho
    );
}

// MONTAR CARDS DE INGRESSOS
function renderizarIngressos() {
    const lista = document.getElementById('listaIngressos');

    lista.innerHTML = '';

    if (!ingressos.length) {
        lista.textContent =
            'Ainda não existem ingressos disponíveis.';
        return;
    }

    ingressos.forEach(ingresso => {
        const id = ingresso.id_ingresso;
        const limite = obterLimite(ingresso);

        const card = document.createElement('article');
        card.className = 'ingressoCard';

        const info = document.createElement('div');

        const nome = document.createElement('h3');
        nome.textContent = ingresso.nome_ingresso;

        const disponibilidade = document.createElement('p');

        disponibilidade.textContent = limite > 0
            ? `${limite} disponível(is)`
            : 'Indisponível para adicionar';

        const preco = document.createElement('strong');
        preco.textContent =
            formatarMoeda(ingresso.preco_unitario_ingresso);

        info.append(nome, disponibilidade, preco);

        const controle = document.createElement('div');
        controle.className = 'controleQuantidade';

        // BOTÃO MENOS
        const menos = document.createElement('button');
        menos.type = 'button';
        menos.textContent = '−';

        menos.setAttribute(
            'aria-label',
            `Diminuir quantidade de ${ingresso.nome_ingresso}`
        );

        menos.disabled = quantidades[id] <= 0;

        menos.addEventListener('click', () => {
            alterarQuantidade(id, -1);
        });

        // QUANTIDADE
        const quantidade = document.createElement('span');
        quantidade.textContent = quantidades[id] || 0;

        // BOTÃO MAIS
        const mais = document.createElement('button');
        mais.type = 'button';
        mais.textContent = '+';

        mais.setAttribute(
            'aria-label',
            `Aumentar quantidade de ${ingresso.nome_ingresso}`
        );

        mais.disabled = quantidades[id] >= limite;

        mais.addEventListener('click', () => {
            alterarQuantidade(id, 1);
        });

        controle.append(menos, quantidade, mais);
        card.append(info, controle);

        lista.appendChild(card);
    });

    atualizarTotal();
}

// ALTERAR QUANTIDADE
function alterarQuantidade(id, variacao) {
    const ingresso = ingressos.find(
        item => Number(item.id_ingresso) === Number(id)
    );

    if (!ingresso) return;

    const limite = obterLimite(ingresso);

    const novaQuantidade =
        Number(quantidades[id] || 0) + variacao;

    quantidades[id] = Math.max(
        0,
        Math.min(novaQuantidade, limite)
    );

    renderizarIngressos();
}

// ATUALIZAR VALOR TOTAL
function atualizarTotal() {
    let total = 0;
    let quantidadeTotal = 0;

    ingressos.forEach(ingresso => {
        const quantidade =
            Number(quantidades[ingresso.id_ingresso] || 0);

        total += quantidade *
            Number(ingresso.preco_unitario_ingresso);

        quantidadeTotal += quantidade;
    });

    document.getElementById('valorTotal').textContent =
        formatarMoeda(total);

    document.getElementById('quantidadeTotal').textContent =
        `${quantidadeTotal} ingresso(s)`;

    document.getElementById('btnAdicionar').disabled =
        quantidadeTotal === 0;
}

// ADICIONAR AO CARRINHO
async function adicionarAoCarrinho() {
    const aviso = document.getElementById('avisoCompra');
    const botao = document.getElementById('btnAdicionar');

    botao.disabled = true;

    try {
        const carrinho = lerCarrinho();

        const selecionados = ingressos.filter(
            ingresso => quantidades[ingresso.id_ingresso] > 0
        );

        if (!selecionados.length) {
            aviso.textContent = 'Selecione pelo menos um ingresso.';
            return;
        }

        // VALIDAR QUANTIDADES
        for (const ingresso of selecionados) {
            const quantidade = quantidades[ingresso.id_ingresso];

            if (quantidade > obterLimite(ingresso)) {
                aviso.textContent =
                    'A quantidade ultrapassa o estoque disponível.';

                return;
            }
        }

        // ADICIONAR INGRESSOS
        selecionados.forEach(ingresso => {
            const id = Number(ingresso.id_ingresso);
            const quantidade = quantidades[id];

            const existente = carrinho.find(
                item => Number(item.id) === id
            );

            if (existente) {
                existente.quantidade =
                    Number(existente.quantidade) + quantidade;

                existente.estoque =
                    Number(ingresso.quantidade_estoque_ingresso);

            } else {
                carrinho.push({
                    id: id,
                    id_ingresso: id,
                    id_evento: idEvento,
                    evento: eventoAtual.titulo_evento,
                    nome: ingresso.nome_ingresso,
                    preco: Number(ingresso.preco_unitario_ingresso),
                    quantidade: quantidade,
                    estoque: Number(
                        ingresso.quantidade_estoque_ingresso
                    )
                });
            }

            quantidades[id] = 0;
        });

        salvarCarrinho(carrinho);
        renderizarIngressos();

        window.location.href =
            `${API_BASE_URL}/login/visaoclientecarrinho`;

    } catch (erro) {
        console.error(erro);
        aviso.textContent = 'Não foi possível adicionar os ingressos.';

    } finally {
        atualizarTotal();
    }
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    atualizarContadorCarrinho();

    await verificarLogin();
    await carregarEvento();

    document.getElementById('btnAdicionar')
        .addEventListener('click', adicionarAoCarrinho);
});
