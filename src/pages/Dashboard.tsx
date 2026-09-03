import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { MetricsCards } from '@/components/MetricsCards';
import { FiltersBar } from '@/components/FiltersBar';
import { LicencasTable } from '@/components/LicencasTable';
import { SoftwareManagement } from '@/components/SoftwareManagement';
import { AccessManagement } from '@/components/AccessManagement';
import { AdminLocais } from '@/components/AdminLocais';
import type { LicencaUsuario, Software, LocalTrabalho, SystemRole } from '@/types';

interface DashboardProps {
  user: any;
  role: SystemRole;
}

export function Dashboard({ user, role }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'softwares' | 'permissoes' | 'locais'>('dashboard');
  const [usuarios, setUsuarios] = useState<LicencaUsuario[]>([]);
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [locais, setLocais] = useState<LocalTrabalho[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros da tabela de licenças
  const [search, setSearch] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [uRes, sRes, lRes] = await Promise.all([
        supabase.from('licencas_usuarios').select('*').order('nome'),
        supabase.from('softwares').select('*').order('nome'),
        supabase.from('locais_trabalho').select('*').order('nome'),
      ]);

      if (uRes.data) setUsuarios(uRes.data as LicencaUsuario[]);
      if (sRes.data) setSoftwares(sRes.data as Software[]);
      if (lRes.data) setLocais(lRes.data as LocalTrabalho[]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsuarios = usuarios.filter((u) => {
    const matchesSearch =
      !search ||
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      (u.login && u.login.toLowerCase().includes(search.toLowerCase())) ||
      (u.chapa_matricula && u.chapa_matricula.toLowerCase().includes(search.toLowerCase()));

    const matchesSoftware = !selectedSoftware || u.software_id === selectedSoftware || u.produto === selectedSoftware;
    const matchesLocal = !selectedLocal || u.local_id === selectedLocal || u.local_nome === selectedLocal;
    const matchesStatus = !selectedStatus || u.status === selectedStatus;

    return matchesSearch && matchesSoftware && matchesLocal && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#001726] text-white flex flex-col">
      <Header
        user={user}
        role={role}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            <MetricsCards data={usuarios} softwares={softwares} />

            <div className="space-y-4 pt-4 border-t border-[#1e293b]">
              <FiltersBar
                search={search}
                onSearchChange={setSearch}
                software={selectedSoftware}
                onSoftwareChange={setSelectedSoftware}
                local={selectedLocal}
                onLocalChange={setSelectedLocal}
                status={selectedStatus}
                onStatusChange={setSelectedStatus}
                softwares={softwares}
                locais={locais}
              />

              <LicencasTable
                data={filteredUsuarios}
                softwares={softwares}
                locais={locais}
                role={role}
                loading={loading}
                onRefresh={loadData}
              />
            </div>
          </>
        )}

        {activeTab === 'softwares' && <SoftwareManagement />}
        {activeTab === 'locais' && <AdminLocais />}
        {activeTab === 'permissoes' && <AccessManagement currentUser={user} role={role} />}
      </main>
    </div>
  );
}
