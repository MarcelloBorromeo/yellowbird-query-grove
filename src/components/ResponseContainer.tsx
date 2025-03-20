
import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResponseContainerProps {
  response: string | null;
  isLoading: boolean;
}

const ResponseContainer = ({ response, isLoading }: ResponseContainerProps) => {
  if (!response && !isLoading) return null;
  
  // Format the response text with proper paragraphs and make it more concise
  const formatResponse = (text: string) => {
    // Split by paragraphs and trim each one
    return text.split('\n\n').map((paragraph, index) => {
      // Skip empty paragraphs
      if (!paragraph.trim()) return null;
      
      return (
        <p key={index} className={index > 0 ? 'mt-3' : ''}>
          {paragraph.trim()}
        </p>
      );
    }).filter(Boolean); // Remove null entries
  };
  
  return (
    <div className="w-full mt-8 animate-fade-in">
      <div className="container px-4 mx-auto">
        <div className="bg-yellowbird-50/30 dark:bg-yellowbird-950/10 backdrop-blur-sm border border-yellowbird-200/50 dark:border-yellowbird-800/20 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-yellowbird-100 dark:bg-yellowbird-900/40 p-2 rounded-md">
              <MessageSquare className="h-5 w-5 text-yellowbird-600 dark:text-yellowbird-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Response</h2>
              <p className="text-sm text-muted-foreground">Key insights and analysis</p>
            </div>
          </div>
          
          <div className="pl-10 pr-4">
            {isLoading ? (
              <div className="flex space-x-2 items-center h-12">
                <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse animate-delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse animate-delay-200"></div>
              </div>
            ) : (
              <ScrollArea className="pr-4 overflow-y-auto">
                <div className="text-muted-foreground pb-2">
                  {response ? formatResponse(response) : (
                    <p>Based on your query, I've analyzed the data and found the key patterns shown in the visualization below.</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponseContainer;
