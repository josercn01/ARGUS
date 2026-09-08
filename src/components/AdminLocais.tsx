import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Building2, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  History,
  FileText,
  Filter,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LocalItem {
  id: string;
  nome: string;
  tipo: string;
  bloco?: string;
  andar?: string;
  sala?: string;
  descricao?: string;
  status: 'ativo' | 'inativo' | 'manutencao';
  responsavel?: string;
  created_at?: string;
}

interface AuditLogItem {
  id: string;
  acao: string;
  detalhes: string;
  usuario: string;
  timestamp: string;
  previous_state?: any;
}

export const AdminLocais: React.FC = () => {
  const [locais, setLocais] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLocal, setEditingLocal] = useState<LocalItem | null>(null);
  const [formData, setFormData] = useState<Partial<LocalItem>>({
    nome: '',
    tipo: 'Sala',
    bloco: '',
    andar: '',
    sala: '',
    descricao: '',
    status: 'ativo',
    responsavel: ''
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchLocais();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchLocais = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locais')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setLocais(data || []);
    } catch (error) {
      console.error('Erro ao buscar locais:', error);
    } finally {
      setLoading(false);
    }
  };

  const logAction = async (acao: string, detalhes: string, previousState?: any) => {
    const userName = user?.name || user?.email || 'Usuário Sistema';
    const newLog: AuditLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      acao,
      detalhes,
      usuario: userName,
      timestamp: new Date().toISOString(),
      previous_state: previousState
    };

    const updatedLogs = [newLog, ...auditLogs].slice(0, 10);
    setAuditLogs(updatedLogs);

    try {
      await supabase.from('audit_logs_admin').insert([newLog]);
    } catch (e) {
      // Falha silenciosa caso tabela de log não esteja criada no banco do usuário
    }
  };

  const handleOpenModal = (local?: LocalItem) => {
    if (local) {
      setEditingLocal(local);
      setFormData(local);
    } else {
      setEditingLocal(null);
      setFormData({
        nome: '',
        tipo: 'Sala',
        bloco: '',
        andar: '',
        sala: '',
        descricao: '',
        status: 'ativo',
        responsavel: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.tipo) {
      alert('Preencha os campos obrigatórios (Nome e Tipo).');
      return;
    }

    try {
      if (editingLocal) {
        // Atualizar
        const { error } = await supabase
          .from('locais')
          .update(formData)
          .eq('id', editingLocal.id);

        if (error) throw error;
        await logAction('ATUALIZAR_LOCAL', `Local atualizado: ${formData.nome}`, editingLocal);
      } else {
        // Criar
        const { error } = await supabase
          .from('locais')
          .insert([formData]);

        if (error) throw error;
        await logAction('CRIAR_LOCAL', `Novo local criado: ${formData.nome}`);
      }

      fetchLocais();
      handleCloseModal();
    } catch (error: any) {
      console.error('Erro ao salvar local:', error);
      alert('Erro ao salvar local: ' + (error.message || error));
    }
  };

  const handleDelete = async (local: LocalItem) => {
    if (!confirm(`Tem certeza que deseja excluir o local "${local.nome}"?`)) return;

    try {
      const { error } = await supabase
        .from('locais')
        .delete()
        .eq('id', local.id);

      if (error) throw error;
      await logAction('EXCLUIR_LOCAL', `Local excluído: ${local.nome}`, local);
      fetchLocais();
    } catch (error: any) {
      console.error('Erro ao excluir local:', error);
      alert('Erro ao excluir local: ' + (error.message || error));
    }
  };

  const filteredLocais = locais.filter(local => {
    const matchesSearch = local.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (local.descricao && local.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (local.responsavel && local.responsavel.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'todos' || local.status === filterStatus;
    const matchesTipo = filterTipo === 'todos' || local.tipo === filterTipo;

    return matchesSearch && matchesStatus && matchesTipo;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-blue-600" /> Gerenciamento de Locais
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre, edite e monitore os locais e infraestruturas do sistema.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLogsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <History size={16} /> Logs de Auditoria
          </button>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus size={16} /> Novo Local
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, descrição ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
            <Filter size={16} />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="todos">Todos Status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="manutencao">Em Manutenção</option>
          </select>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="todos">Todos Tipos</option>
            <option value="Sala">Sala</option>
            <option value="Auditório">Auditório</option>
            <option value="Laboratório">Laboratório</option>
            <option value="Depósito">Depósito</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
      </div>

      {/* Tabela de Locais */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Carregando locais...</div>
        ) : filteredLocais.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <MapPin size={32} className="text-slate-300" />
            <p>Nenhum local encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Nome / Local</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Localização (Bloco/Andar/Sala)</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredLocais.map((local) => (
                  <tr key={local.id} className="hover:bg-slate-50/55 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{local.nome}</div>
                      {local.descricao && (
                        <div className="text-xs text-slate-400 font-normal truncate max-w-xs">{local.descricao}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                        {local.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {[local.bloco && `Bloco: ${local.bloco}`, local.andar && `Andar: ${local.andar}`, local.sala && `Sala: ${local.sala}`].filter(Boolean).join(' | ') || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{local.responsavel || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        local.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        local.status === 'inativo' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {local.status === 'ativo' && <CheckCircle2 size={12} />}
                        {local.status === 'inativo' && <XCircle size={12} />}
                        {local.status === 'manutencao' && <AlertTriangle size={12} />}
                        {local.status.charAt(0).toUpperCase() + local.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(local)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(local)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 text-lg">
                {editingLocal ? 'Editar Local' : 'Novo Local'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nome do Local *</label>
                <input
                  type="text"
                  required
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Sala de Reuniões Principal"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Tipo *</label>
                  <select
                    value={formData.tipo || 'Sala'}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Sala">Sala</option>
                    <option value="Auditório">Auditório</option>
                    <option value="Laboratório">Laboratório</option>
                    <option value="Depósito">Depósito</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formData.status || 'ativo'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="manutencao">Em Manutenção</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Bloco</label>
                  <input
                    type="text"
                    value={formData.bloco || ''}
                    onChange={(e) => setFormData({ ...formData, bloco: e.target.value })}
                    placeholder="Ex: A"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Andar</label>
                  <input
                    type="text"
                    value={formData.andar || ''}
                    onChange={(e) => setFormData({ ...formData, andar: e.target.value })}
                    placeholder="Ex: 2º"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Sala / Num</label>
                  <input
                    type="text"
                    value={formData.sala || ''}
                    onChange={(e) => setFormData({ ...formData, sala: e.target.value })}
                    placeholder="Ex: 204"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Responsável</label>
                <input
                  type="text"
                  value={formData.responsavel || ''}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  placeholder="Nome do responsável pelo local"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Detalhes adicionais sobre o local..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  <Save size={16} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Logs de Auditoria */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                <History size={18} className="text-blue-600" /> Logs de Auditoria Recentes
              </h3>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhuma ação registrada nesta sessão ainda.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-blue-600 uppercase tracking-wider">{log.acao}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{log.detalhes}</p>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span>Usuário: <strong className="text-slate-700">{log.usuario}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
