import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Header, type TabKey } from '@/components/Header';
import { MetricsCards } from '@/components/MetricsCards';
import { FiltersBar } from '@/components/FiltersBar';
import { LicencasTable } from '@/components/LicencasTable';
import { SoftwareManagement } from '@/components/SoftwareManagement';
import { CreateUserModal } from '@/components/CreateUserModal';
import { AdminLocais } from '@/components/AdminLocais';
import { AccessManagement } from '@/components/AccessManagement';
import { Plus } from 'lucide-react';
import type { AuthUser, SystemRole, UsuarioLicenca, Software, LocalTrabalho } from '@/types';

export function Dashboard({ user, role }: { user: AuthUser | null; role: SystemRole }) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [usuarios, setUsuarios] = useState<UsuarioLicenca[]>([]);
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [locais, setLocais] = useState<LocalTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDepartamento, setSelectedDepartamento] = useState('');
  const [showSoftwareManager, setShowSoftwareManager] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState<Software | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 [Argus] Disparando requisição com abort controller...');

      // Cria um mecanismo para abortar a requisição se passar de 4 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const queryPromise = supabase
        .from('softwares')
        .select('*')
        .order('nome');

      // Executa a query
      const { data: swData, error: swError } = await queryPromise;
      clearTimeout(timeoutId);

      if (swError) {
        console.error('❌ Erro retornado pelo Supabase:', swError);
        setError(`Erro Supabase: ${swError.message}`);
        setLoading(false);
        return;
      }

      console.log('✅ Softwares obtidos com sucesso:', swData?.length || 0);
      if (swData) setSoftwares(swData as any);

      // Carrega o restante
      const [usRes, linksRes, locaisRes] = await Promise.all([
        supabase.from('usuarios').select('*').limit(600),
        supabase.from('usuario_softwares').select('usuario_id, software_id'),
        supabase.from('administradores_locais').select('*')
      ]);

      if (locaisRes.data) setLocais(locaisRes.data as any);

      const linksList = linksRes.data || [];
      const usuariosList = usRes.data || [];
      const softwaresList = swData || [];

      if (usuariosList.length > 0) {
        const map = new Map<string, Software[]>();

        linksList.forEach((l: any) => {
          const swObj = softwaresList.find((s: any) => s.id === l.software_id);
          if (!swObj) return;
          if (!map.has(l.usuario_id)) map.set(l.usuario_id, []);
          map.get(l.usuario_id)!.push(swObj);
        });

        const enriched = usuariosList.map(u => ({
          ...u,
          softwares: map.get(u.id) || [],
          software: map.get(u.id)?.[0] || null
        }));

        setUsuarios(enriched as any);
      } else {
        setUsuarios([]);
      }
    } catch (err: any) {
      console.error('❌ Erro capturado no catch geral:', err);
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        setError('A requisição para o Supabase expirou (Timeout). Verifique se a URL do Supabase está correta nas variáveis de ambiente.');
      } else {
        setError(err.message || 'Erro desconhecido ao carregar.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  const departamentos = useMemo(() => {
    const set = new Set<string>();
    usuarios.forEach(u => { if (u.setor) set.add(u.setor); });
    return Array.from(set).sort();
  }, [usuarios]);

  const filtered = useMemo(() => usuarios.filter(u => {
    const nomes = u.softwares?.map(s => s.nome).join(' ') || '';
    const ids = u.softwares?.map(s => s.id) || [];
    const busca = `${u.colaborador || ''} ${u.login || ''} ${nomes} ${u.setor || ''}`.toLowerCase();
    if (search && !busca.includes(search.toLowerCase())) return false;
    if (selectedSoftware && !ids.includes(selectedSoftware)) return false;
    if (selectedLocal && (u as any).local_id !== selectedLocal) return false;
    if (selectedDepartamento && u.setor !== selectedDepartamento) return false;
    if (selectedStatus && u.status && u.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    return true;
  }), [usuarios, search, selectedSoftware, selectedLocal, selectedDepartamento, selectedStatus]);

  return (
    <div className="min-h-screen bg-[#020C1A] bg-gradient-to-br from-[#020C1A] via-[#061a32] to-[#020C1A]">
      <Header user={user} role={role} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-center justify-between">
            <span><strong>Aviso:</strong> {error}</span>
            <button onClick={loadData} className="underline text-xs uppercase font-bold tracking-wider">Tentar Novamente</button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            <MetricsCards
              data={usuarios as any}
              softwares={softwares as any}
              onEditSoftware={(s: any) => { setEditingSoftware(s); setShowSoftwareManager(true); }}
              onRefresh={loadData}
            />
            <div className="flex gap-2">
              <button onClick={() => { setEditingSoftware(null); setShowSoftwareManager(true); }} className="bg-[#0a1930] border border-white/10 text-white text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 hover:border-cyan-400/30 hover:shadow-[0_0_10px_rgba(0,229,255,0.15)] transition-all">
                <Plus className="w-4 h-4"/> Cadastrar Software
              </button>
              <button onClick={() => setShowNewUser(true)} className="bg-gradient-to-r from-[#D4AF37] to-[#FFD76E] hover:brightness-110 text-black text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all">
                <Plus className="w-4 h-4"/> Cadastrar Usuário
              </button>
            </div>
            <FiltersBar
              search={search} onSearchChange={setSearch}
              software={selectedSoftware} onSoftwareChange={setSelectedSoftware}
              local={selectedLocal} onLocalChange={setSelectedLocal}
              status={selectedStatus} onStatusChange={setSelectedStatus}
              departamento={selectedDepartamento} onDepartamentoChange={setSelectedDepartamento}
              softwares={softwares as any} locais={locais as any} departamentos={departamentos}
            />
            <LicencasTable data={filtered as any} softwares={softwares as any} locais={locais as any} role={role} loading={loading} onRefresh={loadData} onImportBatch={async()=>{}} />
          </>
        )}
        {activeTab === 'admin-locais' && <AdminLocais role={role} />}
        {activeTab === 'permissoes' && (
          <AccessManagement
            currentRole={role}
            currentUserEmail={user?.email || ''}
          />
        )}
        {showSoftwareManager && <SoftwareManagement initialData={editingSoftware as any} onClose={() => { setShowSoftwareManager(false); setEditingSoftware(null); }} onRefresh={loadData} />}
        {showNewUser && <CreateUserModal softwares={softwares as any} onClose={() => setShowNewUser(false)} onRefresh={loadData} />}
      </main>
    </div>
  );
}
