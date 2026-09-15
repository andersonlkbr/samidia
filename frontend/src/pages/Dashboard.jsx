import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  Image as ImageIcon, 
  Megaphone, 
  Eye, 
  Building2 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { isSuperAdmin } = useAuth();
  const [dados, setDados] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      setDados(response.data);
    } catch (error) {
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        Carregando...
      </div>
    );
  }

  if (!dados) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center">
          <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg mr-4">
            <Monitor className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Total TVs</p>
            <p className="text-2xl font-bold text-white">{dados.totalTvs || 0}</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center">
          <div className="p-4 bg-green-600/20 text-green-400 rounded-lg mr-4">
            <Wifi className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">TVs Online</p>
            <p className="text-2xl font-bold text-white">{dados.tvsOnline || 0}</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center">
          <div className="p-4 bg-red-600/20 text-red-400 rounded-lg mr-4">
            <WifiOff className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">TVs Offline</p>
            <p className="text-2xl font-bold text-white">{dados.tvsOffline || 0}</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center">
          <div className="p-4 bg-purple-600/20 text-purple-400 rounded-lg mr-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Mídias Ativas</p>
            <p className="text-2xl font-bold text-white">{dados.midiasAtivas || 0}</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center">
          <div className="p-4 bg-amber-500/20 text-amber-400 rounded-lg mr-4">
            <Megaphone className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Campanhas</p>
            <p className="text-2xl font-bold text-white">{dados.totalCampanhas || 0}</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center">
          <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg mr-4">
            <Eye className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Total Exibições</p>
            <p className="text-2xl font-bold text-white">{dados.totalExibicoes || 0}</p>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center">
            <div className="p-4 bg-indigo-600/20 text-indigo-400 rounded-lg mr-4">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Total Empresas</p>
              <p className="text-2xl font-bold text-white">{dados.totalEmpresas || 0}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
