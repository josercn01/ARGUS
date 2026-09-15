import { useState, useEffect } from 'react';
import { Cloud, Bug, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MicrosoftApps() {
  const [logs, setLogs] = useState<string[]>([]);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const addLog = (msg: string) => {
    console.log(`[ARGUS DEBUG] ${msg}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  useEffect(() => {
    addLog('Componente MicrosoftApps montado com sucesso no DOM.');
    
    // Testa a sessão do Supabase imediatamente ao carregar
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        addLog(`Erro ao buscar sessão: ${error.message}`);
      } else if (data.session) {
        setSessionInfo(data.session);
        addLog(`Sessão ativa encontrada para o usuário: ${data.session.user?.email}`);
        if (data.session.provider_token) {
          addLog('Provider Token da Microsoft presente na sessão! ✅');
        } else {
          addLog('AVISO: Provider Token está VAZIO (Falta refazer o login com a Microsoft). ❌');
        }
      } else {
        addLog('Nenhuma sessão ativa encontrada.');
      }
    });
  }, []);

  const handleTestInvoke = async () => {
    addLog('Iniciando teste de chamada para a Edge Function sync-m365...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;

      if (!providerToken) {
        addLog('Erro: Token não disponível para envio.');
        alert('Token não encontrado na sessão.');
        return;
      }

      addLog('Enviando requisição para a Edge Function...');
      const { data, error } = await supabase.functions.invoke('sync-m365', {
        body: { providerToken }
      });

      if (error) {
        addLog(`Erro retornado pela Edge Function: ${JSON.stringify(error)}`);
      } else {
        addLog(`Sucesso! Resposta recebida: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } catch (err: any) {
      addLog(`Exceção capturada: ${err.message || err}`);
    }
  };

  return (
    <div className="w-full bg-[#0b1329] border border-cyan-500/40 p-6 rounded-2xl text-white space-y-6 shadow-2xl">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500 rounded-xl flex items-center justify-center text-cyan-400">
          <Bug className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Painel de Diagnóstico - Microsoft Apps</h2>
          <p className="text-xs text-slate-400">Este painel rastreia visualmente a execução e o estado da aba.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-2">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Status da Autenticação</h3>
          <p className="text-xs text-slate-300">
            <strong>Usuário Logado:</strong> {sessionInfo?.user?.email || 'Verificando...'}
          </p>
          <p className="text-xs text-slate-300">
            <strong>Provider Token:</strong> {sessionInfo?.provider_token ? 'Disponível (Ativo)' : 'Ausente / Nulo'}
          </p>
          <button 
            onClick={handleTestInvoke}
            className="mt-3 w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition cursor-pointer"
          >
            Testar Conexão com Edge Function
          </button>
        </div>

        <div className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-2">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Renderização do Layout</h3>
          <p className="text-xs text-slate-300 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> O container está visível no DOM.
          </p>
          <p className="text-[11px] text-slate-400">
            Se você está vendo esta caixa na tela, o problema de tela preta foi superado e o componente está ativo.
          </p>
        </div>
      </div>

      <div className="bg-black/60 border border-white/10 p-4 rounded-xl space-y-2 font-mono text-[11px]">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Log de Execução em Tempo Real:</h3>
        <div className="max-h-40 overflow-y-auto space-y-1 text-cyan-300">
          {logs.map((log, idx) => (
            <div key={idx}>&gt; {log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
