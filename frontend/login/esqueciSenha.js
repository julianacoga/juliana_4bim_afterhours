const API_BASE_URL = `http://${window.location.hostname}:3001`;

const form = document.getElementById('formRecuperacao');
const mensagem = document.getElementById('mensagem');
const botao = document.getElementById('botaoEnviar');

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();

    botao.disabled = true;
    botao.textContent = 'ENVIANDO...';

    mensagem.textContent = '';
    mensagem.className = '';

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/esqueciSenha`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email })
            }
        );

        const dados = await resposta.json();

        mensagem.textContent = dados.mensagem;

        if (resposta.ok && dados.sucesso) {
            mensagem.className = 'sucesso';
            form.reset();
        } else {
            mensagem.className = 'erro';
        }

    } catch (erro) {
        console.error('Erro na recuperação:', erro);

        mensagem.textContent = 'Não foi possível conectar ao servidor.';
        mensagem.className = 'erro';

    } finally {
        botao.disabled = false;
        botao.textContent = 'ENVIAR LINK ↗';
    }
});