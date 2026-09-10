import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { LicencaUsuario } from '@/types';

interface ImportCSVProps {
  onImport: (rows: Partial<LicencaUsuario>[]) => Promise<{ success: number; errors: string[] }>;
}

// Modelo exato do seu CSV
const TEMPLATE_HEADERS = ['nome','email','setor','tipo_licenca','tipo_produto','produto','status','possui_licenca'] as const;

const TEMPLATE_EXAMPLE = {
  nome: 'Ellen Virginia Alves Torres',
  email: 'ELLENV@senado.leg.br',
  setor: 'SF-GABSEN-GSIRAJA',
  tipo_licenca: 'Adobe',
  tipo_produto: 'ADOBE PRO DC',
  produto: 'Acrobat Pro DC',
  status: 'Ativo',
  possui_licenca: 'true',
};

// Colunas que EXISTEM no seu banco licencas_usuarios - só isso vai pro insert
const ALLOWED_KEYS = ['nome','email','login','departamento_raiz','tipo_licenca','tipo_produto','produto','status','possui_licenca'] as const;

function normalizeRow(rawRow: Record<string, unknown>): Partial<LicencaUsuario> {
  const row: Record<string, unknown> = {};

  Object.keys(rawRow).forEach((key) => {
    const k = key.toLowerCase().trim().replace(/\s+/g, '_');
    const val = rawRow[key]!= null? String(rawRow[key]).trim() : null;
    if (!val) return;

    switch (k) {
      case 'nome': row.nome = val; break;
      case 'email':
      case 'e-mail':
        row.email = val.toLowerCase();
        row.login = val.split('@')[0].toLowerCase();
        break;
      case 'login': row.login = val.toLowerCase(); break;
      case 'setor':
      case 'departamento':
      case 'departamento_raiz':
        row.departamento_raiz = val.toUpperCase();
        break;
      case 'tipo_licenca':
      case 'fabricante':
        row.tipo_licenca = 'Adobe';
        break;
      case 'tipo_produto':
        row.tipo_produto = val;
        break;
      case 'produto':
        row.produto = val.toLowerCase() === 'adobe'? 'Acrobat Pro DC' : val;
        break;
      case 'status':
        row.status = val;
        break;
      case 'possui_licenca':
        row.possui_licenca = true;
        break;
      // NUNCA cria local_nome ou local_id aqui
    }
  });

  if (row.email && row.possui_licenca === undefined) row.possui_licenca = true;
  if (row.email &&!row.status) row.status = 'Ativo';
  if (row.email &&!row.tipo_licenca) row.tipo_licenca = 'Adobe';
  if (row.email &&!row.tipo_produto) row.tipo_produto = 'ADOBE PRO DC';
  if (row.email &&!row.produto) row.produto = 'Acrobat Pro DC';

  // FILTRA SÓ O QUE EXISTE NO BANCO
  const clean: Record<string, unknown> = {};
  ALLOWED_KEYS.forEach(key => {
    if (row[key]!== undefined) clean[key] = row[key];
  });

  return clean as Partial<LicencaUsuario>;
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
    XLSX.writeFile(wb, 'modelo_importacao_licencas.xlsx');
  }

  async function readFile(file: File) {
    setError(null); setResult(null); setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
      const rows = raw.map(normalizeRow).filter((r) => Boolean(r.email));
      if (rows.length === 0) setError('Nenhuma linha com e-mail válido.');
      setPreview(rows);
    } catch (err) {
      setError(err instanceof Error? err.message : 'Erro ao ler arquivo.');
      setPreview([]);
    }
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      // Garante de novo que não vai local_nome
      const payload = preview.map(r => {
        const { local_nome, local_id, local,...rest } = r as any;
        return rest;
      });
      const res = await onImport(payload);
      setResult(res);
      if(res.success > 0) setPreview([]);
    } catch (err) {
      setError(err instanceof Error? err.message : 'Erro durante a importação.');
    } finally { setImporting(false); }
  }

  function reset() {
    setPreview([]); setResult(null); setFileName(null); setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-bold text-sm flex items-center gap-2"><Upload className="w-4 h-4 text-[#D4AF37]" />Importar Alocações</h3>
          <p className="text-[#94a3b8] text-xs mt-0.5">Modelo atual: nome;email;setor;tipo_licenca;tipo_produto;produto;status;possui_licenca</p>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-2 text-xs text-[#94a3b8] hover:text-[#D4AF37] border border-[#1e293b] hover:border-[#D4AF37]/40 px-3 py-2 rounded-lg transition-all cursor-pointer"><Download className="w-3.5 h-3.5" />Baixar modelo</button>
      </div>
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) readFile(file); }} onClick={() => inputRef.current?.click()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragging? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#1e293b] hover:border-[#D4AF37]/40'}`}>
        <FileText className="w-6 h-6 text-[#D4AF37] mx-auto mb-2" />
        <p className="text-white text-sm font-medium">{fileName?? 'Arraste a planilha aqui ou clique para selecionar'}</p>
        <p className="text-[#64748b] text-xs mt-1">Colunas: {TEMPLATE_HEADERS.join('; ')}</p>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) readFile(file); }} />
      </div>
      {error && <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs"><AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />{error}</div>}
      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between"><p className="text-[#94a3b8] text-xs"><span className="text-[#D4AF37] font-bold">{preview.length}</span> registro(s) prontos.</p><button onClick={reset} className="p-1 text-[#94a3b8] hover:text-rose-400 rounded-md"><X className="w-4 h-4" /></button></div>
          <div className="max-h-48 overflow-auto border border-[#1e293b] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#001726] sticky top-0"><tr><th className="px-3 py-2 text-[#94a3b8]">Nome</th><th className="px-3 py-2 text-[#94a3b8]">E-mail</th><th className="px-3 py-2 text-[#94a3b8]">Setor</th><th className="px-3 py-2 text-[#94a3b8]">Produto</th></tr></thead>
              <tbody className="divide-y divide-[#1e293b]">{preview.slice(0, 50).map((r, i) => (<tr key={`${r.email}-${i}`}><td className="px-3 py-1.5 text-white">{r.nome?? '—'}</td><td className="px-3 py-1.5 text-[#94a3b8]">{r.email}</td><td className="px-3 py-1.5 text-[#94a3b8]">{(r as any).departamento_raiz?? '—'}</td><td className="px-3 py-1.5 text-[#D4AF37]">{r.produto?? '—'}</td></tr>))}</tbody>
            </table>
          </div>
          <div className="flex justify-end"><button onClick={handleImport} disabled={importing} className="flex items-center gap-2 text-sm bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg disabled:opacity-50"><Upload className="w-4 h-4" />{importing? 'Importando...' : `Importar ${preview.length}`}</button></div>
        </div>
      )}
      {result && <div className="space-y-2"><div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs"><CheckCircle className="w-4 h-4 text-emerald-400" />{result.success} importado(s).</div>{result.errors.length > 0 && <div className="text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs max-h-40 overflow-auto">{result.errors.map((e, i) => (<p key={i}>{e}</p>))}</div>}</div>}
    </div>
  );
}
