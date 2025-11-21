# 🚀 Quick Start - CI/CD Pipeline

## 📋 Pré-requisitos

- [ ] Acesso admin ao repositório no GitHub
- [ ] Acesso SSH ao servidor de deploy (10.10.1.222)
- [ ] Docker Registry local rodando (10.10.1.222:5000)
- [ ] **GitHub Actions Self-Hosted Runner instalado** → [Guia de instalação](./RUNNER-SETUP.md)

---

## ⚡ Setup Rápido (5 minutos)

### 1️⃣ Instalar Self-Hosted Runner

**⚠️ IMPORTANTE**: Instale o runner **no servidor 10.10.1.222** (mesmo servidor do Swarm).

Siga o guia completo: **[RUNNER-SETUP.md](./RUNNER-SETUP.md)**

Resumo rápido:
```bash
# SSH no servidor
ssh root@10.10.1.222

# Criar diretório
mkdir -p ~/actions-runner && cd ~/actions-runner

# Baixar e configurar runner (comando fornecido pelo GitHub)
# Instalar como serviço: sudo ./svc.sh install
```

### 2️⃣ Instalar GitHub CLI

**Windows (PowerShell)**:
```powershell
winget install --id GitHub.cli
```

**Linux**:
```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### 2️⃣ Instalar GitHub CLI

**Windows (PowerShell)**:
```powershell
winget install --id GitHub.cli
```

**Linux**:
```bash
sudo apt install gh -y
```

### 3️⃣ Autenticar

```bash
gh auth login
# Escolha: GitHub.com → HTTPS → Yes → Login with a browser
```

### 3️⃣ Autenticar

```bash
gh auth login
# Escolha: GitHub.com → HTTPS → Yes → Login with a browser
```

### 4️⃣ Preparar Servidor

```bash
# SSH no servidor
ssh user@server-ip

# Inicializar Docker Swarm (se não estiver)
docker swarm init

# Criar network
docker network create --driver overlay controle_overlay

# Copiar arquivo .env para o servidor
scp .env user@server-ip:/opt/controle_material/.env
```

### 5️⃣ Fazer Deploy

```bash
git add .
git commit -m "ci: configure GitHub Actions pipeline"
git push origin main

# Acompanhar deploy
gh run watch
```

## 🎯 Uso Diário

### Ver Status da Pipeline
```bash
gh run list --limit 5
```

### Ver Logs em Tempo Real
```bash
gh run watch
```

### Deploy Manual
```bash
gh workflow run pipeline.yaml -f environment=production
```

### Verificar no Servidor
```bash
ssh user@server-ip "docker service ls | grep controle"
```

## 🆘 Troubleshooting Rápido

### Pipeline falhou?
```bash
# Ver logs detalhados
gh run view --log-failed

# Fazer rollback manual
ssh user@server-ip "docker service rollback controle_material_backend"
```

### Imagens não carregam?
```bash
# No servidor, limpar espaço
ssh user@server-ip "docker system prune -af"
```

### SSH não conecta?
```bash
# Testar conexão
ssh -v user@server-ip "echo OK"

# Verificar chave no GitHub
gh secret list
```

## 📚 Documentação Completa

- **Pipeline detalhada**: [.github/PIPELINE.md](.github/PIPELINE.md)
- **Instruções do projeto**: [.github/copilot-instructions.md](.github/copilot-instructions.md)

## ✨ Features da Pipeline

- ✅ Build automatizado (backend + frontend)
- ✅ Testes com MySQL container
- ✅ Análise de segurança (Trivy + npm audit)
- ✅ Deploy para servidor local via SSH
- ✅ Rollback automático em caso de falha
- ✅ Cleanup automático de artifacts
- ✅ Dependabot configurado
- ✅ PR template incluído
