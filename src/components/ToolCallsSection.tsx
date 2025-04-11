
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Terminal } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  output: string;
}

interface ToolCallsSectionProps {
  toolCalls: ToolCall[];
  currentToolCallIndex: number;
  onNavigate: (index: number) => void;
}

const ToolCallsSection = ({ 
  toolCalls, 
  currentToolCallIndex, 
  onNavigate 
}: ToolCallsSectionProps) => {
  if (!toolCalls || toolCalls.length === 0) return null;
  
  const currentToolCall = toolCalls[currentToolCallIndex];
  
  return (
    <div className="w-full my-4">
      <Card className="border-blue-200 overflow-hidden">
        <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-1.5 rounded">
                <Terminal className="h-4 w-4 text-blue-700" />
              </div>
              <CardTitle className="text-base font-medium">Tool Call: {currentToolCall.name}</CardTitle>
            </div>
            
            {toolCalls.length > 1 && (
              <div className="text-xs text-muted-foreground">
                {currentToolCallIndex + 1} of {toolCalls.length}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 text-blue-700">Arguments:</h4>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(currentToolCall.arguments, null, 2)}</pre>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-2 text-green-700">Output:</h4>
            <div className="bg-green-50 border border-green-100 rounded-md p-3 overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">{currentToolCall.output}</pre>
            </div>
          </div>
        </CardContent>
        
        {toolCalls.length > 1 && (
          <div className="px-4 pb-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => onNavigate(currentToolCallIndex - 1)}
                    className={cn(currentToolCallIndex === 0 ? "pointer-events-none opacity-50" : "")}
                  />
                </PaginationItem>
                
                {toolCalls.map((_, index) => (
                  <PaginationItem key={index}>
                    <PaginationLink
                      onClick={() => onNavigate(index)}
                      isActive={index === currentToolCallIndex}
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => onNavigate(currentToolCallIndex + 1)}
                    className={cn(currentToolCallIndex === toolCalls.length - 1 ? "pointer-events-none opacity-50" : "")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ToolCallsSection;
