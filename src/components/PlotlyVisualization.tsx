
import { useState } from 'react';
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
  
  // Generate a unique ID for this chart
  const chartId = `plotly-${title.toLowerCase().replace(/\s+/g, '-')}-${type}`;
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const downloadChart = () => {
    const plotElement = document.getElementById(chartId);
    if (plotElement) {
      // Use Plotly's toImage function
      const downloadFilename = `${title.toLowerCase().replace(/\s+/g, '-')}.png`;
      
      // @ts-ignore - Plotly is added to the window object
      window.Plotly.toImage(plotElement, {format: 'png', width: 800, height: 600})
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
  };

  return (
    <div 
      className={cn(
        "glass-card rounded-xl overflow-hidden transition-all duration-300 ease-in-out animate-fade-in",
        expanded ? "fixed inset-4 z-50" : "h-[300px]"
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
      
      <div className="h-[calc(100%-64px)]" id={chartId}>
        {figure && (
          <Plot
            data={figure.data}
            layout={{
              ...figure.layout,
              autosize: true,
              margin: { l: 50, r: 20, t: 30, b: 50 },
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 12
              },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)'
            }}
            config={{
              displayModeBar: false,
              responsive: true
            }}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    </div>
  );
};

export default PlotlyVisualization;
