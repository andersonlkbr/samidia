import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Settings, Copy, Tv as TvIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function TVs() {
  const [tvs, setTvs] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin, isAdmin } = useAuth();
  
  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [selectedTv, setSelectedTv] = useState(null);
  
  // Forms state
  const [formData, setFormData] = useState({ nome: '', cidade: '', estado: '', empresa_id: '' });
  const [configData, setConfigData] = useState({ noticias_frequencia: 10, clima_frequencia: 10, orientacao: 'horizontal' });

  useEffect(() => {
    fetchTvs();
    
    // Auto-refresh a cada 10 segundos para ver quem está online
    const interval = setInterval(() => {
      fetchTvsSilent();
    }, 10000);

    if (isSuperAdmin || isAdmin) {
      fetchEmpresas();
    }
    
    return () => clearInterval(interval);
  }, [isSuperAdmin, isAdmin]);

  const fetchTvsSilent = async () => {
    try {
      const res = await api.get('/tv');
      setTvs(res.data);
    } catch (error) {
      // silencioso
    }
  };

  const fetchTvs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tv');
      setTvs(res.data);
    } catch (error) {
      toast.error('Erro ao carregar TVs');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    try {
      const res = await api.get('/empresa');
      setEmpresas(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyPin = (pin) => {
    navigator.clipboard.writeText(pin);
    toast.success('PIN copiado!');
  };

  const handleSaveTv = async (e) => {
    e.preventDefault();
    try {
      if (selectedTv) {
        await api.put(`/tv/${selectedTv.id}`, formData);
        toast.success('TV atualizada com sucesso');
      } else {
        await api.post('/tv', formData);
        toast.success('TV criada com sucesso');
      }
      setShowFormModal(false);
      fetchTvs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar TV');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/tv/${selectedTv.id}/config`, configData);
      toast.success('Configurações atualizadas');
      setShowConfigModal(false);
      fetchTvs();
    } catch (error) {
      toast.error('Erro ao atualizar configurações');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/tv/${selectedTv.id}`);
      toast.success('TV excluída');
      setShowDeleteModal(false);
      fetchTvs();
    } catch (error) {
      toast.error('Erro ao excluir TV');
    }
  };

  const openNewTv = () => {
    setSelectedTv(null);
    setFormData({ nome: '', cidade: '', estado: '', empresa_id: empresas.length > 0 ? empresas[0].id : '' });
    setShowFormModal(true);
  };

  const openEditTv = (tv) => {
    setSelectedTv(tv);
    setFormData({ nome: tv.nome, cidade: tv.cidade || '', estado: tv.estado || '', empresa_id: tv.empresa_id || '' });
    setShowFormModal(true);
  };

  const openConfigTv = (tv) => {
    setSelectedTv(tv);
    setConfigData({ 
      noticias_frequencia: tv.noticias_frequencia || 10, 
      clima_frequencia: tv.clima_frequencia || 10,
      orientacao: tv.orientacao || 'horizontal'
    });
    setShowConfigModal(true);
  };

  const openDeleteTv = (tv) => {
    setSelectedTv(tv);
    setShowDeleteModal(true);
  };

  if (loading) return <div className="text-slate-100 p-8">Carregando...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <TvIcon className="w-8 h-8 text-blue-500" />
          TVs
        </h1>
        <button onClick={openNewTv} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nova TV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tvs.map(tv => (
          <div key={tv.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">{tv.nome}</h3>
                <p className="text-sm text-slate-400">{tv.cidade}{tv.estado ? `/${tv.estado}` : ''}</p>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${tv.online ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${tv.online ? 'bg-green-400' : 'bg-red-400'}`}></div>
                {tv.online ? 'Online' : 'Offline'}
              </div>
            </div>

            <div className="flex-1 space-y-3 mb-6">
              <div className="flex justify-between items-center bg-slate-900 rounded p-2">
                <span className="text-xs text-slate-400">PIN</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-100">{tv.pin || 'N/A'}</span>
                  <button onClick={() => handleCopyPin(tv.pin)} className="text-slate-400 hover:text-blue-400" title="Copiar PIN">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded bg-slate-700 text-xs text-slate-300">
                  {tv.orientacao === 'vertical' ? 'Vertical' : 'Horizontal'}
                </span>
                {tv.empresa && (
                  <span className="inline-flex items-center px-2 py-1 rounded bg-slate-700 text-xs text-slate-300 truncate max-w-[120px]">
                    {tv.empresa.nome}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-700 pt-4">
              <button onClick={() => openConfigTv(tv)} className="p-2 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-700 transition-colors" title="Configurações">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={() => window.open(`/player.html?tv=${tv.id}`, '_blank')} className="p-2 text-slate-400 hover:text-green-400 rounded-lg hover:bg-slate-700 transition-colors" title="Abrir Player">
                <ExternalLink className="w-5 h-5" />
              </button>
              <button onClick={() => openEditTv(tv)} className="p-2 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-700 transition-colors" title="Editar">
                <Pencil className="w-5 h-5" />
              </button>
              <button onClick={() => openDeleteTv(tv)} className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors" title="Excluir">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {tvs.length === 0 && (
          <div className="col-span-full text-center py-12 bg-slate-800 border border-slate-700 rounded-xl">
            <p className="text-slate-400">Nenhuma TV cadastrada.</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100">{selectedTv ? 'Editar TV' : 'Nova TV'}</h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveTv} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome da TV</label>
                <input required type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ex: Recepção" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Cidade</label>
                  <input type="text" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Estado (UF)</label>
                  <input type="text" maxLength={2} value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value.toUpperCase()})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              {(isSuperAdmin || isAdmin) && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Empresa</label>
                  <select value={formData.empresa_id} onChange={(e) => setFormData({...formData, empresa_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecione uma empresa (opcional)</option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100">Configurações da TV</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveConfig} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Orientação</label>
                <select value={configData.orientacao} onChange={(e) => setConfigData({...configData, orientacao: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Frequência de Notícias (min)</label>
                <input type="number" min="0" value={configData.noticias_frequencia} onChange={(e) => setConfigData({...configData, noticias_frequencia: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Frequência de Clima (min)</label>
                <input type="number" min="0" value={configData.clima_frequencia} onChange={(e) => setConfigData({...configData, clima_frequencia: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors">Salvar Configurações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-sm border border-slate-700 shadow-xl overflow-hidden p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-100 mb-2">Excluir TV?</h3>
            <p className="text-slate-400 mb-6">Tem certeza que deseja excluir a TV "{selectedTv?.nome}"? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
