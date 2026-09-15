import { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  Monitor,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Cloud,
  Cpu,
  Layers,
  Box
} from 'lucide-react';
import type { AuthUser, SystemRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext'; // Ajuste o caminho se necessário para o seu useAuth

export type TabKey = 'dashboard' | 'admin-locais' | 'permissoes' | 'microsoft-apps';

interface HeaderProps {
  user: AuthUser | null;
  role: SystemRole;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function Header({ user, activeTab, onTabChange }: HeaderProps) {
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { id: TabKey; label: string; icon: React.ElementType; category: string }[] = [
    { id: 'dashboard', label: 'Gestão de Licenças', icon: LayoutDashboard, category: 'Principal' },
    { id: 'admin-locais', label: 'Admin Locais', icon: Monitor, category: 'Principal' },
    { id: 'permissoes', label: 'Acessos e Permissões', icon: ShieldCheck, category: 'Principal' },
    { id: 'microsoft-apps', label: 'Aplicativos Microsoft', icon: Cloud, category: 'Microsoft 365' },
  ];

  const handleSelectTab = (id: TabKey) => {
    onTabChange(id);
    setSidebarOpen(false);
  };

  return (
    <>
      <header className="bg-[#001726] border-b border-[#1e293b] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Lado Esquerdo: Botão Menu Lateral + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-[#00121E] border border-[#1e293b] text-[#D4AF37] hover:bg-[#001E33] transition cursor-pointer"
              title="Abrir painel de navegação lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

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

            {/* Abas Rápidas no Topo (Opcional, mantidas principais) */}
            <nav className="hidden md:flex items-center gap-1 bg-[#00121E] p-1 rounded-xl border border-[#1e293b] ml-4">
              {navItems.slice(0, 3).map((item) => {
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
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-all border border-rose-500/20 cursor-pointer"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* PAINEL DE NAVEGAÇÃO LATERAL (SIDEBAR) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Fundo escuro transparente com fade */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Conteúdo da Sidebar */}
          <div className="relative w-80 bg-[#00121E] border-r border-[#1e293b] h-full flex flex-col z-10 shadow-2xl animate-slideRight">
            {/* Cabeçalho da Sidebar */}
            <div className="flex items-center justify-between p-5 border-b border-[#1e293b]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm tracking-wide">Painel de Navegação</h2>
                  <p className="text-[10px] text-[#64748b]">Módulos e Aplicativos</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Links Agrupados */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Seção Principal */}
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
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
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
                </div>
              </div>

              {/* Seção M365 & Aplicativos */}
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
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500 text-white font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                            : 'text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                        <div className="text-left">
                          <div>{item.label}</div>
                          <div className="text-[9px] opacity-75 font-normal">Admin Center M365 API</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rodapé da Sidebar */}
            <div className="p-4 border-t border-[#1e293b] bg-[#000d17]">
              <div className="flex items-center gap-3 text-xs text-[#64748b]">
                <Cpu className="w-4 h-4 text-[#D4AF37]" />
                <span>SERETI-WEB • v2.4</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
