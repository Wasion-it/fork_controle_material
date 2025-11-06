export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'sua-chave-secreta-padrao', // Em produção, use sempre uma variável de ambiente
  expiresIn: '24h'
};