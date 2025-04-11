
import { ReactNode } from 'react';
import { MessageSquare, Bot, User, Terminal, Code, FileText } from 'lucide-react';
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
  const isTool = role === 'tool';
  
  let icon: ReactNode = null;
  if (isUser) {
    icon = <User className="h-5 w-5 text-muted-foreground" />;
  } else if (role === 'assistant') {
    icon = <Bot className="h-5 w-5 text-yellowbird-600" />;
  } else if (isTool) {
    icon = <Terminal className="h-5 w-5 text-blue-600" />;
  }
  
  return (
    <div className={cn(
      "w-full py-2 px-4",
      isUser ? "bg-gray-50/60" : isTool ? "bg-blue-50/30" : "bg-white/60",
    )}>
      <div className="max-w-4xl mx-auto flex gap-3">
        <div className={cn(
          "mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-secondary/50" : isTool ? "bg-blue-100" : "bg-yellowbird-50"
        )}>
          {icon}
        </div>
        
        <div className="flex-grow">
          <div className="text-xs text-muted-foreground mb-1">
            {isUser ? 'You' : isTool ? `Tool: ${toolCall?.name}` : 'Assistant'}
          </div>
          
          <div className="space-y-3">
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
              <Card className="text-xs p-3 bg-blue-50/50 border-blue-200/60 overflow-x-auto">
                <div className="flex items-center mb-2">
                  <Code className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="font-medium">Arguments:</span>
                </div>
                <div className="font-mono whitespace-pre-wrap pl-6 text-blue-800">
                  <pre>{JSON.stringify(toolCall.arguments, null, 2)}</pre>
                </div>
              </Card>
            )}
            
            {/* Tool output */}
            {toolOutput && (
              <Card className="text-xs p-3 bg-green-50/50 border-green-200/60 overflow-x-auto">
                <div className="flex items-center mb-2">
                  <FileText className="h-4 w-4 mr-2 text-green-600" />
                  <span className="font-medium">Output:</span>
                </div>
                <div className="font-mono whitespace-pre-wrap pl-6 text-green-800">
                  <pre>{toolOutput}</pre>
                </div>
              </Card>
            )}
            
            {/* Visualization */}
            {visualization && (
              <div className="mt-4 rounded-lg overflow-hidden border border-yellowbird-100/40">
                <PlotlyVisualization 
                  figure={visualization.figure}
                  type={visualization.type}
                  title={visualization.title || 'Data Visualization'}
                  description={visualization.description}
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
