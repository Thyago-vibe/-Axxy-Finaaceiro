import sqlite3
import os

db_path = 'backend/database.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Attempting to add 'priority' column to 'budget' table...")
    cursor.execute('ALTER TABLE budget ADD COLUMN priority TEXT DEFAULT "medio"')
    print("Column 'priority' added successfully.")
    conn.commit()
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e):
        print("Column 'priority' already exists.")
    else:
        print(f"Error adding column: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
finally:
    conn.close()
