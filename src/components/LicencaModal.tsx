import { useEffect, useState } from 'react';
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
const PRODUTO_OPTIONS = ['Todos os Apps', 'Aplicativo Individual', 'Acrobat Pro DC'];

const inputClass = 'w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]';
const selectClass = 'w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-50';
const labelClass = 'text-[#94a3b8] text-xs font-semibold block mb-1';

export function LicencaModal({ item, onClose, onSave }: LicencaModalProps) {
  const [form, setForm] = useState<Partial<LicencaUsuario>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(item ?? { status: 'Ativo', possui_licenca: true, produto: 'Aplicativo Individual' });
    setError(null);
  }, [item]);

  if (item === null) return null;

  function setField<K extends keyof LicencaUsuario>(field: K, value: LicencaUsuario[K] | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email?.trim()) { setError('O e-mail é obrigatório.'); return; }
    if (!form.nome?.trim()) { setError('O nome completo é obrigatório.'); return; }
    if (!form.departamento_raiz?.trim()) { setError('O departamento é obrigatório.'); return; }
    if (!form.cargo?.trim()) { setError('O cargo é obrigatório.'); return; }
    if (!form.produto?.trim()) { setError('O produto é obrigatório.'); return; }
    if (!form.app_individual?.trim()) { setError('Informe pelo menos um software (ex: Illustrator | Photoshop).'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: Partial<LicencaUsuario> = {
        ...form,
        email: form.email.trim().toLowerCase(),
        login: form.email.split('@')[0].toLowerCase(),
        tipo_produto: form.app_individual,
      };
      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b] sticky top-0 bg-[#001E33] z-10">
          <h3 className="text-white font-bold text-base">{form.id ? 'Editar Licença / Usuário' : 'Novo Registro de Licença'}</h3>
          <button onClick={onClose} className="p-1.5 text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-md"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase">Dados do Colaborador</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>E-mail *</label><input type="email" required value={form.email ?? ''} onChange={(e) => setField('email', e.target.value)} className={inputClass} placeholder="usuario@senado.leg.br" /></div>
              <div><label className={labelClass}>Nome Completo *</label><input type="text" required value={form.nome ?? ''} onChange={(e) => setField('nome', e.target.value)} className={inputClass} placeholder="Nome Completo" /></div>
              <div><label className={labelClass}>Departamento *</label><input type="text" required value={form.departamento_raiz ?? ''} onChange={(e) => setField('departamento_raiz', e.target.value)} className={inputClass} placeholder="Ex: SF-OSE-DGER" /></div>
              <div><label className={labelClass}>Cargo *</label><input type="text" required value={form.cargo ?? ''} onChange={(e) => setField('cargo', e.target.value)} className={inputClass} placeholder="Ex: Analista de Sistemas" /></div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-[#1e293b]">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase">Licenciamento e Softwares</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Produto *</label>
                <select value={form.produto ?? 'Aplicativo Individual'} onChange={(e) => setField('produto', e.target.value)} className={selectClass}>
                  {PRODUTO_OPTIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Softwares (Tipo de produto) *</label>
                <input type="text" required value={form.app_individual ?? ''} onChange={(e) => setField('app_individual', e.target.value)} className={inputClass} placeholder="Ex: Illustrator | Photoshop" />
                <span className="text-[10px] text-[#94a3b8] mt-1 block">Separe múltiplos softwares com barra vertical (|)</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Status</label><select value={form.status ?? 'Ativo'} onChange={(e) => setField('status', e.target.value)} className={selectClass}>{STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}</select></div>
              <label className="flex items-center gap-2 bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2.5 mt-5"><input type="checkbox" checked={Boolean(form.possui_licenca)} onChange={(e) => setField('possui_licenca', e.target.checked)} className="w-4 h-4 accent-[#D4AF37]" /><span className="text-white text-sm">Possui licença ativa</span></label>
            </div>
          </section>

          {error && (<div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs"><AlertCircle className="w-4 h-4" />{error}</div>)}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
            <button type="button" onClick={onClose} className="text-sm text-[#94a3b8] px-4 py-2">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 text-sm bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg"><Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar Registro'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
