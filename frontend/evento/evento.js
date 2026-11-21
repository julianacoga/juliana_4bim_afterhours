
const URL_API = 'http://localhost:3001';

const SILHUETA_URL = `${URL_API}/imagens/silhueta.png`;

let oQueEstaFazendo = '';

let evento = null;

bloquearAtributos(true);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function inicializar() {
    await carregarCategoria();
    await listar();
}

// ==========================================
// CARREGAR CATEGORIAS
// ==========================================

async function carregarCategoria() {
    const select = document.getElementById("selectId_categoria");

    try {
        const resposta = await fetch(`${URL_API}/categoria/listar`);
        const data = await resposta.json();

        if (data.sucesso) {
            select.innerHTML = '<option value="">-- Selecione uma categoria --</option>';

            data.categorias.forEach(c => {
                select.innerHTML += `
                    <option value="${c.id_categoria}">
                        ${c.id_categoria} - ${c.nome_categoria}
                    </option>
                `;
            });

            select.disabled = true;
        } else {
            select.innerHTML = '<option value="">Erro ao carregar categorias</option>';
        }

    } catch (erro) {
        console.error("Erro ao carregar categorias:", erro);
        select.innerHTML = '<option value="">Erro ao carregar categorias</option>';
    }
}

// ==========================================
// CARREGAR IMAGEM
// ==========================================

function carregarImagem(id) {
    const img = document.getElementById('imgevento');

    if (!id) {
        img.src = SILHUETA_URL;
        return;
    }

    img.src = `${URL_API}/imagens/${id}.png`;

    img.onerror = () => {
        img.src = SILHUETA_URL;
    };
}

// ==========================================
// UPLOAD E PRÉ-VISUALIZAÇÃO
// ==========================================

function acionarUpload() {
    if (oQueEstaFazendo !== 'inserindo' &&
        oQueEstaFazendo !== 'alterando') {

        mostrarAviso("Clique em Inserir ou Alterar primeiro para escolher uma imagem.");
        return;
    }

    document.getElementById('inputImagem').click();
}

function previewImagem() {
    const inputFiles = document.getElementById('inputImagem').files;

    if (inputFiles.length > 0) {
        const url = URL.createObjectURL(inputFiles[0]);

        document.getElementById('imgevento').src = url;

        mostrarAviso("Imagem escolhida! Clique em Salvar para concluir.");
    }
}

async function uploadImagemParaServidor(id) {
    const inputFiles = document.getElementById('inputImagem').files;

    if (inputFiles.length === 0) return;

    const formData = new FormData();

    formData.append('imagem', inputFiles[0]);

    const resposta = await fetch(`${URL_API}/evento/upload/${id}`, {
        method: 'POST',
        body: formData
    });

    const data = await resposta.json();

    if (!resposta.ok || !data.sucesso) {
        throw new Error(data.mensagem || "Erro ao enviar imagem.");
    }
}

// ==========================================
// PROCURAR EVENTO
// ==========================================

async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/evento/${chave}`);
        const data = await resposta.json();

        return data.sucesso ? data.evento : null;

    } catch (erro) {
        console.error("Erro ao procurar evento:", erro);
        return null;
    }
}

async function procure() {
    const id_evento = document.getElementById("inputId_evento").value;

    if (id_evento === "" ||
        isNaN(id_evento) ||
        !Number.isInteger(Number(id_evento)) ||
        Number(id_evento) <= 0) {

        mostrarAviso("Informe um ID válido.");
        return;
    }

    evento = await procurePorChavePrimaria(id_evento);

    oQueEstaFazendo = '';

    if (evento) {
        mostrarDadosEvento(evento);

        carregarImagem(evento.imagem_evento);

        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');

        mostrarAviso("Evento encontrado! Você pode alterar ou excluir.");

    } else {
        limparAtributos();

        carregarImagem(null);

        visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');

        mostrarAviso("Evento não encontrado. Você pode inserir.");
    }
}

// ==========================================
// OPERAÇÕES
// ==========================================

function inserir() {
    bloquearAtributos(false);

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'inserindo';

    mostrarAviso("INSERINDO - Preencha os dados, escolha a imagem e clique em salvar.");
}

function alterar() {
    bloquearAtributos(false);

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'alterando';

    mostrarAviso("ALTERANDO - Modifique os dados e clique em salvar.");
}

function excluir() {
    bloquearAtributos(true);

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'excluindo';

    mostrarAviso("EXCLUINDO - Clique em salvar para confirmar a exclusão.");
}

// ==========================================
// SALVAR
// ==========================================

async function salvar() {

    const id_evento = document.getElementById("inputId_evento").value;

    const titulo_evento = document.getElementById("inputTitulo_evento").value;
    const descricao_evento = document.getElementById("inputDescricao_evento").value;
    const local_evento = document.getElementById("inputLocal_evento").value;
    const endereco_evento = document.getElementById("inputEndereco_evento").value;
    const data_evento = document.getElementById("inputData_evento").value;
    const horario_evento = document.getElementById("inputHorario_evento").value;
    const status_evento = document.getElementById("selectStatus_evento").value;
    const categoria_id_categoria = document.getElementById("selectId_categoria").value;
    const funcionario_pessoa_cpf_pessoa = document.getElementById("inputFuncionario_evento").value;

    const dadosEvento = {
        titulo_evento,
        descricao_evento,
        local_evento,
        endereco_evento,
        data_evento,
        horario_evento,
        status_evento,
        categoria_id_categoria,
        funcionario_pessoa_cpf_pessoa
    };

    if (oQueEstaFazendo !== 'excluindo') {

        if (!titulo_evento || !local_evento || !data_evento ||
            !horario_evento || !categoria_id_categoria ||
            !funcionario_pessoa_cpf_pessoa) {

            mostrarAviso("Preencha os campos obrigatórios.");
            return;
        }
    }

    try {

        if (oQueEstaFazendo === 'inserindo') {

            const resposta = await fetch(`${URL_API}/evento`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosEvento)
            });

            const data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                throw new Error(data.mensagem || "Erro ao inserir evento.");
            }

            const idCriado = data.evento.id_evento;

            await uploadImagemParaServidor(idCriado);

            mostrarAviso("Evento inserido com sucesso!");

        } else if (oQueEstaFazendo === 'alterando') {

            const resposta = await fetch(`${URL_API}/evento/${id_evento}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosEvento)
            });

            const data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                throw new Error(data.mensagem || "Erro ao alterar evento.");
            }

            await uploadImagemParaServidor(id_evento);

            mostrarAviso("Evento alterado com sucesso!");

        } else if (oQueEstaFazendo === 'excluindo') {

            const resposta = await fetch(`${URL_API}/evento/${id_evento}`, {
                method: 'DELETE'
            });

            const data = await resposta.json();
            
            if (!resposta.ok || !data.sucesso) {
                throw new Error(data.mensagem || "Erro ao excluir evento.");
            }
            carregarImagem(null);
            mostrarAviso("Evento excluído com sucesso!");
        }

        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
        limparAtributos();
        document.getElementById("inputId_evento").value = "";
        await listar();
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        mostrarAviso(erro.message || "Erro ao efetuar operação no servidor.");
    }
}

// ==========================================
// LISTAR EVENTOS
// ==========================================

async function listar() {
    try {
        const resposta = await fetch(`${URL_API}/evento/listar`);
        const data = await resposta.json();

        if (!data.sucesso) {
            throw new Error("Erro ao listar eventos.");
        }

        let texto = "";

        for (let linha of data.eventos) {

            texto += `
                ${linha.id_evento} -
                ${linha.titulo_evento} -
                ${linha.nome_categoria || 'Sem categoria'} -
                ${linha.local_evento} -
                ${linha.data_evento} -
                ${linha.status_evento}
                <br>
            `;
        }

        document.getElementById("outputSaida").innerHTML =
            texto || "Nenhum evento cadastrado.";

    } catch (erro) {
        console.error("Erro ao listar eventos:", erro);

        document.getElementById("outputSaida").innerHTML =
            "Servidor offline ou erro ao carregar eventos.";
    }
}

// ==========================================
// CANCELAR OPERAÇÃO
// ==========================================

function cancelarOperacao() {
    limparAtributos();
    carregarImagem(null);
    bloquearAtributos(true);
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    document.getElementById("inputId_evento").value = "";
    mostrarAviso("Operação cancelada.");
}

// ==========================================
// EXIBIR DADOS
// ==========================================

function mostrarAviso(mensagem) {
    document.getElementById("divAviso").innerHTML = mensagem;
}

function mostrarDadosEvento(e) {
    document.getElementById("inputId_evento").value = e.id_evento;
    document.getElementById("inputTitulo_evento").value = e.titulo_evento || "";
    document.getElementById("inputDescricao_evento").value = e.descricao_evento || "";
    document.getElementById("inputLocal_evento").value = e.local_evento || "";
    document.getElementById("inputEndereco_evento").value = e.endereco_evento || "";
    document.getElementById("inputData_evento").value = e.data_evento ? String(e.data_evento).substring(0, 10) : "";
    document.getElementById("inputHorario_evento").value = e.horario_evento ? String(e.horario_evento).substring(0, 5) : "";
    document.getElementById("selectStatus_evento").value = e.status_evento || "Ativo";
    document.getElementById("selectId_categoria").value = e.categoria_id_categoria || "";
    document.getElementById("inputFuncionario_evento").value = e.funcionario_pessoa_cpf_pessoa || "";
    bloquearAtributos(true);
}

// ==========================================
// LIMPAR CAMPOS
// ==========================================

function limparAtributos() {
    evento = null;
    oQueEstaFazendo = '';
    
    document.getElementById("inputTitulo_evento").value = "";
    document.getElementById("inputDescricao_evento").value = "";
    document.getElementById("inputLocal_evento").value = "";
    document.getElementById("inputEndereco_evento").value = "";
    document.getElementById("inputData_evento").value = "";
    document.getElementById("inputHorario_evento").value = "";
    document.getElementById("selectStatus_evento").value = "Ativo";
    document.getElementById("selectId_categoria").value = "";
    document.getElementById("inputFuncionario_evento").value = "";
    document.getElementById("inputImagem").value = "";
    bloquearAtributos(true);
}

// ==========================================
// BLOQUEAR CAMPOS
// ==========================================

function bloquearAtributos(soLeitura) {
    document.getElementById("inputId_evento").readOnly = !soLeitura;
    document.getElementById("inputTitulo_evento").readOnly = soLeitura;
    document.getElementById("inputDescricao_evento").readOnly = soLeitura;
    document.getElementById("inputLocal_evento").readOnly = soLeitura;
    document.getElementById("inputEndereco_evento").readOnly = soLeitura;
    document.getElementById("inputData_evento").readOnly = soLeitura;
    document.getElementById("inputHorario_evento").readOnly = soLeitura;
    document.getElementById("selectStatus_evento").disabled = soLeitura;
    document.getElementById("selectId_categoria").disabled = soLeitura;
    document.getElementById("inputFuncionario_evento").readOnly = soLeitura;
}

// ==========================================
// VISIBILIDADE DOS BOTÕES
// ==========================================

function visibilidadeDosBotoes(btP, btI, btA, btE, btS) {
    document.getElementById("btProcure").style.display = btP;
    document.getElementById("btInserir").style.display = btI;
    document.getElementById("btAlterar").style.display = btA;
    document.getElementById("btExcluir").style.display = btE;
    document.getElementById("btSalvar").style.display = btS;
    document.getElementById("btCancelar").style.display = btS;
}
