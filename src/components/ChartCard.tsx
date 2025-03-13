
import { useState } from 'react';
import Plot from 'react-plotly.js';
import { PlotData, Layout } from 'plotly.js';
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
  
  // Generate a unique ID for this chart
  const chartId = `chart-${title.toLowerCase().replace(/\s+/g, '-')}-${chartType}`;
  
  // Create shareable link with encoded chart data
  const createShareableLink = () => {
    const params = new URLSearchParams();
    params.set('chart', chartId);
    params.set('type', chartType);
    params.set('title', title);
    params.set('dataKey', dataKey);
    params.set('nameKey', nameKey);
    
    // Safely encode the data as a JSON string
    const encodedData = encodeURIComponent(JSON.stringify(data));
    params.set('data', encodedData);
    
    return `${window.location.origin}/?${params.toString()}`;
  };
  
  const shareableLink = createShareableLink();
  
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

  const copyShareableLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Convert the data for Plotly
  const getPlotData = (): Partial<PlotData>[] => {
    switch (chartType) {
      case 'bar':
        return [{
          type: 'bar',
          x: data.map(item => item[nameKey]),
          y: data.map(item => item[dataKey]),
          marker: {
            color: data.map((_, index) => colors[index % colors.length])
          }
        }];
      
      case 'line':
        return [{
          type: 'scatter',
          mode: 'lines+markers',
          x: data.map(item => item[nameKey]),
          y: data.map(item => item[dataKey]),
          line: { color: colors[0], width: 2 },
          marker: { 
            color: colors[0],
            size: 8,
            line: { color: 'white', width: 2 }
          }
        }];
      
      case 'pie':
        return [{
          type: 'pie',
          labels: data.map(item => item[nameKey]),
          values: data.map(item => item[dataKey]),
          marker: {
            colors: data.map((_, index) => colors[index % colors.length])
          },
          hole: 0.4,
          textinfo: 'label+percent'
        }];
        
      case 'area':
        return [{
          type: 'scatter',
          mode: 'lines',
          x: data.map(item => item[nameKey]),
          y: data.map(item => item[dataKey]),
          fill: 'tozeroy',
          line: { color: colors[0], width: 2 },
          fillcolor: colors[0] + '30' // Add transparency
        }];
      
      default:
        return [{
          type: 'bar',
          x: data.map(item => item[nameKey]),
          y: data.map(item => item[dataKey])
        }];
    }
  };

  // Configure the layout for Plotly
  const getLayout = (): Partial<Layout> => {
    const baseLayout: Partial<Layout> = {
      autosize: true,
      margin: { l: 50, r: 20, t: 30, b: 50 },
      font: {
        family: 'Inter, system-ui, sans-serif',
        size: 12
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      xaxis: {
        gridcolor: 'rgba(0,0,0,0.1)',
        zerolinecolor: 'rgba(0,0,0,0.2)'
      },
      yaxis: {
        gridcolor: 'rgba(0,0,0,0.1)',
        zerolinecolor: 'rgba(0,0,0,0.2)'
      }
    };

    if (chartType === 'pie') {
      return {
        ...baseLayout,
        legend: {
          orientation: 'h',
          y: -0.2
        }
      };
    }

    return baseLayout;
  };

  const plotConfig = {
    displayModeBar: false, // Hide the modebar
    responsive: true
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
          id={chartId}
          data={getPlotData()}
          layout={getLayout()}
          config={plotConfig}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default ChartCard;
