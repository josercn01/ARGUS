import { useAuth } from '@/contexts/AuthContext';
import { LogIn, ShieldCheck, Lock } from 'lucide-react';

export function LoginScreen() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-[#001726] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Top accent bar */}
        <div className="h-1.5 bg-[#D4AF37] rounded-t-xl shadow-[0_0_15px_rgba(212,175,55,0.4)]" />

        {/* Card */}
        <div className="bg-[#001E33] border border-[#1e293b] rounded-b-xl p-10 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shadow-lg mb-4">
              <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              ARGUS
              <span className="text-[#D4AF37] font-semibold text-xs bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full">
                COATEN
              </span>
            </h1>
            <p className="text-[#94a3b8] text-sm mt-2 text-center">
              Portal de Administração e Controle
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#1e293b]" />
            <span className="text-[#64748b] text-xs tracking-wide uppercase font-semibold">
              Acesso Restrito
            </span>
            <div className="flex-1 h-px bg-[#1e293b]" />
          </div>

          <p className="text-center text-[#94a3b8] text-sm mb-8 leading-relaxed">
            Este sistema é de uso exclusivo para colaboradores autorizados.
            Utilize sua conta corporativa para autenticar.
          </p>

          {/* Sign In Button */}
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold py-3.5 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span>Entrar com Conta Corporativa</span>
          </button>

          <div className="flex items-center justify-center gap-2 mt-6">
            <Lock className="w-4 h-4 text-[#D4AF37]" />
            <p className="text-[#64748b] text-xs">
              Autenticação segura via Microsoft Entra ID
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#64748b] text-xs mt-6">
          ARGUS - COATEN &copy; {new Date().getFullYear()} — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
