
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

function obterIdIngresso(item) {
    return Number(
        item.ingresso_id_ingresso ??
        item.id_ingresso ??
        item.id
    );
}

// VERIFICAR LOGIN
async function verificarLogin() {
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

    return true;
}

// EXIBIR RESUMO
function carregarFinalizar() {
    const carrinho = lerCarrinho();
    const lista = document.getElementById('listaFinalizar');
    const totalElemento = document.getElementById('total-final');
    const botao = document.getElementById('btn-finalizar');

    lista.innerHTML = '';
    botao.disabled = true;

    if (carrinho.length === 0) {
        lista.innerHTML = `
            <tr>
                <td colspan="5">
                    Seu carrinho está vazio.
                </td>
            </tr>
        `;

        totalElemento.textContent = 'Total: R$ 0,00';
        return;
    }

    let total = 0;
    const ids = new Set();

    for (const item of carrinho) {
        const id = obterIdIngresso(item);
        const preco = Number(item.preco);
        const quantidade = Number(item.quantidade);

        if (
            !Number.isSafeInteger(id) ||
            id <= 0 ||
            ids.has(id) ||
            !Number.isFinite(preco) ||
            preco < 0 ||
            !Number.isSafeInteger(quantidade) ||
            quantidade <= 0
        ) {
            document.getElementById('mensagem-finalizar')
                .textContent =
                'Há um ingresso inválido no carrinho. Volte e revise.';

            return;
        }

        ids.add(id);

        const subtotal = preco * quantidade;
        total += subtotal;

        const linha = document.createElement('tr');

        const valores = [
            item.evento || 'Evento',
            item.nome || 'Ingresso',
            formatarPreco(preco),
            String(quantidade),
            formatarPreco(subtotal)
        ];

        valores.forEach(valor => {
            const celula = document.createElement('td');
            celula.textContent = valor;
            linha.appendChild(celula);
        });

        lista.appendChild(linha);
    }

    totalElemento.textContent =
        `Total estimado: ${formatarPreco(total)}`;

    botao.disabled = false;
}

// CRIAR PEDIDO NO BANCO
async function enviarDadosParaBD() {
    const carrinho = lerCarrinho();
    const botao = document.getElementById('btn-finalizar');
    const mensagem = document.getElementById('mensagem-finalizar');

    if (!carrinho.length) {
        alert('Seu carrinho está vazio.');
        return;
    }

    const ingressos = carrinho.map(item => ({
        ingresso_id_ingresso: obterIdIngresso(item),
        quantidade: Number(item.quantidade)
    }));

    if (ingressos.some(item =>
        !Number.isSafeInteger(item.ingresso_id_ingresso) ||
        item.ingresso_id_ingresso <= 0 ||
        !Number.isSafeInteger(item.quantidade) ||
        item.quantidade <= 0
    )) {
        alert('Revise os ingressos do carrinho.');
        return;
    }

    botao.disabled = true;
    botao.textContent = 'CRIANDO PEDIDO...';
    mensagem.textContent = '';

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/pedido/finalizar-compra`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ ingressos })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || 'Erro ao criar pedido.'
            );
        }

        // GUARDAR PEDIDO PARA A TELA DE PAGAMENTO
        sessionStorage.setItem(
            'dadosPagamento',
            JSON.stringify({
                id_pedido: dados.id_pedido,
                valor_total: dados.valor_total
            })
        );

        // NÃO LIMPAR O CARRINHO AINDA
        // O PAGAMENTO AINDA SERÁ IMPLEMENTADO

        window.location.href =
            `${API_BASE_URL}/login/visaoclientepagamento`;

    } catch (erro) {
        console.error('Erro ao criar pedido:', erro);

        mensagem.textContent = erro.message;
        alert(erro.message);

        botao.disabled = false;
        botao.textContent = 'CONFIRMAR PEDIDO ↗';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const autorizado = await verificarLogin();

        if (!autorizado) return;

        carregarFinalizar();

        document.getElementById('btn-finalizar')
            .addEventListener('click', enviarDadosParaBD);

    } catch (erro) {
        console.error('Erro ao carregar finalização:', erro);
        document.getElementById('mensagem-finalizar')
            .textContent = 'Não foi possível carregar a compra.';
    }
});
