# Correção do Tipo de Dívida e IA

## Mudanças Realizadas

### 1. Correção do Backend (Docker & Main.py)
- O arquivo `main.py` dentro do container estava desatualizado.
- Foi realizado atualização manual e rebuild do container.
- O modelo `Debt` no backend foi atualizado para incluir:
  - `debtType`: Tipo de dívida ('fixo' ou 'parcelado')
  - `totalInstallments`: Total de parcelas
  - `currentInstallment`: Parcela atual
- As colunas correspondentes foram adicionadas manualmente ao banco de dados SQLite.

### 2. Correção do Frontend (UI)
- O formulário de Dívida agora oculta "Valor Restante" para dívidas do tipo "Fixo".
- O campo "Valor Restante" é enviado como `0` automaticamente para dívidas fixas.

### 3. Correção da IA (Endpoints)
- Corrigido erro de comparação de datas (String vs Date).
- Corrigido nomes de campos inconsistentes (`due_date` -> `dueDate`).
- Agora a IA consegue ler as dívidas e transações corretamente.

## Como Validar

1. **Atualizar a página** com Ctrl+F5 para garantir que o frontend está atualizado.
2. **Editar a Dívida "Net"**:
   - Clique no ícone de lápis.
   - Mude o Tipo para "Fixo".
   - Salve.
   - Verifique se na tabela aparece o badge "Fixo".
3. **Testar IA**:
   - Clique no botão "Atualizar" na seção de Análise Inteligente.
   - Verifique se os cards são preenchidos.
