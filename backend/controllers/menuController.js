
const path = require('path');

// ABRIR MENU ADMINISTRATIVO
exports.abrirMenu = (req, res) => {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.redirect('/login');
    }

    if (usuario.ehFuncionario !== true) {
        return res.status(403).send(
            'Acesso permitido apenas para funcionários.'
        );
    }

    res.sendFile(
        path.join(
            __dirname,
            '../../frontend/menu/menu.html'
        )
    );
};

// LOGOUT
exports.logout = (req, res) => {
    if (!req.session) {
        return res.redirect('/login');
    }

    req.session.destroy((erro) => {
        if (erro) {
            console.error('Erro ao sair:', erro);

            return res.status(500).send(
                'Erro ao encerrar sessão.'
            );
        }

        res.clearCookie('afterhours.sid', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });

        res.clearCookie('usuarioLogado', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });

        return res.redirect('/login');
    });
};
