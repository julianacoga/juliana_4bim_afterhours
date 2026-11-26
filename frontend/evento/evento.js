
const URL_API = `http://${window.location.hostname}:3001`;

const SILHUETA_URL = `${URL_API}/imagens/silhueta.png`;

let oQueEstaFazendo = '';
let evento = null;
let eventosCadastrados = [];
let carregamentoConcluido = false;
let salvando = false;
let imagemPreview = null;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function inicializar() {
    bloquearAtributos(true);

    document.getElementById('imgevento').src =
        SILHUETA_URL;

    await carregarCategoria();
    await listar();
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function normalizarTexto(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[c]);
}

function formatarDataEvento(data) {
    if (!data) return '—';

    return String(data)
        .substring(0, 10)
        .split('-')
        .reverse()
        .join('/');
}

// ==========================================
// NAVEGAÇÃO ENTRE ABAS
// ==========================================

function trocarAba(aba) {
    const cadastro = aba === 'cadastro';

    document.getElementById('painelCadastro').hidden =
        !cadastro;

    document.getElementById('painelConsulta').hidden =
        cadastro;

    document.getElementById('abaCadastro')
        .classList.toggle('ativa', cadastro);

    document.getElementById('abaConsulta')
        .classList.toggle('ativa', !cadastro);

    document.getElementById('tituloPagina').textContent =
        cadastro
            ? 'Gerenciar eventos.'
            : 'Eventos cadastrados.';

    document.getElementById('descricaoPagina').textContent =
        cadastro
            ? 'Cadastre, edite e gerencie as experiências do After Hours.'
            : 'Pesquise, consulte e edite os eventos cadastrados.';

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ==========================================
// NOVO EVENTO
// ==========================================

function novoEvento() {
    if (salvando) return;

    if (oQueEstaFazendo &&
        !confirm('Descartar a operação atual?')) {
        return;
    }

    cancelarOperacao();
    trocarAba('cadastro');
    inserir();
}

// ==========================================
// CARREGAR CATEGORIAS
// ==========================================

async function carregarCategoria() {
    const select =
        document.getElementById('selectId_categoria');

    try {
        const resposta = await fetch(
            `${URL_API}/categoria/listar`,
            { credentials: 'include' }
        );

        const data = await resposta.json();

        if (!resposta.ok || !data.sucesso) {
            throw new Error('Erro ao carregar categorias.');
        }

        select.innerHTML =
            '<option value="">-- Selecione uma categoria --</option>';

        data.categorias.forEach(categoria => {
            const option = document.createElement('option');

            option.value = categoria.id_categoria;

            option.textContent =
                `${categoria.id_categoria} - ${categoria.nome_categoria}`;

            select.appendChild(option);
        });

        select.disabled = true;

    } catch (erro) {
        console.error('Erro ao carregar categorias:', erro);

        select.innerHTML =
            '<option value="">Erro ao carregar categorias</option>';
    }
}

// ==========================================
// CARREGAR IMAGEM
// ==========================================

function carregarImagem(id) {
    const img = document.getElementById('imgevento');

    if (imagemPreview) {
        URL.revokeObjectURL(imagemPreview);
        imagemPreview = null;
    }

    img.onerror = () => {
        img.onerror = null;
        img.src = SILHUETA_URL;
    };

    if (!id) {
        img.src = SILHUETA_URL;
        return;
    }

    const arquivo = String(id).endsWith('.png')
        ? String(id)
        : `${id}.png`;

    img.src =
        `${URL_API}/imagens/${encodeURIComponent(arquivo)}`;
}

// ==========================================
// UPLOAD E PRÉ-VISUALIZAÇÃO
// ==========================================

function acionarUpload() {
    if (salvando) return;

    if (oQueEstaFazendo !== 'inserindo' &&
        oQueEstaFazendo !== 'alterando') {

        mostrarAviso(
            'Clique em Inserir ou Alterar primeiro para escolher uma imagem.'
        );

        return;
    }

    document.getElementById('inputImagem').click();
}

function previewImagem() {
    const inputFiles =
        document.getElementById('inputImagem').files;

    if (inputFiles.length > 0) {
        if (imagemPreview) {
            URL.revokeObjectURL(imagemPreview);
        }

        imagemPreview =
            URL.createObjectURL(inputFiles[0]);

        document.getElementById('imgevento').src =
            imagemPreview;

        mostrarAviso(
            'Imagem escolhida! Clique em Salvar para concluir.'
        );
    }
}

async function uploadImagemParaServidor(id) {
    const inputFiles =
        document.getElementById('inputImagem').files;

    if (inputFiles.length === 0) return;

    const formData = new FormData();

    formData.append('imagem', inputFiles[0]);

    const resposta = await fetch(
        `${URL_API}/evento/upload/${id}`,
        {
            method: 'POST',
            credentials: 'include',
            body: formData
        }
    );

    const data = await resposta.json();

    if (!resposta.ok || !data.sucesso) {
        throw new Error(
            data.mensagem || 'Erro ao enviar imagem.'
        );
    }
}

// ==========================================
// PROCURAR EVENTO
// ==========================================

async function procurePorChavePrimaria(chave) {
    const resposta = await fetch(
        `${URL_API}/evento/${chave}`,
        { credentials: 'include' }
    );

    if (resposta.status === 404) {
        return null;
    }

    const data = await resposta.json();

    if (!resposta.ok) {
        throw new Error(
            data.mensagem || 'Erro ao procurar evento.'
        );
    }

    return data.sucesso ? data.evento : null;
}

async function procure() {
    if (salvando) return;

    const idEvento =
        document.getElementById('inputId_evento').value.trim();

    if (
        idEvento === '' ||
        isNaN(idEvento) ||
        !Number.isInteger(Number(idEvento)) ||
        Number(idEvento) <= 0
    ) {
        mostrarAviso('Informe um ID válido.');
        return;
    }

    try {
        evento = await procurePorChavePrimaria(idEvento);

        oQueEstaFazendo = '';

        document.getElementById('inputImagem').value = '';

        if (evento) {
            mostrarDadosEvento(evento);

            carregarImagem(evento.imagem_evento);

            visibilidadeDosBotoes(
                'inline',
                'none',
                'inline',
                'inline',
                'none'
            );

            mostrarAviso(
                'Evento encontrado! Você pode alterar ou excluir.'
            );

        } else {
            limparAtributos();

            carregarImagem(null);

            visibilidadeDosBotoes(
                'inline',
                'inline',
                'none',
                'none',
                'none'
            );

            mostrarAviso(
                'Evento não encontrado. Você pode inserir.'
            );
        }

    } catch (erro) {
        evento = null;

        limparAtributos();
        carregarImagem(null);

        visibilidadeDosBotoes(
            'inline',
            'none',
            'none',
            'none',
            'none'
        );

        mostrarAviso(
            erro.message || 'Erro ao procurar evento.'
        );
    }
}

// ==========================================
// INSERIR
// ==========================================

function inserir() {
    if (salvando) return;

    limparAtributos();
    carregarImagem(null);

    bloquearAtributos(false);

    visibilidadeDosBotoes(
        'none',
        'none',
        'none',
        'none',
        'inline'
    );

    oQueEstaFazendo = 'inserindo';

    mostrarAviso(
        'INSERINDO - Preencha os dados, escolha a imagem e clique em Salvar.'
    );

    document.getElementById('inputTitulo_evento').focus();
}

// ==========================================
// ALTERAR
// ==========================================

function alterar() {
    if (!evento || salvando) return;

    bloquearAtributos(false);

    visibilidadeDosBotoes(
        'none',
        'none',
        'none',
        'none',
        'inline'
    );

    oQueEstaFazendo = 'alterando';

    mostrarAviso(
        'ALTERANDO - Modifique os dados e clique em Salvar.'
    );
}

// ==========================================
// EXCLUIR
// ==========================================

function excluir() {
    if (!evento || salvando) return;

    bloquearAtributos(true);

    document.getElementById('inputId_evento').readOnly = true;

    visibilidadeDosBotoes(
        'none',
        'none',
        'none',
        'none',
        'inline'
    );

    oQueEstaFazendo = 'excluindo';

    mostrarAviso(
        'EXCLUINDO - Clique em Salvar para confirmar a exclusão.'
    );
}

// ==========================================
// SALVAR
// ==========================================

async function salvar() {
    if (salvando || !oQueEstaFazendo) return;

    const idEvento =
        document.getElementById('inputId_evento').value;

    const titulo_evento =
        document.getElementById('inputTitulo_evento').value.trim();

    const descricao_evento =
        document.getElementById('inputDescricao_evento').value.trim();

    const local_evento =
        document.getElementById('inputLocal_evento').value.trim();

    const endereco_evento =
        document.getElementById('inputEndereco_evento').value.trim();

    const data_evento =
        document.getElementById('inputData_evento').value;

    const horario_evento =
        document.getElementById('inputHorario_evento').value;

    const status_evento =
        document.getElementById('selectStatus_evento').value;

    const categoria_id_categoria =
        document.getElementById('selectId_categoria').value;

    const funcionario_pessoa_cpf_pessoa =
        document.getElementById('inputFuncionario_evento').value.trim();

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
        if (
            !titulo_evento ||
            !local_evento ||
            !data_evento ||
            !horario_evento ||
            !categoria_id_categoria ||
            !funcionario_pessoa_cpf_pessoa
        ) {
            mostrarAviso('Preencha os campos obrigatórios.');
            return;
        }
    }

    const operacao = oQueEstaFazendo;

    const btSalvar = document.getElementById('btSalvar');
    const btCancelar = document.getElementById('btCancelar');

    salvando = true;
    btSalvar.disabled = true;
    btCancelar.disabled = true;

    let mensagem = '';

    try {
        if (operacao === 'inserindo') {

            const resposta = await fetch(
                `${URL_API}/evento`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dadosEvento)
                }
            );

            const data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                throw new Error(
                    data.mensagem || 'Erro ao inserir evento.'
                );
            }

            const idCriado = data.evento.id_evento;

            mensagem = 'Evento inserido com sucesso!';

            try {
                await uploadImagemParaServidor(idCriado);

            } catch (erroImagem) {
                console.error(erroImagem);

                mensagem =
                    `Evento #${idCriado} inserido, mas houve erro no envio da imagem.`;
            }

        } else if (operacao === 'alterando') {

            const resposta = await fetch(
                `${URL_API}/evento/${idEvento}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dadosEvento)
                }
            );

            const data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                throw new Error(
                    data.mensagem || 'Erro ao alterar evento.'
                );
            }

            mensagem = 'Evento alterado com sucesso!';

            try {
                await uploadImagemParaServidor(idEvento);

            } catch (erroImagem) {
                console.error(erroImagem);

                mensagem =
                    'Evento alterado, mas houve erro no envio da imagem.';
            }

        } else if (operacao === 'excluindo') {

            const resposta = await fetch(
                `${URL_API}/evento/${idEvento}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

            const data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                throw new Error(
                    data.mensagem || 'Erro ao excluir evento.'
                );
            }

            mensagem = 'Evento excluído com sucesso!';
        }

        limparAtributos();
        carregarImagem(null);

        document.getElementById('inputId_evento').value = '';

        visibilidadeDosBotoes(
            'inline',
            'none',
            'none',
            'none',
            'none'
        );

        mostrarAviso(mensagem);

        await listar();

    } catch (erro) {
        console.error('Erro ao salvar:', erro);

        mostrarAviso(
            erro.message || 'Erro ao efetuar operação no servidor.'
        );

    } finally {
        salvando = false;
        btSalvar.disabled = false;
        btCancelar.disabled = false;
    }
}

// ==========================================
// LISTAR EVENTOS
// ==========================================

async function listar() {
    carregamentoConcluido = false;

    try {
        const resposta = await fetch(
            `${URL_API}/evento/listar`,
            { credentials: 'include' }
        );

        const data = await resposta.json();

        if (!resposta.ok || !data.sucesso) {
            throw new Error('Erro ao listar eventos.');
        }

        eventosCadastrados = data.eventos || [];

        carregamentoConcluido = true;

        carregarFiltroCategoria();
        filtrarEventos();

    } catch (erro) {
        console.error('Erro ao listar eventos:', erro);

        eventosCadastrados = [];

        document.getElementById('contadorResultados')
            .textContent = '';

        document.getElementById('outputSaida').innerHTML = `
            <div class="semResultados">
                <h3>Não foi possível carregar os eventos.</h3>
                <p>Verifique a conexão com o servidor.</p>
            </div>
        `;
    }
}

// ==========================================
// FILTRO DE CATEGORIAS
// ==========================================

function carregarFiltroCategoria() {
    const select =
        document.getElementById('filtroCategoria');

    const anterior = select.value;

    const categorias = [...new Set(
        eventosCadastrados.map(evento =>
            evento.nome_categoria || 'Sem categoria'
        )
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    select.innerHTML =
        '<option value="">Todas as categorias</option>';

    categorias.forEach(categoria => {
        const option = document.createElement('option');

        option.value = categoria;
        option.textContent = categoria;

        select.appendChild(option);
    });

    if (categorias.includes(anterior)) {
        select.value = anterior;
    }
}

// ==========================================
// PESQUISAR E FILTRAR EVENTOS
// ==========================================

function filtrarEventos() {
    if (!carregamentoConcluido) return;

    const pesquisa = normalizarTexto(
        document.getElementById('pesquisaEventos').value
    );

    const categoria =
        document.getElementById('filtroCategoria').value;

    const status =
        document.getElementById('filtroStatus').value;

    const filtrados = eventosCadastrados.filter(evento => {

        const texto = normalizarTexto([
            evento.id_evento,
            evento.titulo_evento,
            evento.descricao_evento,
            evento.nome_categoria || 'Sem categoria',
            evento.local_evento,
            evento.endereco_evento,
            evento.status_evento,
            evento.data_evento,
            formatarDataEvento(evento.data_evento),
            evento.horario_evento
        ].join(' '));

        const correspondePesquisa = pesquisa
            .split(/\s+/)
            .every(termo => texto.includes(termo));

        const correspondeCategoria =
            !categoria ||
            (evento.nome_categoria || 'Sem categoria') === categoria;

        const correspondeStatus =
            !status ||
            evento.status_evento === status;

        return correspondePesquisa &&
            correspondeCategoria &&
            correspondeStatus;
    });

    renderizarTabela(filtrados);
}

// ==========================================
// LIMPAR FILTROS
// ==========================================

function limparFiltros() {
    document.getElementById('pesquisaEventos').value = '';
    document.getElementById('filtroCategoria').value = '';
    document.getElementById('filtroStatus').value = '';

    filtrarEventos();

    document.getElementById('pesquisaEventos').focus();
}

// ==========================================
// RENDERIZAR TABELA
// ==========================================

function renderizarTabela(eventos) {
    const saida = document.getElementById('outputSaida');

    document.getElementById('contadorResultados')
        .textContent =
        `${eventos.length} de ${eventosCadastrados.length} eventos`;

    if (!eventos.length) {
        saida.innerHTML = `
            <div class="semResultados">
                <h3>Nenhum evento encontrado.</h3>
                <p>Tente pesquisar outro nome ou alterar os filtros.</p>
            </div>
        `;

        return;
    }

    saida.innerHTML = `
        <table class="tabelaEventos">

            <thead>
                <tr>
                    <th>ID</th>
                    <th>Evento</th>
                    <th>Categoria</th>
                    <th>Local</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>

            <tbody>

                ${eventos.map(evento => {

                    const classeStatus =
                        evento.status_evento === 'Ativo'
                            ? 'ativo'
                            : evento.status_evento === 'Cancelado'
                                ? 'cancelado'
                                : 'inativo';

                    return `
                        <tr>

                            <td class="idTabela">
                                #${Number(evento.id_evento)}
                            </td>

                            <td class="nomeTabela">
                                ${escaparHTML(evento.titulo_evento)}
                            </td>

                            <td>
                                ${escaparHTML(
                                    evento.nome_categoria || 'Sem categoria'
                                )}
                            </td>

                            <td>
                                ${escaparHTML(evento.local_evento)}
                            </td>

                            <td>
                                ${escaparHTML(
                                    formatarDataEvento(evento.data_evento)
                                )}
                            </td>

                            <td>
                                <span class="statusTabela ${classeStatus}">
                                    ${escaparHTML(evento.status_evento)}
                                </span>
                            </td>

                            <td>
                                <button type="button"
                                    class="btnEditarTabela"
                                    onclick="editarEventoTabela(${Number(evento.id_evento)})">
                                    Editar ↗
                                </button>
                            </td>

                        </tr>
                    `;

                }).join('')}

            </tbody>

        </table>
    `;
}

// ==========================================
// EDITAR EVENTO PELA TABELA
// ==========================================

async function editarEventoTabela(id) {
    if (salvando) return;

    if (oQueEstaFazendo &&
        !confirm('Descartar a operação atual?')) {
        return;
    }

    cancelarOperacao();

    document.getElementById('inputId_evento').value = id;

    trocarAba('cadastro');

    await procure();

    if (evento) {
        alterar();
    }
}

// ==========================================
// CANCELAR OPERAÇÃO
// ==========================================

function cancelarOperacao() {
    if (salvando) return;

    limparAtributos();
    carregarImagem(null);
    bloquearAtributos(true);

    visibilidadeDosBotoes(
        'inline',
        'none',
        'none',
        'none',
        'none'
    );

    document.getElementById('inputId_evento').value = '';

    mostrarAviso('Operação cancelada.');
}

// ==========================================
// EXIBIR AVISOS
// ==========================================

function mostrarAviso(mensagem) {
    document.getElementById('divAviso').textContent =
        mensagem;
}

// ==========================================
// EXIBIR DADOS
// ==========================================

function mostrarDadosEvento(e) {
    document.getElementById('inputId_evento').value =
        e.id_evento;

    document.getElementById('inputTitulo_evento').value =
        e.titulo_evento || '';

    document.getElementById('inputDescricao_evento').value =
        e.descricao_evento || '';

    document.getElementById('inputLocal_evento').value =
        e.local_evento || '';

    document.getElementById('inputEndereco_evento').value =
        e.endereco_evento || '';

    document.getElementById('inputData_evento').value =
        e.data_evento
            ? String(e.data_evento).substring(0, 10)
            : '';

    document.getElementById('inputHorario_evento').value =
        e.horario_evento
            ? String(e.horario_evento).substring(0, 5)
            : '';

    document.getElementById('selectStatus_evento').value =
        e.status_evento || 'Ativo';

    document.getElementById('selectId_categoria').value =
        e.categoria_id_categoria || '';

    document.getElementById('inputFuncionario_evento').value =
        e.funcionario_pessoa_cpf_pessoa || '';

    bloquearAtributos(true);
}

// ==========================================
// LIMPAR CAMPOS
// ==========================================

function limparAtributos() {
    evento = null;
    oQueEstaFazendo = '';

    document.getElementById('inputTitulo_evento').value = '';
    document.getElementById('inputDescricao_evento').value = '';
    document.getElementById('inputLocal_evento').value = '';
    document.getElementById('inputEndereco_evento').value = '';
    document.getElementById('inputData_evento').value = '';
    document.getElementById('inputHorario_evento').value = '';
    document.getElementById('selectStatus_evento').value = 'Ativo';
    document.getElementById('selectId_categoria').value = '';
    document.getElementById('inputFuncionario_evento').value = '';
    document.getElementById('inputImagem').value = '';

    bloquearAtributos(true);
}

// ==========================================
// BLOQUEAR CAMPOS
// ==========================================

function bloquearAtributos(soLeitura) {
    document.getElementById('inputId_evento').readOnly =
        !soLeitura;

    document.getElementById('inputTitulo_evento').readOnly =
        soLeitura;

    document.getElementById('inputDescricao_evento').readOnly =
        soLeitura;

    document.getElementById('inputLocal_evento').readOnly =
        soLeitura;

    document.getElementById('inputEndereco_evento').readOnly =
        soLeitura;

    document.getElementById('inputData_evento').readOnly =
        soLeitura;

    document.getElementById('inputHorario_evento').readOnly =
        soLeitura;

    document.getElementById('selectStatus_evento').disabled =
        soLeitura;

    document.getElementById('selectId_categoria').disabled =
        soLeitura;

    document.getElementById('inputFuncionario_evento').readOnly =
        soLeitura;
}

// ==========================================
// VISIBILIDADE DOS BOTÕES
// ==========================================

function visibilidadeDosBotoes(btP, btI, btA, btE, btS) {
    document.getElementById('btProcure').style.display = btP;
    document.getElementById('btInserir').style.display = btI;
    document.getElementById('btAlterar').style.display = btA;
    document.getElementById('btExcluir').style.display = btE;
    document.getElementById('btSalvar').style.display = btS;
    document.getElementById('btCancelar').style.display = btS;
}
