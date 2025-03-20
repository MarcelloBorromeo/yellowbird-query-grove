
# YellowBird API Server

This is the backend server for the YellowBird Data Navigator application.

## Setup

1. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```

2. Set your OpenAI API key (the key is already included in the code, but you may want to replace it with your own):
   ```
   export OPENAI_API_KEY="your-api-key"
   ```

3. Make sure your PostgreSQL database is running and update the connection string in `query_engine.py` if needed. The default connection string is:
   ```
   postgresql://postgres:postgres@localhost:5432/YellowBird
   ```

4. Run the Flask server:
   ```
   python app.py
   ```

The API will be available at `http://localhost:5000/api/query`.

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
