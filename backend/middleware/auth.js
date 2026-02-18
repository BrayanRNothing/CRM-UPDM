const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = async (req, res, next) => {
    try {
        const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ mensaje: 'No hay token, autorización denegada' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const row = db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo FROM usuarios WHERE id = ?').get(decoded.id);

        if (!row) {
            return res.status(401).json({ mensaje: 'Token inválido' });
        }

        if (!row.activo) {
            return res.status(401).json({ mensaje: 'Usuario desactivado' });
        }

        req.usuario = { ...row, id: String(row.id), _id: String(row.id) };
        next();
    } catch (error) {
        res.status(401).json({ mensaje: 'Token inválido' });
    }
};

const esAdmin = (req, res, next) => {
    if (req.usuario.rol !== 'admin' && req.usuario.rol !== 'closer' && req.usuario.rol !== 'prospector') {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    next();
};

const esVendedor = (req, res, next) => {
    if (req.usuario.rol !== 'vendedor' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ mensaje: 'Acceso denegado. Se requiere rol de vendedor' });
    }
    next();
};

module.exports = { auth, esAdmin, esVendedor };
