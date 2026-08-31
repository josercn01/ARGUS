import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, ShieldCheck } from 'lucide-react';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 bg-[#001E33] border-b border-[#1e293b] text-white flex items-center justify-between px-4 sm:px-6 shadow-xl sticky top-0 z-50">
      {/* Esquerda: Logo/Título do Sistema ARGUS - COATEN */}
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
            Portal de Administração e Controle
          </p>
        </div>
      </div>

      {/* Direita: Perfil e Ações */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-white">{user.nome || user.email?.split('@')[0]}</p>
              <p className="text-[#64748b] text-[10px]">{user.email}</p>
            </div>
            
            <span className="bg-[#1e293b] text-[#94a3b8] border border-[#334155] px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize">
              {user.role || 'Usuário'}
            </span>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition-colors text-xs border border-red-500/20 cursor-pointer"
              title="Sair do sistema"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
