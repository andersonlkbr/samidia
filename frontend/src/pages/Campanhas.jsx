import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Campanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState([]);
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCampanha, setEditingCampanha] = useState(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '', empresa_id: '' });
  
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    fetchCampanhas();
    if (isSuperAdmin) {
      fetchEmpresas();
    }
  }, [isSuperAdmin]);

  const fetchCampanhas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/campanha');
      setCampanhas(res.data);
    } catch (error) {
      toast.error('Erro ao carregar campanhas');
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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/campanha', formData);
      toast.success('Campanha criada com sucesso');
      setIsNewModalOpen(false);
      setFormData({ nome: '', descricao: '', empresa_id: '' });
      fetchCampanhas();
    } catch (error) {
      toast.error('Erro ao criar campanha');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/campanha/${editingCampanha.id}`, formData);
      toast.success('Campanha atualizada com sucesso');
      setIsEditModalOpen(false);
      setEditingCampanha(null);
      fetchCampanhas();
    } catch (error) {
      toast.error('Erro ao atualizar campanha');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha?')) return;
    try {
      await api.delete(`/campanha/${id}`);
      toast.success('Campanha excluída');
      fetchCampanhas();
    } catch (error) {
      toast.error('Erro ao excluir campanha');
    }
  };

  const openEditModal = (campanha) => {
    setEditingCampanha(campanha);
    setFormData({ 
      nome: campanha.nome, 
      descricao: campanha.descricao, 
      empresa_id: campanha.empresa_id,
      ativo: campanha.ativo
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Campanhas</h1>
        <button 
          onClick={() => {
             setFormData({ nome: '', descricao: '', empresa_id: '' });
             setIsNewModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nova Campanha
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">Carregando campanhas...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campanhas.map(campanha => (
            <div key={campanha.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-1">{campanha.nome}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${campanha.ativo ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                    {campanha.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
              
              <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-grow">{campanha.descricao}</p>
              
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-700">
                <button 
                  onClick={() => navigate(`/campanhas/${campanha.id}`)}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  <Eye size={18} />
                  <span>Ver Detalhes</span>
                </button>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(campanha)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(campanha.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Nova Campanha</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
                <input 
                  required 
                  type="text" 
                  value={formData.nome} 
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Descrição</label>
                <textarea 
                  value={formData.descricao} 
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Empresa</label>
                  <select 
                    required 
                    value={formData.empresa_id} 
                    onChange={e => setFormData({...formData, empresa_id: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Selecione a empresa</option>
                    {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-slate-100">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Editar Campanha</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
                <input 
                  required 
                  type="text" 
                  value={formData.nome} 
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Descrição</label>
                <textarea 
                  value={formData.descricao} 
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="ativo"
                  checked={formData.ativo} 
                  onChange={e => setFormData({...formData, ativo: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-slate-100">Campanha Ativa</label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-slate-100">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
