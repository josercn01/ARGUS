import { Cloud } from 'lucide-react';

export function MicrosoftApps() {
  return (
    <div className="bg-[#0b1329] border border-[#1e293b] p-8 rounded-2xl text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-500/40 rounded-xl flex items-center justify-center text-cyan-400">
          <Cloud className="w-6 h-6" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-white">Painel Microsoft Apps Funcionando!</h2>
      <p className="text-xs text-slate-400">
        O componente foi isolado com sucesso. Se esta mensagem aparecer, o problema anterior estava em algum mapeamento interno da tabela ou nos dados mockados.
      </p>
    </div>
  );
}
