import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';

export function LoginScreen() {
  const { signInWithMicrosoft } = useAuth();

  return (
    <div className="min-h-screen bg-[#00121E] flex flex-col items-center justify-center text-white p-4">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-[#001A2E] border border-[#D4AF37]/20 shadow-2xl text-center space-y-6">
        
        {/* Ícone / Logo */}
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-[#D4AF37]/10 border border-[#D4AF37] rounded-xl flex items-center justify-center text-[#D4AF37] shadow-md">
            <Shield className="w-7 h-7" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-[#D4AF37] mb-1">ARGUS</h1>
          <p className="text-xs text-slate-400">Sistema de Gestão de Licenças e Acessos</p>
        </div>

        <button
          onClick={signInWithMicrosoft}
          className="w-full py-3 px-4 bg-[#D4AF37] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-[#C4A137] transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="1" width="9" height="9" fill="#ffb900"/>
            <rect x="11" y="11" width="9" height="9" fill="#7fba00"/>
          </svg>
          Entrar com Microsoft
        </button>

        <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-white/5">
          SERETI-WEB • Senado Federal
        </div>
      </div>
    </div>
  );
}
