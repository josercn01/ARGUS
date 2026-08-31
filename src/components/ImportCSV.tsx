import { useState, useRef } from 'react';
import { Upload, Download, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { LicencaUsuario } from '@/types';

interface ImportCSVProps {
  onImport: (rows: Partial<LicencaUsuario>[]) => Promise<{ success: number; errors: string[] }>;
}

export function ImportCSV({ onImport }: ImportCSVProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Partial<LicencaUsuario>[]>([]);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function parseRows(text: string): Partial<LicencaUsuario>[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (h === 'possui_licenca') {
          row[h] = values[i]?.toLowerCase() === 'true' || values[i] === '1';
        } else {
          row[h] = values[i] || null;
        }
      });
      return row as Partial<LicencaUsuario>;
    });
  }

  function parseWorkbook(data: ArrayBuffer): Partial<LicencaUsuario>[] {
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return [];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    return json.map((row) => {
      const mapped: Record<string, unknown> = {};
      const keys = Object.keys(row);
      keys.forEach((k) => {
        const lower = k.toLowerCase().trim();
        if (lower === 'possui_licenca') {
          mapped[lower] = String(row[k]).toLowerCase() === 'true' || row[k] === 1 || row[k] === '1';
        } else {
          mapped[lower] = row[k] ?? null;
        }
      });
      return mapped as Partial<LicencaUsuario>;
    });
  }

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    const isXlsx = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as ArrayBuffer;
        const rows = parseWorkbook(data);
        setPreview(rows.slice(0, 5));
      };
      reader.readAsArrayBuffer(f);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = parseRows(text);
        setPreview(rows.slice(0, 5));
      };
      reader.readAsText(f, 'UTF-8');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nome', 'Email', 'Matricula', 'Departamento', 'Subdepartamento', 'Licenca', 'TIPO_PRODUTO', 'PRODUTO', 'Status'],
      ['João Silva', 'joao.silva@empresa.com.br', '12345', 'SECOM', 'Redação', 'Adobe', 'Creative Cloud', 'Photoshop', 'Ativo'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_sereti.xlsx');
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result as ArrayBuffer;
        const rows = parseWorkbook(data);
        const res = await onImport(rows);
        setResult(res);
        setImporting(false);
        if (res.errors.length === 0) { setFile(null); setPreview([]); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const rows = parseRows(text);
        const res = await onImport(rows);
        setResult(res);
        setImporting(false);
        if (res.errors.length === 0) { setFile(null); setPreview([]); }
      };
      reader.readAsText(file, 'UTF-8');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#323130] font-semibold text-lg">Importação de Dados</h2>
          <p className="text-[#605E5C] text-sm mt-0.5">Importe em massa via arquivo Excel (.xlsx) ou CSV.</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm text-[#0078D4] border border-[#0078D4]/30 hover:bg-[#DEECF9] px-4 py-2 rounded-md transition-colors"
        >
          <Download className="w-4 h-4" />
          Baixar Modelo (.xlsx)
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${
          dragging
            ? 'border-[#0078D4] bg-[#DEECF9]'
            : 'border-[#E1DFDD] hover:border-[#0078D4]/40 hover:bg-[#F5F5F5]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <Upload className={`w-10 h-10 mb-3 ${dragging ? 'text-[#0078D4]' : 'text-[#A19F9D]'}`} />
        <p className="text-[#605E5C] text-sm font-medium">
          {file ? file.name : 'Arraste o arquivo aqui ou clique para selecionar'}
        </p>
        <p className="text-[#A19F9D] text-xs mt-1">Formatos suportados: .xlsx, .csv</p>
      </div>

      {preview.length > 0 && (
        <div className="bg-[#F5F5F5] border border-[#E1DFDD] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E1DFDD]">
            <p className="text-[#605E5C] text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0078D4]" />
              Pré-visualização (primeiras {preview.length} linhas)
            </p>
            <button onClick={() => { setFile(null); setPreview([]); setResult(null); }}
              className="text-[#605E5C] hover:text-[#323130] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[#E1DFDD] bg-white">
                <tr>
                  {['E-mail', 'Nome', 'Matrícula', 'Departamento', 'Subdep.', 'Licença', 'Tipo Produto', 'Produto', 'Status'].map((h) => (
                    <th key={h} className="text-left text-[#605E5C] px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1DFDD]">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-[#F5F5F5]">
                    <td className="px-3 py-2 text-[#605E5C]">{row.email ?? '—'}</td>
                    <td className="px-3 py-2 text-[#323130]">{row.nome ?? '—'}</td>
                    <td className="px-3 py-2 text-[#605E5C]">{row.matricula ?? '—'}</td>
                    <td className="px-3 py-2 text-[#605E5C]">{row.departamento_raiz ?? '—'}</td>
                    <td className="px-3 py-2 text-[#605E5C]">{row.sub_departamento ?? '—'}</td>
                    <td className="px-3 py-2 text-[#605E5C]">{row.tipo_licenca ?? '—'}</td>
                    <td className="px-3 py-2 text-[#605E5C]">{row.tipo_produto ?? '—'}</td>
                    <td className="px-3 py-2 text-[#0078D4]">{row.produto ?? '—'}</td>
                    <td className="px-3 py-2 text-[#605E5C]">{row.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className={`rounded-lg border p-4 ${result.errors.length === 0 ? 'bg-[#DFF6DD] border-[#107C10]/20' : 'bg-[#FED9CC] border-[#CA5010]/20'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.errors.length === 0
              ? <CheckCircle className="w-5 h-5 text-[#107C10]" />
              : <AlertCircle className="w-5 h-5 text-[#CA5010]" />}
            <p className="text-[#323130] text-sm font-medium">
              {result.success} registro(s) importado(s) com sucesso
              {result.errors.length > 0 ? `, ${result.errors.length} com erro` : ''}
            </p>
          </div>
          {result.errors.length > 0 && (
            <ul className="text-[#A4262C] text-xs space-y-0.5 mt-2 max-h-32 overflow-y-auto">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {file && !result && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          <Upload className="w-4 h-4" />
          {importing ? 'Importando...' : 'Confirmar Importação'}
        </button>
      )}
    </div>
  );
}
