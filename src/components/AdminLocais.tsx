import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import {
  Upload,
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
  BarChart3,
  User,
  Clock,
  X,
  RotateCcw
} from 'lucide-react';
import type { AuthUser, SystemRole } from '@/types';

interface AdminLocaisProps {
  user: AuthUser | null;
  role: SystemRole;
}

export interface AdminRecord {
  id?: string;
  endereco_logico: string;
  administradores: string;
  qntd_admin?: number;
  departamento?: string;
  setor?: string;
  justificativa?: string;
  prefixo?: string;
  alerta?: string | null;
  created_at?: string;
  updated_at?: string;
  modified_by?: string;
}

export interface AuditLogItem {
  id: string;
  acao: string;
  detalhes: string;
  usuario: string;
  timestamp: string;
  previous_state?: any;
}

export interface AlertaItem {
  endereco_logico: string;
  administradores: string;
  status: string;
}

export interface ImportResult {
  added: number;
  updated: number;
  removed: number;
}

export const AdminLocais: React.FC<AdminLocaisProps> = ({ user, role }) => {
  const [data, setData] = useState<AdminRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filterAlerta, setFilterAlerta] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [alertasRecentes, setAlertasRecentes] = useState<AlertaItem[]>([]);

  // Modais State
  const [showModalForm, setShowModalForm] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<AdminRecord | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Form State
  const [formHost, setFormHost] = useState<string>('');
  const [formAdmins, setFormAdmins] = useState<string>('');
  const [formSetor, setFormSetor] = useState<string>('');
  const [formDepartamento, setFormDepartamento] = useState<string>('');
  const [formJustificativa, setFormJustificativa] = useState<string>('');

  useEffect(() => {
    loadData();
    loadAuditLogs();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let allRecords: AdminRecord[] = [];
      let page = 0;
      const pageSize = 1000;
      let fetchMore = true;

      while (fetchMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data: dbData, error } = await supabase
          .from('administradores_locais')
          .select('*')
          .order('endereco_logico', { ascending: true })
          .range(from, to);

        if (error) throw new Error(error.message);

        if (dbData && dbData.length > 0) {
          allRecords = [...allRecords, ...dbData];
          if (dbData.length < pageSize) {
            fetchMore = false;
          } else {
            page++;
          }
        } else {
          fetchMore = false;
        }
      }

      setData(allRecords);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setErrorMsg(err.message || 'Erro desconhecido ao conectar com o banco.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data: logsData, error } = await supabase
        .from('audit_logs_admin')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (!error && logsData) {
        setAuditLogs(logsData);
      }
    } catch (e) {
      // Tabela de log pode não existir inicialmente, mantemos array vazio ou simulado localmente se necessário
      console.log('Logs remotos indisponíveis, operando com histórico local.');
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

    const updatedLogs = [newLog, ...auditLogs].slice(0, 10);
    setAuditLogs(updatedLogs);

    try {
      await supabase.from('audit_logs_admin').insert([newLog]);
    } catch (e) {
      // Falha silenciosa caso tabela de log não esteja criada no banco do usuário
    }
  };
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

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHost.trim()) {
      alert('O Endereço Lógico / Estação é obrigatório.');
      return;
    }

    const userName = user?.name || user?.email || 'Operador';
    const agora = new Date().toISOString();
    const adminsList = formAdmins.split(',').map(s => s.trim()).filter(Boolean);
    const qntd = adminsList.length > 0 ? adminsList.length : formAdmins.trim() ? 1 : 0;

    const payload = {
      endereco_logico: formHost.trim().toUpperCase(),
      administradores: formAdmins.trim(),
      qntd_admin: qntd,
      setor: formSetor.trim() || 'Não informado',
      departamento: formDepartamento.trim() || 'Não informado',
      justificativa: formJustificativa.trim(),
      updated_at: agora,
      modified_by: `${userName} em ${new Date().toLocaleString('pt-BR')}`
    };

    try {
      if (editingRecord?.id) {
        const { error } = await supabase
          .from('administradores_locais')
          .update(payload)
          .eq('id', editingRecord.id);

        if (error) throw error;
        await logAction('Atualização', `Estação ${payload.endereco_logico} editada`, editingRecord);
      } else {
        const { error } = await supabase
          .from('administradores_locais')
          .insert([payload]);

        if (error) throw error;
        await logAction('Criação', `Nova estação ${payload.endereco_logico} cadastrada`);
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      alert(`Erro ao salvar registro: ${err.message}`);
    }
  };

  const handleDeleteRecord = async (item: AdminRecord) => {
    if (!confirm(`Deseja realmente excluir a estação ${item.endereco_logico}?`)) return;

    try {
      if (item.id) {
        const { error } = await supabase.from('administradores_locais').delete().eq('id', item.id);
        if (error) throw error;
      }
      await logAction('Exclusão', `Estação ${item.endereco_logico} removida`, item);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleUndo = async (log: AuditLogItem) => {
    if (!confirm(`Deseja desfazer a ação: "${log.acao} - ${log.detalhes}" realizada por ${log.usuario}?`)) return;

    try {
      if (log.previous_state && log.previous_state.endereco_logico) {
        const prev = log.previous_state;
        const { error } = await supabase
          .from('administradores_locais')
          .upsert([prev]);
        if (error) throw error;
      } else if (log.acao === 'Criação' && log.detalhes) {
        const match = log.detalhes.match(/estação\s+([^\s]+)/i);
        if (match && match[1]) {
          await supabase.from('administradores_locais').delete().eq('endereco_logico', match[1]);
        }
      }

      alert('Ação desfeita com sucesso!');
      setShowHistoryModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao desfazer alteração: ${err.message}`);
    }
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    setFormHost('');
    setFormAdmins('');
    setFormSetor('');
    setFormDepartamento('');
    setFormJustificativa('');
    setShowModalForm(true);
  };

  const openEditModal = (item: AdminRecord) => {
    setEditingRecord(item);
    setFormHost(item.endereco_logico || '');
    setFormAdmins(item.administradores || '');
    setFormSetor(item.setor || '');
    setFormDepartamento(item.departamento || '');
    setFormJustificativa(item.justificativa || '');
    setShowModalForm(true);
  };

  const closeModal = () => {
    setShowModalForm(false);
    setEditingRecord(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

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
        const userName = user?.name || user?.email || 'Importação Planilha';
        const modificadorStr = `${userName} em ${new Date().toLocaleString('pt-BR')}`;

        importedRows.forEach((row) => {
          const host = (
            row['ENDEREÇO LÓGICO'] || row['ENDERECO_LOGICO'] || row['Host'] || row['HOSTNAME'] || row['host'] || ''
          ).toString().trim().toUpperCase();

          const admins = (
            row['ADMINISTRADORES LOCAIS'] || row['ADMINISTRADORES'] || row['ADMINS'] || row['Administradores'] || ''
          ).toString().trim();

          const setorVal = (row['SETOR'] || row['Setor'] || 'Não informado').toString().trim();
          const deptVal = (row['DEPARTAMENTO'] || row['Departamento'] || 'Não informado').toString().trim();

          if (!host) return;

          const adminsList = admins.split(',').map(s => s.trim()).filter(Boolean);
          const qntd = adminsList.length > 0 ? adminsList.length : admins ? 1 : 0;

          if (!currentMap.has(host)) {
            added++;
            const statusAlerta = 'Revisar permissionamento';
            novosAlertas.push({ endereco_logico: host, administradores: admins, status: statusAlerta });

            payloadToUpsert.push({
              endereco_logico: host,
              administradores: admins,
              qntd_admin: qntd,
              setor: setorVal,
              departamento: deptVal,
              alerta: statusAlerta,
              justificativa: '[NOVO DISPOSITIVO] Importado via planilha',
              updated_at: new Date().toISOString(),
              modified_by: modificadorStr
            });
          } else {
            updated++;
            const existingRecord = currentMap.get(host)!;
            payloadToUpsert.push({
              id: existingRecord.id,
              endereco_logico: host,
              administradores: admins,
              qntd_admin: qntd,
              setor: existingRecord.setor || setorVal,
              departamento: existingRecord.departamento || deptVal,
              alerta: existingRecord.alerta || null,
              updated_at: new Date().toISOString(),
              modified_by: modificadorStr
            });
          }
        });

        setAlertasRecentes(novosAlertas);

        const chunkSize = 300;
        for (let i = 0; i < payloadToUpsert.length; i += chunkSize) {
          const chunk = payloadToUpsert.slice(i, i + chunkSize);
          const { error } = await supabase.from('administradores_locais').upsert(chunk);
          if (error) throw error;
        }

        await logAction('Importação', `Planilha importada: ${added} novos, ${updated} atualizados`);
        setImportResult({ added, updated, removed: 0 });
        await loadData();
      } catch (err: any) {
        alert(`Falha no processamento do arquivo: ${err.message}`);
      } finally {
        setImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportarBaseCompletaExcel = () => {
    if (data.length === 0) {
      alert('Não há dados disponíveis para exportação.');
      return;
    }

    const dataToExport = data.map((item) => ({
      'ENDEREÇO LÓGICO': item.endereco_logico,
      'QNTD ADMINS': item.qntd_admin || item.administradores.split(',').length || 0,
      'ADMINISTRADORES LOCAIS': item.administradores,
      'SETOR': item.setor || '',
      'DEPARTAMENTO': item.departamento || '',
      'ALERTAS': item.alerta || 'OK',
      'JUSTIFICATIVA': item.justificativa || '',
      'MODIFICADO POR': item.modified_by || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Base_Completa');
    XLSX.writeFile(workbook, `Base_Administradores_Locais_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Top 10 Setores e Departamentos
  const topSetores = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(item => {
      const s = item.setor || 'Não informado';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [data]);

  const topDepartamentos = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(item => {
      const d = item.departamento || 'Não informado';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [data]);

  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    return data.filter((item) => {
      const matchesSearch =
        !searchLower ||
        item.endereco_logico.toLowerCase().includes(searchLower) ||
        item.administradores.toLowerCase().includes(searchLower) ||
        (item.setor && item.setor.toLowerCase().includes(searchLower)) ||
        (item.departamento && item.departamento.toLowerCase().includes(searchLower));

      const matchesAlertaFilter = !filterAlerta || item.alerta === 'Revisar permissionamento';
      return matchesSearch && matchesAlertaFilter;
    });
  }, [data, search, filterAlerta]);

  const totalRegistros = data.length;
  const totalAlertas = data.filter((i) => i.alerta === 'Revisar permissionamento').length;

  return (
    <div className="w-full space-y-6">
      {/* CABEÇALHO */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-500" />
            Auditoria de Administradores Locais e Estações
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestão completa da base, permissões, relatórios e controle de auditoria de alterações.
          </p>
        </div>

        {/* BARRA DE AÇÕES */}
        <div className="flex flex-wrap items-center gap-3">
          {role !== 'viewer' && (
            <>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Novo Cadastro
              </button>

              <label
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm text-sm font-medium ${
                  importing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Processando...' : 'Importar Planilha'}
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </>
          )}

          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Histórico & Desfazer
          </button>

          <button
            onClick={exportarBaseCompletaExcel}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Base (.xlsx)
          </button>

          <button
            onClick={loadData}
            title="Recarregar Dados"
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* MENSAGEM DE ERRO */}
      {errorMsg && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-sm text-red-200 flex items-center justify-between">
          <span><strong>Erro de Conexão/Banco:</strong> {errorMsg}</span>
          <button onClick={loadData} className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-xs font-bold">Tentar Novamente</button>
        </div>
      )}

      {/* PAINEL DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Estações</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalRegistros}</p>
          </div>
          <div className="p-3 bg-blue-950 text-blue-400 rounded-lg">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => setFilterAlerta(!filterAlerta)}
          className={`p-4 rounded-xl border cursor-pointer transition-all shadow-sm flex items-center justify-between ${
            filterAlerta
              ? 'bg-amber-950 border-amber-600 ring-2 ring-amber-500'
              : 'bg-slate-800/80 border-slate-700 hover:border-amber-500'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Alertas de Permissionamento</p>
            <p className="text-2xl font-extrabold text-amber-200 mt-1">{totalAlertas}</p>
          </div>
          <div className="p-3 bg-amber-950 text-amber-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Estações Conformes</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalRegistros - totalAlertas}</p>
          </div>
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* GRÁFICOS MODERNOS EM DEGRADE: TOP 10 SETORES & TOP 10 DEPARTAMENTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Setores */}
        <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Top 10 Setores
            </h3>
            <span className="text-xs text-slate-400">Concentração de Estações</span>
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {topSetores.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhum dado de setor disponível.</p>
            ) : (
              topSetores.map(([setor, count], idx) => {
                const maxVal = topSetores[0][1] || 1;
                const pct = Math.round((count / maxVal) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium truncate max-w-[240px]">{setor}</span>
                      <span className="text-blue-400 font-bold">{count} est.</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top 10 Departamentos */}
        <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Top 10 Departamentos
            </h3>
            <span className="text-xs text-slate-400">Concentração por Departamento</span>
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {topDepartamentos.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhum dado de departamento disponível.</p>
            ) : (
              topDepartamentos.map(([dept, count], idx) => {
                const maxVal = topDepartamentos[0][1] || 1;
                const pct = Math.round((count / maxVal) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium truncate max-w-[240px]">{dept}</span>
                      <span className="text-purple-400 font-bold">{count} est.</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-400 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FEEDBACK DE IMPORTAÇÃO */}
      {importResult && (
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 text-sm text-blue-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <span className="font-semibold">Importação concluída com sucesso!</span>
              <div className="mt-1 text-xs text-blue-300 flex gap-4">
                <span>Atualizados: <strong>{importResult.updated}</strong></span>
                <span>Novos com Alerta: <strong>{importResult.added}</strong></span>
              </div>
            </div>
          </div>
          <button onClick={() => setImportResult(null)} className="text-xs text-blue-400 hover:text-blue-200 font-semibold">Fechar</button>
        </div>
      )}

      {/* BARRA DE BUSCA E FILTRO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Estação, Administrador, Setor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setFilterAlerta(!filterAlerta)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
            filterAlerta ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          {filterAlerta ? 'Exibindo Apenas Alertas' : 'Filtrar Somente Alertas'}
        </button>
      </div>

      {/* TABELA PRINCIPAL COMPLETA */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-xs tracking-wider border-b border-slate-700">
              <tr>
                <th className="p-4">Estação de Trabalho</th>
                <th className="p-4 text-center">Qtd. Admins</th>
                <th className="p-4">Quem são os Administradores</th>
                <th className="p-4">Setor / Depto</th>
                <th className="p-4">Modificado Por</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Carregando todos os registros da base...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const qtd = item.qntd_admin ?? (item.administradores ? item.administradores.split(',').length : 0);
                  return (
                    <tr key={item.id || item.endereco_logico} className="hover:bg-slate-750 transition-colors">
                      <td className="p-4 font-mono font-bold text-white">
                        {item.endereco_logico}
                        {item.alerta === 'Revisar permissionamento' && (
                          <span className="block text-[10px] text-amber-400 font-sans mt-0.5">⚠️ Requer Revisão</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-blue-300">
                        <span className="px-2 py-1 bg-blue-950 border border-blue-800 rounded-md">
                          {qtd}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 max-w-xs break-words">
                        {item.administradores || <span className="text-slate-500 italic">Nenhum informado</span>}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        <div><strong className="text-slate-300">Setor:</strong> {item.setor || '-'}</div>
                        <div className="mt-0.5"><strong className="text-slate-300">Depto:</strong> {item.departamento || '-'}</div>
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-mono">
                        {item.modified_by ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>{item.modified_by}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Editar Registro"
                            className="p-1.5 bg-slate-700 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {role !== 'viewer' && (
                            <button
                              onClick={() => handleDeleteRecord(item)}
                              title="Excluir Registro"
                              className="p-1.5 bg-slate-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-900 border-t border-slate-700 text-xs text-slate-400 flex justify-between items-center">
          <span>Exibindo <strong>{filteredData.length}</strong> de <strong>{totalRegistros}</strong> registros totais</span>
          <span>Sincronizado com Supabase</span>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {showModalForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                {editingRecord ? 'Editar Estação e Administradores' : 'Novo Cadastro de Estação'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Estação de Trabalho / Endereço Lógico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PC-SENADO-01 ou WS0078"
                  value={formHost}
                  onChange={(e) => setFormHost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Administradores Locais (separados por vírgula)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Administrador, Suporte_TI, joao.silva"
                  value={formAdmins}
                  onChange={(e) => setFormAdmins(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Setor</label>
                  <input
                    type="text"
                    placeholder="Ex: Infraestrutura"
                    value={formSetor}
                    onChange={(e) => setFormSetor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Departamento</label>
                  <input
                    type="text"
                    placeholder="Ex: STI"
                    value={formDepartamento}
                    onChange={(e) => setFormDepartamento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Justificativa / Observações</label>
                <input
                  type="text"
                  placeholder="Motivo da permissão ou observação de auditoria"
                  value={formJustificativa}
                  onChange={(e) => setFormJustificativa(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP DE HISTÓRICO E DESFAZER (ROLLBACK) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                Últimas 10 Alterações e Opção de Desfazer
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-400">
                Abaixo estão registradas as últimas operações realizadas na base. Clique em <strong>"Desfazer"</strong> para reverter uma alteração específica.
              </p>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic bg-slate-800/40 rounded-xl border border-slate-800">
                  Nenhum histórico recente registrado nesta sessão.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            {log.acao}
                          </span>
                          <span className="text-xs font-semibold text-white">{log.detalhes}</span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3 font-mono">
                          <span className="flex items-center gap-1"><User className="w-3 h-3 text-cyan-400" /> {log.usuario}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> {new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUndo(log)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Desfazer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
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

export default AdminLocais;
