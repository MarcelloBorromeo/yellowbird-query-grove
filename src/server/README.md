
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

## Troubleshooting

1. **Connection issues**: Make sure your PostgreSQL server is running and accessible with the user credentials specified.

2. **Port conflicts**: If port 5000 is already in use, you can modify the port in `app.py`.

3. **CORS issues**: By default, the server accepts requests from any origin. If you're experiencing CORS issues, check your frontend's URL.

4. **Dependencies**: If you encounter dependency conflicts, try creating a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

## API Usage

Send a POST request to `/api/query` with a JSON body containing a `question` field:

```json
{
  "question": "Show me the top 10 products by revenue"
}
```

The API will return a JSON response with:
- `RESULT`: A natural language explanation of the results
- `final_query`: The SQL query that was executed
- `visualizations`: An array of visualization objects (if applicable)

## Database Requirements

This application requires a PostgreSQL database with the following setup:
1. Database name: YellowBird
2. Username: postgres
3. Password: postgres

If your PostgreSQL setup is different, modify the connection string in `query_engine.py`.
