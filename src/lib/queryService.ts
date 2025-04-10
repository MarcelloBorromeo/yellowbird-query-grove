
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

const API_BASE_URL = 'http://localhost:5002';

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
        }).filter((viz: any) => viz && viz.figure && viz.figure.data); // Filter out invalid visualizations
        
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
        }).filter((viz: any) => viz && viz.figure && viz.figure.data); // Filter out invalid visualizations
        
        console.log(`Processed ${visualizations.length} object-format visualizations`);
      }
    }
    
    // If the user asks for visualizations but none are returned, 
    // try to use the test visualization endpoint
    if (
      visualizations.length === 0 && 
      (query.toLowerCase().includes('chart') || 
       query.toLowerCase().includes('graph') || 
       query.toLowerCase().includes('plot') || 
       query.toLowerCase().includes('visual'))
    ) {
      try {
        console.log("No visualizations found but user requested one, trying test visualization endpoint");
        const testVizResponse = await fetch(`${API_BASE_URL}/api/test-visualization`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (testVizResponse.ok) {
          const testVizData = await testVizResponse.json();
          if (testVizData.visualizations && testVizData.visualizations.length > 0) {
            console.log("Retrieved test visualization:", testVizData.visualizations);
            visualizations = testVizData.visualizations;
          }
        }
      } catch (e) {
        console.error("Error fetching test visualization:", e);
      }
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
    
    // Create a simplified mock data structure for backward compatibility
    const mockData: DataPoint[] = [];
    
    // If we have visualization data but no real data, create some mock data
    if (visualizations.length > 0 && mockData.length === 0) {
      try {
        const firstViz = visualizations[0];
        if (firstViz.figure && firstViz.figure.data && firstViz.figure.data.length > 0) {
          const firstTrace = firstViz.figure.data[0];
          
          // Try to extract data from the visualization
          if (firstTrace.x && firstTrace.y) {
            for (let i = 0; i < Math.min(firstTrace.x.length, firstTrace.y.length); i++) {
              mockData.push({
                name: firstTrace.x[i].toString(),
                value: parseFloat(firstTrace.y[i])
              });
            }
          } else if (firstTrace.labels && firstTrace.values) {
            // For pie charts
            for (let i = 0; i < Math.min(firstTrace.labels.length, firstTrace.values.length); i++) {
              mockData.push({
                name: firstTrace.labels[i].toString(),
                value: parseFloat(firstTrace.values[i])
              });
            }
          }
        }
      } catch (e) {
        console.error("Error creating mock data from visualization:", e);
      }
    }
    
    return {
      data: mockData,
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
