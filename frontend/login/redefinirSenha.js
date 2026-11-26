const API_BASE_URL = `http://${window.location.hostname}:3001`;
const parametros = new URLSearchParams(window.location.search);
const token = parametros.get('token');

const form = document.getElementById('formRedefinir');
const mensagem = document.getElementById('mensagem');
const botao = document.getElementById('botaoSalvar');

if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    mensagem.textContent = 'Link de recuperação inválido.';
    mensagem.className = 'erro';
    botao.disabled = true;
} else {
    window.history.replaceState({}, '', window.location.pathname);
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    mensagem.className = 'erro';

    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        mensagem.textContent = 'Link de recuperação inválido.';
        return;
    }

    if (novaSenha.length < 8) {
        mensagem.textContent = 'A senha deve ter pelo menos 8 caracteres.';
        return;
    }

    if (new TextEncoder().encode(novaSenha).length > 72) {
        mensagem.textContent = 'A senha é muito longa.';
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mensagem.textContent = 'As senhas não coincidem.';
        return;
    }

    botao.disabled = true;
    botao.textContent = 'SALVANDO...';

    let redefinida = false;

    try {
        const resposta = await fetch(`${API_BASE_URL}/login/redefinirSenha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token,
                novaSenha
            })
        });

        const dados = await resposta.json();

        mensagem.textContent = dados.mensagem;

        if (resposta.ok && dados.sucesso) {
            redefinida = true;
            mensagem.className = 'sucesso';

            form.reset();
            form.style.display = 'none';

            setTimeout(() => {
                window.location.href = '/login';
            }, 2500);

        } else {
            mensagem.className = 'erro';
        }

    } catch (erro) {
        console.error(erro);

        mensagem.textContent = 'Erro ao conectar com o servidor.';
        mensagem.className = 'erro';

    } finally {
        if (!redefinida) {
            botao.disabled = false;
            botao.textContent = 'REDEFINIR SENHA ↗';
        }
    }
});
