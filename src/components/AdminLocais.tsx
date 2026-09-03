import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Input, Textarea, Button, Modal, Badge } from '../design';
import { useAuth } from '../contexts/AuthContext';
import {
  Save,
  Plus,
  Trash2,
  Edit2,
  ShieldAlert,
  Download,
  Upload,
  Monitor,
  Users,
  Building2,
  Network,
  AlertTriangle,
  Search,
  PieChart,
  Undo2,
  Clock,
  UserCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

interface LocalAdmin {
  id?: string;
  estacao?: string;
  usuario: string;
  prefixo?: string;
  endereco_logico: string;
  setor?: string;
  departamento?: string;
  justificativa: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

/**
 * Função utilitária para contar a quantidade de administradores
 * separando por: |, ;, \, /, vírgulas ou múltiplos espaços/quebras de linha.
 */
function parseAdminUsers(userString: string | null | undefined): string[] {
  if (!userString) return [];
  return userString
    .split(/[\n|;\\\/,]+|\s{2,}/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0);
}

export function AdminLocais() {
  const { user } = useAuth();
  const [locais, setLocais] = useState<LocalAdmin[]>([]);
  const [lastState, setLastState] = useState<LocalAdmin[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<LocalAdmin>({
    usuario: '',
    prefixo: 'MD',
    endereco_logico: '',
    setor: '',
    departamento: '',
    justificativa: ''
  });

  const fetchLocais = async () => {
    try {
      setLoading(true);
      let allData: LocalAdmin[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('administradores_locais')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + step - 1);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      setLocais(allData);
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocais();
  }, []);

  const saveHistoryForUndo = () => {
    setLastState([...locais]);
  };

  const handleUndo = async () => {
    if (!lastState) return;
    try {
      setLoading(true);
      setLocais(lastState);
      setLastState(null);
      await fetchLocais();
    } catch (err: any) {
      alert('Erro ao desfazer alteração: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const adminCountByHost = useMemo(() => {
    const map: Record<string, number> = {};

    locais.forEach((item) => {
      const host = (item.endereco_logico || item.estacao || '').toUpperCase().trim();
      const countInRow = parseAdminUsers(item.usuario).length;

      if (host) {
        map[host] = (map[host] || 0) + (countInRow > 0 ? countInRow : 1);
      }
    });

    return map;
  }, [locais]);

  const stats = useMemo(() => {
    const totalEquipamentos = Object.keys(adminCountByHost).length;
    
    const totalUsuariosAdmin = locais.reduce((acc, item) => {
      const parsed = parseAdminUsers(item.usuario);
      return acc + (parsed.length > 0 ? parsed.length : 1);
    }, 0);

    const setores = new Set(locais.map((i) => i.setor).filter(Boolean));
    const departamentos = new Set(locais.map((i) => i.departamento).filter(Boolean));

    return {
      totalEquipamentos,
      totalUsuariosAdmin,
      totalSetores: setores.size,
      totalDepartamentos: departamentos.size
    };
  }, [locais, adminCountByHost]);

  const topSetoresData = useMemo(() => {
    const map: Record<string, number> = {};
    locais.forEach((item) => {
      const key = item.setor || 'Não Informado';
      const count = parseAdminUsers(item.usuario).length || 1;
      map[key] = (map[key] || 0) + count;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [locais]);

  const topDepartamentosData = useMemo(() => {
    const map: Record<string, number> = {};
    locais.forEach((item) => {
      const key = item.departamento || 'Não Informado';
      const count = parseAdminUsers(item.usuario).length || 1;
      map[key] = (map[key] || 0) + count;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [locais]);

  const filteredLocais = useMemo(() => {
    if (!searchTerm) return locais;
    const term = searchTerm.toLowerCase();
    return locais.filter(
      (item) =>
        item.usuario?.toLowerCase().includes(term) ||
        item.setor?.toLowerCase().includes(term) ||
        item.departamento?.toLowerCase().includes(term) ||
        item.justificativa?.toLowerCase().includes(term) ||
        item.endereco_logico?.toLowerCase().includes(term) ||
        item.updated_by?.toLowerCase().includes(term)
    );
  }, [locais, searchTerm]);

  const handleSetField = (field: keyof LocalAdmin, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenModal = (item?: LocalAdmin) => {
    if (item) {
      setForm(item);
    } else {
      setForm({
        usuario: '',
        prefixo: 'MD',
        endereco_logico: '',
        setor: '',
        departamento: '',
        justificativa: ''
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    saveHistoryForUndo();

    const currentUserEmail = user?.email || 'Sistema / Manual';
    const nowISO = new Date().toISOString();

    try {
      const payload = {
        usuario: form.usuario,
        prefixo: form.prefixo,
        endereco_logico: form.endereco_logico,
        setor: form.setor,
        departamento: form.departamento,
        justificativa: form.justificativa,
        updated_at: nowISO,
        updated_by: currentUserEmail
      };

      if (form.id) {
        const { error: updateError } = await supabase
          .from('administradores_locais')
          .update(payload)
          .eq('id', form.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('administradores_locais')
          .insert([{ ...payload, created_at: nowISO }]);

        if (insertError) throw insertError;
      }

      setIsModalOpen(false);
      fetchLocais();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o registro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este registro?')) return;

    saveHistoryForUndo();

    try {
      const { error: deleteError } = await supabase
        .from('administradores_locais')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      fetchLocais();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    if (locais.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const headers = ['Usuario', 'Prefixo', 'Endereco Logico', 'Setor', 'Departamento', 'Justificativa', 'Modificado Por', 'Ultima Modificacao'];
    const rows = locais.map((item) => [
      `"${item.usuario || ''}"`,
      `"${item.prefixo || ''}"`,
      `"${item.endereco_logico || ''}"`,
      `"${item.setor || ''}"`,
      `"${item.departamento || ''}"`,
      `"${(item.justificativa || '').replace(/"/g, '""')}"`,
      `"${item.updated_by || ''}"`,
      `"${item.updated_at || item.created_at || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `administradores_locais_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let registrosParaInserir: Partial<LocalAdmin>[] = [];
        const currentUserEmail = user?.email || 'Importação CSV';
        const nowISO = new Date().toISOString();

        if (file.name.endsWith('.json')) {
          registrosParaInserir = JSON.parse(text).map((r: any) => ({
            ...r,
            updated_by: currentUserEmail,
            updated_at: nowISO
          }));
        } else {
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          const delimiter = lines[0].includes(';') ? ';' : ',';

          registrosParaInserir = lines.slice(1).map((line) => {
            const cols = line.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
            return {
              usuario: cols[0] || '',
              prefixo: cols[1] || 'MD',
              endereco_logico: cols[2] || '',
              setor: cols[3] || '',
              departamento: cols[4] || '',
              justificativa: cols[5] || '',
              updated_by: currentUserEmail,
              updated_at: nowISO
            };
          }).filter(r => r.usuario || r.endereco_logico);
        }

        if (registrosParaInserir.length === 0) {
          alert('Nenhum registro válido foi encontrado.');
          return;
        }

        saveHistoryForUndo();
        setLoading(true);
        const { error: importError } = await supabase
          .from('administradores_locais')
          .insert(registrosParaInserir);

        if (importError) throw importError;

        alert(`${registrosParaInserir.length} registro(s) importado(s) com sucesso!`);
        fetchLocais();
      } catch (err: any) {
        alert('Erro ao importar arquivo: ' + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header Visual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#001E33] via-[#002b49] to-[#001220] border border-[#1e293b] p-6 rounded-2xl shadow-2xl">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 tracking-wide">
            <ShieldAlert className="w-8 h-8 text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
            Administradores Locais
          </h1>
          <p className="text-sm text-[#94a3b8] mt-1 font-medium">
            Painel Executivo de Auditoria & Governança de Elevadas Permissões
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {lastState && (
            <Button onClick={handleUndo} variant="secondary" className="border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">
              <Undo2 className="w-4 h-4" />
              Desfazer Alteração
            </Button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".csv,.json"
            className="hidden"
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="border-[#1e293b] hover:bg-[#002b49]">
            <Upload className="w-4 h-4 text-[#D4AF37]" />
            Importar
          </Button>

          <Button variant="secondary" onClick={handleExportCSV} className="border-[#1e293b] hover:bg-[#002b49]">
            <Download className="w-4 h-4 text-[#D4AF37]" />
            Exportar CSV
          </Button>

          <Button onClick={() => handleOpenModal()} className="bg-gradient-to-r from-[#D4AF37] to-[#b89528] text-[#001220] font-bold shadow-lg shadow-[#D4AF37]/20">
            <Plus className="w-4 h-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Equipamentos"
          value={stats.totalEquipamentos}
          icon={Monitor}
          gradient="from-[#0f2027] via-[#203a43] to-[#2c5364]"
          borderColor="border-cyan-500/30"
          accentColor="text-cyan-400"
        />
        <KpiCard
          title="Total Admins Locais"
          value={stats.totalUsuariosAdmin}
          icon={Users}
          gradient="from-[#141e30] to-[#243b55]"
          borderColor="border-amber-500/30"
          accentColor="text-[#D4AF37]"
        />
        <KpiCard
          title="Setores Mapeados"
          value={stats.totalSetores}
          icon={Network}
          gradient="from-[#130cb7] to-[#52e5e7]"
          borderColor="border-indigo-500/30"
          accentColor="text-indigo-400"
        />
        <KpiCard
          title="Departamentos"
          value={stats.totalDepartamentos}
          icon={Building2}
          gradient="from-[#1f1c2c] to-[#928dab]"
          borderColor="border-purple-500/30"
          accentColor="text-purple-400"
        />
      </div>

      {/* Gráficos Degradê */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-b from-[#001E33] to-[#001424] border border-[#1e293b] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 border-b border-[#1e293b]/60 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#D4AF37]" />
              Top 10 Setores com Admins Locais
            </h3>
            <span className="text-xs text-[#64748b] bg-[#001220] px-3 py-1 rounded-full border border-[#1e293b]">
              Auditoria
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSetoresData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                <defs>
                  <linearGradient id="setorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={1} />
                    <stop offset="100%" stopColor="#856404" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#001220', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="total" fill="url(#setorGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#001E33] to-[#001424] border border-[#1e293b] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 border-b border-[#1e293b]/60 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Top 10 Departamentos
            </h3>
            <span className="text-xs text-[#64748b] bg-[#001220] px-3 py-1 rounded-full border border-[#1e293b]">
              Distribuição
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDepartamentosData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                <defs>
                  <linearGradient id="deptGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                    <stop offset="100%" stopColor="#083344" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#001220', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="total" fill="url(#deptGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela Auditada */}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#001726]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              placeholder="Buscar por usuário, IP, setor, responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#001220] border border-[#1e293b] rounded-xl text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
            <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Alerta ativo em equipamentos com ≥ 3 Admins
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#94a3b8]">
            <thead className="bg-[#0a1220] text-[#64748b] uppercase text-[11px] font-bold tracking-wider border-b border-[#1e293b]">
              <tr>
                <th className="px-6 py-4">Endereço Lógico / Host</th>
                <th className="px-6 py-4">Usuário(s) Administrador(es)</th>
                <th className="px-6 py-4">Prefixo</th>
                <th className="px-6 py-4 text-center">Qtd. Admins</th>
                <th className="px-6 py-4">Setor / Depto</th>
                <th className="px-6 py-4">Justificativa / Autorização</th>
                <th className="px-6 py-4">Última Modificação / Por</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#64748b]">
                    Carregando base de dados do servidor...
                  </td>
                </tr>
              ) : filteredLocais.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#64748b]">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredLocais.map((item) => {
                  const hostKey = (item.endereco_logico || item.estacao || '').toUpperCase().trim();
                  
                  const adminsDaLinha = parseAdminUsers(item.usuario);
                  const qtdAdminsLinha = adminsDaLinha.length || 1;

                  const totalAdminsNoHost = adminCountByHost[hostKey] || qtdAdminsLinha;
                  const temAlerta = totalAdminsNoHost >= 3 || qtdAdminsLinha >= 3;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Endereço Lógico / Host */}
                      <td className="px-6 py-4 font-mono text-xs text-cyan-400 font-bold flex items-center gap-2">
                        <span>{item.endereco_logico || item.estacao || '-'}</span>
                        {temAlerta && (
                          <span
                            title={`Atenção: Este equipamento acumula ${totalAdminsNoHost} administradores!`}
                            className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse cursor-help"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {totalAdminsNoHost} Admins
                          </span>
                        )}
                      </td>

                      {/* Usuário(s) */}
                      <td className="px-6 py-4 text-white font-medium max-w-xs break-words">
                        <div className="flex flex-wrap gap-1">
                          {adminsDaLinha.length > 0 ? (
                            adminsDaLinha.map((usr, idx) => (
                              <span key={idx} className="bg-[#001220] border border-[#1e293b] text-slate-200 px-2 py-0.5 rounded text-xs">
                                {usr}
                              </span>
                            ))
                          ) : (
                            <span>{item.usuario || '-'}</span>
                          )}
                        </div>
                      </td>

                      {/* Prefixo */}
                      <td className="px-6 py-4">
                        <Badge type="warning">{item.prefixo || 'MD'}</Badge>
                      </td>

                      {/* Qtd. Admins */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block font-bold px-3 py-1 rounded-lg text-xs ${
                            temAlerta
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-[#001220] text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {qtdAdminsLinha}
                        </span>
                      </td>

                      {/* Setor / Depto */}
                      <td className="px-6 py-4 text-xs">
                        <div className="text-white font-medium">{item.setor || '-'}</div>
                        <div className="text-[#64748b]">{item.departamento || '-'}</div>
                      </td>

                      {/* Justificativa */}
                      <td className="px-6 py-4 max-w-xs truncate text-xs text-[#94a3b8]" title={item.justificativa}>
                        {item.justificativa || '-'}
                      </td>

                      {/* Auditoria: Quem e Quando */}
                      <td className="px-6 py-4 text-xs">
                        <div className="text-slate-300 font-medium flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {item.updated_by || 'Sistema'}
                        </div>
                        <div className="text-[#64748b] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(item.updated_at || item.created_at)}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="text-[#94a3b8] hover:text-[#D4AF37] transition-colors p-1.5 hover:bg-[#001220] rounded-lg"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => item.id && handleDelete(item.id)}
                          className="text-[#94a3b8] hover:text-red-400 transition-colors p-1.5 hover:bg-[#001220] rounded-lg"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? 'Editar Administrador Local' : 'Cadastrar Administrador Local'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Endereço Lógico / Host *"
              placeholder="Ex: NH0191 ou IP"
              value={form.endereco_logico}
              onChange={(e) => handleSetField('endereco_logico', e.target.value)}
              required
            />
            <Input
              label="Prefixo"
              placeholder="Ex: MD ou MP"
              value={form.prefixo}
              onChange={(e) => handleSetField('prefixo', e.target.value)}
            />
          </div>

          <Textarea
            label="Usuários Responsáveis (Separe com vírgula, barra ou ponto e vírgula) *"
            placeholder="Ex: usuario1, usuario2; usuario3"
            value={form.usuario}
            onChange={(e) => handleSetField('usuario', e.target.value)}
            rows={2}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Setor"
              placeholder="Ex: COATEN"
              value={form.setor}
              onChange={(e) => handleSetField('setor', e.target.value)}
            />
            <Input
              label="Departamento"
              placeholder="Ex: PRODASEN"
              value={form.departamento}
              onChange={(e) => handleSetField('departamento', e.target.value)}
            />
          </div>

          <Textarea
            label="Justificativa / Autorização *"
            placeholder="Informe a justificativa ou número do ofício autorizativo..."
            value={form.justificativa}
            onChange={(e) => handleSetField('justificativa', e.target.value)}
            rows={3}
            required
          />

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-[#D4AF37] text-[#001220] font-bold hover:bg-[#c19b2e]">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Registro'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  gradient,
  borderColor,
  accentColor
}: {
  title: string;
  value: number;
  icon: any;
  gradient: string;
  borderColor: string;
  accentColor: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border ${borderColor} rounded-2xl p-5 shadow-xl flex items-center justify-between`}>
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-300 font-semibold">{title}</p>
        <p className="text-3xl font-black text-white mt-1">{value}</p>
      </div>
      <div className={`p-3 bg-black/20 rounded-xl backdrop-blur-sm ${accentColor}`}>
        <Icon className="w-7 h-7" />
      </div>
    </div>
  );
}
