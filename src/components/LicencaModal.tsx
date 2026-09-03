import { useState, useEffect, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LicencaUsuario, Software } from '@/types';

interface LicencaModalProps {
  item: Partial<LicencaUsuario> | null;
  onClose: () => void;
  onSave: (data: Partial<LicencaUsuario>) => Promise<void>;
}

const STATUS_OPTIONS = ['Ativo', 'Inativo', 'Pendente'];

export function LicencaModal({ item, onClose, onSave }: LicencaModalProps) {
  const [form, setForm] = useState<Partial<LicencaUsuario>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [softwares, setSoftwares] = useState<Software[]>([]);

  useEffect(() => {
    setForm(item ?? {});
    setError(null);
    (async () => {
      const { data, error: sbError } = await supabase.from('softwares').select('*').order('nome');
      if (!sbError && data) {
        setSoftwares(data as Software[]);
      }
    })();
  }, [item]);

  if (item === null) return null;

  // Extrai os fabricantes cadastrados de forma flexível (fabricante, tipo_licenca ou nome)
  const fabricantes = useMemo(() => {
    const set = new Set<string>();
    softwares.forEach((s: any) => {
      const fab = s.fabricante || s.tipo_licenca || s.software || s.nome;
      if (fab && typeof fab === 'string' && fab.trim()) {
        set.add(fab.trim());
      }
    });
    return [...set].sort();
  }, [softwares]);

  // Lista tipos de produto/perfil com base no fabricante selecionado
  const tiposPorFabricante = useMemo(() => {
    const fab = form.tipo_licenca;
    if (!fab) return [];
    const set = new Set<string>();
    softwares
      .filter((s: any) => {
        const itemFab = s.fabricante || s.tipo_licenca || s.software || s.nome;
        return itemFab?.toLowerCase() === fab.toLowerCase();
      })
      .forEach((s: any) => {
        const tipo = s.tipo_produto || s.categoria || s.perfil;
        if (tipo && typeof tipo === 'string' && tipo.trim()) {
          set.add(tipo.trim());
        }
      });
    return [...set].sort();
  }, [softwares, form.tipo_licenca]);

  // Lista produtos/licenças filtrados
  const produtosPorTipo = useMemo(() => {
    const fab = form.tipo_licenca;
    const tipo = form.tipo_produto;
    if (!fab) return [];

    const filtered = softwares.filter((s: any) => {
      const itemFab = s.fabricante || s.tipo_licenca || s.software || s.nome;
      return itemFab?.toLowerCase() === fab.toLowerCase();
    });

    const narrowed = tipo
      ? filtered.filter((s: any) => {
          const itemTipo = s.tipo_produto || s.categoria || s.perfil;
          return itemTipo?.toLowerCase() === tipo.toLowerCase();
        })
      : filtered;

    const result = new Set<string>();
    narrowed.forEach((s: any) => {
      const prodName = s.produto || s.nome || s.descricao;
      if (prodName && typeof prodName === 'string' && prodName.trim()) {
        result.add(prodName.trim());
      }
    });

    return [...result].sort();
  }, [softwares, form.tipo_licenca, form.tipo_produto]);

  function set(field: keyof LicencaUsuario, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFabricanteChange(v: string) {
    setForm((prev) => ({ ...prev, tipo_licenca: v, tipo_produto: '', produto: '' }));
  }

  function handleTipoChange(v: string) {
    setForm((prev) => ({ ...prev, tipo_produto: v, produto: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email) {
      setError('E-mail é obrigatório.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  const isNew = !item.id;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] sticky top-0 bg-[#001E33] z-10">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            {isNew ? 'Novo Registro' : 'Editar Registro'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-white transition-colors p-1.5 hover:bg-[#001726] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="E-mail *" type="email" value={form.email ?? ''} onChange={(v) => set('email', v)} required />
            <Field label="Nome" value={form.nome ?? ''} onChange={(v) => set('nome', v)} />
            <Field label="Matrícula" value={form.matricula ?? ''} onChange={(v) => set('matricula', v)} />
            <Field label="Departamento Raiz" value={form.departamento_raiz ?? ''} onChange={(v) => set('departamento_raiz', v)} />
            <Field label="Subdepartamento" value={form.sub_departamento ?? ''} onChange={(v) => set('sub_departamento', v)} />
          </div>

          {/* Licença Checkbox */}
          <div className="flex items-center gap-3 pt-2">
            <input
              id="possui_licenca"
              type="checkbox"
              checked={form.possui_licenca ?? false}
              onChange={(e) => set('possui_licenca', e.target.checked)}
              className="w-4 h-4 rounded border-[#1e293b] bg-[#001726] accent-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] cursor-pointer"
            />
            <label htmlFor="possui_licenca" className="text-[#94a3b8] text-sm font-medium cursor-pointer">
              Possui Licença
            </label>
          </div>

          {form.possui_licenca && (
            <div className="space-y-3 bg-[#001726] border border-[#1e293b] rounded-xl p-4">
              <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
                Vincular Licença
              </p>
              <SelectField
                label="Fabricante / Software Principal"
                value={form.tipo_licenca ?? ''}
                onChange={handleFabricanteChange}
                options={fabricantes}
                placeholder="Selecione..."
              />
              <SelectField
                label="Tipo de Produto"
                value={form.tipo_produto ?? ''}
                onChange={handleTipoChange}
                options={tiposPorFabricante}
                placeholder={form.tipo_licenca ? 'Selecione...' : 'Selecione o fabricante primeiro'}
                disabled={!form.tipo_licenca}
              />
              <SelectField
                label="Produto / Perfil Específico"
                value={form.produto ?? ''}
                onChange={(v) => set('produto', v)}
                options={produtosPorTipo}
                placeholder={
                  form.tipo_produto
                    ? 'Selecione...'
                    : form.tipo_licenca
                    ? 'Selecione ou escolha abaixo'
                    : 'Selecione o fabricante primeiro'
                }
                disabled={!form.tipo_licenca}
              />
            </div>
          )}

          <SelectField
            label="Status"
            value={form.status ?? 'Pendente'}
            onChange={(v) => set('status', v)}
            options={STATUS_OPTIONS}
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#1e293b] text-[#94a3b8] hover:text-white hover:bg-[#001726] transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold text-sm transition-colors disabled:opacity-60 cursor-pointer"
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

function Field({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[#94a3b8] text-xs font-medium block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder-[#64748b]"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, disabled }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-[#94a3b8] text-xs font-medium block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <option value="" className="bg-[#001E33] text-[#64748b]">{placeholder ?? 'Selecione...'}</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#001E33] text-white">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
