
import { Info } from 'lucide-react';

const SystemPromptBox = () => {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 animate-fade-in shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">
          <div className="bg-blue-100 p-1.5 rounded-md">
            <Info className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-1 text-blue-700">Welcome to YellowBird Data Navigator</h3>
          <p className="text-sm text-blue-700">
            Ask questions about your data in natural language. I'll translate your query into SQL,
            retrieve the data, and generate interactive visualizations for you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemPromptBox;
