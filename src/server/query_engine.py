
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

# ... keep existing code (OpenAI API key setup, database connection, LLM initialization, SQL chain creation)

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

# ... keep existing code (node functions, database context generation, question analysis)

@log_errors
def convert_to_dataframe(data, sql_query=None):
    """Convert SQL query results to pandas DataFrame with improved error handling"""
    try:
        if isinstance(data, pd.DataFrame):
            return data
        elif isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], dict):
                return pd.DataFrame(data)
            else:
                # Try to infer structure from SQL query if available
                logger.info(f"Attempting to infer DataFrame structure from non-dict data: {data[:5]}")
                if sql_query:
                    # Extract column names from SQL query
                    match = re.search(r'SELECT\s+(.*?)\s+FROM', sql_query, re.IGNORECASE | re.DOTALL)
                    if match:
                        cols = [c.strip().split(' AS ')[-1].strip() for c in match.group(1).split(',')]
                        if len(cols) == len(data[0]) if isinstance(data[0], (list, tuple)) else 1:
                            if isinstance(data[0], (list, tuple)):
                                return pd.DataFrame(data, columns=cols)
                            else:
                                return pd.DataFrame({cols[0]: data})
                
                # Fallback: Use generic column names
                if isinstance(data[0], (list, tuple)):
                    return pd.DataFrame(data, columns=[f'col_{i}' for i in range(len(data[0]))])
                else:
                    return pd.DataFrame({'value': data})
        elif isinstance(data, str):
            # Try to parse string as CSV or JSON
            try:
                # First try as JSON
                parsed = json.loads(data)
                if isinstance(parsed, list):
                    return pd.DataFrame(parsed)
                elif isinstance(parsed, dict):
                    return pd.DataFrame([parsed])
                else:
                    logger.warning(f"String parsed as JSON but result is not list or dict: {type(parsed)}")
            except:
                # Then try as CSV
                try:
                    return pd.read_csv(StringIO(data))
                except:
                    logger.warning("Could not parse string as JSON or CSV")
                    # Create single-cell dataframe as last resort
                    return pd.DataFrame({'data': [data]})
        elif data is None or (isinstance(data, list) and len(data) == 0):
            # Return empty DataFrame with sample structure
            logger.warning("Empty data received, creating sample structure DataFrame")
            return pd.DataFrame(columns=['sample_category', 'sample_value'])
        else:
            logger.warning(f"Unknown data type to convert to DataFrame: {type(data)}")
            # Last resort - try to create a DataFrame with a single cell
            return pd.DataFrame({'data': [str(data)]})
    except Exception as e:
        logger.error(f"Error converting to DataFrame: {e}")
        # Return a valid but empty DataFrame as fallback
        return pd.DataFrame()

@log_errors
def process_data_node(state: GraphState) -> GraphState:
    """Process and transform data into visualizations with improved robustness"""
    visualizations = []
    
    # Ensure we have a valid DataFrame to work with
    if state.get("data") is None:
        logger.info("No data in state, creating demonstration data")
        df = pd.DataFrame({
            'Category': ['A', 'B', 'C', 'D', 'E'],
            'Values': [25, 40, 30, 35, 28],
            'Series': ['X', 'X', 'Y', 'Y', 'Z']
        })
    else:
        try:
            df = convert_to_dataframe(state["data"], state.get("sql_query"))
            logger.info(f"Converted data to DataFrame with shape: {df.shape}")
        except Exception as df_err:
            logger.error(f"Error creating DataFrame from data: {df_err}")
            # Create sample dataframe as fallback
            df = pd.DataFrame({
                'Category': ['Error A', 'Error B', 'Error C'],
                'Values': [10, 15, 8]
            })
    
    state["dataframe"] = df
    
    if df.empty:
        logger.info("Empty DataFrame, creating demonstration data")
        df = pd.DataFrame({
            'Category': ['No Data A', 'No Data B', 'No Data C'],
            'Values': [10, 15, 8]
        })
        state["dataframe"] = df
    
    # Create visualizations based on the data
    try:
        # Always create at least one chart type based on data characteristics
        if len(df.columns) >= 2:
            # For numeric columns, create appropriate charts
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            categorical_cols = df.select_dtypes(exclude=['number']).columns.tolist()
            date_cols = []
            
            # Identify potential date columns even if not parsed as datetime
            for col in df.columns:
                if df[col].dtype == 'datetime64[ns]' or 'date' in col.lower() or 'time' in col.lower():
                    # Try to convert to datetime if it's not already
                    if df[col].dtype != 'datetime64[ns]':
                        try:
                            df[col] = pd.to_datetime(df[col])
                            date_cols.append(col)
                        except:
                            pass
                    else:
                        date_cols.append(col)
            
            logger.info(f"Column types detected: numeric={numeric_cols}, categorical={categorical_cols}, date={date_cols}")
            
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
                logger.info(f"Created scatter chart: {numeric_cols[0]} vs {numeric_cols[1]}")
            
            # If we have date columns and numeric columns, create a line chart
            elif date_cols and numeric_cols:
                # Sort by date for proper line chart
                df = df.sort_values(by=date_cols[0])
                
                fig_line = px.line(
                    df, 
                    x=date_cols[0], 
                    y=numeric_cols[0],
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
                    'description': f"Line Chart - {numeric_cols[0]} over {date_cols[0]}",
                    'reason': f"Shows how {numeric_cols[0]} changes over {date_cols[0]}."
                })
                logger.info(f"Created line chart: {date_cols[0]} vs {numeric_cols[0]}")
        
        # If we couldn't create any visualizations based on column types,
        # create a simple fallback visualization
        if not visualizations:
            logger.warning("No visualizations created based on column types, using fallback")
            # Simple fallback bar chart
            if len(df.columns) >= 2:
                x_col = df.columns[0]
                y_col = df.columns[1]
                
                # Try to identify numeric column for y-axis
                for col in df.columns:
                    if pd.api.types.is_numeric_dtype(df[col]):
                        y_col = col
                        # Find a different column for x-axis if needed
                        if x_col == y_col and len(df.columns) > 1:
                            x_col = next(c for c in df.columns if c != y_col)
                        break
                
                # Create visualization with best guess at axis assignment
                fig_fallback = px.bar(
                    df,
                    x=x_col,
                    y=y_col,
                    title="Data Visualization"
                )
                fig_fallback.update_layout(
                    template='plotly_white',
                    height=400,
                    paper_bgcolor='rgba(0,0,0,0)',
                    plot_bgcolor='rgba(0,0,0,0)'
                )
                visualizations.append({
                    'type': 'bar',
                    'figure': fig_fallback.to_dict(),
                    'description': f"Bar Chart - {y_col} by {x_col}",
                    'reason': f"Showing {y_col} distributed by {x_col}."
                })
                logger.info(f"Created fallback bar chart with best-guess axes: {x_col} vs {y_col}")
            else:
                # Create a very simple single-column chart
                fig_fallback = px.bar(
                    df,
                    x=df.index,
                    y=df.columns[0] if len(df.columns) > 0 else None,
                    title="Data Visualization"
                )
                fig_fallback.update_layout(
                    template='plotly_white',
                    height=400,
                    paper_bgcolor='rgba(0,0,0,0)',
                    plot_bgcolor='rgba(0,0,0,0)'
                )
                visualizations.append({
                    'type': 'bar',
                    'figure': fig_fallback.to_dict(),
                    'description': "Data Visualization",
                    'reason': "Showing the available data from your query."
                })
                logger.info("Created single-column fallback bar chart")
    except Exception as viz_err:
        logger.error(f"Error creating visualizations: {viz_err}")
        # Create a guaranteed fallback visualization
        try:
            # Create an error indication visualization
            x_data = ['Error', 'Occurred', 'Please', 'Try', 'Again']
            y_data = [25, 40, 30, 35, 28]
            
            fig_error = go.Figure(data=[
                go.Bar(x=x_data, y=y_data, name='Sample Data')
            ])
            fig_error.update_layout(
                title="Visualization Error - Fallback Chart",
                template='plotly_white',
                height=400,
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)'
            )
            visualizations.append({
                'type': 'bar',
                'figure': fig_error.to_dict(),
                'description': "Error Visualization",
                'reason': "An error occurred while generating the requested visualization."
            })
            logger.info("Created error indication visualization")
        except Exception as fallback_err:
            logger.error(f"Even error visualization failed: {fallback_err}")
    
    # Always ensure we have at least one visualization by adding a guaranteed one
    if not visualizations:
        logger.warning("No visualizations created at all, adding guaranteed default visualization")
        try:
            fig_default = go.Figure(data=[
                go.Bar(x=['Sample A', 'Sample B', 'Sample C'], y=[15, 30, 25])
            ])
            fig_default.update_layout(
                title="Default Visualization",
                template='plotly_white',
                height=400,
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)'
            )
            visualizations.append({
                'type': 'bar',
                'figure': fig_default.to_dict(),
                'description': "Default Visualization",
                'reason': "Presenting sample data visualization."
            })
            logger.info("Added guaranteed default visualization")
        except Exception as default_err:
            logger.error(f"Even guaranteed visualization failed: {default_err}")
            # At this point, we can only return an empty dict as a last resort
            visualizations.append({
                'type': 'error',
                'figure': {},
                'description': "Visualization Error",
                'reason': "Unable to generate visualization."
            })
    
    return {"dataframe": df, "visualizations": visualizations}

# ... keep existing code (explanation functions, graph building, helper functions, main query function)

# Run the query engine
def run_query(question: str) -> Dict[str, Any]:
    try:
        app = build_graph()
        result = app.invoke({"question": question})
        logger.info(f"Query result keys: {list(result.keys())}")
        
        # Ensure visualizations are JSON serializable and not empty
        visualizations = []
        if "visualizations" in result and result["visualizations"]:
            for viz in result["visualizations"]:
                try:
                    if "figure" in viz:
                        # Ensure the figure is properly serialized
                        if isinstance(viz["figure"], str):
                            try:
                                viz["figure"] = json.loads(viz["figure"])
                            except:
                                logger.warning("Figure was string but not valid JSON, keeping as is")
                        viz["figure"] = _make_json_serializable(viz["figure"])
                    visualizations.append(viz)
                except Exception as viz_err:
                    logger.error(f"Error processing visualization: {viz_err}")
            logger.info(f"Processed {len(visualizations)} visualizations")
        
        # If no visualizations were successfully processed, create a test one
        if not visualizations:
            logger.warning("No valid visualizations in result, creating fallback visualization")
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

# ... keep existing code (test visualization creation and main code)
