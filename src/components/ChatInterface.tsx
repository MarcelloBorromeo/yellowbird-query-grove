
import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Plus, Clock, Copy, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ChatMessage, { ChatMessageProps } from './ChatMessage';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

interface ChatInterfaceProps {
  onSubmitQuery: (query: string, sessionId: string) => Promise<void>;
  messages: ChatMessageProps[];
  isProcessing: boolean;
  currentSessionId: string;
  sessionList: { id: string, query: string, timestamp: Date }[];
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

const ChatInterface = ({
  onSubmitQuery,
  messages,
  isProcessing,
  currentSessionId,
  sessionList,
  onNewSession,
  onSelectSession
}: ChatInterfaceProps) => {
  const [query, setQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSessions, setShowSessions] = useState(false);
  
  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;
    
    await onSubmitQuery(query, currentSessionId);
    setQuery('');
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };
  
  return (
    <div className="flex h-screen">
      {/* Session sidebar (conditionally shown) */}
      {showSessions && (
        <div className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-sm">Chat History</h2>
          </div>
          
          <div className="flex-grow overflow-y-auto">
            <div className="p-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                size="sm"
                onClick={onNewSession}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
            
            <div className="mt-4 space-y-1 px-2">
              {sessionList.map((session) => (
                <button
                  key={session.id}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 flex items-center ${
                    session.id === currentSessionId ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <div className="truncate">
                    {session.query.substring(0, 25) || 'New Chat'}
                    {session.query.length > 25 && '...'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className={`flex-grow flex flex-col ${showSessions ? 'w-[calc(100%-16rem)]' : 'w-full'}`}>
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 py-4 px-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="mr-2"
                onClick={() => setShowSessions(!showSessions)}
              >
                <ChevronRight className={`h-5 w-5 transition-transform ${showSessions ? 'rotate-180' : ''}`} />
              </Button>
              <h1 className="text-xl font-semibold">YellowBird Data Navigator</h1>
            </div>
            
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="hidden sm:inline">Session ID:</span>
              <code className="px-2 py-1 bg-gray-100 rounded ml-1 max-w-[140px] truncate">{currentSessionId}</code>
              <Button variant="ghost" size="sm" className="ml-1 h-6 w-6" onClick={() => copyToClipboard(currentSessionId)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Messages container */}
        <div className="flex-grow overflow-y-auto bg-gradient-to-br from-yellow-50/70 via-white to-yellow-50/50">
          <div className="min-h-full">
            {messages.length > 0 ? (
              <div className="pt-4 pb-4">
                {messages.map((msg, index) => (
                  <ChatMessage key={index} {...msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-8 max-w-md">
                  <h2 className="text-xl font-semibold mb-2">YellowBird Data Navigator</h2>
                  <p className="text-muted-foreground">
                    Ask questions about your data in natural language and I'll help you analyze and visualize it.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Input area */}
        <div className="border-t border-gray-200 bg-white/90 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about your data..."
                className="min-h-[60px] pr-24 resize-none py-3 text-base"
                disabled={isProcessing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button 
                type="submit" 
                className="absolute right-2 bottom-2"
                disabled={isProcessing || !query.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2 sr-only sm:not-sr-only">Send</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
