import sqlite3
import os

db_path = 'backend/database.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Add priority column
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

# Add goal column
try:
    print("Attempting to add 'goal' column to 'budget' table...")
    cursor.execute('ALTER TABLE budget ADD COLUMN goal TEXT DEFAULT NULL')
    print("Column 'goal' added successfully.")
    conn.commit()
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e):
        print("Column 'goal' already exists.")
    else:
        print(f"Error adding column: {e}")

conn.close()
print("Migration complete!")
