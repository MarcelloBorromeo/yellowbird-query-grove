import { useState } from 'react';
import Header from '@/components/Header';
import QueryInput from '@/components/QueryInput';
import QueryProcess from '@/components/QueryProcess';
import Dashboard from '@/components/Dashboard';
import ResponseContainer from '@/components/ResponseContainer';
import { generateMockSQL, generateMockData, DataPoint } from '@/lib/mockData';
import { toast } from 'sonner';

const Index = () => {
  const [userQuery, setUserQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [dashboardData, setDashboardData] = useState<DataPoint[] | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  
  const handleSubmitQuery = async (query: string) => {
    setUserQuery(query);
    setIsProcessing(true);
    setSqlQuery(null);
    setHasError(false);
    setRetryCount(0);
    setDashboardData(null);
    setResponse(null);
    
    try {
      const { sql, success } = await generateMockSQL(query);
      
      if (!success) {
        setRetryCount(1);
        toast.info("First SQL attempt failed, retrying with additional context");
        
        const retryResult = await generateMockSQL(query);
        
        if (!retryResult.success) {
          setHasError(true);
          toast.error("Failed to generate valid SQL");
          setIsProcessing(false);
          return;
        }
        
        setSqlQuery(retryResult.sql);
      } else {
        setSqlQuery(sql);
      }
      
      const data = await generateMockData(query);
      setDashboardData(data);
      
      setTimeout(() => {
        if (query.toLowerCase().includes("conversion rate")) {
          setResponse("Based on your query, I've analyzed the data and found some interesting patterns. The conversion rate varies significantly by country, with Japan (15.3%) and Germany (14.8%) showing the highest rates, while Brazil (6.2%) and Mexico (7.1%) have lower conversion rates. North American and European markets generally outperform other regions.");
        } else if (query.toLowerCase().includes("active users")) {
          setResponse("The data shows a steady increase in monthly active users over the past 6 months, with a notable 23% overall growth. There was a significant spike in activity during March, likely due to the new feature release. Weekend usage remains consistently higher than weekday engagement, and mobile users account for 73% of all active sessions.");
        } else if (query.toLowerCase().includes("revenue")) {
          setResponse("The revenue analysis reveals that the 'Premium' category generates the highest income (42% of total), followed by 'Essential' (28%) and 'Basic' (18%). Year-over-year growth is strongest in the 'Premium' segment at 34%, while 'Basic' has plateaued with only 3% growth compared to last year.");
        } else {
          setResponse("I've analyzed the data based on your query. The visualizations below show the key trends and patterns found in the dataset. You can see the distribution of values across different categories and how they've changed over time.");
        }
      }, 1000);
      
      toast.success("Query processed successfully");
    } catch (error) {
      console.error("Error processing query:", error);
      setHasError(true);
      toast.error("An error occurred while processing your query");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF7CD]/30">
      <Header />
      
      <main className="pt-20 pb-20 px-4 relative z-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-block mb-2 py-1 px-3 bg-yellowbird-50 text-yellowbird-800 rounded-full text-xs font-medium">
              Data Analytics Assistant
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">YellowBird Data Navigator</h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-base">
              Ask questions about your data in natural language. YellowBird will translate your query
              into SQL, retrieve the data, and generate interactive visualizations.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-6">
            <QueryInput onSubmitQuery={handleSubmitQuery} isProcessing={isProcessing} />
            <QueryProcess 
              userQuery={userQuery}
              isProcessing={isProcessing}
              sqlQuery={sqlQuery}
              hasError={hasError}
              retryCount={retryCount}
            />
            <ResponseContainer
              response={response}
              isLoading={isProcessing && dashboardData === null}
            />
          </div>
          
          <Dashboard 
            data={dashboardData}
            isLoading={isProcessing}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
