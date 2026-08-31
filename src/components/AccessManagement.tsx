import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RoleBadge } from '@/components/Badges';
import { Shield, ChevronDown, Save, AlertCircle } from 'lucide-react';
import type { PerfilUsuario, Role } from '@/types';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'consulta', label: 'Leitor' },
];

export function AccessManagement({ currentEmail }: { currentEmail: string }) {
  const [perfis, setPerfis] = useState<PerfilUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('consulta');
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('perfis_usuarios')
      .select('*')
      .order('email');
    if (!error && data) setPerfis(data as PerfilUsuario[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateRole(id: string, role: Role) {
    setSaving(id);
    setError(null);
    const { error } = await supabase
      .from('perfis_usuarios')
      .update({ role })
      .eq('id', id);
    if (error) setError(error.message);
    else await load();
    setSaving(null);
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) {
      setError('Informe um e-mail.');
      return;
    }
    setAdding(true);
    setError(null);
    const { error } = await supabase
      .from('perfis_usuarios')
      .upsert({ email: newEmail.trim().toLowerCase(), role: newRole }, { onConflict: 'email' });
    if (error) setError(error.message);
    else { setNewEmail(''); await load(); }
    setAdding(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[#323130] font-semibold text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#742774]" />
          Gestão de Acessos
        </h2>
        <p className="text-[#605E5C] text-sm mt-0.5">Controle os perfis de acesso dos usuários do sistema.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[#A4262C] bg-[#FDE7E9] border border-[#A4262C]/20 rounded-md px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add user */}
      <form onSubmit={addUser} className="bg-[#F5F5F5] border border-[#E1DFDD] rounded-lg p-5 space-y-4">
        <p className="text-[#605E5C] text-sm font-medium">Adicionar ou atualizar acesso</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="usuario@empresa.com.br"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="flex-1 bg-white border border-[#E1DFDD] text-[#323130] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 transition-all placeholder-[#A19F9D]"
          />
          <div className="relative">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="appearance-none bg-white border border-[#E1DFDD] text-[#323130] rounded-md pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:border-[#0078D4] transition-all"
            >
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#605E5C] pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold px-5 py-2.5 rounded-md text-sm transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {adding ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white border border-[#E1DFDD] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F5F5F5] border-b border-[#E1DFDD]">
              <tr>
                <th className="text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider px-4 py-3">E-mail</th>
                <th className="text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider px-4 py-3">Perfil Atual</th>
                <th className="text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider px-4 py-3">Alterar Perfil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1DFDD]">
              {loading && (
                <tr><td colSpan={3} className="text-center text-[#A19F9D] py-10 text-sm">Carregando...</td></tr>
              )}
              {!loading && perfis.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F5F5] transition-colors">
                  <td className="px-4 py-3 text-[#605E5C] text-sm">
                    {p.email}
                    {p.email === currentEmail && (
                      <span className="ml-2 text-[#0078D4] text-xs">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={p.role} /></td>
                  <td className="px-4 py-3">
                    {p.email === 'josercn@senado.leg.br' ? (
                      <span className="text-[#A19F9D] text-xs italic">Protegido</span>
                    ) : (
                      <div className="relative inline-block">
                        <select
                          defaultValue={p.role}
                          disabled={saving === p.id}
                          onChange={(e) => updateRole(p.id, e.target.value as Role)}
                          className="appearance-none bg-white border border-[#E1DFDD] text-[#323130] rounded-md pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:border-[#0078D4] transition-colors disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#605E5C] pointer-events-none" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
