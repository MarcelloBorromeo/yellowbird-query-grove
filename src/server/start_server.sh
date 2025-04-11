
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

# THIS IS VERY IMPORTANT: Set up the database directly with SQLite
echo "Setting up database tables directly with SQLite..."
$PYTHON -c "
import sqlite3
import os
from pathlib import Path

# Get the absolute path to the database file
script_dir = Path(__file__).parent.absolute()
session_db_path = script_dir / 'agno_sessions.db'
print(f'Creating/checking tables in {session_db_path}')

# Ensure the database file exists
if not session_db_path.exists():
    print(f'Creating new database file at {session_db_path}')
    # Create an empty file to ensure SQLite can connect
    with open(session_db_path, 'w') as f:
        pass

# Connect to the database
conn = sqlite3.connect(session_db_path)
cursor = conn.cursor()

# Create session_visualizations table
print('Creating session_visualizations table...')
cursor.execute('''
    CREATE TABLE IF NOT EXISTS session_visualizations (
        session_id TEXT NOT NULL,
        tool_call_id TEXT NOT NULL, 
        plotly_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (session_id, tool_call_id)
    );
''')

# Create session_queries table
print('Creating session_queries table...')
cursor.execute('''
    CREATE TABLE IF NOT EXISTS session_queries (
        session_id TEXT NOT NULL,
        query_id TEXT NOT NULL,
        db_key TEXT NOT NULL,
        sql_query TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (session_id, query_id)
    );
''')

# Commit changes and close connection
conn.commit()

# Verify tables were created
cursor.execute(\"\"\"
    SELECT name FROM sqlite_master 
    WHERE type='table' AND (name='session_visualizations' OR name='session_queries')
\"\"\")
tables = cursor.fetchall()
print(f'Verified tables exist: {tables}')

conn.close()
print('Database setup complete')
"

# Run the init_persistent_storage function as an additional safety measure
echo "Running init_persistent_storage function as well..."
$PYTHON -c "
from seed_db import init_persistent_storage
init_persistent_storage()
print('Completed running init_persistent_storage()')
"

# Start the Flask server
echo "Starting Flask server on port 5002..."
$PYTHON app.py
