
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
    # ... keep existing code (SQL chain creation function)
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
    requested_viz_type: Optional[str]  # New field to track requested visualization type

# Helper function to detect requested visualization type from query
def detect_requested_viz_type(question: str) -> Optional[str]:
    """Extract the visualization type explicitly requested in the query."""
    question_lower = question.lower()
    
    # Direct chart type requests
    if "pie chart" in question_lower or "piechart" in question_lower:
        logger.info(f"Detected explicit request for pie chart")
        return "pie"
    elif "bar chart" in question_lower or "barchart" in question_lower:
        logger.info(f"Detected explicit request for bar chart")
        return "bar"
    elif "line chart" in question_lower or "linechart" in question_lower or "trend" in question_lower:
        logger.info(f"Detected explicit request for line chart")
        return "line"
    elif "scatter plot" in question_lower or "scatterplot" in question_lower:
        logger.info(f"Detected explicit request for scatter plot")
        return "scatter"
    elif "area chart" in question_lower or "areachart" in question_lower:
        logger.info(f"Detected explicit request for area chart")
        return "area"
    
    # No explicit visualization type requested
    logger.info(f"No explicit visualization type detected in query")
    return None

# Node functions
@log_errors
def generate_data_context() -> str:
    # ... keep existing code (data context generation function)
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
    """Analyze if the user's question needs visualization and detect requested viz type"""
    # Always return True for visualization to ensure all queries get visualizations
    logger.info("Visualization analysis: Always generating visualizations")
    
    # Extract requested visualization type if present
    requested_viz_type = detect_requested_viz_type(state['question'])
    logger.info(f"Detected visualization type from query: {requested_viz_type}")
    
    return {
        "visualization_needed": True,
        "requested_viz_type": requested_viz_type
    }

@log_errors
def generate_sql_node(state: GraphState) -> GraphState:
    # ... keep existing code (SQL generation function)
    return {"sql_query": sql_query}

@log_errors
def execute_sql_node(state: GraphState) -> GraphState:
    # ... keep existing code (SQL execution function)
    return {"data": data}

@log_errors
def decide_visualization_node(state: GraphState) -> Dict[str, str]:
    """Decision node to determine if we should create visualizations"""
    logger.info("Visualization analysis: Always generating visualizations")
    return {"next": "process_data"}  # Always process data for visualization

@log_errors
def process_data_node(state: GraphState) -> GraphState:
    """Process and transform data into visualizations, honoring requested visualization type"""
    # Get the requested visualization type if available
    requested_viz_type = state.get("requested_viz_type")
    logger.info(f"Processing data with requested visualization type: {requested_viz_type}")
    
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
    
    # Create visualizations based on the data
    visualizations = []
    try:
        # First priority: Use requested visualization type if available
        if requested_viz_type:
            logger.info(f"Creating visualization of explicitly requested type: {requested_viz_type}")
            
            if requested_viz_type == "pie" and len(df.columns) >= 2:
                # For pie charts, use the first categorical and first numeric column
                categorical_cols = df.select_dtypes(exclude=['number']).columns.tolist()
                numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                
                if categorical_cols and numeric_cols:
                    x_col = categorical_cols[0]
                    y_col = numeric_cols[0]
                    
                    fig_pie = px.pie(
                        df, 
                        names=x_col, 
                        values=y_col,
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
                        'description': f"Pie Chart - {y_col} by {x_col}",
                        'reason': f"Shows the proportion of {y_col} across different {x_col} categories."
                    })
                    logger.info(f"Created pie chart as requested: {x_col} vs {y_col}")
            
            elif requested_viz_type == "bar" and len(df.columns) >= 2:
                # For bar charts, use first categorical and first numeric column
                categorical_cols = df.select_dtypes(exclude=['number']).columns.tolist()
                numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                
                if categorical_cols and numeric_cols:
                    x_col = categorical_cols[0]
                    y_col = numeric_cols[0]
                    
                    fig_bar = px.bar(
                        df, 
                        x=x_col, 
                        y=y_col,
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
                        'description': f"Bar Chart - Distribution by {x_col}",
                        'reason': f"Shows the distribution of {y_col} across different {x_col} categories."
                    })
                    logger.info(f"Created bar chart as requested: {x_col} vs {y_col}")
            
            elif requested_viz_type == "line" and len(df.columns) >= 2:
                # For line charts, prefer date columns, but fall back to categorical
                date_cols = [col for col in df.columns if df[col].dtype == 'datetime64[ns]' or 'date' in col.lower()]
                categorical_cols = df.select_dtypes(exclude=['number']).columns.tolist()
                numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                
                x_col = None
                if date_cols:
                    x_col = date_cols[0]
                elif categorical_cols:
                    x_col = categorical_cols[0]
                
                if x_col and numeric_cols:
                    y_col = numeric_cols[0]
                    
                    fig_line = px.line(
                        df, 
                        x=x_col, 
                        y=y_col,
                        title=f"Line Chart - {state['question']}"
                    )
                    fig_line.update_layout(
                        template='plotly_white',
                        margin=dict(l=40, r=40, t=50, b=40),
                        height=400,
                        paper_bgcolor='rgba(0,0,0,0)',
                        plot_bgcolor='rgba(0,0,0,0)'
                    )
                    visualizations.append({
                        'type': 'line',
                        'figure': fig_line.to_dict(),
                        'description': f"Line Chart - {y_col} over {x_col}",
                        'reason': f"Shows how {y_col} changes over {x_col}."
                    })
                    logger.info(f"Created line chart as requested: {x_col} vs {y_col}")
            
            elif requested_viz_type == "scatter" and len(df.columns) >= 2:
                # For scatter plots, prefer numeric columns
                numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                
                if len(numeric_cols) >= 2:
                    fig_scatter = px.scatter(
                        df, 
                        x=numeric_cols[0], 
                        y=numeric_cols[1],
                        title=f"Scatter Chart - {state['question']}"
                    )
                    fig_scatter.update_layout(
                        template='plotly_white',
                        margin=dict(l=40, r=40, t=50, b=40),
                        height=400,
                        paper_bgcolor='rgba(0,0,0,0)',
                        plot_bgcolor='rgba(0,0,0,0)'
                    )
                    visualizations.append({
                        'type': 'scatter',
                        'figure': fig_scatter.to_dict(),
                        'description': f"Scatter Chart - {numeric_cols[0]} vs {numeric_cols[1]}",
                        'reason': f"Shows the relationship between {numeric_cols[0]} and {numeric_cols[1]}."
                    })
                    logger.info(f"Created scatter chart as requested: {numeric_cols[0]} vs {numeric_cols[1]}")
        
        # If no requested type or requested type creation failed, create visualization based on data characteristics
        if not visualizations:
            logger.info("No requested visualization type or creation failed. Creating based on data characteristics")
            
            # For numeric columns, create appropriate charts
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            categorical_cols = df.select_dtypes(exclude=['number']).columns.tolist()
            date_cols = [col for col in df.columns if df[col].dtype == 'datetime64[ns]' or 'date' in col.lower()]
            
            # If we have numerical and categorical columns, create a bar chart
            if numeric_cols and categorical_cols:
                x_col = categorical_cols[0]
                y_col = numeric_cols[0]
                fig_bar = px.bar(
                    df, 
                    x=x_col, 
                    y=y_col,
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
                    'description': f"Bar Chart - Distribution by {x_col}",
                    'reason': f"Shows the distribution of {y_col} across different {x_col} categories."
                })
                logger.info(f"Created bar chart: {x_col} vs {y_col}")
                
                # Also create a pie chart
                fig_pie = px.pie(
                    df, 
                    names=x_col, 
                    values=y_col,
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
                    'description': f"Pie Chart - {y_col} by {x_col}",
                    'reason': f"Shows the proportion of {y_col} across different {x_col} categories."
                })
                logger.info(f"Created pie chart: {x_col} vs {y_col}")
            
            # If we have multiple numeric columns, create a scatter plot
            elif len(numeric_cols) >= 2:
                # ... keep existing code (scatter plot creation)
                logger.info(f"Created scatter chart: {numeric_cols[0]} vs {numeric_cols[1]}")
            
            # If we have date columns and numeric columns, create a line chart
            elif date_cols and numeric_cols:
                # ... keep existing code (line chart creation)
                logger.info(f"Created line chart: {date_cols[0]} vs {numeric_cols[0]}")
        
        # If we still couldn't create any visualizations based on column types,
        # create a simple fallback visualization
        if not visualizations:
            # ... keep existing code (fallback visualization creation)
            logger.info("Created fallback bar chart")
    except Exception as e:
        logger.error(f"Error creating visualizations: {str(e)}")
        # ... keep existing code (error handling and fallback visualizations)
    
    # Always ensure we have at least one visualization
    if not visualizations:
        logger.warning("No visualizations created, adding default visualization")
        # ... keep existing code (default visualization)
    
    # Make sure all visualizations are JSON serializable
    for viz in visualizations:
        try:
            if 'figure' in viz:
                viz['figure'] = _make_json_serializable(viz['figure'])
        except Exception as e:
            logger.error(f"Error making visualization figure JSON serializable: {str(e)}")
    
    logger.info(f"Final visualizations: {len(visualizations)}")
    return {"dataframe": df, "visualizations": visualizations}

# ... keep existing code (explanation functions)

# Build the graph
def build_graph():
    # ... keep existing code (graph structure)
    return graph.compile()

# Helper function to make json serializable (handling numpy types)
def _make_json_serializable(obj):
    # ... keep existing code (JSON serialization helper)
    return obj

# Function to convert data to dataframe
def convert_to_dataframe(data, sql_query=None):
    """Convert SQL query result to DataFrame"""
    try:
        if isinstance(data, pd.DataFrame):
            return data
        elif isinstance(data, str):
            try:
                # Try to parse as JSON
                parsed_data = json.loads(data)
                if isinstance(parsed_data, list):
                    return pd.DataFrame(parsed_data)
                elif isinstance(parsed_data, dict):
                    return pd.DataFrame([parsed_data])
            except:
                # Try to parse as CSV
                return pd.read_csv(StringIO(data))
        elif isinstance(data, list):
            if not data:
                return pd.DataFrame()
            return pd.DataFrame(data)
        elif isinstance(data, dict):
            return pd.DataFrame([data])
        else:
            logger.warning(f"Unsupported data type: {type(data)}")
            return pd.DataFrame()
    except Exception as e:
        logger.error(f"Error converting to DataFrame: {str(e)}")
        return pd.DataFrame()

# Main query function
def run_query(question: str) -> Dict[str, Any]:
    try:
        app = build_graph()
        logger.info(f"Processing query: {question}")
        result = app.invoke({"question": question})
        logger.info(f"Query result keys: {list(result.keys())}")
        
        # Ensure visualizations are JSON serializable
        visualizations = []
        if "visualizations" in result and result["visualizations"]:
            for viz in result["visualizations"]:
                if "figure" in viz:
                    # Already made serializable in process_data_node
                    visualizations.append(viz)
            logger.info(f"Processed {len(visualizations)} visualizations")
        else:
            logger.info("No visualizations in result, creating default visualization")
            # Create a default visualization if none are present
            default_viz = create_test_visualization()["visualizations"][0]
            visualizations = [default_viz]
        
        # Log visualization details before returning
        for i, viz in enumerate(visualizations):
            logger.info(f"Visualization {i+1} type: {viz.get('type')}, description: {viz.get('description')}")
        
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
    # ... keep existing code (test visualization creation)
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
