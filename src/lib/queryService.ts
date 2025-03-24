
import { generateMockData, generateMockSQL } from './mockData';
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
}

export async function processQuery(query: string): Promise<QueryResult> {
  console.log("Processing query:", query);
  
  try {
    // Use mock data generator instead of the backend
    const mockData = await generateMockData(query);
    const mockSQL = await generateMockSQL(query);
    
    // Generate mock visualization data based on query
    const visualizationType = determineVisualizationType(query);
    const mockVisualizations = generateMockVisualizations(mockData, visualizationType);
    
    // Generate explanation based on the query
    const explanation = generateExplanation(query, mockData);
    
    return {
      data: mockData,
      sql: mockSQL.sql,
      explanation,
      visualizations: mockVisualizations
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

function determineVisualizationType(query: string): string[] {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('distribution') || queryLower.includes('frequency')) {
    return ['pie', 'bar'];
  } else if (queryLower.includes('trend') || queryLower.includes('over time') || queryLower.includes('monthly') || queryLower.includes('yearly')) {
    return ['line', 'area'];
  } else if (queryLower.includes('compare') || queryLower.includes('comparison')) {
    return ['bar', 'line'];
  } else if (queryLower.includes('correlation') || queryLower.includes('relationship')) {
    return ['scatter', 'bar'];
  } else {
    // Default chart types
    return ['bar', 'pie'];
  }
}

function generateExplanation(query: string, data: DataPoint[]): string {
  const queryLower = query.toLowerCase();
  
  if (data.length === 0) {
    return "No data was found for your query.";
  }
  
  // Find the highest value in the data
  const highestPoint = data.reduce((max, point) => 
    point.value > max.value ? point : max, data[0]);
  
  // Find the lowest value in the data
  const lowestPoint = data.reduce((min, point) => 
    point.value < min.value ? point : min, data[0]);
  
  // Calculate average
  const average = data.reduce((sum, point) => sum + point.value, 0) / data.length;
  
  if (queryLower.includes('monthly') || queryLower.includes('month')) {
    return `Analysis of monthly data shows that ${highestPoint.name} had the highest value at ${highestPoint.value}, while ${lowestPoint.name} had the lowest at ${lowestPoint.value}. The average across all months is ${average.toFixed(2)}.`;
  } else if (queryLower.includes('country') || queryLower.includes('countries')) {
    return `Comparing data across countries shows that ${highestPoint.name} leads with ${highestPoint.value}, while ${lowestPoint.name} has the lowest value at ${lowestPoint.value}. The average across all countries is ${average.toFixed(2)}.`;
  } else if (queryLower.includes('category') || queryLower.includes('product')) {
    return `Product category analysis indicates that ${highestPoint.name} is the top performer with a value of ${highestPoint.value}, while ${lowestPoint.name} has the lowest performance at ${lowestPoint.value}. The average performance across categories is ${average.toFixed(2)}.`;
  } else if (queryLower.includes('feature') || queryLower.includes('engagement')) {
    return `Feature engagement metrics show that ${highestPoint.name} has the highest usage at ${highestPoint.value}%, while ${lowestPoint.name} is used least at ${lowestPoint.value}%. The average engagement rate is ${average.toFixed(2)}%.`;
  } else {
    return `Analysis of your data shows a range from ${lowestPoint.value} (${lowestPoint.name}) to ${highestPoint.value} (${highestPoint.name}), with an average of ${average.toFixed(2)}.`;
  }
}

function generateMockVisualizations(data: DataPoint[], types: string[]): QueryResult['visualizations'] {
  return types.map((type, index) => {
    // Create Plotly figure based on visualization type
    const figure = createPlotlyFigure(data, type, index);
    
    return {
      type,
      figure,
      description: getVisualizationDescription(type, data),
      reason: getVisualizationReason(type, data)
    };
  });
}

function getVisualizationDescription(type: string, data: DataPoint[]): string {
  switch (type) {
    case 'bar':
      return `Bar Chart of ${data[0]?.name.includes('Group') ? 'Values' : data[0]?.name.split(' ')[0]} Distribution`;
    case 'line':
      return `Line Chart Showing ${data[0]?.name.includes('Jan') ? 'Monthly' : ''} Trends`;
    case 'pie':
      return `Pie Chart Showing Proportion by ${data[0]?.name.includes('Group') ? 'Group' : 'Category'}`;
    case 'area':
      return `Area Chart Showing ${data[0]?.name.includes('Jan') ? 'Monthly' : ''} Cumulative Values`;
    case 'scatter':
      return 'Scatter Plot Showing Data Distribution';
    default:
      return `${type.charAt(0).toUpperCase() + type.slice(1)} Visualization`;
  }
}

function getVisualizationReason(type: string, data: DataPoint[]): string {
  switch (type) {
    case 'bar':
      return 'This bar chart helps compare values across different categories.';
    case 'line':
      return 'This line chart shows the trend over time, helping identify patterns.';
    case 'pie':
      return 'This pie chart shows the proportion of each category relative to the whole.';
    case 'area':
      return 'This area chart highlights cumulative values and shows the overall volume.';
    case 'scatter':
      return 'This scatter plot helps identify correlations and outliers in the data.';
    default:
      return `This ${type} visualization provides insights into your data.`;
  }
}

function createPlotlyFigure(data: DataPoint[], type: string, colorIndex: number = 0): any {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];
  const color = colors[colorIndex % colors.length];
  
  // Structure for Plotly figure
  let figure: any = {
    data: [],
    layout: {
      margin: { l: 50, r: 20, t: 30, b: 50 },
      font: { family: 'Inter, system-ui, sans-serif', size: 12 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      xaxis: { gridcolor: 'rgba(0,0,0,0.1)', zerolinecolor: 'rgba(0,0,0,0.2)' },
      yaxis: { gridcolor: 'rgba(0,0,0,0.1)', zerolinecolor: 'rgba(0,0,0,0.2)' }
    }
  };
  
  switch (type) {
    case 'bar':
      figure.data.push({
        type: 'bar',
        x: data.map(d => d.name),
        y: data.map(d => d.value),
        marker: { color }
      });
      break;
      
    case 'line':
      figure.data.push({
        type: 'scatter',
        mode: 'lines+markers',
        x: data.map(d => d.name),
        y: data.map(d => d.value),
        line: { color, width: 2 },
        marker: { color, size: 8 }
      });
      break;
      
    case 'pie':
      figure.data.push({
        type: 'pie',
        labels: data.map(d => d.name),
        values: data.map(d => d.value),
        hole: 0.4,
        marker: { colors: data.map((_, i) => colors[i % colors.length]) }
      });
      figure.layout.legend = { orientation: 'h', y: -0.2 };
      break;
      
    case 'area':
      figure.data.push({
        type: 'scatter',
        mode: 'lines',
        x: data.map(d => d.name),
        y: data.map(d => d.value),
        fill: 'tozeroy',
        line: { color, width: 2 },
        fillcolor: color + '30' // Add transparency
      });
      break;
      
    case 'scatter':
      // For scatter plots, generate some random x values since we only have name and value
      const xValues = data.map((_, i) => Math.random() * 10 + i);
      figure.data.push({
        type: 'scatter',
        mode: 'markers',
        x: xValues,
        y: data.map(d => d.value),
        text: data.map(d => d.name),
        marker: { color, size: 10 }
      });
      break;
      
    default:
      // Default to bar chart
      figure.data.push({
        type: 'bar',
        x: data.map(d => d.name),
        y: data.map(d => d.value),
        marker: { color }
      });
  }
  
  return figure;
}
