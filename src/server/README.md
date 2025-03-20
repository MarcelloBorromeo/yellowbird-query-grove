
# YellowBird API Server

This is the backend server for the YellowBird Data Navigator application.

## Setup

1. Make sure you have Python 3.9+ and pip installed.

2. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```

3. Set your OpenAI API key (the key is already included in the code, but you may want to replace it with your own):
   ```
   export OPENAI_API_KEY="your-api-key"
   ```

4. Make sure your PostgreSQL database is running and update the connection string in `query_engine.py` if needed. The default connection string is:
   ```
   postgresql://postgres:postgres@localhost:5432/YellowBird
   ```

5. Create a PostgreSQL database named "YellowBird" if it doesn't exist:
   ```
   createdb -U postgres YellowBird
   ```

6. Run the Flask server:
   ```
   python app.py
   ```

The API will be available at `http://localhost:5001/api/query`.

## Quick Start for Beginners

If you're new to this project, follow these steps:

1. Make sure PostgreSQL is installed and running.
2. Create the YellowBird database:
   ```
   createdb -U postgres YellowBird
   ```
3. Start the backend by running:
   ```
   python app.py
   ```
4. In a separate terminal, go to the project root directory and start the frontend:
   ```
   npm run dev
   ```
5. Visit http://localhost:8080 in your browser.

## Advanced Troubleshooting

### Port 5000 is in use

If you see "Address already in use" for port 5000, especially on macOS:
1. We've updated the server to use port 5001 instead
2. On macOS, port 5000 is often used by AirPlay Receiver - you can disable it in System Preferences -> General -> AirDrop & Handoff

### "Failed to fetch" or "Could not connect to the backend server" error

If you're getting this error, here's an advanced troubleshooting guide:

1. **Verify the Flask server is running**:
   ```
   curl http://localhost:5001/
   ```
   You should get a response with `{"message":"Flask server is running","status":"ok"}`. If not, the server isn't running correctly.

2. **Check if port 5001 is in use by another application**:
   ```
   lsof -i :5001  # On Mac/Linux
   netstat -ano | findstr :5001  # On Windows
   ```
   If something else is using port 5001, either stop that process or change the port in app.py.

3. **Test the API endpoint directly**:
   ```
   curl -X POST -H "Content-Type: application/json" -d '{"question":"test"}' http://localhost:5001/api/query
   ```
   This should return JSON data if working correctly.

4. **Check for network restrictions**:
   - Some corporate networks or VPNs block localhost connections
   - If using Docker or a VM, ensure port forwarding is properly set up

5. **Debug CORS issues**:
   - Open your browser's developer tools (F12)
   - Look in the Console tab for CORS errors
   - If you see CORS errors, check that the Flask app has CORS correctly configured

6. **Check for firewall issues**:
   - Ensure your firewall isn't blocking connections to localhost:5001
   - Try temporarily disabling the firewall to test

### Checking PostgreSQL Connection

If you suspect database connection issues:

1. Test PostgreSQL connection:
   ```
   psql -U postgres -d YellowBird -c "SELECT 1;"
   ```
   If this works, PostgreSQL is running and the database exists.

2. Verify the connection string in `query_engine.py` matches your PostgreSQL setup:
   ```
   # Default connection string
   postgresql://postgres:postgres@localhost:5432/YellowBird
   ```
   
   The format is: `postgresql://username:password@host:port/database_name`

### Common Errors and Solutions

1. **ModuleNotFoundError: No module named 'X'**
   - Run `pip install -r requirements.txt` again
   - Make sure you're using the correct Python environment

2. **OperationalError: could not connect to server**
   - PostgreSQL is not running. Start it with:
     ```
     # On Mac:
     brew services start postgresql
     # On Ubuntu:
     sudo service postgresql start
     # On Windows:
     Start PostgreSQL from services.msc
     ```

3. **psycopg2.errors.UndefinedTable**
   - The YellowBird database exists but has no tables
   - You may need to initialize the database schema

4. **Permission denied: 'app.py'**
   - Make the file executable: `chmod +x app.py`

5. **Address already in use**
   - Something else is using port 5001
   - Change the port in app.py or kill the other process
