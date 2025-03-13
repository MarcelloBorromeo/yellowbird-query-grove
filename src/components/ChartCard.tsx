
import { useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Download, Maximize2, Minimize2, Link, Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChartCardProps {
  title: string;
  description?: string;
  chartType: 'bar' | 'line' | 'pie' | 'area';
  data: any[];
  dataKey: string;
  nameKey: string;
  colors?: string[];
}

const defaultColors = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EC4899', // pink-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
];

const ChartCard = ({ 
  title, 
  description, 
  chartType, 
  data, 
  dataKey, 
  nameKey,
  colors = defaultColors
}: ChartCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const plotRef = useRef<any>(null);
  
  // Generate a unique ID for this chart
  const chartId = `chart-${title.toLowerCase().replace(/\s+/g, '-')}-${chartType}`;
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const generateShareableLink = () => {
    try {
      // Create an object with the chart data and configuration
      const chartConfig = {
        title,
        description,
        chartType,
        data,
        dataKey,
        nameKey
      };
      
      // Convert to base64 for URL-safe storage
      const configString = JSON.stringify(chartConfig);
      const encodedConfig = btoa(configString);
      
      // Create the shareable URL
      const link = `${window.location.origin}/?chart=${encodedConfig}`;
      setShareableLink(link);
      
      toast.success('Shareable link generated');
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to generate shareable link');
    }
  };
  
  const copyShareableLink = () => {
    if (!shareableLink) {
      generateShareableLink();
      setTimeout(() => {
        if (shareableLink) {
          navigator.clipboard.writeText(shareableLink);
          setCopied(true);
          toast.success('Link copied to clipboard');
          
          setTimeout(() => {
            setCopied(false);
          }, 2000);
        }
      }, 100);
    } else {
      navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const downloadChart = () => {
    if (plotRef.current) {
      // Use Plotly's toImage function
      const plot = plotRef.current.el;
      if (plot && plot.plot) {
        const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.png`;
        
        // Get the Plotly instance
        const plotlyInstance = plot.plot;
        
        // Download as PNG
        plotlyInstance.toImage({
          format: 'png',
          width: 800,
          height: 600
        }).then((dataUrl: string) => {
          const link = document.createElement('a');
          link.download = fileName;
          link.href = dataUrl;
          link.click();
          toast.success('Chart downloaded');
        }).catch((err: any) => {
          console.error('Error downloading chart:', err);
          toast.error('Failed to download chart');
        });
      } else {
        toast.error('Chart not ready for download');
      }
    }
  };

  const getPlotData = () => {
    // Transform data according to chart type
    switch (chartType) {
      case 'bar':
        return [{
          x: data.map(item => item[nameKey]),
          y: data.map(item => item[dataKey]),
          type: 'bar',
          marker: {
            color: data.map((_, index) => colors[index % colors.length])
          }
        }];
      
      case 'line':
        return [{
          x: data.map(item => item[nameKey]),
          y: data.map(item => item[dataKey]),
          type: 'scatter',
          mode: 'lines+markers',
          line: { color: colors[0] }
        }];
      
      case 'pie':
        return [{
          labels: data.map(item => item[nameKey]),
          values: data.map(item => item[dataKey]),
          type: 'pie',
          marker: {
            colors: data.map((_, index) => colors[index % colors.length])
          }
        }];
        
      case 'area':
        return [{
          x: data.map(item => item[nameKey]),
          y: data.map(item => item[dataKey]),
          type: 'scatter',
          mode: 'lines',
          fill: 'tozeroy',
          line: { color: colors[0] }
        }];
      
      default:
        return [];
    }
  };

  const getPlotLayout = () => {
    const baseLayout = {
      title: '',
      autosize: true,
      margin: { l: 40, r: 20, t: 30, b: 40 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        family: 'Inter, sans-serif',
        size: 12,
        color: '#6b7280'
      }
    };
    
    // Specific layout adjustments per chart type
    switch (chartType) {
      case 'pie':
        return {
          ...baseLayout,
          height: expanded ? undefined : 236,
          showlegend: true,
          legend: { orientation: 'h', y: -0.2 }
        };
      default:
        return {
          ...baseLayout,
          height: expanded ? undefined : 236,
          xaxis: {
            gridcolor: 'rgba(229, 231, 235, 0.5)',
            zerolinecolor: 'rgba(229, 231, 235, 0.5)'
          },
          yaxis: {
            gridcolor: 'rgba(229, 231, 235, 0.5)',
            zerolinecolor: 'rgba(229, 231, 235, 0.5)'
          }
        };
    }
  };

  const getPlotConfig = () => {
    return {
      displayModeBar: false, // Hide the modebar
      responsive: true
    };
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
            onClick={copyShareableLink}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            aria-label="Copy shareable link"
            title="Copy shareable link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Link className="h-4 w-4" />
            )}
          </button>
          
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
      
      <div className="h-[calc(100%-64px)]">
        <Plot
          ref={plotRef}
          data={getPlotData()}
          layout={getPlotLayout()}
          config={getPlotConfig()}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default ChartCard;
