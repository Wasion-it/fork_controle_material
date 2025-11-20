# Copilot Instructions - Controle Material

## Visão Geral do Projeto

Sistema de controle de estoque de materiais com autenticação LDAP corporativa, desenvolvido para ambiente corporativo Wasion America. Stack: **Express.js + Prisma (MySQL) + React + Vite**, executando em **Docker Swarm** com Traefik como reverse proxy.

## Arquitetura

### Estrutura de Serviços (Docker Swarm)
- **Traefik** (reverse proxy, porta 80): Roteia tráfego para frontend/backend
- **Backend** (Express): API REST em `api.estoque.ti.wasion.com.br` ou path `/api`
- **Frontend** (Nginx): SPA React em `estoque.ti.wasion.com.br`
- **MySQL 8.0**: Banco de dados com autenticação via secrets do Swarm

### Autenticação Híbrida (LDAP + Local)
- **Fluxo primário**: LDAP contra Active Directory corporativo (`backend/src/services/ldap.js`)
- **Fallback graceful**: Se LDAP desabilitado/falhar, retorna usuário mock para dev
- Usuários LDAP autenticados são sincronizados automaticamente no banco local (`User` model)
- JWT tokens gerados após autenticação bem-sucedida (válidos por tempo configurado em `jwtConfig`)
- Middleware `authMiddleware` protege todas as rotas exceto `/auth/*` e `/health`

**Importante**: Variáveis LDAP podem conter aspas duplas - função `cleanEnv()` sanitiza valores automaticamente.

### Roteamento e API
- Frontend usa **path-based routing**: `${window.location.origin}/api` (evita dependência de DNS)
- Backend expõe porta 3001 internamente, Traefik mapeia via labels
- Todas as requisições autenticadas incluem header `Authorization: Bearer <token>`
- Erro 401 no frontend → logout automático e redirect para login

## Workflow de Desenvolvimento

### Setup Local
```powershell
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev  # Cria banco SQLite local se DATABASE_URL não configurado

# Frontend
cd frontend
npm install
npm run dev  # Porta padrão Vite: 5173
```

### Deploy Automatizado (GitHub Actions)
Pipeline em `.github/workflows/pipeline.yaml`:
1. Push em `main` → CI/CD executa em self-hosted runner
2. SCP copia código para servidor (10.10.1.222)
3. Build local das imagens Docker (`backend` e `frontend`)
4. Push para registry privado (10.10.1.222:5000)
5. Update dos serviços Swarm sem downtime (`docker service update`)

**Não execute `docker-compose`** - o sistema usa Docker Swarm com secrets externos e overlay network.

### Prisma Migrations
```powershell
# Criar nova migration
npx prisma migrate dev --name descricao_mudanca

# Deploy em produção (automático no entrypoint.sh)
npx prisma migrate deploy
```

Migrations em `backend/prisma/migrations/` - nunca editar arquivos gerados manualmente.

## Convenções do Código

### Backend (Express + Prisma)
- **Rotas REST diretamente em `server.js`** - sem separação em routes/ (padrão do projeto)
- Controllers em `src/controllers/` - apenas `AuthController` atualmente
- Services em `src/services/` - `ldap.js` encapsula lógica LDAP
- Prisma Client em `src/lib/prisma.js` - instância singleton exportada
- Middleware de auth valida JWT e injeta `req.userId` e `req.userRole`

**Exemplo de nova rota protegida:**
```javascript
// Após app.use(authMiddleware)
app.get("/nova-rota", async (req, res) => {
  const userId = req.userId; // Disponível após middleware
  // ... lógica
});
```

### Frontend (React + Vite)
- **Sem TypeScript** - JavaScript puro com PropTypes quando necessário
- Styling: **Tailwind CSS** - todas as classes inline, sem CSS modules
- Hooks customizados em `src/hooks/` - `useAuth.jsx` fornece contexto de autenticação
- Services em `src/services/` - `api.js` (wrapper fetch) e `auth.js` (localStorage tokens)
- Páginas em `src/pages/[NomePagina]/index.jsx` - cada pasta representa uma rota
- Lucide React para ícones (`import { IconName } from 'lucide-react'`)

**Exemplo de chamada API:**
```javascript
import api from '../services/api';

const dados = await api.get('/materiais');
await api.post('/movimentacoes', { materialId, tipo, quantidade });
```

### Banco de Dados (Prisma Schema)
Modelos principais em `backend/prisma/schema.prisma`:
- **Material**: Estoque com `quantidade`, `estoqueMinimo`, `categoria`, `ativo`
- **Movimentacao**: Histórico de entrada/saída com `quantidadeAnterior` e `quantidadeAtual`
- **User**: Usuários sincronizados do LDAP ou criados localmente

Relações: `Movimentacao.materialId → Material.id` (cascade delete)

## Debugging e Troubleshooting

### Verificar Status dos Serviços
```powershell
# Via SSH no servidor
docker service ls
docker service ps controle_estoque_backend --no-trunc
docker service logs controle_estoque_backend --tail 50 -f
```

### Health Check
```powershell
curl http://api.estoque.ti.wasion.com.br/health
# Resposta esperada: {"status":"healthy","database":"connected"}
```

### Logs LDAP Verbosos
Backend imprime logs detalhados de autenticação - buscar por `[LDAP]` nos logs do serviço.

### Regenerar Prisma Client (se schema mudar)
```powershell
cd backend
npx prisma generate
# Ou dentro do container: docker exec -it <container> npx prisma generate
```

## Secrets e Configuração

Secrets gerenciados via Docker Swarm (não em .env em produção):
- `mysql_root_password`, `mysql_user`, `mysql_password`
- `jwt_secret` - usado para assinar tokens JWT
- `ldap_bind_password` - senha da conta de serviço LDAP
- `database_url` - connection string completa do MySQL

**Desenvolvimento local**: Use `.env` no backend com `DATABASE_URL` apontando para SQLite ou MySQL local.

## Regras Críticas

1. **Nunca commite secrets** - use variáveis de ambiente ou Swarm secrets
2. **LDAP_ENABLED=false** em dev local para bypass do Active Directory
3. **Prisma migrations sempre via CLI** - nunca edite SQL manualmente
4. **Frontend API_URL é dinâmico** - não hardcode URLs, usa `window.location.origin`
5. **Usuário não-root no Dockerfile** - mantém security best practices (user `nodejs`)
6. **Entrypoint normaliza line endings** - `sed -i 's/\r$//'` evita erros em Windows/Linux

## Estrutura de Endpoints Principais

```
POST /auth/login           # LDAP + JWT token
POST /auth/register        # Registro local (backup)
GET  /health               # Health check (não autenticado)

GET  /materiais            # Lista materiais com movimentações
POST /materiais            # Cria material
PUT  /materiais/:id        # Atualiza material
DELETE /materiais/:id      # Soft delete (ativo=false)
PATCH /materiais/:id/status # Toggle ativo/inativo

POST /movimentacoes        # Registra entrada/saída
GET  /movimentacoes        # Lista todas (opcional ?limit=N)
GET  /movimentacoes/:id    # Histórico de um material (legacy - use rota abaixo)
GET  /materiais/:id/movimentacoes # Histórico de um material

GET  /estatisticas         # Dashboard: totais, baixo estoque, categorias
GET  /relatorios/movimentacoes # Filtros: dataInicio, dataFim, tipo
```

## Performance e Escalabilidade

- Backend: 1 réplica (stateless, pode escalar horizontalmente)
- Frontend: Nginx serve assets estáticos (cache agressivo possível)
- MySQL: 1 réplica com volume persistente, 2GB memory limit
- Healthchecks: Backend (30s interval), MySQL (10s interval, 15 retries no startup)

## Ferramentas e Comandos Úteis

```powershell
# Rebuild local (dev)
docker build -t backend-local ./backend
docker run -p 3001:3001 --env-file ./backend/.env backend-local

# Visualizar estrutura do Prisma
npx prisma studio  # UI em localhost:5555

# Validar schema sem aplicar
npx prisma migrate dev --create-only

# Reset completo do banco (DEV ONLY!)
npx prisma migrate reset
```
