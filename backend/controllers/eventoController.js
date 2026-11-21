
const { query } = require('../database');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Caminho onde as imagens dos eventos serão armazenadas
const pastaImagens = path.join(__dirname, '../../imagens');

// LISTAR EVENTOS
async function listarEvento(req, res) {
    try {
        const resultado = await query(`
            SELECT
                e.*,
                c.nome_categoria
            FROM public.evento e
            INNER JOIN public.categoria c
                ON e.categoria_id_categoria = c.id_categoria
            ORDER BY e.id_evento
        `);

        return res.status(200).json({
            sucesso: true,
            eventos: resultado.rows
        });

    } catch (erro) {
        console.error('Erro ao listar eventos:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar eventos.'
        });
    }
}

// BUSCAR EVENTO PELO ID
async function obterEvento(req, res) {
    try {
        const { id } = req.params;

        const resultado = await query(`
            SELECT
                e.*,
                c.nome_categoria
            FROM public.evento e
            INNER JOIN public.categoria c
                ON e.categoria_id_categoria = c.id_categoria
            WHERE e.id_evento = $1
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Evento não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            evento: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao buscar evento:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar evento.'
        });
    }
}

// CADASTRAR EVENTO
async function criarEvento(req, res) {
    try {
        const {
            titulo_evento,
            descricao_evento,
            local_evento,
            endereco_evento,
            data_evento,
            horario_evento,
            status_evento,
            categoria_id_categoria,
            funcionario_pessoa_cpf_pessoa
        } = req.body;

        if (
            !titulo_evento ||
            !local_evento ||
            !data_evento ||
            !horario_evento ||
            !categoria_id_categoria ||
            !funcionario_pessoa_cpf_pessoa
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preencha os campos obrigatórios.'
            });
        }

        const resultado = await query(`
            INSERT INTO public.evento (
                titulo_evento,
                descricao_evento,
                local_evento,
                endereco_evento,
                data_evento,
                horario_evento,
                status_evento,
                categoria_id_categoria,
                funcionario_pessoa_cpf_pessoa
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            titulo_evento,
            descricao_evento || null,
            local_evento,
            endereco_evento || null,
            data_evento,
            horario_evento,
            status_evento || 'Ativo',
            categoria_id_categoria,
            funcionario_pessoa_cpf_pessoa
        ]);

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Evento cadastrado com sucesso!',
            evento: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao cadastrar evento:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar evento. Verifique os dados informados.'
        });
    }
}

// ALTERAR EVENTO
async function atualizarEvento(req, res) {
    try {
        const { id } = req.params;

        const {
            titulo_evento,
            descricao_evento,
            local_evento,
            endereco_evento,
            data_evento,
            horario_evento,
            status_evento,
            categoria_id_categoria,
            funcionario_pessoa_cpf_pessoa
        } = req.body;

        const resultado = await query(`
            UPDATE public.evento
            SET
                titulo_evento = $1,
                descricao_evento = $2,
                local_evento = $3,
                endereco_evento = $4,
                data_evento = $5,
                horario_evento = $6,
                status_evento = $7,
                categoria_id_categoria = $8,
                funcionario_pessoa_cpf_pessoa = $9
            WHERE id_evento = $10
            RETURNING *
        `, [
            titulo_evento,
            descricao_evento || null,
            local_evento,
            endereco_evento || null,
            data_evento,
            horario_evento,
            status_evento || 'Ativo',
            categoria_id_categoria,
            funcionario_pessoa_cpf_pessoa,
            id
        ]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Evento não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Evento atualizado com sucesso!',
            evento: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao atualizar evento:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar evento.'
        });
    }
}

// EXCLUIR EVENTO
async function deletarEvento(req, res) {
    try {
        const { id } = req.params;

        const resultado = await query(`
            DELETE FROM public.evento
            WHERE id_evento = $1
            RETURNING *
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Evento não encontrado.'
            });
        }

        // Remove a imagem associada ao evento, se existir
        const caminhoImagem = path.join(pastaImagens, `${id}.png`);

        try {
            await fs.promises.unlink(caminhoImagem);
        } catch (erroArquivo) {
            if (erroArquivo.code !== 'ENOENT') {
                console.error('Erro ao remover imagem:', erroArquivo);
            }
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Evento excluído com sucesso!'
        });

    } catch (erro) {
        console.error('Erro ao excluir evento:', erro);

        if (erro.code === '23503') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Não é possível excluir este evento porque existem ingressos ou pedidos vinculados a ele.'
            });
        }

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao excluir evento.'
        });
    }
}

// ENVIAR IMAGEM DO EVENTO
async function uploadImagem(req, res) {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nenhuma imagem foi enviada.'
            });
        }

        // Confere se o evento existe
        const evento = await query(`
            SELECT id_evento
            FROM public.evento
            WHERE id_evento = $1
        `, [id]);

        if (evento.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Evento não encontrado.'
            });
        }

        // Cria a pasta caso ela ainda não exista
        await fs.promises.mkdir(pastaImagens, { recursive: true });

        const caminhoImagem = path.join(pastaImagens, `${id}.png`);

        // Redimensiona e salva a imagem
        await sharp(req.file.buffer)
            .resize(300, 300, { fit: 'cover' })
            .png()
            .toFile(caminhoImagem);

        // Registra o nome da imagem no banco
        await query(`
            UPDATE public.evento
            SET imagem_evento = $1
            WHERE id_evento = $2
        `, [`${id}.png`, id]);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Imagem enviada com sucesso!'
        });

    } catch (erro) {
        console.error('Erro ao enviar imagem:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao enviar imagem.'
        });
    }
}

module.exports = {
    listarEvento,
    listarEventosPublicos,
    obterEvento,
    criarEvento,
    atualizarEvento,
    deletarEvento,
    uploadImagem
};

// LISTAR EVENTOS DISPONÍVEIS PARA O PÚBLICO
async function listarEventosPublicos(req, res) {
    try {
        const resultado = await query(`
            SELECT
                e.*,
                c.nome_categoria
            FROM public.evento e
            INNER JOIN public.categoria c
                ON e.categoria_id_categoria = c.id_categoria
            WHERE LOWER(e.status_evento) = 'ativo'
            ORDER BY e.data_evento, e.horario_evento
        `);

        return res.status(200).json({
            sucesso: true,
            eventos: resultado.rows
        });

    } catch (erro) {
        console.error('Erro ao listar eventos públicos:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao carregar os eventos.'
        });
    }
}
