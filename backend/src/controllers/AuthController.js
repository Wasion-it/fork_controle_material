import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { jwtConfig } from '../config/auth.js';
import { ldapService } from '../services/ldap.js';

export const AuthController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      console.log('Tentativa de login para:', email);

      if (!email || !password) {
        console.log('Email ou senha faltando');
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      // Remover espaços em branco da senha
      const cleanPassword = String(password).trim();

      // Tenta autenticar via LDAP
      try {
        console.log('Iniciando autenticação LDAP...');
        const ldapUser = await ldapService.authenticate(email, cleanPassword);
        console.log('LDAP autenticado com sucesso:', ldapUser);
        
        // Procura o usuário no banco local ou cria se não existir
        console.log('Procurando usuário no banco local:', ldapUser.email);
        let user = await prisma.user.findUnique({
          where: { email: ldapUser.email }
        });

        if (!user) {
          console.log('Usuário não encontrado no banco, criando novo...');
          // Cria usuário local com dados do LDAP
          user = await prisma.user.create({
            data: {
              email: ldapUser.email,
              nome: ldapUser.nome,
              password: 'LDAP_USER', // senha fictícia já que usa LDAP
              role: ldapUser.role,
              ativo: true
            }
          });
          console.log('Novo usuário criado:', user);
        } else {
          console.log('Usuário encontrado no banco:', user);
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

      } catch (ldapError) {
        console.error('Erro na autenticação LDAP:', ldapError);
        console.error('Stack trace:', ldapError.stack);
        return res.status(401).json({ 
          error: 'Credenciais inválidas ou usuário não pertence ao departamento de TI',
          details: ldapError.message 
        });
      }
    } catch (error) {
      console.error('Erro no login:', error);
      console.error('Stack trace:', error.stack);
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