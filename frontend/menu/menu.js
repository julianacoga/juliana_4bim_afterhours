
const API_BASE_URL = `http://${window.location.hostname}:3001`;

// VERIFICAR PERMISSÕES DO USUÁRIO
async function verificarPerfil() {
    try {
        const resposta = await fetch(
            `${API_BASE_URL}/login/verificaSeUsuarioEstaLogado`,
            {
                credentials: 'include'
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || dados.status !== 'ok') {
            window.location.replace(`${API_BASE_URL}/login`);
            return;
        }

        const usuario = dados.usuario;

        // IMPEDIR ACESSO DE CLIENTES COMUNS
        if (usuario.ehFuncionario !== true) {
            window.location.replace(
                `${API_BASE_URL}/login/visaocliente`
            );
            return;
        }

        // MOSTRAR BOTÃO SE TAMBÉM FOR CLIENTE
        const botao = document.getElementById('btnTrocarPerfil');

        if (botao) {
            botao.hidden = !(
                usuario.ehCliente === true &&
                usuario.ehFuncionario === true
            );
        }

    } catch (erro) {
        console.error('Erro ao verificar perfil:', erro);
    }
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', verificarPerfil);
