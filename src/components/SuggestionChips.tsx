
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

const SuggestionChips = ({ onSelectSuggestion }: SuggestionChipsProps) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
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
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const calculateMaxScroll = () => {
        setMaxScroll(Math.max(0, container.scrollWidth - container.clientWidth));
      };
      
      calculateMaxScroll();
      window.addEventListener('resize', calculateMaxScroll);
      
      return () => {
        window.removeEventListener('resize', calculateMaxScroll);
      };
    }
  }, []);

  // Handle continuous auto scrolling with looping
  useEffect(() => {
    const startAutoScroll = () => {
      if (autoScrollIntervalRef.current) return;
      
      autoScrollIntervalRef.current = window.setInterval(() => {
        const container = containerRef.current;
        if (!container || maxScroll <= 0) return;
        
        setScrollPosition((prev) => {
          const newPosition = prev + 1;
          // Reset when we reach the end
          if (newPosition >= maxScroll) {
            // Instead of instantly jumping to the start, we'll scroll normally to the end,
            // then quickly reset to the beginning
            if (newPosition >= maxScroll + 30) {
              container.scrollTo({ left: 0, behavior: 'auto' });
              return 0;
            }
          }
          
          // Update actual scroll position
          container.scrollLeft = newPosition;
          return newPosition;
        });
      }, 30); // Smooth and slow scrolling
    };
    
    const stopAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
    
    startAutoScroll();
    
    return () => {
      stopAutoScroll();
    };
  }, [maxScroll]);
  
  // Handle manual scrolling
  const handleManualScroll = () => {
    const container = containerRef.current;
    if (container) {
      setScrollPosition(container.scrollLeft);
    }
  };
  
  const scrollLeft = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
      setScrollPosition(Math.max(0, scrollPosition - 200));
    }
  };
  
  const scrollRight = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
      setScrollPosition(Math.min(maxScroll, scrollPosition + 200));
    }
  };
  
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
        className="flex overflow-x-auto space-x-2 py-2 px-1 no-scrollbar scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
        onScroll={handleManualScroll}
        onMouseEnter={() => {
          if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
          }
        }}
        onMouseLeave={() => {
          if (!autoScrollIntervalRef.current) {
            autoScrollIntervalRef.current = window.setInterval(() => {
              const container = containerRef.current;
              if (!container || maxScroll <= 0) return;
              
              setScrollPosition((prev) => {
                const newPosition = prev + 1;
                if (newPosition >= maxScroll + 30) {
                  container.scrollTo({ left: 0, behavior: 'auto' });
                  return 0;
                }
                container.scrollLeft = newPosition;
                return newPosition;
              });
            }, 30);
          }
        }}
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelectSuggestion(suggestion)}
            className="whitespace-nowrap px-4 py-2 bg-secondary/50 hover:bg-secondary/80 rounded-full text-sm transition-colors flex-shrink-0 hover:text-accent"
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
