
import { useState, useEffect } from 'react';
import ChartCard from './ChartCard';
import PlotlyVisualization from './PlotlyVisualization';
import { Download, Calendar, ServerOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { QueryResult } from '@/lib/queryService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface DashboardProps {
  data: any[] | null;
  isLoading: boolean;
  query?: string;
  isSharedView?: boolean;
  visualizations?: QueryResult['visualizations'];
  hasError?: boolean;
}

const Dashboard = ({
  data,
  isLoading,
  query = '',
  isSharedView = false,
  visualizations = [],
  hasError = false
}: DashboardProps) => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  useEffect(() => {
    if ((data && !isLoading) || (visualizations && visualizations.length > 0)) {
      setShowDashboard(true);
    } else if (hasError) {
      // Show dashboard even on error, to display error state
      setShowDashboard(true);
      setIsOfflineMode(true);
    }
  }, [data, isLoading, visualizations, hasError]);
  
  useEffect(() => {
    // For debugging
    if (visualizations && visualizations.length > 0) {
      console.log('Dashboard received visualizations:', visualizations.length);
      visualizations.forEach((viz, idx) => {
        console.log(`Visualization ${idx+1} type:`, viz.type);
        console.log(`Visualization ${idx+1} has figure:`, !!viz.figure);
        
        // Check that the figure has correct properties
        if (viz.figure) {
          try {
            const figData = typeof viz.figure === 'string' ? JSON.parse(viz.figure) : viz.figure;
            console.log(`Visualization ${idx+1} has data:`, !!figData.data);
            console.log(`Visualization ${idx+1} has layout:`, !!figData.layout);
          } catch (e) {
            console.error(`Error parsing visualization ${idx+1} figure:`, e);
          }
        }
      });
    } else {
      console.log('No visualizations available in Dashboard');
    }
  }, [visualizations]);

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

  // If we're in offline mode due to connection errors
  if (isOfflineMode) {
    return (
      <div className="w-full mt-8 mb-20 animate-fade-in-up">
        <div className="container px-4 mx-auto">
          <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-6 pb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-md bg-amber-300">
                  <ServerOff className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Backend Connection Issue</h2>
                  <p className="text-sm text-muted-foreground">
                    Unable to connect to the data server
                  </p>
                </div>
              </div>
            </div>
            
            <Alert variant="destructive" className="mb-6">
              <AlertTitle className="text-destructive">Cannot connect to backend server</AlertTitle>
              <AlertDescription>
                <p className="mb-3">It appears that the YellowBird backend server is not running or is inaccessible.</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Make sure the Flask server is running: <code className="bg-secondary/30 p-1 rounded text-xs">python app.py</code> in the <code className="bg-secondary/30 p-1 rounded text-xs">src/server</code> directory</li>
                  <li>Ensure PostgreSQL is running with a database named "YellowBird"</li>
                  <li>Check your browser console (F12) for CORS or network errors</li>
                  <li>Make sure port 5001 is not being used by another application</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  window.location.reload();
                  toast.info("Attempting to reconnect to the backend server");
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry Connection</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visualizations && visualizations.length > 0 ? (
              // Map through the visualizations from the backend
              visualizations.map((viz, index) => (
                <PlotlyVisualization 
                  key={`viz-${index}`} 
                  title={viz.description || viz.type.charAt(0).toUpperCase() + viz.type.slice(1) + ' Chart'} 
                  description={viz.reason || 'Generated visualization'} 
                  figure={viz.figure} 
                  type={viz.type} 
                />
              ))
            ) : data && data.length > 0 ? (
              // Fallback to recharts visualizations if Plotly data not available
              <>
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
              </>
            ) : (
              <div className="col-span-2 flex flex-col justify-center items-center h-60">
                <p className="text-muted-foreground mb-4">No visualization data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
