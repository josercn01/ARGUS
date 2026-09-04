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
  
  // Form states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SystemRole>('editor');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = currentRole === 'super_admin';

  async function fetchUsuarios() {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('permissoes_usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setUsuarios(data || []);
    } catch (err) {
      console.error('Erro ao buscar lista de acessos:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsuarios();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        // Atualizar perfil do usuário
        const { error: err } = await supabase
          .from('permissoes_usuarios')
          .update({
            role,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (err) throw err;
        setSuccess('Permissão atualizada com sucesso!');
      } else {
        // Inserir novo usuário
        const { error: err } = await supabase
          .from('permissoes_usuarios')
          .insert([
            {
              email: email.trim().toLowerCase(),
              role,
            },
          ]);

        if (err) throw err;
        setSuccess('Usuário cadastrado com sucesso!');
      }

      setEmail('');
      setRole('editor');
      setEditingId(null);
      await fetchUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar permissão.');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(item: PermissaoUsuario) {
    setEditingId(item.id);
    setEmail(item.email);
    setRole(item.role);
    setError(null);
    setSuccess(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEmail('');
    setRole('editor');
  }

  async function handleDelete(id: string, userEmail: string) {
    if (!window.confirm(`Tem certeza que deseja remover o acesso de ${userEmail}?`)) return;

    try {
      const { error: err } = await supabase
        .from('permissoes_usuarios')
        .delete()
        .eq('id', id);

      if (err) throw err;
      await fetchUsuarios();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao remover permissão.');
    }
  }

  const filteredUsuarios = usuarios.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
          Gestão de Acessos do Sistema
        </h2>
        <p className="text-[#94a3b8] text-sm mt-0.5">
          Gerenciamento de funções e permissões dos usuários do Argus Coaten.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {success}
        </div>
      )}

      {/* Formulário de Adição/Edição (Super Admin) */}
      {isSuperAdmin && (
        <div className="bg-[#001E33] p-4 rounded-xl border border-[#1e293b]">
          <h3 className="text-white font-semibold text-xs mb-3 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-[#D4AF37]" />
            {editingId ? 'Editar Permissão do Usuário' : 'Cadastrar Novo Acesso'}
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="text-[#94a3b8] text-xs font-semibold block mb-1">E-mail Corporativo *</label>
              <input
                type="email"
                required
                disabled={!!editingId}
                placeholder="usuario@senado.leg.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
              />
            </div>

            <div className="w-full sm:w-48">
              <label className="text-[#94a3b8] text-xs font-semibold block mb-1">Perfil de Acesso *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as SystemRole)}
                className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="super_admin">super_admin</option>
                <option value="admin">admin</option>
                <option value="editor">editor</option>
                <option value="consulta">consulta</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 cursor-pointer shadow-md w-full sm:w-auto whitespace-nowrap"
              >
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar Acesso'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-2 text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors border border-[#1e293b] rounded-lg"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Busca */}
      <div className="bg-[#001E33] p-4 rounded-xl border border-[#1e293b]">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            placeholder="Buscar por e-mail ou perfil..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#001726] border border-[#1e293b] text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]"
          />
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#001726] border-b border-[#1e293b]">
              <tr>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">E-mail</th>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Perfil (Role)</th>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Criado em</th>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Atualizado em</th>
                {isSuperAdmin && <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center text-[#94a3b8] py-8 text-sm">
                    Carregando permissões do banco...
                  </td>
                </tr>
              )}

              {!loading && filteredUsuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-[#94a3b8] py-8 text-sm">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredUsuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-[#001726]/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-white text-xs">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                          u.role === 'super_admin'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : u.role === 'admin'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : u.role === 'editor'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#94a3b8] font-mono">
                      {u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#94a3b8] font-mono">
                      {u.updated_at ? new Date(u.updated_at).toLocaleString('pt-BR') : '-'}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => handleEdit(u)}
                          className="p-1.5 text-[#94a3b8] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-md transition-all cursor-pointer"
                          title="Editar Perfil"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          className="p-1.5 text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                          title="Excluir Permissão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
