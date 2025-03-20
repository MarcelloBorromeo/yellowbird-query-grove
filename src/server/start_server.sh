
#!/bin/bash
echo "Starting YellowBird API Server..."
echo "Checking dependencies..."

# Check if Python is installed
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "Error: Python is not installed. Please install Python 3.9+ first."
    exit 1
fi

# Use python3 command if available, otherwise use python
PYTHON_CMD="python"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
fi

# Check if pip is installed
if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    echo "Error: pip is not installed. Please install pip first."
    exit 1
fi

# Use pip3 command if available, otherwise use pip
PIP_CMD="pip"
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
fi

echo "Checking PostgreSQL connection..."
# Try to connect to PostgreSQL
if command -v psql &> /dev/null; then
    echo "Checking if PostgreSQL is running and YellowBird database exists..."
    # Note: This assumes default PostgreSQL setup. Modify if your setup is different.
    if ! psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='YellowBird'" | grep -q 1; then
        echo "Warning: YellowBird database may not exist in PostgreSQL."
        echo "You may need to create it with: createdb -U postgres YellowBird"
    fi
else
    echo "Warning: psql command not found. Cannot check PostgreSQL connection."
    echo "Make sure PostgreSQL is installed and running."
fi

echo "Installing required Python packages..."
$PIP_CMD install -r requirements.txt

echo "Starting Flask server..."
echo "Make sure you have PostgreSQL running with database 'YellowBird'..."
$PYTHON_CMD app.py

