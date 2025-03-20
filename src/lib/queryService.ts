
import { toast } from 'sonner';
import { DataPoint } from './mockData';

// Configuration
const API_URL = 'http://localhost:5000/api/query'; // Fixed to ensure correct port

export interface QueryResult {
  data: DataPoint[];
  sql: string;
  explanation: string;
  visualizations?: {
    type: string;
    figure: any;
    description: string;
    reason: string;
  }[];
}

/**
 * Process a natural language query and get results from the database
 */
export async function processQuery(query: string): Promise<QueryResult> {
  try {
    console.log('Attempting to connect to backend at:', API_URL);
    
    // Check if the backend is accessible with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: query }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Clear the timeout if request completes

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server returned error:', response.status, errorText);
      throw new Error(`Server error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('Received response from backend:', result);
    
    // Transform the result into the expected format
    const transformedData = transformDataFromPython(result);
    
    return {
      data: transformedData,
      sql: result.final_query || '',
      explanation: result.RESULT || 'No explanation provided',
      visualizations: result.visualizations?.map((viz: any) => ({
        type: viz.type,
        figure: viz.figure,
        description: viz.description,
        reason: viz.reason
      }))
    };
  } catch (error) {
    console.error('Error processing query:', error);
    
    let errorMessage = '';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Connection to backend server timed out. Make sure the Flask server is running at http://localhost:5000';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Could not connect to the backend server. Please ensure the Flask server is running on http://localhost:5000. Check for CORS issues in your browser console.';
      } else {
        errorMessage = error.message;
      }
    } else {
      errorMessage = 'Unknown error';
    }
    
    // More visible error toast
    toast.error(`Failed to process query: ${errorMessage}`, {
      duration: 6000, // Show longer for user to read
    });
    
    // Return empty result on error
    return {
      data: [],
      sql: '',
      explanation: `Error processing query: ${errorMessage}. 
      
1. Make sure you've started the Flask backend with "cd src/server && python app.py"
2. Check that PostgreSQL is running with a database named "YellowBird"
3. Look for CORS errors in your browser console (press F12)`,
    };
  }
}

/**
 * Transform data from Python backend into the format expected by our frontend
 */
function transformDataFromPython(result: any): DataPoint[] {
  // If no visualizations, return empty array
  if (!result.visualizations || result.visualizations.length === 0) {
    return [];
  }
  
  // Extract data from the first visualization
  const firstViz = result.visualizations[0];
  
  if (firstViz.type === 'pie') {
    // For pie charts, we extract names and values
    const figData = firstViz.figure.data[0];
    return figData.labels.map((label: string, index: number) => ({
      name: label,
      value: figData.values[index]
    }));
  } else if (firstViz.type === 'bar' || firstViz.type === 'line' || firstViz.type === 'scatter') {
    // For bar/line/scatter charts, we extract x and y values
    const figData = firstViz.figure.data[0];
    return figData.x.map((xValue: string, index: number) => ({
      name: xValue.toString(),
      value: figData.y[index]
    }));
  } else if (firstViz.type === 'histogram') {
    // For histograms, we need to process bin data
    const figData = firstViz.figure.data[0];
    // Use bin midpoints as names and heights as values
    const binMidpoints = figData.x.map((val: number, i: number) => 
      i < figData.x.length - 1 ? (val + figData.x[i+1])/2 : val);
    
    return binMidpoints.map((midpoint: number, index: number) => ({
      name: midpoint.toFixed(2),
      value: figData.y[index]
    }));
  }
  
  // Default fallback - try to extract any data we can
  try {
    const figData = firstViz.figure.data[0];
    if (figData.x && figData.y) {
      return figData.x.map((xValue: string, index: number) => ({
        name: xValue.toString(),
        value: figData.y[index]
      }));
    }
  } catch (err) {
    console.error('Error extracting data from visualization:', err);
  }
  
  return [];
}
