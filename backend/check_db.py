#!/usr/bin/env python3
import sqlite3
import json
from datetime import datetime

def check_database():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    print("=" * 80)
    print("VERIFICAÇÃO DO BANCO DE DADOS - AXXY FINANCE")
    print("=" * 80)
    print()
    
    # Listar todas as tabelas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"📊 TABELAS ENCONTRADAS ({len(tables)}):")
    for table in tables:
        print(f"  - {table[0]}")
    print()
    
    # Verificar cada tabela
    for table in tables:
        table_name = table[0]
        print("=" * 80)
        print(f"📋 TABELA: {table_name}")
        print("=" * 80)
        
        # Schema da tabela
        cursor.execute(f'PRAGMA table_info("{table_name}");')
        columns = cursor.fetchall()
        print(f"\n🔧 ESTRUTURA ({len(columns)} colunas):")
        for col in columns:
            print(f"  - {col[1]} ({col[2]}) {'NOT NULL' if col[3] else ''} {'PK' if col[5] else ''}")
        
        # Contar registros
        cursor.execute(f'SELECT COUNT(*) FROM "{table_name}";')
        count = cursor.fetchone()[0]
        print(f"\n📈 TOTAL DE REGISTROS: {count}")
        
        # Mostrar alguns registros
        if count > 0:
            cursor.execute(f'SELECT * FROM "{table_name}" LIMIT 5;')
            rows = cursor.fetchall()
            print(f"\n📄 PRIMEIROS {min(5, count)} REGISTROS:")
            
            col_names = [col[1] for col in columns]
            for i, row in enumerate(rows, 1):
                print(f"\n  Registro #{i}:")
                for col_name, value in zip(col_names, row):
                    # Formatar valores para melhor legibilidade
                    if isinstance(value, str) and len(value) > 100:
                        value = value[:100] + "..."
                    print(f"    {col_name}: {value}")
        print()
    
    # Verificações específicas
    print("=" * 80)
    print("🔍 VERIFICAÇÕES ESPECÍFICAS")
    print("=" * 80)
    
    # Verificar se há perfil de usuário
    cursor.execute("SELECT COUNT(*) FROM userprofile;")
    profile_count = cursor.fetchone()[0]
    print(f"\n✓ Perfis de usuário: {profile_count}")
    
    if profile_count > 0:
        cursor.execute("SELECT * FROM userprofile LIMIT 1;")
        profile = cursor.fetchone()
        cursor.execute("PRAGMA table_info(userprofile);")
        profile_cols = [col[1] for col in cursor.fetchall()]
        print("  Dados do perfil:")
        for col, val in zip(profile_cols, profile):
            print(f"    {col}: {val}")
    
    # Verificar contas
    cursor.execute("SELECT COUNT(*) FROM account;")
    accounts_count = cursor.fetchone()[0]
    print(f"\n✓ Contas cadastradas: {accounts_count}")
    
    # Verificar transações
    cursor.execute('SELECT COUNT(*) FROM "transaction";')
    transactions_count = cursor.fetchone()[0]
    print(f"✓ Transações registradas: {transactions_count}")
    
    # Verificar orçamentos
    cursor.execute("SELECT COUNT(*) FROM budget;")
    budgets_count = cursor.fetchone()[0]
    print(f"✓ Orçamentos criados: {budgets_count}")
    
    if budgets_count > 0:
        cursor.execute("SELECT * FROM budget;")
        budgets = cursor.fetchall()
        cursor.execute("PRAGMA table_info(budget);")
        budget_cols = [col[1] for col in cursor.fetchall()]
        print("\n  Orçamentos cadastrados:")
        for budget in budgets:
            print(f"\n    Orçamento:")
            for col, val in zip(budget_cols, budget):
                print(f"      {col}: {val}")
    
    # Verificar subitens de orçamento
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='budgetitem';")
    if cursor.fetchone():
        cursor.execute("SELECT COUNT(*) FROM budgetitem;")
        items_count = cursor.fetchone()[0]
        print(f"✓ Subitens de orçamento: {items_count}")
        
        if items_count > 0:
            cursor.execute("SELECT * FROM budgetitem;")
            items = cursor.fetchall()
            cursor.execute("PRAGMA table_info(budgetitem);")
            item_cols = [col[1] for col in cursor.fetchall()]
            print("\n  Subitens cadastrados:")
            for item in items:
                print(f"\n    Subitem:")
                for col, val in zip(item_cols, item):
                    print(f"      {col}: {val}")
    
    print("\n" + "=" * 80)
    print("✅ VERIFICAÇÃO CONCLUÍDA")
    print("=" * 80)
    
    conn.close()

if __name__ == "__main__":
    check_database()
