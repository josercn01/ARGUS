import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { LicencaUsuario } from '@/types';

interface ImportCSVProps {
  onImport: (rows: Partial<LicencaUsuario>[]) => Promise<{ success: number; errors: string[] }>;
}

const TEMPLATE_HEADERS = ['Email', 'NomeCompleto', 'Departamento', 'Cargo', 'Produto', 'Tipo de produto'] as const;

const TEMPLATE_EXAMPLES = [
  {
    Email: 'aldreen.marques@senado.leg.br',
    NomeCompleto: 'Aldreen Elohin Portela Marques',
    Departamento: 'SF-OSE-DGER-SPATR-COAPAT-SESIN',
    Cargo: 'Terceirizado - Técnico Designer Gráfico De Sinalização',
    Produto: 'Aplicativo Individual',
    'Tipo de produto': 'Illustrator | Photoshop',
  },
];

export function ImportCSV({ onImport }: ImportCSVProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<LicencaUsuario>[]>([]);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const csvContent = '\uFEFFEmail;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto\n' +
      'aldreen.marques@senado.leg.br;Aldreen Elohin Portela Marques;SF-OSE-DGER-SPATR-COAPAT-SESIN;Terceirizado - Técnico Designer Gráfico De Sinalização;Aplicativo Individual;Illustrator | Photoshop\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_licencas.csv';
    link.click();
  }

  async function readFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const cleanText = text.replace(/^\uFEFF/, '').trim();
      const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error('Arquivo vazio ou sem linhas de dados.');

      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());

      const required = ['email', 'nomecompleto', 'departamento', 'cargo', 'produto', 'tipo de produto'];
      const missing = required.filter(req => !headers.some(h => h.replace(/\s+/g, '') === req.replace(/\s+/g, '')));
      if (missing.length > 0) {
        throw new Error(`Colunas ausentes no cabeçalho: ${missing.join(', ')}`);
      }

      const rows: Partial<LicencaUsuario>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h.replace(/\s+/g, '')] = values[idx] || '';
        });

        const email = (rowObj['email'] || '').trim().toLowerCase();
        if (!email) continue;

        rows.push({
          email,
          nome: rowObj['nomecompleto'] || null,
          login: email.split('@')[0],
          departamento_raiz: (rowObj['departamento'] || '').toUpperCase() || null,
          cargo: rowObj['cargo'] || null,
          produto: rowObj['produto'] || 'Aplicativo Individual',
          tipo_produto: rowObj['tipodeproduto'] || '',
          app_individual: rowObj['tipodeproduto'] || '',
          status: 'Ativo',
          possui_licenca: true,
        });
      }

      if (rows.length === 0) throw new Error('Nenhuma linha válida encontrada.');
      setPreview(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ler arquivo.');
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
      if (res.success > 0) setPreview([]);
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
            <Upload className="w-4 h-4 text-[#D4AF37]" /> Importar Alocações (CSV)
          </h3>
          <p className="text-[#94a3b8] text-xs mt-0.5">Formato: Email;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto</p>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-2 text-xs text-[#94a3b8] hover:text-[#D4AF37] border border-[#1e293b] hover:border-[#D4AF37]/40 px-3 py-2 rounded-lg transition-all cursor-pointer">
          <Download className="w-3.5 h-3.5" /> Baixar modelo
        </button>
      </div>
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) readFile(file); }} onClick={() => inputRef.current?.click()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragging ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#1e293b] hover:border-[#D4AF37]/40'}`}>
        <FileText className="w-6 h-6 text-[#D4AF37] mx-auto mb-2" />
        <p className="text-white text-sm font-medium">{fileName ?? 'Arraste a planilha CSV aqui ou clique para selecionar'}</p>
        <p className="text-[#64748b] text-xs mt-1">Colunas: {TEMPLATE_HEADERS.join('; ')}</p>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) readFile(file); }} />
      </div>
      {error && <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs"><AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />{error}</div>}
      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between"><p className="text-[#94a3b8] text-xs"><span className="text-[#D4AF37] font-bold">{preview.length}</span> registro(s) prontos.</p><button onClick={reset} className="p-1 text-[#94a3b8] hover:text-rose-400 rounded-md"><X className="w-4 h-4" /></button></div>
          <div className="max-h-48 overflow-auto border border-[#1e293b] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#001726] sticky top-0"><tr><th className="px-3 py-2 text-[#94a3b8]">Nome</th><th className="px-3 py-2 text-[#94a3b8]">E-mail</th><th className="px-3 py-2 text-[#94a3b8]">Cargo</th><th className="px-3 py-2 text-[#94a3b8]">Softwares</th></tr></thead>
              <tbody className="divide-y divide-[#1e293b]">{preview.slice(0, 50).map((r, i) => (<tr key={`${r.email}-${i}`}><td className="px-3 py-1.5 text-white">{r.nome ?? '—'}</td><td className="px-3 py-1.5 text-[#94a3b8]">{r.email}</td><td className="px-3 py-1.5 text-[#94a3b8]">{r.cargo ?? '—'}</td><td className="px-3 py-1.5 text-emerald-300">{r.app_individual ?? '—'}</td></tr>))}</tbody>
            </table>
          </div>
          <div className="flex justify-end"><button onClick={handleImport} disabled={importing} className="flex items-center gap-2 text-sm bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg disabled:opacity-50"><Upload className="w-4 h-4" />{importing ? 'Importando...' : `Importar ${preview.length}`}</button></div>
        </div>
      )}
      {result && <div className="space-y-2"><div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs"><CheckCircle className="w-4 h-4 text-emerald-400" />{result.success} importado(s).</div>{result.errors.length > 0 && <div className="text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs max-h-40 overflow-auto">{result.errors.map((e, i) => (<p key={i}>{e}</p>))}</div>}</div>}
    </div>
  );
}
