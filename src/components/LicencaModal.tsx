import { useEffect, useMemo, useState } from 'react';
import { X, Save, AlertCircle, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // ajuste o path se for diferente
import type { LicencaUsuario, Software, LocalTrabalho } from '@/types';

interface LicencaModalProps {
  item: Partial<LicencaUsuario> | null;
  softwares: Software[];
  locais: LocalTrabalho[];
  onClose: () => void;
  onSave: (data: Partial<LicencaUsuario>) => Promise<void>;
  onImportBatch?: (
    file: File,
    onProgress?: (progress: { current: number; total: number; percent: number; message: string }) => void
  ) => Promise<void>;
}

const STATUS_OPTIONS = ['Ativo', 'Pendente', 'Inativo'];
const ADOBE_APPS_INDIVIDUAIS = ['Photoshop','Illustrator','InDesign','Premiere Pro','Lightroom Classic','Adobe XD','Audition','Premiere Rush'];

const inputClass = 'w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]';
const selectClass = 'w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-50';
const labelClass = 'text-[#94a3b8] text-xs font-semibold block mb-1';

// SÓ O QUE EXISTE NO SEU BANCO - nunca manda local_nome
const ALLOWED_KEYS = ['nome','email','login','departamento_raiz','tipo_licenca','tipo_produto','produto','status','possui_licenca'] as const;

function normalizeRow(raw: Record<string, any>) {
  if(!raw.email) return null;
  const clean: any = {};
  clean.nome = raw.nome?.trim() || null;
  clean.email = raw.email?.toLowerCase().trim();
  clean.login = clean.email.split('@')[0].toLowerCase();
  clean.departamento_raiz = raw.setor?.toUpperCase().trim() || raw.departamento_raiz?.toUpperCase().trim() || null;
  clean.tipo_licenca = raw.tipo_licenca || 'Adobe';
  clean.tipo_produto = raw.tipo_produto || 'ADOBE PRO DC';
  clean.produto = raw.produto || 'Acrobat Pro DC';
  clean.status = raw.status || 'Ativo';
  clean.possui_licenca = String(raw.possui_licenca).toLowerCase() === 'true' || raw.possui_licenca === true;
  return clean;
}

function parseCSV(fileText: string) {
  const linhas = fileText.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
  const header = linhas[0].split(';').map(h => h.toLowerCase().trim());
  return linhas.slice(1).map(linha => {
    const vals = linha.split(';');
    const obj: any = {};
    header.forEach((h,i) => obj[h] = vals[i]?.trim());
    return obj;
  });
}

export function LicencaModal({ item, softwares, locais, onClose, onSave, onImportBatch }: LicencaModalProps) {
  const [form, setForm] = useState<Partial<LicencaUsuario>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number; percent: number; message: string } | null>(null);

  useEffect(() => {
    setForm(item?? {});
    setError(null);
    setBatchFile(null);
    setProgressInfo(null);
  }, [item]);

  if (item === null) return null;

  function setField<K extends keyof LicencaUsuario>(field: K, value: LicencaUsuario[K] | null) {
    setForm((prev) => ({...prev, [field]: value }));
  }

  const fabricantes = useMemo(() => {
    const set = new Set<string>(['Adobe']);
    (softwares || []).forEach((s) => { const fab = (s.fabricante || s.nome || '').trim(); if (fab) set.add(fab); });
    if (form.tipo_licenca) set.add(form.tipo_licenca);
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [softwares, form.tipo_licenca]);

  const softwaresDoFabricante = useMemo(() => {
    const fab = form.tipo_licenca?.trim().toLowerCase();
    if (!fab) return [];
    return (softwares || []).filter((s) => (s.fabricante || s.nome || '').trim().toLowerCase() === fab);
  }, [softwares, form.tipo_licenca]);

  const tipos = useMemo(() => {
    const set = new Set<string>();
    softwaresDoFabricante.forEach((s) => { if (s.tipo_produto?.trim()) set.add(s.tipo_produto.trim()); });
    if(set.size === 0) return ['ADOBE PRO DC', 'APLICATIVO INDIVIDUAL'];
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [softwaresDoFabricante]);

  const isAdobeIndividual = form.tipo_licenca?.toLowerCase() === 'adobe' && (form.tipo_produto === 'APLICATIVO INDIVIDUAL' || form.tipo_produto === 'Aplicativo Único / Individual');

  const produtos = useMemo(() => {
    if (isAdobeIndividual) return ADOBE_APPS_INDIVIDUAIS;
    const tipo = form.tipo_produto?.trim().toLowerCase();
    const filtrados = softwaresDoFabricante.filter((s) =>!tipo || (s.tipo_produto || '').trim().toLowerCase() === tipo);
    const list = filtrados.map((s) => s.produto || s.tipo_produto || s.nome).filter(Boolean) as string[];
    return list.length? list : ['Acrobat Pro DC'];
  }, [isAdobeIndividual, softwaresDoFabricante, form.tipo_produto]);

  function handleFabricante(v: string) { setForm((prev) => ({...prev, tipo_licenca: v || null, tipo_produto: null, produto: null, software_id: null })); }
  function handleTipo(v: string) { setForm((prev) => ({...prev, tipo_produto: v || null, produto: null, software_id: null })); }
  function handleProduto(val: string) {
    if (isAdobeIndividual) {
      const sw = (softwares || []).find((s) => (s.fabricante || '').toLowerCase() === 'adobe' && (s.tipo_produto === 'APLICATIVO INDIVIDUAL' || s.tipo_produto === 'Aplicativo Único / Individual'));
      setForm((prev) => ({...prev, software_id: sw?.id?? null, produto: val || null, possui_licenca: val? true : prev.possui_licenca }));
    } else {
      const sw = (softwares || []).find((s) => s.id === val);
      setForm((prev) => ({...prev, software_id: val || null, produto: sw?.produto?? sw?.nome?? val, tipo_produto: sw?.tipo_produto?? prev.tipo_produto?? null, tipo_licenca: sw?.fabricante?? prev.tipo_licenca?? null, possui_licenca: val? true : prev.possui_licenca }));
    }
  }

  function handleDownloadTemplate() {
    const csvContent =
      '\uFEFFnome;email;setor;tipo_licenca;tipo_produto;produto;status;possui_licenca\n' +
      'Ellen Virgínia Alves Torres;ELLENV@senado.leg.br;SF-GABSEN-GSIRAJA;Adobe;ADOBE PRO DC;Acrobat Pro DC;Ativo;true\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_licencas.csv';
    link.click();
  }

  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!batchFile) { setError('Selecione um arquivo CSV.'); return; }
    setImporting(true); setError(null);
    setProgressInfo({ current: 0, total: 0, percent: 0, message: 'Lendo arquivo...' });

    try {
      // Se o PAI mandou função, usa ela
      if(onImportBatch) {
        await onImportBatch(batchFile, (info) => setProgressInfo(info));
        setProgressInfo({ current: 100, total: 100, percent: 100, message: 'Concluído!' });
        setTimeout(() => onClose(), 1000);
        return;
      }

      // FALLBACK - faz importação direta sem depender do PAI (corrige seu erro)
      const text = await batchFile.text();
      const rawRows = parseCSV(text);
      const payload = rawRows.map(normalizeRow).filter(Boolean);

      if(payload.length === 0) throw new Error('Nenhuma linha com email válido.');

      setProgressInfo({ current: 0, total: payload.length, percent: 10, message: `Importando ${payload.length} registros...` });

      const { error: upsertError } = await supabase
       .from('licencas_usuarios')
       .upsert(payload, { onConflict: 'email' });

      if(upsertError) throw upsertError;

      setProgressInfo({ current: payload.length, total: payload.length, percent: 100, message: `${payload.length} importado(s)!` });
      setTimeout(() => onClose(), 1200);

    } catch (err: any) {
      setError(err.message || 'Erro ao processar importação.');
      setImporting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email?.trim()) { setError('O e-mail é obrigatório.'); return; }
    if (form.possui_licenca &&!form.produto) { setError('Selecione o produto.'); return; }
    setSaving(true); setError(null);
    try {
      const { local_nome, local_id, local, software,...cleanForm } = form as any;
      await onSave(cleanForm);
    } catch (err) { setError(err instanceof Error? err.message : 'Erro ao salvar.'); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b] sticky top-0 bg-[#001E33] z-10">
          <h3 className="text-white font-bold text-base">{form.id? 'Editar Licença' : 'Novo Registro / Importação em Lote'}</h3>
          <button onClick={onClose} className="p-1.5 text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-md"><X className="w-4 h-4" /></button>
        </div>

        {!form.id && (
          <div className="p-5 border-b border-[#1e293b] bg-[#001726]/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-[#D4AF37]" /><h4 className="text-xs font-bold text-[#D4AF37] uppercase">Importação em Lote - Modelo Atual</h4></div>
              <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-xs bg-[#1e293b] hover:bg-[#2e3b52] text-white px-3 py-1.5 rounded-lg border border-[#334155]"><Download className="w-3.5 h-3.5 text-[#D4AF37]" />Baixar Modelo (.csv)</button>
            </div>
            <p className="text-[#94a3b8] text-xs mb-3">Colunas: <code className="text-[#D4AF37]">nome;email;setor;tipo_licenca;tipo_produto;produto;status;possui_licenca</code> | Separador <strong className="text-white">;</strong></p>
            <form onSubmit={handleBatchSubmit} className="flex flex-col sm:flex-row gap-3">
              <input type="file" accept=".csv" onChange={(e) => setBatchFile(e.target.files?.[0]?? null)} disabled={importing} className="w-full text-xs text-[#94a3b8] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1e293b] file:text-white bg-[#001726] border border-[#1e293b] rounded-lg" />
              <button type="submit" disabled={!batchFile || importing} className="shrink-0 flex items-center gap-2 text-xs bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg disabled:opacity-50"><Upload className="w-3.5 h-3.5" />{importing? 'Importando...' : 'Importar Lote'}</button>
            </form>
            {importing && progressInfo && (
              <div className="mt-4 bg-[#00121E] border border-[#1e293b] p-3.5 rounded-lg">
                <div className="flex justify-between text-xs text-[#94a3b8]"><span>{progressInfo.message}</span><span className="font-bold text-[#D4AF37]">{progressInfo.percent}%</span></div>
                <div className="w-full bg-[#1e293b] h-2 rounded-full mt-2"><div className="bg-[#D4AF37] h-full transition-all" style={{ width: `${progressInfo.percent}%` }} /></div>
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase">Identificação Individual</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Nome completo</label><input type="text" value={form.nome?? ''} onChange={(e) => setField('nome', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>E-mail *</label><input type="email" required value={form.email?? ''} onChange={(e) => setField('email', e.target.value)} className={inputClass} /></div>
              <div className="md:col-span-2"><label className={labelClass}>Login</label><input type="text" value={form.login?? ''} onChange={(e) => setField('login', e.target.value)} className={inputClass} /></div>
            </div>
          </section>
          <section className="space-y-4 pt-4 border-t border-[#1e293b]">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase">Vínculo Setorial</h4>
            <div><label className={labelClass}>Departamento (setor)</label><input type="text" value={form.departamento_raiz?? ''} onChange={(e) => setField('departamento_raiz', e.target.value)} className={inputClass} /></div>
          </section>
          <section className="space-y-4 pt-4 border-t border-[#1e293b]">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase">Licença Atribuída</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={labelClass}>Fabricante</label><select value={form.tipo_licenca?? ''} onChange={(e) => handleFabricante(e.target.value)} className={selectClass}><option value="">Selecione...</option>{fabricantes.map((f) => (<option key={f} value={f}>{f}</option>))}</select></div>
              <div><label className={labelClass}>Tipo de Produto</label><select value={form.tipo_produto?? ''} onChange={(e) => handleTipo(e.target.value)} className={selectClass}><option value="">Selecione...</option>{tipos.map((t) => (<option key={t} value={t}>{t}</option>))}</select></div>
              <div><label className={labelClass}>Produto</label><select value={isAdobeIndividual? form.produto?? '' : form.software_id?? ''} onChange={(e) => handleProduto(e.target.value)} className={selectClass}><option value="">Selecione...</option>{isAdobeIndividual? produtos.map((p) => (<option key={p} value={p}>{p}</option>)) : softwaresDoFabricante.map((s) => (<option key={s.id} value={s.id}>{s.produto || s.nome}</option>))}</select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Status</label><select value={form.status?? 'Ativo'} onChange={(e) => setField('status', e.target.value)} className={selectClass}>{STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}</select></div>
              <label className="flex items-center gap-2 bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2.5"><input type="checkbox" checked={Boolean(form.possui_licenca)} onChange={(e) => setField('possui_licenca', e.target.checked)} className="w-4 h-4 accent-[#D4AF37]" /><span className="text-white text-sm">Possui licença ativa</span></label>
            </div>
          </section>
          {error && (<div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs"><AlertCircle className="w-4 h-4" />{error}</div>)}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
            <button type="button" onClick={onClose} className="text-sm text-[#94a3b8] px-4 py-2">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 text-sm bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg"><Save className="w-4 h-4" />{saving? 'Salvando...' : 'Salvar Registro'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
