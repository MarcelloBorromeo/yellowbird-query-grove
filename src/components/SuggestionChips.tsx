
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

const SuggestionChips = ({ onSelectSuggestion }: SuggestionChipsProps) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'left' | 'right'>('right');
  const [isHovering, setIsHovering] = useState(false);
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
    if (!container) return;
    
    const calculateMaxScroll = () => {
      const newMaxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      setMaxScroll(newMaxScroll);
    };
    
    calculateMaxScroll();
    
    // Recalculate when window resizes
    window.addEventListener('resize', calculateMaxScroll);
    
    return () => {
      window.removeEventListener('resize', calculateMaxScroll);
    };
  }, []);

  // Auto-scrolling effect
  useEffect(() => {
    // Don't auto-scroll if the user is hovering or there's no need to scroll
    if (isHovering || maxScroll <= 0) {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
      return;
    }
    
    const startAutoScroll = () => {
      // Clear any existing interval first
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      
      autoScrollIntervalRef.current = window.setInterval(() => {
        const container = containerRef.current;
        if (!container) return;
        
        setScrollPosition((prev) => {
          // Calculate new position based on direction
          let newPosition = prev;
          
          if (scrollDirection === 'right') {
            newPosition = Math.min(prev + 1, maxScroll);
            
            // Change direction if we reached the end
            if (newPosition >= maxScroll) {
              setScrollDirection('left');
            }
          } else {
            newPosition = Math.max(prev - 1, 0);
            
            // Change direction if we reached the beginning
            if (newPosition <= 0) {
              setScrollDirection('right');
            }
          }
          
          // Update scroll position in the DOM
          container.scrollLeft = newPosition;
          return newPosition;
        });
      }, 30);
    };
    
    startAutoScroll();
    
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
  }, [maxScroll, scrollDirection, isHovering]);
  
  const handleManualScroll = () => {
    const container = containerRef.current;
    if (container) {
      setScrollPosition(container.scrollLeft);
    }
  };
  
  const scrollLeft = () => {
    const container = containerRef.current;
    if (container) {
      const newPosition = Math.max(0, scrollPosition - 200);
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };
  
  const scrollRight = () => {
    const container = containerRef.current;
    if (container) {
      const newPosition = Math.min(maxScroll, scrollPosition + 200);
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
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
        ref={containerRef}
        className="flex overflow-x-auto space-x-2 py-2 px-1 scrollbar-hide scroll-smooth"
        style={{ 
          scrollBehavior: 'smooth', 
          msOverflowStyle: 'none', 
          scrollbarWidth: 'none' 
        }}
        onScroll={handleManualScroll}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
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
