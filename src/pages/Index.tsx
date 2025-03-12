import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import QueryInput from '@/components/QueryInput';
import QueryProcess from '@/components/QueryProcess';
import Dashboard from '@/components/Dashboard';
import ResponseContainer from '@/components/ResponseContainer';
import SuggestionChips from '@/components/SuggestionChips';
import { generateMockSQL, generateMockData, DataPoint } from '@/lib/mockData';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const Index = () => {
  const [userQuery, setUserQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [dashboardData, setDashboardData] = useState<DataPoint[] | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Check if we're viewing a shared dashboard
  useEffect(() => {
    const sharedDashboardId = searchParams.get('dashboard');
    if (sharedDashboardId) {
      setIsSharedView(true);
      loadSharedDashboard(sharedDashboardId);
    }
  }, [searchParams]);
  
  const loadSharedDashboard = async (dashboardId: string) => {
    setIsProcessing(true);
    
    try {
      // In a real app, this would fetch from a database
      // For now, we'll simulate loading a dashboard based on query type
      
      let sampleQuery = '';
      if (dashboardId.includes('revenue')) {
        sampleQuery = 'Show me revenue trends by product category';
      } else if (dashboardId.includes('users')) {
        sampleQuery = 'How many active users do we have by month?';
      } else if (dashboardId.includes('conversion')) {
        sampleQuery = 'What is our conversion rate by country?';
      } else {
        sampleQuery = 'Show me top performing metrics';
      }
      
      setUserQuery(sampleQuery);
      
      const { sql, success } = await generateMockSQL(sampleQuery);
      setSqlQuery(success ? sql : '');
      
      const data = await generateMockData(sampleQuery);
      setDashboardData(data);
      
      setResponse(`This is a shared dashboard based on the query: "${sampleQuery}". You can explore the data or create your own query to analyze different aspects of the data.`);
      
      toast.success('Shared dashboard loaded successfully');
    } catch (error) {
      console.error('Error loading shared dashboard:', error);
      toast.error('Failed to load shared dashboard');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSubmitQuery = async (query: string, isFollowUp: boolean = false) => {
    setUserQuery(query);
    setIsProcessing(true);
    setSqlQuery(null);
    setHasError(false);
    setRetryCount(0);
    
    if (!isFollowUp) {
      setDashboardData(null);
      setResponse(null);
      setQueryHistory([]);
    } else {
      // For follow-up queries, keep the history
      setQueryHistory(prev => [...prev, userQuery]);
    }
    
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
        let responseText = '';
        
        if (isFollowUp) {
          responseText = `Based on your follow-up question "${query}", I've refined the analysis. `;
        }
        
        if (query.toLowerCase().includes("conversion rate")) {
          responseText += "The conversion rate varies significantly by country, with Japan (15.3%) and Germany (14.8%) showing the highest rates, while Brazil (6.2%) and Mexico (7.1%) have lower conversion rates. North American and European markets generally outperform other regions.";
        } else if (query.toLowerCase().includes("active users")) {
          responseText += "The data shows a steady increase in monthly active users over the past 6 months, with a notable 23% overall growth. There was a significant spike in activity during March, likely due to the new feature release. Weekend usage remains consistently higher than weekday engagement, and mobile users account for 73% of all active sessions.";
        } else if (query.toLowerCase().includes("revenue")) {
          responseText += "The revenue analysis reveals that the 'Premium' category generates the highest income (42% of total), followed by 'Essential' (28%) and 'Basic' (18%). Year-over-year growth is strongest in the 'Premium' segment at 34%, while 'Basic' has plateaued with only 3% growth compared to last year.";
        } else {
          responseText += "I've analyzed the data based on your query. The visualizations below show the key trends and patterns found in the dataset. You can see the distribution of values across different categories and how they've changed over time.";
        }
        
        setResponse(responseText);
      }, 1000);
      
      toast.success(isFollowUp ? "Follow-up query processed" : "Query processed successfully");
    } catch (error) {
      console.error("Error processing query:", error);
      setHasError(true);
      toast.error("An error occurred while processing your query");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSelectSuggestion = (suggestion: string) => {
    handleSubmitQuery(suggestion);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50/70 via-white to-yellow-50/50">
      <Header />
      
      <main className="pt-20 pb-20 px-4 relative z-10">
        <div className="max-w-screen-xl mx-auto">
          {!isSharedView ? (
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
          ) : (
            <div className="text-center mb-10">
              <div className="inline-block mb-2 py-1 px-3 bg-yellowbird-50 text-yellowbird-800 rounded-full text-xs font-medium">
                Shared Dashboard
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">YellowBird Shared Analysis</h1>
              <p className="text-gray-600 max-w-2xl mx-auto text-base">
                This is a shared data analysis dashboard. You can explore the visualizations or create your own query.
              </p>
            </div>
          )}
          
          <div className="max-w-3xl mx-auto space-y-6">
            <SuggestionChips onSelectSuggestion={handleSelectSuggestion} />
            <QueryInput 
              onSubmitQuery={handleSubmitQuery} 
              isProcessing={isProcessing} 
              previousQuery={userQuery}
              queryHistory={queryHistory}
            />
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
            query={userQuery}
            isSharedView={isSharedView}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
