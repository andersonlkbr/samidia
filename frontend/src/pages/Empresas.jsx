import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin, isAdmin } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [nome, setNome] = useState('');

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/empresa');
      // For each empresa, we might want to fetch resume, or assume the backend sends some counts
      // To keep it simple and performant, we'll try to fetch resumos sequentially or Promise.all
      const empresasaData = res.data;
      
      const empresasComResumo = await Promise.all(
        empresasaData.map(async (emp) => {
          try {
            const resResumo = await api.get(`/empresa/${emp.id}/resumo`);
            return { ...emp, resumo: resResumo.data };
          } catch (e) {
            return { ...emp, resumo: { tvs: 0, campanhas: 0, midias: 0 } };
          }
        })
      );
      
      setEmpresas(empresasComResumo);
    } catch (error) {
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selectedEmpresa) {
        await api.put(`/empresa/${selectedEmpresa.id}`, { nome });
        toast.success('Empresa atualizada com sucesso');
      } else {
        await api.post('/empresa', { nome });
        toast.success('Empresa criada com sucesso');
      }
      setShowModal(false);
      fetchEmpresas();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar empresa');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/empresa/${selectedEmpresa.id}`);
      toast.success('Empresa excluída');
      setShowDeleteModal(false);
      fetchEmpresas();
    } catch (error) {
      toast.error('Erro ao excluir empresa');
    }
  };

  const openNew = () => {
    setSelectedEmpresa(null);
    setNome('');
    setShowModal(true);
  };

  const openEdit = (empresa) => {
    setSelectedEmpresa(empresa);
    setNome(empresa.nome);
    setShowModal(true);
  };

  const openDelete = (empresa) => {
    setSelectedEmpresa(empresa);
    setShowDeleteModal(true);
  };

  if (!isSuperAdmin && !isAdmin) {
    return <div className="p-8 text-slate-100">Acesso negado. Apenas administradores podem acessar esta página.</div>;
  }

  if (loading) return <div className="text-slate-100 p-8">Carregando...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Building className="w-8 h-8 text-blue-500" />
          Empresas
        </h1>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nova Empresa
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium text-center">TVs</th>
                <th className="px-6 py-4 font-medium text-center">Campanhas</th>
                <th className="px-6 py-4 font-medium text-center">Mídias Ativas</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {empresas.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-slate-100 font-medium">{emp.nome}</td>
                  <td className="px-6 py-4 text-slate-300 text-center">{emp.resumo?.tvs || 0}</td>
                  <td className="px-6 py-4 text-slate-300 text-center">{emp.resumo?.campanhas || 0}</td>
                  <td className="px-6 py-4 text-slate-300 text-center">{emp.resumo?.midias || 0}</td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button onClick={() => openEdit(emp)} className="p-2 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-700 transition-colors" title="Editar">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => openDelete(emp)} className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors" title="Excluir">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {empresas.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                    Nenhuma empresa cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100">{selectedEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome da Empresa</label>
                <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ex: Acme Corp" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors">Salvar</button>
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
            <h3 className="text-xl font-bold text-slate-100 mb-2">Excluir Empresa?</h3>
            <p className="text-slate-400 mb-6">Tem certeza que deseja excluir a empresa "{selectedEmpresa?.nome}"? Esta ação removerá também os vínculos de TVs e usuários.</p>
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
