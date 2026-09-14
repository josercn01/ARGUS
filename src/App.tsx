import { useAuth } from '@/contexts/AuthContext';

export function LoginScreen() {
  const { signInWithMicrosoft } = useAuth();

  return (
    <div className="min-h-screen bg-[#00121E] flex flex-col items-center justify-center text-white p-4">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-[#001A2E] border border-[#D4AF37]/20 shadow-2xl">
        <h1 className="text-3xl font-bold text-[#D4AF37] mb-2">ARGUS</h1>
        <p className="text-slate-400 mb-8">Sistema de Gestão de Licenças</p>

        <button
          onClick={signInWithMicrosoft}
          className="w-full py-3 px-4 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#C4A137] transition-all"
        >
          Entrar com Microsoft
        </button>

        <p className="text-xs text-slate-500 mt-4 text-center">
          Use seu e-mail @senado.leg.br
        </p>
      </div>
    </div>
  );
}
