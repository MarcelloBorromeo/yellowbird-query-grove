#PostgreSQL Query Generation and Execution with LangChain & OpenAI (With Plotly Visualization)
from langchain_openai import ChatOpenAI
from langchain_community.utilities.sql_database import SQLDatabase
from langchain.chains import create_sql_query_chain
from langchain_core.runnables import RunnableLambda
import os
import logging
import re
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import json
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
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

# Create a more sophisticated SQL Chain that properly handles quotes
def create_postgres_friendly_sql_chain(llm, db):
    standard_chain = create_sql_query_chain(llm, db)
    
    def fix_sql_query(sql_query):
        # Remove backticks
        sql_query = sql_query.replace("`", "")
        
        # Fix unquoted string literals in WHERE clauses
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

# Initialize the SQL chain
sql_chain = create_postgres_friendly_sql_chain(llm, db)

# Generate Data Context
@log_errors
def generate_data_context():
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

# Extract column names from SQL query
def extract_column_names_from_query(sql_query):
    """Extract column names from a SQL SELECT query"""
    # Extract the part between SELECT and FROM
    match = re.search(r'SELECT\s+(.*?)\s+FROM', sql_query, re.IGNORECASE | re.DOTALL)
    if not match:
        return []
    
    columns_part = match.group(1)
    
    # Handle * case
    if columns_part.strip() == '*':
        return []
    
    # Split by commas but handle functions and aliases
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
    
    # Extract aliases or column names
    column_names = []
    for col in columns:
        # Case: AS alias
        as_match = re.search(r'\bAS\s+([a-zA-Z0-9_]+)', col, re.IGNORECASE)
        if as_match:
            column_names.append(as_match.group(1))
            continue
        
        # Case: column alias without AS
        alias_match = re.search(r'([a-zA-Z0-9_.]+)\s+([a-zA-Z0-9_]+)$', col)
        if alias_match:
            column_names.append(alias_match.group(2))
            continue
        
        # Case: standard column name or function
        name_match = re.search(r'([a-zA-Z0-9_.]+)$', col)
        if name_match:
            simple_name = name_match.group(1)
            if '.' in simple_name:  # If it's table.column format
                simple_name = simple_name.split('.')[-1]
            column_names.append(simple_name)
            continue
        
        # If all else fails, use the entire column expression
        column_names.append(col.replace(' ', '_'))
    
    return column_names

# Data Visualization Functions
@log_errors
def convert_to_dataframe(sql_result: Any, original_query: str = None) -> pd.DataFrame:
    """Convert SQL result to a pandas DataFrame with meaningful column names"""
    # If already a DataFrame, return it
    if isinstance(sql_result, pd.DataFrame):
        return sql_result
    
    # Handle empty results
    if not sql_result:
        logger.info("No data returned from SQL query")
        return pd.DataFrame()
    
    # Try to extract column names from the original query
    extracted_columns = []
    if original_query:
        extracted_columns = extract_column_names_from_query(original_query)
        logger.info(f"Extracted column names from query: {extracted_columns}")
    
    # Handle string result
    if isinstance(sql_result, str):
        sql_result = sql_result.strip()
        logger.info(f"SQL result string: {sql_result}")
        
        # Try multiple parsing methods
        parsing_methods = [
            # Method 1: Try to parse as Python list of tuples
            lambda s: _parse_as_python_list(s, extracted_columns),
            # Method 2: Try to parse as JSON
            lambda s: _parse_as_json(s, extracted_columns),
            # Method 3: Try to parse as CSV/tabular text
            lambda s: _parse_as_tabular(s),
        ]
        
        for method in parsing_methods:
            try:
                df = method(sql_result)
                if df is not None and not df.empty:
                    return df
            except Exception as e:
                logger.error(f"Error in parsing method: {str(e)}")
                continue
    
    # If all parsing fails, return raw data
    logger.warning(f"Failed to parse SQL result: {sql_result}")
    return pd.DataFrame({'raw_data': [str(sql_result)]})

def _parse_as_python_list(sql_result, extracted_columns=None):
    """Parse string as a Python list of tuples with meaningful column names"""
    if sql_result.startswith('[') and sql_result.endswith(']'):
        # Safely evaluate the string as a Python list
        data = eval(sql_result, {"__builtins__": {}}, {})
        if isinstance(data, list) and data:
            # Use extracted columns if available, otherwise generate descriptive names
            if extracted_columns and len(extracted_columns) == len(data[0]):
                columns = extracted_columns
            else:
                # Generate meaningful column names based on data types
                columns = []
                for i, val in enumerate(data[0]):
                    if isinstance(val, (int, float)):
                        columns.append(f'value_{i+1}')
                    elif isinstance(val, str):
                        columns.append(f'text_{i+1}')
                    else:
                        columns.append(f'field_{i+1}')
            
            return pd.DataFrame(data, columns=columns)
    return None

def _parse_as_json(sql_result, extracted_columns=None):
    """Parse string as JSON with meaningful column names"""
    data = json.loads(sql_result)
    if isinstance(data, list) and data:
        if isinstance(data[0], dict):
            return pd.DataFrame(data)
        
        # Use extracted columns if available, otherwise generate descriptive names
        if extracted_columns and len(extracted_columns) == len(data[0]):
            columns = extracted_columns
        else:
            # Generate meaningful column names based on data types
            columns = []
            for i, val in enumerate(data[0]):
                if isinstance(val, (int, float)):
                    columns.append(f'value_{i+1}')
                elif isinstance(val, str):
                    columns.append(f'text_{i+1}')
                else:
                    columns.append(f'field_{i+1}')
        
        return pd.DataFrame(data, columns=columns)
    return None

def _parse_as_tabular(sql_result):
    """Parse string as tabular text"""
    return pd.read_csv(StringIO(sql_result), sep=r'\s+|\t|,')

@log_errors
def analyze_dataframe(df: pd.DataFrame, question: str) -> Dict[str, Any]:
    """Analyze the DataFrame to determine appropriate visualization options"""
    if df.empty:
        logger.info("Empty DataFrame, not suitable for visualization")
        return {'suitable_for_viz': False, 'reason': 'Empty data'}
    
    # Basic DataFrame metadata
    analysis = {
        'row_count': len(df),
        'column_count': len(df.columns),
        'columns': list(df.columns),
        'dtypes': {col: str(df[col].dtype) for col in df.columns},
        'suitable_for_viz': True,
        'viz_recommendations': []
    }
    
    # Categorize columns by data type
    numeric_cols = df.select_dtypes(include=['int64', 'float64', 'int32']).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
    temporal_cols = []
    
    # Try to detect datetime columns
    for col in df.columns:
        if col in numeric_cols or col in categorical_cols:
            continue
        try:
            pd.to_datetime(df[col])
            temporal_cols.append(col)
        except:
            pass
    
    analysis['numeric_columns'] = numeric_cols
    analysis['categorical_columns'] = categorical_cols
    analysis['temporal_columns'] = temporal_cols
    
    # Check if data is suitable for visualization
    if not numeric_cols and not categorical_cols and not temporal_cols:
        analysis['suitable_for_viz'] = False
        analysis['reason'] = 'No numeric, categorical, or temporal columns'
        logger.info("Data unsuitable: No numeric, categorical, or temporal columns")
        return analysis
    
    # Get visualization recommendations from LLM
    viz_recommendations = _get_viz_recommendations(analysis, question, numeric_cols, categorical_cols, temporal_cols)
    if viz_recommendations:
        analysis['viz_recommendations'] = viz_recommendations
    else:
        # Fallback to default recommendations if LLM fails
        analysis['viz_recommendations'] = _get_default_viz_recommendations(numeric_cols, categorical_cols)
    
    return analysis

def _get_viz_recommendations(analysis, question, numeric_cols, categorical_cols, temporal_cols):
    """Get visualization recommendations from LLM"""
    viz_prompt = f"""
    Data Analysis Task:
    
    User Question: {question}
    
    Dataset Information:
    - Row Count: {analysis['row_count']}
    - Column Count: {analysis['column_count']}
    - Columns: {', '.join(analysis['columns'])}
    - Numeric Columns: {', '.join(numeric_cols) if numeric_cols else 'None'}
    - Categorical Columns: {', '.join(categorical_cols) if categorical_cols else 'None'}
    - Temporal Columns: {', '.join(temporal_cols) if temporal_cols else 'None'}
    
    Based on the data context and user question, recommend appropriate visualizations from ONLY these options:
    1. Bar Chart
    2. Line Chart
    3. Scatter Plot
    4. Pie Chart
    5. Histogram
    
    For each visualization, specify:
    - Type (must be one of the five options above)
    - Columns to use (x-axis, y-axis, color by, etc.). Be sure to label the axes appropriately.  
    - Title (decide on the title name)
    
    Determine the optimal number of visualizations (1-3) based on what would be most informative.
    Format your response as valid JSON without any additional explanation.
    """
    
    try:
        viz_recommendation = llm.invoke(viz_prompt).content
        # Extract JSON from the response
        viz_recommendation = re.search(r'\{.*\}', viz_recommendation, re.DOTALL)
        if viz_recommendation:
            viz_recommendation = json.loads(viz_recommendation.group(0))
            
            if 'visualizations' in viz_recommendation:
                recommendations = []
                for viz in viz_recommendation['visualizations']:
                    viz_type = viz['type'].lower()
                    rec = _format_viz_recommendation(viz_type, viz, numeric_cols, categorical_cols)
                    if rec:
                        recommendations.append(rec)
                return recommendations
    except Exception as e:
        logger.error(f"Error in LLM visualization recommendation: {str(e)}")
    
    return []

def _format_viz_recommendation(viz_type, viz, numeric_cols, categorical_cols):
    """Format visualization recommendation from LLM response"""
    viz_formatters = {
        'bar': lambda v: {
            'type': 'bar',
            'x_col': v.get('x_column', categorical_cols[0] if categorical_cols else numeric_cols[0]),
            'y_col': v.get('y_column', numeric_cols[0] if numeric_cols else categorical_cols[0]),
            'color': v.get('color_column', categorical_cols[0] if len(categorical_cols) > 1 else None),
            'title': v.get('title', f'Bar Chart: {v.get("x_column")} vs {v.get("y_column")}'),
            'reason': v.get('reason', 'Appropriate for categorical comparison')
        },
        'line': lambda v: {
            'type': 'line',
            'x_col': v.get('x_column', numeric_cols[0]),
            'y_col': v.get('y_column', numeric_cols[0]),
            'color': v.get('color_column', categorical_cols[0] if categorical_cols else None),
            'title': v.get('title', f'Line Chart: {v.get("x_column")} vs {v.get("y_column")}'),
            'reason': v.get('reason', 'Appropriate for temporal or continuous data')
        },
        'scatter': lambda v: {
            'type': 'scatter',
            'x_col': v.get('x_column', numeric_cols[0]),
            'y_col': v.get('y_column', numeric_cols[1] if len(numeric_cols) > 1 else numeric_cols[0]),
            'color': v.get('color_column', categorical_cols[0] if categorical_cols else None),
            'title': v.get('title', f'Scatter Plot: {v.get("x_column")} vs {v.get("y_column")}'),
            'reason': v.get('reason', 'Appropriate for correlation analysis')
        },
        'pie': lambda v: {
            'type': 'pie',
            'names_col': v.get('names_column', categorical_cols[0]),
            'values_col': v.get('values_column', numeric_cols[0]),
            'title': v.get('title', f'Pie Chart: {v.get("names_column")} Distribution'),
            'reason': v.get('reason', 'Appropriate for part-to-whole relationship')
        },
        'histogram': lambda v: {
            'type': 'histogram',
            'x_col': v.get('x_column', numeric_cols[0]),
            'color': v.get('color_column', categorical_cols[0] if categorical_cols else None),
            'title': v.get('title', f'Histogram: Distribution of {v.get("x_column")}'),
            'reason': v.get('reason', 'Appropriate for distribution analysis')
        }
    }
    
    # Check if the chart type is supported
    if viz_type in viz_formatters or any(t in viz_type for t in viz_formatters.keys()):
        chart_type = next((t for t in viz_formatters.keys() if t in viz_type), None)
        return viz_formatters[chart_type](viz)
    return None

def _get_default_viz_recommendations(numeric_cols, categorical_cols):
    """Get default visualization recommendations if LLM recommendations fail"""
    recommendations = []
    
    if categorical_cols and numeric_cols:
        recommendations.append({
            'type': 'bar',
            'x_col': categorical_cols[0],
            'y_col': numeric_cols[0],
            'title': f'Bar Chart: {categorical_cols[0]} vs {numeric_cols[0]}',
            'reason': 'Default visualization for categorical and numeric data'
        })
        
        if len(categorical_cols) > 0 and len(numeric_cols) > 0:
            recommendations.append({
                'type': 'pie',
                'names_col': categorical_cols[0],
                'values_col': numeric_cols[0],
                'title': f'Distribution of {numeric_cols[0]} by {categorical_cols[0]}',
                'reason': 'Default visualization for categorical distribution'
            })
    
    elif numeric_cols and len(numeric_cols) >= 2:
        recommendations.append({
            'type': 'scatter',
            'x_col': numeric_cols[0],
            'y_col': numeric_cols[1],
            'title': f'Scatter Plot: {numeric_cols[0]} vs {numeric_cols[1]}',
            'reason': 'Default visualization for numeric correlations'
        })
    
    elif numeric_cols:
        recommendations.append({
            'type': 'histogram',
            'x_col': numeric_cols[0],
            'title': f'Histogram: Distribution of {numeric_cols[0]}',
            'reason': 'Default visualization for numeric distribution'
        })
    
    return recommendations

def get_color_palette(num_colors: int) -> List[str]:
    """Get a nice color palette for visualizations"""
    if num_colors <= 10:
        return px.colors.qualitative.G10
    elif num_colors <= 20:
        return px.colors.qualitative.G10 + px.colors.qualitative.Plotly
    else:
        return px.colors.sequential.Viridis

@log_errors
def create_visualization(df: pd.DataFrame, analysis: Dict[str, Any], question: str) -> Optional[Dict[str, Any]]:
    """Create appropriate visualizations based on data analysis"""
    if not analysis['suitable_for_viz'] or df.empty:
        logger.info("Data not suitable for visualization")
        return None
    
    # Determine how many visualizations to create
    viz_count = min(len(analysis['viz_recommendations']), 3)  # Cap at 3 visualizations
    viz_results = []
    
    # Get color palette
    color_palette = get_color_palette(20)
    
    # Visualization creation functions
    viz_creators = {
        'bar': lambda rec: px.bar(
            df, x=rec['x_col'], y=rec['y_col'], 
            color=rec.get('color') if rec.get('color') in df.columns else None,
            title=rec['title'], color_discrete_sequence=color_palette
        ),
        'line': lambda rec: px.line(
            df, x=rec['x_col'], y=rec['y_col'],
            color=rec.get('color') if rec.get('color') in df.columns else None,
            title=rec['title'], color_discrete_sequence=color_palette
        ),
        'scatter': lambda rec: px.scatter(
            df, x=rec['x_col'], y=rec['y_col'],
            color=rec.get('color') if rec.get('color') in df.columns else None, 
            title=rec['title'], color_discrete_sequence=color_palette
        ),
        'pie': lambda rec: px.pie(
            df, names=rec['names_col'], values=rec['values_col'],
            title=rec['title'], color_discrete_sequence=color_palette
        ),
        'histogram': lambda rec: px.histogram(
            df, x=rec['x_col'],
            color=rec.get('color') if rec.get('color') in df.columns else None,
            title=rec['title'], color_discrete_sequence=color_palette
        )
    }
    
    for i in range(viz_count):
        if i >= len(analysis['viz_recommendations']):
            break
            
        viz_rec = analysis['viz_recommendations'][i]
        viz_type = viz_rec['type'].lower()
        
        try:
            if viz_type in viz_creators:
                # Create the visualization
                fig = viz_creators[viz_type](viz_rec)
                
                # Add axis labels
                axis_labels = {}
                if viz_type in ['bar', 'line', 'scatter']:
                    axis_labels['xaxis_title'] = viz_rec['x_col'].replace('_', ' ').title()
                    axis_labels['yaxis_title'] = viz_rec['y_col'].replace('_', ' ').title()
                elif viz_type == 'histogram':
                    axis_labels['xaxis_title'] = viz_rec['x_col'].replace('_', ' ').title()
                    axis_labels['yaxis_title'] = 'Frequency'
                
                # Enhance layout
                fig.update_layout(
                    template='plotly_white',
                    margin=dict(l=40, r=40, t=50, b=40),
                    legend=dict(
                        orientation="h",
                        yanchor="bottom",
                        y=1.02,
                        xanchor="right",
                        x=1
                    ),
                    colorway=color_palette,
                    **axis_labels
                )
                
                viz_results.append({
                    'type': viz_type,
                    'figure': fig,
                    'description': viz_rec['title'],
                    'reason': viz_rec.get('reason', 'Appropriate for this data')
                })
            else:
                logger.warning(f"Unsupported visualization type: {viz_type}")
        except Exception as e:
            logger.error(f"Error creating {viz_type} visualization: {str(e)}")
    
    if viz_results:
        logger.info(f"Successfully created {len(viz_results)} visualizations")
        return {'visualizations': viz_results}
    
    logger.info("No visualizations created")
    return None

# Define the pipeline nodes
class QueryPipeline:
    def __init__(self, llm, db, sql_chain):
        self.llm = llm
        self.db = db
        self.sql_chain = sql_chain
    
    @log_errors
    def generate_sql(self, question):
        """Generate SQL query from natural language question"""
        data_context = generate_data_context()
        enhanced_question = f"""
        {data_context}
        User Question: {question}
        Generate a PostgreSQL-compatible SQL query.
        Make sure to properly quote string literals with single quotes.
        Do NOT use backticks (`) or double quotes (") around column or table names.
        Return ONLY the SQL query without any explanation or comments.
        """
        sql_query = self.sql_chain.invoke({"question": enhanced_question})
        logger.info(f"Generated SQL query: {sql_query}")
        return sql_query
    
    @log_errors
    def execute_sql(self, sql_query):
        """Execute SQL query and return results"""
        data = self.db.run(sql_query)
        logger.info("Successfully executed SQL query")
        return data
    
    @log_errors
    def create_visualizations(self, data, question, sql_query=None):
        """Create visualizations based on data and question"""
        df = convert_to_dataframe(data, sql_query)
        logger.info(f"Converted data to DataFrame with shape: {df.shape}")
        
        analysis = analyze_dataframe(df, question)
        if analysis['suitable_for_viz']:
            viz_result = create_visualization(df, analysis, question)
            return viz_result
        else:
            logger.info(f"Data not suitable for visualization: {analysis.get('reason', 'Unknown reason')}")
            return None
    
    @log_errors
    def explain_results(self, sql_query, data, question, viz_result):
        """Generate explanation of results"""
        data_context = generate_data_context()
        viz_info = ""
        
        if viz_result and 'visualizations' in viz_result:
            viz_info = "Generated Visualizations:\n"
            for viz in viz_result['visualizations']:
                viz_info += f"- {viz['description']}\n"
                viz_info += f"  Type: {viz['type']}\n"
                viz_info += f"  Reason: {viz['reason']}\n"
        
        prompt = f"""
        {data_context}
        User asked: {question}
        Generated SQL Query: {sql_query}
        SQL Query Results: {data}
        {viz_info}
        
        Summarize the results in a clear, accurate, human-friendly way. Provide key insights.
        If visualizations were created, explain why they were selected and what insights they provide.
        """
        explanation = self.llm.invoke(prompt).content
        logger.info("Successfully generated explanation")
        return explanation
    
    def run(self, question):
        """Run the full pipeline"""
        sql_query = self.generate_sql(question)
        data = self.execute_sql(sql_query)
        viz_result = self.create_visualizations(data, question, sql_query)
        explanation = self.explain_results(sql_query, data, question, viz_result)
        
        result = {"RESULT": explanation, "final_query": sql_query}
        if viz_result and 'visualizations' in viz_result:
            result["visualizations"] = viz_result['visualizations']
        
        return result

# Main query function
def run_query(question: str) -> dict:
    try:
        pipeline = QueryPipeline(llm, db, sql_chain)
        result = pipeline.run(question)
        
        # Important: Ensure visualizations are properly JSON serializable
        if 'visualizations' in result and result['visualizations']:
            for viz in result['visualizations']:
                if 'figure' in viz:
                    if hasattr(viz['figure'], 'to_dict'):
                        viz['figure'] = viz['figure'].to_dict()
                    
                    # Convert numpy types to Python types for JSON serialization
                    viz['figure'] = _make_json_serializable(viz['figure'])
                    
                    logger.info(f"Processed visualization of type {viz['type']} for JSON")
        
        return result
    except Exception as e:
        logger.error(f"Query processing failed: {str(e)}")
        sql_query = "No SQL query generated" if 'sql_query' not in locals() else locals()['sql_query']
        return {
            "RESULT": f"An error occurred: {str(e)}. Please try rephrasing your question.", 
            "final_query": sql_query
        }

def _make_json_serializable(obj):
    """Convert all numpy types in a nested structure to Python types for JSON serialization"""
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
    elif isinstance(obj, (dict, pd._libs.properties.AxisProperty)):
        return {k: _make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list) or isinstance(obj, tuple):
        return [_make_json_serializable(i) for i in obj]
    else:
        return obj

# Function to display the results with visualizations inline
def display_results(result: Dict[str, Any]) -> None:
    print("\nFinal SQL Query:")
    print(result["final_query"])
    
    print("\nResult:")
    print(result["RESULT"])
    
    if "visualizations" in result:
        print("\nVisualizations:")
        for i, viz in enumerate(result["visualizations"]):
            print(f"{i+1}. {viz['description']}")
            print(f"   Reason: {viz.get('reason', 'No reason provided')}")
            viz['figure'].show()  # Display the Plotly figure inline

# Force create a visualization for test purposes
def create_test_visualization():
    """Create a test visualization to ensure the frontend can display it"""
    # Sample data
    df = pd.DataFrame({
        'Category': ['A', 'B', 'C', 'D', 'E'],
        'Values': [10, 20, 15, 30, 25]
    })
    
    # Create a simple bar chart
    fig = px.bar(df, x='Category', y='Values', title='Test Visualization')
    
    # Return the visualization in the same format as the main function
    return {
        "RESULT": "This is a test visualization.",
        "final_query": "SELECT * FROM test",
        "visualizations": [
            {
                "type": "bar",
                "figure": _make_json_serializable(fig.to_dict()),
                "description": "Test Bar Chart",
                "reason": "Testing visualization rendering"
            }
        ]
    }

# Example usage (for testing directly from Python)
if __name__ == "__main__":
    question = "Make me a frequency distribution. give me just a single visual"
    result = run_query(question)
    print(json.dumps(result, indent=2))
    
    # Optionally, display the results with matplotlib or other viewer
    if "visualizations" in result:
        for viz in result["visualizations"]:
            print(f"Visualization: {viz['description']}")
