
const API_BASE_URL = `http://${window.location.hostname}:3001`;

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

// VERIFICAR LOGIN

async function verificarLogin() {
    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/verificaSeUsuarioEstaLogado`,
            {
                credentials: 'include'
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || dados.status !== 'ok') {
            window.location.replace(`${API_BASE_URL}/login`);
            return false;
        }

        const usuario = dados.usuario;

        const nomeUsuario =
            document.getElementById('nomeUsuario');

        if (nomeUsuario) {
            nomeUsuario.textContent = usuario.nome;
        }

        // VERIFICAR SE POSSUI OS DOIS PERFIS
        const botaoTrocarPerfil =
            document.getElementById('btnTrocarPerfil');

        if (botaoTrocarPerfil) {
            botaoTrocarPerfil.hidden = !(
                usuario.ehCliente === true &&
                usuario.ehFuncionario === true
            );
        }

        return true;

    } catch (erro) {
        console.error('Erro ao verificar login:', erro);

        window.location.replace(`${API_BASE_URL}/login`);
        return false;
    }
}


// CARREGAR EVENTOS
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

                        <h3>
                            ${escaparHTML(evento.titulo_evento)}
                        </h3>

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
                        >
                            VER DETALHES ↗
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

// ABRIR DETALHES
function abrirDetalhesEvento(id) {
    window.location.href =
        `${API_BASE_URL}/login/detalhesEvento?id=${id}`;
}

// LOGOUT
async function fazerLogout() {
    const botao = document.getElementById('btnLogout');

    if (botao) botao.disabled = true;

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/logout`,
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        if (!resposta.ok) {
            throw new Error('Não foi possível encerrar a sessão.');
        }

        sessionStorage.removeItem('carrinho');
        sessionStorage.removeItem('dadosPagamento');

        window.location.replace(`${API_BASE_URL}/login`);

    } catch (erro) {
        console.error(erro);

        if (botao) botao.disabled = false;

        alert('Não foi possível sair da conta.');
    }
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    const botaoLogout = document.getElementById('btnLogout');

    if (botaoLogout) {
        botaoLogout.addEventListener('click', fazerLogout);
    }

    const autenticado = await verificarLogin();

    if (!autenticado) return;

    await carregarEventos();

    const listaEventos = document.getElementById('listaEventos');

    if (listaEventos) {
        listaEventos.addEventListener('click', evento => {
            const botao = evento.target.closest('[data-evento-id]');

            if (!botao) return;

            abrirDetalhesEvento(
                Number(botao.dataset.eventoId)
            );
        });
    }
});
