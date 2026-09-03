import { useState, useEffect, useMemo, useCallback } from 'react';

import { supabase } from '@/lib/supabase';

import { useAuth } from '@/contexts/AuthContext';

import { MetricsCards } from '@/components/MetricsCards';

import { FiltersBar } from '@/components/FiltersBar';

import { LicencasTable } from '@/components/LicencasTable';

import { LicencaModal } from '@/components/LicencaModal';

import { ImportCSV } from '@/components/ImportCSV';

import { AccessManagement } from '@/components/AccessManagement';

import { SoftwareManagement } from '@/components/SoftwareManagement';

import { AdminLocais } from '@/components/AdminLocais';

import { LayoutDashboard, Upload, Shield, Package, Monitor, RefreshCw } from 'lucide-react';

import type { LicencaUsuario, Software } from '@/types';



type Tab = 'dashboard' | 'softwares' | 'import' | 'admin_locais' | 'access';



export function Dashboard() {

  const { user } = useAuth();

  const [licencas, setLicencas] = useState<LicencaUsuario[]>([]);

  const [softwares, setSoftwares] = useState<Software[]>([]);

  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>('dashboard');

  const [search, setSearch] = useState('');

  const [depRaiz, setDepRaiz] = useState('');

  const [subDep, setSubDep] = useState('');

  const [modalItem, setModalItem] = useState<Partial<LicencaUsuario> | null | undefined>(undefined);



  const canWrite = user?.role === 'editor' || user?.role === 'admin' || user?.role === 'super_admin';

  const isSuperAdmin = user?.role === 'super_admin';



  const fetchLicencas = useCallback(async () => {

    setLoading(true);

    const PAGE_SIZE = 1000;

    let offset = 0;

    let allRows: LicencaUsuario[] = [];

    let hasMore = true;

    while (hasMore) {

      const { data, error } = await supabase

        .from('licencas_usuarios')

        .select('*')

        .order('nome')

        .range(offset, offset + PAGE_SIZE - 1);

      if (error) { setLoading(false); return; }

      if (data && data.length > 0) allRows = [...allRows, ...(data as LicencaUsuario[])];

      hasMore = data ? data.length === PAGE_SIZE : false;

      offset += PAGE_SIZE;

    }

    setLicencas(allRows);

    setLoading(false);

  }, []);



  const fetchSoftwares = useCallback(async () => {

    const { data, error } = await supabase

      .from('softwares')

      .select('*')

      .order('nome');

    if (!error && data) setSoftwares(data as Software[]);

  }, []);



  useEffect(() => {

    fetchLicencas();

    fetchSoftwares();

  }, [fetchLicencas, fetchSoftwares]);



  const depRaizOptions = useMemo(() =>

    [...new Set(licencas.map((l) => l.departamento_raiz).filter(Boolean) as string[])].sort(),

    [licencas]

  );



  const subDepOptions = useMemo(() => {

    if (!depRaiz) return [];

    return [...new Set(

      licencas

        .filter((l) => l.departamento_raiz === depRaiz)

        .map((l) => l.sub_departamento)

        .filter(Boolean) as string[]

    )].sort();

  }, [licencas, depRaiz]);



  const filtered = useMemo(() => {

    const q = search.toLowerCase();

    return licencas.filter((l) => {

      const matchSearch = !q || [l.nome, l.email, l.matricula, l.tipo_licenca, l.produto].some((v) => v?.toLowerCase().includes(q));

      const matchDep = !depRaiz || l.departamento_raiz === depRaiz;

      const matchSub = !subDep || l.sub_departamento === subDep;

      return matchSearch && matchDep && matchSub;

    });

  }, [licencas, search, depRaiz, subDep]);



  async function handleSave(data: Partial<LicencaUsuario>) {

    const payload = {

      ...data,

      atualizado_por: user?.email,

      atualizado_em: new Date().toISOString(),

    };

    if (data.id) {

      const { error } = await supabase.from('licencas_usuarios').update(payload).eq('id', data.id);

      if (error) throw new Error(error.message);

    } else {

      const { error } = await supabase.from('licencas_usuarios').insert(payload);

      if (error) throw new Error(error.message);

    }

    setModalItem(undefined);

    await fetchLicencas();

  }



  async function handleDelete(id: string) {

    if (!window.confirm('Confirmar exclusão deste registro?')) return;

    const { error } = await supabase.from('licencas_usuarios').delete().eq('id', id);

    if (!error) await fetchLicencas();

  }



  async function handleImport(rows: Partial<LicencaUsuario>[]) {

    let success = 0;

    const errors: string[] = [];

    for (const row of rows) {

      if (!row.email) { errors.push('Linha sem e-mail ignorada.'); continue; }

      const { error } = await supabase

        .from('licencas_usuarios')

        .upsert({ ...row, atualizado_por: user?.email, atualizado_em: new Date().toISOString() }, { onConflict: 'email' });

      if (error) errors.push(`${row.email}: ${error.message}`);

      else success++;

    }

    await fetchLicencas();

    return { success, errors };

  }



  const tabs: { key: Tab; label: string; icon: React.ElementType; show: boolean }[] = [

    { key: 'dashboard', label: 'Licenças', icon: LayoutDashboard, show: true },

    { key: 'softwares', label: 'Softwares', icon: Package, show: canWrite },

    { key: 'import', label: 'Importar Dados', icon: Upload, show: canWrite },

    { key: 'admin_locais', label: 'Admins Locais', icon: Monitor, show: true },

    { key: 'access', label: 'Gestão de Acessos', icon: Shield, show: isSuperAdmin },

  ];



  const visibleTabs = tabs.filter((t) => t.show);



  return (

    <div className="flex bg-[#001726] min-h-[calc(100vh-4rem)] text-white">

      {/* Sidebar Desktop */}

      <aside className="w-60 min-h-[calc(100vh-4rem)] bg-[#001E33] border-r border-[#1e293b] flex flex-col py-4 sticky top-16 hidden md:flex">

        <nav className="flex-1 space-y-1 px-3">

          {visibleTabs.map((t) => (

            <button

              key={t.key}

              onClick={() => setTab(t.key)}

              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${

                tab === t.key

                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'

                  : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'

              }`}

            >

              <t.icon className="w-4 h-4" />

              {t.label}

            </button>

          ))}

        </nav>

      </aside>



      {/* Mobile Tab Bar */}

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#001E33] border-t border-[#1e293b] z-40">

        <div className="flex overflow-x-auto">

          {visibleTabs.map((t) => (

            <button

              key={t.key}

              onClick={() => setTab(t.key)}

              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${

                tab === t.key ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-[#64748b]'

              }`}

            >

              <t.icon className="w-4 h-4" />

              {t.label}

            </button>

          ))}

        </div>

      </div>



      {/* Main Content Area */}

      <div className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 max-w-screen-2xl">

        {/* Tab: Dashboard / Licenças */}

        {tab === 'dashboard' && (

          <div className="space-y-5 animate-fade-in">

            <MetricsCards data={licencas} softwares={softwares} />



            <div className="flex flex-col xl:flex-row xl:items-center gap-3">

              <div className="flex-1">

                <FiltersBar

                  search={search} onSearch={setSearch}

                  depRaiz={depRaiz} onDepRaiz={setDepRaiz}

                  subDep={subDep} onSubDep={setSubDep}

                  depRaizOptions={depRaizOptions}

                  subDepOptions={subDepOptions}

                />

              </div>

              <button

                onClick={fetchLicencas}

                disabled={loading}

                className="flex items-center justify-center gap-2 text-sm text-[#94a3b8] hover:text-white bg-[#001E33] border border-[#1e293b] px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-md"

              >

                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />

                Atualizar

              </button>

            </div>



            {loading ? (

              <div className="flex items-center justify-center py-20">

                <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />

              </div>

            ) : (

              <LicencasTable

                data={filtered}

                role={user!.role}

                onEdit={(item) => setModalItem(item)}

                onDelete={handleDelete}

                onAdd={() => setModalItem({})}

              />

            )}

          </div>

        )}



        {/* Tab: Softwares */}

        {tab === 'softwares' && canWrite && (

          <div className="animate-fade-in">

            <SoftwareManagement />

          </div>

        )}



        {/* Tab: Import */}

        {tab === 'import' && canWrite && (

          <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-6 shadow-xl animate-fade-in">

            <ImportCSV onImport={handleImport} />

          </div>

        )}



        {/* Tab: Admin Locais */}

        {tab === 'admin_locais' && (

          <div className="animate-fade-in">

            <AdminLocais />

          </div>

        )}



        {/* Tab: Access Management */}

        {tab === 'access' && isSuperAdmin && (

          <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-6 shadow-xl animate-fade-in">

            <AccessManagement currentEmail={user!.email} />

          </div>

        )}



        {/* Modal */}

        {modalItem !== undefined && (

          <LicencaModal

            item={modalItem}

            onClose={() => setModalItem(undefined)}

            onSave={handleSave}

          />

        )}

      </div>

    </div>

  );

} 

