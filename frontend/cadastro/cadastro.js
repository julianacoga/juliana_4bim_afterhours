
const API_BASE_URL = 'http://localhost:3001';

const formCadastro = document.getElementById('formCadastro');
const mensagem = document.getElementById('mensagem');

// FORMATAR CPF
document.getElementById('cpf_pessoa').addEventListener('input', (e) => {
    let valor = e.target.value.replace(/\D/g, '');

    valor = valor.slice(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    e.target.value = valor;
});

// FORMATAR TELEFONE
document.getElementById('telefone_pessoa').addEventListener('input', (e) => {
    let valor = e.target.value.replace(/\D/g, '').slice(0, 11);

    if (valor.length > 10) {
        valor = valor.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (valor.length > 6) {
        valor = valor.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
    } else if (valor.length > 2) {
        valor = valor.replace(/(\d{2})(\d+)/, '($1) $2');
    }

    e.target.value = valor;
});

// CADASTRAR CLIENTE
formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cpf_pessoa = document.getElementById('cpf_pessoa').value.replace(/\D/g, '');
    const nome_pessoa = document.getElementById('nome_pessoa').value.trim();
    const data_nascimento_pessoa = document.getElementById('data_nascimento_pessoa').value;
    const genero_pessoa = document.getElementById('genero_pessoa').value;
    const email_pessoa = document.getElementById('email_pessoa').value.trim();
    const telefone_pessoa = document.getElementById('telefone_pessoa').value.replace(/\D/g, '');
    const senha_pessoa = document.getElementById('senha_pessoa').value;
    const confirmar_senha = document.getElementById('confirmar_senha').value;

    mensagem.textContent = '';

    if (cpf_pessoa.length !== 11) {
        mensagem.textContent = 'Informe um CPF válido.';
        return;
    }

    if (senha_pessoa.length < 8) {
        mensagem.textContent = 'A senha deve ter pelo menos 8 caracteres.';
        return;
    }

    if (senha_pessoa !== confirmar_senha) {
        mensagem.textContent = 'As senhas não coincidem.';
        return;
    }

    try {
        const resposta = await fetch(`${API_BASE_URL}/login/cadastro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cpf_pessoa,
                nome_pessoa,
                data_nascimento_pessoa: data_nascimento_pessoa || null,
                genero_pessoa: genero_pessoa || null,
                email_pessoa,
                telefone_pessoa: telefone_pessoa || null,
                senha_pessoa
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagem.textContent = dados.mensagem || 'Erro ao realizar cadastro.';
            return;
        }

        mensagem.textContent = 'Cadastro realizado com sucesso! Redirecionando...';

        formCadastro.reset();

        setTimeout(() => {
            window.location.href = '../login/login.html';
        }, 1500);

    } catch (erro) {
        console.error('Erro ao cadastrar:', erro);
        mensagem.textContent = 'Não foi possível conectar ao servidor.';
    }
});
