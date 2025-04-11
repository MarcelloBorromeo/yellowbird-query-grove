import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { processQuery, QueryResult } from '@/lib/queryService';
import { ChatMessageProps } from '@/components/ChatMessage';
import ChatInterface from '@/components/ChatInterface';
import ResponseBox from '@/components/ResponseBox';
import ToolCallsSection from '@/components/ToolCallsSection';

const Index = () => {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessionList, setSessionList] = useState<{ id: string; query: string; timestamp: Date }[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentToolCallIndex, setCurrentToolCallIndex] = useState(0);
  const [currentToolCalls, setCurrentToolCalls] = useState<any[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const navigate = useNavigate();

  // Initialize or load session
  useEffect(() => {
    // Check if there's a session ID in the URL
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      setCurrentSessionId(sessionId);
      loadSession(sessionId);
    } else {
      // Create a new session if none exists
      createNewSession();
    }
    
    // Load session list from localStorage
    const savedSessions = localStorage.getItem('yellowbird_sessions');
    if (savedSessions) {
      try {
        const parsedSessions = JSON.parse(savedSessions);
        // Convert string timestamps back to Date objects
        const sessionsWithDates = parsedSessions.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }));
        setSessionList(sessionsWithDates);
      } catch (e) {
        console.error('Error loading sessions:', e);
      }
    }
  }, [searchParams]);

  // Create a new chat session
  const createNewSession = useCallback(() => {
    const newSessionId = uuidv4();
    setCurrentSessionId(newSessionId);
    setMessages([
      {
        role: 'assistant',
        content: 'I am a data analysis assistant designed to help you understand and visualize data by querying databases and generating visualizations. If you have any questions or need assistance with data-related tasks, feel free to ask!'
      }
    ]);
    setCurrentToolCalls([]);
    setCurrentResponse('');
    
    // Update URL with the new session ID
    setSearchParams({ session_id: newSessionId });
    
    // Add to session list
    const newSession = { 
      id: newSessionId, 
      query: 'New Chat', 
      timestamp: new Date() 
    };
    
    setSessionList(prev => {
      const updated = [newSession, ...prev];
      // Save to localStorage
      localStorage.setItem('yellowbird_sessions', JSON.stringify(updated));
      return updated;
    });
  }, [setSearchParams]);

  // Load a specific session
  const loadSession = async (sessionId: string) => {
    // In a real app, this would fetch from a database
    // For now, we'll try to load from localStorage
    try {
      const sessionData = localStorage.getItem(`yellowbird_session_${sessionId}`);
      
      if (sessionData) {
        setMessages(JSON.parse(sessionData));
      } else {
        // If no data for this session, initialize with welcome message
        setMessages([
          {
            role: 'assistant',
            content: 'I am a data analysis assistant designed to help you understand and visualize data by querying databases and generating visualizations. If you have any questions or need assistance with data-related tasks, feel free to ask!'
          }
        ]);
        
        // Save this initial state
        localStorage.setItem(`yellowbird_session_${sessionId}`, JSON.stringify([
          {
            role: 'assistant',
            content: 'I am a data analysis assistant designed to help you understand and visualize data by querying databases and generating visualizations. If you have any questions or need assistance with data-related tasks, feel free to ask!'
          }
        ]));
      }
      
      setCurrentToolCalls([]);
      setCurrentResponse('');
    } catch (e) {
      console.error('Error loading session:', e);
      toast.error('Failed to load chat session');
    }
  };

  // Handle session selection
  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSearchParams({ session_id: sessionId });
    loadSession(sessionId);
  };

  // Handle navigating between tool calls
  const handleToolCallNavigate = (index: number) => {
    setCurrentToolCallIndex(index);
  };

  // Handle query submission
  const handleSubmitQuery = async (query: string, sessionId: string) => {
    if (!query.trim() || isProcessing) return;
    
    // Add user message
    const userMessage: ChatMessageProps = {
      role: 'user',
      content: query
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Add thinking message
    const thinkingMessage: ChatMessageProps = {
      role: 'assistant',
      content: '',
      isLoading: true
    };
    
    setMessages(prev => [...prev, thinkingMessage]);
    setIsProcessing(true);
    setCurrentToolCalls([]);
    setCurrentResponse('');
    
    try {
      // Process the query
      const result = await processQuery(query);
      
      // Remove thinking message
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      // Set the response text
      setCurrentResponse(result.explanation);
      
      // Store tool calls if any
      if (result.toolCalls && result.toolCalls.length > 0) {
        setCurrentToolCalls(result.toolCalls);
        setCurrentToolCallIndex(0);
      }
      
      // Create messages from the result
      const newMessages: ChatMessageProps[] = [
        // User message is already added
        // Keeping assistant message but only with visualizations if available
        {
          role: 'assistant',
          content: '',
          ...(result.visualizations && result.visualizations.length > 0 
              ? { visualization: result.visualizations[0] } 
              : {})
        }
      ];
      
      // Add any additional visualizations
      if (result.visualizations && result.visualizations.length > 1) {
        for (let i = 1; i < result.visualizations.length; i++) {
          newMessages.push({
            role: 'assistant',
            content: result.visualizations[i].description || 'Additional visualization:',
            visualization: result.visualizations[i]
          });
        }
      }
      
      // Update messages with new ones, preserving the user message
      setMessages(prev => {
        const userMessages = prev.filter(msg => msg.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1];
        const updatedMessages = [...prev.filter(msg => !msg.isLoading && msg !== lastUserMessage), lastUserMessage, ...newMessages];
        
        // Save to localStorage
        localStorage.setItem(`yellowbird_session_${sessionId}`, JSON.stringify(updatedMessages));
        
        // Update session list with the first user query
        setSessionList(prevList => {
          const updatedList = prevList.map(session => 
            session.id === sessionId
              ? { ...session, query: query, timestamp: new Date() }
              : session
          );
          
          // If session not in list, add it
          if (!updatedList.find(s => s.id === sessionId)) {
            updatedList.unshift({ id: sessionId, query, timestamp: new Date() });
          }
          
          // Sort by timestamp (newest first)
          updatedList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          
          // Save to localStorage
          localStorage.setItem('yellowbird_sessions', JSON.stringify(updatedList));
          
          return updatedList;
        });
        
        return updatedMessages;
      });
      
      toast.success('Query processed successfully');
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Remove thinking message
      setMessages(prev => {
        const updatedMessages = [
          ...prev.filter(msg => !msg.isLoading),
          {
            role: 'assistant' as const,
            content: 'Sorry, I encountered an error while processing your query. Please try again.'
          }
        ];
        
        // Save to localStorage
        localStorage.setItem(`yellowbird_session_${sessionId}`, JSON.stringify(updatedMessages));
        
        return updatedMessages;
      });
      
      toast.error('Error processing your query');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <ChatInterface
        onSubmitQuery={handleSubmitQuery}
        messages={messages}
        isProcessing={isProcessing}
        currentSessionId={currentSessionId}
        sessionList={sessionList}
        onNewSession={createNewSession}
        onSelectSession={handleSelectSession}
      />
      
      {/* Tool Calls Section - Shown after a query with tool calls */}
      {currentToolCalls.length > 0 && (
        <div className="fixed bottom-[80px] left-0 right-0 mx-auto max-w-4xl px-4">
          <ToolCallsSection 
            toolCalls={currentToolCalls}
            currentToolCallIndex={currentToolCallIndex}
            onNavigate={handleToolCallNavigate}
          />
          
          {/* Response Box - Shown below tool calls */}
          <ResponseBox 
            content={currentResponse} 
            isLoading={isProcessing} 
          />
        </div>
      )}
    </>
  );
};

export default Index;
