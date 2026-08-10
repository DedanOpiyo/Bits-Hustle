"""Add rejection_reason column to task_submissions table."""
import pymysql
from pymysql.err import OperationalError

# Database connection settings - match alembic.ini
DB_CONFIG = {
    'host': 'localhost',
    'user': 'bitshustle_admin',
    'password': 'MH1542k$ett',
    'database': 'bitshustle',
    'cursorclass': pymysql.cursors.DictCursor
}

def add_rejection_reason_column():
    """Add the rejection_reason column to task_submissions if it doesn't exist."""
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            # Check if column exists
            cursor.execute("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = %s 
                AND TABLE_NAME = 'task_submissions' 
                AND COLUMN_NAME = 'rejection_reason'
            """, (DB_CONFIG['database'],))
            
            result = cursor.fetchone()
            
            if result:
                print("Column 'rejection_reason' already exists in task_submissions table.")
            else:
                print("Adding 'rejection_reason' column to task_submissions table...")
                cursor.execute("""
                    ALTER TABLE task_submissions 
                    ADD COLUMN rejection_reason TEXT NULL
                """)
                connection.commit()
                print("Column 'rejection_reason' added successfully.")
    except OperationalError as e:
        print(f"Database error: {e}")
    finally:
        connection.close()

if __name__ == '__main__':
    add_rejection_reason_column()
