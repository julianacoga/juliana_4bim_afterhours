
const API_BASE_URL = `http://${window.location.hostname}:3001`;

async function verificarSenha(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    if (!email || !senha) {
        alert('Preencha seu e-mail e sua senha.');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/login/verificarSenha`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, senha })
            }
        );

        const data = await response.json();

        console.log('Resultado do login:', data);

        if (!response.ok || data.status !== 'ok') {
            alert(data.mensagem || 'E-mail ou senha incorretos.');
            return;
        }

        // VERIFICAR SE O LOGIN VEIO DE UMA COMPRA
        const parametros = new URLSearchParams(
            window.location.search
        );

        const veioDaCompra =
            parametros.get('compra') === '1';

        // ESCOLHER TIPO DE ACESSO
        if (data.destino === '/login/escolher-acesso') {
            window.location.href =
                `${API_BASE_URL}/login/escolher-acesso`;

            return;
        }

        // FUNCIONÁRIO / ADMINISTRADOR
        if (data.destino === '/menu') {
            window.location.href =
                `${API_BASE_URL}/menu`;

            return;
        }

        // CLIENTE
        if (data.destino === '/login/visaocliente') {

            if (veioDaCompra) {
                window.location.href =
                    `${API_BASE_URL}/login/visaoclientefinalizar`;

                return;
            }

            window.location.href =
                `${API_BASE_URL}/login/visaocliente`;

            return;
        }

        alert('Destino de login não reconhecido.');

    } catch (erro) {
        console.error('Erro ao realizar login:', erro);

        alert('Não foi possível conectar ao servidor.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formLogin');

    formulario.addEventListener('submit', verificarSenha);
});
