# Axxy Finance - Sistema de Gestão Financeira Pessoal

Sistema completo de gestão financeira com análise inteligente por IA (Gemini).

## 🚀 Funcionalidades

- 📊 **Dashboard Interativo** - Visualização completa das suas finanças
- 💰 **Gestão de Transações** - Controle de receitas e despesas
- 🎯 **Metas Inteligentes** - IA sugere alocações e prioridades
- 💳 **Saúde Financeira** - Análise de dívidas com estratégias de pagamento
- 📈 **Análise Preditiva** - Projeção de saldo futuro com cenários
- 🤖 **Decisões Assistidas por IA** - Análise de vazamento financeiro
- 📑 **Relatórios** - Gráficos e insights detalhados
- 💼 **Orçamentos** - Controle de gastos por categoria
- 🏦 **Contas** - Gestão de múltiplas contas bancárias

## 🛠️ Tecnologias

### Frontend
- **React** + **TypeScript**
- **Vite** - Build tool
- **Recharts** - Gráficos interativos
- **Lucide React** - Ícones
- **Google Gemini AI** - Análise inteligente

### Backend
- **FastAPI** (Python)
- **SQLModel** - ORM
- **SQLite** - Banco de dados

## 📦 Instalação

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd axxy
```

### 2. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave da API do Gemini:
```env
VITE_GEMINI_API_KEY=sua_chave_aqui
```

**Como obter a chave:**
1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada

### 3. Instale as dependências do Frontend
```bash
npm install
```

### 4. Configure o Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 🚀 Executando o Projeto

### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Terminal 2 - Frontend
```bash
npm run dev
```

O frontend estará disponível em: `http://localhost:3000`
O backend estará disponível em: `http://localhost:8000`

## 🧪 Testando a API do Gemini

Execute o script de teste:
```bash
npx tsx test-gemini.ts
```

Você deve ver uma saída similar a:
```
🧪 Testando integração com Gemini API...

📊 Teste 1: Análise de Finanças
✅ Sugestões recebidas: [...]

🎯 Teste 2: Conselho para Meta
✅ Conselho recebido: [...]

💰 Teste 3: Análise de Alocação de Meta
✅ Análise recebida: [...]

🎉 Todos os testes passaram! API do Gemini está funcionando corretamente.
```

## 📚 Estrutura do Projeto

```
axxy/
├── components/          # Componentes React
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   ├── Goals.tsx
│   ├── FinancialHealth.tsx
│   ├── PredictiveAnalysis.tsx
│   └── ...
├── services/           # Serviços e APIs
│   ├── apiService.ts   # Comunicação com backend
│   └── geminiService.ts # Integração com Gemini AI
├── backend/            # Backend FastAPI
│   ├── main.py         # API principal
│   └── database.db     # Banco SQLite
├── utils/              # Utilitários
│   └── formatters.ts   # Formatação de moeda
└── types.ts            # Tipos TypeScript
```

## 🤖 Funcionalidades da IA

A integração com o Gemini AI fornece:

1. **Análise de Gastos** - Identifica oportunidades de economia
2. **Conselhos para Metas** - Dicas motivacionais personalizadas
3. **Alocação Inteligente** - Sugere quanto economizar mensalmente
4. **Estratégias de Dívida** - Recomenda ordem de pagamento (Avalanche vs Bola de Neve)
5. **Análise de Vazamento** - Detecta gastos desnecessários

## 🔒 Segurança

- ✅ Chave da API armazenada em `.env` (não versionada)
- ✅ `.gitignore` configurado para proteger credenciais
- ✅ Fallback para dados mock se a API falhar

## 📝 Licença

Este projeto é de uso pessoal.

## 👨‍💻 Desenvolvido por

Thyago - Sistema Axxy Finance
