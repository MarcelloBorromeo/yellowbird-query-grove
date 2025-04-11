
import { DataPoint } from './mockData';

export interface QueryResult {
  data: DataPoint[];
  sql: string;
  explanation: string;
  visualizations: {
    type: string;
    figure: any;
    description: string;
    reason: string;
  }[];
  toolCalls?: {
    id: string;
    name: string;
    arguments: Record<string, any>;
    output: string;
  }[];
  currentToolCallIndex?: number;
  totalToolCalls?: number;
}

// Default API endpoint - can be overridden by environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

// Create a mock response when the backend is not available
function createMockResponse(query: string): QueryResult {
  console.log("Creating mock response for query:", query);
  
  // Basic mock data
  const mockData: DataPoint[] = [
    { name: "Category A", value: 30 },
    { name: "Category B", value: 45 },
    { name: "Category C", value: 25 }
  ];
  
  // Create a simple mock visualization
  const mockVisualization = {
    type: 'bar',
    figure: {
      data: [
        {
          type: 'bar',
          x: ['Category A', 'Category B', 'Category C'],
          y: [30, 45, 25],
          marker: { color: '#36B37E' }
        }
      ],
      layout: {
        title: 'Sample Data Visualization',
        xaxis: { title: 'Category' },
        yaxis: { title: 'Value' },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
      }
    },
    description: "Sample data visualization",
    reason: "This is a mock visualization because the backend service is currently unavailable."
  };
  
  return {
    data: mockData,
    sql: "-- Mock SQL query\nSELECT category, value FROM sample_data;",
    explanation: `This is a mock response because the backend service is unavailable.\n\nYour query was: "${query}"\n\nPlease make sure the backend service is running at ${API_BASE_URL} or set the VITE_API_URL environment variable to your backend endpoint.`,
    visualizations: [mockVisualization]
  };
}

// Function to extract table data from markdown format
function extractTableData(markdownText: string): { headers: string[], rows: string[][] } | null {
  if (!markdownText) return null;
  
  // Look for markdown table pattern
  const tablePattern = /\|\s*(.*?)\s*\|\s*\n\|\s*[-:\|\s]+\|\s*\n((?:\|\s*.*?\s*\|\s*\n)+)/;
  const match = markdownText.match(tablePattern);
  
  if (!match) return null;
  
  // Extract headers
  const headerLine = match[1];
  const headers = headerLine.split('|')
    .map(h => h.trim())
    .filter(h => h.length > 0);
  
  // Extract rows
  const rowsText = match[2];
  const rows = rowsText.trim().split('\n')
    .map(row => row.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0)
    );
  
  return { headers, rows };
}

// Create a visualization from table data
function createVisualizationFromTable(tableData: { headers: string[], rows: string[][] }, query: string): any {
  try {
    // Check if we have valid data
    if (!tableData || !tableData.headers || !tableData.rows || tableData.rows.length === 0) {
      return null;
    }
    
    // Determine if headers indicate time/date and value columns
    const dateColumnIndex = tableData.headers.findIndex(h => 
      h.toLowerCase().includes('date') || 
      h.toLowerCase().includes('time') || 
      h.toLowerCase().includes('month') || 
      h.toLowerCase().includes('year')
    );
    
    const valueColumnIndex = tableData.headers.findIndex(h => 
      h.toLowerCase().includes('sales') || 
      h.toLowerCase().includes('value') || 
      h.toLowerCase().includes('amount') || 
      h.toLowerCase().includes('total')
    );
    
    // If we can identify date and value columns, create a line chart
    if (dateColumnIndex >= 0 && valueColumnIndex >= 0) {
      const xValues = tableData.rows.map(row => row[dateColumnIndex]);
      const yValues = tableData.rows.map(row => parseFloat(row[valueColumnIndex].replace(/,/g, '')));
      
      // Create a Plotly line chart figure
      const figure = {
        data: [
          {
            type: 'scatter',
            mode: 'lines+markers',
            x: xValues,
            y: yValues,
            name: tableData.headers[valueColumnIndex],
            marker: { color: '#4C9AFF' }
          }
        ],
        layout: {
          title: `${tableData.headers[valueColumnIndex]} over time`,
          xaxis: { title: tableData.headers[dateColumnIndex] },
          yaxis: { title: tableData.headers[valueColumnIndex] }
        }
      };
      
      return {
        type: 'line',
        figure,
        description: `${tableData.headers[valueColumnIndex]} over ${tableData.headers[dateColumnIndex]}`,
        reason: `Visualizing the trend of ${tableData.headers[valueColumnIndex]} over time.`
      };
    }
    
    // If we couldn't identify specific columns, create a generic bar chart
    // Using the first column as categories and second as values
    if (tableData.headers.length >= 2) {
      const xValues = tableData.rows.map(row => row[0]);
      const yValues = tableData.rows.map(row => parseFloat(row[1].replace(/,/g, '')));
      
      // Create a Plotly bar chart figure
      const figure = {
        data: [
          {
            type: 'bar',
            x: xValues,
            y: yValues,
            name: tableData.headers[1],
            marker: { color: '#36B37E' }
          }
        ],
        layout: {
          title: tableData.headers[1],
          xaxis: { title: tableData.headers[0] },
          yaxis: { title: tableData.headers[1] }
        }
      };
      
      return {
        type: 'bar',
        figure,
        description: `${tableData.headers[1]} by ${tableData.headers[0]}`,
        reason: `Comparing ${tableData.headers[1]} across different ${tableData.headers[0]} categories.`
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error creating visualization from table:", error);
    return null;
  }
}

export async function processQuery(query: string): Promise<QueryResult> {
  console.log("Processing query:", query);
  
  try {
    // Use the backend API
    const response = await fetch(`${API_BASE_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        'question': query
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error processing query');
    }
    
    const responseData = await response.json();
    console.log("Response from backend:", responseData);
    
    // Extract tool calls from the response history
    const toolCalls: QueryResult['toolCalls'] = [];
    let visualizations: QueryResult['visualizations'] = [];
    
    // Process history to extract tool calls and outputs if available
    if (responseData.history) {
      for (const message of responseData.history) {
        if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
          message.tool_calls.forEach((toolCall: any, index: number) => {
            const matchingOutput = message.tool_outputs?.find((output: any) => 
              output.tool_call_id === toolCall.id
            );
            
            if (toolCall.function) {
              let parsedArgs = {};
              try {
                parsedArgs = JSON.parse(toolCall.function.arguments);
              } catch (e) {
                console.error("Error parsing tool call arguments:", e);
              }
              
              toolCalls.push({
                id: toolCall.id,
                name: toolCall.function.name,
                arguments: parsedArgs,
                output: matchingOutput?.content || ''
              });
            }
          });
        }
      }
    }
    
    // Check for visualizations in the response, handle multiple formats
    if (responseData.visualizations) {
      console.log("Visualization data found:", responseData.visualizations);
      
      // Process array format visualizations
      if (Array.isArray(responseData.visualizations)) {
        visualizations = responseData.visualizations.map((viz: any) => {
          let figureData;
          try {
            figureData = typeof viz.figure === 'string' ? JSON.parse(viz.figure) : viz.figure;
          } catch (e) {
            console.error("Error parsing visualization figure:", e);
            figureData = { data: [], layout: {} }; // Provide default empty figure
          }
          
          return {
            type: viz.type || 'bar',
            figure: figureData,
            description: viz.description || 'Visualization',
            reason: viz.reason || 'This chart helps visualize your data.'
          };
        });
        
        console.log(`Processed ${visualizations.length} array-format visualizations`);
      } 
      // Process object format visualizations
      else if (typeof responseData.visualizations === 'object') {
        visualizations = Object.entries(responseData.visualizations).map(([id, vizData]: [string, any]) => {
          let figureData;
          try {
            figureData = typeof vizData === 'string' ? JSON.parse(vizData) : vizData;
          } catch (e) {
            console.error("Error parsing visualization JSON:", e);
            figureData = { data: [], layout: {} }; // Provide default empty figure
          }
          
          // Try to determine visualization type
          let vizType = 'bar';
          if (figureData.data && figureData.data.length > 0) {
            const firstTrace = figureData.data[0];
            if (firstTrace.type === 'pie') {
              vizType = 'pie';
            } else if (firstTrace.type === 'scatter' && firstTrace.mode?.includes('lines')) {
              vizType = 'line';
            } else if (firstTrace.type === 'scatter' && firstTrace.mode?.includes('markers')) {
              vizType = 'scatter';
            }
          }
          
          return {
            type: vizType,
            figure: figureData,
            description: `Visualization ${id}`,
            reason: `This chart helps visualize your data.`
          };
        });
        
        console.log(`Processed ${visualizations.length} object-format visualizations`);
      }
      
      // If we still have no visualizations, check in history
      if (visualizations.length === 0 && responseData.history) {
        for (const message of responseData.history) {
          if (message.role === 'assistant' && message.visualization) {
            try {
              const vizData = typeof message.visualization === 'string' 
                ? JSON.parse(message.visualization) 
                : message.visualization;
              
              // Skip if no data
              if (!vizData || (Array.isArray(vizData.data) && vizData.data.length === 0)) {
                continue;
              }
              
              visualizations.push({
                type: 'bar', // Default type
                figure: vizData,
                description: 'Visualization from chat history',
                reason: 'This chart was generated during the conversation.'
              });
              
              console.log("Found visualization in chat history");
            } catch (e) {
              console.error("Error parsing visualization from chat history:", e);
            }
          }
        }
      }
    } else {
      console.log("No visualizations found in response data");
    }
    
    // Extract explanation based on the response format
    let explanation = '';
    
    if (responseData.RESULT) {
      // Use the RESULT field if available
      explanation = responseData.RESULT;
    } else if (responseData.history) {
      // Fall back to extracting from history if available
      const assistantMessages = responseData.history.filter((msg: any) => msg.role === 'assistant');
      if (assistantMessages.length > 0) {
        explanation = assistantMessages[assistantMessages.length - 1].content || '';
      }
    }
    
    // If we still don't have visualizations, try to extract table data from the explanation
    if (visualizations.length === 0 && explanation) {
      console.log("Trying to create visualization from table in explanation");
      const tableData = extractTableData(explanation);
      if (tableData) {
        console.log("Found table data in explanation:", tableData);
        const tableViz = createVisualizationFromTable(tableData, query);
        if (tableViz) {
          console.log("Created visualization from table data");
          visualizations.push(tableViz);
        }
      }
    }
    
    // Create a simplified mock data structure for backward compatibility
    const mockData: DataPoint[] = [];
    
    console.log("Final visualizations to render:", visualizations.length);
    
    return {
      data: mockData, // This will be empty but maintains API compatibility
      sql: toolCalls.length > 0 ? JSON.stringify(toolCalls[0].arguments, null, 2) : 
           responseData.final_query || '',
      explanation,
      visualizations,
      toolCalls,
      currentToolCallIndex: toolCalls.length > 0 ? 0 : undefined,
      totalToolCalls: toolCalls.length,
    };
  } catch (error) {
    console.error("Error in processing query:", error);
    
    // If error is related to connection (failed to fetch), return a mock response
    if (error instanceof Error && error.message.includes('fetch')) {
      console.log("Backend connection failed. Using mock response instead.");
      return createMockResponse(query);
    }
    
    throw createUserFriendlyError(error);
  }
}

function createUserFriendlyError(error: unknown): Error {
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = 'Unknown error occurred';
  }
  
  return new Error(`There was an error processing your query: ${errorMessage}`);
}
