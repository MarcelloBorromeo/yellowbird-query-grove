
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import sys
import os

# Add the directory containing the Python module to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the Python code
try:
    from query_engine import run_query
except ImportError as e:
    print(f"Error importing query_engine: {e}")
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

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/query', methods=['POST'])
def query():
    try:
        data = request.json
        question = data.get('question', '')
        
        if not question:
            return jsonify({"error": "No question provided"}), 400
        
        # Call the Python code
        result = run_query(question)
        
        # Process the result for JSON serialization
        processed_result = process_result_for_json(result)
        
        return jsonify(processed_result)
    
    except Exception as e:
        print(f"Error processing query: {str(e)}")
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
                # Convert Plotly figure to dict
                fig_dict = viz["figure"].to_dict()
                processed_viz.append({
                    "type": viz.get("type", ""),
                    "figure": fig_dict,
                    "description": viz.get("description", ""),
                    "reason": viz.get("reason", "")
                })
        
        processed["visualizations"] = processed_viz
    
    return processed

if __name__ == '__main__':
    app.run(debug=True, port=5000)
