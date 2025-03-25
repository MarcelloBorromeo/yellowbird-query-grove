
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Database, BarChart3, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center space-x-2">
            <div className="bg-yellowbird-400 p-2 rounded-lg">
              <Database className="h-5 w-5 text-yellowbird-950" />
            </div>
            <span className="font-semibold text-lg">YellowBird</span>
          </NavLink>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink 
              to="/" 
              className={({isActive}) => cn(
                "flex items-center space-x-1 text-sm font-medium py-2 text-black",
                isActive && "border-b-2 border-yellowbird-500"
              )}
              end
            >
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden flex items-center text-gray-500 hover:text-gray-700" 
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={cn(
        "fixed inset-0 top-16 z-40 bg-white transform transition-transform duration-300 ease-in-out md:hidden",
        isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <nav className="flex flex-col p-6 space-y-6">
          <NavLink 
            to="/" 
            className={({isActive}) => cn(
              "flex items-center space-x-2 text-lg font-medium p-2 rounded-lg text-black",
              isActive ? "bg-yellowbird-50" : "hover:bg-gray-50"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
            end
          >
            <BarChart3 className="h-5 w-5" />
            <span>Dashboard</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
