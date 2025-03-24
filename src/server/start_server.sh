
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

# Check if curl is installed (for testing API connectivity)
if command -v curl &> /dev/null; then
    HAS_CURL=true
else
    HAS_CURL=false
    echo "Warning: curl is not installed. Cannot perform API connectivity test."
fi

echo "Checking PostgreSQL connection..."
# Try to connect to PostgreSQL
if command -v psql &> /dev/null; then
    echo "Checking if PostgreSQL is running and YellowBird database exists..."
    # Note: This assumes default PostgreSQL setup. Modify if your setup is different.
    if ! psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='YellowBird'" | grep -q 1; then
        echo "Warning: YellowBird database may not exist in PostgreSQL."
        echo "You may need to create it with: createdb -U postgres YellowBird"
    else
        echo "PostgreSQL connection successful and YellowBird database exists."
    fi
else
    echo "Warning: psql command not found. Cannot check PostgreSQL connection."
    echo "Make sure PostgreSQL is installed and running."
fi

echo "Installing required Python packages..."
# Improved package installation with better error handling
for package in $(cat requirements.txt)
do
    echo "Installing $package..."
    $PIP_CMD install $package || {
        echo "Error installing $package. Will try to continue..."
    }
done

PORT=5002  # Updated port from 5001 to 5002

echo "Testing network connectivity on port $PORT..."
# Check if port $PORT is already in use
if command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":$PORT "; then
        echo "Warning: Port $PORT is already in use. The Flask app may fail to start."
        echo "Try stopping any existing Flask applications or change the port in app.py."
    else
        echo "Port $PORT is available."
    fi
elif command -v lsof &> /dev/null; then
    if lsof -i :$PORT &> /dev/null; then
        echo "Warning: Port $PORT is already in use. The Flask app may fail to start."
        echo "Try stopping any existing Flask applications or change the port in app.py."
    else
        echo "Port $PORT is available."
    fi
else
    echo "Cannot check port availability. Make sure port $PORT is not used by another application."
fi

# Check for common CORS issues
echo "Checking for CORS configuration in app.py..."
if grep -q "CORS" "app.py"; then
    echo "CORS is configured in app.py. This is good."
else
    echo "Warning: CORS might not be properly configured in app.py."
fi

echo "Starting Flask server..."
echo "Make sure you have PostgreSQL running with database 'YellowBird'..."
$PYTHON_CMD app.py &
FLASK_PID=$!

# Wait for Flask to start
echo "Waiting for Flask server to start (5 seconds)..."
sleep 5

# Test the API endpoint
if [ "$HAS_CURL" = true ]; then
    echo "Testing API endpoint connectivity..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"question":"test"}' http://localhost:$PORT/api/query)
    
    if [ "$RESPONSE" = "200" ]; then
        echo "✅ API endpoint is accessible. Your backend is working correctly!"
        echo "If your frontend still can't connect, check browser console for CORS errors."
    else
        echo "❌ API endpoint test failed with status code: $RESPONSE"
        echo "The backend server may not be running correctly."
    fi
else
    echo "Skipping API endpoint test (curl not installed)."
fi

echo "-----------------------------------"
echo "Backend server should now be running at http://localhost:$PORT"
echo "To test the API manually, use:"
echo "curl -X POST -H \"Content-Type: application/json\" -d '{\"question\":\"test\"}' http://localhost:$PORT/api/query"
echo ""
echo "If you see 'Failed to fetch' errors in your frontend:"
echo "1. Make sure the Flask server is running (check for errors above)"
echo "2. Check your browser console for CORS errors"
echo "3. Ensure your frontend is using http://localhost:$PORT/api/query as the API URL"
echo "-----------------------------------"

# Keep the script running until Ctrl+C
echo "Press Ctrl+C to stop the server..."
wait $FLASK_PID
