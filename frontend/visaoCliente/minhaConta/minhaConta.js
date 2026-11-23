
const API_BASE_URL = `http://${window.location.hostname}:3001`;

let dadosOriginais = null;

const camposEditaveis = [
    'nome',
    'email',
    'telefone',
    'dataNascimento',
    'genero'
];

// EXIBIR MENSAGENS
function mostrarMensagem(id, texto, tipo = '') {
    const elemento = document.getElementById(id);

    elemento.textContent = texto;
    elemento.className = `mensagem ${tipo}`;
}

// FORMATAR DATA SEM ALTERAR O DIA
function formatarData(data) {
    if (!data) return '';

    return String(data).substring(0, 10);
}

// BUSCAR DADOS DO CLIENTE LOGADO
async function carregarMinhaConta() {
    try {
        const resposta = await fetch(
            `${API_BASE_URL}/cliente/minhaConta`,
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        if (resposta.status === 401 || resposta.status === 403) {
            window.location.href = `${API_BASE_URL}/login`;
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || 'Erro ao carregar seus dados.'
            );
        }

        dadosOriginais = dados.cliente;

        preencherCampos(dadosOriginais);

    } catch (erro) {
        console.error('Erro ao carregar minha conta:', erro);

        mostrarMensagem(
            'mensagemPerfil',
            erro.message,
            'erro'
        );
    }
}

// PREENCHER CAMPOS DO FORMULÁRIO
function preencherCampos(cliente) {
    document.getElementById('nome').value =
        cliente.nome_pessoa || '';

    document.getElementById('cpf').value =
        cliente.cpf_pessoa || '';

    document.getElementById('email').value =
        cliente.email_pessoa || '';

    document.getElementById('telefone').value =
        cliente.telefone_pessoa || '';

    document.getElementById('dataNascimento').value =
        formatarData(cliente.data_nascimento_pessoa);

    document.getElementById('genero').value =
        cliente.genero_pessoa || '';
}

// ATIVAR OU DESATIVAR EDIÇÃO
function alterarModoEdicao(editando) {
    camposEditaveis.forEach((id) => {
        document.getElementById(id).disabled = !editando;
    });

    // CPF NUNCA PODE SER ALTERADO
    document.getElementById('cpf').disabled = true;

    document.getElementById('botaoEditar').hidden = editando;

    document.getElementById('acoesFormulario').hidden = !editando;
}

// EDITAR DADOS
function editarPerfil() {
    if (!dadosOriginais) return;

    mostrarMensagem('mensagemPerfil', '');

    alterarModoEdicao(true);
}

// CANCELAR ALTERAÇÕES
function cancelarEdicao() {
    if (!dadosOriginais) return;

    preencherCampos(dadosOriginais);

    alterarModoEdicao(false);

    mostrarMensagem('mensagemPerfil', '');
}

// SALVAR ALTERAÇÕES DO PERFIL
async function salvarPerfil(evento) {
    evento.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!nome || !email) {
        mostrarMensagem(
            'mensagemPerfil',
            'Nome e e-mail são obrigatórios.',
            'erro'
        );
        return;
    }

    const dadosAtualizados = {
        nome_pessoa: nome,
        email_pessoa: email,
        telefone_pessoa:
            document.getElementById('telefone').value.trim(),
        data_nascimento_pessoa:
            document.getElementById('dataNascimento').value || null,
        genero_pessoa:
            document.getElementById('genero').value || null
    };

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/cliente/minhaConta`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(dadosAtualizados)
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || 'Erro ao atualizar perfil.'
            );
        }

        dadosOriginais = dados.cliente;

        preencherCampos(dadosOriginais);

        alterarModoEdicao(false);

        mostrarMensagem(
            'mensagemPerfil',
            'Dados atualizados com sucesso!',
            'sucesso'
        );

    } catch (erro) {
        console.error('Erro ao salvar perfil:', erro);

        mostrarMensagem(
            'mensagemPerfil',
            erro.message,
            'erro'
        );
    }
}

// ALTERAR SENHA
async function alterarSenha(evento) {
    evento.preventDefault();

    const senhaAtual =
        document.getElementById('senhaAtual').value;

    const novaSenha =
        document.getElementById('novaSenha').value;

    const confirmarSenha =
        document.getElementById('confirmarSenha').value;

    if (novaSenha.length < 8) {
        mostrarMensagem(
            'mensagemSenha',
            'A nova senha deve ter pelo menos 8 caracteres.',
            'erro'
        );
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mostrarMensagem(
            'mensagemSenha',
            'As novas senhas não coincidem.',
            'erro'
        );
        return;
    }

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/alterarSenha`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    senha_atual: senhaAtual,
                    nova_senha: novaSenha
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || 'Erro ao alterar senha.'
            );
        }

        document.getElementById('formSenha').reset();

        mostrarMensagem(
            'mensagemSenha',
            'Senha alterada com sucesso!',
            'sucesso'
        );

    } catch (erro) {
        console.error('Erro ao alterar senha:', erro);

        mostrarMensagem(
            'mensagemSenha',
            erro.message,
            'erro'
        );
    }
}

// INICIAR PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('botaoEditar')
        .addEventListener('click', editarPerfil);

    document.getElementById('botaoCancelar')
        .addEventListener('click', cancelarEdicao);

    document.getElementById('formMinhaConta')
        .addEventListener('submit', salvarPerfil);

    document.getElementById('formSenha')
        .addEventListener('submit', alterarSenha);

    carregarMinhaConta();
});
