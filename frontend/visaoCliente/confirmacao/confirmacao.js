
const API_BASE_URL = `http://${window.location.hostname}:3001`;

const formatarPreco = valor =>
    Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

async function carregarConfirmacao() {
    const parametros = new URLSearchParams(window.location.search);
    const idPedido = Number(parametros.get('pedido'));

    const mensagem = document.getElementById('mensagem-erro');

    if (!Number.isSafeInteger(idPedido) || idPedido <= 0) {
        mensagem.textContent = 'Pedido inválido.';
        return;
    }

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/pedido/minhas-compras/${idPedido}`,
            {
                credentials: 'include'
            }
        );

        if (resposta.status === 401) {
            window.location.replace(`${API_BASE_URL}/login`);
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || 'Não foi possível consultar o pedido.'
            );
        }

        const pedido = dados.pedido;
        const itens = dados.itens;

        document.getElementById('numero-pedido').textContent =
            `#${pedido.id_pedido}`;

        const status = document.getElementById('status-pedido');
        status.textContent = pedido.status_pedido.toUpperCase();

        if (pedido.status_pedido !== 'Confirmado') {
            document.querySelector('h1').textContent =
                'PEDIDO EM PROCESSAMENTO';

            document.querySelector('.subtitulo').textContent =
                'Seu pedido ainda não foi confirmado.';

            document.querySelector('.icone-sucesso').textContent = '…';
        }

        const lista = document.getElementById('lista-ingressos');
        lista.innerHTML = '';

        let total = 0;

        itens.forEach(item => {
            const quantidade = Number(item.quantidade);
            const preco = Number(item.preco_unitario);
            const subtotal = quantidade * preco;

            total += subtotal;

            const div = document.createElement('div');
            div.className = 'ingresso';

            const titulo = document.createElement('h3');
            titulo.textContent = item.titulo_evento;

            const descricao = document.createElement('p');
            descricao.textContent =
                `${item.nome_ingresso} · ${quantidade} ingresso(s) · ${formatarPreco(subtotal)}`;

            div.append(titulo, descricao);
            lista.appendChild(div);
        });

        document.getElementById('valor-total').textContent =
            formatarPreco(total);

    } catch (erro) {
        console.error('Erro ao carregar confirmação:', erro);
        mensagem.textContent = erro.message;
    }
}

document.addEventListener('DOMContentLoaded', carregarConfirmacao);
