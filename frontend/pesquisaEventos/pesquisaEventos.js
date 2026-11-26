
(() => {

    const pesquisa = document.getElementById('pesquisaEventos');
    const lista = document.getElementById('listaEventos');
    const filtros = document.getElementById('filtrosCategoria');
    const resultado = document.getElementById('resultadoPesquisa');
    const limpar = document.getElementById('limparPesquisa');

    if (!pesquisa || !lista || !filtros || !resultado || !limpar) {
        return;
    }

    let categoriaSelecionada = '';

    // NORMALIZAR TEXTO

    function normalizarTexto(texto) {
        return String(texto ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    // OBTER EVENTOS

    function obterCards() {
        return [...lista.querySelectorAll('.event-card')];
    }

    // OBTER CATEGORIA

    function obterCategoria(card) {
        const categoria = card.querySelector(
            '.event-category, .event-status'
        );

        return categoria?.textContent.trim() || 'Evento';
    }

    // CARREGAR CATEGORIAS

    function carregarFiltros() {

        const cards = obterCards();

        const categorias = [...new Set(
            cards.map(obterCategoria)
        )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

        if (!categorias.includes(categoriaSelecionada)) {
            categoriaSelecionada = '';
        }

        filtros.replaceChildren();

        if (!cards.length) {
            resultado.textContent = '';
            resultado.classList.remove('pesquisaVazia');
            return;
        }

        criarBotaoCategoria('Todos os eventos', '');

        categorias.forEach(categoria => {
            criarBotaoCategoria(categoria, categoria);
        });

        filtrarEventos();
    }

    // CRIAR BOTÕES DE CATEGORIA

    function criarBotaoCategoria(nome, valor) {

        const botao = document.createElement('button');

        botao.type = 'button';
        botao.className = 'filtroCategoria';
        botao.textContent = nome;

        const ativo = valor === categoriaSelecionada;

        botao.classList.toggle('ativo', ativo);
        botao.setAttribute('aria-pressed', String(ativo));

        botao.addEventListener('click', () => {

            categoriaSelecionada = valor;

            filtros.querySelectorAll('button').forEach(item => {
                item.classList.remove('ativo');
                item.setAttribute('aria-pressed', 'false');
            });

            botao.classList.add('ativo');
            botao.setAttribute('aria-pressed', 'true');

            filtrarEventos();

        });

        filtros.appendChild(botao);
    }

    // FILTRAR EVENTOS

    function filtrarEventos() {

        const termo = normalizarTexto(pesquisa.value);
        const cards = obterCards();

        let quantidade = 0;

        cards.forEach(card => {

            const texto = normalizarTexto(card.textContent);
            const categoria = obterCategoria(card);

            const correspondePesquisa = termo
                .split(/\s+/)
                .every(palavra => texto.includes(palavra));

            const correspondeCategoria =
                !categoriaSelecionada ||
                categoria === categoriaSelecionada;

            const visivel =
                correspondePesquisa && correspondeCategoria;

            card.hidden = !visivel;

            if (visivel) {
                quantidade++;
            }

        });

        const contadorCliente =
            document.getElementById('quantidadeEventos');

        if (!cards.length) {
            resultado.textContent = '';
            resultado.classList.remove('pesquisaVazia');
            return;
        }

        if (contadorCliente) {
            contadorCliente.textContent =
                `${quantidade} evento(s) encontrado(s)`;
        }

        if (quantidade === 0) {

            resultado.textContent =
                'Nenhum evento encontrado. Tente outra pesquisa.';

        } else {

            resultado.textContent =
                `${quantidade} de ${cards.length} eventos disponíveis`;

        }

        resultado.classList.toggle(
            'pesquisaVazia',
            quantidade === 0
        );
    }

    // PESQUISA EM TEMPO REAL

    pesquisa.addEventListener('input', filtrarEventos);

    // LIMPAR PESQUISA

    limpar.addEventListener('click', () => {

        pesquisa.value = '';
        categoriaSelecionada = '';

        carregarFiltros();

        pesquisa.focus();

    });

    // OBSERVAR CARREGAMENTO DOS EVENTOS

    const observador = new MutationObserver(() => {
        carregarFiltros();
    });

    observador.observe(lista, {
        childList: true
    });

    carregarFiltros();

})();
