
const API_BASE_URL = `http://${window.location.hostname}:3001`;

const formatarPreco = valor =>
    Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

let idPedido = null;
let totalCentavos = 0;
let formasDisponiveis = [];
let formasSelecionadas = [];
let pagamentoConcluido = false;
let enviandoPagamento = false;

const valorTotalElemento = document.getElementById('valor-total');
const valorRestanteElemento = document.getElementById('valor-restante');
const numeroPedidoElemento = document.getElementById('numero-pedido');
const statusPedidoElemento = document.getElementById('status-pedido');
const selectForma = document.getElementById('forma-pagamento');
const btnAdicionar = document.getElementById('btn-adicionar');
const btnFinalizar = document.getElementById('btn-finalizar');
const containerFormas = document.getElementById('formas-adicionadas');
const formPagamento = document.getElementById('form-pagamento');
const mensagem = document.getElementById('mensagem-pagamento');

// EXIBIR MENSAGENS NA PÁGINA
function mostrarMensagem(texto) {
    mensagem.textContent = texto;
}

// CALCULAR VALORES
function calcularDistribuido() {
    return formasSelecionadas.reduce(
        (total, forma) => total + forma.centavos,
        0
    );
}

function calcularRestante() {
    return totalCentavos - calcularDistribuido();
}

// ATUALIZAR RESUMO
function atualizarResumo() {
    const restante = calcularRestante();

    valorTotalElemento.textContent =
        formatarPreco(totalCentavos / 100);

    valorRestanteElemento.textContent =
        formatarPreco(restante / 100);

    valorRestanteElemento.style.color =
        restante === 0 ? '#16a34a' : '#f97316';

    btnFinalizar.disabled =
        pagamentoConcluido ||
        enviandoPagamento ||
        formasSelecionadas.length === 0 ||
        restante !== 0 ||
        formasSelecionadas.some(forma => forma.centavos <= 0);

    btnAdicionar.disabled =
        pagamentoConcluido ||
        enviandoPagamento ||
        restante <= 0 ||
        !selectForma.value;
}

// CONSULTAR PEDIDO NO BANCO
async function carregarPedido() {
    const dadosSalvos = sessionStorage.getItem('dadosPagamento');

    if (!dadosSalvos) {
        throw new Error(
            'Nenhum pedido encontrado. Volte ao carrinho.'
        );
    }

    let dados;

    try {
        dados = JSON.parse(dadosSalvos);
    } catch {
        throw new Error('Dados do pedido inválidos.');
    }

    idPedido = Number(dados.id_pedido);

    if (!Number.isSafeInteger(idPedido) || idPedido <= 0) {
        throw new Error('ID do pedido inválido.');
    }

    const resposta = await fetch(
        `${API_BASE_URL}/pagamento/${idPedido}`,
        {
            credentials: 'include'
        }
    );

    if (resposta.status === 401) {
        window.location.replace(`${API_BASE_URL}/login`);
        return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok || !resultado.sucesso) {
        throw new Error(
            resultado.mensagem || 'Erro ao consultar pedido.'
        );
    }

    const pedido = resultado.pedido;
    const total = Number(pedido.valor_total);

    if (!Number.isFinite(total) || total <= 0) {
        throw new Error('O pedido não possui um total válido.');
    }

    totalCentavos = Math.round(total * 100);

    numeroPedidoElemento.textContent =
        `Pedido #${pedido.id_pedido}`;

    statusPedidoElemento.textContent =
        `Status: ${pedido.status_pedido}`;

    if (
        pedido.status_pedido !== 'Pendente' ||
        pedido.status_pagamento
    ) {
        pagamentoConcluido = true;

        mostrarMensagem(
            'Este pedido já foi processado ou não está pendente.'
        );
    }

    atualizarResumo();
}

// CARREGAR FORMAS DE PAGAMENTO
async function carregarFormasPagamento() {
    const resposta = await fetch(
        `${API_BASE_URL}/formaPagamento/listar`,
        {
            credentials: 'include'
        }
    );

    if (!resposta.ok) {
        throw new Error(
            'Não foi possível carregar as formas de pagamento.'
        );
    }

    const dados = await resposta.json();

    if (
        !dados.sucesso ||
        !Array.isArray(dados.formasPagamento)
    ) {
        throw new Error(
            'Resposta inválida da API de formas de pagamento.'
        );
    }

    formasDisponiveis = dados.formasPagamento;

    selectForma.innerHTML = '';

    const opcaoInicial = document.createElement('option');
    opcaoInicial.value = '';
    opcaoInicial.textContent = 'Selecione uma forma de pagamento';

    selectForma.appendChild(opcaoInicial);

    formasDisponiveis.forEach(forma => {
        const option = document.createElement('option');

        option.value = forma.id_forma_pagamento;
        option.textContent = forma.nome_forma_pagamento;

        selectForma.appendChild(option);
    });

    selectForma.disabled =
        pagamentoConcluido || formasDisponiveis.length === 0;

    atualizarResumo();
}

// ADICIONAR FORMA DE PAGAMENTO
function adicionarForma() {
    mostrarMensagem('');

    const id = Number(selectForma.value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        mostrarMensagem('Selecione uma forma de pagamento.');
        return;
    }

    if (
        formasSelecionadas.some(
            forma => forma.id_forma_pagamento === id
        )
    ) {
        mostrarMensagem(
            'Essa forma de pagamento já foi adicionada.'
        );
        return;
    }

    const formaBanco = formasDisponiveis.find(
        forma => Number(forma.id_forma_pagamento) === id
    );

    if (!formaBanco) {
        mostrarMensagem('Forma de pagamento não encontrada.');
        return;
    }

    const restante = calcularRestante();

    if (restante <= 0) {
        mostrarMensagem(
            'O valor total já foi distribuído.'
        );
        return;
    }

    formasSelecionadas.push({
        id_forma_pagamento: id,
        nome: formaBanco.nome_forma_pagamento,
        centavos: restante
    });

    selectForma.value = '';

    renderizarFormas();
}

// REMOVER FORMA DE PAGAMENTO
function removerForma(id) {
    if (enviandoPagamento || pagamentoConcluido) return;

    formasSelecionadas = formasSelecionadas.filter(
        forma => forma.id_forma_pagamento !== id
    );

    mostrarMensagem('');
    renderizarFormas();
}

// ALTERAR VALOR
function alterarValor(id, valorDigitado) {
    const forma = formasSelecionadas.find(
        item => item.id_forma_pagamento === id
    );

    if (!forma) return;

    const valor = Number(valorDigitado);

    if (!Number.isFinite(valor) || valor < 0) {
        forma.centavos = 0;
    } else {
        forma.centavos = Math.round(valor * 100);
    }

    atualizarResumo();
}

// EXIBIR FORMAS ADICIONADAS
function renderizarFormas() {
    containerFormas.innerHTML = '';

    formasSelecionadas.forEach(forma => {
        const bloco = document.createElement('div');
        bloco.className = 'forma-pagamento-item';

        const titulo = document.createElement('strong');
        titulo.textContent = forma.nome;

        const label = document.createElement('label');
        label.textContent = 'Valor (R$)';

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0.01';
        input.step = '0.01';
        input.value = (forma.centavos / 100).toFixed(2);
        input.disabled = enviandoPagamento || pagamentoConcluido;

        input.addEventListener('input', () => {
            alterarValor(
                forma.id_forma_pagamento,
                input.value
            );
        });

        const remover = document.createElement('button');
        remover.type = 'button';
        remover.textContent = 'Remover';
        remover.className = 'btn-remover';
        remover.disabled = enviandoPagamento || pagamentoConcluido;

        remover.addEventListener('click', () => {
            removerForma(forma.id_forma_pagamento);
        });

        bloco.append(titulo, label, input, remover);
        containerFormas.appendChild(bloco);
    });

    atualizarResumo();
}

// ENVIAR PAGAMENTO
async function enviarPagamento(evento) {
    evento.preventDefault();

    if (pagamentoConcluido || enviandoPagamento) {
        return;
    }

    mostrarMensagem('');

    if (
        formasSelecionadas.length === 0 ||
        calcularRestante() !== 0 ||
        formasSelecionadas.some(forma => forma.centavos <= 0)
    ) {
        mostrarMensagem(
            'Distribua exatamente o valor total entre as formas de pagamento.'
        );
        return;
    }

    enviandoPagamento = true;
    btnFinalizar.textContent = 'PROCESSANDO PAGAMENTO...';
    atualizarResumo();

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/pagamento/${idPedido}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    formasPagamento: formasSelecionadas.map(
                        forma => ({
                            id_forma_pagamento:
                                forma.id_forma_pagamento,
                            valor: forma.centavos / 100
                        })
                    )
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || 'Erro ao registrar pagamento.'
            );
        }

        pagamentoConcluido = true;

        // LIMPAR DADOS DA COMPRA
        sessionStorage.removeItem('carrinho');
        sessionStorage.removeItem('dadosPagamento');

        // REDIRECIONAR DIRETAMENTE PARA A CONFIRMAÇÃO
        window.location.replace(
            `${API_BASE_URL}/visaoCliente/confirmacao/confirmacao.html?pedido=${idPedido}`
        );

    } catch (erro) {
        console.error('Erro no pagamento:', erro);

        mostrarMensagem(erro.message);

        btnFinalizar.textContent =
            'FINALIZAR PAGAMENTO ↗';

    } finally {
        enviandoPagamento = false;
        atualizarResumo();
    }
}

// EVENTOS
btnAdicionar.addEventListener('click', adicionarForma);

selectForma.addEventListener('change', atualizarResumo);

formPagamento.addEventListener('submit', enviarPagamento);

// INICIALIZAR
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await carregarPedido();

        if (!pagamentoConcluido) {
            await carregarFormasPagamento();
        }

    } catch (erro) {
        console.error('Erro ao carregar pagamento:', erro);

        mostrarMensagem(erro.message);

        btnFinalizar.disabled = true;
        btnAdicionar.disabled = true;
        selectForma.disabled = true;
    }
});
