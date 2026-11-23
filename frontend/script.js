
const API_BASE_URL = 'http://localhost:3001';

const listaEventos = document.getElementById('listaEventos');

async function carregarEventos() {
    try {
        const resposta = await fetch(`${API_BASE_URL}/evento/publicos`);

        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        const dados = await resposta.json();

        console.log('Eventos recebidos:', dados);

        const eventos = dados.eventos || [];

        listaEventos.innerHTML = '';

        if (eventos.length === 0) {
            listaEventos.innerHTML = `
                <p class="empty-events">
                    Ainda não há eventos disponíveis. Volte em breve!
                </p>
            `;
            return;
        }

        eventos.forEach(evento => {
            const card = document.createElement('article');
            card.className = 'event-card';

            const imagem = document.createElement('img');
            imagem.className = 'event-image';
            imagem.alt = evento.titulo_evento || 'Imagem do evento';

            if (evento.imagem_evento) {
                imagem.src = `${API_BASE_URL}/imagens/${evento.imagem_evento}`;
                imagem.onerror = () => {
                    imagem.style.display = 'none';
                };
            } else {
                imagem.style.display = 'none';
            }

            const info = document.createElement('div');
            info.className = 'event-info';

            const categoria = document.createElement('span');
            categoria.className = 'event-status';
            categoria.textContent = evento.nome_categoria || 'Evento';

            const titulo = document.createElement('h3');
            titulo.textContent = evento.titulo_evento || 'Evento sem título';

            const descricao = document.createElement('p');
            descricao.textContent = evento.descricao_evento || '';

            const local = document.createElement('p');
            local.textContent = `📍 ${evento.local_evento || 'Local a definir'}`;

            const data = document.createElement('p');
            data.textContent = `📅 ${formatarData(evento.data_evento)}`;

            const horario = document.createElement('p');
            horario.textContent = `🕒 ${evento.horario_evento || 'Horário a definir'}`;

            const botao = document.createElement('a');
            botao.className = 'event-button';
            botao.href = '../login/login.html';
            botao.textContent = 'ENTRAR PARA COMPRAR ↗';

            info.append(
                categoria,
                titulo,
                descricao,
                local,
                data,
                horario,
                botao
            );

            card.append(imagem, info);
            listaEventos.appendChild(card);
        });

    } catch (erro) {
        console.error('Erro ao carregar eventos:', erro);

        listaEventos.innerHTML = `
            <p class="error-events">
                Não foi possível carregar os eventos.
                Tente novamente mais tarde.
            </p>
        `;
    }
}

function formatarData(data) {
    if (!data) return 'Data a definir';

    const partes = String(data).slice(0, 10).split('-');

    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

carregarEventos();
