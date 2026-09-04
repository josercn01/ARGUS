import { 
  Shield, 
  LayoutDashboard, 
  Package, 
  MapPin, 
  ShieldCheck, 
  LogOut 
} from 'lucide-react';
import type { AuthUser, SystemRole } from '@/types';
import { supabase } from '@/lib/supabase';

export type TabKey = 'dashboard' | 'softwares' | 'locais' | 'permissoes';

interface HeaderProps {
  user: AuthUser | null;
  role: SystemRole;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function Header({ user, role, activeTab, onTabChange }: HeaderProps) {
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // Liberando a exibição das abas de navegação
  const navItems: { id: TabKey; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Gestão de Licenças', icon: LayoutDashboard },
    { id: 'softwares', label: 'Softwares', icon: Package },
    { id: 'locais', label: 'Locais', icon: MapPin },
    { id: 'permissoes', label: 'Acessos', icon: ShieldCheck },
  ];

  return (
    <header className="bg-[#001726] border-b border-[#1e293b] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Lado Esquerdo: Logo + Navegação de Abas */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#D4AF37]/10 border border-[#D4AF37] rounded-xl flex items-center justify-center text-[#D4AF37] shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-wider">ARGUS</span>
                <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
                  COATEN
                </span>
              </div>
              <p className="text-[10px] text-[#64748b] leading-none hidden sm:block">Gestão de Licenças e Acessos</p>
            </div>
          </div>

          {/* Botões do Menu Superior - Sempre Visíveis */}
          <nav className="flex items-center gap-1 bg-[#00121E] p-1 rounded-xl border border-[#1e293b]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#D4AF37] text-[#001726] font-bold shadow-md'
                      : 'text-[#94a3b8] hover:text-white hover:bg-[#001E33]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#001726]' : 'text-[#D4AF37]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lado Direito: Usuário Logado + Sair */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-white">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-[11px] text-[#64748b]">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-all border border-rose-500/20 cursor-pointer"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
