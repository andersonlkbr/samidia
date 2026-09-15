import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function Relatorios() {
  const [tvs, setTvs] = useState([]);
  const [selectedTv, setSelectedTv] = useState('');
  const [resumo, setResumo] = useState(null);
  const [midias, setMidias] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTvs();
  }, []);

  useEffect(() => {
    if (selectedTv) {
      fetchRelatorio(selectedTv);
    } else {
      setResumo(null);
      setMidias([]);
    }
  }, [selectedTv]);

  const fetchTvs = async () => {
    try {
      const response = await api.get('/tv');
      setTvs(response.data);
    } catch (error) {
      toast.error('Erro ao carregar TVs');
    }
  };

  const fetchRelatorio = async (tvId) => {
    setIsLoading(true);
    try {
      const [resumoRes, midiasRes] = await Promise.all([
        api.get(`/relatorio/${tvId}`),
        api.get(`/relatorio/${tvId}/midias`)
      ]);
      setResumo(resumoRes.data);
      setMidias(midiasRes.data);
    } catch (error) {
      toast.error('Erro ao carregar relatórios');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTempo = (segundos) => {
    if (!segundos) return '00:00:00';
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-100">Relatórios</h1>
        <div className="w-full sm:w-64">
          <select
            value={selectedTv}
            onChange={(e) => setSelectedTv(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma TV...</option>
            {tvs.map((tv) => (
              <option key={tv.id} value={tv.id}>
                {tv.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">Carregando relatórios...</div>
      ) : selectedTv && resumo ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-sm font-medium text-slate-400">Total de Exibições</p>
              <p className="text-3xl font-bold text-white mt-2">{resumo.totalExibicoes || 0}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-sm font-medium text-slate-400">Tempo Total (Imagens)</p>
              <p className="text-3xl font-bold text-white mt-2">{formatTempo(resumo.tempoImagens)}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-sm font-medium text-slate-400">Tempo Total (Vídeos)</p>
              <p className="text-3xl font-bold text-white mt-2">{formatTempo(resumo.tempoVideos)}</p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-sm font-medium text-slate-400">Tipo</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-400">URL / Nome</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-400">Exibições</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-400">Tempo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {midias.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                        Nenhuma mídia registrada para esta TV.
                      </td>
                    </tr>
                  ) : (
                    midias.map((midia, index) => (
                      <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            midia.tipo === 'video' 
                              ? 'bg-purple-600/20 text-purple-400' 
                              : 'bg-blue-600/20 text-blue-400'
                          }`}>
                            {midia.tipo?.toUpperCase() || 'DESCONHECIDO'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {midia.url ? (
                            <a href={midia.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate max-w-xs block" title={midia.url}>
                              {midia.url.split('/').pop()}
                            </a>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{midia.exibicoes || 0}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{formatTempo(midia.tempoTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-slate-400 py-12 bg-slate-800 rounded-xl border border-slate-700">
          Selecione uma TV acima para visualizar o relatório.
        </div>
      )}
    </div>
  );
}
