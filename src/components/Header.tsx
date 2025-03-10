import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Database, BarChart3, Info, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  return <header className={cn("fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out py-4", isScrolled ? "glass shadow-sm" : "bg-transparent")}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center space-x-2">
            <div className="bg-yellowbird-500 p-2 rounded-lg">
              <Database className="h-5 w-5 text-yellowbird-950" />
            </div>
            <span className="font-semibold text-lg">YellowBird</span>
          </NavLink>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink to="/" className={({
            isActive
          }) => cn("flex items-center space-x-1 text-sm font-medium py-2 px-1 border-b-2 transition-all", isActive ? "border-yellowbird-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-yellowbird-300")} end>
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>
            
            
          </nav>
          
          {/* Mobile Menu Button */}
          <button className="md:hidden flex items-center text-muted-foreground hover:text-foreground" onClick={toggleMobileMenu} aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={cn("fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-sm transform transition-transform duration-300 ease-in-out md:hidden", isMobileMenuOpen ? "translate-x-0" : "translate-x-full")}>
        <nav className="flex flex-col p-6 space-y-6">
          <NavLink to="/" className={({
          isActive
        }) => cn("flex items-center space-x-2 text-lg font-medium p-2 rounded-lg transition-all", isActive ? "bg-yellowbird-100 dark:bg-yellowbird-950/20 text-yellowbird-900 dark:text-yellowbird-300" : "text-muted-foreground hover:bg-muted")} onClick={() => setIsMobileMenuOpen(false)} end>
            <BarChart3 className="h-5 w-5" />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/about" className={({
          isActive
        }) => cn("flex items-center space-x-2 text-lg font-medium p-2 rounded-lg transition-all", isActive ? "bg-yellowbird-100 dark:bg-yellowbird-950/20 text-yellowbird-900 dark:text-yellowbird-300" : "text-muted-foreground hover:bg-muted")} onClick={() => setIsMobileMenuOpen(false)}>
            <Info className="h-5 w-5" />
            <span>About</span>
          </NavLink>
        </nav>
      </div>
    </header>;
};
export default Header;