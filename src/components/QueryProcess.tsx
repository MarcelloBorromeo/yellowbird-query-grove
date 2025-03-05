
import { useEffect, useState } from 'react';
import { Code, Database, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueryProcessProps {
  userQuery: string;
  isProcessing: boolean;
  sqlQuery: string | null;
  hasError: boolean;
  retryCount: number;
}

const QueryProcess = ({ 
  userQuery, 
  isProcessing, 
  sqlQuery, 
  hasError, 
  retryCount 
}: QueryProcessProps) => {
  const [showProcess, setShowProcess] = useState(false);
  const [sqlHighlighted, setSqlHighlighted] = useState('');
  
  useEffect(() => {
    if (userQuery) {
      setShowProcess(true);
    }
  }, [userQuery]);
  
  // Simple SQL syntax highlighting
  useEffect(() => {
    if (!sqlQuery) {
      setSqlHighlighted('');
      return;
    }
    
    // Very basic highlighting - in a real app, use a proper syntax highlighter
    const highlighted = sqlQuery
      .replace(/(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|HAVING|LIMIT|AND|OR|AS|ON|INNER|LEFT|RIGHT|OUTER)/gi, 
        match => `<span class="text-accent font-semibold">${match}</span>`)
      .replace(/('.*?'|".*?")/g, 
        match => `<span class="text-yellowbird-600 dark:text-yellowbird-400">${match}</span>`)
      .replace(/\b(\d+)\b/g, 
        match => `<span class="text-accent-foreground">${match}</span>`);
    
    setSqlHighlighted(highlighted);
  }, [sqlQuery]);
  
  if (!showProcess) return null;
  
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
        <div className={cn(
          "glass-card rounded-lg p-4 transition-all duration-500",
          isProcessing ? "border-accent/30" : hasError ? "border-destructive/30" : "border-green-500/30"
        )}>
          <div className="flex items-center space-x-2 mb-2">
            <div className={cn(
              "p-1.5 rounded-md",
              isProcessing ? "bg-accent/10" : hasError ? "bg-destructive/10" : "bg-green-500/10"
            )}>
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 text-accent animate-spin" />
              ) : hasError ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </div>
            <h3 className="text-sm font-medium">
              {isProcessing 
                ? "Generating SQL" + (retryCount > 0 ? ` (Attempt ${retryCount + 1})` : "")
                : hasError 
                  ? "Error Generating SQL" 
                  : "SQL Generated Successfully"
              }
            </h3>
          </div>
          
          {/* SQL Output */}
          {sqlHighlighted ? (
            <div className="mt-2 pl-8">
              <div className="relative">
                <pre className="text-xs font-mono bg-secondary/30 p-3 rounded-md overflow-x-auto max-h-72 scrollbar-thin">
                  <code dangerouslySetInnerHTML={{ __html: sqlHighlighted }} />
                </pre>
                <div className="absolute top-2 right-2">
                  <button 
                    className="text-xs bg-secondary/50 hover:bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => navigator.clipboard.writeText(sqlQuery || '')}
                  >
                    Copy
                  </button>
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
        
        {/* Database Query */}
        {sqlQuery && !isProcessing && !hasError && (
          <div className="glass-card rounded-lg p-4 animate-fade-in">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-secondary/50 p-1.5 rounded-md">
                <Database className="h-4 w-4 text-secondary-foreground" />
              </div>
              <h3 className="text-sm font-medium">Database Query</h3>
            </div>
            <div className="pl-8 h-12 flex items-center">
              <div className="space-x-1.5 flex">
                <div className="w-2 h-2 rounded-full bg-green-500/60 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-green-500/60 animate-pulse animate-delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-green-500/60 animate-pulse animate-delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryProcess;
