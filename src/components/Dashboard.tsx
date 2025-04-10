
import { useState, useEffect } from 'react';
import ChartCard from './ChartCard';
import PlotlyVisualization from './PlotlyVisualization';
import { Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { QueryResult } from '@/lib/queryService';

interface DashboardProps {
  data: any[] | null;
  isLoading: boolean;
  query?: string;
  isSharedView?: boolean;
  visualizations?: QueryResult['visualizations'];
}

const Dashboard = ({
  data,
  isLoading,
  query = '',
  isSharedView = false,
  visualizations = []
}: DashboardProps) => {
  const [showDashboard, setShowDashboard] = useState(false);
  
  useEffect(() => {
    // Show dashboard if we have data or visualizations
    const hasData = data && data.length > 0;
    const hasVisualizations = visualizations && visualizations.length > 0;
    
    if ((hasData || hasVisualizations) && !isLoading) {
      setShowDashboard(true);
      console.log("Dashboard showing with visualizations:", visualizations?.length || 0);
    } else {
      console.log("Dashboard not showing: hasData=", hasData, "hasVisualizations=", hasVisualizations, "isLoading=", isLoading);
      
      // Force dashboard to show with test data if we have query but no data/visualizations
      if (query && !isLoading && !hasData && !hasVisualizations) {
        console.log("Forcing dashboard to show with empty state for query:", query);
        setShowDashboard(true);
      }
    }
  }, [data, isLoading, visualizations, query]);
  
  useEffect(() => {
    // For debugging visualizations
    console.log('Dashboard visualizations state:', {
      count: visualizations?.length || 0,
      isArray: Array.isArray(visualizations),
      isEmpty: !visualizations || visualizations.length === 0,
      visObjects: visualizations
    });
    
    if (visualizations && visualizations.length > 0) {
      console.log('Dashboard received visualizations:', visualizations.length);
      visualizations.forEach((viz, idx) => {
        console.log(`Visualization ${idx+1}:`, {
          type: viz.type,
          hasFigure: !!viz.figure,
          description: viz.description,
          figureType: typeof viz.figure
        });
        
        // Check that the figure has correct properties
        if (viz.figure) {
          try {
            const figData = typeof viz.figure === 'string' ? JSON.parse(viz.figure) : viz.figure;
            console.log(`Visualization ${idx+1} figure:`, {
              hasData: !!figData.data && Array.isArray(figData.data),
              dataLength: figData.data?.length || 0,
              hasLayout: !!figData.layout,
              firstTrace: figData.data && figData.data.length > 0 ? figData.data[0].type : 'none'
            });
          } catch (e) {
            console.error(`Error parsing visualization ${idx+1} figure:`, e);
          }
        }
      });
    } else {
      console.log('No visualizations available in Dashboard');
    }
  }, [visualizations]);

  // Return early with loading state
  if (isLoading) {
    return (
      <div className="w-full mt-8 mb-20 animate-fade-in-up">
        <div className="container px-4 mx-auto">
          <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-6 pb-8">
            <div className="flex justify-center items-center h-60">
              <p className="text-muted-foreground">Loading visualizations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no dashboard and no showDashboard flag, don't render anything
  if (!showDashboard) return null;

  // Helper function to determine chart types based on query
  const determineChartTypes = (query: string) => {
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
      return ['bar', 'pie', 'line', 'area'];
    }
  };
  
  const chartTypes = determineChartTypes(query);
  
  return (
    <div className="w-full mt-8 mb-20 animate-fade-in-up">
      <div className="container px-4 mx-auto">
        <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-6 pb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-md bg-amber-300">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {isSharedView ? 'Shared Dashboard' : 'Dashboard Results'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isSharedView ? 'View and analyze shared data' : 'Generated from your query'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <button 
                className="flex items-center space-x-2 bg-secondary px-3 py-2 rounded-md hover:bg-secondary/80 transition-colors text-sm" 
                onClick={() => {
                  console.log('Download dashboard');
                  toast.info('Dashboard export feature coming soon');
                }}
              >
                <Download className="h-4 w-4" />
                <span>Export Dashboard</span>
              </button>
            </div>
          </div>
          
          {visualizations && visualizations.length > 0 ? (
            // Display Plotly visualizations with flexible layout
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visualizations.map((viz, index) => {
                console.log(`Rendering visualization ${index}:`, viz.type);
                return (
                  <PlotlyVisualization 
                    key={`viz-${index}`} 
                    title={viz.description || `${viz.type.charAt(0).toUpperCase() + viz.type.slice(1)} Chart`} 
                    description={viz.reason || 'Generated visualization'} 
                    figure={viz.figure} 
                    type={viz.type || 'bar'} 
                  />
                );
              })}
            </div>
          ) : data && data.length > 0 ? (
            // Fallback to recharts visualizations if Plotly data not available
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard 
                title="Primary Visualization" 
                description="Main chart for your query" 
                chartType={chartTypes[0] as 'bar' | 'line' | 'pie' | 'area'} 
                data={data} 
                dataKey="value" 
                nameKey="name" 
              />
              
              {chartTypes.length > 1 && (
                <ChartCard 
                  title="Alternative View" 
                  description="Different perspective on the data" 
                  chartType={chartTypes[1] as 'bar' | 'line' | 'pie' | 'area'} 
                  data={data} 
                  dataKey="value" 
                  nameKey="name" 
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-60">
              <p className="text-muted-foreground mb-4">No visualization data available</p>
              <p className="text-sm text-muted-foreground">Try a query that would benefit from data visualization</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
