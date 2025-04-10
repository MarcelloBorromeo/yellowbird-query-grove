
import { useEffect, useState } from 'react';
import { Code, Database, RefreshCw, Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QueryResult } from '@/lib/queryService';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface QueryProcessProps {
  userQuery: string;
  isProcessing: boolean;
  sqlQuery: string | null;
  hasError: boolean;
  retryCount: number;
  explanation?: string;
  visualizations?: QueryResult['visualizations'];
  toolCalls?: QueryResult['toolCalls'];
  currentToolCallIndex?: number;
  totalToolCalls?: number;
  onRunModifiedSql?: (sql: string) => void;
  onToolCallNavigate?: (index: number) => void;
}

const QueryProcess = ({
  userQuery,
  isProcessing,
  sqlQuery,
  hasError,
  retryCount,
  explanation,
  visualizations,
  toolCalls,
  currentToolCallIndex = 0,
  totalToolCalls = 0,
  onRunModifiedSql,
  onToolCallNavigate
}: QueryProcessProps) => {
  const [showProcess, setShowProcess] = useState(false);
  const [editedSql, setEditedSql] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    if (userQuery) {
      setShowProcess(true);
    }
  }, [userQuery]);
  
  useEffect(() => {
    if (sqlQuery && !editedSql) {
      setEditedSql(sqlQuery);
    }
  }, [sqlQuery]);
  
  // Log visualizations for debugging
  useEffect(() => {
    if (visualizations && visualizations.length > 0) {
      console.log('Visualizations available:', visualizations);
    }
  }, [visualizations]);
  
  if (!showProcess) return null;
  
  // Calculate the SQL height based on the query length
  const getSqlHeight = () => {
    if (!sqlQuery && !toolCalls?.length) return '60px';
    
    // Count the number of lines in the SQL query or tool call output
    const content = toolCalls && toolCalls.length > 0 ? 
      JSON.stringify(toolCalls[currentToolCallIndex], null, 2) : 
      sqlQuery || '';
    
    const lineCount = (content.match(/\n/g) || []).length + 1;
    
    // Set a reasonable height based on the number of lines (with a min and max)
    return `${Math.max(Math.min(lineCount * 24, 400), 60)}px`;
  };
  
  const handleSqlEdit = () => {
    setIsEditing(true);
  };
  
  const handleRunModifiedSql = () => {
    if (onRunModifiedSql && editedSql) {
      onRunModifiedSql(editedSql);
      setIsEditing(false);
      toast.success('Running modified SQL query');
    }
  };
  
  const handleCancelEdit = () => {
    setEditedSql(sqlQuery);
    setIsEditing(false);
  };

  const handlePreviousToolCall = () => {
    if (onToolCallNavigate && currentToolCallIndex > 0) {
      onToolCallNavigate(currentToolCallIndex - 1);
    }
  };

  const handleNextToolCall = () => {
    if (onToolCallNavigate && currentToolCallIndex < totalToolCalls - 1) {
      onToolCallNavigate(currentToolCallIndex + 1);
    }
  };
  
  const getCurrentToolCall = () => {
    if (!toolCalls || !toolCalls[currentToolCallIndex]) {
      return null;
    }
    
    const toolCall = toolCalls[currentToolCallIndex];
    return {
      name: toolCall.name,
      args: JSON.stringify(toolCall.arguments, null, 2),
      output: toolCall.output
    };
  };
  
  const currentToolCall = getCurrentToolCall();
  
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
        
        {/* Tool Calls Container (Formerly LLM Processing) */}
        <div className={cn("glass-card rounded-lg p-4 transition-all duration-500", isProcessing ? "border-accent/30" : hasError ? "border-destructive/30" : "border-green-500/30")}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={cn("p-1.5 rounded-md", isProcessing ? "bg-accent/10" : hasError ? "bg-destructive/10" : "bg-green-500/10")}>
                {isProcessing ? <RefreshCw className="h-4 w-4 text-accent animate-spin" /> : hasError ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Check className="h-4 w-4 text-green-500" />}
              </div>
              <h3 className="text-sm font-medium">
                {isProcessing ? 
                  "Processing Query" + (retryCount > 0 ? ` (Attempt ${retryCount + 1})` : "") : 
                  hasError ? 
                    "Error Processing Query" : 
                    toolCalls && toolCalls.length > 0 ? 
                      "Tool Calls" : 
                      "Query Processed Successfully"}
              </h3>
            </div>
            
            {sqlQuery && onRunModifiedSql && !isProcessing && !hasError && !toolCalls?.length && (
              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleRunModifiedSql}
                      className="text-xs bg-green-500/20 hover:bg-green-500/30 px-2 py-1 rounded text-green-700 transition-colors"
                    >
                      Run
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleSqlEdit}
                    className="text-xs bg-secondary/50 hover:bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Edit SQL
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Tool Call Output with Dynamic Height */}
          {(sqlQuery || (toolCalls && toolCalls.length > 0)) ? (
            <div className="mt-2 pl-8">
              <div className="relative">
                <div className="relative">
                  {isEditing ? (
                    <div className="rounded-md">
                      <textarea
                        className="w-full h-[300px] text-xs font-mono bg-secondary/30 p-3 rounded-md"
                        value={editedSql || ''}
                        onChange={(e) => setEditedSql(e.target.value)}
                      />
                    </div>
                  ) : (
                    <>
                      <ScrollArea className="rounded-md" style={{ height: getSqlHeight() }}>
                        {toolCalls && toolCalls.length > 0 && currentToolCall ? (
                          <div className="text-xs font-mono bg-secondary/30 p-3 rounded-md overflow-x-auto">
                            <div className="mb-2 font-semibold text-accent">Tool: {currentToolCall.name}</div>
                            <div className="mb-2">
                              <div className="font-semibold mb-1">Arguments:</div>
                              <pre className="text-xs whitespace-pre-wrap">{currentToolCall.args}</pre>
                            </div>
                            <div>
                              <div className="font-semibold mb-1">Output:</div>
                              <pre className="text-xs whitespace-pre-wrap">{currentToolCall.output}</pre>
                            </div>
                          </div>
                        ) : (
                          <pre className="text-xs font-mono bg-secondary/30 p-3 rounded-md overflow-x-auto">
                            <code>{sqlQuery}</code>
                          </pre>
                        )}
                      </ScrollArea>
                      
                      {/* Tool Call Navigation */}
                      {toolCalls && toolCalls.length > 1 && (
                        <div className="mt-2 flex justify-center">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={handlePreviousToolCall}
                                  className={cn(currentToolCallIndex === 0 ? "pointer-events-none opacity-50" : "")}
                                />
                              </PaginationItem>
                              <PaginationItem>
                                <div className="px-4 py-2">
                                  {currentToolCallIndex + 1}/{totalToolCalls}
                                </div>
                              </PaginationItem>
                              <PaginationItem>
                                <PaginationNext 
                                  onClick={handleNextToolCall}
                                  className={cn(currentToolCallIndex === totalToolCalls - 1 ? "pointer-events-none opacity-50" : "")}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                    </>
                  )}
                  
                  {!isEditing && !toolCalls?.length && (
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
                  )}
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
                  Failed to process your query. Please try a different query.
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
              <h3 className="text-sm font-medium">Response</h3>
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
