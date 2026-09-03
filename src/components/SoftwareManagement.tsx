import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Plus, Pencil, Trash2, X, Save, AlertCircle } from 'lucide-react';
import type { Software } from '@/types';

export function SoftwareManagement() {
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState<Partial<Software> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.from('softwares').select('*').order('nome');
    if (err) {
      setError(err.message);
    } else if (data) {
      setSoftwares(data as Software[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(data: Partial<Software>) {
    const payload = {
      nome: data.nome,
      fabricante: data.fabricante ?? null,
      tipo_produto: data.tipo_produto ?? null,
      produto: data.produto ?? null,
      descricao: data.descricao ?? null,
      qtd_licencas: data.qtd_licencas ?? 0,
      quantidade_total: data.qtd_licencas ?? 0,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error: err } = await supabase.from('softwares').update(payload).eq('id', data.id);
      if (err) throw new Error(err.message);
    } else {
      const { error: err } = await supabase.from('softwares').insert(payload);
      if (err) throw new Error(err.message);
    }

    setModalItem(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Confirmar exclusão deste software?')) return;
    const { error: err } = await supabase.from('softwares').delete().eq('id', id);
    if (err) setError(err.message);
    else await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <Package className="w-5 h-5 text-[#D4AF37]" />
            Gerenciar Softwares
          </h2>
          <p className="text-[#94a3b8] text-sm mt-0.5">
            Cadastre softwares, fabricantes, perfis e quantitativos contratados.
          </p>
        </div>
        <button
          onClick={() => setModalItem({})}
          className="flex items-center gap-2 text-sm bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Software
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          {error}
        </div>
      )}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#001726] border-b border-[#1e293b]">
              <tr>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Fabricante</th>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Software</th>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Tipo de Produto</th>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Produto / Perfil</th>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Licenças</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center text-[#94a3b8] py-8 text-sm">
                    Carregando softwares...
                  </td>
                </tr>
              )}
              {!loading && softwares.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[#94a3b8] py-8 text-sm">
                    Nenhum software cadastrado.
                  </td>
                </tr>
              )}
              {!loading &&
                softwares.map((s) => (
                  <tr key={s.id} className="hover:bg-[#001726]/50 transition-colors">
                    <td className="px-4 py-3 text-[#94a3b8] text-sm whitespace-nowrap">{s.fabricante ?? '—'}</td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{s.nome}</td>
                    <td className="px-4 py-3 text-[#94a3b8] text-sm whitespace-nowrap">{s.tipo_produto ?? '—'}</td>
                    <td className="px-4 py-3 text-[#D4AF37] text-sm font-medium whitespace-nowrap">{s.produto ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">
                        {s.qtd_licencas ?? s.quantidade_total ?? s.quantidade ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModalItem(s)}
                          className="p-1.5 text-[#94a3b8] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-md transition-all"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalItem !== null && (
        <SoftwareModal item={modalItem} onClose={() => setModalItem(null)} onSave={handleSave} />
      )}
    </div>
  );
}

/* --- MODAL DE SOFTWARE --- */

const FABRICANTES = ['Adobe', 'Outros Softwares'];
const ADOBE_TIPOS = ['Adobe Acrobat Pro DC', 'Creative Cloud (Suite CC)', 'Aplicativo Único / Individual'];
const ADOBE_APPS_INDIVIDUAIS = [
  'Adobe Lightroom Classic: Aplicativo único - Lightroom Classic',
  'Adobe XD: Aplicativo único - XD',
  'Audição: Aplicativo individual - Audicão',
  'Illustrator: Aplicativo único - Illustrator',
  'InDesign: Aplicativo único - InDesign',
  'Photoshop: Aplicativo único - Photoshop',
  'Premiere Pro: Aplicativo único - Premiere',
  'Premiere Rush: Aplicativo Único - Rush',
];

function SoftwareModal({
  item,
  onClose,
  onSave,
}: {
  item: Partial<Software>;
  onClose: () => void;
  onSave: (data: Partial<Software>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Software>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(item ?? {});
    setError(null);
  }, [item]);

  function setField(field: keyof Software, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFabricanteChange(v: string) {
    setForm((prev) => ({
      ...prev,
      fabricante: v,
      nome: v === 'Adobe' ? 'Adobe' : '',
      tipo_produto: '',
      produto: '',
    }));
  }

  function handleTipoChange(v: string) {
    setForm((prev) => {
      const isAdobe = prev.fabricante?.toLowerCase() === 'adobe';
      return {
        ...prev,
        tipo_produto: v,
        produto: isAdobe && v !== 'Aplicativo Único / Individual' ? v : '',
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isAdobe = form.fabricante?.toLowerCase() === 'adobe';
    const isOutros = form.fabricante === 'Outros Softwares';
    const isAdobeIndividual = isAdobe && form.tipo_produto === 'Aplicativo Único / Individual';

    if (!form.fabricante) {
      setError('Selecione o Fabricante / Software Principal.');
      return;
    }

    if (isAdobe && !form.tipo_produto) {
      setError('Selecione o Tipo de Produto.');
      return;
    }

    if (isAdobeIndividual && !form.produto) {
      setError('Selecione o Aplicativo Único Individual.');
      return;
    }

    if (isOutros && !form.nome?.trim()) {
      setError('Nome do software é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o software.');
    } font-semibold {
      setSaving(false);
    }
  }

  const isAdobe = form.fabricante?.toLowerCase() === 'adobe';
  const isOutros = form.fabricante === 'Outros Softwares';
  const isAdobeIndividual = isAdobe && form.tipo_produto === 'Aplicativo Único / Individual';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] sticky top-0 bg-[#001E33] z-10">
          <h2 className="text-white font-bold text-lg">
            {!item.id ? 'Novo Software' : 'Editar Software'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-white transition-colors p-1.5 hover:bg-[#001726] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider block mb-1">
              Fabricante / Software Principal *
            </label>
            <select
              value={form.fabricante ?? ''}
              onChange={(e) => handleFabricanteChange(e.target.value)}
              className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="">Selecione...</option>
              {FABRICANTES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {isAdobe && (
            <div className="space-y-4 bg-[#001726] border border-[#1e293b] rounded-lg p-4">
              <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
                Configuração Adobe
              </p>
              <div>
                <label className="text-[#94a3b8] text-xs font-semibold block mb-1">
                  Tipo de Produto *
                </label>
                <select
                  value={form.tipo_produto ?? ''}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  className="w-full bg-[#001E33] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Selecione o tipo...</option>
                  {ADOBE_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {isAdobeIndividual && (
                <div>
                  <label className="text-[#94a3b8] text-xs font-semibold block mb-1">
                    Aplicativo Específico *
                  </label>
                  <select
                    value={form.produto ?? ''}
                    onChange={(e) => setField('produto', e.target.value)}
                    className="w-full bg-[#001E33] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">Selecione o aplicativo...</option>
                    {ADOBE_APPS_INDIVIDUAIS.map((app) => (
                      <option key={app} value={app}>
                        {app}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {isOutros && (
            <div className="space-y-4 bg-[#001726] border border-[#1e293b] rounded-lg p-4">
              <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
                Detalhes do Software
              </p>
              <div>
                <label className="text-[#94a3b8] text-xs font-semibold block mb-1">
                  Nome do Software *
                </label>
                <input
                  type="text"
                  value={form.nome ?? ''}
                  onChange={(e) => {
                    setField('nome', e.target.value);
                    setField('produto', e.target.value);
                  }}
                  placeholder="Ex: Microsoft 365, Figma, AutoCAD..."
                  className="w-full bg-[#001E33] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]"
                />
              </div>

              <div>
                <label className="text-[#94a3b8] text-xs font-semibold block mb-1">
                  Tipo de Produto / Pacote
                </label>
                <input
                  type="text"
                  value={form.tipo_produto ?? ''}
                  onChange={(e) => setField('tipo_produto', e.target.value)}
                  placeholder="Ex: Business Standard, Enterprise..."
                  className="w-full bg-[#001E33] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[#94a3b8] text-xs font-semibold block mb-1">Descrição</label>
            <input
              type="text"
              value={form.descricao ?? ''}
              onChange={(e) => setField('descricao', e.target.value)}
              placeholder="Anotações técnicas ou contratuais"
              className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]"
            />
          </div>

          <div>
            <label className="text-[#94a3b8] text-xs font-semibold block mb-1">
              Quantidade de Licenças (Total Contratado)
            </label>
            <input
              type="number"
              min={0}
              value={form.qtd_licencas ?? 0}
              onChange={(e) => setField('qtd_licencas', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {error && (
            <p className="text-rose-300 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#1e293b] text-[#94a3b8] hover:text-white hover:bg-[#001726] transition-colors text-sm font-semibold"
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
