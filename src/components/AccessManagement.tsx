import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, UserPlus, Trash2, Edit2, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import type { PermissaoUsuario, SystemRole } from '@/types';

interface AccessManagementProps {
  currentRole: SystemRole;
}

export function AccessManagement({ currentRole }: AccessManagementProps) {
  const [usuarios, setUsuarios] = useState<PermissaoUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SystemRole>('editor');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = currentRole === 'super_admin';

  async function fetchUsuarios() {
    setLoading(true);
    const cached = localStorage.getItem('argus_permissoes_cache');
    if (cached) {
      try { setUsuarios(JSON.parse(cached)); } catch {}
    }
    try {
      const { data, error: err } = await supabase
       .from('permissoes_usuarios')
       .select('id,email,role,created_at,updated_at')
       .order('created_at', { ascending: false })
       .limit(100);
      if (err) throw err;
      setUsuarios(data || []);
      localStorage.setItem('argus_permissoes_cache', JSON.stringify(data || []));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsuarios(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        const { error: err } = await supabase.from('permissoes_usuarios').update({ role, updated_at: new Date().toISOString() }).eq('id', editingId);
        if (err) throw err;
        setSuccess('Permissão atualizada!');
      } else {
        const { error: err } = await supabase.from('permissoes_usuarios').insert([{ email: email.trim().toLowerCase(), role }]);
        if (err) throw err;
        setSuccess('Usuário cadastrado!');
      }
      setEmail(''); setRole('editor'); setEditingId(null);
      localStorage.removeItem('argus_permissoes_cache');
      await fetchUsuarios();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  function handleEdit(item: PermissaoUsuario) { setEditingId(item.id); setEmail(item.email); setRole(item.role); }
  function handleCancelEdit() { setEditingId(null); setEmail(''); setRole('editor'); }
  async function handleDelete(id: string, userEmail: string) {
    if (!window.confirm(`Remover ${userEmail}?`)) return;
    try {
      const { error: err } = await supabase.from('permissoes_usuarios').delete().eq('id', id);
      if (err) throw err;
      localStorage.removeItem('argus_permissoes_cache');
      await fetchUsuarios();
    } catch (err: any) { alert(err.message); }
  }

  const filteredUsuarios = usuarios.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div><h2 className="text-white font-bold text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#D4AF37]" />Gestão de Acessos do Sistema</h2><p className="text-[#94a3b8] text-sm mt-0.5">Gerenciamento de funções e permissões dos usuários do Argus Coaten.</p></div>
      {error && <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs"><AlertCircle className="w-4 h-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs"><CheckCircle2 className="w-4 h-4" />{success}</div>}
      {isSuperAdmin && (
        <div className="bg-[#001E33] p-4 rounded-xl border border-[#1e293b]">
          <h3 className="text-white font-semibold text-xs mb-3 flex items-center gap-1.5"><UserPlus className="w-4 h-4 text-[#D4AF37]" />{editingId? 'Editar Permissão' : 'Cadastrar Novo Acesso'}</h3>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full"><label className="text-[#94a3b8] text-xs font-semibold block mb-1">E-mail *</label><input type="email" required disabled={!!editingId} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div className="w-full sm:w-48"><label className="text-[#94a3b8] text-xs font-semibold block mb-1">Perfil *</label><select value={role} onChange={(e) => setRole(e.target.value as SystemRole)} className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm"><option value="super_admin">super_admin</option><option value="admin">admin</option><option value="editor">editor</option><option value="consulta">consulta</option></select></div>
            <div className="flex gap-2"><button type="submit" disabled={saving} className="bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg text-sm">{saving? 'Salvando...' : editingId? 'Atualizar' : 'Adicionar'}</button>{editingId && <button type="button" onClick={handleCancelEdit} className="px-3 py-2 text-xs text-[#94a3b8] border border-[#1e293b] rounded-lg">Cancelar</button>}</div>
          </form>
        </div>
      )}
      <div className="bg-[#001E33] p-4 rounded-xl border border-[#1e293b]"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" /><input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#001726] border border-[#1e293b] text-white pl-9 pr-4 py-2 rounded-lg text-sm" /></div></div>
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-left border-collapse">
          <thead className="bg-[#001726] border-b border-[#1e293b]"><tr><th className="text-xs text-[#94a3b8] uppercase px-4 py-3">E-mail</th><th className="text-xs text-[#94a3b8] uppercase px-4 py-3">Perfil</th><th className="text-xs text-[#94a3b8] uppercase px-4 py-3">Criado em</th><th className="text-xs text-[#94a3b8] uppercase px-4 py-3">Atualizado em</th>{isSuperAdmin && <th className="text-xs text-[#94a3b8] uppercase px-4 py-3 text-right">Ações</th>}</tr></thead>
          <tbody className="divide-y divide-[#1e293b]">
            {loading && <tr><td colSpan={5} className="text-center text-[#94a3b8] py-8 text-sm">Carregando...</td></tr>}
            {!loading && filteredUsuarios.length === 0 && <tr><td colSpan={5} className="text-center text-[#94a3b8] py-8 text-sm">Nenhum usuário.</td></tr>}
            {!loading && filteredUsuarios.map((u) => (
              <tr key={u.id} className="hover:bg-[#001726]/50"><td className="px-4 py-3 text-white text-xs">{u.email}</td><td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-amber-500/10 text-amber-400 border-amber-500/30">{u.role}</span></td><td className="px-4 py-3 text-xs text-[#94a3b8]">{u.created_at? new Date(u.created_at).toLocaleString('pt-BR') : '-'}</td><td className="px-4 py-3 text-xs text-[#94a3b8]">{u.updated_at? new Date(u.updated_at).toLocaleString('pt-BR') : '-'}</td>{isSuperAdmin && <td className="px-4 py-3 text-right"><button onClick={() => handleEdit(u)} className="p-1.5 text-[#94a3b8] hover:text-[#D4AF37]"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(u.id, u.email)} className="p-1.5 text-[#94a3b8] hover:text-rose-400"><Trash2 className="w-4 h-4" /></button></td>}</tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

export default AccessManagement;
