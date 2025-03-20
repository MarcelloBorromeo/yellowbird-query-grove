
import { useState, useEffect } from 'react';
import ChartCard from './ChartCard';
import { Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardProps {
  data: any[] | null;
  isLoading: boolean;
  query?: string;
  isSharedView?: boolean;
}

const Dashboard = ({
  data,
  isLoading,
  query = '',
  isSharedView = false
}: DashboardProps) => {
  const [showDashboard, setShowDashboard] = useState(false);
  
  useEffect(() => {
    if (data && !isLoading) {
      setShowDashboard(true);
    }
  }, [data, isLoading]);
  
  if (!showDashboard) return null;
  
  // Helper function to determine chart types based on query
  const determineChartTypes = (query: string) => {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('distribution') || queryLower.includes('frequency')) {
      return ['pie', 'bar'];
    } else if (queryLower.includes('trend') || queryLower.includes('over time') || 
               queryLower.includes('monthly') || queryLower.includes('yearly')) {
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
                  {isSharedView 
                    ? 'View and analyze shared data' 
                    : 'Generated from your query'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
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
            {data && data.length > 0 ? (
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
                
                {chartTypes.length > 2 && (
                  <ChartCard 
                    title="Detailed Analysis" 
                    description="In-depth data breakdown" 
                    chartType={chartTypes[2] as 'bar' | 'line' | 'pie' | 'area'} 
                    data={data} 
                    dataKey="value" 
                    nameKey="name" 
                  />
                )}
                
                {chartTypes.length > 3 && (
                  <ChartCard 
                    title="Trend Overview" 
                    description="Visual representation of data trends" 
                    chartType={chartTypes[3] as 'bar' | 'line' | 'pie' | 'area'} 
                    data={data} 
                    dataKey="value" 
                    nameKey="name" 
                  />
                )}
              </>
            ) : (
              <div className="col-span-2 flex justify-center items-center h-60">
                <p className="text-muted-foreground">No data available to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
