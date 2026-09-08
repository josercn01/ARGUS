import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
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
  Database
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

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export const GerenciadorAdministradores: React.FC = () => {
  // Estados da Aplicação
  const [data, setData] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filterAlerta, setFilterAlerta] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [alertasRecentes, setAlertasRecentes] = useState<AlertaItem[]>([]);

  // Carga inicial dos dados da Tabela Base
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
      alert(`Erro ao carregar dados do Supabase: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // PROCESSAMENTO DE IMPORTAÇÃO DA PLANILHA
  // ==========================================

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

        // Mapeia a tabela base atual usando o endereço lógico como chave
        const currentMap = new Map(
          data.map((item) => [item.endereco_logico.toString().trim().toUpperCase(), item])
        );

        const novosAlertas: AlertaItem[] = [];
        const payloadToUpsert: any[] = [];
        let added = 0;
        let updated = 0;

        importedRows.forEach((row) => {
          // Fallbacks para nomes de colunas
          const host = (
            row['ENDEREÇO LÓGICO'] ||
            row.ENDERECO_LOGICO ||
            row.Host ||
            row.HOSTNAME ||
            ''
          ).toString().trim().toUpperCase();

          const admins = (
            row['ADMINISTRADORES LOCAIS'] ||
            row.ADMINISTRADORES_LOCAIS ||
            row.ADMINISTRADORES ||
            row.Admins ||
            ''
          ).toString().trim();

          if (!host) return; // Ignora linhas sem endereço lógico

          // VERIFICAÇÃO DE INCONSISTÊNCIA NA TABELA BASE
          if (!currentMap.has(host)) {
            // Endereço lógico não detectado na base cadastrada
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
            // Endereço lógico já existe na tabela base
            updated++;
            const existingRecord = currentMap.get(host)!;

            payloadToUpsert.push({
              id: existingRecord.id,
              endereco_logico: host,
              administradores: admins,
              alerta: existingRecord.alerta || null, // Preserva alertas existentes se houver
              updated_at: new Date().toISOString(),
            });
          }
        });

        // Atualiza a lista de alertas recentes em memória
        setAlertasRecentes(novosAlertas);

        // Persiste no Supabase fatiando em lotes de 300 para garantir estabilidade do payload
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

  // ==========================================
  // EXPORTAÇÕES PARA EXCEL
  // ==========================================

  const exportarAlertasExcel = () => {
    const listaParaExportar = alertasRecentes.length > 0
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
    const filename = `Alertas_Permissionamento_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
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
    const filename = `Base_Administradores_Locais_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // ==========================================
  // FILTRAGEM E BUSCA EM TEMPO REAL
  // ==========================================

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
    <div className="min-h-screen bg-slate-50 p-6 space-y-6 font-sans text-slate-800">
      {/* CABEÇALHO */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-600" />
            Auditoria de Administradores Locais
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Comparação da base cadastrada vs. relatórios semanais de permissionamento.
          </p>
        </div>

        {/* BARRA DE AÇÕES / BOTOES */}
        <div className="flex flex-wrap items-center gap-3">
          <label className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm text-sm font-medium ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
            className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* PAINEL DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total na Base</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalRegistros}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => setFilterAlerta(!filterAlerta)}
          className={`p-4 rounded-xl border cursor-pointer transition-all shadow-sm flex items-center justify-between ${
            filterAlerta
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Alertas de Permissionamento</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{totalAlertas}</p>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Sem Inconsistências</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalRegistros - totalAlertas}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FEEDBACK DE IMPORTAÇÃO */}
      {importResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-semibold">Importação concluída com sucesso!</span>
              <div className="mt-1 text-xs text-blue-700 flex gap-4">
                <span>Identificados/Atualizados: <strong>{importResult.updated}</strong></span>
                <span>Novos com Alerta (Fora da Base): <strong>{importResult.added}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setImportResult(null)}
            className="text-xs text-blue-500 hover:text-blue-700 font-semibold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* BARRA DE FILTROS E PESQUISA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Endereço Lógico ou Administrador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterAlerta(!filterAlerta)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
              filterAlerta
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {filterAlerta ? 'Exibindo Apenas Alertas' : 'Filtrar Somente Alertas'}
          </button>
        </div>
      </div>

      {/* TABELA DE DADOS */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Endereço Lógico</th>
                <th className="p-4">Administradores Locais</th>
                <th className="p-4 text-center">Status / Alertas</th>
                <th className="p-4">Observações / Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Carregando dados da tabela base...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const temAlerta = item.alerta === 'Revisar permissionamento';
                  return (
                    <tr key={item.id || item.endereco_logico} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">
                        {item.endereco_logico}
                      </td>
                      <td className="p-4 text-slate-700 max-w-md break-words">
                        {item.administradores || <span className="text-slate-400 italic">Nenhum informado</span>}
                      </td>
                      <td className="p-4 text-center">
                        {temAlerta ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Revisar permissionamento
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            Conforme
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {item.justificativa || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* RODAPÉ DA TABELA */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Exibindo <strong>{filteredData.length}</strong> de <strong>{totalRegistros}</strong> registros</span>
          <span>Atualização automática via Supabase</span>
        </div>
      </div>
    </div>
  );
};

export default GerenciadorAdministradores;
