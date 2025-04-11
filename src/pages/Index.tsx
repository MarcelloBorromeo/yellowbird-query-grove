
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { processQuery, QueryResult } from '@/lib/queryService';
import { ChatMessageProps } from '@/components/ChatMessage';
import ChatInterface from '@/components/ChatInterface';

const Index = () => {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessionList, setSessionList] = useState<{ id: string; query: string; timestamp: Date }[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
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
    
    try {
      // Process the query
      const result = await processQuery(query);
      
      // Remove thinking message
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      // Create messages from the result
      const newMessages: ChatMessageProps[] = [];
      
      // Add assistant response
      newMessages.push({
        role: 'assistant',
        content: result.explanation
      });
      
      // Add tool calls if any
      if (result.toolCalls && result.toolCalls.length > 0) {
        result.toolCalls.forEach((toolCall, index) => {
          newMessages.push({
            role: 'tool',
            content: '',
            toolCall: {
              name: toolCall.name,
              arguments: toolCall.arguments,
            },
            toolOutput: toolCall.output
          });
        });
      }
      
      // Add visualization if available
      if (result.visualizations && result.visualizations.length > 0) {
        // Add visualization to the last message
        const lastMessage = newMessages[newMessages.length - 1];
        
        result.visualizations.forEach((viz, index) => {
          if (index === 0) {
            // Add to the last message
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              visualization: viz
            };
          } else {
            // Add as a new message
            newMessages.push({
              role: 'assistant',
              content: viz.description || 'Here is another visualization of the data:',
              visualization: viz
            });
          }
        });
      }
      
      // Update messages with new ones
      setMessages(prev => {
        const updatedMessages = [...prev.filter(msg => !msg.isLoading), ...newMessages];
        
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
            role: 'assistant',
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
    <ChatInterface
      onSubmitQuery={handleSubmitQuery}
      messages={messages}
      isProcessing={isProcessing}
      currentSessionId={currentSessionId}
      sessionList={sessionList}
      onNewSession={createNewSession}
      onSelectSession={handleSelectSession}
    />
  );
};

export default Index;
