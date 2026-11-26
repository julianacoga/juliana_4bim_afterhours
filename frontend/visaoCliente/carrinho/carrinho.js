
const API_BASE_URL = `http://${window.location.hostname}:3001`;

const formatarPreco = valor =>
    Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

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
}

// VERIFICAR LOGIN

async function verificarAutorizacao() {
    const nomeUsuario = document.getElementById('nomeUsuario');

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/verificaSeUsuarioEstaLogado`,
            {
                credentials: 'include'
            }
        );

        if (!resposta.ok) {
            nomeUsuario.textContent = 'Visitante';
            return false;
        }

        const dados = await resposta.json();

        if (dados.status !== 'ok') {
            nomeUsuario.textContent = 'Visitante';
            return false;
        }

        nomeUsuario.textContent =
            dados.usuario.nome || 'Cliente';

        return true;

    } catch (erro) {
        console.error('Erro de autenticação:', erro);

        nomeUsuario.textContent = 'Visitante';

        return false;
    }
}


// MONTAR CARRINHO
function carregarCarrinho() {
    const carrinho = lerCarrinho();
    const lista = document.getElementById('listaCarrinho');

    lista.innerHTML = '';

    let total = 0;
    let quantidadeTotal = 0;

    if (carrinho.length === 0) {
        lista.innerHTML = `
            <div class="carrinho-vazio">
                <div class="vazio-icone">♫</div>

                <h3>Seu carrinho está vazio.</h3>

                <p>Sua próxima experiência começa com um ingresso.</p>

                <a href="/login/visaocliente">
                    EXPLORAR EVENTOS ↗
                </a>
            </div>
        `;
    }

    carrinho.forEach((item, index) => {
        const preco = Number(item.preco);
        const quantidade = Number(item.quantidade);
        const estoque = Number(item.estoque);

        if (
            !Number.isFinite(preco) ||
            !Number.isInteger(quantidade) ||
            quantidade < 1
        ) {
            return;
        }

        const subtotal = preco * quantidade;

        total += subtotal;
        quantidadeTotal += quantidade;

        const card = document.createElement('article');
        card.className = 'ingresso-card';

        const informacoes = document.createElement('div');
        informacoes.className = 'ingresso-info';

        const etiqueta = document.createElement('p');
        etiqueta.className = 'ticket-label';
        etiqueta.textContent = 'INGRESSO / AFTER HOURS';

        const evento = document.createElement('h3');
        evento.textContent = item.evento || 'Evento';

        const tipo = document.createElement('p');
        tipo.className = 'tipo-ingresso';
        tipo.textContent = item.nome || 'Ingresso';

        const precoUnitario = document.createElement('p');
        precoUnitario.className = 'preco-unitario';

        precoUnitario.textContent =
            `${formatarPreco(preco)} por ingresso`;

        informacoes.append(
            etiqueta,
            evento,
            tipo,
            precoUnitario
        );

        const controles = document.createElement('div');
        controles.className = 'ingresso-controles';

        const quantidadeLabel = document.createElement('label');
        quantidadeLabel.textContent = 'Quantidade';

        const seletor = document.createElement('div');
        seletor.className = 'controleQuantidade';

        // BOTÃO MENOS
        const menos = document.createElement('button');
        menos.type = 'button';
        menos.textContent = '−';
        menos.disabled = quantidade <= 1;

        menos.setAttribute(
            'aria-label',
            `Diminuir quantidade de ${item.nome}`
        );

        menos.addEventListener('click', () => {
            atualizarQuantidade(index, quantidade - 1);
        });

        // QUANTIDADE
        const numero = document.createElement('span');
        numero.textContent = quantidade;

        // BOTÃO MAIS
        const mais = document.createElement('button');
        mais.type = 'button';
        mais.textContent = '+';

        mais.setAttribute(
            'aria-label',
            `Aumentar quantidade de ${item.nome}`
        );

        mais.disabled =
            Number.isFinite(estoque) &&
            quantidade >= estoque;

        mais.addEventListener('click', () => {
            atualizarQuantidade(index, quantidade + 1);
        });

        seletor.append(menos, numero, mais);

        const subtotalElemento = document.createElement('strong');
        subtotalElemento.className = 'subtotal';

        subtotalElemento.textContent =
            formatarPreco(subtotal);

        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'btn-remover';
        remover.textContent = 'Remover ingresso';

        remover.addEventListener('click', () => {
            removerItem(index);
        });

        controles.append(
            quantidadeLabel,
            seletor,
            subtotalElemento,
            remover
        );

        card.append(informacoes, controles);
        lista.appendChild(card);
    });

    document.getElementById('quantidadeItens').textContent =
        `${quantidadeTotal} ingresso(s)`;

    document.getElementById('resumoQuantidade').textContent =
        quantidadeTotal;

    document.getElementById('resumoSubtotal').textContent =
        formatarPreco(total);

    document.getElementById('total-geral').textContent =
        formatarPreco(total);

    document.getElementById('btn-finalizar').disabled =
        quantidadeTotal === 0;

    document.getElementById('btn-limpar').disabled =
        carrinho.length === 0;
}

// ALTERAR QUANTIDADE
function atualizarQuantidade(index, valor) {
    const carrinho = lerCarrinho();
    const item = carrinho[index];

    if (!item) return;

    const quantidade = Number(valor);
    const estoque = Number(item.estoque);

    if (!Number.isInteger(quantidade) || quantidade < 1) {
        return;
    }

    if (
        Number.isFinite(estoque) &&
        quantidade > estoque
    ) {
        alert(`Só existem ${estoque} ingressos disponíveis.`);
        return;
    }

    item.quantidade = quantidade;

    salvarCarrinho(carrinho);
    carregarCarrinho();
}

// REMOVER INGRESSO
function removerItem(index) {
    const carrinho = lerCarrinho();

    carrinho.splice(index, 1);

    salvarCarrinho(carrinho);
    carregarCarrinho();
}

// LIMPAR CARRINHO
function limparCarrinho() {
    if (!confirm('Deseja remover todos os ingressos do carrinho?')) {
        return;
    }

    sessionStorage.removeItem('carrinho');

    carregarCarrinho();
}

// FINALIZAR PEDIDO

async function finalizarPedido() {
    const carrinho = lerCarrinho();

    if (!carrinho.length) {
        alert('Seu carrinho está vazio.');
        return;
    }

    // VALIDAR QUANTIDADES
    for (const item of carrinho) {
        const quantidade = Number(item.quantidade);
        const estoque = Number(item.estoque);

        if (
            !Number.isInteger(quantidade) ||
            quantidade < 1 ||
            (
                Number.isFinite(estoque) &&
                quantidade > estoque
            )
        ) {
            alert('Revise as quantidades dos ingressos.');
            return;
        }
    }

    // VERIFICAR LOGIN
    const autorizado = await verificarAutorizacao();

    if (!autorizado) {
        window.location.href =
            `${API_BASE_URL}/login?compra=1`;

        return;
    }

    // CONTINUAR COMPRA
    window.location.href =
        `${API_BASE_URL}/login/visaoclientefinalizar`;
}


// INICIALIZAÇÃO

document.addEventListener('DOMContentLoaded', async () => {
    const autorizado = await verificarAutorizacao();

    // DEFINIR DESTINO DOS BOTÕES DE VOLTAR
    if (!autorizado) {
        document.querySelectorAll(
            'a[href="/login/visaocliente"]'
        ).forEach(link => {
            link.href = `${API_BASE_URL}/`;
        });
    }

    // CARREGAR CARRINHO MESMO SEM LOGIN
    carregarCarrinho();

    // CORRIGIR LINK DO CARRINHO VAZIO
    if (!autorizado) {
        document.querySelectorAll(
            'a[href="/login/visaocliente"]'
        ).forEach(link => {
            link.href = `${API_BASE_URL}/`;
        });
    }

    document.getElementById('btn-limpar')
        .addEventListener('click', limparCarrinho);

    document.getElementById('btn-finalizar')
        .addEventListener('click', finalizarPedido);
});
