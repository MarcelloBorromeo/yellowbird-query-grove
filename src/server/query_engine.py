
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
    
    Respond with 'false' only if the question is purely factual with a simple answer.
    Respond with ONLY 'true' or 'false'.
    """
    
    try:
        viz_needed_response = llm.invoke(visualization_prompt).content.strip().lower()
        viz_needed = viz_needed_response == 'true'
        logger.info(f"Visualization needed analysis: {viz_needed}")
        return {"visualization_needed": viz_needed}
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
    if state["visualization_needed"] is True:
        logger.info("Visualization needed based on question analysis")
        return {"next": "process_data"}
    
    # Even if the question doesn't explicitly need visualization,
    # check if the data would benefit from visualization
    df = convert_to_dataframe(state["data"], state["sql_query"])
    numeric_cols = df.select_dtypes(include=['int64', 'float64', 'int32']).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
    
    # If we have numeric data and more than a few rows, a visualization is likely helpful
    row_threshold = 5  # Adjust as needed
    if len(df) > row_threshold and (numeric_cols or len(categorical_cols) > 1):
        logger.info(f"Visualization automatically determined to be helpful: {len(df)} rows with numeric/categorical data")
        return {"next": "process_data"}
    else:
        logger.info("Visualization determined to be unnecessary for this data")
        return {"next": "explain_without_viz"}

@log_errors
def process_data_node(state: GraphState) -> GraphState:
    df = convert_to_dataframe(state["data"], state["sql_query"])
    logger.info(f"Converted data to DataFrame with shape: {df.shape}")
    
    if df.empty:
        logger.info("Empty DataFrame, no visualization generated")
        return {"dataframe": df, "visualizations": []}
    
    # Get data context for visualization recommendation
    data_context = generate_data_context()
    numeric_cols = df.select_dtypes(include=['int64', 'float64', 'int32']).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
    
    viz_prompt = f"""
    {data_context}
    
    User Question: {state['question']}
    
    Dataset Information from Query Results:
    - Row Count: {len(df)}
    - Column Count: {len(df.columns)}
    - Columns: {', '.join(df.columns)}
    - Numeric Columns: {', '.join(numeric_cols) if numeric_cols else 'None'}
    - Categorical Columns: {', '.join(categorical_cols) if categorical_cols else 'None'}
    
    Based on the data context and user question, recommend appropriate visualizations from ONLY these options:
    1. Bar Chart
    2. Line Chart
    3. Scatter Plot
    4. Pie Chart
    5. Histogram
    
    For each visualization, specify:
    - Type (must be one of the five options above)
    - Columns to use (x-axis, y-axis, color by, etc.). Be sure to label the axes appropriately.
    - Title (descriptive title that answers the question)
    
    Determine the optimal number of visualizations (1-3) based on what would be most informative.
    Format your response as valid JSON without any additional explanation.
    """
    
    try:
        viz_recommendation = llm.invoke(viz_prompt).content
        viz_json = re.search(r'\{.*\}', viz_recommendation, re.DOTALL)
        if viz_json:
            recommendations = json.loads(viz_json.group(0))
            if 'visualizations' in recommendations:
                recommendations = recommendations['visualizations']
            logger.info(f"Recommended visualizations: {recommendations}")
        else:
            recommendations = []
    except Exception as e:
        logger.error(f"Error in visualization recommendation: {str(e)}")
        recommendations = []
    
    # Normalize recommendations to handle different formats
    valid_recommendations = []
    for rec in recommendations:
        if not isinstance(rec, dict):
            continue
            
        adjusted_rec = {}
        adjusted_rec["type"] = rec.get("type", "").lower().replace(" chart", "")
        adjusted_rec["title"] = rec.get("title", "Data Visualization")
        
        # Extract column info from different possible structures
        columns = {}
        if "columns" in rec:
            # Handle structured column info
            if isinstance(rec["columns"], dict):
                columns = rec["columns"]
            else:
                logger.warning(f"Unexpected columns format: {rec['columns']}")
        else:
            # Handle flat column info
            if "x_column" in rec or "x-axis" in rec:
                columns["x-axis"] = rec.get("x_column") or rec.get("x-axis")
            if "y_column" in rec or "y-axis" in rec:
                columns["y-axis"] = rec.get("y_column") or rec.get("y-axis")
            if "names_column" in rec:
                columns["names"] = rec.get("names_column")
            if "values_column" in rec:
                columns["values"] = rec.get("values_column")
                
        # Clean and validate column names
        clean_columns = {}
        for key, col in columns.items():
            if not col:
                continue
                
            col_str = str(col).strip('"\'')
            if col_str in df.columns:
                clean_columns[key] = col_str
            else:
                # Try to find a similar column
                for df_col in df.columns:
                    if col_str.lower() == df_col.lower():
                        clean_columns[key] = df_col
                        break
        
        adjusted_rec["columns"] = clean_columns
        valid_recommendations.append(adjusted_rec)
    
    # If no valid recommendations, create default ones based on data types
    if not valid_recommendations:
        logger.info("No valid recommendations, using fallback visualization")
        if numeric_cols and categorical_cols:
            valid_recommendations.append({
                "type": "bar",
                "columns": {"x-axis": categorical_cols[0], "y-axis": numeric_cols[0]},
                "title": f"{numeric_cols[0]} by {categorical_cols[0]}"
            })
        elif len(numeric_cols) >= 2:
            valid_recommendations.append({
                "type": "scatter",
                "columns": {"x-axis": numeric_cols[0], "y-axis": numeric_cols[1]},
                "title": f"Relationship between {numeric_cols[0]} and {numeric_cols[1]}"
            })
        elif numeric_cols:
            valid_recommendations.append({
                "type": "histogram",
                "columns": {"x-axis": numeric_cols[0]},
                "title": f"Distribution of {numeric_cols[0]}"
            })
        elif categorical_cols:
            count_df = df[categorical_cols[0]].value_counts().reset_index()
            count_df.columns = [categorical_cols[0], 'count']
            valid_recommendations.append({
                "type": "pie",
                "columns": {"names": categorical_cols[0], "values": "count"},
                "title": f"Distribution of {categorical_cols[0]}"
            })
            df = pd.concat([df, count_df], axis=1)
    
    visualizations = []
    for i, rec in enumerate(valid_recommendations[:3]):  # Limit to 3 visualizations
        viz_type = rec["type"].lower()
        try:
            columns = rec["columns"]
            
            # Set up figure based on visualization type
            if viz_type in ["bar", "bar chart"]:
                x_col = columns.get("x-axis")
                y_col = columns.get("y-axis")
                
                if not x_col or x_col not in df.columns:
                    continue
                
                if y_col and y_col in df.columns:
                    fig = px.bar(df, x=x_col, y=y_col, title=rec["title"])
                else:
                    # Create count-based bar chart
                    count_df = df[x_col].value_counts().reset_index()
                    count_df.columns = [x_col, 'count']
                    fig = px.bar(count_df, x=x_col, y='count', title=rec["title"])
                    
            elif viz_type in ["line", "line chart"]:
                x_col = columns.get("x-axis")
                y_col = columns.get("y-axis")
                
                if not x_col or not y_col or x_col not in df.columns or y_col not in df.columns:
                    continue
                    
                fig = px.line(df, x=x_col, y=y_col, title=rec["title"])
                
            elif viz_type in ["scatter", "scatter plot"]:
                x_col = columns.get("x-axis")
                y_col = columns.get("y-axis")
                
                if not x_col or not y_col or x_col not in df.columns or y_col not in df.columns:
                    continue
                    
                fig = px.scatter(df, x=x_col, y=y_col, title=rec["title"])
                
            elif viz_type in ["pie", "pie chart"]:
                names_col = columns.get("names") or columns.get("x-axis")
                values_col = columns.get("values") or columns.get("y-axis")
                
                if not names_col or names_col not in df.columns:
                    continue
                    
                if not values_col or values_col not in df.columns:
                    # Create count-based pie chart
                    count_df = df[names_col].value_counts().reset_index()
                    count_df.columns = [names_col, 'count']
                    fig = px.pie(count_df, names=names_col, values='count', title=rec["title"])
                else:
                    fig = px.pie(df, names=names_col, values=values_col, title=rec["title"])
                    
            elif viz_type in ["histogram"]:
                x_col = columns.get("x-axis")
                
                if not x_col or x_col not in df.columns:
                    continue
                    
                fig = px.histogram(df, x=x_col, title=rec["title"])
                
            else:
                logger.warning(f"Unsupported visualization type: {viz_type}")
                continue
                
            # Enhance figure layout
            fig.update_layout(
                template='plotly_white',
                margin=dict(l=40, r=40, t=50, b=40),
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
                height=400,  # Set a consistent height for all visualizations
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)',
            )
            
            # Add labels
            if viz_type not in ["pie", "pie chart"]:
                x_label = columns.get("x-axis", "").replace("_", " ").title() if columns.get("x-axis") else ""
                y_label = columns.get("y-axis", "").replace("_", " ").title() if columns.get("y-axis") else "Count"
                fig.update_xaxes(title_text=x_label)
                fig.update_yaxes(title_text=y_label)
            
            reason = f"Created based on query: {state['question']}"
            
            visualizations.append({
                'type': viz_type,
                'figure': fig.to_dict(),  # Convert to dict for JSON serialization
                'description': rec["title"],
                'reason': reason
            })
            
            logger.info(f"Created {viz_type} visualization: {rec['title']}")
            
        except Exception as e:
            logger.error(f"Error creating visualization {i+1}: {str(e)}")
    
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
        
        return {
            "RESULT": result["explanation"],
            "final_query": result["sql_query"],
            "visualizations": visualizations
        }
    except Exception as e:
        logger.error(f"Query processing failed: {str(e)}")
        return {
            "RESULT": f"An error occurred: {str(e)}. Please try rephrasing your question.",
            "final_query": "No SQL query generated",
            "visualizations": []
        }

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
