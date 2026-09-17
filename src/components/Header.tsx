import {
  Shield,
  LayoutDashboard,
  Monitor,
  ShieldCheck,
  LogOut,
  Cloud,
  Database,
  FileKey,
  Users,
} from 'lucide-react';
import type { AuthUser, SystemRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export type TabKey =
  | 'dashboard'
  | 'admin-locais'
  | 'permissoes'
  | 'microsoft-apps'
  | 'adobe-apps'
  | 'sistemas-corporativos'
  | 'certificados-bird'
  | 'cartela-clientes';

interface HeaderProps {
  user: AuthUser | null;
  role: SystemRole;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function Header({ user, activeTab, onTabChange }: HeaderProps) {
  const { signOut } = useAuth();

  const navItems: { id: TabKey; label: string; icon: React.ElementType; category: string; sub?: string }[] = [
    { id: 'dashboard', label: 'Gestão de Licenças', icon: LayoutDashboard, category: 'Principal' },
    { id: 'admin-locais', label: 'Admin Locais', icon: Monitor, category: 'Principal' },
    { id: 'permissoes', label: 'Acessos e Permissões', icon: ShieldCheck, category: 'Principal' },
    { id: 'sistemas-corporativos', label: 'Sistemas Corporativos', icon: Database, category: 'Principal', sub: '48 sistemas mapeados' },
    { id: 'certificados-bird', label: 'Certificados Bird ID', icon: FileKey, category: 'Principal', sub: '57 vencidos • 3 a vencer' },
    { id: 'cartela-clientes', label: 'Cartela de Clientes', icon: Users, category: 'Principal', sub: '111 clientes • 10 gerentes' },
    { id: 'microsoft-apps', label: 'Aplicativos Microsoft', icon: Cloud, category: 'Microsoft 365', sub: 'Admin Center M365 API' },
    { id: 'adobe-apps', label: 'Aplicativos Adobe', icon: Cloud, category: 'Microsoft 365', sub: 'Admin Console Adobe @senado' },
  ];

  return (
    <aside className="w-72 bg-[#00121E] border-r border-[#1e293b] h-screen flex flex-col fixed left-0 top-0 z-50 shadow-2xl">
      <div className="p-5 border-b border-[#1e293b] flex items-center gap-3">
        <div className="w-9 h-9 bg-[#D4AF37]/10 border border-[#D4AF37] rounded-xl flex items-center justify-center text-[#D4AF37] shadow-md shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base tracking-wider">ARGUS</span>
            <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
              COATEN
            </span>
          </div>
          <p className="text-[10px] text-[#64748b] truncate">100 olhos • Gestão de Licenças e Acessos</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] mb-2 px-3">
            Gerenciamento Geral
          </p>
          <div className="space-y-1">
            {navItems.filter(i => i.category === 'Principal').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                 ? 'bg-[#D4AF37] text-[#001726] font-bold shadow-md'
                      : 'text-[#94a3b8] hover:text-white hover:bg-[#001E33]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive? 'text-[#001726]' : 'text-[#D4AF37]'}`} />
                  <div className="text-left overflow-hidden">
                    <div className="truncate">{item.label}</div>
                    {item.sub && <div className="text-[9px] opacity-75 font-normal truncate">{item.sub}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] mb-2 px-3">
            Integrações Nuvem
          </p>
          <div className="space-y-1">
            {navItems.filter(i => i.category === 'Microsoft 365').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                 ? 'bg-cyan-500 text-white font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                      : 'text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive? 'text-white' : 'text-cyan-400'}`} />
                  <div className="text-left overflow-hidden">
                    <div className="truncate">{item.label}</div>
                    <div className="text-[9px] opacity-75 font-normal truncate">{item.sub || 'Admin Center M365 API'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#1e293b] bg-[#000d17] space-y-3">
        <div className="flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-medium text-white truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] text-[#64748b] truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition border border-rose-500/20 cursor-pointer shrink-0"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[#64748b] font-mono">
          <span>ARGUS v3.0</span>
          <span className="text-[#D4AF37]">100 OLHOS</span>
        </div>
      </div>
    </aside>
  );
}

export default Header;
