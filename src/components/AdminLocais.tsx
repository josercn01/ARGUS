import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Database,
  Plus,
  Edit2,
  Trash2,
  X,
  BarChart3,
  User,
  Clock,
  Shield,
  Layers,
  Briefcase
} from 'lucide-react';

export interface AdminRecord {
  id?: string;
  endereco_logico: string;
  administradores: string;
  qtd_admin?: number;
  departamento?: string;
  setor?: string;
  justificativa?: string;
  alerta?: string | null;
  modificado_por?: string;
  updated_at?: string;
}

export interface AlertaItem {
  endereco_logico: string;
  administradores: string;
  status: string;
}

export const AdminLocais: React.FC = () => {
  const [data, setData] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filterAlerta, setFilterAlerta] = useState<boolean>(false);
  const [alertasRecentes, setAlertasRecentes] = useState<AlertaItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<AdminRecord>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const currentUser = 'Administrador TI (Senado)';

  useEffect(() => {
    loadData();
  }, []);

  const contarAdmins = (adminsStr: string): number => {
    if (!adminsStr) return 0;
    const lista = adminsStr.split(/[\|,]/).map((s) => s.trim()).filter(Boolean);
    return lista.length;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let allData: AdminRecord[] = [];
      let page = 0;
      const pageSize = 1000;
      let fetchMore = true;

      while (fetchMore) {
        const { data: dbData, error } = await supabase
          .from('administradores_locais')
          .select('*')
          .order('endereco_logico', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (dbData && dbData.length > 0) {
          allData = [...allData, ...dbData];
          if (dbData.length < pageSize) {
            fetchMore = false;
          } else {
            page++;
          }
        } else {
          fetchMore = false;
        }
      }

      setData(allData);
    } catch (err: any) {
      console.error(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const topSetores = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((item) => {
      const setor = item.setor || 'Não Definido';
      counts[setor] = (counts[setor] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [data]);

  const topDepartamentos = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((item) => {
      const dept = item.departamento || 'Não Definido';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [data]);

  const handleOpenNewModal = () => {
    setCurrentRecord({
      endereco_logico: '',
      administradores: '',
      departamento: '',
      setor: '',
      justificativa: ''
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: AdminRecord) => {
    setCurrentRecord(record);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord.endereco_logico || !currentRecord.administradores) {
      alert('Preencha o Endereço Lógico e os Administradores.');
      return;
    }

    const payload = {
      endereco_logico: currentRecord.endereco_logico.trim().toUpperCase(),
      administradores: currentRecord.administradores.trim(),
      qtd_admin: contarAdmins(currentRecord.administradores),
      departamento: currentRecord.departamento?.trim() || 'Geral',
      setor: currentRecord.setor?.trim() || 'Geral',
      justificativa: currentRecord.justificativa?.trim() || '',
      modificado_por: currentUser,
      updated_at: new Date().toISOString()
    };

    try {
      if (isEditing && currentRecord.id) {
        const { error } = await supabase
          .from('administradores_locais')
          .update(payload)
          .eq('id', currentRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('administradores_locais')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Erro ao salvar registro: ${err.message}`);
    }
  };

  const handleDeleteRecord = async (id: string, host: string) => {
    if (!confirm(`Deseja realmente excluir o registro da estação ${host}?`)) return;

    try {
      const { error } = await supabase.from('administradores_locais').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const importedRows: any[] = XLSX.utils.sheet_to_json(ws);

        const currentMap = new Map(
          data.map((item) => [item.endereco_logico.toString().trim().toUpperCase(), item])
        );

        const novosAlertas: AlertaItem[] = [];
        const payloadToUpsert: any[] = [];
        let added = 0;
        let updated = 0;

        importedRows.forEach((row) => {
          const host = (
            row['ENDEREÇO LÓGICO'] || row.ENDERECO_LOGICO || row.Host || row.HOSTNAME || ''
          ).toString().trim().toUpperCase();

          const admins = (
            row['ADMINISTRADORES LOCAIS'] || row.ADMINISTRADORES_LOCAIS || row.ADMINISTRADORES || row.Admins || ''
          ).toString().trim();

          if (!host) return;

          if (!currentMap.has(host)) {
            added++;
            novosAlertas.push({ endereco_logico: host, administradores: admins, status: 'Revisar permissionamento' });
            payloadToUpsert.push({
              endereco_logico: host,
              administradores: admins,
              qtd_admin: contarAdmins(admins),
              alerta: 'Revisar permissionamento',
              justificativa: '[NOVO DISPOSITIVO] Não consta na base cadastrada',
              modificado_por: currentUser,
              updated_at: new Date().toISOString()
            });
          } else {
            updated++;
            const existing = currentMap.get(host)!;
            payloadToUpsert.push({
              id: existing.id,
              endereco_logico: host,
              administradores: admins,
              qtd_admin: contarAdmins(admins),
              alerta: existing.alerta || null,
              modificado_por: currentUser,
              updated_at: new Date().toISOString()
            });
          }
        });

        setAlertasRecentes(novosAlertas);

        for (let i = 0; i < payloadToUpsert.length; i += 300) {
          const chunk = payloadToUpsert.slice(i, i + 300);
          const { error } = await supabase.from('administradores_locais').upsert(chunk);
          if (error) throw error;
        }

        alert(`Importação concluída! Atualizados: ${updated} | Novos com alerta: ${added}`);
        loadData();
      } catch (err: any) {
        alert(`Erro na importação: ${err.message}`);
      } finally {
        setImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportarBaseCompletaExcel = () => {
    if (data.length === 0) return alert('Sem dados para exportar.');
    const dataToExport = data.map((item) => ({
      'ESTAÇÃO DE TRABALHO': item.endereco_logico,
      'QTD ADMINS': item.qtd_admin || contarAdmins(item.administradores),
      'ADMINISTRADORES LOCAIS': item.administradores,
      'DEPARTAMENTO': item.departamento || '',
      'SETOR': item.setor || '',
      'ALERTAS': item.alerta || 'OK',
      'MODIFICADO POR': item.modificado_por || '',
      'ÚLTIMA ATUALIZAÇÃO': item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Base_Completa');
    XLSX.writeFile(wb, `Base_Administradores_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    return data.filter((item) => {
      const matchesSearch =
        !searchLower ||
        item.endereco_logico.toLowerCase().includes(searchLower) ||
        item.administradores.toLowerCase().includes(searchLower) ||
        (item.departamento && item.departamento.toLowerCase().includes(searchLower)) ||
        (item.setor && item.setor.toLowerCase().includes(searchLower));

      const matchesAlerta = !filterAlerta || item.alerta === 'Revisar permissionamento';
      return matchesSearch && matchesAlerta;
    });
  }, [data, search, filterAlerta]);

  const totalRegistros = data.length;
  const totalAlertas = data.filter((i) => i.alerta === 'Revisar permissionamento').length;
  const totalAdminsGeral = useMemo(() => {
    return data.reduce((acc, item) => acc + (item.qtd_admin || contarAdmins(item.administradores)), 0);
  }, [data]);
  const totalSetores = topSetores.length;
  const totalDepartamentos = topDepartamentos.length;

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1e293b] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-400" />
            Auditoria e Gestão de Administradores Locais
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Painel de controle de permissões, estações de trabalho e histórico de alterações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Cadastro
          </button>

          <label className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 cursor-pointer transition-colors shadow-sm text-sm font-medium ${importing ? 'opacity-50' : ''}`}>
            <Upload className="w-4 h-4" />
            {importing ? 'Importando...' : 'Importar Planilha'}
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={importing} className="hidden" />
          </label>

          <button
            onClick={exportarBaseCompletaExcel}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] border border-slate-700 text-slate-200 rounded-lg hover:bg-[#334155] transition-colors shadow-sm text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Exportar Base (.xlsx)
          </button>

          <button onClick={loadData} title="Recarregar" className="p-2 bg-[#0f172a] border border-[#1e293b] rounded-lg text-slate-300 hover:bg-[#1e293b]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Cards Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#0b1329] border border-[#1e293b] p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estações</p>
            <p className="text-3xl font-extrabold text-white mt-1">{totalRegistros}</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-[#1e293b]">
            <span>Total cadastradas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-[#0b1329] border border-[#1e293b] p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Administradores</p>
            <p className="text-3xl font-extrabold text-blue-400 mt-1">{totalAdminsGeral}</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-[#1e293b]">
            <span>Atribuídos nas estações</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilterAlerta(!filterAlerta)} 
          className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-lg relative overflow-hidden flex flex-col justify-between ${filterAlerta ? 'bg-[#1e1b18] border-amber-500/50 ring-2 ring-amber-500/30' : 'bg-[#0b1329] border-[#1e293b] hover:border-amber-500/40'}`}
        >
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Alertas</p>
            <p className="text-3xl font-extrabold text-amber-400 mt-1">{totalAlertas}</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-[#1e293b]">
            <span>Revisar permissão</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-[#0b1329] border border-[#1e293b] p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Setores</p>
            <p className="text-3xl font-extrabold text-white mt-1">{totalSetores}</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-[#1e293b]">
            <span>Setores mapeados</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-[#0b1329] border border-[#1e293b] p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Departamentos</p>
            <p className="text-3xl font-extrabold text-white mt-1">{totalDepartamentos}</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-[#1e293b]">
            <span>Departamentos ativos</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos com borda neon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0b1329] p-6 rounded-2xl border border-[#1e293b] shadow-xl relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.5)]">
              <BarChart3 className="w-4 h-4 text-blue-400 animate-pulse" />
            </div>
            <h2 className="text-base font-bold text-white tracking-wide">Top 10 Setores com Mais Estações</h2>
          </div>
          <div className="space-y-3 pt-2">
            {topSetores.map(([setor, count], idx) => {
              const maxVal = topSetores[0]?.[1] || 1;
              const pct = Math.round((count / maxVal) * 100);
              return (
                <div key={setor} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span>{idx + 1}. {setor}</span>
                    <span className="font-bold text-blue-400">{count} est.</span>
                  </div>
                  <div className="w-full bg-[#1e293b] h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0b1329] p-6 rounded-2xl border border-[#1e293b] shadow-xl relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.5)]">
              <BarChart3 className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <h2 className="text-base font-bold text-white tracking-wide">Top 10 Departamentos</h2>
          </div>
          <div className="space-y-3 pt-2">
            {topDepartamentos.map(([dept, count], idx) => {
              const maxVal = topDepartamentos[0]?.[1] || 1;
              const pct = Math.round((count / maxVal) * 100);
              return (
                <div key={dept} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span>{idx + 1}. {dept}</span>
                    <span className="font-bold text-purple-400">{count} est.</span>
                  </div>
                  <div className="w-full bg-[#1e293b] h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0b1329] p-4 rounded-2xl border border-[#1e293b] shadow-xl">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Estação, Administrador, Setor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-[#0b1329] border border-[#1e293b] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a] text-slate-400 font-semibold uppercase text-xs tracking-wider border-b border-[#1e293b]">
              <tr>
                <th className="p-4">Estação de Trabalho</th>
                <th className="p-4 text-center">Qtd Admins</th>
                <th className="p-4">Quem são os Administradores</th>
                <th className="p-4">Setor / Depto</th>
                <th className="p-4">Modificado Por</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Carregando dados...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
              ) : (
                filteredData.map((item) => {
                  const temAlerta = item.alerta === 'Revisar permissionamento';
                  const qtdAdminsReal = item.qtd_admin || contarAdmins(item.administradores);
                  return (
                    <tr key={item.id || item.endereco_logico} className="hover:bg-[#111c38] transition-colors">
                      <td className="p-4 font-mono font-bold text-white">{item.endereco_logico}</td>
                      <td className="p-4 text-center font-bold text-blue-400">{qtdAdminsReal}</td>
                      <td className="p-4 text-slate-300 max-w-xs break-words">{item.administradores}</td>
                      <td className="p-4 text-xs text-slate-400">
                        <span className="font-semibold text-slate-200 block">{item.setor || 'Geral'}</span>
                        <span className="text-slate-500">{item.departamento || 'Geral'}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1 font-medium text-slate-300">
                          <User className="w-3 h-3 text-slate-500" />
                          {item.modificado_por || 'Sistema'}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : '-'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {temAlerta ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Revisar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> Conforme
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenEditModal(item)} title="Editar" className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 border border-blue-500/20">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => item.id && handleDeleteRecord(item.id, item.endereco_logico)} title="Excluir" className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 border border-rose-500/20">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#1e293b] text-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-[#1e293b] bg-[#0f172a]">
              <h3 className="text-lg font-bold text-white">{isEditing ? 'Editar Estação e Administradores' : 'Novo Cadastro de Estação'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Endereço Lógico (Hostname/Estação)</label>
                <input
                  type="text"
                  required
                  placeholder="EX: ST01234"
                  value={currentRecord.endereco_logico || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, endereco_logico: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-sm uppercase font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Administradores Locais (separados por vírgula ou |)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="usuario1 | usuario2 | Administrator"
                  value={currentRecord.administradores || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, administradores: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Departamento</label>
                  <input
                    type="text"
                    placeholder="Ex: STI"
                    value={currentRecord.departamento || ''}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, departamento: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Setor</label>
                  <input
                    type="text"
                    placeholder="Ex: Suporte"
                    value={currentRecord.setor || ''}
                    onChange={(e) => setCurrentReport({ ...currentRecord, setor: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Justificativa / Observações</label>
                <input
                  type="text"
                  placeholder="Motivo da permissão especial..."
                  value={currentRecord.justificativa || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, justificativa: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1e293b]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-[#1e293b] text-slate-300 rounded-xl text-sm font-medium hover:bg-[#1e293b]">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 shadow-sm">Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLocais;
