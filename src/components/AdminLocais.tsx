import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldAlert, Plus, Trash2, Search, RotateCcw, 
  Monitor, Users, Building2, Layers, History, X, Check, Edit3
} from 'lucide-react';
import type { AuthUser, SystemRole } from '@/types';

interface AdminLocaisProps {
  user: AuthUser | null;
  role: SystemRole;
}

interface AdminLocalRow {
  id: string;
  hostname: string;
  endereco_logico?: string;
  administradores?: string;
  qntd_admin?: number;
  setor?: string;
  departamento?: string;
  justificativa_chamado?: string;
  modificado_por?: string;
  updated_at?: string;
  created_at?: string;
}

interface AuditLog {
  id: string;
  registro_id: string;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  dados_antigos: AdminLocalRow | null;
  dados_novos: AdminLocalRow | null;
  modificado_por: string;
  criado_em: string;
}

export function AdminLocais({ user, role }: AdminLocaisProps) {
  const [items, setItems] = useState<AdminLocalRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [selectedDepto, setSelectedDepto] = useState<string>('todos');

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminLocalRow | null>(null);

  // Form State
  const [hostname, setHostname] = useState('');
  const [enderecoLogico, setEnderecoLogico] = useState('');
  const [administradores, setAdministradores] = useState('');
  const [qntdAdmin, setQntdAdmin] = useState(1);
  const [setor, setSetor] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [justificativa, setJustificativa] = useState('');

  const [saving, setSaving] = useState(false);
  const canEdit = ['super_admin', 'admin', 'editor'].includes(role);

  // Buscar Dados
  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('administradores_locais')
        .select('*')
        .order('hostname');

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Erro ao carregar administradores locais:', err);
    } finally {
      setLoading(false);
    }
  }

  // Buscar logs de auditoria para o Undo
  async function fetchAuditLogs() {
    try {
      const { data } = await supabase
        .from('administradores_locais_auditoria')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(10);

      setAuditLogs(data || []);
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Inserir log de auditoria
  async function recordAuditLog(
    registroId: string, 
    acao: 'INSERT' | 'UPDATE' | 'DELETE', 
    antigos: AdminLocalRow | null, 
    novos: AdminLocalRow | null
  ) {
    const userEmail = user?.email || 'Sistema';
    await supabase.from('administradores_locais_auditoria').insert([{
      registro_id: registroId,
      acao,
      dados_antigos: antigos,
      dados_novos: novos,
      modificado_por: `${userEmail} em ${new Date().toLocaleString('pt-BR')}`
    }]);
  }

  // Abertura do Form
  function handleOpenForm(item?: AdminLocalRow) {
    if (item) {
      setEditingItem(item);
      setHostname(item.hostname);
      setEnderecoLogico(item.endereco_logico || '');
      setAdministradores(item.administradores || '');
      setQntdAdmin(item.qntd_admin || 1);
      setSetor(item.setor || '');
      setDepartamento(item.departamento || '');
      setJustificativa(item.justificativa_chamado || '');
    } else {
      setEditingItem(null);
      setHostname('');
      setEnderecoLogico('');
      setAdministradores('');
      setQntdAdmin(1);
      setSetor('');
      setDepartamento('');
      setJustificativa('');
    }
    setShowFormModal(true);
  }

  // Salvar / Editar
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const userSignature = `${user?.email || 'Desconhecido'} - ${new Date().toLocaleString('pt-BR')}`;

    const payload = {
      hostname: hostname.toUpperCase().trim(),
      endereco_logico: enderecoLogico.trim(),
      administradores: administradores.trim(),
      qntd_admin: Number(qntdAdmin),
      setor: setor.trim(),
      departamento: departamento.trim(),
      justificativa_chamado: justificativa.trim(),
      modificado_por: userSignature,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingItem) {
        // Update
        const { error } = await supabase
          .from('administradores_locais')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
        await recordAuditLog(editingItem.id, 'UPDATE', editingItem, { id: editingItem.id, ...payload });
      } else {
        // Insert
        const { data, error } = await supabase
          .from('administradores_locais')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (data) await recordAuditLog(data.id, 'INSERT', null, data);
      }

      setShowFormModal(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar registro');
    } finally {
      setSaving(false);
    }
  }

  // Deletar
  async function handleDelete(item: AdminLocalRow) {
    if (!window.confirm(`Confirma a exclusão de ${item.hostname}?`)) return;

    try {
      const { error } = await supabase
        .from('administradores_locais')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      await recordAuditLog(item.id, 'DELETE', item, null);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir registro');
    }
  }

  // Função Desfazer (Undo)
  async function handleUndo(log: AuditLog) {
    if (!window.confirm(`Deseja desfazer a ação (${log.acao}) realizada por ${log.modificado_por}?`)) return;

    try {
      if (log.acao === 'INSERT' && log.registro_id) {
        // Desfazer inserção = Deletar
        await supabase.from('administradores_locais').delete().eq('id', log.registro_id);
      } else if (log.acao === 'DELETE' && log.dados_antigos) {
        // Desfazer exclusão = Inserir de volta
        await supabase.from('administradores_locais').insert([log.dados_antigos]);
      } else if (log.acao === 'UPDATE' && log.dados_antigos) {
        // Desfazer edição = Restaurar dados antigos
        await supabase.from('administradores_locais').update(log.dados_antigos).eq('id', log.registro_id);
      }

      // Remover o log aplicado
      await supabase.from('administradores_locais_auditoria').delete().eq('id', log.id);

      setShowUndoModal(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao reverter ação');
    }
  }

  // Opções de Filtro Únicas
  const listaSetores = useMemo(() => Array.from(new Set(items.map((i) => i.setor).filter(Boolean))), [items]);
  const listaDeptos = useMemo(() => Array.from(new Set(items.map((i) => i.departamento).filter(Boolean))), [items]);

  // Itens Filtrados
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        item.hostname?.toLowerCase().includes(search.toLowerCase()) ||
        item.endereco_logico?.toLowerCase().includes(search.toLowerCase()) ||
        item.administradores?.toLowerCase().includes(search.toLowerCase()) ||
        item.setor?.toLowerCase().includes(search.toLowerCase()) ||
        item.departamento?.toLowerCase().includes(search.toLowerCase());

      const matchesSetor = selectedSetor === 'todos' || item.setor === selectedSetor;
      const matchesDepto = selectedDepto === 'todos' || item.departamento === selectedDepto;

      return matchesSearch && matchesSetor && matchesDepto;
    });
  }, [items, search, selectedSetor, selectedDepto]);

  // Cálculos Dinâmicos dos KPIs
  const totalMaquinas = useMemo(() => {
    const IPsUnicos = new Set(filteredItems.map((i) => i.endereco_logico).filter(Boolean));
    return IPsUnicos.size || filteredItems.length;
  }, [filteredItems]);

  const totalAdminsLocais = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + (curr.qntd_admin || 1), 0);
  }, [filteredItems]);

  // Ranking Top 10 por Setor
  const top10Setor = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach((i) => {
      const key = i.setor || 'Não Definido';
      map.set(key, (map.get(key) || 0) + (i.qntd_admin || 1));
    });
    return Array.from(map.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredItems]);

  // Ranking Top 10 por Departamento
  const top10Depto = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach((i) => {
      const key = i.departamento || 'Não Definido';
      map.set(key, (map.get(key) || 0) + (i.qntd_admin || 1));
    });
    return Array.from(map.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredItems]);

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-[#D4AF37]" />
            Administradores Locais
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Gestão de privilégios elevados, log de alterações e auditoria de estações.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => {
                fetchAuditLogs();
                setShowUndoModal(true);
              }}
              className="flex items-center gap-2 bg-[#001726] hover:bg-[#00223a] text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg hover:border-amber-400"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              Desfazer Alteração
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => handleOpenForm()}
              className="flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:brightness-110 text-[#001726] font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/10"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Novo Admin Local
            </button>
          )}
        </div>
      </div>

      {/* DASHBOARD ULTRA REALISTA (GRADIENT CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#001E33] via-[#001726] to-[#000d16] border border-[#1e293b] p-5 rounded-2xl shadow-xl">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Máquinas</span>
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Monitor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white tracking-tight">{totalMaquinas}</span>
            <span className="text-[11px] text-slate-400 block mt-1 font-mono">Endereços lógicos únicos</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#001E33] via-[#001726] to-[#000d16] border border-[#1e293b] p-5 rounded-2xl shadow-xl">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admins Locais</span>
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-[#D4AF37] tracking-tight">{totalAdminsLocais}</span>
            <span className="text-[11px] text-slate-400 block mt-1 font-mono">Contas com admin local</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#001E33] via-[#001726] to-[#000d16] border border-[#1e293b] p-5 rounded-2xl shadow-xl">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Setores Mapeados</span>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white tracking-tight">{listaSetores.length}</span>
            <span className="text-[11px] text-slate-400 block mt-1">Setores com concessão</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#001E33] via-[#001726] to-[#000d16] border border-[#1e293b] p-5 rounded-2xl shadow-xl">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Departamentos</span>
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white tracking-tight">{listaDeptos.length}</span>
            <span className="text-[11px] text-slate-400 block mt-1">Departamentos ativos</span>
          </div>
        </div>
      </div>

      {/* PAINEL RANKING TOP 10 (SETOR E DEPARTAMENTO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Setor */}
        <div className="bg-[#001E33]/80 border border-[#1e293b] p-5 rounded-2xl shadow-xl backdrop-blur-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Top 10 Setores com Mais Admins Locais
          </h3>
          <div className="space-y-2.5">
            {top10Setor.map((item, idx) => {
              const maxVal = top10Setor[0]?.total || 1;
              const percent = Math.round((item.total / maxVal) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-200 truncate max-w-[250px]">{idx + 1}. {item.nome}</span>
                    <span className="text-amber-400 font-bold font-mono">{item.total} admin(s)</span>
                  </div>
                  <div className="w-full bg-[#00111d] h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 10 Departamento */}
        <div className="bg-[#001E33]/80 border border-[#1e293b] p-5 rounded-2xl shadow-xl backdrop-blur-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Top 10 Departamentos
          </h3>
          <div className="space-y-2.5">
            {top10Depto.map((item, idx) => {
              const maxVal = top10Depto[0]?.total || 1;
              const percent = Math.round((item.total / maxVal) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-200 truncate max-w-[250px]">{idx + 1}. {item.nome}</span>
                    <span className="text-cyan-400 font-bold font-mono">{item.total} admin(s)</span>
                  </div>
                  <div className="w-full bg-[#00111d] h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA DINÂMICA */}
      <div className="bg-[#001E33] p-4 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-center gap-3 shadow-md">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por Hostname, IP/Lógico, Admins, Setor ou Chamado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#001726] border border-[#1e293b] text-white pl-9 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <select
          value={selectedSetor}
          onChange={(e) => setSelectedSetor(e.target.value)}
          className="w-full md:w-48 bg-[#001726] border border-[#1e293b] text-white px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#D4AF37]"
        >
          <option value="todos">Todos os Setores</option>
          {listaSetores.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={selectedDepto}
          onChange={(e) => setSelectedDepto(e.target.value)}
          className="w-full md:w-48 bg-[#001726] border border-[#1e293b] text-white px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#D4AF37]"
        >
          <option value="todos">Todos os Departamentos</option>
          {listaDeptos.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* TABELA DE REGISTROS */}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#001726] border-b border-[#1e293b]">
              <tr>
                <th className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3.5">Hostname</th>
                <th className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3.5">Endereço Lógico</th>
                <th className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3.5">Admins Locais</th>
                <th className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3.5">Setor / Departamento</th>
                <th className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3.5">Chamado / Motivo</th>
                <th className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3.5">Modificado Por</th>
                {canEdit && <th className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3.5 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-10 text-xs">
                    Carregando registros de administradores locais...
                  </td>
                </tr>
              )}

              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-10 text-xs">
                    Nenhum registro encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#001726]/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-white text-xs">
                      {item.hostname}
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-400 text-xs">
                      {item.endereco_logico || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-amber-300">{item.administradores || '-'}</div>
                      <div className="text-[10px] text-slate-500">Qtd: {item.qntd_admin || 1}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <div>{item.setor || '-'}</div>
                      <div className="text-[10px] text-slate-500">{item.departamento || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {item.justificativa_chamado || '-'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">
                      {item.modificado_por || '-'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenForm(item)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                          title="Editar Registro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CADASTRAR / EDITAR */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#D4AF37]" />
                {editingItem ? 'Editar Admin Local' : 'Cadastrar Admin Local'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs font-semibold block mb-1">Hostname *</label>
                <input
                  type="text"
                  required
                  placeholder="EX: STF-PC-0123"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold block mb-1">Endereço Lógico (IP/MAC)</label>
                <input
                  type="text"
                  placeholder="EX: 10.20.30.40"
                  value={enderecoLogico}
                  onChange={(e) => setEnderecoLogico(e.target.value)}
                  className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-400 text-xs font-semibold block mb-1">Administradores (Contas/Usuários) *</label>
                <input
                  type="text"
                  required
                  placeholder="EX: .\adminlocal, dominio\usuario1"
                  value={administradores}
                  onChange={(e) => setAdministradores(e.target.value)}
                  className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold block mb-1">Qtd. Admins Locais</label>
                <input
                  type="number"
                  min="1"
                  value={qntdAdmin}
                  onChange={(e) => setQntdAdmin(Number(e.target.value))}
                  className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold block mb-1">Setor</label>
                <input
                  type="text"
                  placeholder="EX: COATEN"
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold block mb-1">Departamento</label>
                <input
                  type="text"
                  placeholder="EX: STI / Secretaria de TI"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold block mb-1">Nº Chamado / Motivo</label>
                <input
                  type="text"
                  placeholder="EX: INC-102030"
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-[#1e293b] mt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-md"
                >
                  {saving ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL POP-UP DESFAZER (UNDO LAST 10 ACTIONS) */}
      {showUndoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                Desfazer Últimas Alterações (Log de Auditoria)
              </h3>
              <button onClick={() => setShowUndoModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Selecione qual alteração você deseja reverter. Esta ação irá restaurar os dados originais no banco.
            </p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {auditLogs.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-6">Nenhum histórico recente disponível para ser desfeito.</p>
              )}

              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#001726] p-3.5 rounded-xl border border-[#1e293b] flex items-center justify-between gap-3 hover:border-amber-500/40 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        log.acao === 'INSERT' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : log.acao === 'DELETE'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {log.acao}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {log.dados_novos?.hostname || log.dados_antigos?.hostname || 'Registro'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      <span className="text-slate-500">Alterado por:</span> {log.modificado_por}
                    </div>
                  </div>

                  <button
                    onClick={() => handleUndo(log)}
                    className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Desfazer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
