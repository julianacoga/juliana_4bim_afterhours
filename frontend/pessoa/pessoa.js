
const API_BASE_URL = 'http://localhost:3001';

let currentPersonId = null;
let operacao = null;

const form = document.getElementById('pessoaForm');
const formFields = document.getElementById('formFields');

const searchId = document.getElementById('searchId');

const btnBuscar = document.getElementById('btnBuscar');
const btnIncluir = document.getElementById('btnIncluir');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');

const pessoasTableBody = document.getElementById('pessoasTableBody');
const messageContainer = document.getElementById('messageContainer');

const checkboxFuncionario = document.getElementById('checkboxFuncionario');
const checkboxCliente = document.getElementById('checkboxCliente');

const cargoSelect = document.getElementById('cargo_id_cargo');
const salarioInput = document.getElementById('salario_funcionario');
const dataCadastroInput = document.getElementById('data_cadastro_cliente');

document.addEventListener('DOMContentLoaded', async () => {
    bloquearCampos(false);
    mostrarBotoes(true, false, false, false, false, false);

    document.getElementById('data_nascimento').max = hojeLocal();
    document.getElementById('data_nascimento').min = '1900-01-01';
    dataCadastroInput.max = hojeLocal();

    await carregarPessoas();
    await popularCargosSelect();
});

btnBuscar.addEventListener('click', buscarPessoa);
btnIncluir.addEventListener('click', incluirPessoa);
btnAlterar.addEventListener('click', alterarPessoa);
btnExcluir.addEventListener('click', excluirPessoa);
btnCancelar.addEventListener('click', cancelarOperacao);
btnSalvar.addEventListener('click', salvarOperacao);

checkboxFuncionario.addEventListener('change', atualizarCamposRelacionados);
checkboxCliente.addEventListener('change', atualizarCamposRelacionados);

searchId.addEventListener('input', () => {
    searchId.value = searchId.value.replace(/\D/g, '').slice(0, 11);
});

function hojeLocal() {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

function mostrarMensagem(texto, tipo = 'info') {
    messageContainer.textContent = texto;
    messageContainer.className = `message-container ${tipo}`;
    messageContainer.style.display = 'block';
}

function limparMensagem() {
    messageContainer.textContent = '';
    messageContainer.style.display = 'none';
}

function mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar) {
    btnBuscar.style.display = btBuscar ? 'inline-block' : 'none';
    btnIncluir.style.display = btIncluir ? 'inline-block' : 'none';
    btnAlterar.style.display = btAlterar ? 'inline-block' : 'none';
    btnExcluir.style.display = btExcluir ? 'inline-block' : 'none';
    btnSalvar.style.display = btSalvar ? 'inline-block' : 'none';
    btnCancelar.style.display = btCancelar ? 'inline-block' : 'none';
}

function bloquearCampos(bloquear) {
    formFields.disabled = bloquear;

    checkboxFuncionario.disabled = bloquear;
    checkboxCliente.disabled = bloquear;

    atualizarCamposRelacionados();

    searchId.disabled = false;
}

function atualizarCamposRelacionados() {
    const bloqueado = formFields.disabled;

    cargoSelect.disabled = bloqueado || !checkboxFuncionario.checked;
    salarioInput.disabled = bloqueado || !checkboxFuncionario.checked;
    dataCadastroInput.disabled = bloqueado || !checkboxCliente.checked;
}

function limparFormulario() {
    form.reset();

    checkboxFuncionario.checked = false;
    checkboxCliente.checked = false;

    cargoSelect.value = '';
    salarioInput.value = '';
    dataCadastroInput.value = '';

    atualizarCamposRelacionados();
}

function formatarData(dataString) {
    if (!dataString) return '';

    const data = String(dataString).split('T')[0];
    const partes = data.split('-');

    if (partes.length !== 3) return '';

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function converterDataParaISO(dataString) {
    if (!dataString) return null;

    return dataString;
}

async function lerResposta(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.sucesso === false) {
        throw new Error(data.mensagem || `Erro na requisição (${response.status}).`);
    }

    return data;
}

async function funcaoEhFuncionario(pessoaId) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/funcionario/${encodeURIComponent(pessoaId)}`
        );

        if (response.status === 404) {
            return { ehFuncionario: false };
        }

        const data = await lerResposta(response);
        const funcionario = data.funcionario || data;

        return {
            ehFuncionario: true,
            salario_funcionario: funcionario.salario_funcionario,
            cargo_id_cargo: funcionario.cargo_id_cargo
        };

    } catch (error) {
        console.error('Erro ao verificar funcionário:', error);
        return { ehFuncionario: false };
    }
}

async function funcaoEhCliente(pessoaId) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/cliente/${encodeURIComponent(pessoaId)}`
        );

        if (response.status === 404) {
            return { ehCliente: false };
        }

        const data = await lerResposta(response);
        const cliente = data.cliente || data;

        return {
            ehCliente: true,
            data_cadastro_cliente: cliente.data_cadastro_cliente
        };

    } catch (error) {
        console.error('Erro ao verificar cliente:', error);
        return { ehCliente: false };
    }
}

async function buscarPessoa() {
    const id = searchId.value.replace(/\D/g, '');

    if (id.length !== 11) {
        mostrarMensagem('Digite um CPF com 11 números.', 'warning');
        return;
    }

    searchId.value = id;
    limparFormulario();
    currentPersonId = null;

    try {
        const response = await fetch(
            `${API_BASE_URL}/pessoa/${encodeURIComponent(id)}`
        );

        if (response.status === 404) {
            limparFormulario();
            searchId.value = id;

            bloquearCampos(false);
            mostrarBotoes(true, true, false, false, false, false);

            mostrarMensagem('Pessoa não encontrada. Você pode cadastrar.', 'info');
            return;
        }

        const data = await lerResposta(response);

        await preencherFormulario(data.pessoa);

        bloquearCampos(true);
        mostrarBotoes(true, false, true, true, false, false);

        mostrarMensagem('Pessoa encontrada!', 'success');

    } catch (error) {
        console.error('Erro ao buscar pessoa:', error);
        mostrarMensagem(error.message || 'Erro ao buscar pessoa.', 'error');
    }
}

async function preencherFormulario(pessoa) {
    currentPersonId = pessoa.cpf_pessoa;
    searchId.value = pessoa.cpf_pessoa;

    document.getElementById('nome_pessoa').value = pessoa.nome_pessoa || '';
    document.getElementById('data_nascimento').value =
        pessoa.data_nascimento_pessoa
            ? String(pessoa.data_nascimento_pessoa).split('T')[0]
            : '';

    document.getElementById('genero_pessoa').value = pessoa.genero_pessoa || '';
    document.getElementById('senha_pessoa').value = '';
    document.getElementById('email_pessoa').value = pessoa.email_pessoa || '';
    document.getElementById('telefone_pessoa').value = pessoa.telefone_pessoa || '';

    const funcionario = await funcaoEhFuncionario(currentPersonId);

    checkboxFuncionario.checked = funcionario.ehFuncionario;

    if (funcionario.ehFuncionario) {
        cargoSelect.value = funcionario.cargo_id_cargo || '';
        salarioInput.value = funcionario.salario_funcionario || '';
    } else {
        cargoSelect.value = '';
        salarioInput.value = '';
    }

    const cliente = await funcaoEhCliente(currentPersonId);

    checkboxCliente.checked = cliente.ehCliente;

    dataCadastroInput.value = cliente.ehCliente && cliente.data_cadastro_cliente
        ? String(cliente.data_cadastro_cliente).split('T')[0]
        : '';

    atualizarCamposRelacionados();
}

function incluirPessoa() {
    const cpf = searchId.value.replace(/\D/g, '');

    if (cpf.length !== 11) {
        mostrarMensagem('Digite um CPF válido antes de cadastrar.', 'warning');
        return;
    }

    currentPersonId = cpf;
    limparFormulario();

    searchId.value = cpf;

    bloquearCampos(false);
    mostrarBotoes(false, false, false, false, true, true);

    operacao = 'incluir';

    document.getElementById('nome_pessoa').focus();
    mostrarMensagem('Preencha os dados da nova pessoa.', 'info');
}

function alterarPessoa() {
    if (!currentPersonId) {
        mostrarMensagem('Busque uma pessoa antes de alterar.', 'warning');
        return;
    }

    bloquearCampos(false);
    mostrarBotoes(false, false, false, false, true, true);

    operacao = 'alterar';

    document.getElementById('nome_pessoa').focus();
    mostrarMensagem('Altere os dados desejados e clique em Salvar.', 'info');
}

function excluirPessoa() {
    if (!currentPersonId) {
        mostrarMensagem('Busque uma pessoa antes de excluir.', 'warning');
        return;
    }

    if (!confirm('Tem certeza que deseja excluir esta pessoa?')) {
        return;
    }

    operacao = 'excluir';
    salvarOperacao();
}

function validarFormulario(pessoa) {
    if (!pessoa.nome_pessoa || !pessoa.nome_pessoa.trim()) {
        throw new Error('Informe o nome da pessoa.');
    }

    if (!pessoa.genero_pessoa) {
        throw new Error('Selecione o gênero.');
    }

    if (!pessoa.email_pessoa) {
        throw new Error('Informe o email.');
    }

    if (!pessoa.telefone_pessoa) {
        throw new Error('Informe o telefone.');
    }

    if (operacao === 'incluir' && !pessoa.senha_pessoa) {
        throw new Error('Informe uma senha para cadastrar a pessoa.');
    }

    const nascimento = document.getElementById('data_nascimento').value;

    if (nascimento && nascimento > hojeLocal()) {
        throw new Error('A data de nascimento não pode ser futura.');
    }

    if (nascimento && nascimento < '1900-01-01') {
        throw new Error('Data de nascimento inválida.');
    }

    if (checkboxFuncionario.checked) {
        if (!cargoSelect.value) {
            throw new Error('Selecione o cargo do funcionário.');
        }

        if (salarioInput.value === '' || Number(salarioInput.value) < 0) {
            throw new Error('Informe um salário válido.');
        }
    }

    if (checkboxCliente.checked) {
        if (dataCadastroInput.value && dataCadastroInput.value > hojeLocal()) {
            throw new Error('A data de cadastro não pode ser futura.');
        }
    }
}

async function salvarOperacao() {
    btnSalvar.disabled = true;

    try {
        if (operacao === 'excluir') {
            await excluirRelacionamentos();
            await excluirPessoaDoBanco();

            mostrarMensagem('Pessoa excluída com sucesso!', 'success');

            limparFormulario();
            searchId.value = '';
            currentPersonId = null;

            await carregarPessoas();
            return;
        }

        const formData = new FormData(form);

        const pessoa = {
            cpf_pessoa: searchId.value.replace(/\D/g, ''),
            nome_pessoa: formData.get('nome_pessoa')?.trim(),
            data_nascimento_pessoa: converterDataParaISO(
                formData.get('data_nascimento')
            ),
            genero_pessoa: formData.get('genero_pessoa'),
            senha_pessoa: formData.get('senha_pessoa'),
            email_pessoa: formData.get('email_pessoa')?.trim(),
            telefone_pessoa: formData.get('telefone_pessoa')?.trim()
        };

        validarFormulario(pessoa);

        const funcionario = checkboxFuncionario.checked
            ? {
                pessoa_cpf_pessoa: pessoa.cpf_pessoa,
                salario_funcionario: Number(salarioInput.value),
                cargo_id_cargo: Number(cargoSelect.value)
            }
            : null;

        const cliente = checkboxCliente.checked
            ? {
                pessoa_cpf_pessoa: pessoa.cpf_pessoa,
                data_cadastro_cliente: dataCadastroInput.value || null
            }
            : null;

        if (operacao === 'incluir') {
            await incluirPessoaNoBanco(pessoa);

            if (funcionario) {
                await criarRelacionamento('/funcionario', funcionario);
            }

            if (cliente) {
                await criarRelacionamento('/cliente', cliente);
            }

            mostrarMensagem('Pessoa cadastrada com sucesso!', 'success');
        }

        if (operacao === 'alterar') {
            await atualizarPessoaNoBanco(pessoa);

            await atualizarRelacionamento(
                'funcionario',
                funcionario,
                currentPersonId
            );

            await atualizarRelacionamento(
                'cliente',
                cliente,
                currentPersonId
            );

            mostrarMensagem('Pessoa alterada com sucesso!', 'success');
        }

        limparFormulario();
        searchId.value = '';
        currentPersonId = null;

        await carregarPessoas();

    } catch (error) {
        console.error('Erro ao salvar operação:', error);
        mostrarMensagem(error.message || 'Erro ao processar operação.', 'error');

    } finally {
        btnSalvar.disabled = false;

        if (operacao !== null) {
            mostrarBotoes(true, false, false, false, false, false);
            bloquearCampos(false);
            operacao = null;
        }
    }
}

async function incluirPessoaNoBanco(pessoa) {
    const response = await fetch(`${API_BASE_URL}/pessoa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pessoa)
    });

    await lerResposta(response);
}

async function atualizarPessoaNoBanco(pessoa) {
    const response = await fetch(
        `${API_BASE_URL}/pessoa/${encodeURIComponent(currentPersonId)}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pessoa)
        }
    );

    await lerResposta(response);
}

async function criarRelacionamento(endpoint, dados) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });

    await lerResposta(response);
}

async function atualizarRelacionamento(tipo, dados, pessoaId) {
    const endpoint = `/${tipo}/${encodeURIComponent(pessoaId)}`;

    const busca = await fetch(`${API_BASE_URL}${endpoint}`);

    if (dados) {
        if (busca.status === 404) {
            await criarRelacionamento(`/${tipo}`, dados);
            return;
        }

        await lerResposta(busca);

        const resposta = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        await lerResposta(resposta);

    } else {
        if (busca.status !== 404) {
            await lerResposta(busca);

            const resposta = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE'
            });

            await lerResposta(resposta);
        }
    }
}

async function excluirRelacionamentos() {
    const tipos = ['cliente', 'funcionario'];

    for (const tipo of tipos) {
        const endpoint = `/${tipo}/${encodeURIComponent(currentPersonId)}`;
        const busca = await fetch(`${API_BASE_URL}${endpoint}`);

        if (busca.status === 404) {
            continue;
        }

        await lerResposta(busca);

        const resposta = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE'
        });

        await lerResposta(resposta);
    }
}

async function excluirPessoaDoBanco() {
    const response = await fetch(
        `${API_BASE_URL}/pessoa/${encodeURIComponent(currentPersonId)}`,
        { method: 'DELETE' }
    );

    await lerResposta(response);
}

function cancelarOperacao() {
    limparFormulario();

    currentPersonId = null;
    operacao = null;

    searchId.value = '';

    bloquearCampos(false);
    mostrarBotoes(true, false, false, false, false, false);

    mostrarMensagem('Operação cancelada.', 'info');
}

async function carregarPessoas() {
    try {
        const response = await fetch(`${API_BASE_URL}/pessoa`);
        const data = await lerResposta(response);

        renderizarTabelaPessoas(data.pessoas || []);

    } catch (error) {
        console.error('Erro ao carregar pessoas:', error);
        mostrarMensagem(error.message || 'Erro ao carregar lista de pessoas.', 'error');
    }
}

function renderizarTabelaPessoas(pessoas) {
    pessoasTableBody.innerHTML = '';

    if (!pessoas.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 6;
        cell.textContent = 'Nenhuma pessoa cadastrada.';
        row.appendChild(cell);
        pessoasTableBody.appendChild(row);

        return;
    }

    pessoas.forEach(pessoa => {
        const row = document.createElement('tr');

        const cpfCell = document.createElement('td');
        const cpfButton = document.createElement('button');

        cpfButton.type = 'button';
        cpfButton.className = 'btn-id';
        cpfButton.textContent = pessoa.cpf_pessoa;
        cpfButton.addEventListener('click', () => selecionarPessoa(pessoa.cpf_pessoa));

        cpfCell.appendChild(cpfButton);
        row.appendChild(cpfCell);

        const valores = [
            pessoa.nome_pessoa,
            formatarData(pessoa.data_nascimento_pessoa),
            pessoa.genero_pessoa,
            pessoa.email_pessoa,
            pessoa.telefone_pessoa
        ];

        valores.forEach(valor => {
            const cell = document.createElement('td');
            cell.textContent = valor || '';
            row.appendChild(cell);
        });

        pessoasTableBody.appendChild(row);
    });
}

async function selecionarPessoa(id) {
    searchId.value = id;
    await buscarPessoa();
}

async function popularCargosSelect() {
    cargoSelect.innerHTML = '<option value="">Cargo</option>';

    try {
        const response = await fetch(`${API_BASE_URL}/cargo/listar`);
        const data = await lerResposta(response);

        if (Array.isArray(data.cargos)) {
            data.cargos.forEach(cargo => {
                const option = document.createElement('option');

                option.value = cargo.id_cargo;
                option.textContent = cargo.nome_cargo;

                cargoSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error('Erro ao carregar cargos:', error);
        mostrarMensagem('Não foi possível carregar os cargos.', 'error');
    }
}
