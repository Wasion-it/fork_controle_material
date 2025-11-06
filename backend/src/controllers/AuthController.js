import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { jwtConfig } from '../config/auth.js';

export const AuthController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      if (!user.ativo) {
        return res.status(401).json({ error: 'Usuário está desativado' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async register(req, res) {
    try {
      const { email, password, nome } = req.body;

      if (!email || !password || !nome) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      const userExists = await prisma.user.findUnique({ where: { email } });

      if (userExists) {
        return res.status(400).json({ error: 'Usuário já existe' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          nome,
          role: 'USER'
        }
      });

      const token = jwt.sign(
        { id: user.id, role: user.role },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};