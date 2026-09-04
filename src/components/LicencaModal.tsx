import { useEffect, useMemo, useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import type { LicencaUsuario, Software, LocalTrabalho } from '@/types';

interface LicencaModalProps {
  item: Partial<LicencaUsuario> | null;
  softwares: Software[];
  locais: LocalTrabalho[];
  onClose: () => void;
  onSave: (data: Partial<LicencaUsuario>) => Promise<void>;
}

const STATUS_OPTIONS = ['Ativo', 'Pendente', 'Inativo'];

const inputClass =
  'w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]';
const selectClass =
  'w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-50';
const labelClass = 'text-[#94a3b8] text-xs font-semibold block mb-1';

export function LicencaModal({ item, softwares, locais, onClose, onSave }: LicencaModalProps) {
  const [form, setForm] = useState<Partial<LicencaUsuario>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(item ?? {});
    setError(null);
  }, [item]);

  if (item === null) return null;

  function setField<K extends keyof LicencaUsuario>(field: K, value: LicencaUsuario[K] | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /* --- Cascata Fabricante -> Tipo de Produto -> Produto --- */

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

  const produtos = useMemo(() => {
    const tipo = form.tipo_produto?.trim().toLowerCase();
    return softwaresDoFabricante.filter(
      (s) => !tipo || (s.tipo_produto || '').trim().toLowerCase() === tipo,
    );
  }, [softwaresDoFabricante, form.tipo_produto]);

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

  function handleProduto(softwareId: string) {
    const sw = (softwares || []).find((s) => s.id === softwareId);
    setForm((prev) => ({
      ...prev,
      software_id: softwareId || null,
      produto: sw?.produto ?? sw?.nome ?? null,
      tipo_produto: sw?.tipo_produto ?? prev.tipo_produto ?? null,
      tipo_licenca: sw?.fabricante ?? prev.tipo_licenca ?? null,
      possui_licenca: softwareId ? true : prev.possui_licenca,
    }));
  }

  function handleLocal(localId: string) {
    const local = (locais || []).find((l) => l.id === localId);
    setForm((prev) => ({
      ...prev,
      local_id: localId || null,
      local_nome: local?.nome ?? null,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.email?.trim()) {
      setError('O e-mail do colaborador é obrigatório.');
      return;
    }
    if (form.possui_licenca && !form.software_id) {
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
            {form.id ? 'Editar Licença do Colaborador' : 'Novo Registro de Licença'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-md transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Identificação do colaborador */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              Identificação do Colaborador
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

              <div>
                <label className={labelClass}>Login de rede</label>
                <input
                  type="text"
                  placeholder="Ex: msouza"
                  value={form.login ?? ''}
                  onChange={(e) => setField('login', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Chapa / Matrícula</label>
                <input
                  type="text"
                  placeholder="Ex: 123456"
                  value={form.chapa_matricula ?? form.matricula ?? ''}
                  onChange={(e) => setField('chapa_matricula', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Vínculo local e setorial */}
          <section className="space-y-4 pt-4 border-t border-[#1e293b]">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              Vínculo Local e Setorial
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Local de Trabalho / Unidade</label>
                <select
                  value={form.local_id ?? ''}
                  onChange={(e) => handleLocal(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Não informado</option>
                  {(locais || []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>

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

              <div>
                <label className={labelClass}>Setor / Subdepartamento</label>
                <input
                  type="text"
                  placeholder="Ex: COATEN"
                  value={form.sub_departamento ?? ''}
                  onChange={(e) => setField('sub_departamento', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Licença atribuída */}
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
                <label className={labelClass}>Tipo de Produto</label>
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
                  value={form.software_id ?? ''}
                  onChange={(e) => handleProduto(e.target.value)}
                  disabled={!form.tipo_licenca}
                  className={selectClass}
                >
                  <option value="">Selecione...</option>
                  {produtos.map((s) => (
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
                  value={form.status ?? 'Pendente'}
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
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
