
import { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PlotlyVisualizationProps {
  title: string;
  description?: string;
  figure: any;
  type: string;
}

const PlotlyVisualization = ({ 
  title, 
  description, 
  figure,
  type
}: PlotlyVisualizationProps) => {
  const [expanded, setExpanded] = useState(false);
  const [processedFigure, setProcessedFigure] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Generate a unique ID for this chart
  const chartId = `plotly-${title.toLowerCase().replace(/\s+/g, '-')}-${type}`;
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: expanded ? window.innerHeight - 120 : 400
        });
      }
    };

    handleResize(); // Initial sizing
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [expanded]);
  
  // Process figure data
  useEffect(() => {
    if (figure) {
      try {
        console.log(`Processing figure for ${type} chart:`, typeof figure);
        
        // Parse figure if it's a string
        let figData;
        if (typeof figure === 'string') {
          try {
            figData = JSON.parse(figure);
            console.log('Successfully parsed figure string to JSON');
          } catch (parseError) {
            console.error('Error parsing figure string:', parseError);
            setError('Invalid figure data format (JSON parse error)');
            return;
          }
        } else {
          figData = figure;
        }
        
        // Validate the figure structure
        if (!figData.data || !Array.isArray(figData.data)) {
          console.error('Invalid figure data structure:', figData);
          
          // Try to repair the structure if possible
          if (figData.type && (figData.x || figData.y || figData.labels || figData.values)) {
            // It seems the figure itself is a trace, wrap it in the proper structure
            figData = {
              data: [figData],
              layout: figData.layout || {}
            };
            console.log('Repaired figure structure:', figData);
          } else {
            setError('Invalid figure data format (missing data array)');
            return;
          }
        }
        
        // Ensure all traces have a type
        figData.data.forEach((trace: any, i: number) => {
          if (!trace.type) {
            trace.type = type.toLowerCase().replace(' chart', '');
            console.log(`Set trace ${i} type to ${trace.type}`);
          }
        });
        
        // Ensure layout exists and has proper settings
        if (!figData.layout) {
          figData.layout = {};
        }
        
        // Enhance layout with better defaults
        figData.layout = {
          ...figData.layout,
          autosize: true,
          margin: { l: 50, r: 20, t: 40, b: 50, pad: 4 },
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12
          },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          modebar: { orientation: 'v' }
        };
        
        setProcessedFigure(figData);
        setError(null);
        
        // Force a re-render after a short delay to ensure proper sizing
        setTimeout(() => {
          if (containerRef.current) {
            setDimensions({
              width: containerRef.current.clientWidth,
              height: expanded ? window.innerHeight - 120 : 400
            });
          }
        }, 100);
        
      } catch (error) {
        console.error('Error processing figure data:', error);
        setError(`Error processing figure data: ${error}`);
        setProcessedFigure(null);
      }
    } else {
      setError('No figure data provided');
    }
  }, [figure, type]);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
    
    // Update body scroll and dimensions
    if (!expanded) {
      document.body.style.overflow = 'hidden'; // Prevent scrolling when expanded
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: window.innerHeight - 120
        });
      }
    } else {
      document.body.style.overflow = 'auto'; // Re-enable scrolling when minimized
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 400
        });
      }
    }
  };
  
  const downloadChart = () => {
    try {
      const plotElement = document.getElementById(chartId);
      if (plotElement) {
        // Use Plotly's toImage function
        const downloadFilename = `${title.toLowerCase().replace(/\s+/g, '-')}.png`;
        
        // @ts-ignore - Plotly is added to the window object
        window.Plotly.toImage(plotElement, {format: 'png', width: dimensions.width, height: dimensions.height})
          .then(function(dataUrl) {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = downloadFilename;
            link.click();
            toast.success('Chart downloaded successfully');
          })
          .catch(function(err) {
            console.error('Error downloading chart:', err);
            toast.error('Failed to download chart');
          });
      } else {
        toast.error('Cannot find chart element to download');
      }
    } catch (err) {
      console.error('Error in download function:', err);
      toast.error('Download function error');
    }
  };

  // If there's an error or no processed figure, show an error message
  if (error || !processedFigure) {
    return (
      <div className="glass-card rounded-xl p-4 h-[400px] flex flex-col items-center justify-center">
        <p className="text-muted-foreground text-center mb-2">
          {error || 'No visualization data available'}
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Error details: {error || 'No figure data provided'}
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "glass-card rounded-xl overflow-hidden transition-all duration-300 ease-in-out animate-fade-in",
        expanded ? "fixed inset-0 z-50 m-0 rounded-none" : "relative h-[450px]"
      )}
    >
      <div className="p-4 flex justify-between items-start">
        <div>
          <h3 className="font-medium text-base">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex space-x-1">
          <button 
            onClick={downloadChart}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            aria-label="Download chart"
          >
            <Download className="h-4 w-4" />
          </button>
          
          <button 
            onClick={toggleExpand}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            aria-label={expanded ? "Minimize chart" : "Maximize chart"}
          >
            {expanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      
      <div 
        className="w-full overflow-hidden"
        style={{ height: `calc(${dimensions.height}px - 80px)` }}
        id={chartId}
      >
        <Plot
          data={processedFigure.data}
          layout={{
            ...processedFigure.layout,
            autosize: true,
            height: dimensions.height - 80,
            width: dimensions.width
          }}
          config={{
            displayModeBar: false,
            responsive: true
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default PlotlyVisualization;
