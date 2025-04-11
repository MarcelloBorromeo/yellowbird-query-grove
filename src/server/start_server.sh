
#!/bin/bash

# Make the script executable
chmod +x $0

# Set the path to the Python executable
PYTHON="python"

# Check if Python is available
if ! command -v $PYTHON &> /dev/null; then
    echo "Python is not installed or not in the PATH"
    exit 1
fi

# Check if required Python packages are installed
echo "Checking required Python packages..."
$PYTHON -c "import langgraph, langchain_openai, langchain_community, pandas, plotly, flask, flask_cors" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "Installing required packages..."
    $PYTHON -m pip install langgraph langchain langchain-openai langchain-community pandas plotly flask flask-cors
fi

# Change to the directory containing this script
cd "$(dirname "$0")"

# THIS IS VERY IMPORTANT: Initialize database tables FIRST before starting the app
echo "Setting up database tables..."

# Clean approach: Try to explicitly run the init_persistent_storage function
echo "Creating required database tables for visualization storage..."
$PYTHON -c "
from seed_db import init_persistent_storage
print('Explicitly calling init_persistent_storage() to ensure tables exist')
init_persistent_storage()
"

# Extra verification step - Check that tables actually exist
echo "Verifying database tables exist..."
$PYTHON -c "
import sqlite3
import os
from pathlib import Path

# Get the absolute path to the database file
script_dir = Path(__file__).parent.absolute()
session_db_path = script_dir / 'agno_sessions.db'
print(f'Checking for tables in {session_db_path}')

try:
    # Make absolutely sure the database file exists
    if not session_db_path.exists():
        print(f'WARNING: Database file does not exist at {session_db_path}!')
        # Create an empty file to ensure SQLite can connect
        with open(session_db_path, 'w') as f:
            pass
        print(f'Created empty database file at {session_db_path}')
    
    conn = sqlite3.connect(session_db_path)
    cursor = conn.cursor()
    
    # Check if the required tables exist
    cursor.execute(\"\"\"
        SELECT name FROM sqlite_master 
        WHERE type='table' AND (name='session_visualizations' OR name='session_queries')
    \"\"\")
    
    tables = cursor.fetchall()
    table_names = [t[0] for t in tables]
    
    if 'session_visualizations' not in table_names or 'session_queries' not in table_names:
        print('WARNING: Required tables not found! Force creating tables now...')
        
        # Create session_visualizations table if it doesn't exist
        if 'session_visualizations' not in table_names:
            print('Creating session_visualizations table...')
            cursor.execute(\"\"\"
                CREATE TABLE IF NOT EXISTS session_visualizations (
                    session_id TEXT NOT NULL,
                    tool_call_id TEXT NOT NULL, 
                    plotly_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (session_id, tool_call_id)
                );
            \"\"\")
        
        # Create session_queries table if it doesn't exist
        if 'session_queries' not in table_names:
            print('Creating session_queries table...')
            cursor.execute(\"\"\"
                CREATE TABLE IF NOT EXISTS session_queries (
                    session_id TEXT NOT NULL,
                    query_id TEXT NOT NULL,
                    db_key TEXT NOT NULL,
                    sql_query TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (session_id, query_id)
                );
            \"\"\")
        
        conn.commit()
        
        # Verify again after creation
        cursor.execute(\"\"\"
            SELECT name FROM sqlite_master 
            WHERE type='table' AND (name='session_visualizations' OR name='session_queries')
        \"\"\")
        tables = cursor.fetchall()
        print(f'Tables after forced creation: {tables}')
    else:
        print(f'Found all required tables: {tables}')
        
    conn.close()
except Exception as e:
    print(f'Error checking/creating database tables: {e}')
"

# Start the Flask server
echo "Starting Flask server on port 5002..."
$PYTHON app.py
