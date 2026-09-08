import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Search,
  RefreshCw,
  ShieldAlert,
  FileSpreadsheet,
  Database,
  Plus,
  Edit2,
  Trash2,
  History,
  X,
  BarChart3,
  User,
  Clock
} from 'lucide-react';

// ==========================================
// INTERFACES DE DADOS
// ==========================================

export interface AdminRecord {
  id?: string;
  endereco_logico: string;
  administradores: string;
  qtd_admin?: number;
  departamento?: string;
  setor?: string;
  justificativa?: string;
  prefixo?: string;
  alerta?: string | null;
  modificado_por?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AlertaItem {
  endereco_logico: string;
  administradores: string;
  status: string;
}

export interface AuditLog {
  id: string;
  record_id: string;
  endereco_logico: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data?: any;
  new_data?: any;
  modificado_por: string;
  created_at: string;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export const GerenciadorAdministradores: React.FC = () => {
  const [data, setData] = useState<AdminRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filterAlerta, setFilterAlerta] = useState<boolean>(false);
  const [alertasRecentes, setAlertasRecentes] = useState<AlertaItem[]>([]);

  // Modais State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<AdminRecord>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Usuário atual simulado/obtido (Pode ser integrado com auth do supabase)
  const currentUser = 'Administrador TI (Senado)';

  useEffect(() => {
    loadData();
    loadAuditLogs();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: dbData, error } = await supabase
        .from('administradores_locais')
        .select('*')
        .order('endereco_logico', { ascending: true });

      if (error) throw error;
      setData(dbData || []);
    } catch (err: any) {
      alert(`Erro ao carregar dados do Supabase: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && logs) {
        setAuditLogs(logs);
      }
    } catch (err) {
      // Tabela de auditoria opcional caso não exista
      console.log('Tabela de audit_logs não configurada ou vazia.');
    }
  };

  const registrarAuditoria = async (recordId: string, host: string, action: 'INSERT' | 'UPDATE' | 'DELETE', oldData?: any, newData?: any) => {
    try {
      await supabase.from('audit_logs').insert([
        {
          record_id: recordId,
          endereco_logico: host,
          action,
          old_data: oldData ? JSON.stringify(oldData) : null,
          new_data: newData ? JSON.stringify(newData) : null,
          modificado_por: currentUser,
          created_at: new Date().toISOString()
        }
      ]);
      loadAuditLogs();
    } catch (e) {
      console.error('Erro ao registrar log de auditoria', e);
    }
  };

  // ==========================================
  // GRÁFICOS (TOP 10 SETORES E DEPARTAMENTOS)
  // ==========================================

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

  // ==========================================
  // CRUD & FORMULÁRIOS
  // ==========================================

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

    const adminsList = currentRecord.administradores.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = {
      endereco_logico: currentRecord.endereco_logico.trim().toUpperCase(),
      administradores: currentRecord.administradores.trim(),
      qtd_admin: adminsList.length,
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
        await registrarAuditoria(currentRecord.id, payload.endereco_logico, 'UPDATE', currentRecord, payload);
      } else {
        const { data: inserted, error } = await supabase
          .from('administradores_locais')
          .insert([payload])
          .select();
        if (error) throw error;
        if (inserted && inserted[0]) {
          await registrarAuditoria(inserted[0].id, payload.endereco_logico, 'INSERT', null, payload);
        }
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
      await registrarAuditoria(id, host, 'DELETE');
      loadData();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleUndoAction = async (log: AuditLog) => {
    if (!confirm(`Deseja desfazer a ação de ${log.action} para a estação ${log.endereco_logico}?`)) return;

    try {
      if (log.action === 'UPDATE' && log.old_data) {
        const oldObj = JSON.parse(log.old_data);
        await supabase.from('administradores_locais').update(oldObj).eq('id', log.record_id);
      } else if (log.action === 'INSERT') {
        await supabase.from('administradores_locais').delete().eq('id', log.record_id);
      } else if (log.action === 'DELETE' && log.old_data) {
        const oldObj = JSON.parse(log.old_data);
        await supabase.from('administradores_locais').insert([oldObj]);
      }

      alert('Ação desfeita com sucesso!');
      setIsHistoryModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Erro ao desfazer alteração: ${err.message}`);
    }
  };

  // ==========================================
  // IMPORTAÇÃO EXCEL
  // ==========================================

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
          const adminsList = admins.split(',').map((s: string) => s.trim()).filter(Boolean);

          if (!currentMap.has(host)) {
            added++;
            novosAlertas.push({ endereco_logico: host, administradores: admins, status: 'Revisar permissionamento' });
            payloadToUpsert.push({
              endereco_logico: host,
              administradores: admins,
              qtd_admin: adminsList.length,
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
              qtd_admin: adminsList.length,
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

  // ==========================================
  // EXPORTAÇÃO EXCEL
  // ==========================================

  const exportarBaseCompletaExcel = () => {
    if (data.length === 0) return alert('Sem dados para exportar.');
    const dataToExport = data.map((item) => ({
      'ESTAÇÃO DE TRABALHO': item.endereco_logico,
      'QTD ADMINS': item.qtd_admin || 1,
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

  // Filtragem
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

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6 font-sans text-slate-800">
      {/* CABEÇALHO */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-600" />
            Auditoria e Gestão de Administradores Locais
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Painel de controle de permissões, estações de trabalho e histórico de alterações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Cadastro
          </button>

          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm text-sm font-medium"
          >
            <History className="w-4 h-4" />
            Desfazer / Histórico
          </button>

          <label className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm text-sm font-medium ${importing ? 'opacity-50' : ''}`}>
            <Upload className="w-4 h-4" />
            {importing ? 'Importando...' : 'Importar Planilha'}
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={importing} className="hidden" />
          </label>

          <button
            onClick={exportarBaseCompletaExcel}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Base (.xlsx)
          </button>

          <button onClick={loadData} title="Recarregar" className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* PAINEL DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Estações</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalRegistros}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Database className="w-6 h-6" /></div>
        </div>

        <div onClick={() => setFilterAlerta(!filterAlerta)} className={`p-4 rounded-xl border cursor-pointer transition-all shadow-sm flex items-center justify-between ${filterAlerta ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Alertas de Permissionamento</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{totalAlertas}</p>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg"><AlertTriangle className="w-6 h-6" /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Estações Conformes</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalRegistros - totalAlertas}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
        </div>
      </div>

      {/* GRÁFICOS MODERNOS EM DEGRADÊ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Setores */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Top 10 Setores com Mais Estações
          </h2>
          <div className="space-y-3">
            {topSetores.map(([setor, count], idx) => {
              const maxVal = topSetores[0]?.[1] || 1;
              const pct = Math.round((count / maxVal) * 100);
              return (
                <div key={setor} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{idx + 1}. {setor}</span>
                    <span className="font-bold">{count} est.</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {topSetores.length === 0 && <p className="text-xs text-slate-400">Nenhum dado de setor registrado.</p>}
          </div>
        </div>

        {/* Top 10 Departamentos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Top 10 Departamentos
          </h2>
          <div className="space-y-3">
            {topDepartamentos.map(([dept, count], idx) => {
              const maxVal = topDepartamentos[0]?.[1] || 1;
              const pct = Math.round((count / maxVal) * 100);
              return (
                <div key={dept} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{idx + 1}. {dept}</span>
                    <span className="font-bold">{count} est.</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {topDepartamentos.length === 0 && <p className="text-xs text-slate-400">Nenhum departamento registrado.</p>}
          </div>
        </div>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Estação, Administrador, Setor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setFilterAlerta(!filterAlerta)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
            filterAlerta ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {filterAlerta ? 'Exibindo Apenas Alertas' : 'Filtrar Somente Alertas'}
        </button>
      </div>

      {/* TABELA PRINCIPAL COMPLETA */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Carregando dados...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
              ) : (
                filteredData.map((item) => {
                  const temAlerta = item.alerta === 'Revisar permissionamento';
                  return (
                    <tr key={item.id || item.endereco_logico} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">{item.endereco_logico}</td>
                      <td className="p-4 text-center font-bold text-blue-600">{item.qtd_admin || item.administradores.split(',').length}</td>
                      <td className="p-4 text-slate-700 max-w-xs break-words">{item.administradores}</td>
                      <td className="p-4 text-xs text-slate-600">
                        <span className="font-semibold block">{item.setor || 'Geral'}</span>
                        <span className="text-slate-400">{item.departamento || 'Geral'}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1 font-medium text-slate-700">
                          <User className="w-3 h-3 text-slate-400" />
                          {item.modificado_por || 'Sistema'}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : '-'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {temAlerta ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Revisar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-500" /> Conforme
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenEditModal(item)} title="Editar" className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => item.id && handleDeleteRecord(item.id, item.endereco_logico)} title="Excluir" className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100">
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
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Exibindo <strong>{filteredData.length}</strong> de <strong>{totalRegistros}</strong> registros</span>
          <span>Atualizado via Supabase</span>
        </div>
      </div>

      {/* MODAL DE NOVO / EDITAR CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">{isEditing ? 'Editar Estação e Administradores' : 'Novo Cadastro de Estação'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Endereço Lógico (Hostname/Estação)</label>
                <input
                  type="text"
                  required
                  placeholder="EX: ST01234"
                  value={currentRecord.endereco_logico || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, endereco_logico: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Administradores Locais (separados por vírgula)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="usuario1, usuario2, Administrator"
                  value={currentRecord.administradores || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, administradores: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Departamento</label>
                  <input
                    type="text"
                    placeholder="Ex: STI"
                    value={currentRecord.departamento || ''}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, departamento: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Setor</label>
                  <input
                    type="text"
                    placeholder="Ex: Suporte"
                    value={currentRecord.setor || ''}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, setor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Justificativa / Observações</label>
                <input
                  type="text"
                  placeholder="Motivo da permissão especial..."
                  value={currentRecord.justificativa || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, justificativa: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DESFAZER / HISTÓRICO (ÚLTIMAS 10 ALTERAÇÕES) */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-violet-600" /> Histórico de Alterações (Últimas 10)
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum histórico de alteração recente registrado.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${log.action === 'INSERT' ? 'bg-emerald-100 text-emerald-800' : log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}>
                          {log.action}
                        </span>
                        <span className="font-mono font-bold text-slate-900">{log.endereco_logico}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Modificado por: <strong>{log.modificado_por}</strong> em {new Date(log.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <button
                      onClick={() => handleUndoAction(log)}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 shadow-sm shrink-0"
                    >
                      Desfazer Esta Ação
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setIsHistoryModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciadorAdministradores;
