
import { useState } from 'react';
import Header from '@/components/Header';
import QueryInput from '@/components/QueryInput';
import QueryProcess from '@/components/QueryProcess';
import Dashboard from '@/components/Dashboard';
import SystemPromptBox from '@/components/SystemPromptBox';
import SuggestionChips from '@/components/SuggestionChips';
import { generateMockSQL, generateMockData, DataPoint } from '@/lib/mockData';
import { toast } from 'sonner';

const Index = () => {
  const [userQuery, setUserQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [dashboardData, setDashboardData] = useState<DataPoint[] | null>(null);
  
  const handleSubmitQuery = async (query: string) => {
    setUserQuery(query);
    setIsProcessing(true);
    setSqlQuery(null);
    setHasError(false);
    setRetryCount(0);
    setDashboardData(null);
    
    try {
      // Step 1: Generate SQL from natural language
      const { sql, success } = await generateMockSQL(query);
      
      if (!success) {
        // Simulate retry with LLM
        setRetryCount(1);
        toast.info("First SQL attempt failed, retrying with additional context");
        
        // Second attempt
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
      
      // Step 2: Execute SQL and get data
      const data = await generateMockData(query);
      setDashboardData(data);
      
      toast.success("Query processed successfully");
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
    <div className="min-h-screen bg-background">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[10%] w-[30rem] h-[30rem] bg-yellowbird-200/30 dark:bg-yellowbird-950/10 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-[10%] right-[5%] w-[20rem] h-[20rem] bg-accent/5 rounded-full blur-[90px] animate-float animate-delay-200" />
      </div>
      
      <Header />
      
      <main className="pt-28 pb-20 px-4 relative z-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-block mb-2 py-1 px-3 bg-yellowbird-100 dark:bg-yellowbird-950/30 text-yellowbird-800 dark:text-yellowbird-300 rounded-full text-xs font-medium">
              Data Analytics Assistant
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">YellowBird Data Navigator</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ask questions about your data in natural language. YellowBird will translate your query into SQL,
              retrieve the data, and generate interactive visualizations.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <SystemPromptBox />
            <SuggestionChips onSelectSuggestion={handleSelectSuggestion} />
          </div>
          
          <QueryInput 
            onSubmitQuery={handleSubmitQuery} 
            isProcessing={isProcessing} 
          />
          
          <QueryProcess 
            userQuery={userQuery}
            isProcessing={isProcessing}
            sqlQuery={sqlQuery}
            hasError={hasError}
            retryCount={retryCount}
          />
          
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
