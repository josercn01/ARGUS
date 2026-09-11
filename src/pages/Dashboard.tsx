import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Header, type TabKey } from '@/components/Header';
import { MetricsCards } from '@/components/MetricsCards';
import { FiltersBar } from '@/components/FiltersBar';
import { LicencasTable } from '@/components/LicencasTable';
import { AdminLocais } from '@/components/AdminLocais';
import { AccessManagement } from '@/components/AccessManagement';
import type { AuthUser, SystemRole, UsuarioLicenca, Software } from '@/types';

export function Dashboard({ user, role }: { user: AuthUser | null; role: SystemRole }) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [usuarios, setUsuarios] = useState<UsuarioLicenca[]>([]);
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: sw }, { data: us }, { data: links }] = await Promise.all([
      supabase.from('softwares').select('*').order('nome'),
      supabase.from('usuarios').select('*').order('colaborador'),
      supabase.from('usuario_softwares').select('usuario_id, software:softwares(*)'),
    ]);

    if (sw) setSoftwares(sw as any);

    if (us && links) {
      // Agrupa softwares por usuario_id - ESSENCIAL PARA LUCAS | ACROBAT + PHOTOSHOP
      const map = new Map<string, Software[]>();
      (links as any[]).forEach((l: any) => {
        if (!l.software) return;
        if (!map.has(l.usuario_id)) map.set(l.usuario_id, []);
        map.get(l.usuario_id)!.push(l.software);
      });

      const enriched = (us as any[]).map(u => ({
       ...u,
        softwares: map.get(u.id) || [],
        // compatibilidade com codigo antigo
        software: map.get(u.id)?.[0] || null,
        software_id: map.get(u.id)?.[0]?.id || null,
      }));
      setUsuarios(enriched);
    } else if (us) {
      setUsuarios(us as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // IMPORTAÇÃO - AGORA CRIA usuario_softwares
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

      // 1. Acha ou cria software
      let { data: sw } = await supabase.from('softwares').select('id').ilike('nome', tipoRaw).maybeSingle();
      if (!sw) {
        const isAdobe =!tipoRaw.toLowerCase().includes('autocad') &&!tipoRaw.toLowerCase().includes('revit');
        const familia = tipoRaw.toLowerCase().includes('todos')? 'ALL_APPS' : tipoRaw.toLowerCase().includes('acrobat')? 'ACROBAT' : isAdobe? 'SINGLE_POOL' : 'OUTROS';
        const { data: novo } = await supabase.from('softwares').insert({ nome: tipoRaw, familia, is_adobe: isAdobe, tipo_adobe: familia==='ALL_APPS'?'ALL_APPS': familia==='ACROBAT'?'ACROBAT':'SINGLE', qtd_contratada: 0 }).select('id').single();
        sw = novo;
      }

      // 2. Cria/atualiza usuario
      const { data: userRow } = await supabase.from('usuarios').upsert({
        colaborador,
        login,
        setor: (row['DEPARTAMENTO'] || row['SETOR'] || null)?.toUpperCase(),
        status: 'ativo'
      }, { onConflict: 'login' }).select('id').single();

      // 3. Vincula - nao duplica se ja tiver ACROBAT + PHOTOSHOP
      if (userRow && sw) {
        await supabase.from('usuario_softwares').upsert({ usuario_id: userRow.id, software_id: sw.id }, { onConflict: 'usuario_id,software_id' });
      }
    }
    await loadData();
  };

  const filtered = usuarios.filter(u => {
    const softwaresNome = u.softwares?.map(s=>s.nome).join(' ') || u.software?.nome || '';
    if (search &&!`${u.colaborador} ${u.login} ${softwaresNome}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedSoftware &&!u.softwares?.some(s=>s.nome===selectedSoftware)) return false;
    if (selectedStatus && u.status!== selectedStatus) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#00121E]">
      <Header user={user} role={role} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            <MetricsCards data={usuarios as any} softwares={softwares as any} />
            <FiltersBar search={search} onSearchChange={setSearch} software={selectedSoftware} onSoftwareChange={setSelectedSoftware} local={''} onLocalChange={() => {}} status={selectedStatus} onStatusChange={setSelectedStatus} softwares={softwares as any} locais={[]} />
            <LicencasTable data={filtered as any} softwares={softwares as any} locais={[]} role={role} loading={loading} onRefresh={loadData} onImportBatch={handleImportBatch} />
          </>
        )}
        {activeTab === 'admin-locais' && <AdminLocais role={role} />}
        {activeTab === 'permissoes' && <AccessManagement currentRole={role} />}
      </main>
    </div>
  );
}
