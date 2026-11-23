
const API = `http://${window.location.hostname}:3001`;

const form = document.getElementById('formPagamento');
const campoId = document.getElementById('idForma');
const campoNome = document.getElementById('nomeForma');
const lista = document.getElementById('listaFormas');
const mensagem = document.getElementById('mensagem');

let formas = [];

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.style.color = erro ? '#ff7777' : '#ff803d';
}

async function listar() {
    try {
        const resposta = await fetch(
            `${API}/formaPagamento/listar`,
            { credentials: 'include' }
        );

        const dados = await resposta.json();

        if (!dados.sucesso) {
            throw new Error(dados.mensagem);
        }

        formas = dados.formasPagamento;

        document.getElementById('contador').textContent =
            `${formas.length} forma(s)`;

        lista.innerHTML = '';

        if (!formas.length) {
            lista.innerHTML = `
                <p class="vazio">
                    Nenhuma forma de pagamento cadastrada.
                </p>
            `;
            return;
        }

        formas.forEach(forma => {
            const item = document.createElement('div');
            item.className = 'forma-item';

            const informacoes = document.createElement('div');

            const codigo = document.createElement('span');
            codigo.className = 'codigo';
            codigo.textContent =
                `ID #${forma.id_forma_pagamento}`;

            const nome = document.createElement('h3');
            nome.textContent = forma.nome_forma_pagamento;

            informacoes.append(codigo, nome);

            const acoes = document.createElement('div');
            acoes.className = 'acoes';

            const editar = document.createElement('button');
            editar.className = 'btn-editar';
            editar.textContent = 'Editar';
            editar.onclick = () =>
                editarForma(forma.id_forma_pagamento);

            const excluir = document.createElement('button');
            excluir.className = 'btn-excluir';
            excluir.textContent = 'Excluir';
            excluir.onclick = () =>
                excluirForma(forma.id_forma_pagamento);

            acoes.append(editar, excluir);
            item.append(informacoes, acoes);
            lista.appendChild(item);
        });

    } catch (erro) {
        console.error(erro);
        mostrarMensagem('Erro ao carregar formas de pagamento.', true);
    }
}

function editarForma(id) {
    const forma = formas.find(
        f => Number(f.id_forma_pagamento) === Number(id)
    );

    if (!forma) return;

    campoId.value = forma.id_forma_pagamento;
    campoNome.value = forma.nome_forma_pagamento;

    document.getElementById('tituloFormulario').textContent =
        'Editar forma de pagamento';

    document.getElementById('cancelar').hidden = false;

    campoNome.focus();
}

function cancelarEdicao() {
    form.reset();
    campoId.value = '';

    document.getElementById('tituloFormulario').textContent =
        'Nova forma de pagamento';

    document.getElementById('cancelar').hidden = true;
}

form.addEventListener('submit', async evento => {
    evento.preventDefault();

    const id = campoId.value;
    const nome = campoNome.value.trim();

    if (!nome) {
        mostrarMensagem('Digite o nome da forma.', true);
        return;
    }

    const url = id
        ? `${API}/formaPagamento/${id}`
        : `${API}/formaPagamento`;

    const metodo = id ? 'PUT' : 'POST';

    try {
        const resposta = await fetch(url, {
            method: metodo,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome_forma_pagamento: nome
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || 'Erro ao salvar.'
            );
        }

        cancelarEdicao();
        mostrarMensagem(dados.mensagem);
        await listar();

    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

async function excluirForma(id) {
    if (!confirm('Deseja excluir esta forma de pagamento?')) {
        return;
    }

    try {
        const resposta = await fetch(
            `${API}/formaPagamento/${id}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(dados.mensagem);
        }

        cancelarEdicao();
        mostrarMensagem(dados.mensagem);
        await listar();

    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

document.getElementById('cancelar')
    .addEventListener('click', cancelarEdicao);

listar();
