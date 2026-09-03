import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Users, CheckCircle2, Clock, Plus, RefreshCw } from 'lucide-react';
import { LicencaModal } from '@/components/LicencaModal';
import type { LicencaUsuario, Software } from '@/types';

export function Dashboard() {
  const [licencas, setLicencas] = useState<LicencaUsuario[]>([]);
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle do Modal de Licença do Usuário
  const [selectedLicenca, setSelectedLicenca] = useState<Partial<LicencaUsuario> | null>(null);

  // Carrega os dados das duas tabelas: licencas_usuarios e softwares
  async function loadDashboardData() {
    setLoading(true);
    try {
      const [resLicencas, resSoftwares] = await Promise.all([
        supabase.from('licencas_usuarios').select('*').order('nome'),
        supabase.from('softwares').select('*').order('nome')
      ]);

      if (resLicencas.data) setLicencas(resLicencas.data as LicencaUsuario[]);
      if (resSoftwares.data) setSoftwares(resSoftwares.data as Software[]);
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Salva ou atualiza a atribuição da licença
  async function handleSaveLicenca(data: Partial<LicencaUsuario>) {
    if (data.id) {
      const { error } = await supabase.from('licencas_usuarios').update(data).eq('id', data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('licencas_usuarios').insert(data);
      if (error) throw new Error(error.message);
    }
    setSelectedLicenca(null);
    await loadDashboardData();
  }

  // Cálculos das métricas
  const totalLicencasCadastradas = softwares.reduce((acc, s) => acc + (s.qtd_licencas || 0), 0);
  const licencasEmUso = licencas.filter((l) => l.possui_licenca && l.status === 'Ativo').length;
  const pendentes = licencas.filter((l) => l.status === 'Pendente').length;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#323130]">Dashboard de Controle de Licenças</h1>
          <p className="text-[#605E5C] text-sm mt-0.5">Visão consolidada de usuários e licenças alocadas</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-3 py-2 border border-[#E1DFDD] rounded-md text-[#323130] hover:bg-[#F5F5F5] transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => setSelectedLicenca({})}
            className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold px-4 py-2 rounded-md transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Atribuição
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-[#E1DFDD] rounded-lg shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#DEECF9] rounded-lg">
            <Package className="w-6 h-6 text-[#0078D4]" />
          </div>
          <div>
            <p className="text-xs text-[#605E5C] font-medium">Total de Licenças (Inventário)</p>
            <p className="text-2xl font-semibold text-[#323130]">{totalLicencasCadastradas}</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E1DFDD] rounded-lg shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#DFF6DD] rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-[#107C41]" />
          </div>
          <div>
            <p className="text-xs text-[#605E5C] font-medium">Licenças em Uso (Ativas)</p>
            <p className="text-2xl font-semibold text-[#107C41]">{licencasEmUso}</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E1DFDD] rounded-lg shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#FFF4CE] rounded-lg">
            <Clock className="w-6 h-6 text-[#797775]" />
          </div>
          <div>
            <p className="text-xs text-[#605E5C] font-medium">Solicitações Pendentes</p>
            <p className="text-2xl font-semibold text-[#797775]">{pendentes}</p>
          </div>
        </div>
      </div>

      {/* Tabela Principal de Licenças por Usuário */}
      <div className="bg-white border border-[#E1DFDD] rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E1DFDD] flex justify-between items-center bg-[#FAF9F8]">
          <h2 className="font-semibold text-[#323130] text-sm">Usuários e Licenças Atribuidas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#F5F5F5] border-b border-[#E1DFDD]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-[#605E5C] uppercase">Usuário / E-mail</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#605E5C] uppercase">Departamento</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#605E5C] uppercase">Software / Licença</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#605E5C] uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#605E5C] uppercase text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1DFDD]">
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#A19F9D]">Carregando dados...</td>
                </tr>
              )}
              {!loading && licencas.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#A19F9D]">Nenhuma atribuição registrada.</td>
                </tr>
              )}
              {!loading && licencas.map((item) => (
                <tr key={item.id} className="hover:bg-[#F5F5F5] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#323130]">{item.nome || '—'}</p>
                    <p className="text-xs text-[#605E5C]">{item.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#605E5C]">
                    {item.departamento_raiz ? `${item.departamento_raiz} ${item.sub_departamento ? `(${item.sub_departamento})` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {item.possui_licenca ? (
                      <div>
                        <span className="font-medium text-[#0078D4] block">{item.tipo_licenca}</span>
                        <span className="text-xs text-[#605E5C]">{item.produto || item.tipo_produto || '—'}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#A19F9D]">Sem licença</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                      item.status === 'Ativo' 
                        ? 'bg-[#DFF6DD] text-[#107C41] border-[#107C41]/20' 
                        : item.status === 'Pendente'
                        ? 'bg-[#FFF4CE] text-[#797775] border-[#797775]/20'
                        : 'bg-[#F3F2F1] text-[#605E5C] border-[#E1DFDD]'
                    }`}>
                      {item.status || 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedLicenca(item)}
                      className="text-xs text-[#0078D4] hover:underline font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renderização do LicencaModal */}
      <LicencaModal
        item={selectedLicenca}
        onClose={() => setSelectedLicenca(null)}
        onSave={handleSaveLicenca}
      />
    </div>
  );
}
