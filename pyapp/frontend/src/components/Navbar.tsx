import React from 'react';

interface NavbarProps {
  title?: React.ReactNode;
  className?: string;
  leftChildren?: React.ReactNode;
  rightChildren?: React.ReactNode;
  showMenuButton?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  title,
  className,
  leftChildren,
  rightChildren,
  showMenuButton = false,
}) => {
  return (
    <header className={`navbar bg-base-100 shadow-sm ${className || ''}`}>
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6">
        <div className="flex-shrink-0">
          {showMenuButton && (
            <label htmlFor="nav-drawer" className="btn btn-ghost btn-square mr-2 lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          )}
          {leftChildren}
        </div>
        <div className="flex-1 flex justify-center">
          {title}
        </div>
        <div className="flex-shrink-0">
          {rightChildren}
        </div>
      </div>
    </header>
  );
};

export default Navbar;