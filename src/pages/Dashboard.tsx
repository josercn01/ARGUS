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
    const [{ data: sw }, { data: us }] = await Promise.all([
      supabase.from('softwares').select('*').order('nome'),
      supabase.from('usuarios').select('*, software:softwares(*)').order('colaborador'),
    ]);
    if (sw) setSoftwares(sw as any);
    if (us) setUsuarios(us as any);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // IMPORTAÇÃO SIMPLIFICADA - SUA PLANILHA 490 LINHAS
  const handleImportBatch = async (file: File, onProgress?: any) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim()!== '');
    const sep = lines[0].includes(';')? ';' : ',';
    const headers = lines[0].split(sep).map(h => h.trim().toUpperCase().replace(/"/g, ''));

    const registros = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((h, idx) => row[h] = values[idx]);
      const email = row['EMAIL'] || row['E-MAIL'];
      if (!email) continue;

      // MAPEAMENTO DIDÁTICO: Tipo de produto = Photoshop, Illustrator, etc
      const tipoRaw = (row['TIPO_PRODUTO'] || row['TIPO'] || row['PRODUTO'] || 'Photoshop').trim();
      registros.push({
        email,
        colaborador: row['NOME'] || row['NOMECOMPLETO'] || email,
        login: email.split('@')[0].toLowerCase(),
        setor: row['DEPARTAMENTO'] || row['SETOR'] || null,
        tipoRaw,
        produtoRaw: row['PRODUTO'] || ''
      });
    }

    for (let idx = 0; idx < registros.length; idx++) {
      const reg = registros[idx];
      if (onProgress) onProgress({ current: idx + 1, total: registros.length, percent: Math.round((idx + 1) / registros.length * 100), message: reg.email });

      // 1. Acha ou cria software filho (Photoshop, InDesign...)
      let { data: sw } = await supabase.from('softwares').select('id').ilike('nome', reg.tipoRaw).maybeSingle();
      if (!sw) {
        const familia = reg.produtoRaw.toLowerCase().includes('todos')? 'ALL_APPS' : reg.produtoRaw.toLowerCase().includes('acrobat')? 'ACROBAT' : 'SINGLE_POOL';
        const { data: novo } = await supabase.from('softwares').insert({ nome: reg.tipoRaw, familia, qtd_contratada: 0 }).select('id').single();
        sw = novo;
      }
      // 2. Cria pessoa consumindo do balde
      await supabase.from('usuarios').upsert({
        colaborador: reg.colaborador,
        login: reg.login,
        setor: reg.setor?.toUpperCase(),
        software_id: sw!.id,
        status: 'ativo'
      }, { onConflict: 'login' });
    }
    await loadData();
  };

  // FILTROS DINÂMICOS - AGORA POR NOME REAL DO APP
  const filtered = usuarios.filter(u => {
    if (search &&!`${u.colaborador} ${u.login} ${u.software?.nome}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedSoftware && u.software?.nome!== selectedSoftware) return false;
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
