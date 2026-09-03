import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { LocalTrabalho } from '@/types';

export function AdminLocais() {
  const [locais, setLocais] = useState<LocalTrabalho[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase.from('locais_trabalho').select('*').order('nome');
    if (err) setError(err.message);
    else if (data) setLocais(data as LocalTrabalho[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('locais_trabalho').insert({
      nome: nome.trim(),
      descricao: descricao.trim() || null,
    });

    if (err) {
      setError(err.message);
    } else {
      setNome('');
      setDescricao('');
      await load();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este local?')) return;
    const { error: err } = await supabase.from('locais_trabalho').delete().eq('id', id);
    if (err) setError(err.message);
    else await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white font-bold text-xl flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#D4AF37]" />
          Locais de Trabalho
        </h2>
        <p className="text-[#94a3b8] text-sm mt-0.5">
          Cadastre os locais físicos ou setores para associação das licenças.
        </p>
      </div>

      <form onSubmit={handleAdd} className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 space-y-4 shadow-lg">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Novo Local</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[#94a3b8] text-xs font-semibold block mb-1">Nome do Local *</label>
            <input
              type="text"
              required
              placeholder="Ex: Anexo I - Bloco A"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]"
            />
          </div>

          <div>
            <label className="text-[#94a3b8] text-xs font-semibold block mb-1">Descrição / Detalhes</label>
            <input
              type="text"
              placeholder="Ex: Sala 204, Gabinete X..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !nome.trim()}
            className="flex items-center gap-2 text-sm bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Adicionando...' : 'Adicionar Local'}
          </button>
        </div>
      </form>

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#001726] border-b border-[#1e293b]">
            <tr>
              <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Local</th>
              <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Descrição</th>
              <th className="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]">
            {loading && (
              <tr>
                <td colSpan={3} className="text-center text-[#94a3b8] py-6 text-sm">Carregando locais...</td>
              </tr>
            )}
            {!loading && locais.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-[#94a3b8] py-6 text-sm">Nenhum local cadastrado.</td>
              </tr>
            )}
            {!loading && locais.map((l) => (
              <tr key={l.id} className="hover:bg-[#001726]/50 transition-colors">
                <td className="px-4 py-3 text-white font-medium text-sm">{l.nome}</td>
                <td className="px-4 py-3 text-[#94a3b8] text-sm">{l.descricao ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="p-1.5 text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
