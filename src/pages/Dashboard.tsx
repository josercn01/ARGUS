import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Header, type TabKey } from '@/components/Header';
import { MetricsCards } from '@/components/MetricsCards';
import { FiltersBar } from '@/components/FiltersBar';
import { LicencasTable } from '@/components/LicencasTable';
import { AdminLocais } from '@/components/AdminLocais';
import { AccessManagement } from '@/components/AccessManagement';
import { SoftwareManagement } from '@/components/SoftwareManagement';
import { CreateUserModal } from '@/components/CreateUserModal';
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

  // NOVOS ESTADOS QUE FALTAVAM
  const [showSoftwareManager, setShowSoftwareManager] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState<Software | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: sw }, { data: us }, { data: links }, { data: lc }] = await Promise.all([
      supabase.from('softwares').select('*').order('nome'),
      supabase.from('usuarios').select('*').order('colaborador'),
      supabase.from('usuario_softwares').select('usuario_id, software:softwares(*)'),
      supabase.from('locais').select('*').order('nome').then(r => r).catch(() => ({ data: [] } as any)),
    ]);

    if (sw) setSoftwares(sw as any);
    if (lc) setLocais(lc as any);

    if (us) {
      const map = new Map<string, Software[]>();
      (links as any[] || []).forEach((l: any) => {
        if (!l.software) return;
        if (!map.has(l.usuario_id)) map.set(l.usuario_id, []);
        map.get(l.usuario_id)!.push(l.software);
      });
      const enriched = (us as any[]).map(u => ({
      ...u,
        softwares: map.get(u.id) || [],
        software: map.get(u.id)?.[0] || null,
      }));
      setUsuarios(enriched as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const departamentos = useMemo(() => {
    const set = new Set<string>();
    usuarios.forEach(u => { if (u.setor) set.add(u.setor); });
    return Array.from(set).sort();
  }, [usuarios]);

  const handleImportBatch = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim()!== '');
    const sep = lines[0].includes(';')? ';' : ',';
    const headers = lines[0].split(sep).map(h => h.trim().toUpperCase().replace(/"/g, ''));

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((h, idx) => row[h] = values[idx]);
      const email = row['EMAIL'] || row['E-MAIL'];
      if (!email) continue;
      const tipoRaw = (row['TIPO_PRODUTO'] || row['TIPO'] || row['PRODUTO'] || 'Photoshop').trim();
      const colaborador = row['NOME'] || row['NOMECOMPLETO'] || email;
      const login = email.split('@')[0].toLowerCase();

      let { data: sw } = await supabase.from('softwares').select('id').ilike('nome', tipoRaw).maybeSingle();
      if (!sw) {
        const isAdobe =!tipoRaw.toLowerCase().includes('autocad') &&!tipoRaw.toLowerCase().includes('revit');
        const { data: novo } = await supabase.from('softwares').insert({ nome: tipoRaw, is_adobe: isAdobe, qtd_contratada: 0 }).select('id').single();
        sw = novo;
      }
      const { data: userRow } = await supabase.from('usuarios').upsert({
        colaborador, login, email, setor: (row['DEPARTAMENTO'] || row['SETOR'] || null)?.toUpperCase(), status: 'ativo'
      }, { onConflict: 'login' }).select('id').single();

      if (userRow && sw) {
        await supabase.from('usuario_softwares').upsert({ usuario_id: userRow.id, software_id: sw.id }, { onConflict: 'usuario_id,software_id' });
      }
    }
    await loadData();
  };

  const filtered = useMemo(() => {
    return usuarios.filter(u => {
      const softwaresNome = u.softwares?.map(s=>s.nome).join(' ') || '';
      const softwaresIds = u.softwares?.map(s=>s.id) || [];
      const busca = `${u.colaborador} ${u.login} ${softwaresNome} ${u.setor || ''}`.toLowerCase();
      if (search &&!busca.includes(search.toLowerCase())) return false;
      if (selectedSoftware &&!softwaresIds.includes(selectedSoftware)) return false;
      if (selectedLocal && (u as any).local_id!== selectedLocal) return false;
      if (selectedDepartamento && u.setor!== selectedDepartamento) return false;
      if (selectedStatus && u.status.toLowerCase()!== selectedStatus.toLowerCase()) return false;
      return true;
    });
  }, [usuarios, search, selectedSoftware, selectedLocal, selectedDepartamento, selectedStatus]);

  return (
    <div className="min-h-screen bg-[#00121E]">
      <Header user={user} role={role} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {/* CARDS AGORA COM EDITAR/EXCLUIR */}
            <MetricsCards
              data={usuarios as any}
              softwares={softwares as any}
              onEditSoftware={(s:any)=>{ setEditingSoftware(s); setShowSoftwareManager(true); }}
              onRefresh={loadData}
            />

            {/* BOTOES QUE FALTAVAM NA SUA PRINT */}
            <div className="flex gap-2">
              <button onClick={()=>{ setEditingSoftware(null); setShowSoftwareManager(true); }} className="bg-[#1e293b] border border-[#1e293b] hover:bg-[#2a3a52] text-white text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
                <Plus className="w-4 h-4" /> Novo Software
              </button>
              <button onClick={()=>setShowNewUser(true)} className="bg-[#D4AF37] hover:bg-[#E6C45A] text-black text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2">
                <Plus className="w-4 h-4" /> Novo Cadastro - Usuário + Licença
              </button>
            </div>

            <FiltersBar
              search={search}
              onSearchChange={setSearch}
              software={selectedSoftware}
              onSoftwareChange={setSelectedSoftware}
              local={selectedLocal}
              onLocalChange={setSelectedLocal}
              status={selectedStatus}
              onStatusChange={setSelectedStatus}
              departamento={selectedDepartamento}
              onDepartamentoChange={setSelectedDepartamento}
              softwares={softwares as any}
              locais={locais as any}
              departamentos={departamentos}
            />
            {/* TABELA COM SEU FILTRO DIGITÁVEL COATEN + EXPORT */}
            <LicencasTable data={filtered as any} softwares={softwares as any} locais={locais as any} role={role} loading={loading} onRefresh={loadData} onImportBatch={handleImportBatch} />
          </>
        )}
        {activeTab === 'admin-locais' && <AdminLocais role={role} />}
        {activeTab === 'permissoes' && <AccessManagement currentRole={role} />}

        {/* MODAIS */}
        {showSoftwareManager && (
          <SoftwareManagement
            softwares={softwares as any}
            initialData={editingSoftware}
            onClose={()=>{ setShowSoftwareManager(false); setEditingSoftware(null); }}
            onRefresh={loadData}
          />
        )}
        {showNewUser && (
          <CreateUserModal
            softwares={softwares as any}
            onClose={()=>setShowNewUser(false)}
            onRefresh={loadData}
          />
        )}
      </main>
    </div>
  );
}
