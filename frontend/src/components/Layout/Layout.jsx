import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-700 z-40 flex items-center px-4 justify-between">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          SAmídia
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
        </h1>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 focus:outline-none"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-full overflow-y-auto p-4 pt-20 md:p-8 md:pt-8 md:ml-64">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
