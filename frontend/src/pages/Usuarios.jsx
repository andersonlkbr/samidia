import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, User, X, CheckCircle, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin, isAdmin } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [formData, setFormData] = useState({ nome: '', email: '', senha: '', role: 'operador', empresa_id: '' });

  useEffect(() => {
    fetchUsuarios();
    if (isSuperAdmin || isAdmin) {
      fetchEmpresas();
    }
  }, [isSuperAdmin, isAdmin]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await api.get('/usuario');
      setUsuarios(res.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (selectedUsuario) {
        delete payload.senha; // Don't send password if we aren't changing it in edit, maybe backend ignores or we should allow it. Let's keep it simple.
        if (formData.senha) {
          payload.senha = formData.senha;
        }
        await api.put(`/usuario/${selectedUsuario.id}`, payload);
        toast.success('Usuário atualizado com sucesso');
      } else {
        await api.post('/usuario', payload);
        toast.success('Usuário criado com sucesso');
      }
      setShowModal(false);
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar usuário');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/usuario/${selectedUsuario.id}`);
      toast.success('Usuário desativado/excluído');
      setShowDeleteModal(false);
      fetchUsuarios();
    } catch (error) {
      toast.error('Erro ao desativar usuário');
    }
  };

  const openNew = () => {
    setSelectedUsuario(null);
    setFormData({ nome: '', email: '', senha: '', role: 'operador', empresa_id: empresas.length > 0 ? empresas[0].id : '' });
    setShowModal(true);
  };

  const openEdit = (usuario) => {
    setSelectedUsuario(usuario);
    setFormData({ 
      nome: usuario.nome, 
      email: usuario.email, 
      senha: '', 
      role: usuario.role || 'operador', 
      empresa_id: usuario.empresa_id || '' 
    });
    setShowModal(true);
  };

  const openDelete = (usuario) => {
    setSelectedUsuario(usuario);
    setShowDeleteModal(true);
  };

  if (!isSuperAdmin && !isAdmin) {
    return <div className="p-8 text-slate-100">Acesso negado. Apenas administradores podem acessar esta página.</div>;
  }

  if (loading) return <div className="text-slate-100 p-8">Carregando...</div>;

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'admin': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      default: return 'Operador';
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <User className="w-8 h-8 text-blue-500" />
          Usuários
        </h1>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Novo Usuário
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                {isSuperAdmin && <th className="px-6 py-4 font-medium">Empresa</th>}
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {usuarios.map(user => (
                <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-slate-100 font-medium">{user.nome}</td>
                  <td className="px-6 py-4 text-slate-300">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {user.empresa?.nome || '-'}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {user.ativo !== false ? (
                      <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                        <Ban className="w-4 h-4" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button onClick={() => openEdit(user)} className="p-2 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-700 transition-colors" title="Editar">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => openDelete(user)} className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors" title="Desativar">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-8 text-center text-slate-400">
                    Nenhum usuário cadastrado.
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
              <h3 className="text-lg font-semibold text-slate-100">{selectedUsuario ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
                <input required type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Senha {selectedUsuario && '(deixe em branco para manter)'}
                </label>
                <input type="password" required={!selectedUsuario} value={formData.senha} onChange={(e) => setFormData({...formData, senha: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              
              {isSuperAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Nível de Acesso (Role)</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                      <option value="operador">Operador</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Empresa</label>
                    <select value={formData.empresa_id} onChange={(e) => setFormData({...formData, empresa_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                      <option value="">Selecione uma empresa</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nome}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

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
            <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-100 mb-2">Desativar/Excluir Usuário?</h3>
            <p className="text-slate-400 mb-6">Tem certeza que deseja desativar o usuário "{selectedUsuario?.nome}"?</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 transition-colors">Desativar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
