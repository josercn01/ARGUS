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
    const [{ data: sw }, { data: us }, { data: links }, { data: lc }] = await Promise.all([
      supabase.from('softwares').select('*').order('nome'),
      supabase.from('usuarios').select('*').order('colaborador'),
      supabase.from('usuario_softwares').select('usuario_id, software:softwares(*)'),
      supabase.from('locais').select('*').order('nome').then(r=>r).catch(()=>({data:[]} as any)),
    ]);
    if(sw) setSoftwares(sw as any);
    if(lc) setLocais(lc as any);
    if(us){
      const map = new Map<string, Software[]>();
      (links as any[]||[]).forEach((l:any)=>{ if(!l.software) return; if(!map.has(l.usuario_id)) map.set(l.usuario_id, []); map.get(l.usuario_id)!.push(l.software); });
      const enriched = (us as any[]).map(u=>({...u, softwares: map.get(u.id)||[], software: map.get(u.id)?.[0]||null }));
      setUsuarios(enriched as any);
    }
    setLoading(false);
  },[]);

  useEffect(()=>{ loadData(); },[loadData]);

  const departamentos = useMemo(()=>{ const set = new Set<string>(); usuarios.forEach(u=>{ if(u.setor) set.add(u.setor); }); return Array.from(set).sort(); },[usuarios]);

  const filtered = useMemo(()=>usuarios.filter(u=>{
    const nomes = u.softwares?.map(s=>s.nome).join(' ')||'';
    const ids = u.softwares?.map(s=>s.id)||[];
    const busca = `${u.colaborador} ${u.login} ${nomes} ${u.setor||''}`.toLowerCase();
    if(search &&!busca.includes(search.toLowerCase())) return false;
    if(selectedSoftware &&!ids.includes(selectedSoftware)) return false;
    if(selectedLocal && (u as any).local_id!==selectedLocal) return false;
    if(selectedDepartamento && u.setor!==selectedDepartamento) return false;
    if(selectedStatus && u.status.toLowerCase()!==selectedStatus.toLowerCase()) return false;
    return true;
  }),[usuarios, search, selectedSoftware, selectedLocal, selectedDepartamento, selectedStatus]);

  return (
    <div className="min-h-screen bg-[#00121E]">
      <Header user={user} role={role} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {activeTab==='dashboard' && (
          <>
            <MetricsCards data={usuarios as any} softwares={softwares as any} onEditSoftware={(s:any)=>{ setEditingSoftware(s); setShowSoftwareManager(true); }} onRefresh={loadData} />
            <div className="flex gap-2">
              <button onClick={()=>{ setEditingSoftware(null); setShowSoftwareManager(true); }} className="bg-[#1e293b] border border-[#334155] text-white text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#2a3a52]"><Plus className="w-4 h-4"/> Cadastrar Software</button>
              <button onClick={()=>setShowNewUser(true)} className="bg-[#D4AF37] hover:bg-[#E6C45A] text-black text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2"><Plus className="w-4 h-4"/> Cadastrar Usuário</button>
            </div>
            <FiltersBar search={search} onSearchChange={setSearch} software={selectedSoftware} onSoftwareChange={setSelectedSoftware} local={selectedLocal} onLocalChange={setSelectedLocal} status={selectedStatus} onStatusChange={setSelectedStatus} departamento={selectedDepartamento} onDepartamentoChange={setSelectedDepartamento} softwares={softwares as any} locais={locais as any} departamentos={departamentos} />
            <LicencasTable data={filtered as any} softwares={softwares as any} locais={locais as any} role={role} loading={loading} onRefresh={loadData} onImportBatch={async()=>{}} />
          </>
        )}
        {activeTab==='admin-locais' && <AdminLocais role={role} />}
        {activeTab==='permissoes' && <AccessManagement currentRole={role} />}
        {showSoftwareManager && <SoftwareManagement initialData={editingSoftware as any} onClose={()=>{ setShowSoftwareManager(false); setEditingSoftware(null); }} onRefresh={loadData} />}
        {showNewUser && <CreateUserModal softwares={softwares as any} onClose={()=>setShowNewUser(false)} onRefresh={loadData} />}
      </main>
    </div>
  );
}
