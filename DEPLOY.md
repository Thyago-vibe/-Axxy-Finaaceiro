# 🚀 Guia de Deploy - Axxy Finance

## 📋 Pré-requisitos

- Node.js instalado (v18 ou superior)
- npm ou yarn

## 🔨 Opção 1: Build de Produção (Recomendado)

### 1. Criar Build de Produção

```bash
npm run build
```

Isso vai criar uma pasta `dist/` com todos os arquivos otimizados.

### 2. Instalar Servidor HTTP

```bash
npm install -g serve
```

### 3. Rodar a Aplicação

```bash
serve -s dist -l 3000
```

A aplicação estará disponível em: `http://localhost:3000`

### 4. Criar Atalho no Desktop (Linux)

Execute o script de instalação:

```bash
chmod +x install-desktop.sh
./install-desktop.sh
```

---

## 🖥️ Opção 2: Aplicação Desktop com Electron

### 1. Instalar Electron

```bash
npm install --save-dev electron electron-builder concurrently wait-on
```

### 2. Build da Aplicação Desktop

```bash
npm run electron:build
```

### 3. Instalar no Sistema

O instalador será criado em `release/` e você pode instalar com:

```bash
sudo dpkg -i release/axxy-finance_*.deb
```

---

## 🔄 Opção 3: Modo Desenvolvimento

Para rodar em modo de desenvolvimento:

```bash
npm run dev
```

Acesse: `http://localhost:5173`

---

## 📦 Estrutura de Deploy

```
axxy/
├── dist/              # Build de produção
├── backend/           # API Python (FastAPI)
├── node_modules/      # Dependências
└── src/              # Código fonte
```

---

## 🐛 Troubleshooting

### Porta já em uso
```bash
# Matar processo na porta 3000
sudo lsof -ti:3000 | xargs kill -9
```

### Permissões negadas
```bash
chmod +x install-desktop.sh
chmod +x start-app.sh
```

### Build falhou
```bash
# Limpar cache e reinstalar
rm -rf node_modules dist
npm install
npm run build
```

---

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_API_URL=http://localhost:8000
VITE_GEMINI_API_KEY=sua_chave_aqui
```

---

## 📱 Acesso Remoto (Opcional)

Para acessar de outros dispositivos na rede:

```bash
serve -s dist -l 3000 --host 0.0.0.0
```

Acesse via: `http://SEU_IP:3000`
