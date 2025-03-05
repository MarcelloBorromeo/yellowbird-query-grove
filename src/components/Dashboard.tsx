
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ChartCard from './ChartCard';

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
  
  // Placeholder layout - in a real app, dynamically determine the best visualization
  return (
    <div className="w-full mt-8 mb-20 animate-fade-in-up">
      <div className="container px-4 mx-auto">
        <h2 className="text-xl font-semibold mb-6">Dashboard Results</h2>
        
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
  );
};

export default Dashboard;
