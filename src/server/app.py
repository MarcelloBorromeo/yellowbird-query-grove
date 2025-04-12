
import os
import json
import uuid
from flask import Flask, request, jsonify, render_template
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.agent import RunResponse 
from agno.storage.sqlite import SqliteStorage
from agno.tools import Toolkit
from dotenv import load_dotenv
import pandas as pd
import plotly.express as px
import plotly.io as pio
from sqlalchemy import create_engine, inspect, text
from typing import Any, Optional
from flask_cors import CORS

# Load environment variables
load_dotenv()

# --- Database Setup ---

# Data Source Engines (for analysis)
data_engines = {}
print("Loading data source connections:")
for key, value in os.environ.items():
    if key.startswith("DATA_DB_URI_"):
        db_key = key.replace("DATA_DB_URI_", "").lower()
        if db_key:
            try:
                print(f"  - Initializing engine for key: '{db_key}' with URI: {value[:15]}...") # Log only prefix of URI
                data_engines[db_key] = create_engine(value)
                # Test connection (optional, but good practice)
                with data_engines[db_key].connect() as conn:
                    print(f"    Connection successful for '{db_key}'.")
            except Exception as e:
                 print(f"    Error initializing engine for key '{db_key}': {e}")
        else:
            print(f"  - Skipping invalid key: {key}")

if not data_engines:
    print("Warning: No data source connections found (looking for env vars starting with DATA_DB_URI_). Using fallback default.")
    # Fallback to the original default if none are defined via env vars
    fallback_uri = 'sqlite:///data_navigator.db'
    data_engines['default'] = create_engine(fallback_uri)
    print(f"  - Initialized fallback engine for key: 'default' with URI: {fallback_uri}")


# Session Storage Database (For Agno)
SESSION_DB_URI = os.getenv('SESSION_DB_URI', 'sqlite:///agno_sessions.db')
print(f"Using session storage database: {SESSION_DB_URI}")
# Initialize Agno storage
storage = SqliteStorage(table_name="agent_sessions", db_url=SESSION_DB_URI)
# Optional: Automatically upgrade schema if needed (run once)
storage.upgrade_schema()


# --- Data Navigator Toolkit --- 
class DataNavigatorTools(Toolkit):
    def __init__(self, data_engines: dict, session_db_uri: str, **kwargs):
        super().__init__(name="data_navigator_tools", **kwargs)
        self.data_engines = data_engines
        self.session_db_uri = session_db_uri
        self.db_keys = list(data_engines.keys())
        print(f"DataNavigatorTools initialized with DB keys: {self.db_keys}")

        # Register public tool methods
        self.register(self.get_db_tables)
        self.register(self.get_table_schema)
        self.register(self.query_database)
        self.register(self.save_query_for_plotting)
        self.register(self.generate_plotly_visualization_from_saved_query)

    # ... keep existing code (get_available_db_keys_str function) ...

    def get_db_tables(self) -> str:
        """Returns a list of tables for ALL configured analysis databases, grouped by database key."""
        print("Executing get_db_tables for all databases")
        all_tables = {}
        errors = {}
        for db_key, engine in self.data_engines.items():
            try:
                inspector = inspect(engine)
                all_tables[db_key] = inspector.get_table_names()
            except Exception as e:
                print(f"Error getting tables for db_key '{db_key}': {e}")
                errors[db_key] = str(e)
                all_tables[db_key] = [] # Indicate error or inability to fetch
                
        response = {"databases": all_tables}
        if errors:
            response["errors"] = errors
        return json.dumps(response)

    # ... keep existing code (get_table_schema and query_database functions) ...

    def _create_plot_from_df(self, data_df: pd.DataFrame, plot_type: str, title: str, x_axis: str, y_axis: str, color: str = None, size: str = None) -> str:
        """Internal function to generate Plotly JSON from a DataFrame and parameters."""
        print(f"_create_plot_from_df: type={plot_type}, title={title}, x={x_axis}, y={y_axis}")
        try:
            if data_df is None or data_df.empty:
                return json.dumps({"error": "Cannot generate plot from empty or missing data."})

            df = data_df # Use the provided DataFrame directly

            plot_func = getattr(px, plot_type, None)
            if not plot_func:
                return json.dumps({"error": f"Unsupported plot type: {plot_type}. Supported types: scatter, bar, line, pie, histogram"})

            plot_args = {'data_frame': df, 'title': title}

            required_cols = []
            optional_cols = {}
            if plot_type == 'pie':
                required_cols = [x_axis, y_axis]
                plot_args['names'] = x_axis
                plot_args['values'] = y_axis
                if color and color in df.columns: optional_cols['color'] = color
            elif plot_type == 'histogram':
                required_cols = [x_axis]
                plot_args['x'] = x_axis
                if y_axis and y_axis in df.columns:
                     plot_args['y'] = y_axis
                     optional_cols['y'] = y_axis
                else:
                    if y_axis:
                        return json.dumps({"error": f"Column '{y_axis}' specified for y-axis not found in data for histogram."})
                if color and color in df.columns: optional_cols['color'] = color
            else: # scatter, bar, line etc.
                required_cols = [x_axis, y_axis]
                plot_args['x'] = x_axis
                plot_args['y'] = y_axis
                if color and color in df.columns: optional_cols['color'] = color
                if size and size in df.columns and plot_type not in ['bar', 'line']: optional_cols['size'] = size

            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                return json.dumps({"error": f"Missing required columns in data: {missing_cols}. Available columns: {list(df.columns)}"})

            for arg_name, col_name in optional_cols.items():
                 if col_name and col_name in df.columns:
                     plot_args[arg_name] = col_name
                 elif col_name:
                      return json.dumps({"error": f"Column '{col_name}' specified for '{arg_name}' not found in data. Available columns: {list(df.columns)}"})

            fig = plot_func(**plot_args)
            plot_json = pio.to_json(fig)
            return plot_json

        except Exception as e:
            print(f"Plotly generation error in _create_plot_from_df: {e}")
            import traceback
            traceback.print_exc()
            return json.dumps({"error": f"Error generating plot: {e}"})

    def generate_plotly_visualization_from_saved_query(
        self,
        agent: Agent, # Accept agent instance
        fc: Any, # Accept FunctionCall instance (use Any for now to avoid import cycle/error)
        saved_query_id: str,
        plot_type: str,
        title: str,
        x_axis: str,
        y_axis: str,
        color: Optional[str] = "",  # Default to empty string instead of None
        size: Optional[str] = ""    # Default to empty string instead of None
    ) -> str:
        """
        Generates a Plotly visualization using data from a previously saved query and saves it persistently,
        linked to the specific tool call ID.
        You MUST first use 'save_query_for_plotting' to save a query and get its 'saved_query_id'.
        Call this tool with the 'saved_query_id' and desired plot parameters: 'plot_type', 'title', 'x_axis', 'y_axis'.
        Optional: 'color', 'size'.
        Example: generate_plotly_visualization_from_saved_query(saved_query_id='uuid-abc-123', plot_type='bar', title='Sales Data', x_axis='region', y_axis='amount')
        Returns: JSON with {"status": "success", "message": "Visualization generated and saved."} on success, or {"error": "..."} on failure.
        """
        print(f"Executing generate_plotly_visualization_from_saved_query for saved_query_id: {saved_query_id}")
        print(f"Plot parameters - type: {plot_type}, title: {title}, x: {x_axis}, y: {y_axis}, color: {color}, size: {size}")
        
        # Handle None values - convert to empty strings if None
        color = "" if color is None else color
        size = "" if size is None else size

        # Retrieve current session_id directly from the agent instance
        current_session_id = agent.session_id
        if not current_session_id:
            print("Error: Agent session ID not found within tool execution context.")
            return json.dumps({"error": "Could not determine current session ID."})

        # --- Determine Tool Call ID --- 
        tool_call_id = None
        try:
            # Access FunctionCall instance passed by Agno
            if fc and hasattr(fc, 'call_id') and fc.call_id:
                tool_call_id = fc.call_id
                print(f"Attempting to associate plot with tool call ID: {tool_call_id}")
            else:
                print("Warning: FunctionCall object or call_id not found in tool context.")
        except Exception as e:
            print(f"Error accessing FunctionCall object to determine tool_call_id: {e}")
            # Continue if possible, but saving will fail if ID is missing
        
        if not tool_call_id:
             # If we couldn't get the ID, we cannot save the plot correctly.
             print("Error: Could not determine the tool call ID to associate the plot with.")
             return json.dumps({"error": "Failed to determine originating tool call ID for saving visualization."})
        # -------------------------------------

        # Retrieve stored SQL and db_key from the database
        sql_query = None
        db_key = None
        try:
            # Use the session_db_uri stored in the instance
            query_store_engine = create_engine(self.session_db_uri)
            with query_store_engine.connect() as conn:
                stmt = text("""
                    SELECT db_key, sql_query 
                    FROM session_queries 
                    WHERE session_id = :session_id AND query_id = :saved_query_id
                """)
                result = conn.execute(stmt, {"session_id": current_session_id, "saved_query_id": saved_query_id}).first()
                if result:
                     if hasattr(result, '_mapping'): 
                         db_key = result._mapping.get('db_key')
                         sql_query = result._mapping.get('sql_query')
                     else: # Fallback
                         db_key = result[0]
                         sql_query = result[1]
        except Exception as db_err:
             print(f"Error retrieving stored query from DB: {db_err}")
             return json.dumps({"error": f"Database error retrieving query info for query_id {saved_query_id}."})

        if not sql_query or not db_key:
             return json.dumps({"error": f"No stored query found for session '{current_session_id}' and query_id '{saved_query_id}'."})
        print(f"Retrieved stored query for query_id {saved_query_id}: {sql_query[:100]}... (db_key: {db_key})")

        # Execute the query
        query_df = None
        try:
            # Use data_engines stored in the instance
            if db_key not in self.data_engines:
                print(f"DB key '{db_key}' for saved query {saved_query_id} is invalid.")
                return json.dumps({"error": f"Invalid db_key: '{db_key}'. Available keys: {self.db_keys}"})
            engine = self.data_engines[db_key]
            with engine.connect() as connection:
                query_df = pd.read_sql_query(sql=text(sql_query), con=connection)
            print(f"Executed saved query {saved_query_id}, got {len(query_df)} rows.")
            # Apply truncation (consistent with direct query)
            if len(query_df) > 50:
                query_df = query_df.head(50)
                print("Truncated query result for plotting.")
        except Exception as query_err:
            print(f"Error executing saved query {saved_query_id}: {query_err}")
            return json.dumps({"error": f"Error executing query on database '{db_key}': {query_err}"})

        # Generate plot if data exists
        if query_df is not None:
            print(f"Calling _create_plot_from_df with args: {plot_type}, {title}, {x_axis}, {y_axis}")
            plotly_json_or_error = self._create_plot_from_df(
                data_df=query_df, 
                plot_type=plot_type, 
                title=title, 
                x_axis=x_axis, 
                y_axis=y_axis,
                color=color, # Pass optional args too
                size=size
            )

            # Check if plotting was successful or failed
            plot_json_to_save = None
            try:
                potential_error = json.loads(plotly_json_or_error)
                if isinstance(potential_error, dict) and 'error' in potential_error:
                     print(f"Plot generation failed internally: {potential_error['error']}")
                     return plotly_json_or_error # Return the error JSON string
                else:
                    plot_json_to_save = plotly_json_or_error
            except json.JSONDecodeError:
                plot_json_to_save = plotly_json_or_error 
            except Exception as parse_err:
                 print(f"Unexpected error checking plot generation result: {parse_err}")
                 return json.dumps({"error": f"Internal error processing plot result: {parse_err}"})

            # If we have valid plot JSON and the tool call ID, save it to the DB
            if plot_json_to_save and tool_call_id:
                try:
                    viz_engine = create_engine(self.session_db_uri)
                    with viz_engine.connect() as conn:
                        # Use the new table structure with tool_call_id
                        stmt = text("""INSERT INTO session_visualizations (session_id, tool_call_id, plotly_json) 
                                     VALUES (:session_id, :tool_call_id, :plotly_json) 
                                     ON CONFLICT(session_id, tool_call_id) DO UPDATE SET plotly_json = excluded.plotly_json;""")
                        conn.execute(stmt, {
                            "session_id": current_session_id, 
                            "tool_call_id": tool_call_id, # Use tool_call_id
                            "plotly_json": plot_json_to_save
                        })
                        if conn.engine.dialect.supports_sane_rowcount_returning is False: 
                            conn.commit()
                        print(f"Successfully generated and saved plot to DB for tool call {tool_call_id}")
                        return json.dumps({"status": "success", "message": "Visualization generated and saved."})
                except Exception as db_err:
                    print(f"Error saving visualization directly to DB: {db_err}")
                    return json.dumps({"error": f"Plot generated but failed to save to database: {db_err}"})
            elif not plot_json_to_save:
                 print("Error: plot_json_to_save is empty after generation attempt.")
                 return json.dumps({"error": "Plot generation succeeded but data was unexpectedly empty."})
            # else: tool_call_id was not found (already handled)

        else:
            return json.dumps({"error": "Query execution succeeded but resulted in no DataFrame."})

    # ... keep existing code (save_query_for_plotting function) ...

# --- Agent Setup ---
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set.")

# Instantiate the Toolkit
data_navigator_tools = DataNavigatorTools(data_engines=data_engines, session_db_uri=SESSION_DB_URI)

# Dynamically create the instructions including the available DB keys
available_db_keys_str = data_navigator_tools.get_available_db_keys_str()

# Define instructions using standard string formatting for clarity
agent_instructions_template = (
    "You are a data analysis assistant. Your goal is to help users understand data by querying databases "
    "and generating visualizations. You have access to multiple databases, identified by keys. "
    "The currently configured database keys are: [{db_keys}].\n\n"
    "**Workflow:**\n"
    "1.  **Discover:** Use `get_db_tables` and `get_table_schema(db_key=..., table_name=...)` to understand the available data across different databases. "
    "    Remember to specify the `db_key` for `get_table_schema`. The available database keys are: [{db_keys}]\n"
    "2.  **Query:** Formulate a SQL SELECT query. Use `query_database(db_key=..., sql_query=...)` to execute it against the correct database (`db_key`). "
    "    Examine the results. You might need to refine the query and call `query_database` again. Only SELECT statements are allowed.\n"
    "3.  **Save for Plotting:** If the query is suitable for visualization, use `save_query_for_plotting(db_key=..., sql_query=...)`. "
    "    Provide the **exact** `db_key` and `sql_query` string from the successful `query_database` call. "
    "    This tool will return a `saved_query_id`. **Remember or note down this ID.**\n"
    "4.  **Visualize:** To generate a plot, call `generate_plotly_visualization_from_saved_query(saved_query_id=..., plot_type=..., ...)`. "
    "    You MUST provide the `saved_query_id` obtained from the `save_query_for_plotting` step. "
    "    Specify plot details like `plot_type`, `title`, `x_axis`, `y_axis`, and optionally `color`, `size`. This tool automatically saves the generated plot.\n\n"
    "**Important Notes:**\n"
    "-   Always specify the `db_key` when calling `get_table_schema`, `query_database`, and `save_query_for_plotting`.\n"
    "-   Always use the `saved_query_id` provided by `save_query_for_plotting` when calling `generate_plotly_visualization_from_saved_query`.\n"
    "-   Explain your steps clearly. State which database and table you are targeting.\n"
    "-   Present the raw data from `query_database` results to the user."
)

agent_instructions = agent_instructions_template.format(db_keys=available_db_keys_str)

# --- Flask App Setup ---
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Enable CORS for all routes
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key") 

USER_ID = "web_user" # Constant user ID for this simple app

def _prepare_frontend_data(messages: list, session_id: str) -> tuple[list, dict]:
    """
    Transforms Agno message history into a format suitable for the frontend.
    Fetches visualizations by tool_call_id and returns that map directly.
    """
    print(f"_prepare_frontend_data: Processing {len(messages)} messages for session {session_id}")
    frontend_history = []
    viz_by_call_id_map = {} # Map from DB keyed by tool_call_id
    tool_outputs_map = {} # Temporary map: tool_call_id -> tool_output_content_dict

    # Pre-fetch all visualizations for this session (keyed by tool_call_id)
    try:
        viz_engine = create_engine(SESSION_DB_URI)
        with viz_engine.connect() as conn:
            stmt = text("SELECT tool_call_id, plotly_json FROM session_visualizations WHERE session_id = :session_id")
            result = conn.execute(stmt, {"session_id": session_id})
            for row in result:
                if hasattr(row, '_mapping'):
                    viz_by_call_id_map[row._mapping['tool_call_id']] = row._mapping['plotly_json']
                else:
                    viz_by_call_id_map[row[0]] = row[1]
        print(f"_prepare_frontend_data: Loaded {len(viz_by_call_id_map)} visualizations from DB by tool_call_id.")
    except Exception as db_load_err:
        print(f"_prepare_frontend_data: Error loading visualizations from DB: {db_load_err}")

    # First pass: Collect all tool outputs into a map for easy lookup
    for msg in messages:
        msg_dict = msg.to_dict()
        if msg_dict.get('role') == 'tool':
            tool_call_id = msg_dict.get('tool_call_id')
            if tool_call_id:
                tool_outputs_map[tool_call_id] = {
                    'content': msg_dict.get('content', ''),
                    'tool_name': msg_dict.get('tool_name', 'unknown_tool')
                }

    # Second pass: Build the frontend history structure 
    for msg in messages:
        msg_dict = msg.to_dict()
        role = msg_dict.get('role')
        msg_id_for_history = msg_dict.get('id', f"msg-placeholder-{uuid.uuid4()}") 

        if role == 'user':
            frontend_history.append({
                'role': 'user',
                'content': msg_dict.get('content', ''),
                'id': msg_id_for_history
            })
        elif role == 'assistant':
            assistant_msg = {
                'role': 'assistant',
                'content': msg_dict.get('content', ''),
                'id': msg_id_for_history,
                'tool_calls': [],
                'tool_outputs': []
            }

            # Process tool calls and find outputs
            if msg_dict.get('tool_calls'):
                for call in msg_dict['tool_calls']:
                    tool_call_id = call.get('id')
                    function_details = call.get('function', {})
                    tool_name = function_details.get('name', 'unknown_tool')
                    
                    # Add simplified tool call info (important for frontend lookup)
                    assistant_msg['tool_calls'].append({
                        'id': tool_call_id,
                        'function': {
                            'name': tool_name,
                            'arguments': function_details.get('arguments', '{}')
                        }
                    })

                    # Find and add corresponding tool output
                    if tool_call_id in tool_outputs_map:
                         output_details = tool_outputs_map[tool_call_id]
                         assistant_msg['tool_outputs'].append({
                             'tool_call_id': tool_call_id,
                             'tool_name': output_details.get('tool_name', tool_name), 
                             'content': output_details.get('content', '')
                         })

            frontend_history.append(assistant_msg)

        # Skip role 'tool' messages 

    print(f"_prepare_frontend_data: Prepared {len(frontend_history)} history items. Returning viz map with {len(viz_by_call_id_map)} items keyed by tool_call_id.")
    return frontend_history, viz_by_call_id_map 

# ... keep existing code (routes and handler functions) ...

@app.route('/')
def index():
    # List available sessions for the user from storage
    try:
        session_ids = storage.get_all_session_ids(user_id=USER_ID)
    except Exception as e:
        print(f"Error fetching session IDs from storage: {e}")
        session_ids = [] # Default to empty list on error
    return jsonify({"status": "ok", "sessions": session_ids})

@app.route('/api/query', methods=['POST'])
def handle_query():
    data = request.json
    print("yo")
    user_query = data.get('question', '')
    session_id = data.get('session_id') or str(uuid.uuid4())
    print(f"Handling query for session_id: {session_id}")

    if not user_query:
        return jsonify({"error": "No question provided"}), 400

    try:
        agent = Agent(
            agent_id="data-navigator-agent",
            model=OpenAIChat(id="gpt-4o-mini"),
            storage=storage,
            instructions=agent_instructions,
            tools=[data_navigator_tools], # Pass the Toolkit instance
            add_history_to_messages=True,
            show_tool_calls=True,
            debug_mode=False,
            num_history_responses=15
        )
        # Set agent's context for this request
        agent.session_id = session_id
        agent.user_id = USER_ID 

        # Run the agent - Tool calls (like plotting) now handle their own persistence using tool_call_id.
        response = agent.run(
            user_query,
            user_id=USER_ID,
            session_id=session_id,
            stream=False
        )

        # Save agent state immediately after run
        agent.write_to_storage()
        print(f"Agent state saved for session {session_id} after run.")

        # Prepare data for frontend using the helper function
        all_messages = agent.memory.messages if agent.memory else []
        frontend_history, visualizations_map_by_call_id = _prepare_frontend_data(all_messages, session_id)

        # Format response in the expected structure
        result = {
            "RESULT": response.content if hasattr(response, 'content') else "Query processed",
            "final_query": "Generated by Agno agent",
            "visualizations": []
        }

        # Add visualizations if available
        if visualizations_map_by_call_id:
            for tool_call_id, plotly_json in visualizations_map_by_call_id.items():
                try:
                    # Parse the JSON string into a Python object
                    plotly_data = json.loads(plotly_json)
                    
                    # Add to result's visualizations list
                    result["visualizations"].append({
                        "figure": plotly_data,
                        "type": "plotly", # Use standard type for frontend
                        "tool_call_id": tool_call_id
                    })
                except Exception as viz_err:
                    print(f"Error processing visualization JSON from DB: {viz_err}")
        
        print(f"Returning response with {len(result['visualizations'])} visualizations")
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error handling query: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
