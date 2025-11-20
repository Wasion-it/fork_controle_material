# 🚀 Setup Rápido - Registry e Swarm no mesmo servidor (10.10.1.222)

## 📝 Resumo da Configuração

- **Servidor**: Ubuntu VM em `10.10.1.222`
- **Docker Registry**: Rodando no mesmo servidor (porta 5000 por padrão)
- **Docker Swarm**: Manager no mesmo servidor
- **Aplicação**: Stack `controle_estoque`

## 🔧 1. Configurar Docker Registry no Servidor (se ainda não tiver)

```bash
# SSH no servidor
ssh root@10.10.1.222

# Rodar registry (se ainda não estiver rodando)
docker run -d \
  -p 5000:5000 \
  --restart=always \
  --name registry \
  -v /var/lib/registry:/var/lib/registry \
  registry:2

# Verificar se está rodando
docker ps | grep registry
curl http://localhost:5000/v2/_catalog
```

## 🔐 2. Configurar Acesso Inseguro (HTTP)

Como o registry está no mesmo servidor, configure:

```bash
# Editar daemon.json
sudo nano /etc/docker/daemon.json

# Adicionar (ou mesclar se já existir):
{
  "insecure-registries": ["10.10.1.222:5000", "localhost:5000"]
}

# Reiniciar Docker
sudo systemctl restart docker

# Verificar
docker info | grep -A3 "Insecure Registries"
```

## 🐝 3. Inicializar Swarm (se ainda não estiver)

```bash
# Inicializar Swarm
docker swarm init --advertise-addr 10.10.1.222

# Verificar
docker node ls
```

## 🔑 4. Criar Secrets

```bash
# Secrets do MySQL
printf '%s' 'rootpassword123' | docker secret create mysql_root_password -
printf '%s' 'controle_material' | docker secret create mysql_user -
printf '%s' 'controle_password123' | docker secret create mysql_password -

# Secrets do Backend
printf '%s' 'sua-chave-jwt-muito-segura-aqui' | docker secret create jwt_secret -
printf '%s' '@Wasion2025' | docker secret create ldap_bind_password -
printf '%s' 'mysql://controle_material:controle_password123@db:3306/controle_material?connection_limit=5' | docker secret create database_url -

# Verificar
docker secret ls
```

## 🌐 5. Criar Rede Overlay

```bash
# Criar rede
docker network create --driver overlay --attachable controle_overlay

# Verificar
docker network ls | grep controle_overlay
```

## 📦 6. Testar Push/Pull no Registry Local

```bash
# Pull de uma imagem teste
docker pull hello-world

# Tag para o registry local
docker tag hello-world 10.10.1.222:5000/hello-world:test

# Push
docker push 10.10.1.222:5000/hello-world:test

# Verificar no registry
curl http://localhost:5000/v2/_catalog

# Limpar teste
docker rmi 10.10.1.222:5000/hello-world:test
```

## ⚙️ 7. Ajustar docker-compose.yml

O compose já está configurado corretamente:

```yaml
services:
  backend:
    image: ${DOCKER_REGISTRY:-10.10.1.222:5000}/controle_material-backend:latest
  frontend:
    image: ${DOCKER_REGISTRY:-10.10.1.222:5000}/controle_material-frontend:latest
```

## 🚀 8. Deploy Inicial

```bash
cd /home/admin-ti  # ou onde você colocar o projeto

# Exportar variáveis
export MYSQL_DATABASE=controle_material
export DOCKER_REGISTRY=10.10.1.222:5000

# Deploy
docker stack deploy -c docker-compose.yml controle_estoque

# Verificar
docker stack services controle_estoque
docker service ps controle_estoque_backend
docker service logs -f controle_estoque_backend
```

## 🔐 9. Secrets do GitHub Actions

Configure no GitHub (Settings → Secrets → Actions):

```
REGISTRY_USERNAME = (deixe vazio se registry não tiver auth)
REGISTRY_PASSWORD = (deixe vazio se registry não tiver auth)
SWARM_HOST = 10.10.1.222
SWARM_USER = root
SWARM_SSH_KEY = (conteúdo completo da chave privada SSH)
```

**Importante**: Se o registry não tiver autenticação, a pipeline ainda vai funcionar - o login vai falhar mas o push/pull vai funcionar pois está localhost.

## ✅ 10. Testar Pipeline

```bash
# No repositório local (Windows)
git add .
git commit -m "feat: configurar pipeline com registry local"
git push origin main

# Acompanhar no GitHub
# GitHub → Actions → Último workflow
```

## 🔍 Verificação Final

```bash
# Ver serviços rodando
docker service ls

# Ver tasks
docker service ps controle_estoque_backend
docker service ps controle_estoque_frontend

# Testar API
curl http://localhost/api/health

# Ver imagens no registry
curl http://localhost:5000/v2/_catalog
curl http://localhost:5000/v2/controle_material-backend/tags/list
curl http://localhost:5000/v2/controle_material-frontend/tags/list
```

## 🛠️ Comandos Úteis

### Ver logs
```bash
docker service logs -f controle_estoque_backend
docker service logs -f controle_estoque_frontend
docker service logs -f controle_estoque_db
```

### Forçar update
```bash
docker service update --force controle_estoque_backend
docker service update --force controle_estoque_frontend
```

### Escalar serviços
```bash
docker service scale controle_estoque_backend=2
docker service scale controle_estoque_frontend=3
```

### Rollback
```bash
docker service rollback controle_estoque_backend
docker service rollback controle_estoque_frontend
```

### Remover stack
```bash
docker stack rm controle_estoque
```

### Ver imagens no registry
```bash
# Todas as imagens
curl http://localhost:5000/v2/_catalog

# Tags de uma imagem específica
curl http://localhost:5000/v2/controle_material-backend/tags/list
```

## 🚨 Troubleshooting

### Registry não aceita push
```bash
# Verificar se está rodando
docker ps | grep registry

# Ver logs
docker logs registry

# Reiniciar registry
docker restart registry
```

### Erro "http: server gave HTTP response to HTTPS client"
```bash
# Confirmar insecure-registries no daemon.json
cat /etc/docker/daemon.json

# Deve conter:
# "insecure-registries": ["10.10.1.222:5000", "localhost:5000"]

# Reiniciar Docker
sudo systemctl restart docker
```

### Serviço não consegue pull da imagem
```bash
# Verificar se imagem existe
curl http://localhost:5000/v2/controle_material-backend/tags/list

# Testar pull manual
docker pull 10.10.1.222:5000/controle_material-backend:latest

# Ver logs do serviço
docker service ps controle_estoque_backend --no-trunc
```

### Backend não conecta no DB
```bash
# Verificar se ambos estão na mesma rede
docker network inspect controle_overlay

# Ver se service db está rodando
docker service ps controle_estoque_db

# Testar DNS interno
docker exec $(docker ps -q -f name=controle_estoque_backend) ping -c 2 db
```

## 📋 Checklist Final

- [ ] Registry rodando na porta 5000
- [ ] daemon.json configurado com insecure-registries
- [ ] Docker reiniciado após alterar daemon.json
- [ ] Swarm inicializado
- [ ] Secrets criados (6 secrets)
- [ ] Rede overlay criada
- [ ] Secrets do GitHub configurados
- [ ] Teste de push/pull no registry funcionando
- [ ] Deploy inicial funcionando
- [ ] API respondendo em /api/health

Se todos os itens estiverem marcados, está pronto para usar! 🎉
