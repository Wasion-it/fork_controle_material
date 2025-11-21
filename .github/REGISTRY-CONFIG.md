# 🐳 Configuração do Docker Registry Local

## ❌ Erro Identificado

```
Get "https://10.10.1.222:5000/v2/": http: server gave HTTP response to HTTPS client
```

O Docker tenta usar HTTPS por padrão, mas o registry local usa HTTP (insecure).

---

## ✅ Solução: Configurar Registry como Insecure

### 1️⃣ Configurar Docker Daemon

**No servidor 10.10.1.222:**

```bash
# Editar daemon.json
sudo nano /etc/docker/daemon.json
```

Adicione ou atualize:

```json
{
  "insecure-registries": ["10.10.1.222:5000", "localhost:5000"],
  "registry-mirrors": []
}
```

**Se já existir conteúdo no arquivo**, apenas adicione a chave `insecure-registries`:

```json
{
  "insecure-registries": ["10.10.1.222:5000", "localhost:5000"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 2️⃣ Reiniciar Docker

```bash
sudo systemctl restart docker

# Verificar status
sudo systemctl status docker
```

### 3️⃣ Verificar Configuração

```bash
# Ver configuração atual
docker info | grep -A 5 "Insecure Registries"

# Deve mostrar:
#  Insecure Registries:
#   10.10.1.222:5000
#   localhost:5000
#   127.0.0.0/8
```

### 4️⃣ Testar Registry

```bash
# Testar acesso HTTP
curl http://10.10.1.222:5000/v2/_catalog

# Deve retornar algo como:
# {"repositories":["controle_material-backend","controle_material-frontend"]}

# Testar push/pull
docker pull nginx:alpine
docker tag nginx:alpine 10.10.1.222:5000/test-nginx:latest
docker push 10.10.1.222:5000/test-nginx:latest

# Se funcionar, está OK! ✅
docker rmi 10.10.1.222:5000/test-nginx:latest
docker pull 10.10.1.222:5000/test-nginx:latest
```

---

## 🔧 Se o Registry Não Estiver Rodando

### Iniciar Registry Local

```bash
# Via Docker
docker run -d -p 5000:5000 --name registry --restart=always registry:2

# Ou via Docker Compose (se configurado)
docker-compose up -d registry
```

### Verificar Registry

```bash
# Listar containers
docker ps | grep registry

# Ver logs
docker logs registry

# Testar
curl http://localhost:5000/v2/_catalog
```

---

## 🌐 Configurar em Outras Máquinas (Opcional)

Se outras máquinas na rede também precisam acessar o registry:

**Em cada máquina cliente:**

```bash
# Editar daemon.json
sudo nano /etc/docker/daemon.json

# Adicionar
{
  "insecure-registries": ["10.10.1.222:5000"]
}

# Reiniciar
sudo systemctl restart docker
```

---

## 🔒 Alternativa: Registry com HTTPS (Produção)

Para produção, é recomendado usar HTTPS com certificados:

### Gerar Certificado Self-Signed

```bash
mkdir -p /opt/registry/certs
cd /opt/registry/certs

# Gerar certificado
openssl req -newkey rsa:4096 -nodes -sha256 \
  -keyout domain.key -x509 -days 365 \
  -out domain.crt \
  -subj "/CN=10.10.1.222"
```

### Iniciar Registry com TLS

```bash
docker run -d -p 5000:5000 --name registry \
  --restart=always \
  -v /opt/registry/certs:/certs \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/domain.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/domain.key \
  registry:2
```

### Confiar no Certificado (em cada cliente)

```bash
# Copiar certificado
sudo mkdir -p /etc/docker/certs.d/10.10.1.222:5000
sudo cp domain.crt /etc/docker/certs.d/10.10.1.222:5000/ca.crt

# Reiniciar Docker
sudo systemctl restart docker
```

---

## 📝 Checklist

- [ ] `daemon.json` configurado com `insecure-registries`
- [ ] Docker daemon reiniciado
- [ ] `docker info` mostra registry como insecure
- [ ] `curl http://10.10.1.222:5000/v2/_catalog` funciona
- [ ] Push/pull de teste funcionou
- [ ] Pipeline executada com sucesso

---

## 🎯 Após Configurar

A pipeline foi atualizada para **NÃO usar push para registry**, fazendo deploy direto das imagens locais.

Isso é mais rápido e evita problemas de certificados!

**Teste a pipeline:**

```bash
git commit --allow-empty -m "test: verificar deploy sem registry push"
git push origin main
```
