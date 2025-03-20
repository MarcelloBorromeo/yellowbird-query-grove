
import { useEffect, useState } from 'react';
import { Code, Database, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QueryResult } from '@/lib/queryService';

interface QueryProcessProps {
  userQuery: string;
  isProcessing: boolean;
  sqlQuery: string | null;
  hasError: boolean;
  retryCount: number;
  explanation?: string;
  visualizations?: QueryResult['visualizations'];
  onRunModifiedSql?: (sql: string) => void;
}

const QueryProcess = ({
  userQuery,
  isProcessing,
  sqlQuery,
  hasError,
  retryCount,
  explanation,
  visualizations,
  onRunModifiedSql
}: QueryProcessProps) => {
  const [showProcess, setShowProcess] = useState(false);
  
  useEffect(() => {
    if (userQuery) {
      setShowProcess(true);
    }
  }, [userQuery]);
  
  // Log visualizations for debugging
  useEffect(() => {
    if (visualizations && visualizations.length > 0) {
      console.log('Visualizations available:', visualizations);
    }
  }, [visualizations]);
  
  if (!showProcess) return null;
  
  // Calculate the SQL height based on the query length
  const getSqlHeight = () => {
    if (!sqlQuery) return '60px';
    
    // Count the number of lines in the SQL query
    const lineCount = (sqlQuery.match(/\n/g) || []).length + 1;
    
    // Set a reasonable height based on the number of lines (with a min and max)
    return `${Math.max(Math.min(lineCount * 24, 400), 60)}px`;
  };
  
  return (
    <div className="mt-6 w-full max-w-3xl mx-auto overflow-hidden animate-fade-in">
      <div className="space-y-4">
        {/* Natural Language Query */}
        <div className="glass-card rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="bg-secondary/50 p-1.5 rounded-md">
              <Code className="h-4 w-4 text-secondary-foreground" />
            </div>
            <h3 className="text-sm font-medium">Natural Language Query</h3>
          </div>
          <p className="text-muted-foreground pl-8">{userQuery}</p>
        </div>
        
        {/* LLM Processing */}
        <div className={cn("glass-card rounded-lg p-4 transition-all duration-500", isProcessing ? "border-accent/30" : hasError ? "border-destructive/30" : "border-green-500/30")}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={cn("p-1.5 rounded-md", isProcessing ? "bg-accent/10" : hasError ? "bg-destructive/10" : "bg-green-500/10")}>
                {isProcessing ? <RefreshCw className="h-4 w-4 text-accent animate-spin" /> : hasError ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Check className="h-4 w-4 text-green-500" />}
              </div>
              <h3 className="text-sm font-medium">
                {isProcessing ? "Generating SQL" + (retryCount > 0 ? ` (Attempt ${retryCount + 1})` : "") : hasError ? "Error Generating SQL" : "SQL Generated Successfully"}
              </h3>
            </div>
          </div>
          
          {/* SQL Output with Dynamic Height */}
          {sqlQuery ? (
            <div className="mt-2 pl-8">
              <div className="relative">
                <div className="relative">
                  <ScrollArea className="rounded-md" style={{ height: getSqlHeight() }}>
                    <pre className="text-xs font-mono bg-secondary/30 p-3 rounded-md overflow-x-auto">
                      <code>{sqlQuery}</code>
                    </pre>
                  </ScrollArea>
                  <div className="absolute top-2 right-2">
                    <button 
                      className="text-xs bg-secondary/50 hover:bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors" 
                      onClick={() => {
                        navigator.clipboard.writeText(sqlQuery || '');
                        toast.success('SQL copied to clipboard');
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pl-8 h-12 flex items-center">
              {isProcessing ? (
                <div className="space-x-1.5 flex">
                  <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse animate-delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse animate-delay-200"></div>
                </div>
              ) : hasError ? (
                <span className="text-sm text-destructive">
                  Failed to generate valid SQL. Please try a different query.
                </span>
              ) : null}
            </div>
          )}
        </div>
        
        {/* Explanation Section */}
        {explanation && !isProcessing && !hasError && (
          <div className="glass-card rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-secondary/50 p-1.5 rounded-md">
                <Database className="h-4 w-4 text-secondary-foreground" />
              </div>
              <h3 className="text-sm font-medium">Query Results</h3>
            </div>
            <div className="pl-8 mt-2 text-sm text-muted-foreground">
              <ScrollArea className="h-auto max-h-60">
                <p className="whitespace-pre-line">{explanation}</p>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryProcess;
