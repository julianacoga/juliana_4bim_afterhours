
const URL_API = 'http://localhost:3001';

let oQueEstaFazendo = '';
let categoria = null;

bloquearAtributos(true);

async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/categoria/${chave}`);
        const data = await resposta.json();

        return data.sucesso ? data.categoria : null;

    } catch (erro) {
        console.error('Erro ao procurar categoria:', erro);
        return null;
    }
}

async function procure() {
    const id_categoria = parseInt(
        document.getElementById("inputId_categoria").value
    );

    if (isNaN(id_categoria)) {
        mostrarAviso("Informe um ID válido.");
        return;
    }

    document.getElementById("inputId_categoria").value = id_categoria;

    categoria = await procurePorChavePrimaria(id_categoria);

    oQueEstaFazendo = '';

    if (categoria) {
        mostrarDadosCategoria(categoria);

        visibilidadeDosBotoes(
            'inline',
            'none',
            'inline',
            'inline',
            'none'
        );

        mostrarAviso("Categoria encontrada! Você pode alterar ou excluir.");

    } else {
        limparAtributos();

        document.getElementById("inputId_categoria").value = id_categoria;

        visibilidadeDosBotoes(
            'inline',
            'inline',
            'none',
            'none',
            'none'
        );

        mostrarAviso("Categoria não encontrada. Você pode inserir uma nova.");
    }
}

function inserir() {
    limparAtributos();

    bloquearAtributos(false);

    // O ID será gerado automaticamente pelo banco
    document.getElementById("inputId_categoria").value = "";

    visibilidadeDosBotoes(
        'none',
        'none',
        'none',
        'none',
        'inline'
    );

    oQueEstaFazendo = 'inserindo';

    mostrarAviso(
        "INSERINDO - Digite o nome da categoria e clique em Salvar."
    );
}

function alterar() {
    bloquearAtributos(false);

    // O ID não pode ser alterado
    document.getElementById("inputId_categoria").readOnly = true;

    visibilidadeDosBotoes(
        'none',
        'none',
        'none',
        'none',
        'inline'
    );

    oQueEstaFazendo = 'alterando';

    mostrarAviso(
        "ALTERANDO - Digite o novo nome da categoria e clique em Salvar."
    );
}

function excluir() {
    bloquearAtributos(true);

    visibilidadeDosBotoes(
        'none',
        'none',
        'none',
        'none',
        'inline'
    );

    oQueEstaFazendo = 'excluindo';

    mostrarAviso(
        "EXCLUINDO - Clique em Salvar para confirmar a exclusão."
    );
}

async function salvar() {
    const id_categoria = parseInt(
        document.getElementById("inputId_categoria").value
    );

    const nome_categoria = document
        .getElementById("inputNome_categoria")
        .value.trim();

    if (oQueEstaFazendo !== 'excluindo' && nome_categoria === '') {
        mostrarAviso("Informe o nome da categoria.");
        return;
    }

    // Na inserção, não enviamos ID: o banco gera automaticamente
    const dadoscategoria = {
        nome_categoria
    };

    try {
        if (oQueEstaFazendo === 'inserindo') {

            const resp = await fetch(`${URL_API}/categoria`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadoscategoria)
            });

            const data = await resp.json();

            if (!resp.ok || !data.sucesso) {
                mostrarAviso(data.mensagem || "Erro ao inserir categoria.");
                return;
            }

            mostrarAviso(
                `Categoria cadastrada com sucesso! ID: ${data.categoria.id_categoria}`
            );

        } else if (oQueEstaFazendo === 'alterando') {

            const resp = await fetch(`${URL_API}/categoria/${id_categoria}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadoscategoria)
            });

            const data = await resp.json();

            if (!resp.ok || !data.sucesso) {
                mostrarAviso(data.mensagem || "Erro ao alterar categoria.");
                return;
            }

            mostrarAviso("Categoria alterada com sucesso!");

        } else if (oQueEstaFazendo === 'excluindo') {

            const resposta = await fetch(
                `${URL_API}/categoria/${id_categoria}`,
                {
                    method: 'DELETE'
                }
            );

            const data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                mostrarAviso(
                    data.mensagem || "Erro ao excluir categoria."
                );
                return;
            }

            mostrarAviso("Categoria excluída com sucesso!");
        }

        limparAtributos();

        document.getElementById("inputId_categoria").value = "";

        bloquearAtributos(true);

        visibilidadeDosBotoes(
            'inline',
            'inline',
            'none',
            'none',
            'none'
        );

        listar();

        oQueEstaFazendo = '';

    } catch (erro) {
        console.error("Erro ao efetuar operação:", erro);

        mostrarAviso(
            "Erro ao efetuar operação no servidor."
        );
    }
}

async function listar() {
    try {
        const resposta = await fetch(
            `${URL_API}/categoria/listar`
        );

        const data = await resposta.json();

        if (data.sucesso) {
            let texto = "";

            for (let linha of data.categorias) {
                texto += `
                    <b>[${linha.id_categoria}]</b> -
                    ${linha.nome_categoria}<br><br>
                `;
            }

            document.getElementById("outputSaida").innerHTML =
                texto || "Nenhuma categoria cadastrada.";

        } else {
            document.getElementById("outputSaida").innerHTML =
                `Erro no banco: ${data.mensagem}`;
        }

    } catch (erro) {
        console.error("Erro ao listar:", erro);

        document.getElementById("outputSaida").innerHTML =
            "Servidor offline ou erro de conexão (CORS).";
    }
}

function cancelarOperacao() {
    limparAtributos();

    bloquearAtributos(true);

    visibilidadeDosBotoes(
        'inline',
        'inline',
        'none',
        'none',
        'none'
    );

    mostrarAviso("Operação cancelada.");
}

function mostrarAviso(mensagem) {
    document.getElementById("divAviso").innerHTML = mensagem;
}

function mostrarDadosCategoria(c) {
    document.getElementById("inputId_categoria").value =
        c.id_categoria;

    document.getElementById("inputNome_categoria").value =
        c.nome_categoria;

    bloquearAtributos(true);
}

function limparAtributos() {
    categoria = null;
    oQueEstaFazendo = '';

    document.getElementById("inputNome_categoria").value = "";

    bloquearAtributos(true);
}

function bloquearAtributos(soLeitura) {
    document.getElementById("inputId_categoria").readOnly =
        !soLeitura;

    document.getElementById("inputNome_categoria").readOnly =
        soLeitura;
}

function visibilidadeDosBotoes(
    btP,
    btI,
    btA,
    btE,
    btS
) {
    document.getElementById("btProcure").style.display = btP;
    document.getElementById("btInserir").style.display = btI;
    document.getElementById("btAlterar").style.display = btA;
    document.getElementById("btExcluir").style.display = btE;
    document.getElementById("btSalvar").style.display = btS;
    document.getElementById("btCancelar").style.display = btS;
}
