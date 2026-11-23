
const API_BASE_URL = `http://${window.location.hostname}:3001`;

const formatarPreco = valor =>
    Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

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

function salvarCarrinho(carrinho) {
    sessionStorage.setItem(
        'carrinho',
        JSON.stringify(carrinho)
    );
}

// VERIFICAR LOGIN
async function verificarAutorizacao() {
    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/verificaSeUsuarioEstaLogado`,
            { credentials: 'include' }
        );

        if (!resposta.ok) {
            window.location.replace(`${API_BASE_URL}/login`);
            return false;
        }

        const dados = await resposta.json();

        if (dados.status !== 'ok') {
            window.location.replace(`${API_BASE_URL}/login`);
            return false;
        }

        document.getElementById('nomeUsuario').textContent =
            dados.usuario.nome || 'Cliente';

        return true;

    } catch (erro) {
        console.error('Erro de autenticação:', erro);
        window.location.replace(`${API_BASE_URL}/login`);
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

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.step = '1';
        input.value = quantidade;

        if (Number.isFinite(estoque) && estoque >= 0) {
            input.max = estoque;
        }

        input.addEventListener('change', () => {
            atualizarQuantidade(index, input.value);
        });

        const subtotalElemento = document.createElement('strong');
        subtotalElemento.className = 'subtotal';
        subtotalElemento.textContent = formatarPreco(subtotal);

        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'btn-remover';
        remover.textContent = 'Remover ingresso';

        remover.addEventListener('click', () => {
            removerItem(index);
        });

        controles.append(
            quantidadeLabel,
            input,
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
        alert('A quantidade deve ser de pelo menos 1 ingresso.');
        carregarCarrinho();
        return;
    }

    if (Number.isFinite(estoque) && quantidade > estoque) {
        alert(`Só existem ${estoque} ingressos disponíveis.`);
        carregarCarrinho();
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

// FINALIZAR
function finalizarPedido() {
    const carrinho = lerCarrinho();

    if (!carrinho.length) {
        alert('Seu carrinho está vazio.');
        return;
    }

    for (const item of carrinho) {
        const quantidade = Number(item.quantidade);
        const estoque = Number(item.estoque);

        if (
            !Number.isInteger(quantidade) ||
            quantidade < 1 ||
            (Number.isFinite(estoque) && quantidade > estoque)
        ) {
            alert('Revise as quantidades dos ingressos.');
            return;
        }
    }

    window.location.href =
        `${API_BASE_URL}/login/visaoclientefinalizar`;
}

// INICIAR
document.addEventListener('DOMContentLoaded', async () => {
    const autorizado = await verificarAutorizacao();

    if (!autorizado) return;

    carregarCarrinho();

    document.getElementById('btn-limpar')
        .addEventListener('click', limparCarrinho);

    document.getElementById('btn-finalizar')
        .addEventListener('click', finalizarPedido);
});
