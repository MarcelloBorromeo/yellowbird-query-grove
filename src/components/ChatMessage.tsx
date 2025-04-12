
import { ReactNode } from 'react';
import { MessageSquare, Bot, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PlotlyVisualization from './PlotlyVisualization';

export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCall?: {
    name: string;
    arguments: Record<string, any>;
  };
  toolOutput?: string;
  visualization?: any;
  isLoading?: boolean;
}

const ChatMessage = ({ 
  role, 
  content, 
  toolCall, 
  toolOutput, 
  visualization,
  isLoading 
}: ChatMessageProps) => {
  const isUser = role === 'user';
  
  let icon: ReactNode = null;
  if (isUser) {
    icon = <User className="h-5 w-5 text-muted-foreground" />;
  } else if (role === 'assistant') {
    icon = <Bot className="h-5 w-5 text-yellowbird-600" />;
  } else if (role === 'tool') {
    icon = <MessageSquare className="h-5 w-5 text-blue-600" />;
  }
  
  // Check if visualization exists and has figure property
  const hasValidVisualization = visualization && visualization.figure;
  
  return (
    <div className={cn(
      "w-full py-2 px-4",
      isUser ? "bg-gray-50/60" : "bg-white/60",
    )}>
      <div className="max-w-4xl mx-auto flex gap-3">
        <div className={cn(
          "mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-secondary/50" : "bg-yellowbird-50"
        )}>
          {icon}
        </div>
        
        <div className="flex-grow">
          <div className="text-xs text-muted-foreground mb-1">
            {isUser ? 'You' : role === 'tool' ? `Tool: ${toolCall?.name}` : 'Assistant'}
          </div>
          
          <div className="space-y-2">
            {/* Main message content */}
            {content && (
              <div className="prose prose-sm max-w-none text-base">
                {content.split('\n\n').map((paragraph, i) => (
                  <p key={i} className={i > 0 ? 'mt-3' : ''}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
            
            {/* Tool call */}
            {toolCall && (
              <Card className="text-xs p-3 bg-secondary/30 border-secondary/40 overflow-x-auto">
                <div className="font-mono whitespace-pre-wrap">
                  <p className="text-xs font-semibold mb-1">Arguments:</p>
                  <pre>{JSON.stringify(toolCall.arguments, null, 2)}</pre>
                </div>
              </Card>
            )}
            
            {/* Tool output */}
            {toolOutput && (
              <Card className="text-xs p-3 bg-yellowbird-50/30 border-yellowbird-100/40 overflow-x-auto">
                <div className="font-mono whitespace-pre-wrap">
                  <p className="text-xs font-semibold mb-1">Output:</p>
                  <pre>{toolOutput}</pre>
                </div>
              </Card>
            )}
            
            {/* Visualization - only render if it has a valid figure property */}
            {hasValidVisualization && (
              <div className="mt-4 rounded-lg overflow-hidden border border-yellowbird-100/40">
                <PlotlyVisualization 
                  figure={visualization.figure}
                  type={visualization.type || 'bar'}
                  title={visualization.title || 'Data Visualization'}
                  description={visualization.description || ''}
                />
              </div>
            )}
            
            {/* Loading state */}
            {isLoading && (
              <div className="flex space-x-2 items-center my-2">
                <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse animate-delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse animate-delay-200"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
