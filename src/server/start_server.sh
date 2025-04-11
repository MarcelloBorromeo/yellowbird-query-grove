
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

# Initialize database tables first
echo "Setting up database tables..."
cd "$(dirname "$0")"
$PYTHON -c "from seed_db import init_persistent_storage; init_persistent_storage()"

# Start the Flask server
echo "Starting Flask server on port 5002..."
$PYTHON app.py
