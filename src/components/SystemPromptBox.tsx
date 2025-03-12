
import { Info } from 'lucide-react';

const SystemPromptBox = () => {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-6 animate-fade-in shadow-sm">
      <div className="flex items-start space-x-5">
        <div className="mt-1">
          <div className="bg-blue-100 p-2 rounded-full">
            <Info className="h-5 w-5 text-blue-500" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-medium mb-2 text-gray-800">Welcome to YellowBird Data Navigator</h3>
          <p className="text-gray-600">
            Ask questions about your data in natural language. The navigator will translate your query into SQL, retrieve the data,
            and generate interactive visualizations for you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemPromptBox;
