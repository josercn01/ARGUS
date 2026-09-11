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
    const { data, error: err } = await supabase.from('softwares').select('*').order('nome');
    if (err) setError(err.message);
    else setSoftwares((data as Software[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(data: Partial<Software>) {
    if (!data.nome?.trim()) throw new Error('Nome do software é obrigatório.');
    if (!data.fabricante?.trim()) throw new Error('Fabricante é obrigatório.');
    if (!data.produto?.trim()) throw new Error('Produto é obrigatório.');
    if (!data.tipo_produto?.trim()) throw new Error('Tipo de produto é obrigatório.');
    if (data.qtd_licencas === undefined || data.qtd_licencas < 0) throw new Error('Quantidade deve ser numérica e não negativa.');

    const payload = {
      nome: data.nome.trim(),
      fabricante: data.fabricante.trim(),
      tipo_produto: data.tipo_produto.trim(),
      produto: data.produto.trim(),
      descricao: data.descricao ?? null,
      qtd_licencas: Number(data.qtd_licencas),
      quantidade_total: Number(data.qtd_licencas),
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

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h2 className="text-white font-bold text-xl flex items-center gap-2"><Package className="w-5 h-5 text-[#D4AF37]" />Gerenciar Softwares</h2>
        <button onClick={() => setModalItem({ qtd_licencas: 0 })} className="flex items-center gap-2 text-sm bg-[#D4AF37] text-[#001726] font-bold px-4 py-2.5 rounded-lg"><Plus className="w-4 h-4" />Novo Software</button>
      </div>
      {error && <div className="text-rose-300 bg-rose-500/10 p-3 rounded-lg text-xs"><AlertCircle className="w-4 h-4 inline mr-2" />{error}</div>}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#001726] border-b border-[#1e293b]"><tr><th className="px-4 py-3 text-xs text-[#94a3b8]">Software</th><th className="px-4 py-3 text-xs text-[#94a3b8]">Fabricante</th><th className="px-4 py-3 text-xs text-[#94a3b8]">Tipo</th><th className="px-4 py-3 text-xs text-[#94a3b8]">Licenças</th><th className="w-20"></th></tr></thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading ? <tr><td colSpan={5} className="p-4 text-center text-[#94a3b8]">Carregando...</td></tr> : softwares.map(s => (
                <tr key={s.id} className="hover:bg-[#001726]/50">
                  <td className="px-4 py-3 text-white text-sm">{s.nome}</td>
                  <td className="px-4 py-3 text-sm text-[#94a3b8]">{s.fabricante || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#94a3b8]">{s.tipo_produto || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#D4AF37] font-semibold">{s.qtd_licencas}</td>
                  <td className="px-4 py-3 flex gap-1"><button onClick={() => setModalItem(s)} className="p-1 text-[#94a3b8] hover:text-[#D4AF37]"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDelete(s.id)} className="p-1 text-[#94a3b8] hover:text-rose-400"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modalItem !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#001E33] border border-[#1e293b] p-6 rounded-xl w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3"><h3 className="text-white font-bold">{modalItem.id ? 'Editar Software' : 'Novo Software'}</h3><button onClick={() => setModalItem(null)} className="text-[#94a3b8] hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={async (e) => { e.preventDefault(); try { await handleSave(modalItem); } catch (err: any) { setError(err.message); } }} className="space-y-3 text-xs">
              <div><label className="text-[#94a3b8] block mb-1">Nome do software *</label><input type="text" required value={modalItem.nome || ''} onChange={e => setModalItem({...modalItem, nome: e.target.value})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white text-sm" /></div>
              <div><label className="text-[#94a3b8] block mb-1">Fabricante *</label><input type="text" required value={modalItem.fabricante || ''} onChange={e => setModalItem({...modalItem, fabricante: e.target.value})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white text-sm" /></div>
              <div><label className="text-[#94a3b8] block mb-1">Produto *</label><input type="text" required value={modalItem.produto || ''} onChange={e => setModalItem({...modalItem, produto: e.target.value})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white text-sm" /></div>
              <div><label className="text-[#94a3b8] block mb-1">Tipo de produto *</label><input type="text" required value={modalItem.tipo_produto || ''} onChange={e => setModalItem({...modalItem, tipo_produto: e.target.value})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white text-sm" /></div>
              <div><label className="text-[#94a3b8] block mb-1">Quantidade de licenças *</label><input type="number" min="0" required value={modalItem.qtd_licencas ?? 0} onChange={e => setModalItem({...modalItem, qtd_licencas: Number(e.target.value)})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white text-sm" /></div>
              <div><label className="text-[#94a3b8] block mb-1">Descrição</label><textarea value={modalItem.descricao || ''} onChange={e => setModalItem({...modalItem, descricao: e.target.value})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white text-sm" /></div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e293b]"><button type="button" onClick={() => setModalItem(null)} className="px-4 py-2 text-[#94a3b8]">Cancelar</button><button type="submit" className="bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"><Save className="w-4 h-4" />Salvar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SoftwareManagement;
