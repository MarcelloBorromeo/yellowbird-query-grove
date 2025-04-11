
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

# Initialize database tables FIRST before starting the app
echo "Setting up database tables..."
$PYTHON -c "from seed_db import init_persistent_storage; init_persistent_storage()"

# Verify that the tables were created
echo "Verifying database tables..."
$PYTHON -c "
import sqlite3
import os

session_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'agno_sessions.db')
print(f'Checking for tables in {session_db_path}')

try:
    conn = sqlite3.connect(session_db_path)
    cursor = conn.cursor()
    
    # Check if the tables exist
    cursor.execute(\"\"\"
        SELECT name FROM sqlite_master 
        WHERE type='table' AND (name='session_visualizations' OR name='session_queries')
    \"\"\")
    
    tables = cursor.fetchall()
    if len(tables) < 2:
        print('ERROR: Required tables not found! Running init_persistent_storage again...')
        from seed_db import init_persistent_storage
        init_persistent_storage()
        
        # Verify again
        cursor.execute(\"\"\"
            SELECT name FROM sqlite_master 
            WHERE type='table' AND (name='session_visualizations' OR name='session_queries')
        \"\"\")
        tables = cursor.fetchall()
        print(f'Tables after second initialization: {tables}')
    else:
        print(f'Found required tables: {tables}')
        
    conn.close()
except Exception as e:
    print(f'Error checking database tables: {e}')
"

# Start the Flask server
echo "Starting Flask server on port 5002..."
$PYTHON app.py
