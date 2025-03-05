
import Header from '@/components/Header';
import { Check, Database, Bot, BarChart3, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => (
  <div className="glass-card rounded-xl p-6 flex flex-col items-start h-full animate-fade-in">
    <div className="bg-yellowbird-100 dark:bg-yellowbird-950/30 p-3 rounded-lg mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

const projectTimeline = [
  {
    phase: 'Research & Planning',
    weeks: 'Weeks 1-2',
    tasks: [
      'Project kickoff and detailed requirements analysis',
      'Research LLM-based SQL generation approaches',
      'Plan AWS Elastic Beanstalk deployment strategy'
    ]
  },
  {
    phase: 'Core Development',
    weeks: 'Weeks 3-7',
    tasks: [
      'Build natural language query interface',
      'Implement database connection and schema extraction',
      'Develop LLM-powered SQL generation with error handling'
    ]
  },
  {
    phase: 'Visualization & Deployment',
    weeks: 'Weeks 8-11',
    tasks: [
      'Create dashboard visualization components',
      'Implement chart saving and export functionality',
      'Configure AWS deployment with Elastic Beanstalk'
    ]
  },
  {
    phase: 'Finalization',
    weeks: 'Week 12',
    tasks: [
      'Complete documentation and user guides',
      'Deliver comprehensive project demonstration',
      'Plan post-internship enhancements'
    ]
  }
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] right-[10%] w-[30rem] h-[30rem] bg-yellowbird-200/30 dark:bg-yellowbird-950/10 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-[20%] left-[5%] w-[20rem] h-[20rem] bg-accent/5 rounded-full blur-[90px] animate-float animate-delay-300" />
      </div>
      
      <Header />
      
      <main className="pt-28 pb-20 px-4 relative z-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-2 py-1 px-3 bg-yellowbird-100 dark:bg-yellowbird-950/30 text-yellowbird-800 dark:text-yellowbird-300 rounded-full text-xs font-medium">
              Project Overview
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">About YellowBird Data Navigator</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A sophisticated analytics assistant using natural language processing to
              simplify data exploration and visualization
            </p>
          </div>
          
          {/* Key Features */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold mb-6">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={<Bot className="w-6 h-6 text-yellowbird-600 dark:text-yellowbird-400" />}
                title="Natural Language Interface"
                description="Ask questions in plain English, without needing to know SQL or database structures"
              />
              <FeatureCard
                icon={<Code className="w-6 h-6 text-yellowbird-600 dark:text-yellowbird-400" />}
                title="LLM-Powered SQL Generation"
                description="Advanced AI translation of natural language to precise SQL queries with error handling"
              />
              <FeatureCard
                icon={<Database className="w-6 h-6 text-yellowbird-600 dark:text-yellowbird-400" />}
                title="Live Database Context"
                description="Dynamically extracts schema details to enhance SQL accuracy and relevance"
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6 text-yellowbird-600 dark:text-yellowbird-400" />}
                title="Dynamic Dashboards"
                description="Automated visualization with interactive charts that can be saved and shared"
              />
            </div>
          </section>
          
          {/* Project Timeline */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold mb-6">Project Timeline</h2>
            <div className="space-y-8">
              {projectTimeline.map((phase, index) => (
                <div 
                  key={index}
                  className="glass-card rounded-xl p-6 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col md:flex-row md:items-center mb-4">
                    <h3 className="text-lg font-semibold">{phase.phase}</h3>
                    <div className="md:ml-auto mt-1 md:mt-0 py-1 px-3 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                      {phase.weeks}
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {phase.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-sm">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          
          {/* Future Enhancements */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Future Enhancements</h2>
            <div className="glass-card rounded-xl p-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Advanced Capabilities</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">Expanded query complexity handling with nested subqueries</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">More sophisticated visualization options and custom export formats</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">Enhanced error feedback loop with automated model refinement</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Collaborative Features</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">Real-time dashboard sharing and collaborative annotations</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">Query history and favorite queries with version control</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">Scheduled report generation and distribution workflows</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default About;
