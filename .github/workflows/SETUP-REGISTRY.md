# 🔐 Configuração do Registry Privado (10.10.1.222)

## 📋 Secrets do GitHub

Configure no GitHub (Settings → Secrets → Actions):

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `REGISTRY_USERNAME` | Usuário do registry privado | `admin` ou seu usuário |
| `REGISTRY_PASSWORD` | Senha do registry privado | Senha do registry |
| `SWARM_HOST` | IP do servidor Swarm | `10.10.1.222` |
| `SWARM_USER` | Usuário SSH do servidor | `root` |
| `SWARM_SSH_KEY` | Chave privada SSH | Conteúdo do `~/.ssh/id_rsa` |
| `SWARM_PORT` | Porta SSH (opcional) | `22` |

## 🚀 Configuração no Servidor Swarm

### 1. Permitir registry inseguro (HTTP)

Se o registry em `10.10.1.222` usa HTTP (não HTTPS), configure:

```bash
# Editar daemon.json
sudo nano /etc/docker/daemon.json

# Adicionar:
{
  "insecure-registries": ["10.10.1.222"]
}

# Reiniciar Docker
sudo systemctl restart docker

# Verificar
docker info | grep -A5 "Insecure Registries"
```

### 2. Testar acesso ao registry

```bash
# Login manual
docker login 10.10.1.222
# Digite usuário e senha

# Testar push/pull
docker pull hello-world
docker tag hello-world 10.10.1.222/hello-world:test
docker push 10.10.1.222/hello-world:test
docker pull 10.10.1.222/hello-world:test

# Limpar teste
docker rmi 10.10.1.222/hello-world:test
```

### 3. Criar secrets do Swarm

```bash
# Secrets para MySQL
printf '%s' 'rootpassword123' | docker secret create mysql_root_password -
printf '%s' 'controle_material' | docker secret create mysql_user -
printf '%s' 'controle_password123' | docker secret create mysql_password -

# Secrets para backend
printf '%s' 'sua-chave-jwt-muito-segura' | docker secret create jwt_secret -
printf '%s' '@Wasion2025' | docker secret create ldap_bind_password -
printf '%s' 'mysql://controle_material:controle_password123@db:3306/controle_material?connection_limit=5' | docker secret create database_url -

# Verificar secrets criados
docker secret ls
```

### 4. Criar rede overlay

```bash
docker network create --driver overlay --attachable controle_overlay
docker network ls | grep controle_overlay
```

### 5. Deploy inicial

```bash
cd /home/admin-ti

# Exportar variáveis
export MYSQL_DATABASE=controle_material
export DOCKER_REGISTRY=10.10.1.222

# Deploy
docker stack deploy -c docker-compose.yml controle_estoque

# Verificar
docker stack services controle_estoque
docker service logs -f controle_estoque_backend
```

## 🔄 Funcionamento da Pipeline

### Quando você faz push na main:

1. **Build**: GitHub Actions builda backend e frontend
2. **Push**: Envia imagens para `10.10.1.222/controle_material-*:latest`
3. **Deploy**: Conecta via SSH no servidor e atualiza serviços

### Imagens criadas:

- `10.10.1.222/controle_material-backend:latest`
- `10.10.1.222/controle_material-backend:COMMIT_SHA`
- `10.10.1.222/controle_material-frontend:latest`
- `10.10.1.222/controle_material-frontend:COMMIT_SHA`

## 🛠️ Troubleshooting

### Pipeline falha no push de imagens

**Erro**: `http: server gave HTTP response to HTTPS client`

```bash
# No servidor do GitHub Actions (não precisa, já configurado na pipeline)
# Mas no servidor Swarm precisa da configuração do insecure-registries
```

**Erro**: `unauthorized: authentication required`

- Verificar se `REGISTRY_USERNAME` e `REGISTRY_PASSWORD` estão corretos nos Secrets do GitHub

### Deploy falha no pull

```bash
# No servidor Swarm (10.10.1.222), testar manualmente:
docker pull 10.10.1.222/controle_material-backend:latest

# Se falhar com erro de autenticação:
docker login 10.10.1.222

# Se falhar com erro de registry inseguro:
# Adicionar em /etc/docker/daemon.json e reiniciar Docker
```

### Serviço não atualiza

```bash
# Ver estado atual
docker service ps controle_estoque_backend --no-trunc

# Forçar update
docker service update --force controle_estoque_backend

# Ver logs
docker service logs -f controle_estoque_backend
```

## 📦 Build e Push Manual (alternativa)

Se quiser fazer build local e push manual:

```bash
# Build local
docker build -t 10.10.1.222/controle_material-backend:latest ./backend
docker build -t 10.10.1.222/controle_material-frontend:latest ./frontend

# Login no registry
docker login 10.10.1.222

# Push
docker push 10.10.1.222/controle_material-backend:latest
docker push 10.10.1.222/controle_material-frontend:latest

# No servidor Swarm, fazer update manual
docker service update --image 10.10.1.222/controle_material-backend:latest controle_estoque_backend
docker service update --image 10.10.1.222/controle_material-frontend:latest controle_estoque_frontend
```

## 🔐 Segurança

### Se o registry suportar HTTPS (recomendado):

1. Configure certificado no registry
2. Remova `insecure-registries` do daemon.json
3. Use HTTPS na pipeline: `registry: https://10.10.1.222`

### Restringir acesso ao registry:

1. Configure firewall permitindo apenas IPs conhecidos
2. Use autenticação robusta (não deixe senha padrão)
3. Considere usar VPN para acesso externo (GitHub Actions)

### GitHub Actions com registry privado:

Se o registry estiver em rede privada e não acessível da internet:
- Use self-hosted runner dentro da rede
- Ou configure VPN/tunnel no workflow

## ✅ Validação

Depois de configurar tudo, teste o fluxo completo:

```bash
# 1. No repositório local
git add .
git commit -m "test: testar pipeline com registry privado"
git push origin main

# 2. Acompanhe no GitHub Actions
# GitHub → Actions → Último workflow

# 3. No servidor, verificar se atualizou
docker service ps controle_estoque_backend
docker service logs controle_estoque_backend | tail -20
curl http://localhost/api/health
```

Se ver `{"status":"healthy"}`, está tudo funcionando! 🎉
