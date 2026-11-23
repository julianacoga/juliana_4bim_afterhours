
const API_BASE_URL = `http://${window.location.hostname}:3001`;

const formatarMoeda = valor =>
    Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

// ========================================
// VERIFICAR LOGIN
// ========================================

async function verificarLogin() {
    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/verificaSeUsuarioEstaLogado`,
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || dados.status !== 'ok') {
            window.location.replace(`${API_BASE_URL}/login`);
            return false;
        }

        const nomeUsuario = document.getElementById('nomeUsuario');

        if (nomeUsuario) {
            nomeUsuario.textContent = dados.usuario.nome;
        }

        return true;

    } catch (erro) {
        console.error('Erro ao verificar login:', erro);
        window.location.replace(`${API_BASE_URL}/login`);
        return false;
    }
}

// ========================================
// CARREGAR EVENTOS
// ========================================

async function carregarEventos() {
    const lista = document.getElementById('listaEventos');
    const quantidade = document.getElementById('quantidadeEventos');

    if (!lista || !quantidade) return;

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/evento/publicos`
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error('Erro ao carregar eventos.');
        }

        const eventos = dados.eventos || [];

        quantidade.textContent =
            `${eventos.length} evento(s) encontrado(s)`;

        if (!eventos.length) {
            lista.innerHTML =
                '<p class="loading">Nenhum evento disponível.</p>';
            return;
        }

        lista.innerHTML = eventos.map(evento => {
            const imagem = evento.imagem_evento
                ? `${API_BASE_URL}/imagens/${encodeURIComponent(evento.imagem_evento)}`
                : '';

            const data = evento.data_evento
                ? new Date(evento.data_evento).toLocaleDateString(
                    'pt-BR',
                    { timeZone: 'UTC' }
                )
                : 'Data a definir';

            const horario =
                evento.horario_evento || 'Horário a definir';

            return `
                <article class="event-card">
                    <img
                        src="${imagem}"
                        alt="${escaparHTML(evento.titulo_evento)}"
                        onerror="this.style.display='none'"
                    >

                    <div class="event-info">
                        <span class="event-category">
                            ${escaparHTML(evento.nome_categoria || 'Evento')}
                        </span>

                        <h3>${escaparHTML(evento.titulo_evento)}</h3>

                        <p class="event-description">
                            ${escaparHTML(
                                evento.descricao_evento ||
                                'Confira os detalhes deste evento.'
                            )}
                        </p>

                        <div class="event-details">
                            <p>📍 ${escaparHTML(evento.local_evento || 'Local a definir')}</p>
                            <p>📅 ${escaparHTML(data)}</p>
                            <p>🕒 ${escaparHTML(horario)}</p>
                        </div>

                        <button
                            type="button"
                            class="event-button"
                            data-evento-id="${Number(evento.id_evento)}"
                            data-evento-titulo="${escaparHTML(evento.titulo_evento)}"
                        >
                            GARANTIR INGRESSO ↗
                        </button>
                    </div>
                </article>
            `;
        }).join('');

    } catch (erro) {
        console.error('Erro ao carregar eventos:', erro);

        quantidade.textContent = '';

        lista.innerHTML =
            '<p class="loading">Não foi possível carregar os eventos.</p>';
    }
}

// ========================================
// CRIAR MODAL DE INGRESSOS
// ========================================

function criarModalIngressos() {
    if (document.getElementById('modalIngressos')) return;

    const modal = document.createElement('div');

    modal.id = 'modalIngressos';
    modal.className = 'modal-ingressos';

    modal.innerHTML = `
        <div
            class="modal-conteudo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitulo"
        >
            <button
                type="button"
                class="modal-fechar"
                id="fecharModal"
                aria-label="Fechar"
            >
                &times;
            </button>

            <p class="modal-etiqueta">
                AFTER HOURS / INGRESSOS
            </p>

            <h2 id="modalTitulo">
                Escolha seu ingresso
            </h2>

            <p class="modal-subtitulo">
                Selecione a modalidade e a quantidade desejada.
            </p>

            <div id="listaIngressosModal"></div>

            <div class="modal-rodape">
                <div>
                    <span>TOTAL</span>
                    <strong id="totalIngressos">
                        R$ 0,00
                    </strong>
                </div>

                <button
                    type="button"
                    id="adicionarCarrinho"
                >
                    ADICIONAR AO CARRINHO ↗
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('fecharModal')
        .addEventListener('click', fecharModalIngressos);

    modal.addEventListener('click', evento => {
        if (evento.target === modal) {
            fecharModalIngressos();
        }
    });

    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') {
            fecharModalIngressos();
        }
    });
}

// ========================================
// CONTROLE DO MODAL
// ========================================

let eventoSelecionado = null;
let ingressosDisponiveis = [];

function fecharModalIngressos() {
    const modal = document.getElementById('modalIngressos');

    if (modal) {
        modal.classList.remove('aberto');
        document.body.style.overflow = '';
    }
}

// ========================================
// ABRIR MODAL E BUSCAR INGRESSOS
// ========================================

async function abrirModalIngressos(idEvento, tituloEvento) {
    eventoSelecionado = {
        id: idEvento,
        titulo: tituloEvento
    };

    ingressosDisponiveis = [];

    const modal = document.getElementById('modalIngressos');
    const lista = document.getElementById('listaIngressosModal');

    document.getElementById('modalTitulo').textContent =
        tituloEvento;

    document.getElementById('totalIngressos').textContent =
        'R$ 0,00';

    lista.innerHTML = '<p>Carregando ingressos...</p>';

    modal.classList.add('aberto');
    document.body.style.overflow = 'hidden';

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/ingresso/evento/${encodeURIComponent(idEvento)}`
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || 'Erro ao buscar ingressos.'
            );
        }

        if (eventoSelecionado?.id !== idEvento) return;

        ingressosDisponiveis = dados.ingressos || [];

        if (!ingressosDisponiveis.length) {
            lista.innerHTML = `
                <p class="modal-vazio">
                    Ainda não existem ingressos cadastrados
                    para este evento.
                </p>
            `;
            return;
        }

        lista.innerHTML = ingressosDisponiveis.map(ingresso => {
            const estoque = Number(
                ingresso.quantidade_estoque_ingresso
            );

            const preco = Number(
                ingresso.preco_unitario_ingresso
            );

            const esgotado = estoque <= 0;

            return `
                <div class="ingresso-opcao">
                    <div class="ingresso-dados">
                        <h3>
                            ${escaparHTML(ingresso.nome_ingresso)}
                        </h3>

                        <p>
                            ${esgotado
                                ? 'ESGOTADO'
                                : `${estoque} disponível(is)`}
                        </p>

                        <strong>
                            ${formatarMoeda(preco)}
                        </strong>
                    </div>

                    <div class="ingresso-quantidade">
                        <label for="qtd-${ingresso.id_ingresso}">
                            Quantidade
                        </label>

                        <input
                            type="number"
                            id="qtd-${ingresso.id_ingresso}"
                            class="input-quantidade-ingresso"
                            data-ingresso-id="${ingresso.id_ingresso}"
                            min="0"
                            max="${estoque}"
                            step="1"
                            value="0"
                            ${esgotado ? 'disabled' : ''}
                        >
                    </div>
                </div>
            `;
        }).join('');

        lista.querySelectorAll('.input-quantidade-ingresso')
            .forEach(input => {
                input.addEventListener(
                    'input',
                    atualizarTotalIngressos
                );
            });

    } catch (erro) {
        console.error('Erro ao buscar ingressos:', erro);

        lista.innerHTML = `
            <p class="modal-vazio">
                Não foi possível carregar os ingressos.
            </p>
        `;
    }
}

// ========================================
// CALCULAR TOTAL DOS INGRESSOS
// ========================================

function atualizarTotalIngressos() {
    let total = 0;

    document.querySelectorAll('.input-quantidade-ingresso')
        .forEach(input => {
            const id = Number(input.dataset.ingressoId);

            const ingresso = ingressosDisponiveis.find(
                item => Number(item.id_ingresso) === id
            );

            if (!ingresso) return;

            const estoque = Number(
                ingresso.quantidade_estoque_ingresso
            );

            let quantidade = Number(input.value);

            if (
                !Number.isInteger(quantidade) ||
                quantidade < 0
            ) {
                quantidade = 0;
            }

            quantidade = Math.min(quantidade, estoque);

            total += quantidade *
                Number(ingresso.preco_unitario_ingresso);
        });

    document.getElementById('totalIngressos').textContent =
        formatarMoeda(total);
}

// ========================================
// ADICIONAR INGRESSOS AO CARRINHO
// ========================================

function adicionarIngressosAoCarrinho() {
    if (!eventoSelecionado) return;

    const selecionados = [];

    document.querySelectorAll('.input-quantidade-ingresso')
        .forEach(input => {
            const id = Number(input.dataset.ingressoId);
            const quantidade = Number(input.value);

            const ingresso = ingressosDisponiveis.find(
                item => Number(item.id_ingresso) === id
            );

            if (!ingresso) return;

            if (
                !Number.isInteger(quantidade) ||
                quantidade < 0 ||
                quantidade > Number(
                    ingresso.quantidade_estoque_ingresso
                )
            ) {
                throw new Error(
                    `Quantidade inválida para ${ingresso.nome_ingresso}.`
                );
            }

            if (quantidade > 0) {
                selecionados.push({
                    id: Number(ingresso.id_ingresso),
                    id_ingresso: Number(ingresso.id_ingresso),
                    id_evento: eventoSelecionado.id,
                    evento: eventoSelecionado.titulo,
                    nome: ingresso.nome_ingresso,
                    preco: Number(
                        ingresso.preco_unitario_ingresso
                    ),
                    quantidade,
                    estoque: Number(
                        ingresso.quantidade_estoque_ingresso
                    )
                });
            }
        });

    if (!selecionados.length) {
        alert('Selecione pelo menos um ingresso.');
        return;
    }

    let carrinho;

    try {
        carrinho = JSON.parse(
            sessionStorage.getItem('carrinho')
        ) || [];

        if (!Array.isArray(carrinho)) {
            carrinho = [];
        }

    } catch (erro) {
        carrinho = [];
    }

    // VERIFICAR ESTOQUE ANTES DE ADICIONAR

    for (const ingresso of selecionados) {
        const existente = carrinho.find(
            item => Number(item.id) === ingresso.id
        );

        const quantidadeAtual = existente
            ? Number(existente.quantidade)
            : 0;

        if (
            quantidadeAtual + ingresso.quantidade >
            ingresso.estoque
        ) {
            alert(
                `Você ultrapassou o estoque disponível de ${ingresso.nome}.`
            );
            return;
        }
    }

    // ADICIONAR OU ATUALIZAR QUANTIDADES

    for (const ingresso of selecionados) {
        const existente = carrinho.find(
            item => Number(item.id) === ingresso.id
        );

        if (existente) {
            existente.quantidade += ingresso.quantidade;
        } else {
            carrinho.push(ingresso);
        }
    }

    sessionStorage.setItem(
        'carrinho',
        JSON.stringify(carrinho)
    );

    fecharModalIngressos();

    alert('Ingressos adicionados ao carrinho!');
}

// ========================================
// LOGOUT - SAIR DA CONTA
// ========================================

async function fazerLogout() {
    const botao = document.getElementById('btnLogout');

    if (botao) {
        botao.disabled = true;
    }

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/logout`,
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        if (!resposta.ok) {
            throw new Error(
                'Não foi possível encerrar a sessão.'
            );
        }

        // LIMPAR DADOS TEMPORÁRIOS
        sessionStorage.removeItem('carrinho');
        sessionStorage.removeItem('dadosPagamento');

        // REDIRECIONAR PARA O LOGIN
        window.location.replace(`${API_BASE_URL}/login`);

    } catch (erro) {
        console.error('Erro ao sair da conta:', erro);

        if (botao) {
            botao.disabled = false;
        }

        let aviso = document.getElementById('mensagemLogout');

        if (!aviso) {
            aviso = document.createElement('p');
            aviso.id = 'mensagemLogout';
            aviso.style.color = '#ff6a00';

            if (botao) {
                botao.insertAdjacentElement('afterend', aviso);
            }
        }

        aviso.textContent =
            'Não foi possível sair da conta. Tente novamente.';
    }
}

// ========================================
// INICIALIZAÇÃO DA PÁGINA
// ========================================

document.addEventListener('DOMContentLoaded', async () => {

    // CONECTAR BOTÃO DE LOGOUT
    const botaoLogout = document.getElementById('btnLogout');

    if (botaoLogout) {
        botaoLogout.addEventListener(
            'click',
            fazerLogout
        );
    }

    // VERIFICAR SESSÃO
    const autenticado = await verificarLogin();

    if (!autenticado) return;

    // CRIAR MODAL
    criarModalIngressos();

    // CARREGAR EVENTOS
    await carregarEventos();

    // ABRIR MODAL AO CLICAR EM UM EVENTO
    const listaEventos = document.getElementById('listaEventos');

    if (listaEventos) {
        listaEventos.addEventListener('click', evento => {
            const botao = evento.target.closest(
                '[data-evento-id]'
            );

            if (!botao) return;

            abrirModalIngressos(
                Number(botao.dataset.eventoId),
                botao.dataset.eventoTitulo
            );
        });
    }

    // ADICIONAR INGRESSOS AO CARRINHO
    const botaoAdicionar = document.getElementById(
        'adicionarCarrinho'
    );

    if (botaoAdicionar) {
        botaoAdicionar.addEventListener('click', () => {
            try {
                adicionarIngressosAoCarrinho();
            } catch (erro) {
                alert(erro.message);
            }
        });
    }
});
