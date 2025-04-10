
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
    const visualizations: QueryResult['visualizations'] = [];
    
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
    
    // Process visualizations from the response
    if (responseData.visualizations) {
      // Check if it's an array (as in your log) or an object (as in previous code)
      if (Array.isArray(responseData.visualizations)) {
        for (const viz of responseData.visualizations) {
          try {
            const plotData = typeof viz.figure === 'string' ? JSON.parse(viz.figure) : viz.figure;
            
            visualizations.push({
              type: viz.type || 'bar',
              figure: plotData,
              description: viz.description || 'Visualization',
              reason: viz.reason || 'This chart helps visualize your data.'
            });
          } catch (e) {
            console.error("Error parsing visualization:", e);
          }
        }
      } else {
        // Handle the previous object format if needed
        for (const [toolCallId, plotlyJson] of Object.entries(responseData.visualizations)) {
          try {
            const plotData = typeof plotlyJson === 'string' ? JSON.parse(plotlyJson) : plotlyJson;
            
            // Simple heuristic to guess visualization type
            let visType = 'bar';
            if (plotData.data && plotData.data.length > 0) {
              const firstTrace = plotData.data[0];
              if (firstTrace.type === 'pie') {
                visType = 'pie';
              } else if (firstTrace.type === 'scatter' && firstTrace.mode?.includes('lines')) {
                visType = 'line';
              } else if (firstTrace.type === 'scatter' && firstTrace.fill === 'tozeroy') {
                visType = 'area';
              } else if (firstTrace.type === 'scatter' && firstTrace.mode?.includes('markers')) {
                visType = 'scatter';
              }
            }
            
            visualizations.push({
              type: visType,
              figure: plotData,
              description: `${visType.charAt(0).toUpperCase() + visType.slice(1)} Visualization`,
              reason: `This ${visType} chart helps visualize your data.`
            });
          } catch (e) {
            console.error("Error parsing visualization JSON:", e);
          }
        }
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
