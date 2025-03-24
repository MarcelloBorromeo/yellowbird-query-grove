
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import sys
import os
import traceback
import numpy as np
import socket

# Add the directory containing the Python module to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the Python code
try:
    from query_engine import run_query, create_test_visualization
except ImportError as e:
    print(f"Error importing query_engine: {str(e)}")
    traceback.print_exc()
    # Create a stub for testing
    def run_query(question):
        return {
            "RESULT": f"This is a stub response for: {question}",
            "final_query": "SELECT * FROM stub",
            "visualizations": [{
                "type": "bar",
                "figure": {
                    "data": [{
                        "type": "bar",
                        "x": ["Category A", "Category B", "Category C"],
                        "y": [10, 20, 15]
                    }]
                },
                "description": "Stub visualization",
                "reason": "Testing only"
            }]
        }
    
    def create_test_visualization():
        return {
            "RESULT": "This is a test visualization.",
            "final_query": "SELECT * FROM test",
            "visualizations": [{
                "type": "bar",
                "figure": {
                    "data": [{
                        "type": "bar",
                        "x": ["Test A", "Test B", "Test C", "Test D"],
                        "y": [25, 40, 30, 35]
                    }]
                },
                "description": "Test Bar Chart",
                "reason": "Testing visualization rendering"
            }]
        }

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Updated CORS to be more permissive for testing

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

@app.route('/', methods=['GET'])
def healthcheck():
    """Simple endpoint to verify the server is running"""
    return jsonify({"status": "ok", "message": "Flask server is running"})

@app.route('/api/query', methods=['POST'])
def query():
    try:
        print("Received request to /api/query")
        data = request.json
        question = data.get('question', '')
        
        if not question:
            return jsonify({"error": "No question provided"}), 400
        
        print(f"Processing question: {question}")
        
        # Call the Python code
        result = run_query(question)
        
        # Process the result for JSON serialization
        processed_result = process_result_for_json(result)
        
        print(f"Processed result with visualizations: {len(processed_result.get('visualizations', []))}")
        
        return jsonify(processed_result)
    
    except Exception as e:
        print(f"Error processing query: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/test-visualization', methods=['GET'])
def test_visualization():
    """Endpoint to get a test visualization for frontend testing"""
    try:
        print("Generating test visualization")
        result = create_test_visualization()
        processed_result = process_result_for_json(result)
        print(f"Test visualization processed, has {len(processed_result.get('visualizations', []))} visualizations")
        return jsonify(processed_result)
    
    except Exception as e:
        print(f"Error generating test visualization: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def process_result_for_json(result):
    """Process the Plotly figures to make them JSON serializable"""
    processed = {
        "RESULT": result.get("RESULT", ""),
        "final_query": result.get("final_query", "")
    }
    
    if "visualizations" in result:
        processed_viz = []
        for viz in result["visualizations"]:
            # Extract figure data in a JSON-serializable format
            if "figure" in viz:
                # Convert Plotly figure to dict if it's not already
                if hasattr(viz["figure"], 'to_dict'):
                    fig_dict = viz["figure"].to_dict()
                else:
                    fig_dict = viz["figure"]
                
                # Handle numpy arrays in the figure data
                fig_dict = _numpy_to_python_types(fig_dict)
                
                processed_viz.append({
                    "type": viz.get("type", ""),
                    "figure": fig_dict,
                    "description": viz.get("description", ""),
                    "reason": viz.get("reason", "")
                })
        
        processed["visualizations"] = processed_viz
    
    return processed

def _numpy_to_python_types(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: _numpy_to_python_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_numpy_to_python_types(i) for i in obj]
    elif isinstance(obj, tuple):
        return tuple(_numpy_to_python_types(i) for i in obj)
    else:
        return obj

if __name__ == '__main__':
<<<<<<< HEAD
    PORT = 5002
=======
    PORT = 5002  # Using port 5002
>>>>>>> a8a3fe88de32a9be55da0da15d79e30c8cb04fa7
    print(f"Starting Flask server on http://localhost:{PORT}")
    app.run(debug=True, port=PORT, host='0.0.0.0')  # Use 0.0.0.0 to allow external connections
