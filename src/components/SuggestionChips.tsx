import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

const SuggestionChips = ({ onSelectSuggestion }: SuggestionChipsProps) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'left' | 'right'>('right');
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<number | null>(null);
  
  const suggestions = [
    "Show monthly active users for the last 6 months",
    "What's the conversion rate by country?",
    "Compare product categories by revenue",
    "Show feature engagement metrics",
    "Which products had the highest growth last quarter?",
    "Show user retention by cohort",
    "What's our weekly active user trend?",
    "Compare revenue by region",
  ];
  
  // Calculate max scroll position
  const calculateMaxScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setMaxScroll(Math.max(0, container.scrollWidth - container.clientWidth));
    }
  }, []);
  
  useEffect(() => {
    calculateMaxScroll();
    window.addEventListener('resize', calculateMaxScroll);
    
    return () => {
      window.removeEventListener('resize', calculateMaxScroll);
    };
  }, [calculateMaxScroll]);

  // Extract auto-scroll logic to reusable functions
  const performAutoScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || maxScroll <= 0) return;
    
    setScrollPosition((prev) => {
      // Same logic as before for direction and position
      let newPosition = prev;
      
      if (scrollDirection === 'right') {
        newPosition = prev + 1;
        
        if (newPosition >= maxScroll) {
          setScrollDirection('left');
        }
      } else {
        newPosition = prev - 1;
        
        if (newPosition <= 0) {
          setScrollDirection('right');
        }
      }
      
      container.scrollLeft = newPosition;
      return newPosition;
    });
  }, [maxScroll, scrollDirection]);
  
  const startAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) return;
    
    autoScrollIntervalRef.current = window.setInterval(performAutoScroll, 30);
  }, [performAutoScroll]);
  
  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);
  
  // Handle bidirectional continuous auto scrolling
  useEffect(() => {
    startAutoScroll();
    
    return () => {
      stopAutoScroll();
    };
  }, [startAutoScroll, stopAutoScroll]);
  
  // Handle manual scrolling
  const handleManualScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const newPosition = container.scrollLeft;
      setScrollPosition(newPosition);
      
      // Update direction based on user scroll
      if (newPosition === 0) {
        setScrollDirection('right');
      } else if (newPosition >= maxScroll) {
        setScrollDirection('left');
      }
    }
  }, [maxScroll]);
  
  const scrollLeft = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
      // Let onScroll handle position updates
    }
  }, []);
  
  const scrollRight = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
      // Let onScroll handle position updates
    }
  }, []);
  
  return (
    <div className="relative w-full mb-6">
      {scrollPosition > 0 && (
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border border-border"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      
      <div 
        id="chips-container"
        ref={containerRef}
        className="flex overflow-x-auto space-x-2 py-2 px-1 scrollbar-hide scroll-smooth"
        style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        onScroll={handleManualScroll}
        onMouseEnter={stopAutoScroll}
        onMouseLeave={startAutoScroll}
        onFocus={stopAutoScroll}
        onBlur={startAutoScroll}
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelectSuggestion(suggestion)}
            className="whitespace-nowrap px-4 py-2 bg-secondary/50 hover:bg-secondary/80 rounded-full text-sm transition-colors flex-shrink-0 hover:text-accent"
            aria-label={`Suggestion: ${suggestion}`}
          >
            {suggestion}
          </button>
        ))}
      </div>
      
      {scrollPosition < maxScroll && (
        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border border-border"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SuggestionChips;