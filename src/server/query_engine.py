# PostgreSQL Query Generation and Execution with LangGraph & OpenAI (With Plotly Visualization)
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_community.utilities.sql_database import SQLDatabase
from langchain.chains import create_sql_query_chain
from langchain_core.runnables import RunnableLambda
from typing import Dict, List, Any, Optional, TypedDict
import os
import logging
import re
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import json
import numpy as np
from io import StringIO
from functools import wraps

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Error handling decorator
def log_errors(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}")
            raise
    return wrapper

# Set OpenAI API key
os.environ["OPENAI_API_KEY"] = "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"

# Connect to PostgreSQL database
LOCAL_PG_DB_URL = "postgresql://postgres:postgres@localhost:5432/YellowBird"
db = SQLDatabase.from_uri(LOCAL_PG_DB_URL)
logger.info("Successfully connected to the database")

# Initialize LLM
llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo", openai_api_key=os.environ["OPENAI_API_KEY"])
logger.info("Successfully initialized LLM")

# Create SQL Chain
def create_postgres_friendly_sql_chain(llm, db):
    standard_chain = create_sql_query_chain(llm, db)
    def fix_sql_query(sql_query):
        sql_query = sql_query.replace("`", "")
        pattern = r'(WHERE|AND|OR)\s+(\w+\.\w+|\w+)\s*([=><])\s*(\w+)(?!\s*[\w\.])'
        def replace_match(match):
            clause, field, operator, value = match.groups()
            if not value.isdigit() and value.lower() not in ('true', 'false', 'null'):
                return f"{clause} {field} {operator} '{value}'"
            return match.group(0)
        sql_query = re.sub(pattern, replace_match, sql_query)
        logger.info(f"Fixed SQL query: {sql_query}")
        return sql_query
    return standard_chain | RunnableLambda(fix_sql_query)

sql_chain = create_postgres_friendly_sql_chain(llm, db)

# State definition for LangGraph
class GraphState(TypedDict):
    question: str
    sql_query: Optional[str]
    data: Optional[Any]
    dataframe: Optional[pd.DataFrame]
    visualization_needed: Optional[bool]
    visualizations: Optional[List[Dict[str, Any]]]
    explanation: Optional[str]
    error: Optional[str]

# Node functions
@log_errors
def generate_data_context() -> str:
    schema_info = db.get_table_info()
    tables_info = db.get_usable_table_names()
    columns_by_table = {}
    for table in tables_info:
        try:
            columns_query = f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'"
            columns_data = db.run(columns_query)
            columns_by_table[table] = columns_data
        except Exception as e:
            logger.error(f"Error fetching columns for table {table}: {str(e)}")
            columns_by_table[table] = "Column information unavailable"
    return f"""
    You are analyzing a PostgreSQL database with the following structure:
    Schema Information: {schema_info}
    Available Tables: {', '.join(tables_info)}
    Detailed Column Information by Table: {columns_by_table}
    Important Rules:
    1. Do NOT use backticks (`) or double quotes (") around column or table names
    2. Always use single quotes (') for string literals in WHERE clauses
    3. Ensure all SQL is PostgreSQL compatible
    """

@log_errors
def analyze_question_node(state: GraphState) -> GraphState:
    """Analyze if the user's question needs visualization"""
    question = state['question']
    visualization_prompt = f"""
    Analyze this question and determine if it would benefit from a data visualization:
    "{question}"
    
    Respond with 'true' if ANY of these conditions are met:
    1. The question explicitly asks for a chart, graph, visualization, or similar
    2. The question is about trends, patterns, distributions, comparisons, rankings
    3. The question involves numerical data that would be clearer with a visual
    4. The question uses words like "show me", "display", "plot", "illustrate"
    5. The question is about "how many", percentages, proportions, or statistics
    
    Respond with ONLY 'true' or 'false'.
    """
    
    try:
        viz_needed_response = llm.invoke(visualization_prompt).content.strip().lower()
        viz_needed = viz_needed_response == 'true'
        logger.info(f"Visualization needed analysis: {viz_needed}")
        # Always return True for visualization to ensure all queries get visualizations
        return {"visualization_needed": True}
    except Exception as e:
        logger.error(f"Error in visualization analysis: {str(e)}")
        # Default to showing visualization if analysis fails
        return {"visualization_needed": True}

@log_errors
def generate_sql_node(state: GraphState) -> GraphState:
    data_context = generate_data_context()
    enhanced_question = f"""
    {data_context}
    User Question: {state['question']}
    Generate a PostgreSQL-compatible SQL query.
    Make sure to properly quote string literals with single quotes.
    Do NOT use backticks (`) or double quotes (") around column or table names.
    Return ONLY the SQL query without any explanation or comments.
    """
    sql_query = sql_chain.invoke({"question": enhanced_question})
    logger.info(f"Generated SQL query: {sql_query}")
    return {"sql_query": sql_query}

@log_errors
def execute_sql_node(state: GraphState) -> GraphState:
    data = db.run(state["sql_query"])
    logger.info(f"Successfully executed SQL query with result: {data}")
    return {"data": data}

def extract_column_names_from_query(sql_query: str) -> List[str]:
    match = re.search(r'SELECT\s+(.*?)\s+FROM', sql_query, re.IGNORECASE | re.DOTALL)
    if not match:
        return []
    columns_part = match.group(1)
    if columns_part.strip() == '*':
        return []
    columns = []
    current = ""
    parenthesis_count = 0
    for char in columns_part:
        if char == '(' and ')' in columns_part[columns_part.index(char):]:
            parenthesis_count += 1
            current += char
        elif char == ')':
            parenthesis_count -= 1
            current += char
        elif char == ',' and parenthesis_count == 0:
            columns.append(current.strip())
            current = ""
        else:
            current += char
    if current.strip():
        columns.append(current.strip())
    column_names = []
    for col in columns:
        as_match = re.search(r'\bAS\s+([a-zA-Z0-9_]+)', col, re.IGNORECASE)
        if as_match:
            column_names.append(as_match.group(1))
            continue
        alias_match = re.search(r'([a-zA-Z0-9_.]+)\s+([a-zA-Z0-9_]+)$', col)
        if alias_match:
            column_names.append(alias_match.group(2))
            continue
        name_match = re.search(r'([a-zA-Z0-9_.]+)$', col)
        if name_match:
            simple_name = name_match.group(1)
            if '.' in simple_name:
                simple_name = simple_name.split('.')[-1]
            column_names.append(simple_name)
            continue
        column_names.append(col.replace(' ', '_'))
    return column_names

@log_errors
def convert_to_dataframe(data: Any, sql_query: str = None) -> pd.DataFrame:
    if isinstance(data, pd.DataFrame):
        return data
    if not data:
        return pd.DataFrame()
    if isinstance(data, str):
        extracted_columns = extract_column_names_from_query(sql_query) if sql_query else []
        try:
            data_list = eval(data, {"__builtins__": {}}, {})
            if isinstance(data_list, list) and data_list:
                columns = extracted_columns if extracted_columns and len(extracted_columns) == len(data_list[0]) else [f'col_{i}' for i in range(len(data_list[0]))]
                df = pd.DataFrame(data_list, columns=columns)
                df.columns = [col.strip('"\'') for col in df.columns]
                logger.info(f"Converted to DataFrame with cleaned columns: {df.columns.tolist()}")
                return df
        except:
            try:
                df = pd.read_csv(StringIO(data), sep=r'\s+|\t|,')
                df.columns = [col.strip('"\'') for col in df.columns]
                logger.info(f"Converted to DataFrame with cleaned columns: {df.columns.tolist()}")
                return df
            except:
                df = pd.DataFrame({'raw_data': [data]})
                logger.info(f"Converted to DataFrame with raw data column")
                return df
    df = pd.DataFrame({'raw_data': [str(data)]})
    logger.info(f"Converted to DataFrame with raw data column")
    return df

@log_errors
def decide_visualization_node(state: GraphState) -> Dict[str, str]:
    """Decision node to determine if we should create visualizations"""
    logger.info("Visualization analysis: Always generating visualizations")
    return {"next": "process_data"}  # Always process data for visualization

@log_errors
def process_data_node(state: GraphState) -> GraphState:
    """Process and transform data into visualizations"""
    # Force creation of a test DataFrame if none exists for demonstration
    if not state.get("data") or (isinstance(state["data"], list) and len(state["data"]) == 0):
        logger.info("No query data received, creating demonstration data")
        # Create sample data for visualization
        df = pd.DataFrame({
            'Category': ['A', 'B', 'C', 'D', 'E'],
            'Values': [25, 40, 30, 35, 28],
            'Series': ['X', 'X', 'Y', 'Y', 'Z']
        })
        state["dataframe"] = df
    else:
        df = convert_to_dataframe(state["data"], state["sql_query"])
        logger.info(f"Converted data to DataFrame with shape: {df.shape}")
        state["dataframe"] = df
    
    if df.empty:
        logger.info("Empty DataFrame, creating demonstration data")
        # Create sample data for empty results
        df = pd.DataFrame({
            'Category': ['No Data A', 'No Data B', 'No Data C'],
            'Values': [10, 15, 8]
        })
        state["dataframe"] = df
    
    # Create simple visualizations based on the data
    visualizations = []
    try:
        # Create a bar chart
        fig_bar = px.bar(
            df, 
            x=df.columns[0], 
            y=df.columns[1] if len(df.columns) > 1 else None,
            title=f"Bar Chart - {state['question']}"
        )
        fig_bar.update_layout(
            template='plotly_white',
            margin=dict(l=40, r=40, t=50, b=40),
            height=400,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)'
        )
        visualizations.append({
            'type': 'bar',
            'figure': fig_bar.to_dict(),
            'description': f"Bar Chart - {state['question']}",
            'reason': f"Bar chart showing distribution based on query: {state['question']}"
        })
        logger.info("Created bar chart visualization")
        
        # Create a pie chart if we have at least 2 columns
        if len(df.columns) > 1:
            fig_pie = px.pie(
                df, 
                names=df.columns[0], 
                values=df.columns[1],
                title=f"Pie Chart - {state['question']}"
            )
            fig_pie.update_layout(
                template='plotly_white',
                margin=dict(l=40, r=40, t=50, b=40),
                height=400,
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)'
            )
            visualizations.append({
                'type': 'pie',
                'figure': fig_pie.to_dict(),
                'description': f"Pie Chart - {state['question']}",
                'reason': f"Pie chart showing proportion based on query: {state['question']}"
            })
            logger.info("Created pie chart visualization")
    except Exception as e:
        logger.error(f"Error creating visualizations: {str(e)}")
        # Create a fallback visualization
        try:
            # Simple fallback chart
            fig_fallback = go.Figure(data=[
                go.Bar(x=['Error'], y=[1], name='Error')
            ])
            fig_fallback.update_layout(
                title="Fallback Visualization",
                template='plotly_white',
                height=400
            )
            visualizations.append({
                'type': 'bar',
                'figure': fig_fallback.to_dict(),
                'description': "Fallback Visualization",
                'reason': "Error occurred during visualization generation"
            })
            logger.info("Created fallback visualization")
        except Exception as fallback_err:
            logger.error(f"Failed to create fallback visualization: {fallback_err}")
    
    return {"dataframe": df, "visualizations": visualizations}

@log_errors
def explain_results_node(state: GraphState) -> GraphState:
    """Generate explanation with visualizations"""
    data_context = generate_data_context()
    viz_info = ""
    if state.get("visualizations"):
        viz_info = "Generated Visualizations:\n" + "\n".join(
            f"- {viz['description']}\n  Type: {viz['type']}"
            for viz in state["visualizations"]
        )
    
    prompt = f"""
    {data_context}
    User asked: {state['question']}
    Generated SQL Query: {state['sql_query']}
    SQL Query Results: {state['data']}
    {viz_info}
    
    Summarize the results in a clear, accurate, human-friendly way. Provide key insights.
    If visualizations were created, explain why they were selected and what insights they provide.
    """
    explanation = llm.invoke(prompt).content
    logger.info("Successfully generated explanation with visualization references")
    return {"explanation": explanation}

@log_errors
def explain_without_viz_node(state: GraphState) -> GraphState:
    """Generate explanation without visualizations"""
    data_context = generate_data_context()
    
    prompt = f"""
    {data_context}
    User asked: {state['question']}
    Generated SQL Query: {state['sql_query']}
    SQL Query Results: {state['data']}
    
    Summarize the results in a clear, accurate, human-friendly way. 
    Focus on providing a direct and concise answer to the user's question.
    """
    explanation = llm.invoke(prompt).content
    logger.info("Successfully generated explanation without visualizations")
    return {"explanation": explanation, "visualizations": []}

# Build the graph
def build_graph():
    graph = StateGraph(GraphState)
    
    # Add nodes
    graph.add_node("analyze_question", analyze_question_node)
    graph.add_node("generate_sql", generate_sql_node)
    graph.add_node("execute_sql", execute_sql_node)
    graph.add_node("decide_visualization", decide_visualization_node)
    graph.add_node("process_data", process_data_node)
    graph.add_node("explain_results", explain_results_node)
    graph.add_node("explain_without_viz", explain_without_viz_node)
    
    # Set entry point
    graph.set_entry_point("analyze_question")
    
    # Add edges - main flow
    graph.add_edge("analyze_question", "generate_sql")
    graph.add_edge("generate_sql", "execute_sql")
    graph.add_edge("execute_sql", "decide_visualization")
    
    # Conditional branch based on visualization decision
    graph.add_conditional_edges(
        "decide_visualization",
        lambda x: x["next"],
        {
            "process_data": "process_data",
            "explain_without_viz": "explain_without_viz"
        }
    )
    
    # Final paths
    graph.add_edge("process_data", "explain_results")
    graph.add_edge("explain_results", END)
    graph.add_edge("explain_without_viz", END)
    
    return graph.compile()

# Helper function to make json serializable (handling numpy types)
def _make_json_serializable(obj):
    if isinstance(obj, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32, np.int64,
                         np.uint8, np.uint16, np.uint32, np.uint64)):
        return int(obj)
    elif isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, (np.complex_, np.complex64, np.complex128)):
        return {'real': float(obj.real), 'imag': float(obj.imag)}
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, dict):
        return {k: _make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list) or isinstance(obj, tuple):
        return [_make_json_serializable(i) for i in obj]
    else:
        return obj

# Main query function
def run_query(question: str) -> Dict[str, Any]:
    try:
        app = build_graph()
        result = app.invoke({"question": question})
        logger.info(f"Query result keys: {list(result.keys())}")
        
        # Ensure visualizations are JSON serializable
        visualizations = []
        if "visualizations" in result and result["visualizations"]:
            for viz in result["visualizations"]:
                if "figure" in viz:
                    viz["figure"] = _make_json_serializable(viz["figure"])
                visualizations.append(viz)
            logger.info(f"Processed {len(visualizations)} visualizations")
        else:
            logger.info("No visualizations in result, creating default visualization")
            # Create a default visualization if none are present
            default_viz = create_test_visualization()["visualizations"][0]
            visualizations = [default_viz]
        
        return {
            "RESULT": result.get("explanation", "Query processed successfully."),
            "final_query": result.get("sql_query", "No SQL query generated"),
            "visualizations": visualizations
        }
    except Exception as e:
        logger.error(f"Query processing failed: {str(e)}")
        # Return test visualization on error
        return create_test_visualization()

# Create a test visualization for debugging purposes
def create_test_visualization():
    """Create a test visualization to ensure the frontend can display it"""
    df = pd.DataFrame({
        'Category': ['A', 'B', 'C', 'D'],
        'Values': [25, 40, 30, 35]
    })
    
    # Create a simple bar chart
    fig = px.bar(df, x='Category', y='Values', title='Test Visualization')
    fig.update_layout(
        template='plotly_white',
        height=400,
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)'
    )
    
    # Convert to serializable format
    fig_dict = _make_json_serializable(fig.to_dict())
    
    return {
        "RESULT": "This is a test visualization.",
        "final_query": "SELECT * FROM test",
        "visualizations": [{
            "type": "bar",
            "figure": fig_dict,
            "description": "Test Bar Chart",
            "reason": "Testing visualization rendering"
        }]
    }

# Example usage (for testing directly from Python)
if __name__ == "__main__":
    question = "Show me the distribution of products by category"
    result = run_query(question)
    print(json.dumps(result, indent=2))
