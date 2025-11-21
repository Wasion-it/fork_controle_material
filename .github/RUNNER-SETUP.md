# 🏃 Configuração do GitHub Actions Self-Hosted Runner

## Por que Self-Hosted Runner?

O pipeline precisa acessar recursos do Docker Swarm local:
- **Docker Swarm**: Gerenciamento de serviços
- **Docker Registry**: 10.10.1.222:5000
- **MySQL/LDAP**: Recursos internos da Wasion America

GitHub Actions cloud runners não têm acesso à infraestrutura local, por isso usamos um runner **no mesmo servidor do Swarm (10.10.1.222)**.

---

## 🔧 Pré-requisitos

**Servidor 10.10.1.222** (onde roda o Docker Swarm) com:
- Docker instalado e Swarm inicializado
- Git instalado
- Acesso ao registry local (10.10.1.222:5000)
- Usuário com permissões Docker (sem sudo)

---

## 📦 Instalação do Runner

### 1️⃣ Acessar Configurações do Repositório

```
https://github.com/<seu-usuario>/controle_material/settings/actions/runners
```

Clique em: **"New self-hosted runner"**

### 2️⃣ Escolher Plataforma

Selecione:
- **Linux** (se servidor Linux)
- **Windows** (se workstation Windows)

### 3️⃣ Baixar e Configurar (Linux)

**Execute no servidor 10.10.1.222:**

```bash
# Criar diretório do runner
mkdir -p ~/actions-runner && cd ~/actions-runner

# Baixar última versão (exemplo)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extrair
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configurar (use o comando gerado pela página do GitHub)
./config.sh --url https://github.com/<seu-usuario>/controle_material \
  --token <TOKEN_GERADO_PELO_GITHUB>

# Quando perguntado:
# - Runner group: Default
# - Name: [deixe padrão ou escolha nome descritivo]
# - Labels: [deixe padrão]
# - Work folder: [deixe padrão _work]
```

### 3️⃣ Baixar e Configurar (Windows)

```powershell
# Criar diretório do runner
mkdir actions-runner; cd actions-runner

# Baixar última versão (exemplo)
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-win-x64-2.311.0.zip `
  -OutFile actions-runner-win-x64-2.311.0.zip

# Extrair
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64-2.311.0.zip", "$PWD")

# Configurar (use o comando gerado pela página do GitHub)
.\config.cmd --url https://github.com/<seu-usuario>/controle_material `
  --token <TOKEN_GERADO_PELO_GITHUB>
```

---

## 🚀 Iniciar o Runner

### Execução Manual (Teste)

**Linux:**
```bash
./run.sh
```

**Windows:**
```powershell
.\run.cmd
```

### Execução como Serviço (Recomendado)

**Linux (systemd):**
```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

**Windows (como serviço):**
```powershell
# Executar como Administrator
.\svc.cmd install
.\svc.cmd start
.\svc.cmd status
```

---

## ✅ Verificar Instalação

1. Acesse: `https://github.com/<seu-usuario>/controle_material/settings/actions/runners`
2. Você deve ver o runner com status **🟢 Idle** (ou "Online")

---

## 🔐 Permissões Docker

**⚠️ CRÍTICO**: O runner precisa ter permissões Docker!

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Aplicar mudanças (ou fazer logout/login)
newgrp docker

# Testar
docker ps
docker service ls
docker build --help

# Se funcionar sem sudo, está OK! ✅
```

**Se tiver problemas de permissão**, veja o guia completo: **[FIX-DOCKER-PERMISSIONS.md](./FIX-DOCKER-PERMISSIONS.md)**

---

## 📊 Logs e Troubleshooting

### Ver Logs do Runner

**Linux (systemd):**
```bash
sudo journalctl -u actions.runner.<nome-do-runner>.service -f
```

**Windows (Event Viewer):**
```
Applications and Services Logs → GitHub Actions Runner
```

### Verificar Conectividade

```bash
# Testar Docker Swarm
docker node ls
docker service ls

# Testar Registry
curl http://localhost:5000/v2/_catalog

# Testar acesso aos serviços
docker service ps controle_estoque_backend
```

### Problemas Comuns

#### ❌ Runner offline após reiniciar máquina

**Solução**: Instalar como serviço (veja seção acima)

#### ❌ Erro "docker: command not found"

**Solução**: Adicionar Docker ao PATH do runner

**Linux:**
```bash
# Editar ~/.bashrc do usuário que executa runner
export PATH=$PATH:/usr/bin:/usr/local/bin
```

**Windows:**
```powershell
# Adicionar Docker ao PATH do sistema
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Docker\Docker\resources\bin", "Machine")
```

#### ❌ Erro "Permission denied" no Docker

**Solução Linux**: Adicionar usuário do runner ao grupo docker
```bash
sudo usermod -aG docker $USER
# Reiniciar runner
```

**Solução Windows**: Executar runner como Administrator

---

## 🔄 Atualizar Runner

```bash
# Parar serviço
sudo ./svc.sh stop  # Linux
.\svc.cmd stop      # Windows

# Baixar nova versão
# (mesmo processo de instalação)

# Reconfigurar se necessário
./config.sh remove --token <TOKEN>
./config.sh --url <URL> --token <NOVO_TOKEN>

# Reiniciar
sudo ./svc.sh start  # Linux
.\svc.cmd start      # Windows
```

---

## 🗑️ Remover Runner

```bash
# Parar serviço
sudo ./svc.sh stop  # Linux
.\svc.cmd stop      # Windows

# Desinstalar serviço
sudo ./svc.sh uninstall  # Linux
.\svc.cmd uninstall      # Windows

# Remover do GitHub
./config.sh remove --token <TOKEN>

# Deletar diretório
cd ..
rm -rf actions-runner
```

---

## 📏 Checklist Pós-Instalação

- [ ] Runner aparece como **🜢 Idle** no GitHub
- [ ] `docker ps` executa sem erros
- [ ] `docker service ls` mostra serviços do Swarm
- [ ] Registry localhost:5000 está acessível
- [ ] Runner configurado como serviço (inicia com o sistema)
- [ ] Pipeline de teste executou com sucesso

---

## 🎯 Próximos Passos

Após instalar o runner:

1. Commit e push de qualquer alteração para testar
2. Acompanhar execução em: `https://github.com/<seu-usuario>/controle_material/actions`
3. Verificar logs do runner se houver problemas

**Lembre-se**: O runner precisa estar **sempre online** para executar pipelines automaticamente!
