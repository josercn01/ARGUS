import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, UserPlus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AuthUser, SystemRole } from '@/types';

interface AccessManagementProps {
  currentUser: AuthUser | null;
  role: SystemRole;
}

interface UserPermission {
  id: string;
  email: string;
  role: SystemRole;
  criado_em?: string;
}

const ROLES_DISPONIVEIS: { value: SystemRole; label: string; desc: string }[] = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Acesso total, incluindo gestão de acessos e locais.' },
  { value: 'admin', label: 'Admin', desc: 'Gerencia licenças, softwares e locais.' },
  { value: 'editor', label: 'Editor', desc: 'Cria e edita licenças e softwares.' },
  { value: 'consulta', label: 'Leitor', desc: 'Apenas visualização e relatórios.' },
];

export function AccessManagement({ currentUser, role }: AccessManagementProps) {
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<SystemRole>('consulta');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = role === 'super_admin';

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('permissoes_usuarios')
        .select('*')
        .order('email');

      if (err) throw err;
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar permissões.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const emailFormatted = emailInput.trim().toLowerCase();

    try {
      const { error: err } = await supabase.from('permissoes_usuarios').upsert(
        {
          email: emailFormatted,
          role: roleInput,
          atualizado_por: currentUser?.email ?? null,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );

      if (err) throw err;

      setSuccess(`Permissão atribuída com sucesso a ${emailFormatted}.`);
      setEmailInput('');
      setRoleInput('consulta');
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar permissão.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u: UserPermission) {
    if (u.email === currentUser?.email) {
      setError('Você não pode remover suas próprias permissões de acesso.');
      return;
    }

    if (!window.confirm(`Remover a permissão do usuário ${u.email}?`)) return;

    setError(null);
    setSuccess(null);

    try {
      const { error: err } = await supabase
        .from('permissoes_usuarios')
        .delete()
        .eq('id', u.id);

      if (err) throw err;

      setSuccess(`Permissão de ${u.email} removida.`);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir permissão.');
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-8 text-center text-[#94a3b8]">
        <Shield className="w-12 h-12 text-amber-500/40 mx-auto mb-3" />
        <h3 className="text-white font-bold text-lg mb-1">Acesso Restrito</h3>
        <p className="text-sm">Apenas usuários com perfil <strong>Super Admin</strong> podem gerenciar permissões do sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#D4AF37]" />
            Gestão de Permissões e Acessos
          </h2>
          <p className="text-[#94a3b8] text-sm mt-0.5">
            Controle de perfis de acesso dos operadores e administradores do ARGUS.
          </p>
        </div>
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

      {/* Formulário de Adição/Edição */}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 shadow-lg">
        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#D4AF37]" />
          Conceder ou Alterar Permissão
        </h3>

        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <label className="text-[#94a3b8] text-xs font-semibold block mb-1">E-mail do Usuário</label>
            <input
              type="email"
              required
              placeholder="usuario@senado.leg.br"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] placeholder-[#64748b]"
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-[#94a3b8] text-xs font-semibold block mb-1">Perfil de Acesso</label>
            <select
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value as SystemRole)}
              className="w-full bg-[#001726] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              {ROLES_DISPONIVEIS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 text-sm bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Salvar...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Usuários com Acesso */}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#001726] border-b border-[#1e293b]">
              <tr>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Usuário</th>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3">Perfil</th>
                <th className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading && (
                <tr>
                  <td colSpan={3} className="text-center text-[#94a3b8] py-8 text-sm">
                    Carregando permissões...
                  </td>
                </tr>
              )}

              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-[#94a3b8] py-8 text-sm">
                    Nenhum acesso cadastrado manualmente.
                  </td>
                </tr>
              )}

              {!loading &&
                users.map((u) => {
                  const isSelf = u.email === currentUser?.email;
                  return (
                    <tr key={u.id} className="hover:bg-[#001726]/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium flex items-center gap-2">
                          {u.email}
                          {isSelf && (
                            <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.2 rounded font-semibold">
                              Você
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-[#1e293b] text-[#94a3b8] border border-[#334155] px-2.5 py-1 rounded-full text-xs font-semibold">
                          {ROLES_DISPONIVEIS.find((r) => r.value === u.role)?.label ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isSelf}
                          className="p-1.5 text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title={isSelf ? 'Você não pode remover seu próprio acesso' : 'Remover permissão'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
