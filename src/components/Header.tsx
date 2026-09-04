import { useAuth } from '@/contexts/AuthContext';
import { LogOut, ShieldCheck, LayoutDashboard, Package, MapPin, Shield } from 'lucide-react';
import type { AuthUser, SystemRole } from '@/types';

export type TabKey = 'dashboard' | 'softwares' | 'locais' | 'permissoes';

interface HeaderProps {
  user: AuthUser | null;
  role: SystemRole;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  consulta: 'Leitor',
};

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard; roles: SystemRole[] }[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'editor', 'consulta'],
  },
  { key: 'softwares', label: 'Softwares', icon: Package, roles: ['super_admin', 'admin', 'editor'] },
  { key: 'locais', label: 'Locais', icon: MapPin, roles: ['super_admin', 'admin', 'editor'] },
  { key: 'permissoes', label: 'Permissões', icon: Shield, roles: ['super_admin'] },
];

export function Header({ user, role, activeTab, onTabChange }: HeaderProps) {
  const { signOut } = useAuth();
  const visibleTabs = TABS.filter((t) => t.roles.includes(role));

  return (
    <header className="bg-[#001E33] border-b border-[#1e293b] text-white shadow-xl sticky top-0 z-40">
      <div className="h-16 flex items-center justify-between px-4 sm:px-6">
        {/* Identidade do sistema */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide flex items-center gap-2 text-white">
              ARGUS
              <span className="text-[#D4AF37] font-semibold text-xs bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full">
                COATEN
              </span>
            </h1>
            <p className="text-[10px] text-[#64748b] hidden sm:block">
              Gestão de Licenças, Softwares e Acessos
            </p>
          </div>
        </div>

        {/* Perfil e saída */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-white text-xs">{user.name || user.email?.split('@')[0]}</p>
                <p className="text-[#64748b] text-[10px]">{user.email}</p>
              </div>

              <span className="bg-[#1e293b] text-[#94a3b8] border border-[#334155] px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap">
                {ROLE_LABELS[role] ?? role}
              </span>
            </>
          )}

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg transition-colors text-xs border border-rose-500/20 cursor-pointer"
            title="Sair do sistema"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Navegação por módulos (RBAC) */}
      <nav className="px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-[#1e293b]/60">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 text-sm font-semibold px-3 py-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'text-[#D4AF37] border-[#D4AF37]'
                  : 'text-[#94a3b8] border-transparent hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
