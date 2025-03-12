import Header from '@/components/Header';
import { History, Calendar, User, BarChart4 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample historical data
const historyItems = [{
  id: 1,
  title: 'Monthly Active Users',
  date: 'May 15, 2023',
  description: 'Analysis of monthly active users over Q1 2023',
  icon: User
}, {
  id: 2,
  title: 'Revenue Comparison',
  date: 'April 20, 2023',
  description: 'Comparison of revenue streams by product categories',
  icon: BarChart4
}, {
  id: 3,
  title: 'Conversion Rates by Country',
  date: 'March 8, 2023',
  description: 'Geographic analysis of conversion performance',
  icon: Calendar
}];
const Histories = () => {
  return <div className="min-h-screen bg-gradient-to-br from-yellow-50/70 via-white to-yellow-50/50">
      <Header />
      
      <main className="pt-20 pb-20 px-4 relative z-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-block mb-2 py-1 px-3 bg-yellowbird-50 text-yellowbird-800 rounded-full text-xs font-medium">
              Historical Queries
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Query History</h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-base">
              View and revisit your previous data queries and analyses to track insights over time.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-xl p-6 mb-8">
              <div className="flex items-center mb-4">
                <History className="w-5 h-5 mr-2 text-yellowbird-500" />
                <h2 className="text-xl font-semibold">Recent Sessions</h2>
              </div>
              
              <div className="space-y-4">
                {historyItems.map(item => <div key={item.id} className="p-4 border border-gray-100 rounded-lg hover:bg-yellowbird-50/50 transition-colors cursor-pointer flex items-start">
                    <div className="p-2 bg-white rounded-md shadow-sm mr-4">
                      <item.icon className="h-5 w-5 text-yellowbird-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500">{item.description}</p>
                      <div className="mt-2 text-xs text-gray-400">{item.date}</div>
                    </div>
                  </div>)}
              </div>
            </div>
            
            
          </div>
        </div>
      </main>
    </div>;
};
export default Histories;