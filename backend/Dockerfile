# Etapa 1 - Base mínima
FROM node:18-alpine AS base

# Configurar npm
ENV NODE_ENV=production
RUN npm config set registry https://registry.npmjs.org/

# Etapa 2 - Dependencies
FROM base AS deps

WORKDIR /app

# Copiar apenas arquivos necessários para dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências e gerar prisma client, limpar cache
RUN npm ci --only=production --no-audit --no-optional && \
    npx prisma generate && \
    npm cache clean --force && \
    rm -rf /root/.cache /root/.npm

# Etapa 3 - Builder
FROM base AS builder

WORKDIR /app

# Copiar dependências otimizadas
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copiar código fonte
COPY . .

# Etapa 4 - Runner
FROM base AS runner

WORKDIR /app

# Configurar ambiente
ENV PORT=3001

# Instalar apenas mysql-client mínimo
RUN apk add --no-cache mysql-client netcat-openbsd --repository=https://dl-cdn.alpinelinux.org/alpine/latest-stable/main && \
    rm -rf /var/cache/apk/* && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/node_modules && \
    chown -R nodejs:nodejs /app

# Copiar módulos e arquivos
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/server.js ./
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --chown=nodejs:nodejs entrypoint.sh ./

# Configurar permissões
# Normalizar finais de linha para evitar erro 'no such file or directory' em Swarm
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# Usar usuário não-root
USER nodejs

# Expor porta
EXPOSE 3001

# Healthcheck usando netcat (incluído no Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --spider -q http://localhost:3001/health || exit 1

# Iniciar aplicação
ENTRYPOINT ["./entrypoint.sh"]
