
import { MessageSquare } from 'lucide-react';

interface ResponseContainerProps {
  response: string | null;
  isLoading: boolean;
}

const ResponseContainer = ({ response, isLoading }: ResponseContainerProps) => {
  if (!response && !isLoading) return null;
  
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
              <p className="text-sm text-muted-foreground">Natural language explanation</p>
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
              <div className="text-muted-foreground">
                {response || "Based on your query, I've analyzed the data and found some interesting patterns. The conversion rate varies significantly by country, with Japan (15.3%) and Germany (14.8%) showing the highest rates, while Brazil (6.2%) and Mexico (7.1%) have lower conversion rates. North American and European markets generally outperform other regions."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponseContainer;
