
const API_INGRESSOS = `http://${window.location.hostname}:3001`;

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function formatarValorIngresso(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarDataIngresso(data) {
    if (!data) return 'Data não informada';

    const dataFormatada = new Date(data);

    if (Number.isNaN(dataFormatada.getTime())) {
        return 'Data não informada';
    }

    return dataFormatada.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function escaparTextoIngresso(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function obterStatusIngresso(status) {
    const valor = String(status || 'Pendente').toLowerCase();

    if (valor === 'confirmado' || valor === 'aprovado') {
        return {
            texto: 'CONFIRMADO',
            classe: 'confirmado'
        };
    }

    if (valor === 'cancelado') {
        return {
            texto: 'CANCELADO',
            classe: 'cancelado'
        };
    }

    return {
        texto: 'PENDENTE',
        classe: 'pendente'
    };
}

// ========================================
// CARREGAR MINHAS COMPRAS
// ========================================

const botaoAtualizar = document.getElementById('atualizarIngressos');

if (botaoAtualizar) {
    botaoAtualizar.addEventListener('click', carregarMeusIngressos);
}
async function carregarMeusIngressos() {
    const container = document.getElementById('listaMeusIngressos');

    if (!container) return;

    container.innerHTML = `
        <p class="loading">
            Carregando seus ingressos...
        </p>
    `;

    try {
        const resposta = await fetch(
            `${API_INGRESSOS}/pedido/minhas-compras`,
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        if (resposta.status === 401) {
            window.location.replace(`${API_INGRESSOS}/login`);
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || 'Erro ao carregar suas compras.'
            );
        }

        const pedidos = dados.pedidos || [];

        if (!pedidos.length) {
            container.innerHTML = `
                <div class="ingressos-vazio">
                    <span class="ingressos-vazio-icone">♫</span>

                    <h3>Você ainda não tem ingressos</h3>

                    <p>
                        Seu próximo momento inesquecível
                        está esperando por você.
                    </p>

                    <a href="#eventos" class="btn-explorar-ingressos">
                        EXPLORAR EVENTOS ↗
                    </a>
                </div>
            `;
            return;
        }

        const resultados = await Promise.allSettled(
            pedidos.map(pedido =>
                buscarDetalhesPedido(pedido.id_pedido)
            )
        );

        const cards = resultados.map((resultado, indice) => {
            const pedido = pedidos[indice];

            if (resultado.status === 'fulfilled') {
                return criarCardPedido(
                    pedido,
                    resultado.value.itens || []
                );
            }

            console.error(
                `Erro ao buscar pedido ${pedido.id_pedido}:`,
                resultado.reason
            );

            return criarCardPedidoIndisponivel(pedido);
        });

        container.innerHTML = cards.join('');

    } catch (erro) {
        console.error('Erro ao carregar meus ingressos:', erro);

        container.innerHTML = `
            <div class="ingressos-vazio">
                <h3>Não foi possível carregar seus ingressos</h3>

                <p>
                    Verifique sua conexão e tente novamente.
                </p>

                <button
                    type="button"
                    class="btn-explorar-ingressos"
                    id="tentarIngressosNovamente"
                >
                    TENTAR NOVAMENTE ↗
                </button>
            </div>
        `;

        const botao = document.getElementById(
            'tentarIngressosNovamente'
        );

        if (botao) {
            botao.addEventListener(
                'click',
                carregarMeusIngressos
            );
        }
    }
}

// ========================================
// BUSCAR DETALHES DO PEDIDO
// ========================================

async function buscarDetalhesPedido(idPedido) {
    const resposta = await fetch(
        `${API_INGRESSOS}/pedido/minhas-compras/${encodeURIComponent(idPedido)}`,
        {
            method: 'GET',
            credentials: 'include'
        }
    );

    if (resposta.status === 401) {
        window.location.replace(`${API_INGRESSOS}/login`);
        throw new Error('Sessão encerrada.');
    }

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
        throw new Error(
            dados.mensagem || 'Erro ao buscar detalhes do pedido.'
        );
    }

    return dados;
}

// ========================================
// CRIAR CARD DE CADA PEDIDO
// ========================================

function criarCardPedido(pedido, itens) {
    const status = obterStatusIngresso(
        pedido.status_pedido
    );

    const numeroPedido = Number(pedido.id_pedido);
    const dataCompra = formatarDataIngresso(
        pedido.data_pedido
    );

    const total = formatarValorIngresso(
        pedido.valor_total
    );

    const quantidadeIngressos = itens.reduce(
        (total, item) => total + Number(item.quantidade || 0),
        0
    );

    const listaItens = itens.map(item => {
        const quantidade = Number(item.quantidade || 0);
        const preco = Number(item.preco_unitario || 0);

        return `
            <div class="meu-ingresso-item">
                <div class="meu-ingresso-info">
                    <span class="meu-ingresso-etiqueta">
                        AFTER HOURS / INGRESSO
                    </span>

                    <h3>
                        ${escaparTextoIngresso(item.titulo_evento)}
                    </h3>

                    <p class="meu-ingresso-tipo">
                        ${escaparTextoIngresso(item.nome_ingresso)}
                    </p>

                    <p class="meu-ingresso-quantidade">
                        ${quantidade}
                        ${quantidade === 1 ? 'ingresso' : 'ingressos'}
                    </p>
                </div>

                <div class="meu-ingresso-preco">
                    <span>VALOR UNITÁRIO</span>

                    <strong>
                        ${formatarValorIngresso(preco)}
                    </strong>
                </div>
            </div>
        `;
    }).join('');

    return `
        <article class="meus-ingressos-card">
            <div class="meus-ingressos-topo">
                <div>
                    <span class="meus-ingressos-label">
                        PEDIDO #${numeroPedido}
                    </span>

                    <p class="meus-ingressos-data">
                        Compra realizada em ${dataCompra}
                    </p>
                </div>

                <span class="status-ingresso ${status.classe}">
                    ${status.texto}
                </span>
            </div>

            <div class="meus-ingressos-conteudo">
                ${listaItens || `
                    <p>Nenhum ingresso encontrado neste pedido.</p>
                `}
            </div>

            <div class="meus-ingressos-rodape">
                <div>
                    <span>
                        ${quantidadeIngressos}
                        ${quantidadeIngressos === 1
                            ? 'INGRESSO'
                            : 'INGRESSOS'}
                    </span>

                    <strong>${total}</strong>
                </div>

                <button
                    type="button"
                    class="btn-detalhes-ingresso"
                    data-pedido="${numeroPedido}"
                >
                    VER DETALHES ↗
                </button>
            </div>
        </article>
    `;
}

// ========================================
// CARD QUANDO DETALHES NÃO CARREGAM
// ========================================

function criarCardPedidoIndisponivel(pedido) {
    const status = obterStatusIngresso(
        pedido.status_pedido
    );

    return `
        <article class="meus-ingressos-card">
            <div class="meus-ingressos-topo">
                <div>
                    <span class="meus-ingressos-label">
                        PEDIDO #${Number(pedido.id_pedido)}
                    </span>

                    <p class="meus-ingressos-data">
                        ${formatarDataIngresso(pedido.data_pedido)}
                    </p>
                </div>

                <span class="status-ingresso ${status.classe}">
                    ${status.texto}
                </span>
            </div>

            <div class="meus-ingressos-conteudo">
                <p>
                    Não foi possível carregar os detalhes
                    deste pedido.
                </p>
            </div>

            <div class="meus-ingressos-rodape">
                <strong>
                    ${formatarValorIngresso(pedido.valor_total)}
                </strong>
            </div>
        </article>
    `;
}

// ========================================
// VISUALIZAR DETALHES DA COMPRA
// ========================================

async function visualizarDetalhesIngresso(idPedido) {
    const modalExistente = document.getElementById(
        'modalDetalhesIngresso'
    );

    if (modalExistente) {
        modalExistente.remove();
    }

    const modal = document.createElement('div');

    modal.id = 'modalDetalhesIngresso';
    modal.className = 'modal-ingressos aberto';

    modal.innerHTML = `
        <div
            class="modal-conteudo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tituloDetalhesIngresso"
        >
            <button
                type="button"
                class="modal-fechar"
                id="fecharDetalhesIngresso"
                aria-label="Fechar"
            >
                &times;
            </button>

            <p class="modal-etiqueta">
                AFTER HOURS / MINHAS COMPRAS
            </p>

            <h2 id="tituloDetalhesIngresso">
                Pedido #${Number(idPedido)}
            </h2>

            <div id="conteudoDetalhesIngresso">
                <p>Carregando detalhes...</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const fechar = () => {
        modal.remove();
        document.body.style.overflow = '';
    };

    document.getElementById('fecharDetalhesIngresso')
        .addEventListener('click', fechar);

    modal.addEventListener('click', evento => {
        if (evento.target === modal) {
            fechar();
        }
    });

    try {
        const dados = await buscarDetalhesPedido(idPedido);

        if (!modal.isConnected) return;

        const status = obterStatusIngresso(
            dados.pedido.status_pedido
        );

        const itensHTML = (dados.itens || []).map(item => {
            const quantidade = Number(item.quantidade || 0);
            const preco = Number(item.preco_unitario || 0);

            return `
                <div class="detalhe-ingresso-item">
                    <h3>
                        ${escaparTextoIngresso(item.titulo_evento)}
                    </h3>

                    <p>
                        ${escaparTextoIngresso(item.nome_ingresso)}
                    </p>

                    <p>Quantidade: ${quantidade}</p>

                    <p>
                        Valor unitário:
                        ${formatarValorIngresso(preco)}
                    </p>

                    <strong>
                        Subtotal:
                        ${formatarValorIngresso(quantidade * preco)}
                    </strong>
                </div>
            `;
        }).join('');

        const total = (dados.itens || []).reduce(
            (soma, item) =>
                soma +
                Number(item.quantidade || 0) *
                Number(item.preco_unitario || 0),
            0
        );

        document.getElementById(
            'conteudoDetalhesIngresso'
        ).innerHTML = `
            <div class="detalhes-ingresso-status">
                <span class="status-ingresso ${status.classe}">
                    ${status.texto}
                </span>

                <p>
                    Compra realizada em
                    ${formatarDataIngresso(dados.pedido.data_pedido)}
                </p>
            </div>

            ${itensHTML}

            <div class="detalhes-ingresso-total">
                <span>TOTAL DA COMPRA</span>

                <strong>
                    ${formatarValorIngresso(total)}
                </strong>
            </div>

            <p class="detalhes-ingresso-aviso">
                ${status.classe === 'confirmado'
                    ? 'Pagamento confirmado. Este é o registro da sua compra.'
                    : 'Este pedido ainda não possui confirmação de pagamento.'}
            </p>
        `;

    } catch (erro) {
        console.error('Erro ao visualizar ingresso:', erro);

        if (modal.isConnected) {
            document.getElementById(
                'conteudoDetalhesIngresso'
            ).textContent =
                'Não foi possível carregar os detalhes do pedido.';
        }
    }
}

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById(
        'listaMeusIngressos'
    );

    if (!container) return;

    container.addEventListener('click', evento => {
        const botao = evento.target.closest(
            '[data-pedido]'
        );

        if (!botao) return;

        const idPedido = Number(botao.dataset.pedido);

        if (Number.isSafeInteger(idPedido) && idPedido > 0) {
            visualizarDetalhesIngresso(idPedido);
        }
    });

    carregarMeusIngressos();
});
