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
  Clock
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
      </div>

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
      </div>

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
    </div>
  );
};

export default AdminLocais;
