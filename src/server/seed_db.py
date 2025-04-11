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
    """Seeds the database with initial data from a CSV file."""
    print("Seeding database...")
    try:
        # Use absolute path for data_navigator.db
        engine = create_engine(DB_URI)
        
        # Check if the table already exists
        inspector = inspect(engine)
        if TABLE_NAME in inspector.get_table_names():
            print(f"Table '{TABLE_NAME}' already exists. Skipping seeding.")
            return

        # Load data from CSV
        csv_path = os.path.join(SCRIPT_DIR, 'sales_data.csv')
        df = pd.read_csv(csv_path)

        # Write data to SQLite
        df.to_sql(TABLE_NAME, engine, if_exists='replace', index=False)
        print(f"Seeded table '{TABLE_NAME}' with data from '{csv_path}'")

    except Exception as e:
        print(f"Error seeding database: {e}")

def init_persistent_storage():
    """Creates required persistent storage tables if they don't exist."""
    print("Initializing persistent storage tables...")
    try:
        # Try SQLAlchemy approach first
        engine = create_engine(SESSION_DB_URI)
        
        # Print the database path for debugging
        print(f"Creating tables in database: {SESSION_DB_URI}")
        
        with engine.connect() as connection:
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS session_visualizations (
                    session_id TEXT NOT NULL,
                    tool_call_id TEXT NOT NULL, 
                    plotly_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (session_id, tool_call_id)
                );
            """))
            
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS session_queries (
                    session_id TEXT NOT NULL,
                    query_id TEXT NOT NULL,
                    db_key TEXT NOT NULL,
                    sql_query TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (session_id, query_id)
                );
            """))
            
            if connection.engine.dialect.supports_sane_rowcount_returning is False:
                connection.commit()
            
            print("Tables created successfully via SQLAlchemy")
                
        # Verify that the tables were created successfully
        with engine.connect() as connection:
            result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND (name='session_visualizations' OR name='session_queries')"))
            tables = [row[0] for row in result.fetchall()]
            print(f"Verified tables in database: {tables}")
            
            if 'session_visualizations' not in tables or 'session_queries' not in tables:
                print("Warning: Some tables are missing. Falling back to direct SQLite approach.")
                raise Exception("Tables not created successfully via SQLAlchemy")

    except Exception as e:
        print(f"Error with SQLAlchemy approach: {e}")
        # Fall back to direct SQLite approach
        try:
            import sqlite3
            # Get DB path from URI (strip sqlite:/// prefix)
            db_path = SESSION_DB_URI.replace('sqlite:///', '')
            if not os.path.isabs(db_path):
                # If relative path, make it absolute based on script directory
                db_path = os.path.join(SCRIPT_DIR, db_path)
            
            print(f"Falling back to direct SQLite connection at: {db_path}")
            
            # Make sure the directory exists
            os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
            
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Create visualization table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS session_visualizations (
                    session_id TEXT NOT NULL,
                    tool_call_id TEXT NOT NULL, 
                    plotly_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (session_id, tool_call_id)
                );
            """)
            
            # Create queries table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS session_queries (
                    session_id TEXT NOT NULL,
                    query_id TEXT NOT NULL,
                    db_key TEXT NOT NULL,
                    sql_query TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (session_id, query_id)
                );
            """)
            
            conn.commit()
            
            # Verify tables were created
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name='session_visualizations' OR name='session_queries')")
            tables = cursor.fetchall()
            print(f"Direct SQLite approach - Tables created: {tables}")
            
            conn.close()
            print("Tables created successfully via direct SQLite")
        except Exception as sqlite_err:
            print(f"Critical error! Both approaches failed. SQLite error: {sqlite_err}")

if __name__ == "__main__":
    # Initialize persistent storage first to ensure tables exist
    init_persistent_storage()
    # Then seed the main database
    seed_database()
