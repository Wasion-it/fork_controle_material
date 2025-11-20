# 🚀 Pipeline CI/CD - Configuração

Esta pipeline automatiza o build e deploy do projeto para o Docker Swarm após cada push na branch `main`.

## 📋 Pré-requisitos

### 1. Servidor Swarm e Registry
- Servidor: Ubuntu VM em `10.10.1.222`
- Registry: Docker Registry privado no mesmo servidor
- Anotar usuário e senha do registry

### 2. Secrets do GitHub
Configure os seguintes secrets no repositório GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `REGISTRY_USERNAME` | Usuário do registry privado | `admin` |
| `REGISTRY_PASSWORD` | Senha do registry privado | Senha do registry |
| `SWARM_HOST` | IP/hostname do servidor Swarm | `10.10.1.222` |
| `SWARM_USER` | Usuário SSH do servidor | `root` ou `admin-ti` |
| `SWARM_SSH_KEY` | Chave privada SSH (completa) | Conteúdo do arquivo `~/.ssh/id_rsa` |
| `SWARM_PORT` | Porta SSH (opcional) | `22` (padrão) |

### 3. Chave SSH no servidor
No servidor Swarm, adicione a chave pública do GitHub Actions (se não usar a sua própria):

```bash
# No servidor
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Cole a chave pública (gerada ou existente)
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Ou use sua chave SSH existente**: copie o conteúdo de `~/.ssh/id_rsa` (chave PRIVADA) para o secret `SWARM_SSH_KEY`.

### 4. Ajustar docker-compose.yml para usar imagens do Registry Privado

O compose já está configurado para usar o registry em `10.10.1.222`:

```yaml
services:
  backend:
    image: 10.10.1.222/controle_material-backend:latest
    
  frontend:
    image: 10.10.1.222/controle_material-frontend:latest
```

## 🔄 Como funciona

### Build e Push (Job 1)
1. **Checkout** do código
2. **Build** das imagens backend e frontend
3. **Push** para Registry Privado (10.10.1.222) com duas tags:
   - `:latest` (sempre a última versão)
   - `:COMMIT_SHA` (rastreabilidade)

### Deploy (Job 2)
1. **Conecta** via SSH no servidor Swarm (10.10.1.222)
2. **Pull** das novas imagens do registry privado
3. **Update** dos serviços com rolling update (zero downtime)
4. **Aguarda** rollout concluir
5. **Verifica** status dos serviços

## 🎯 Uso

### Deploy automático
Basta fazer push na branch `main`:

```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

A pipeline roda automaticamente e deploya no servidor.

### Monitorar pipeline
- GitHub → Actions → Última execução
- Ver logs de cada step

### Rollback manual (se necessário)
```bash
# No servidor
docker service rollback controle_estoque_backend
docker service rollback controle_estoque_frontend
```

## 🛠️ Troubleshooting

### Pipeline falha no build
- Verificar logs no GitHub Actions
- Conferir se Dockerfile está correto
- Testar build local: `docker build -t test ./backend`

### Pipeline falha no deploy (SSH)
- Verificar se `SWARM_HOST` está acessível
- Testar SSH manual: `ssh user@host`
- Verificar se chave SSH está correta e sem senha
- Verificar permissões: `chmod 600 ~/.ssh/authorized_keys`

### Serviço não atualiza
- Ver logs: `docker service logs controle_estoque_backend`
- Ver tasks: `docker service ps controle_estoque_backend`
- Forçar update: `docker service update --force controle_estoque_backend`

### Imagem não encontrada no Registry
- Verificar se `REGISTRY_USERNAME` e `REGISTRY_PASSWORD` estão corretos
- Verificar se servidor permite registry inseguro (HTTP) no `/etc/docker/daemon.json`
- Verificar se imagens foram pushed: `ssh root@10.10.1.222 'curl http://localhost:5000/v2/_catalog'`
- Testar pull manual: `docker pull 10.10.1.222/controle_material-backend:latest`

## 🔐 Segurança

- ✅ Secrets nunca aparecem nos logs
- ✅ Chave SSH privada fica apenas no GitHub Secrets
- ✅ Usar Personal Access Token do Docker Hub (não senha)
- ✅ Limitar acesso SSH ao IP do GitHub Actions (opcional)

## 📦 Estrutura de Tags

- `latest`: Sempre aponta para a última versão em produção
- `COMMIT_SHA`: Permite rollback para qualquer commit específico

Exemplo de rollback para commit específico:
```bash
docker service update --image 10.10.1.222/controle_material-backend:abc123def controle_estoque_backend
```

## 🚦 Status da Pipeline

Adicione badge no README.md:

```markdown
![Pipeline Status](https://github.com/johnynoise/controle_material/actions/workflows/pipeline.yaml/badge.svg)
```
