
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SuggestionChipsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

const SuggestionChips = ({ onSelectSuggestion }: SuggestionChipsProps) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  
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
  
  const scrollLeft = () => {
    const container = document.getElementById('chips-container');
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
      setScrollPosition(Math.max(0, scrollPosition - 200));
    }
  };
  
  const scrollRight = () => {
    const container = document.getElementById('chips-container');
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
      setScrollPosition(scrollPosition + 200);
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
        className="flex overflow-x-auto space-x-2 py-2 px-1 no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
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
      
      <button 
        onClick={scrollRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border border-border"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default SuggestionChips;
