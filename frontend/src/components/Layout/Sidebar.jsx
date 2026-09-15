import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Monitor, 
  Megaphone, 
  Building2, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const linkClass = ({ isActive }) => 
  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
    isActive ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
  }`;

const Sidebar = ({ onClose }) => {
  const { usuario, logout, isAdmin } = useAuth();

  return (
    <aside className="w-full h-full bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          SAmídia
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <NavLink to="/dashboard" onClick={onClose} className={linkClass}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink to="/tvs" onClick={onClose} className={linkClass}>
          <Monitor size={20} />
          <span>TVs</span>
        </NavLink>

        <NavLink to="/campanhas" onClick={onClose} className={linkClass}>
          <Megaphone size={20} />
          <span>Campanhas</span>
        </NavLink>

        {isAdmin && (
          <>
            <NavLink to="/empresas" onClick={onClose} className={linkClass}>
              <Building2 size={20} />
              <span>Empresas</span>
            </NavLink>

            <NavLink to="/usuarios" onClick={onClose} className={linkClass}>
              <Users size={20} />
              <span>Usuários</span>
            </NavLink>
          </>
        )}

        <NavLink to="/relatorios" onClick={onClose} className={linkClass}>
          <BarChart3 size={20} />
          <span>Relatórios</span>
        </NavLink>

        <NavLink to="/configuracoes" onClick={onClose} className={linkClass}>
          <Settings size={20} />
          <span>Configurações</span>
        </NavLink>
      </nav>

      {/* User Info & Logout */}
      {usuario && (
        <div className="p-4 border-t border-slate-700 bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-100 truncate w-32">{usuario.nome}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 w-fit">
                {usuario.role}
              </span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
