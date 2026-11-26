
const URL_API = `http://${window.location.hostname}:3001`;

let ingressosDisponiveis = [];

function fetchAPI(url, opcoes = {}) {
    return fetch(`${URL_API}${url}`, {
        ...opcoes,
        credentials: 'include'
    });
}

async function inicializar() {
    bloquearCampos();
    await carregarIngressos();
    await listar();
}

async function carregarIngressos() {
    try {
        const resposta = await fetchAPI('/ingresso/listar');
        const resultado = await resposta.json();

        if (!resposta.ok || resultado.sucesso === false) {
            throw new Error(resultado.mensagem || 'Erro ao carregar ingressos.');
        }

        ingressosDisponiveis = Array.isArray(resultado)
            ? resultado
            : resultado.ingressos || [];

    } catch (erro) {
        console.error(erro);
        mostrarAviso(erro.message);
    }
}

function mostrarAviso(mensagem) {
    document.getElementById('divAviso').textContent = mensagem;
}

function bloquearCampos() {
    document.getElementById('inputCpf_cliente').disabled = true;
    document.getElementById('inputCpf_funcionario').disabled = true;
    document.getElementById('selectStatus').disabled = true;
    document.getElementById('btAdicionar').disabled = true;

    document.querySelectorAll('#listaItens input, #listaItens select, #listaItens button')
        .forEach(elemento => elemento.disabled = true);
}

function liberarCampos() {
    document.getElementById('inputCpf_cliente').disabled = false;
    document.getElementById('inputCpf_funcionario').disabled = false;
    document.getElementById('selectStatus').disabled = false;
    document.getElementById('btAdicionar').disabled = false;

    document.querySelectorAll('#listaItens input, #listaItens select, #listaItens button')
        .forEach(elemento => elemento.disabled = false);
}

function esconderBotoes() {
    ['btInserir', 'btAlterar', 'btExcluir', 'btSalvar', 'btCancelar']
        .forEach(id => {
            document.getElementById(id).style.display = 'none';
        });

    document.getElementById('btProcure').style.display = 'inline-block';
}

function mostrarBotao(id) {
    document.getElementById(id).style.display = 'inline-block';
}

function limparCampos() {
    document.getElementById('inputCpf_cliente').value = '';
    document.getElementById('inputCpf_funcionario').value = '';
    document.getElementById('selectStatus').value = 'Pendente';
    document.getElementById('listaItens').innerHTML = '';
    document.getElementById('valorTotal').textContent = 'R$ 0,00';
}

function adicionarItem(idSelecionado = '', quantidade = 1) {
    const lista = document.getElementById('listaItens');
    const item = document.createElement('div');

    item.className = 'item-pedido';

    item.innerHTML = `
        <div class="item-pedido-cabecalho">
            <strong>Ingresso</strong>
            <button type="button" class="btRemover"
                onclick="removerItem(this)">
                Remover
            </button>
        </div>

        <label>Modalidade</label>
        <select class="selectIngresso" onchange="atualizarTotal()">
            <option value="">Selecione um ingresso</option>
        </select>

        <label>Quantidade</label>
        <input type="number" class="quantidadeItem" min="1"
            oninput="atualizarTotal()">

        <p class="subtotal">Subtotal: R$ 0,00</p>
    `;

    const select = item.querySelector('.selectIngresso');

    ingressosDisponiveis.forEach(ingresso => {
        const opcao = document.createElement('option');

        opcao.value = ingresso.id_ingresso;
        opcao.textContent = `${ingresso.nome_ingresso} - ${ingresso.titulo_evento || ''}`;

        select.appendChild(opcao);
    });

    select.value = String(idSelecionado);
    item.querySelector('.quantidadeItem').value = quantidade;

    lista.appendChild(item);
    atualizarTotal();
}

function removerItem(botao) {
    botao.closest('.item-pedido').remove();
    atualizarTotal();
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function atualizarTotal() {
    let total = 0;

    document.querySelectorAll('.item-pedido').forEach(item => {
        const id = item.querySelector('.selectIngresso').value;
        const quantidade = Number(item.querySelector('.quantidadeItem').value);

        const ingresso = ingressosDisponiveis.find(
            i => String(i.id_ingresso) === String(id)
        );

        const preco = ingresso
            ? Number(ingresso.preco_unitario_ingresso)
            : 0;

        const subtotal = preco * (
            Number.isFinite(quantidade) ? quantidade : 0
        );

        item.querySelector('.subtotal').textContent =
            `Subtotal: ${formatarMoeda(subtotal)}`;

        total += subtotal;
    });

    document.getElementById('valorTotal').textContent =
        formatarMoeda(total);
}

function obterDados() {
    const ingressos = [];

    document.querySelectorAll('.item-pedido').forEach(item => {
        ingressos.push({
            ingresso_id_ingresso: Number(
                item.querySelector('.selectIngresso').value
            ),
            quantidade: Number(
                item.querySelector('.quantidadeItem').value
            )
        });
    });

    return {
        cliente_pessoa_cpf_pessoa:
            document.getElementById('inputCpf_cliente').value.trim(),

        funcionario_pessoa_cpf_pessoa:
            document.getElementById('inputCpf_funcionario').value.trim() || null,

        status_pedido:
            document.getElementById('selectStatus').value,

        ingressos
    };
}

function validarDados(dados) {
    if (!dados.cliente_pessoa_cpf_pessoa) {
        mostrarAviso('Informe o CPF do cliente.');
        return false;
    }

    if (dados.ingressos.length === 0) {
        mostrarAviso('Adicione pelo menos um ingresso.');
        return false;
    }

    const ids = new Set();

    for (const item of dados.ingressos) {
        if (
            !Number.isInteger(item.ingresso_id_ingresso) ||
            item.ingresso_id_ingresso <= 0 ||
            !Number.isInteger(item.quantidade) ||
            item.quantidade <= 0
        ) {
            mostrarAviso('Confira os ingressos e as quantidades.');
            return false;
        }

        if (ids.has(item.ingresso_id_ingresso)) {
            mostrarAviso('Não repita o mesmo ingresso.');
            return false;
        }

        ids.add(item.ingresso_id_ingresso);
    }

    return true;
}

async function procure() {
    const id = document.getElementById('inputId_pedido').value;

    if (!id || Number(id) <= 0) {
        mostrarAviso('Informe um ID válido.');
        return;
    }

    try {
        const resposta = await fetchAPI(`/pedido/${id}`);
        const resultado = await resposta.json();

        limparCampos();
        esconderBotoes();
        bloquearCampos();

        if (resposta.ok && resultado.sucesso) {
            const pedido = resultado.pedido;

            document.getElementById('inputCpf_cliente').value =
                pedido.cliente_pessoa_cpf_pessoa;

            document.getElementById('inputCpf_funcionario').value =
                pedido.funcionario_pessoa_cpf_pessoa || '';

            document.getElementById('selectStatus').value =
                pedido.status_pedido;

            resultado.itens.forEach(item => {
                adicionarItem(
                    item.ingresso_id_ingresso,
                    item.quantidade
                );
            });

            bloquearCampos();

            mostrarBotao('btAlterar');
            mostrarBotao('btExcluir');

            mostrarAviso('Pedido encontrado!');

        } else if (resposta.status === 404) {
            liberarCampos();

            mostrarBotao('btInserir');
            mostrarBotao('btCancelar');

            adicionarItem();

            mostrarAviso('Pedido não encontrado. Cadastre um novo.');

        } else {
            throw new Error(resultado.mensagem || 'Erro ao consultar pedido.');
        }

    } catch (erro) {
        console.error(erro);
        mostrarAviso(erro.message);
    }
}

async function inserir() {
    const dados = obterDados();

    if (!validarDados(dados)) return;

    try {
        const resposta = await fetchAPI('/pedido', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem);
        }

        document.getElementById('inputId_pedido').value =
            resultado.id_pedido;

        await procure();
        await listar();

        mostrarAviso(resultado.mensagem);

    } catch (erro) {
        console.error(erro);
        mostrarAviso(erro.message || 'Erro ao cadastrar pedido.');
    }
}

function alterar() {
    liberarCampos();

    document.getElementById('btAlterar').style.display = 'none';
    document.getElementById('btExcluir').style.display = 'none';
    document.getElementById('btProcure').style.display = 'none';
    document.getElementById('inputId_pedido').disabled = true;

    mostrarBotao('btSalvar');
    mostrarBotao('btCancelar');

    mostrarAviso('Altere os dados e clique em Salvar.');
}

async function salvar() {
    const id = document.getElementById('inputId_pedido').value;
    const dados = obterDados();

    if (!validarDados(dados)) return;

    try {
        const resposta = await fetchAPI(`/pedido/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem);
        }

        document.getElementById('inputId_pedido').disabled = false;

        await procure();
        await listar();

        mostrarAviso(resultado.mensagem);

    } catch (erro) {
        console.error(erro);
        mostrarAviso(erro.message || 'Erro ao alterar pedido.');
    }
}

async function excluir() {
    const id = document.getElementById('inputId_pedido').value;

    if (!id) {
        mostrarAviso('Informe o ID do pedido.');
        return;
    }

    if (!confirm('Deseja realmente excluir este pedido?')) return;

    try {
        const resposta = await fetchAPI(`/pedido/${id}`, {
            method: 'DELETE'
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem);
        }

        cancelarOperacao();
        await listar();

        mostrarAviso(resultado.mensagem);

    } catch (erro) {
        console.error(erro);
        mostrarAviso(erro.message || 'Erro ao excluir pedido.');
    }
}

function cancelarOperacao() {
    document.getElementById('inputId_pedido').disabled = false;
    document.getElementById('inputId_pedido').value = '';

    limparCampos();
    bloquearCampos();
    esconderBotoes();

    mostrarAviso('Informe o ID do pedido e clique em Procure.');
}

async function listar() {
    const saida = document.getElementById('outputSaida');

    try {
        const resposta = await fetchAPI('/pedido/listar');
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || 'Erro ao listar pedidos.');
        }

        saida.innerHTML = '';

        if (resultado.pedidos.length === 0) {
            saida.textContent = 'Nenhum pedido cadastrado.';
            return;
        }

        resultado.pedidos.forEach(pedido => {
            const item = document.createElement('div');
            item.className = 'item-lista-pedido';
            item.style.cursor = 'pointer';

            const titulo = document.createElement('strong');
            titulo.textContent = `Pedido #${pedido.id_pedido}`;

            const status = document.createElement('p');
            status.textContent = `Status: ${pedido.status_pedido}`;

            const data = document.createElement('p');
            data.textContent = `Data: ${new Date(pedido.data_pedido).toLocaleString('pt-BR')}`;

            const total = document.createElement('p');
            total.textContent = `Total: ${formatarMoeda(pedido.valor_total)}`;

            item.append(titulo, status, data, total);

            item.addEventListener('click', () => {
                document.getElementById('inputId_pedido').disabled = false;
                document.getElementById('inputId_pedido').value = pedido.id_pedido;
                procure();
            });

            saida.appendChild(item);
        });

    } catch (erro) {
        console.error(erro);
        saida.textContent = erro.message;
    }
}
