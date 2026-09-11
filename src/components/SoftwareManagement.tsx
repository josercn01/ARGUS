import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Plus, Pencil, Trash2, X, Save, AlertCircle, Trash } from 'lucide-react';
import type { Software } from '@/types';

export function SoftwareManagement() {
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState<Partial<Software> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase.from('softwares').select('*').order('nome');
    if (err) setError(err.message);
    else setSoftwares((data as Software[]) || []);
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
    if (!confirm('Excluir este software?')) return;
    await supabase.from('softwares').delete().eq('id', id);
    await load();
  }

  async function handleDeleteAll() {
    if (softwares.length === 0) return;
    if (!confirm(`Apagar TODOS os ${softwares.length} softwares?`)) return;
    if (!confirm(`CONFIRMAÇÃO FINAL - apagar ${softwares.length} softwares?`)) return;
    setDeletingAll(true);
    const { error } = await supabase.from('softwares').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) setError(error.message);
    else await load();
    setDeletingAll(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h2 className="text-white font-bold text-xl flex items-center gap-2"><Package className="w-5 h-5 text-[#D4AF37]" />Gerenciar Softwares</h2>
        <div className="flex gap-2">
          {softwares.length > 0 && (
            <button onClick={handleDeleteAll} disabled={deletingAll} className="flex items-center gap-2 text-sm bg-[#1a2332] border border-red-900/50 text-red-400 px-4 py-2.5 rounded-lg">
              <Trash className="w-4 h-4" />{deletingAll ? 'Apagando...' : `Apagar Tudo (${softwares.length})`}
            </button>
          )}
          <button onClick={() => setModalItem({})} className="flex items-center gap-2 text-sm bg-[#D4AF37] text-[#001726] font-bold px-4 py-2.5 rounded-lg"><Plus className="w-4 h-4" />Novo Software</button>
        </div>
      </div>
      {/* ... resto da sua tabela igual ... */}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#001726] border-b border-[#1e293b]"><tr><th className="px-4 py-3 text-xs text-[#94a3b8]">Software</th><th className="px-4 py-3 text-xs text-[#94a3b8]">Licenças</th><th className="w-20"></th></tr></thead>
            <tbody className="divide-y divide-[#1e293b]">
              {softwares.map(s => (
                <tr key={s.id} className="hover:bg-[#001726]/50"><td className="px-4 py-3 text-white text-sm">{s.nome}</td><td className="px-4 py-3 text-sm text-[#D4AF37]">{s.qtd_licencas}</td><td className="px-4 py-3 flex gap-1"><button onClick={() => setModalItem(s)}><Pencil className="w-4 h-4" /></button><button onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4" /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modalItem !== null && <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"><div className="bg-[#001E33] p-6 rounded-xl"><button onClick={() => setModalItem(null)}><X className="w-5 h-5" /></button><form onSubmit={(e) => { e.preventDefault(); handleSave(modalItem); }}><input value={modalItem.nome || ''} onChange={e => setModalItem({...modalItem, nome: e.target.value})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white" placeholder="Nome" /><button type="submit" className="mt-4 bg-[#D4AF37] px-4 py-2 rounded-lg font-bold"><Save className="w-4 h-4" />Salvar</button></form></div></div>}
    </div>
  );
}

// ESSA LINHA CORRIGE SEU BUILD NO RENDER
export default SoftwareManagement;
