# 🔧 Corrigir Permissões Docker no Runner

## ❌ Erro Identificado

```
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock
```

Este erro ocorre quando o usuário que executa o runner **não tem permissão para acessar o Docker daemon**.

---

## ✅ Solução Rápida

### 1️⃣ Identificar usuário do runner

```bash
# SSH no servidor
ssh root@10.10.1.222

# Verificar qual usuário roda o runner
ps aux | grep actions-runner

# Ou verificar o serviço
sudo systemctl status actions.runner.*.service
```

### 2️⃣ Adicionar usuário ao grupo docker

```bash
# Substituir <USUARIO> pelo usuário identificado (geralmente: runner, admin-ti, ou root)
sudo usermod -aG docker <USUARIO>

# Exemplo:
sudo usermod -aG docker runner
# ou
sudo usermod -aG docker admin-ti
```

### 3️⃣ Aplicar mudanças

**Opção A - Reiniciar serviço (recomendado):**
```bash
sudo systemctl restart actions.runner.*.service

# Verificar status
sudo systemctl status actions.runner.*.service
```

**Opção B - Relogar usuário:**
```bash
# Ativar grupo sem relogar
newgrp docker

# Ou fazer logout/login
exit
ssh root@10.10.1.222
su - <USUARIO>
```

### 4️⃣ Verificar permissões

```bash
# Testar acesso Docker
docker ps
docker info

# Se funcionar, está corrigido! ✅
```

---

## 🔍 Verificações Adicionais

### Verificar socket do Docker

```bash
# Ver permissões
ls -la /var/run/docker.sock

# Deve mostrar algo como:
# srw-rw---- 1 root docker 0 Nov 21 20:00 /var/run/docker.sock
```

### Verificar grupo docker existe

```bash
# Listar grupos
cat /etc/group | grep docker

# Criar grupo se não existir
sudo groupadd docker
```

### Verificar membros do grupo

```bash
# Ver quem está no grupo docker
getent group docker
```

---

## 🚨 Se o Runner Roda como Root

Se o runner executa como **root**, você pode:

**Opção 1 - Adicionar root ao grupo docker:**
```bash
sudo usermod -aG docker root
sudo systemctl restart actions.runner.*.service
```

**Opção 2 - Reconfigurar runner para usuário não-root (recomendado):**
```bash
# Parar e desinstalar serviço atual
sudo ./svc.sh stop
sudo ./svc.sh uninstall

# Criar usuário dedicado
sudo useradd -m -s /bin/bash github-runner
sudo usermod -aG docker github-runner

# Transferir propriedade do diretório
sudo chown -R github-runner:github-runner ~/actions-runner

# Reinstalar serviço como novo usuário
sudo -u github-runner ./svc.sh install
sudo ./svc.sh start
```

---

## 🧪 Teste Completo

Execute estes comandos como o usuário do runner:

```bash
# Como o usuário correto
su - <USUARIO>

# Testar Docker
docker run --rm hello-world

# Testar build
docker build --help

# Testar Swarm
docker node ls
docker service ls

# Se todos funcionarem, está OK! ✅
```

---

## 📝 Checklist

- [ ] Usuário do runner identificado
- [ ] Usuário adicionado ao grupo docker (`usermod -aG`)
- [ ] Serviço do runner reiniciado
- [ ] `docker ps` funciona sem sudo
- [ ] `docker build` funciona sem sudo
- [ ] Pipeline executada com sucesso

---

## 🎯 Após Corrigir

1. Commit e push de qualquer alteração (ou empty commit)
2. Pipeline deve executar sem erros de permissão
3. Verificar em: https://github.com/johnynoise/controle_material/actions

```bash
# Teste rápido
git commit --allow-empty -m "test: verificar correção de permissões Docker"
git push origin main
```
