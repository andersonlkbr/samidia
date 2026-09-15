import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function Configuracoes() {
  const { usuario } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMudarSenha = async (e) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      toast.error('As novas senhas não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      await api.put('/auth/senha', { senhaAtual, novaSenha });
      toast.success('Senha atualizada com sucesso');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar senha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-medium text-slate-100 mb-4">Informações do Usuário</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400">Nome</label>
              <p className="text-white mt-1">{usuario?.nome}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400">E-mail</label>
              <p className="text-white mt-1">{usuario?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400">Função</label>
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400">
                  {usuario?.role || 'user'}
                </span>
              </div>
            </div>
            {usuario?.empresa && (
              <div>
                <label className="block text-sm font-medium text-slate-400">Empresa</label>
                <p className="text-white mt-1">{usuario.empresa.nome}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-medium text-slate-100 mb-4">Alterar Senha</h2>
          <form onSubmit={handleMudarSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Senha Atual
              </label>
              <input
                type="password"
                required
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                required
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : 'Atualizar Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
