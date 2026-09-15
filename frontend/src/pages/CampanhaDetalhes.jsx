import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, X, GripVertical, Image as ImageIcon, Video, Power, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

function SortableMediaItem({ midia, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: midia.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4 group">
      <div {...attributes} {...listeners} className="cursor-grab p-2 text-slate-500 hover:text-slate-300">
        <GripVertical size={20} />
      </div>
      
      <div className="w-16 h-16 rounded bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
        {midia.tipo === 'video' ? <Video className="text-slate-500" /> : <ImageIcon className="text-slate-500" />}
      </div>
      
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-slate-100 font-medium truncate">{midia.nome || midia.arquivo}</span>
          <span className={`px-2 py-0.5 rounded text-xs ${midia.tipo === 'video' ? 'bg-purple-900/50 text-purple-400' : 'bg-blue-900/50 text-blue-400'}`}>
            {midia.tipo || 'imagem'}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs ${midia.ativo ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {midia.ativo ? 'Ativo' : 'Inativo'}
          </span>
          <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">{midia.duracao}s</span>
          <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">Região {midia.regiao}</span>
        </div>
        {midia.dias_semana && (
          <div className="text-xs text-slate-400 flex flex-wrap gap-2">
            {midia.data_inicio && <span>{new Date(midia.data_inicio).toLocaleDateString()} a {new Date(midia.data_fim).toLocaleDateString()}</span>}
            {midia.hora_inicio && <span>{midia.hora_inicio} às {midia.hora_fim}</span>}
            <span>Dias: {midia.dias_semana}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onToggle(midia)} className={`p-2 rounded-lg ${midia.ativo ? 'text-amber-400 hover:bg-amber-400/10' : 'text-green-400 hover:bg-green-400/10'}`} title={midia.ativo ? 'Desativar' : 'Ativar'}>
          <Power size={18} />
        </button>
        <button onClick={() => onDelete(midia.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10" title="Excluir">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

export default function CampanhaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campanha, setCampanha] = useState(null);
  const [midias, setMidias] = useState([]);
  const [tvsVinculadas, setTvsVinculadas] = useState([]);
  
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [todasTvs, setTodasTvs] = useState([]);
  const [selectedTvs, setSelectedTvs] = useState([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null,
    duracao: 15,
    regiao: 1,
    data_inicio: '',
    data_fim: '',
    hora_inicio: '',
    hora_fim: '',
    dias_semana: []
  });

  const diasSemanaOptions = [
    { value: '0', label: 'Dom' }, { value: '1', label: 'Seg' }, { value: '2', label: 'Ter' },
    { value: '3', label: 'Qua' }, { value: '4', label: 'Qui' }, { value: '5', label: 'Sex' }, { value: '6', label: 'Sáb' }
  ];

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  useEffect(() => {
    fetchCampanhaDetails();
    fetchMidias();
    fetchTvsVinculadas();
  }, [id]);

  const fetchCampanhaDetails = async () => {
    try {
      const res = await api.get(`/campanha/${id}`);
      setCampanha(res.data);
    } catch (error) {
      toast.error('Erro ao carregar campanha');
    }
  };
  
  const fetchTvsVinculadas = async () => {
      try {
          const res = await api.get(`/campanha/${id}/tvs`);
          setTvsVinculadas(res.data);
      } catch (error) {
          console.error(error);
      }
  };

  const fetchMidias = async () => {
    try {
      const res = await api.get(`/midia/campanha/${id}`);
      setMidias(res.data);
    } catch (error) {
      toast.error('Erro ao carregar mídias');
    }
  };

  const fetchTodasTvs = async () => {
    try {
      const res = await api.get('/tv');
      setTodasTvs(res.data);
    } catch (error) {
      toast.error('Erro ao carregar TVs');
    }
  };

  const handleOpenTvModal = () => {
    fetchTodasTvs();
    setSelectedTvs(tvsVinculadas.map(tv => tv.id));
    setIsTvModalOpen(true);
  };

  const handleVincularTvs = async () => {
    try {
      await api.post(`/campanha/${id}/tvs`, { tv_ids: selectedTvs });
      toast.success('TVs vinculadas com sucesso');
      setIsTvModalOpen(false);
      fetchTvsVinculadas();
    } catch (error) {
      toast.error('Erro ao vincular TVs');
    }
  };

  const handleDesvincularTv = async (tvId) => {
    try {
      await api.delete(`/campanha/${id}/tvs/${tvId}`);
      toast.success('TV desvinculada');
      fetchTvsVinculadas();
    } catch (error) {
      toast.error('Erro ao desvincular TV');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file) return toast.error('Selecione um arquivo');
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', uploadData.file);
      formData.append('duracao', uploadData.duracao);
      formData.append('regiao', uploadData.regiao);
      if (uploadData.data_inicio) formData.append('data_inicio', uploadData.data_inicio);
      if (uploadData.data_fim) formData.append('data_fim', uploadData.data_fim);
      if (uploadData.hora_inicio) formData.append('hora_inicio', uploadData.hora_inicio);
      if (uploadData.hora_fim) formData.append('hora_fim', uploadData.hora_fim);
      if (uploadData.dias_semana.length) formData.append('dias_semana', uploadData.dias_semana.join(','));

      await api.post(`/midia/campanha/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Mídia enviada com sucesso');
      setUploadData({...uploadData, file: null});
      document.getElementById('file-upload').value = '';
      fetchMidias();
    } catch (error) {
      toast.error('Erro no upload');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleDiaSemana = (value) => {
    const newDias = uploadData.dias_semana.includes(value)
      ? uploadData.dias_semana.filter(d => d !== value)
      : [...uploadData.dias_semana, value];
    setUploadData({ ...uploadData, dias_semana: newDias });
  };

  const handleToggleMidia = async (midia) => {
    try {
      await api.put(`/midia/${midia.id}`, { ativo: !midia.ativo });
      fetchMidias();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleDeleteMidia = async (midiaId) => {
    if (!window.confirm('Excluir mídia?')) return;
    try {
      await api.delete(`/midia/${midiaId}`);
      toast.success('Mídia excluída');
      fetchMidias();
    } catch (error) {
      toast.error('Erro ao excluir mídia');
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = midias.findIndex(m => m.id === active.id);
      const newIndex = midias.findIndex(m => m.id === over.id);
      const reordered = arrayMove(midias, oldIndex, newIndex);
      setMidias(reordered);
      
      try {
        await api.put('/midia/ordenar', { ids: reordered.map(m => m.id) });
      } catch (error) {
        toast.error('Erro ao salvar ordem');
        fetchMidias();
      }
    }
  };

  if (!campanha) return <div className="p-6 text-slate-400">Carregando...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">{campanha.nome}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${campanha.ativo ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
              {campanha.ativo ? 'Ativa' : 'Inativa'}
            </span>
          </div>
          <p className="text-slate-400">{campanha.descricao}</p>
        </div>
      </div>

      {/* TVs Vinculadas */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-100">TVs Vinculadas</h2>
          <button onClick={handleOpenTvModal} className="flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={16} /> Vincular TVs
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tvsVinculadas.length === 0 ? (
            <span className="text-sm text-slate-500">Nenhuma TV vinculada</span>
          ) : (
            tvsVinculadas.map(tv => (
              <span key={tv.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm font-medium bg-blue-900/30 text-blue-400 border border-blue-800/50">
                {tv.nome}
                <button onClick={() => handleDesvincularTv(tv.id)} className="p-0.5 hover:bg-blue-800/50 rounded-full transition-colors">
                  <X size={14} />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Upload Mídia */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Adicionar Mídia</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Arquivo</label>
              <input type="file" id="file-upload" required onChange={e => setUploadData({...uploadData, file: e.target.files[0]})} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 bg-slate-900 border border-slate-700 rounded-lg" accept="image/*,video/*" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Duração (s)</label>
                <input type="number" required min="1" value={uploadData.duracao} onChange={e => setUploadData({...uploadData, duracao: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Região (1-3)</label>
                <input type="number" required min="1" max="3" value={uploadData.regiao} onChange={e => setUploadData({...uploadData, regiao: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Agendamento (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data Início</label>
                  <input type="date" value={uploadData.data_inicio} onChange={e => setUploadData({...uploadData, data_inicio: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data Fim</label>
                  <input type="date" value={uploadData.data_fim} onChange={e => setUploadData({...uploadData, data_fim: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Hora Início</label>
                  <input type="time" value={uploadData.hora_inicio} onChange={e => setUploadData({...uploadData, hora_inicio: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Hora Fim</label>
                  <input type="time" value={uploadData.hora_fim} onChange={e => setUploadData({...uploadData, hora_fim: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-2">Dias da Semana</label>
              <div className="flex flex-wrap gap-2">
                {diasSemanaOptions.map(dia => (
                  <button key={dia.value} type="button" onClick={() => toggleDiaSemana(dia.value)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${uploadData.dias_semana.includes(dia.value) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {dia.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button type="submit" disabled={isUploading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors">
              <Upload size={18} />
              {isUploading ? 'Enviando...' : 'Fazer Upload'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Mídias */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">Mídias da Campanha</h2>
        {midias.length === 0 ? (
          <p className="text-slate-400 bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">Nenhuma mídia cadastrada</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={midias.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {midias.map(midia => (
                  <SortableMediaItem key={midia.id} midia={midia} onToggle={handleToggleMidia} onDelete={handleDeleteMidia} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modal TVs */}
      {isTvModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Vincular TVs</h2>
            <div className="overflow-y-auto flex-grow space-y-2 mb-4">
              {todasTvs.map(tv => (
                <label key={tv.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={selectedTvs.includes(tv.id)} onChange={e => {
                    if (e.target.checked) setSelectedTvs([...selectedTvs, tv.id]);
                    else setSelectedTvs(selectedTvs.filter(id => id !== tv.id));
                  }} className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-900" />
                  <div>
                    <div className="font-medium text-slate-100">{tv.nome}</div>
                    <div className="text-xs text-slate-400">{tv.identificador}</div>
                  </div>
                </label>
              ))}
              {todasTvs.length === 0 && <p className="text-slate-400 text-center py-4">Nenhuma TV disponível</p>}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 shrink-0">
              <button onClick={() => setIsTvModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-slate-100">Cancelar</button>
              <button onClick={handleVincularTvs} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
