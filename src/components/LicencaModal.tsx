import { useEffect, useMemo, useState } from 'react';
import { X, Save, AlertCircle, Download, FileSpreadsheet, Upload } from 'lucide-react';
import type { LicencaUsuario, Software, LocalTrabalho } from '@/types';

interface LicencaModalProps {
  item: Partial<LicencaUsuario> | null;
  softwares: Software[];
  locais: LocalTrabalho[];
  onClose: () => void;
  onSave: (data: Partial<LicencaUsuario>) => Promise<void>;
  onImportBatch?: (file: File) => Promise<void>;
}

const STATUS_OPTIONS = ['Ativo', 'Pendente', 'Inativo'];

const ADOBE_APPS_INDIVIDUAIS = [
  'Photoshop',
  'Illustrator',
  'InDesign',
  'Premiere Pro',
  'Lightroom Classic',
  'Adobe XD',
  'Audition',
  'Premiere Rush',
];

const inputClass =
  'w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]';
const selectClass =
  'w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-50';
const labelClass = 'text-[#94a3b8] text-xs font-semibold block mb-1';

export function LicencaModal({ item, softwares, locais, onClose, onSave, onImportBatch }: LicencaModalProps) {
  const [form, setForm] = useState<Partial<LicencaUsuario>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setForm(item ?? {});
    setError(null);
    setBatchFile(null);
  }, [item]);

  if (item === null) return null;

  function setField<K extends keyof LicencaUsuario>(field: K, value: LicencaUsuario[K] | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const fabricantes = useMemo(() => {
    const set = new Set<string>();
    (softwares || []).forEach((s) => {
      const fab = (s.fabricante || s.nome || '').trim();
      if (fab) set.add(fab);
    });
    if (form.tipo_licenca) set.add(form.tipo_licenca);
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [softwares, form.tipo_licenca]);

  const softwaresDoFabricante = useMemo(() => {
    const fab = form.tipo_licenca?.trim().toLowerCase();
    if (!fab) return [];
    return (softwares || []).filter(
      (s) => (s.fabricante || s.nome || '').trim().toLowerCase() === fab,
    );
  }, [softwares, form.tipo_licenca]);

  const tipos = useMemo(() => {
    const set = new Set<string>();
    softwaresDoFabricante.forEach((s) => {
      if (s.tipo_produto?.trim()) set.add(s.tipo_produto.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [softwaresDoFabricante]);

  const isAdobeIndividual =
    form.tipo_licenca?.toLowerCase() === 'adobe' &&
    (form.tipo_produto === 'APLICATIVO INDIVIDUAL' || form.tipo_produto === 'Aplicativo Único / Individual');

  const produtos = useMemo(() => {
    if (isAdobeIndividual) {
      return ADOBE_APPS_INDIVIDUAIS;
    }
    const tipo = form.tipo_produto?.trim().toLowerCase();
    const filtrados = softwaresDoFabricante.filter(
      (s) => !tipo || (s.tipo_produto || '').trim().toLowerCase() === tipo,
    );
    return filtrados.map((s) => s.produto || s.tipo_produto || s.nome).filter(Boolean) as string[];
  }, [isAdobeIndividual, softwaresDoFabricante, form.tipo_produto]);

  function handleFabricante(v: string) {
    setForm((prev) => ({
      ...prev,
      tipo_licenca: v || null,
      tipo_produto: null,
      produto: null,
      software_id: null,
    }));
  }

  function handleTipo(v: string) {
    setForm((prev) => ({ ...prev, tipo_produto: v || null, produto: null, software_id: null }));
  }

  function handleProduto(val: string) {
    if (isAdobeIndividual) {
      const sw = (softwares || []).find(
        (s) =>
          (s.fabricante || '').toLowerCase() === 'adobe' &&
          (s.tipo_produto === 'APLICATIVO INDIVIDUAL' || s.tipo_produto === 'Aplicativo Único / Individual'),
      );
      setForm((prev) => ({
        ...prev,
        software_id: sw?.id ?? null,
        produto: val || null,
        possui_licenca: val ? true : prev.possui_licenca,
      }));
    } else {
      const sw = (softwares || []).find((s) => s.id === val);
      setForm((prev) => ({
        ...prev,
        software_id: val || null,
        produto: sw?.produto ?? sw?.nome ?? null,
        tipo_produto: sw?.tipo_produto ?? prev.tipo_produto ?? null,
        tipo_licenca: sw?.fabricante ?? prev.tipo_licenca ?? null,
        possui_licenca: val ? true : prev.possui_licenca,
      }));
    }
  }

  function handleDownloadTemplate() {
    const csvContent = 
      '\uFEFFNOME;EMAIL;LOGIN;DEPARTAMENTO;FABRICANTE;TIPO_PRODUTO;PRODUTO;POSSUI_LICENCA;STATUS\n' +
      'João da Silva;joao.silva@senado.leg.br;jsilva;SEGRAF;Adobe;ADOBE PRO DC;Acrobat Pro DC;VERDADEIRO;Ativo\n' +
      'Maria Oliveira;maria.oliveira@senado.leg.br;moliveira;DILEG;Adobe;APLICATIVO INDIVIDUAL;Photoshop;VERDADEIRO;Ativo';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_licencas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!batchFile) {
      setError('Selecione um arquivo CSV preenchido para importar.');
      return;
    }
    if (!onImportBatch) {
      setError('A função de importação em lote não está configurada neste componente.');
      return;
    }

    setImporting(true);
    setError(null);
    try {
      await onImportBatch(batchFile);
      setBatchFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar a importação em lote.');
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.email?.trim()) {
      setError('O e-mail do colaborador é obrigatório.');
      return;
    }
    if (form.possui_licenca && !form.produto) {
      setError('Selecione o produto/perfil de licença atribuído ao colaborador.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o registro.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b] sticky top-0 bg-[#001E33] z-10">
          <h3 className="text-white font-bold text-base">
            {form.id ? 'Editar Licença do Colaborador' : 'Novo Registro / Importação em Lote'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-md transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!form.id && (
          <div className="p-5 border-b border-[#1e293b] bg-[#001726]/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#D4AF37]" />
                <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                  Importação de Alocações em Lote
                </h4>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 text-xs bg-[#1e293b] hover:bg-[#2e3b52] text-white font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer border border-[#334155]"
              >
                <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                Baixar Planilha Modelo (CSV)
              </button>
            </div>

            <p className="text-[#94a3b8] text-xs mb-3">
              Colunas do modelo: <code className="text-[#D4AF37]">NOME, EMAIL, LOGIN, DEPARTAMENTO, FABRICANTE, TIPO_PRODUTO, PRODUTO, POSSUI_LICENCA, STATUS</code>. Indicadores: <strong className="text-white">ADOBE PRO DC</strong>, <strong className="text-white">SUITE CC</strong> e <strong className="text-white">APLICATIVO INDIVIDUAL</strong>.
            </p>

            <form onSubmit={handleBatchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => setBatchFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-[#94a3b8] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1e293b] file:text-white hover:file:bg-[#334155] cursor-pointer bg-[#001726] border border-[#1e293b] rounded-lg"
              />
              <button
                type="submit"
                disabled={!batchFile || importing}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 text-xs bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {importing ? 'Importando...' : 'Importar Lote'}
              </button>
            </form>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              Identificação Individual do Colaborador
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome completo</label>
                <input
                  type="text"
                  placeholder="Ex: Maria Souza"
                  value={form.nome ?? ''}
                  onChange={(e) => setField('nome', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@senado.leg.br"
                  value={form.email ?? ''}
                  onChange={(e) => setField('email', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Login de rede</label>
                <input
                  type="text"
                  placeholder="Ex: msouza"
                  value={form.login ?? ''}
                  onChange={(e) => setField('login', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-[#1e293b]">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              Vínculo Setorial
            </h4>

            <div>
              <label className={labelClass}>Departamento</label>
              <input
                type="text"
                placeholder="Ex: SEGRAF"
                value={form.departamento_raiz ?? ''}
                onChange={(e) => setField('departamento_raiz', e.target.value)}
                className={inputClass}
              />
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-[#1e293b]">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              Licença Atribuída
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Fabricante</label>
                <select
                  value={form.tipo_licenca ?? ''}
                  onChange={(e) => handleFabricante(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Selecione...</option>
                  {fabricantes.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Tipo de Produto (Indicador)</label>
                <select
                  value={form.tipo_produto ?? ''}
                  onChange={(e) => handleTipo(e.target.value)}
                  disabled={!form.tipo_licenca || tipos.length === 0}
                  className={selectClass}
                >
                  <option value="">{tipos.length ? 'Selecione...' : 'Sem tipos cadastrados'}</option>
                  {tipos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Produto / Perfil</label>
                <select
                  value={isAdobeIndividual ? form.produto ?? '' : form.software_id ?? ''}
                  onChange={(e) => handleProduto(e.target.value)}
                  disabled={!form.tipo_licenca || !form.tipo_produto}
                  className={selectClass}
                >
                  <option value="">Selecione...</option>
                  {isAdobeIndividual
                    ? produtos.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))
                    : softwaresDoFabricante
                        .filter(
                          (s) =>
                            !form.tipo_produto ||
                            (s.tipo_produto || '').trim().toLowerCase() ===
                              form.tipo_produto.trim().toLowerCase(),
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.produto || s.tipo_produto || s.nome}
                          </option>
                        ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className={labelClass}>Status do Acesso</label>
                <select
                  value={form.status ?? 'Ativo'}
                  onChange={(e) => setField('status', e.target.value)}
                  className={selectClass}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={Boolean(form.possui_licenca)}
                  onChange={(e) => setField('possui_licenca', e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37]"
                />
                <span className="text-white text-sm font-medium">Possui licença ativa</span>
              </label>
            </div>
          </section>

          {error && (
            <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#94a3b8] hover:text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 text-sm bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
