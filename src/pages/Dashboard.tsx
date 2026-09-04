import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Header, type TabKey } from '@/components/Header';
import { MetricsCards } from '@/components/MetricsCards';
import { FiltersBar } from '@/components/FiltersBar';
import { LicencasTable } from '@/components/LicencasTable';
import { SoftwareManagement } from '@/components/SoftwareManagement';
import { AdminLocais } from '@/components/AdminLocais';
import { AccessManagement } from '@/components/AccessManagement';
import type { AuthUser, SystemRole, LicencaUsuario, Software, LocalTrabalho } from '@/types';

interface DashboardProps {
  user: AuthUser | null;
  role: SystemRole;
}

export function Dashboard({ user, role }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [licencas, setLicencas] = useState<LicencaUsuario[]>([]);
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [locais, setLocais] = useState<LocalTrabalho[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [licRes, softRes, locRes] = await Promise.all([
        supabase.from('licencas_usuarios').select('*').order('nome'),
        supabase.from('softwares').select('*').order('nome'),
        supabase.from('locais_trabalho').select('*').order('nome'),
      ]);

      if (licRes.data) setLicencas(licRes.data);
      if (softRes.data) setSoftwares(softRes.data);
      if (locRes.data) setLocais(locRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aplicar filtros nas licenças
  const filteredLicencas = licencas.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchNome = item.nome?.toLowerCase().includes(q);
      const matchEmail = item.email?.toLowerCase().includes(q);
      const matchLogin = item.login?.toLowerCase().includes(q);
      const matchChapa = (item.chapa_matricula || item.matricula)?.toLowerCase().includes(q);
      if (!matchNome && !matchEmail && !matchLogin && !matchChapa) return false;
    }

    if (selectedSoftware && item.software_id !== selectedSoftware) {
      return false;
    }

    if (selectedLocal && item.local_id !== selectedLocal) {
      return false;
    }

    if (selectedStatus && item.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#00121E] text-white flex flex-col">
      <Header
        user={user}
        role={role}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <MetricsCards
              licencas={licencas}
              softwares={softwares}
              locais={locais}
            />

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
              data={filteredLicencas}
              softwares={softwares}
              locais={locais}
              role={role}
              loading={loading}
              onRefresh={loadData}
            />
          </div>
        )}

        {activeTab === 'softwares' && (
          <SoftwareManagement
            softwares={softwares}
            role={role}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'locais' && (
          <AdminLocais
            locais={locais}
            role={role}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'permissoes' && (
          <AccessManagement
            currentUser={user}
            role={role}
          />
        )}
      </main>
    </div>
  );
}
