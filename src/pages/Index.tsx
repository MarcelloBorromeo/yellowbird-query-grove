
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import QueryInput from '@/components/QueryInput';
import QueryProcess from '@/components/QueryProcess';
import Dashboard from '@/components/Dashboard';
import ResponseContainer from '@/components/ResponseContainer';
import SuggestionChips from '@/components/SuggestionChips';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { processQuery, checkBackendConnection, QueryResult } from '@/lib/queryService';
import { DataPoint } from '@/lib/mockData';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ServerOff, RefreshCw } from 'lucide-react';

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
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  // Check backend connection on page load
  useEffect(() => {
    checkBackendStatus();
  }, []);
  
  // Check if we're viewing a shared dashboard or chart
  useEffect(() => {
    const sharedDashboardId = searchParams.get('dashboard');
    
    if (sharedDashboardId) {
      setIsSharedView(true);
      loadSharedDashboard(sharedDashboardId);
    }
  }, [searchParams]);

  const checkBackendStatus = async () => {
    setIsCheckingConnection(true);
    try {
      const isConnected = await checkBackendConnection();
      setIsBackendConnected(isConnected);
      if (!isConnected) {
        toast.error("Cannot connect to backend server. Please ensure the Flask server is running.", {
          duration: 6000,
        });
      }
    } catch (error) {
      console.error("Error checking backend status:", error);
      setIsBackendConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };
  
  const loadSharedDashboard = async (dashboardId: string) => {
    setIsProcessing(true);
    
    try {
      // First check if backend is accessible
      const isConnected = await checkBackendConnection();
      if (!isConnected) {
        setHasError(true);
        throw new Error("Cannot connect to backend server");
      }
      
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
      // First check if backend is accessible
      const isConnected = await checkBackendConnection();
      if (!isConnected) {
        setHasError(true);
        throw new Error("Cannot connect to backend server");
      }
      
      // Use the real query service instead of mock data
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
  
  const handleSelectSuggestion = (suggestion: string) => {
    handleSubmitQuery(suggestion);
  };
  
  const handleRetryConnection = () => {
    checkBackendStatus();
    toast.info("Attempting to reconnect to the backend server");
  };
  
  // Show connection error alert if backend is not connected
  if (isBackendConnected === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50/70 via-white to-yellow-50/50">
        <Header />
        
        <main className="pt-20 pb-20 px-4 relative z-10">
          <div className="max-w-screen-xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">YellowBird Data Navigator</h1>
              <p className="text-gray-600 max-w-2xl mx-auto text-base">
                Connect to your data with natural language queries.
              </p>
            </div>
            
            <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-6 pb-8 max-w-3xl mx-auto">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 rounded-md bg-destructive/20">
                  <ServerOff className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Backend Connection Issue</h2>
                  <p className="text-sm text-muted-foreground">
                    Unable to connect to the YellowBird backend server
                  </p>
                </div>
              </div>
              
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Cannot connect to backend server</AlertTitle>
                <AlertDescription>
                  <p className="mb-3">YellowBird requires a running Flask backend server to process your queries. The backend server appears to be unavailable.</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Make sure the Flask server is running: <code className="bg-secondary/30 p-1 rounded text-xs">python app.py</code> in the <code className="bg-secondary/30 p-1 rounded text-xs">src/server</code> directory</li>
                    <li>Ensure PostgreSQL is running with a database named "YellowBird"</li>
                    <li>Check your browser console (F12) for CORS or network errors</li>
                    <li>Make sure port 5001 is not being used by another application</li>
                    <li>If you're using a virtual environment, make sure all dependencies are installed with <code className="bg-secondary/30 p-1 rounded text-xs">pip install -r requirements.txt</code></li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-center mt-6">
                <Button 
                  onClick={handleRetryConnection}
                  className="flex items-center gap-2"
                  disabled={isCheckingConnection}
                >
                  {isCheckingConnection ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Checking Connection...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Retry Connection</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
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
            visualizations={visualizations}
            hasError={hasError}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
