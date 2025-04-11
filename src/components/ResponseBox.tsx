
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Sparkles } from 'lucide-react';

interface ResponseBoxProps {
  content: string;
  isLoading?: boolean;
}

const ResponseBox = ({ content, isLoading }: ResponseBoxProps) => {
  if (!content && !isLoading) return null;
  
  return (
    <div className="w-full mt-4 mb-6">
      <Card className="border-yellowbird-200 bg-gradient-to-br from-yellowbird-50/40 to-white">
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <div className="bg-yellowbird-100 p-1.5 rounded">
            <Bot className="h-4 w-4 text-yellowbird-700" />
          </div>
          <CardTitle className="text-base font-medium">Response</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex space-x-2 items-center my-2">
              <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse animate-delay-100"></div>
              <div className="w-2 h-2 rounded-full bg-accent/40 animate-pulse animate-delay-200"></div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-muted-foreground">
              {content.split('\n\n').map((paragraph, i) => (
                <p key={i} className={i > 0 ? 'mt-3' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponseBox;
