
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import QueryInput from '@/components/QueryInput';
import QueryProcess from '@/components/QueryProcess';
import Dashboard from '@/components/Dashboard';
import ResponseContainer from '@/components/ResponseContainer';
import SuggestionChips from '@/components/SuggestionChips';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { processQuery, QueryResult } from '@/lib/queryService';
import { DataPoint } from '@/lib/mockData';

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
  const [visualizations, setVisualizations] = useState<QueryResult['visualizations']>([]);
  const [searchParams] = useSearchParams();
  
  // Check if we're viewing a shared dashboard or chart
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
      
      // Use the real query service instead of mock data
      const result = await processQuery(sampleQuery);
      
      setSqlQuery(result.sql);
      setDashboardData(result.data);
      setResponse(result.explanation);
      setVisualizations(result.visualizations);
      
      toast.success('Dashboard loaded successfully');
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard');
      setHasError(true);
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
      setVisualizations([]);
      setQueryHistory([]);
    } else {
      // For follow-up queries, keep the history
      setQueryHistory(prev => [...prev, userQuery]);
    }
    
    try {
      // Use the real query service
      const result = await processQuery(query);
      
      setSqlQuery(result.sql);
      setVisualizations(result.visualizations);
      
      if (result.data && result.data.length > 0) {
        setDashboardData(result.data);
        setResponse(result.explanation);
        toast.success(isFollowUp ? "Follow-up query processed" : "Query processed successfully");
      } else {
        // Handle empty results
        setDashboardData([]);
        setResponse(result.explanation || "No data returned for this query.");
        toast.info("Query processed, but no data was returned");
      }
    } catch (error) {
      console.error("Error processing query:", error);
      setHasError(true);
      toast.error("An error occurred while processing your query");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRunModifiedSql = async (modifiedSql: string) => {
    setIsProcessing(true);
    setHasError(false);
    
    try {
      // In a real app, we'd send this modified SQL to the backend
      // For now, we'll just process the original query but show the new SQL
      const result = await processQuery(userQuery);
      
      // Override the SQL with the user-edited version
      setSqlQuery(modifiedSql);
      
      if (result.data && result.data.length > 0) {
        setDashboardData(result.data);
        setResponse(result.explanation);
        toast.success("Modified SQL query processed");
      } else {
        setDashboardData([]);
        setResponse("No data returned for this query.");
        toast.info("Query processed, but no data was returned");
      }
    } catch (error) {
      console.error("Error processing modified SQL:", error);
      setHasError(true);
      toast.error("An error occurred while processing your modified SQL");
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
              explanation={response}
              visualizations={visualizations}
              onRunModifiedSql={handleRunModifiedSql}
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
            visualizations={visualizations}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
