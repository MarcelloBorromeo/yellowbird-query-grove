
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

6. Run the Flask server using one of these methods:
   ```
   # Option 1: Run directly with Python
   python app.py

   # Option 2: Use the convenience script
   chmod +x start_server.sh
   ./start_server.sh
   ```

The API will be available at `http://localhost:5000/api/query`.

## Quick Start for Beginners

If you're new to this project, follow these steps:

1. Make sure PostgreSQL is installed and running.
2. Create the YellowBird database:
   ```
   createdb -U postgres YellowBird
   ```
3. Start the backend:
   ```
   cd src/server
   python app.py
   ```
4. In a separate terminal, start the frontend:
   ```
   npm run dev
   ```
5. Visit http://localhost:8080 in your browser.

## Troubleshooting Common Issues

### "Failed to fetch" error in browser

This usually means:
1. The Flask backend isn't running. Check if it's running at http://localhost:5000.
2. There might be CORS issues. Check your browser console (F12) for CORS errors.
3. The backend server might be running on a different port. Check the console output when starting Flask.

Solution:
- Make sure Flask is running with `python app.py` in the src/server directory
- Check for any error messages in the Flask console
- Verify API_URL in src/lib/queryService.ts is set to 'http://localhost:5000/api/query'

### PostgreSQL connection issues

If Flask can't connect to PostgreSQL:
1. Verify PostgreSQL is running: `pg_isready` or `pg_ctl status`
2. Check if the YellowBird database exists: `psql -U postgres -c "\l" | grep YellowBird`
3. Test the connection: `psql -U postgres -d YellowBird -c "SELECT 1;"`

### Port conflicts

If port 5000 is already in use:
1. Find and stop the process using port 5000: `lsof -i :5000` or `netstat -tuln | grep 5000`
2. OR change the port in app.py (typically at the bottom): `app.run(debug=True, port=5001)`
   Then update API_URL in queryService.ts to match

### Database Requirements

This application requires a PostgreSQL database with the following setup:
1. Database name: YellowBird
2. Username: postgres
3. Password: postgres

If your PostgreSQL setup is different, modify the connection string in `query_engine.py`.
