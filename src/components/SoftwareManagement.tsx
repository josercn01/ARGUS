import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Plus, Pencil, Trash2, X, Save, AlertCircle } from 'lucide-react';
import type { Software } from '@/types';

export function SoftwareManagement() {
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Software> | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('softwares').select('*').order('nome');
    if (!error && data) setSoftwares(data as Software[]);
    else if (error) setError(error.message);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(data: Partial<Software>) {
    const payload = {
      nome: data.nome,
      fabricante: data.fabricante ?? null,
      tipo_produto: data.tipo_produto ?? null,
      produto: data.produto ?? null,
      descricao: data.descricao ?? null,
      qtd_licencas: data.qtd_licencas ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabase.from('softwares').update(payload).eq('id', data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('softwares').insert(payload);
      if (error) throw new Error(error.message);
    }
    setModal(undefined);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Confirmar exclusão deste software?')) return;
    const { error } = await supabase.from('softwares').delete().eq('id', id);
    if (error) setError(error.message);
    else await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#323130] font-semibold text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-[#0078D4]" />
            Gerenciar Softwares
          </h2>
          <p className="text-[#605E5C] text-sm mt-0.5">Cadastre softwares com fabricante, tipo de produto e perfil específico.</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 text-sm bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold px-4 py-2 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Software
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[#A4262C] bg-[#FDE7E9] border border-[#A4262C]/20 rounded-md px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E1DFDD] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F5F5F5] border-b border-[#E1DFDD]">
              <tr>
                <th className="text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider px-4 py-3">Fabricante</th>
                <th className="text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider px-4 py-3">Software</th>
                <th className="text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider px-4 py-3">Tipo de Produto</th>
                <th className="text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider px-4 py-3">Produto / Perfil</th>
                <th className="text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider px-4 py-3">Licenças</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1DFDD]">
              {loading && (
                <tr><td colSpan={6} className="text-center text-[#A19F9D] py-10 text-sm">Carregando...</td></tr>
              )}
              {!loading && softwares.length === 0 && (
                <tr><td colSpan={6} className="text-center text-[#A19F9D] py-10 text-sm">Nenhum software cadastrado.</td></tr>
              )}
              {!loading && softwares.map((s) => (
                <tr key={s.id} className="hover:bg-[#F5F5F5] transition-colors">
                  <td className="px-4 py-3 text-[#605E5C] text-sm whitespace-nowrap">{s.fabricante ?? '—'}</td>
                  <td className="px-4 py-3 text-[#323130] text-sm font-medium">{s.nome}</td>
                  <td className="px-4 py-3 text-[#605E5C] text-sm whitespace-nowrap">{s.tipo_produto ?? '—'}</td>
                  <td className="px-4 py-3 text-[#0078D4] text-sm font-medium whitespace-nowrap">{s.produto ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-[#DEECF9] text-[#0078D4] border-[#0078D4]/20">
                      {s.qtd_licencas}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setModal(s)}
                        className="p-1.5 text-[#605E5C] hover:text-[#0078D4] hover:bg-[#DEECF9] rounded-md transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-[#605E5C] hover:text-[#A4262C] hover:bg-[#FDE7E9] rounded-md transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal != null && modal !== undefined && (
        <SoftwareModal item={modal} onClose={() => setModal(undefined)} onSave={handleSave} />
      )}
    </div>
  );
}

function SoftwareModal({ item, onClose, onSave }: {
  item: Partial<Software>;
  onClose: () => void;
  onSave: (data: Partial<Software>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Software>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setForm(item ?? {}); setError(null); }, [item]);

  function set(field: keyof Software, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome?.trim()) { setError('Nome do software é obrigatório.'); return; }
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#E1DFDD] rounded-lg w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1DFDD]">
          <h2 className="text-[#323130] font-semibold text-lg">{isNew ? 'Novo Software' : 'Editar Software'}</h2>
          <button onClick={onClose} className="text-[#605E5C] hover:text-[#323130] transition-colors p-1.5 hover:bg-[#F5F5F5] rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[#605E5C] text-xs font-medium block mb-1">Fabricante</label>
            <input
              type="text"
              value={form.fabricante ?? ''}
              onChange={(e) => set('fabricante', e.target.value)}
              placeholder="Ex: Adobe, Microsoft 365, Figma, Autodesk"
              className="w-full bg-white border border-[#E1DFDD] text-[#323130] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 transition-all placeholder-[#A19F9D]"
            />
          </div>
          <div>
            <label className="text-[#605E5C] text-xs font-medium block mb-1">Nome do Software *</label>
            <input
              type="text"
              value={form.nome ?? ''}
              onChange={(e) => set('nome', e.target.value)}
              required
              placeholder="Ex: Adobe Creative Cloud"
              className="w-full bg-white border border-[#E1DFDD] text-[#323130] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 transition-all placeholder-[#A19F9D]"
            />
          </div>
          <div>
            <label className="text-[#605E5C] text-xs font-medium block mb-1">Tipo de Produto</label>
            <input
              type="text"
              value={form.tipo_produto ?? ''}
              onChange={(e) => set('tipo_produto', e.target.value)}
              placeholder="Ex: Creative Cloud, Aplicativo Individual, Nuvem de Documentos"
              className="w-full bg-white border border-[#E1DFDD] text-[#323130] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 transition-all placeholder-[#A19F9D]"
            />
          </div>
          <div>
            <label className="text-[#605E5C] text-xs font-medium block mb-1">Produto / Perfil</label>
            <input
              type="text"
              value={form.produto ?? ''}
              onChange={(e) => set('produto', e.target.value)}
              placeholder="Ex: Photoshop, Illustrator, Acrobat Pro DC"
              className="w-full bg-white border border-[#E1DFDD] text-[#323130] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 transition-all placeholder-[#A19F9D]"
            />
          </div>
          <div>
            <label className="text-[#605E5C] text-xs font-medium block mb-1">Descrição</label>
            <input
              type="text"
              value={form.descricao ?? ''}
              onChange={(e) => set('descricao', e.target.value)}
              className="w-full bg-white border border-[#E1DFDD] text-[#323130] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 transition-all placeholder-[#A19F9D]"
            />
          </div>
          <div>
            <label className="text-[#605E5C] text-xs font-medium block mb-1">Quantidade de Licenças</label>
            <input
              type="number"
              min={0}
              value={form.qtd_licencas ?? 0}
              onChange={(e) => set('qtd_licencas', parseInt(e.target.value) || 0)}
              className="w-full bg-white border border-[#E1DFDD] text-[#323130] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 transition-all"
            />
          </div>
          {error && (
            <p className="text-[#A4262C] text-sm bg-[#FDE7E9] border border-[#A4262C]/20 rounded-md px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-md border border-[#E1DFDD] text-[#605E5C] hover:text-[#323130] hover:bg-[#F5F5F5] transition-colors text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold text-sm transition-colors disabled:opacity-60"
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
