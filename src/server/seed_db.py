
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
    # ... keep existing code (database seeding logic)

def init_persistent_storage():
    """Creates required persistent storage tables if they don't exist."""
    print("Initializing persistent storage tables...")
    try:
        # Assume viz storage uses the same DB as session storage for simplicity
        engine = create_engine(SESSION_DB_URI)
        
        # Print the database path for debugging
        print(f"Creating tables in database: {SESSION_DB_URI}")
        
        with engine.connect() as connection:
            inspector = inspect(engine)

            # Visualization Table
            if not inspector.has_table("session_visualizations"):
                print("Creating 'session_visualizations' table...")
                connection.execute(text("""
                    CREATE TABLE IF NOT EXISTS session_visualizations (
                        session_id TEXT NOT NULL,
                        tool_call_id TEXT NOT NULL, 
                        plotly_json TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (session_id, tool_call_id)
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
                print("Table 'session_queries' created.")
            else:
                print("Table 'session_queries' already exists.")
                
        # Verify that the tables were created successfully
        with engine.connect() as connection:
            # Check session_visualizations
            result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='session_visualizations'"))
            if result.fetchone():
                print("Verified: 'session_visualizations' table exists")
            else:
                print("ERROR: 'session_visualizations' table was not created")
                # Try direct creation as fallback
                try:
                    connection.execute(text("""
                        CREATE TABLE IF NOT EXISTS session_visualizations (
                            session_id TEXT NOT NULL,
                            tool_call_id TEXT NOT NULL, 
                            plotly_json TEXT NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (session_id, tool_call_id)
                        );
                    """))
                    connection.commit()
                    print("Fallback creation attempt for session_visualizations completed")
                except Exception as create_err:
                    print(f"Fallback creation failed: {create_err}")
                
            # Check session_queries
            result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='session_queries'"))
            if result.fetchone():
                print("Verified: 'session_queries' table exists")
            else:
                print("ERROR: 'session_queries' table was not created")
                # Try direct creation as fallback
                try:
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
                    connection.commit()
                    print("Fallback creation attempt for session_queries completed")
                except Exception as create_err:
                    print(f"Fallback creation failed: {create_err}")

    except Exception as e:
        print(f"Error initializing persistent storage tables: {e}")
        # Print more detailed error information
        import traceback
        traceback.print_exc()
        
        # Try a direct SQLite approach as a last resort
        try:
            import sqlite3
            db_path = SESSION_DB_URI.replace('sqlite:///', '')
            print(f"Attempting direct SQLite connection to {db_path}")
            
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
            conn.close()
            print("Direct SQLite table creation completed as fallback")
        except Exception as sqlite_err:
            print(f"Direct SQLite approach also failed: {sqlite_err}")

if __name__ == "__main__":
    # Initialize persistent storage first to ensure tables exist
    init_persistent_storage()
    # Then seed the main database
    seed_database()
