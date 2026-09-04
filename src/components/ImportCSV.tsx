import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { LicencaUsuario } from '@/types';

interface ImportCSVProps {
  onImport: (rows: Partial<LicencaUsuario>[]) => Promise<{ success: number; errors: string[] }>;
}

/** Cabeçalhos do modelo, na ordem em que são exportados */
const TEMPLATE_HEADERS = [
  'NOME',
  'EMAIL',
  'LOGIN',
  'CHAPA_MATRICULA',
  'LOCAL',
  'DEPARTAMENTO',
  'SUBDEPARTAMENTO',
  'FABRICANTE',
  'TIPO_PRODUTO',
  'PRODUTO',
  'POSSUI_LICENCA',
  'STATUS',
] as const;

const TEMPLATE_EXAMPLE = {
  NOME: 'Maria Souza',
  EMAIL: 'msouza@senado.leg.br',
  LOGIN: 'msouza',
  CHAPA_MATRICULA: '123456',
  LOCAL: 'Anexo I - Bloco A',
  DEPARTAMENTO: 'SEGRAF',
  SUBDEPARTAMENTO: 'COATEN',
  FABRICANTE: 'Adobe',
  TIPO_PRODUTO: 'Creative Cloud (Suite CC)',
  PRODUTO: 'Creative Cloud (Suite CC)',
  POSSUI_LICENCA: 'Sim',
  STATUS: 'Ativo',
};

function truthy(value: string | null): boolean {
  if (!value) return false;
  return ['sim', 'true', '1', 'x', 'yes'].includes(value.trim().toLowerCase());
}

function normalizeRow(rawRow: Record<string, unknown>): Partial<LicencaUsuario> {
  const row: Record<string, unknown> = {};
  let possuiInformado = false;

  Object.keys(rawRow).forEach((key) => {
    const k = key.toLowerCase().trim().replace(/\s+/g, '_');
    const raw = rawRow[key];
    const val = raw !== undefined && raw !== null && String(raw).trim() !== '' ? String(raw).trim() : null;

    switch (k) {
      case 'nome':
        row.nome = val;
        break;
      case 'email':
      case 'e-mail':
        row.email = val ? val.toLowerCase() : null;
        break;
      case 'login':
      case 'login_de_rede':
      case 'usuario':
        row.login = val;
        break;
      case 'chapa':
      case 'chapa_matricula':
      case 'matricula':
      case 'matrícula':
        row.chapa_matricula = val;
        row.matricula = val;
        break;
      case 'local':
      case 'local_de_trabalho':
      case 'local_nome':
      case 'unidade':
        row.local_nome = val;
        break;
      case 'departamento':
      case 'departamento_raiz':
        row.departamento_raiz = val;
        break;
      case 'setor':
      case 'subdepartamento':
      case 'sub_departamento':
      case 'subdep':
        row.sub_departamento = val;
        break;
      case 'fabricante':
      case 'licenca':
      case 'licença':
      case 'tipo_licenca':
        row.tipo_licenca = val;
        break;
      case 'tipo_produto':
      case 'tipoproduto':
        row.tipo_produto = val;
        break;
      case 'produto':
      case 'perfil':
        row.produto = val;
        break;
      case 'status':
        row.status = val || 'Pendente';
        break;
      case 'possui_licenca':
      case 'possuilicenca':
      case 'possui_licença':
        row.possui_licenca = truthy(val);
        possuiInformado = true;
        break;
      default:
        break;
    }
  });

  if (!possuiInformado) {
    row.possui_licenca = Boolean(row.produto || row.tipo_licenca);
  }

  return row as Partial<LicencaUsuario>;
}

export function ImportCSV({ onImport }: ImportCSVProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<LicencaUsuario>[]>([]);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([TEMPLATE_EXAMPLE], { header: [...TEMPLATE_HEADERS] });
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'argus-modelo-importacao.xlsx');
  }

  async function readFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) {
        setError('A planilha está vazia.');
        setPreview([]);
        return;
      }

      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
      const rows = raw.map(normalizeRow).filter((r) => Boolean(r.email));

      if (rows.length === 0) {
        setError('Nenhuma linha com e-mail válido foi encontrada. Confira o cabeçalho EMAIL.');
      }
      setPreview(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
      setPreview([]);
    }
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await onImport(preview);
      setResult(res);
      setPreview([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro durante a importação.');
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setPreview([]);
    setResult(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#D4AF37]" />
            Importar Alocações
          </h3>
          <p className="text-[#94a3b8] text-xs mt-0.5">
            Aceita .xlsx, .xls e .csv. Registros existentes são atualizados pelo e-mail.
          </p>
        </div>

        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-xs text-[#94a3b8] hover:text-[#D4AF37] border border-[#1e293b] hover:border-[#D4AF37]/40 px-3 py-2 rounded-lg transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Baixar modelo
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) readFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          dragging ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#1e293b] hover:border-[#D4AF37]/40'
        }`}
      >
        <FileText className="w-6 h-6 text-[#D4AF37] mx-auto mb-2" />
        <p className="text-white text-sm font-medium">
          {fileName ?? 'Arraste a planilha aqui ou clique para selecionar'}
        </p>
        <p className="text-[#64748b] text-xs mt-1">
          Colunas: {TEMPLATE_HEADERS.join(', ')}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          {error}
        </div>
      )}

      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[#94a3b8] text-xs">
              <span className="text-[#D4AF37] font-bold">{preview.length}</span> registro(s) prontos para
              importar.
            </p>
            <button
              onClick={reset}
              className="p-1 text-[#94a3b8] hover:text-rose-400 rounded-md transition-colors"
              title="Descartar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-48 overflow-auto border border-[#1e293b] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#001726] sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-[#94a3b8] font-semibold">Nome</th>
                  <th className="px-3 py-2 text-[#94a3b8] font-semibold">E-mail</th>
                  <th className="px-3 py-2 text-[#94a3b8] font-semibold">Login</th>
                  <th className="px-3 py-2 text-[#94a3b8] font-semibold">Chapa</th>
                  <th className="px-3 py-2 text-[#94a3b8] font-semibold">Local</th>
                  <th className="px-3 py-2 text-[#94a3b8] font-semibold">Produto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {preview.slice(0, 50).map((r, i) => (
                  <tr key={`${r.email}-${i}`}>
                    <td className="px-3 py-1.5 text-white">{r.nome ?? '—'}</td>
                    <td className="px-3 py-1.5 text-[#94a3b8]">{r.email}</td>
                    <td className="px-3 py-1.5 text-[#94a3b8]">{r.login ?? '—'}</td>
                    <td className="px-3 py-1.5 text-[#94a3b8]">{r.chapa_matricula ?? '—'}</td>
                    <td className="px-3 py-1.5 text-[#94a3b8]">{r.local_nome ?? '—'}</td>
                    <td className="px-3 py-1.5 text-[#D4AF37]">{r.produto ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 text-sm bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importando...' : `Importar ${preview.length} registro(s)`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            {result.success} registro(s) importado(s) com sucesso.
          </div>

          {result.errors.length > 0 && (
            <div className="text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs space-y-1 max-h-40 overflow-auto">
              <p className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                {result.errors.length} erro(s):
              </p>
              {result.errors.map((e, i) => (
                <p key={i} className="pl-6">
                  {e}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={reset}
              className="text-xs text-[#94a3b8] hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Fechar resultado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
