# 🚀 Instalação Rápida - Axxy Finance

## ⚡ Método Mais Rápido (Recomendado)

Execute o script de instalação automática:

```bash
chmod +x install-desktop.sh
./install-desktop.sh
```

Isso vai:
- ✅ Instalar todas as dependências
- ✅ Criar o build de produção
- ✅ Configurar o servidor
- ✅ Criar atalho no menu de aplicativos

Depois, procure por **"Axxy Finance"** no menu de aplicativos do seu sistema!

---

## 🖥️ Instalação Manual

### 1. Instalar dependências
```bash
npm install
```

### 2. Criar build de produção
```bash
npm run build
```

### 3. Instalar servidor HTTP
```bash
npm install -g serve
```

### 4. Iniciar aplicação
```bash
npm run start
```

Acesse: **http://localhost:3000**

---

## 📱 Usar a Aplicação

### Opção 1: Atalho Desktop
Após executar `install-desktop.sh`, procure por "Axxy Finance" no menu de aplicativos.

### Opção 2: Terminal
```bash
./start-app.sh
```

### Opção 3: npm
```bash
npm run start
```

---

## 🔄 Atualizar a Aplicação

Quando fizer mudanças no código:

```bash
npm run build
npm run start
```

Ou simplesmente:

```bash
npm run deploy
```

---

## 🗑️ Desinstalar

```bash
chmod +x uninstall.sh
./uninstall.sh
```

---

## 🐛 Problemas Comuns

### "serve: command not found"
```bash
npm install -g serve
```

### "Permission denied"
```bash
chmod +x install-desktop.sh
chmod +x start-app.sh
```

### Porta 3000 já em uso
```bash
# Matar processo na porta 3000
sudo lsof -ti:3000 | xargs kill -9
```

---

## 📚 Mais Informações

Veja o arquivo `DEPLOY.md` para opções avançadas de deploy.
