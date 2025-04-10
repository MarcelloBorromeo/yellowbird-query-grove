
import os
import pandas as pd
from sqlalchemy import create_engine, text, inspect

# --- Define DB path relative to this script ---

SESSION_DB_URI = os.getenv('SESSION_DB_URI', 'sqlite:///agno_sessions.db')
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(SCRIPT_DIR, 'data_navigator.db')
# --- Use absolute path ---
DB_URI = os.getenv('DATA_DB_URI', f'sqlite:///{DEFAULT_DB_PATH}')
TABLE_NAME = 'sales'

def seed_database():
    print(f"Seeding database at: {DB_URI}")
    engine = create_engine(DB_URI)

    try:
        with engine.connect() as connection:
            transaction = connection.begin()
            try:
                inspector = inspect(engine)
                if not inspector.has_table(TABLE_NAME):
                    print(f"Creating table '{TABLE_NAME}'...")
                    # Use text() for compatibility
                    connection.execute(text(f'''
                        CREATE TABLE {TABLE_NAME} (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            product TEXT,
                            region TEXT,
                            amount REAL,
                            sale_date DATE
                        )
                    '''))
                    print(f"Table '{TABLE_NAME}' created.")
                else:
                    print(f"Table '{TABLE_NAME}' already exists.")

                # Check if table is empty before seeding
                count_result = connection.execute(text(f"SELECT COUNT(*) FROM {TABLE_NAME}")).scalar_one_or_none()
                
                if count_result == 0:
                    print(f"Seeding table '{TABLE_NAME}'...")
                    sample_data = [
                        {'product': 'Laptop', 'region': 'North', 'amount': 1200.50, 'sale_date': '2024-01-15'},
                        {'product': 'Keyboard', 'region': 'South', 'amount': 75.00, 'sale_date': '2024-01-20'},
                        {'product': 'Monitor', 'region': 'East', 'amount': 300.75, 'sale_date': '2024-02-10'},
                        {'product': 'Mouse', 'region': 'West', 'amount': 25.50, 'sale_date': '2024-02-12'},
                        {'product': 'Laptop', 'region': 'North', 'amount': 1250.00, 'sale_date': '2024-03-05'},
                        {'product': 'Webcam', 'region': 'South', 'amount': 50.00, 'sale_date': '2024-03-08'},
                        {'product': 'Monitor', 'region': 'West', 'amount': 310.00, 'sale_date': '2024-04-22'},
                        {'product': 'Keyboard', 'region': 'East', 'amount': 80.00, 'sale_date': '2024-04-25'},
                        {'product': 'Laptop', 'region': 'South', 'amount': 1150.00, 'sale_date': '2024-05-01'},
                        {'product': 'Mouse', 'region': 'North', 'amount': 28.00, 'sale_date': '2024-05-03'}
                    ]
                    df = pd.DataFrame(sample_data)
                    df.to_sql(TABLE_NAME, con=connection, if_exists='append', index=False)
                    print(f"Table '{TABLE_NAME}' seeded with {len(df)} rows.")
                else:
                     print(f"Table '{TABLE_NAME}' already contains {count_result} row(s). Skipping seeding.")

                transaction.commit()
                print("Transaction committed.")
            except Exception as inner_e:
                 print(f"Error during transaction: {inner_e}")
                 transaction.rollback()
                 print("Transaction rolled back.")
                 raise # Re-raise the exception after rollback

    except Exception as e:
        print(f"Database connection or setup error: {e}")
    finally:
        if 'engine' in locals():
            engine.dispose()

def init_persistent_storage():
    """Creates required persistent storage tables if they don't exist."""
    try:
        # Assume viz storage uses the same DB as session storage for simplicity
        engine = create_engine(SESSION_DB_URI)
        with engine.connect() as connection:
            inspector = inspect(engine)

            # Visualization Table
            if not inspector.has_table("session_visualizations"):
                print("Creating 'session_visualizations' table...")
                connection.execute(text("""
                    CREATE TABLE session_visualizations (
                        session_id TEXT NOT NULL,
                        tool_call_id TEXT NOT NULL, -- Changed from message_id
                        plotly_json TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (session_id, tool_call_id) -- Changed PK
                    );
                """))
                if connection.engine.dialect.supports_sane_rowcount_returning is False:
                     connection.commit() 
                print("Table 'session_visualizations' created.")
            else:
                print("Table 'session_visualizations' already exists.")

            # Cached Query Table
            if not inspector.has_table("session_queries"):
                print("Creating 'session_queries' table...")
                connection.execute(text("""
                    CREATE TABLE session_queries (
                        session_id TEXT NOT NULL,
                        query_id TEXT NOT NULL, -- Unique ID generated by the save tool
                        db_key TEXT NOT NULL,
                        sql_query TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (session_id, query_id)
                    );
                """))
                if connection.engine.dialect.supports_sane_rowcount_returning is False:
                     connection.commit()
                print("Table 'session_queries' created.")
            else:
                print("Table 'session_queries' already exists.")

    except Exception as e:
        print(f"Error initializing persistent storage tables: {e}")
if __name__ == "__main__":
    seed_database() 
    init_persistent_storage()
