
import { useEffect, useState } from 'react';
import { Code, Database, RefreshCw, Check, AlertTriangle, Pencil, Eye, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface QueryProcessProps {
  userQuery: string;
  isProcessing: boolean;
  sqlQuery: string | null;
  hasError: boolean;
  retryCount: number;
  onRunModifiedSql?: (sql: string) => void;
}

const QueryProcess = ({ 
  userQuery, 
  isProcessing, 
  sqlQuery, 
  hasError, 
  retryCount,
  onRunModifiedSql
}: QueryProcessProps) => {
  const [showProcess, setShowProcess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modifiedSql, setModifiedSql] = useState('');
  
  useEffect(() => {
    if (userQuery) {
      setShowProcess(true);
    }
  }, [userQuery]);
  
  useEffect(() => {
    if (!sqlQuery) {
      setModifiedSql('');
      return;
    }
    
    setModifiedSql(sqlQuery);
  }, [sqlQuery]);
  
  const handleToggleEditMode = (checked: boolean) => {
    setIsEditMode(checked);
    
    if (checked) {
      toast.info("SQL Edit Mode activated. You can now modify the SQL query directly.");
    } else {
      toast.info("Read-Only Mode activated. SQL query is view-only.");
    }
  };
  
  const handleRunModifiedSql = () => {
    if (onRunModifiedSql && modifiedSql.trim()) {
      onRunModifiedSql(modifiedSql);
      toast.success("Running modified SQL query");
    } else {
      toast.error("Please provide a valid SQL query");
    }
  };
  
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
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
            
            {!isProcessing && !hasError && sqlQuery && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  {isEditMode ? <Pencil className="h-3 w-3 inline mr-1" /> : <Eye className="h-3 w-3 inline mr-1" />}
                  {isEditMode ? "Edit Mode" : "Read-Only"}
                </span>
                <Switch
                  checked={isEditMode}
                  onCheckedChange={handleToggleEditMode}
                  className="data-[state=checked]:bg-yellowbird-500"
                />
              </div>
            )}
          </div>
          
          {/* SQL Output */}
          {sqlQuery || modifiedSql ? (
            <div className="mt-2 pl-8">
              <div className="relative">
                {isEditMode ? (
                  <div className="relative">
                    <textarea
                      value={modifiedSql}
                      onChange={(e) => setModifiedSql(e.target.value)}
                      className="w-full text-xs font-mono bg-secondary/30 p-3 rounded-md overflow-x-auto max-h-72 min-h-[120px] scrollbar-thin focus:ring-1 focus:ring-yellowbird-500 focus:outline-none"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <button 
                        className="text-xs bg-yellowbird-500 hover:bg-yellowbird-600 text-white px-3 py-1 rounded flex items-center space-x-1"
                        onClick={handleRunModifiedSql}
                      >
                        <PlayCircle className="h-3 w-3" />
                        <span>Run</span>
                      </button>
                      <button 
                        className="text-xs bg-secondary/50 hover:bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => navigator.clipboard.writeText(modifiedSql || '')}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <pre className="text-xs font-mono bg-secondary/30 p-3 rounded-md overflow-x-auto max-h-72 scrollbar-thin">
                      <code>{sqlQuery}</code>
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
                )}
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
