
import { useState, useRef, useEffect } from 'react';
import { Search, CornerDownLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QueryInputProps {
  onSubmitQuery: (query: string) => void;
  isProcessing: boolean;
}

const SAMPLE_QUERIES = [
  "Show me monthly active users for the last 6 months", 
  "What's the conversion rate by country?", 
  "Compare revenue by product category for Q1 and Q2", 
  "Which features have the highest user engagement?"
];

const QueryInput = ({
  onSubmitQuery,
  isProcessing
}: QueryInputProps) => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleSuggestions, setVisibleSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * SAMPLE_QUERIES.length);
      setVisibleSuggestions([SAMPLE_QUERIES[randomIndex]]);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleSubmit = () => {
    if (!query.trim()) {
      toast.error("Please enter a query");
      inputRef.current?.focus();
      return;
    }
    
    if (isProcessing) return;
    
    onSubmitQuery(query);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleFocus = () => {
    setIsExpanded(true);
  };
  
  const handleBlur = () => {
    if (!query) {
      setIsExpanded(false);
    }
  };
  
  const useSampleQuery = (suggestion: string) => {
    setQuery(suggestion);
    setIsExpanded(true);
    inputRef.current?.focus();
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <div className={cn(
          "relative glass-card rounded-xl transition-all duration-300 ease-in-out overflow-hidden",
          isExpanded ? "shadow-md" : "shadow-sm"
        )}>
          <div className="flex items-start p-4">
            <div className={cn(
              "flex-shrink-0 mt-2 transition-opacity",
              isExpanded ? "opacity-70" : "opacity-100"
            )}>
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <textarea
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Ask anything about your data..."
              className={cn(
                "flex-1 bg-transparent border-0 outline-none resize-none ml-3 placeholder:text-muted-foreground/70 transition-all duration-300",
                isExpanded ? "min-h-[100px]" : "min-h-[40px]"
              )}
              rows={isExpanded ? 3 : 1}
            />
          </div>
          
          <div className={cn(
            "px-4 pb-4 pt-0 flex justify-between items-center transition-opacity duration-300",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none h-0"
          )}>
            <div className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> to submit
            </div>
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !query.trim()}
              className={cn(
                "bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg px-4 py-2 text-sm font-medium flex items-center space-x-2 transition-all",
                isProcessing && "opacity-70 cursor-not-allowed",
                !query.trim() && "opacity-50 cursor-not-allowed"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CornerDownLeft className="h-4 w-4" />
                  <span>Submit</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className={cn(
          "mt-3 flex flex-wrap gap-2 transition-opacity duration-300",
          query || isProcessing ? "opacity-0" : "opacity-100"
        )}>
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => useSampleQuery(suggestion)}
              className="text-sm text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-3 py-1 rounded-full transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueryInput;
