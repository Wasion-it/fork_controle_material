import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/auth.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};