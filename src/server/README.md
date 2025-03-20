
# YellowBird API Server

This is the backend server for the YellowBird Data Navigator application.

## Setup

1. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```

2. Update the `query_engine.py` file with the provided Python code.

3. Set your OpenAI API key:
   ```
   export OPENAI_API_KEY="your-api-key"
   ```

4. Make sure your PostgreSQL database is running and update the connection string in `query_engine.py` if needed.

5. Run the Flask server:
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
