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
  Database
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

export const AdminLocais: React.FC<AdminLocaisProps> = ({ role }) => {
  const [data, setData] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filterAlerta, setFilterAlerta] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [alertasRecentes, setAlertasRecentes] = useState<AlertaItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Função para buscar TODOS os registros do Supabase ultrapassando o limite padrão de 1000 linhas
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

        if (error) {
          throw new Error(error.message);
        }

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

        importedRows.forEach((row) => {
          const host = (
            row['ENDEREÇO LÓGICO'] ||
            row['ENDERECO_LOGICO'] ||
            row['Host'] ||
            row['HOSTNAME'] ||
            row['host'] ||
            ''
          ).toString().trim().toUpperCase();

          const admins = (
            row['ADMINISTRADORES LOCAIS'] ||
            row['ADMINISTRADORES_LOCAIS'] ||
            row['ADMINISTRADORES'] ||
            row['ADMIN LOCAL'] ||
            row['ADMINS'] ||
            row['Admins'] ||
            row['Administradores'] ||
            ''
          ).toString().trim();

          if (!host) return;

          if (!currentMap.has(host)) {
            added++;
            const statusAlerta = 'Revisar permissionamento';

            novosAlertas.push({
              endereco_logico: host,
              administradores: admins,
              status: statusAlerta,
            });

            payloadToUpsert.push({
              endereco_logico: host,
              administradores: admins,
              alerta: statusAlerta,
              justificativa: '[NOVO DISPOSITIVO] Não consta na tabela base cadastrada',
              updated_at: new Date().toISOString(),
            });
          } else {
            updated++;
            const existingRecord = currentMap.get(host)!;

            payloadToUpsert.push({
              id: existingRecord.id,
              endereco_logico: host,
              administradores: admins,
              alerta: existingRecord.alerta || null,
              updated_at: new Date().toISOString(),
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

  const exportarAlertasExcel = () => {
    const listaParaExportar =
      alertasRecentes.length > 0
        ? alertasRecentes
        : data
            .filter((item) => item.alerta === 'Revisar permissionamento')
            .map((item) => ({
              endereco_logico: item.endereco_logico,
              administradores: item.administradores,
              status: item.alerta || 'Revisar permissionamento',
            }));

    if (listaParaExportar.length === 0) {
      alert('Nenhum alerta de "Revisar permissionamento" encontrado para exportar.');
      return;
    }

    const dataToExport = listaParaExportar.map((item) => ({
      'ENDEREÇO LÓGICO': item.endereco_logico,
      'ADMINISTRADORES LOCAIS': item.administradores,
      'STATUS DO ALERTA': item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alertas');
    XLSX.writeFile(workbook, `Alertas_Permissionamento_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportarBaseCompletaExcel = () => {
    if (data.length === 0) {
      alert('Não há dados disponíveis para exportação.');
      return;
    }

    const dataToExport = data.map((item) => ({
      'ENDEREÇO LÓGICO': item.endereco_logico,
      'ADMINISTRADORES LOCAIS': item.administradores,
      'ALERTAS': item.alerta || 'OK',
      'JUSTIFICATIVA': item.justificativa || '',
      'ÚLTIMA ATUALIZAÇÃO': item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Base_Administradores');
    XLSX.writeFile(workbook, `Base_Administradores_Locais_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    return data.filter((item) => {
      const matchesSearch =
        !searchLower ||
        item.endereco_logico.toLowerCase().includes(searchLower) ||
        item.administradores.toLowerCase().includes(searchLower) ||
        (item.justificativa && item.justificativa.toLowerCase().includes(searchLower));

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
            Auditoria de Administradores Locais
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Comparação da base cadastrada vs. relatórios semanais de permissionamento.
          </p>
        </div>

        {/* BARRA DE AÇÕES */}
        <div className="flex flex-wrap items-center gap-3">
          {role !== 'viewer' && (
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
          )}

          <button
            onClick={exportarAlertasExcel}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-sm text-sm font-medium"
          >
            <ShieldAlert className="w-4 h-4" />
            Exportar Alertas (.xlsx)
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

      {/* MENSAGEM DE ERRO CASO OCORREU FALHA NO SUPABASE */}
      {errorMsg && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-sm text-red-200 flex items-center justify-between">
          <span><strong>Erro de Conexão/Banco:</strong> {errorMsg} (Verifique se a tabela 'administradores_locais' existe no Supabase).</span>
          <button onClick={loadData} className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-xs font-bold">Tentar Novamente</button>
        </div>
      )}

      {/* PAINEL DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total na Base</p>
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
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Sem Inconsistências</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalRegistros - totalAlertas}</p>
          </div>
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-lg">
            <CheckCircle className="w-6 h-6" />
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
                <span>Identificados/Atualizados: <strong>{importResult.updated}</strong></span>
                <span>Novos com Alerta (Fora da Base): <strong>{importResult.added}</strong></span>
              </div>
            </div>
          </div>
          <button onClick={() => setImportResult(null)} className="text-xs text-blue-400 hover:text-blue-200 font-semibold">Fechar</button>
        </div>
      )}

      {/* BUSCA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Endereço Lógico ou Administrador..."
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

      {/* TABELA */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-xs tracking-wider border-b border-slate-700">
              <tr>
                <th className="p-4">Endereço Lógico</th>
                <th className="p-4">Administradores Locais</th>
                <th className="p-4 text-center">Status / Alertas</th>
                <th className="p-4">Observações / Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Carregando todos os registros da base...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const temAlerta = item.alerta === 'Revisar permissionamento';
                  return (
                    <tr key={item.id || item.endereco_logico} className="hover:bg-slate-750 transition-colors">
                      <td className="p-4 font-mono font-bold text-white">{item.endereco_logico}</td>
                      <td className="p-4 text-slate-300 max-w-md break-words">{item.administradores || <span className="text-slate-500 italic">Nenhum informado</span>}</td>
                      <td className="p-4 text-center">
                        {temAlerta ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            Revisar permissionamento
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Conforme
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-400">{item.justificativa || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-900 border-t border-slate-700 text-xs text-slate-400 flex justify-between items-center">
          <span>Exibindo <strong>{filteredData.length}</strong> de <strong>{totalRegistros}</strong> registros totais</span>
          <span>Atualização automática via Supabase</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLocais;
