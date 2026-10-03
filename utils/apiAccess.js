const { pathAllowed, resolvePerfil } = require('./usersAccess');

function requireAuthJson(req, res, next) {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
}

function requirePageAccess(pagePath) {
    return (req, res, next) => {
        if (!req.session?.authenticated) {
            return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
        }
        const user = req.session.user || {};
        const perfil = resolvePerfil(user.perfil || user.role);
        if (perfil === 'Administrador') return next();
        if (!pathAllowed(user.permissoes, pagePath, perfil)) {
            return res.status(403).json({ message: 'Sem permissão para este módulo.' });
        }
        return next();
    };
}

module.exports = {
    requireAuthJson,
    requirePageAccess,
};
