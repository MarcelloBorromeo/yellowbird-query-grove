
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ChartCard from './ChartCard';
import { Download, Calendar } from 'lucide-react';

interface DashboardProps {
  data: any[] | null;
  isLoading: boolean;
}

const Dashboard = ({ data, isLoading }: DashboardProps) => {
  const [showDashboard, setShowDashboard] = useState(false);
  
  useEffect(() => {
    if (data && !isLoading) {
      setShowDashboard(true);
    }
  }, [data, isLoading]);
  
  if (!showDashboard) return null;
  
  return (
    <div className="w-full mt-8 mb-20 animate-fade-in-up">
      <div className="container px-4 mx-auto">
        <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-6 pb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="bg-primary/10 p-2 rounded-md">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Dashboard Results</h2>
                <p className="text-sm text-muted-foreground">Generated from your query</p>
              </div>
            </div>
            
            <button 
              className="flex items-center space-x-2 bg-secondary px-3 py-2 rounded-md hover:bg-secondary/80 transition-colors text-sm"
              onClick={() => console.log('Download dashboard')}
            >
              <Download className="h-4 w-4" />
              <span>Export Dashboard</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data && data.length > 0 ? (
              <>
                <ChartCard
                  title="Monthly Active Users"
                  description="Trend over the last 6 months"
                  chartType="line"
                  data={data}
                  dataKey="value"
                  nameKey="name"
                />
                
                <ChartCard
                  title="Data Distribution"
                  description="Breakdown by category"
                  chartType="pie"
                  data={data}
                  dataKey="value"
                  nameKey="name"
                />
                
                <ChartCard
                  title="Comparison View"
                  description="Side-by-side analysis"
                  chartType="bar"
                  data={data}
                  dataKey="value"
                  nameKey="name"
                />
                
                <ChartCard
                  title="Cumulative Growth"
                  description="Progressive increase over time"
                  chartType="area"
                  data={data}
                  dataKey="value"
                  nameKey="name"
                />
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
