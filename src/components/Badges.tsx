import type { Role } from '@/types';

// Mapeamento de rótulos amigáveis para cada perfil de acesso
const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  consulta: 'Leitor',
};

// Cores de perfis ajustadas com opacidade para excelente contraste
const ROLE_COLORS: Record<Role, string> = {
  super_admin: 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30',
  admin: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  editor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  consulta: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

/**
 * Badge para exibição do nível de permissão do usuário (Role)
 */
export function RoleBadge({ role }: { role: Role }) {
  const label = ROLE_LABELS[role] ?? role;
  const style = ROLE_COLORS[role] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
}

// Cores de status com translucidez para destacar sobre a tabela escura (#001E33)
const STATUS_COLORS: Record<string, string> = {
  Ativo: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Inativo: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  Pendente: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

/**
 * Badge para exibição do status do registro/usuário
 */
export function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'Pendente';
  const color = STATUS_COLORS[s] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          s === 'Ativo' ? 'bg-emerald-400' : s === 'Inativo' ? 'bg-rose-400' : 'bg-amber-400'
        }`}
      />
      {s}
    </span>
  );
}

/**
 * Badge para exibição do tipo ou estado da licença
 */
export function LicencaBadge({ possui, tipo }: { possui: boolean; tipo: string | null }) {
  if (!possui) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-500/15 text-slate-400 border-slate-500/30">
        Sem Licença
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30">
      {tipo ?? 'Licenciado'}
    </span>
  );
}
