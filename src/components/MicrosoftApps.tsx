import { useState, useEffect } from 'react';
import { 
  Cloud, 
  Search, 
  RefreshCw, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface M365AppUser {
  id: string;
  display_name: string;
  user_principal_name: string;
  assigned_licenses: string[];
  account_enabled: boolean;
  department?: string;
}

export function MicrosoftApps() {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppFilter, setSelectedAppFilter] = useState('ALL');
  
  // Exemplo de dados estruturados para integração M365 / Graph API
  const [users, setUsers] = useState<M365AppUser[]>([
    {
      id: '1',
      display_name: 'Abelardo Antunes Mendes Junior',
      user_principal_name: 'abelardo.mendes@senado.leg.br',
      assigned_licenses: ['Microsoft 365 E3', 'Power BI Pro'],
      account_enabled: true,
      department: 'SF-OSE-DGER-SEGRAF'
    },
    {
      id: '2',
      display_name: 'Adriana da Silva Belota',
      user_principal_name: 'adriana.belota@senado.leg.br',
      assigned_licenses: ['Microsoft 365 E5', 'Teams Phone Standard'],
      account_enabled: true,
      department: 'SF-GABLID-BLVANGUAR'
    },
    {
      id: '3',
      display_name: 'Carlos Eduardo Souza',
      user_principal_name: 'carlos.souza@senado.leg.br',
      assigned_licenses: ['Microsoft 365 E3'],
      account_enabled: false,
      department: 'SF-SEINFRA'
    }
  ]);

  const appsList = [
    { id: 'Microsoft 365 E5', name: 'Microsoft 365 E5 (Completo)', count: 42, color: 'text-cyan-400' },
    { id: 'Microsoft 365 E3', name: 'Microsoft 365 E3 (Padrão)', count: 185, color: 'text-blue-400' },
    { id: 'Power BI Pro', name: 'Power BI Pro', count: 35, color: 'text-amber-400' },
    { id: 'Teams Phone Standard', name: 'Teams Phone Standard', count: 90, color: 'text-emerald-400' }
  ];

  const handleSyncM365 = async () => {
    setLoading(true);
    try {
      // Simulação de sincronização com o Graph API / Supabase Edge Functions
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Aqui você integrará sua chamada real para o script de sincronização
      alert('Sincronização com o Active Directory / M365 realizada com sucesso!');
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.user_principal_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesApp = selectedAppFilter === 'ALL' || user.assigned_licenses.includes(selectedAppFilter);
    return matchesSearch && matchesApp;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#00121E] p-6 rounded-2xl border border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-500/30">
              GRAPH API INTEGRATION
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">Aplicativos e Licenças Microsoft 365</h1>
          <p className="text-xs text-[#64748b]">Auditoria em tempo real de atribuições de nuvem e consumo de licenças corporativas.</p>
        </div>

        <button
          onClick={handleSyncM365}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold transition shadow-[0_0_15px_rgba(0,229,255,0.3)] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Sincronizar com M365</span>
        </button>
      </div>

      {/* Cards de Resumo dos Apps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {appsList.map((app) => (
          <div 
            key={app.id}
            onClick={() => setSelectedAppFilter(selectedAppFilter === app.id ? 'ALL' : app.id)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer bg-[#00121E] ${
              selectedAppFilter === app.id 
                ? 'border-cyan-500 shadow-[0_0_15px_rgba(0,229,255,0.2)]' 
                : 'border-[#1e293b] hover:border-cyan-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Cloud className={`w-5 h-5 ${app.color}`} />
              <span className="text-[10px] font-mono text-[#64748b]">Atribuídas</span>
            </div>
            <h3 className="text-white font-semibold text-xs mb-1 truncate">{app.name}</h3>
            <p className="text-xl font-extrabold text-white">{app.count} <span className="text-[10px] font-normal text-[#64748b]">licenças</span></p>
          </div>
        ))}
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#00121E] p-4 rounded-2xl border border-[#1e293b]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail corporativo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#000d17] border border-[#1e293b] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {selectedAppFilter !== 'ALL' && (
          <button
            onClick={() => setSelectedAppFilter('ALL')}
            className="text-xs text-cyan-400 hover:underline px-3 py-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 whitespace-nowrap cursor-pointer"
          >
            Limpar Filtro ({selectedAppFilter})
          </button>
        )}
      </div>

      {/* Tabela de Usuários / Licenças M365 */}
      <div className="bg-[#00121E] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Usuários e Licenciamento M365</h2>
          </div>
          <span className="text-[11px] text-[#64748b] font-mono">{filteredUsers.length} registros encontrados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e293b] text-[10px] font-mono uppercase text-[#64748b] bg-[#000d17]/50">
                <th className="py-3 px-4">Colaborador / E-mail</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Licenças M365 Atribuídas</th>
                <th className="py-3 px-4">Status da Conta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] text-xs">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#001E33]/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{user.display_name}</div>
                      <div className="text-[11px] text-[#64748b]">{user.user_principal_name}</div>
                    </td>
                    <td className="py-3 px-4 text-[#94a3b8]">
                      {user.department || 'Não vinculado'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.assigned_licenses.map((lic, idx) => (
                          <span key={idx} className="bg-cyan-500/10 text-cyan-300 text-[10px] font-medium px-2 py-0.5 rounded border border-cyan-500/20">
                            {lic}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {user.account_enabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[10px] font-bold">
                          <ShieldAlert className="w-3 h-3" /> Desativada
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[#64748b]">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
