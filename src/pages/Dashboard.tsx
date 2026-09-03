import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart3, 
  Users, 
  Package, 
  FileSpreadsheet, 
  ShieldAlert, 
  UserCheck, 
  Plus, 
  Search, 
  Download, 
  LogOut, 
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { MetricsCards } from '../components/MetricsCards';
import { LicencasTable } from '../components/LicencasTable';
import { SoftwareModal } from '../components/SoftwareModal';
import { ImportModal } from '../components/ImportModal';
import { AdminLocais } from '../components/AdminLocais';
import { GestaoAcessos } from '../components/GestaoAcessos';
import type { LicencaUsuario, Software, UserProfile } from '../types';

export function Dashboard() {
  const [tab, setTab] = useState<'licencas' | 'softwares' | 'importar' | 'admin_locais' | 'acessos'>('licencas');
  const [licencas, setLicencas] = useState<LicencaUsuario[]>([]);
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSoftware, setFilterSoftware] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isSoftwareModalOpen, setIsSoftwareModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    await Promise.all([
      fetchUserProfile(),
      fetchLicencas(),
      fetchSoftwares()
    ]);
    setLoading(false);
  }

  async function fetchUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setUserProfile(data);
    }
  }

  async function fetchLicencas() {
    const { data, error } = await supabase
      .from('licencas_usuarios')
      .select('*')
      .order('nome');

    if (!error && data) {
      setLicencas(data);
    }
  }

  async function fetchSoftwares() {
    const { data, error } = await supabase
      .from('softwares')
      .select('*')
      .order('nome');

    if (!error && data) {
      setSoftwares(data);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  // Filtros aplicados na listagem de licenças
  const filteredLicencas = licencas.filter(item => {
    const matchesSearch = 
      item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.login?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lotacao?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSoftware = filterSoftware === 'all' || item.produto === filterSoftware;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'ativa' && item.possui_licenca) ||
      (filterStatus === 'inativa' && !item.possui_licenca);

    return matchesSearch && matchesSoftware && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#001726] text-slate-100 flex">
      {/* 1. SIDEBAR LATERAL DE NAVEGAÇÃO */}
      <aside className="w-60 bg-[#001726] border-r border-[#1e293b] flex flex-col justify-between shrink-0">
        <div>
          {/* Topo / Logo */}
          <div className="p-6 border-b border-[#1e293b]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#001E33] border border-[#D4AF37]/30 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white tracking-wide">ARGUS</h1>
                <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-semibold">Controle de Ativos</p>
              </div>
            </div>
          </div>

          {/* Menu de Navegação */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setTab('licencas')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'licencas'
                  ? 'bg-[#001E33] text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                  : 'text-[#94a3b8] hover:bg-[#001E33]/50 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Licenças
            </button>

            <button
              onClick={() => setTab('softwares')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'softwares'
                  ? 'bg-[#001E33] text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                  : 'text-[#94a3b8] hover:bg-[#001E33]/50 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              Softwares
            </button>

            <button
              onClick={() => setTab('importar')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'importar'
                  ? 'bg-[#001E33] text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                  : 'text-[#94a3b8] hover:bg-[#001E33]/50 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Importar Dados
            </button>

            <button
              onClick={() => setTab('admin_locais')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'admin_locais'
                  ? 'bg-[#001E33] text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                  : 'text-[#94a3b8] hover:bg-[#001E33]/50 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Admins Locais
            </button>

            {userProfile?.role === 'super_admin' && (
              <button
                onClick={() => setTab('acessos')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'acessos'
                    ? 'bg-[#001E33] text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                    : 'text-[#94a3b8] hover:bg-[#001E33]/50 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Gestão de Acessos
              </button>
            )}
          </nav>
        </div>

        {/* Rodapé da Sidebar / Perfil do Usuário */}
        <div className="p-4 border-t border-[#1e293b]">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-white truncate">{userProfile?.email || 'Usuário'}</p>
              <p className="text-[10px] text-[#94a3b8] capitalize">{userProfile?.role || 'Operador'}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sair da Conta"
              className="p-2 text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. CONTEÚDO PRINCIPAL (MUDANÇA DE ABAS) */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* TAB 1: LICENÇAS */}
        {tab === 'licencas' && (
          <div className="space-y-6 animate-fade-in">
            {/* Topo / Métricas */}
            <MetricsCards data={licencas} softwares={softwares} />

            {/* Filtros e Busca */}
            <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nome, login, e-mail ou lotação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#001726] border border-[#1e293b] focus:border-[#0078D4] text-white text-xs rounded-lg pl-9 pr-[#0078D4] py-2.5 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={filterSoftware}
                  onChange={(e) => setFilterSoftware(e.target.value)}
                  className="bg-[#001726] border border-[#1e293b] text-xs text-white rounded-lg px-3 py-2.5 outline-none"
                >
                  <option value="all">Todos os Softwares</option>
                  {softwares.map(sw => (
                    <option key={sw.id} value={sw.nome}>{sw.nome}</option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#001726] border border-[#1e293b] text-xs text-white rounded-lg px-3 py-2.5 outline-none"
                >
                  <option value="all">Todos os Status</option>
                  <option value="ativa">Licença Ativa</option>
                  <option value="inativa">Sem Licença</option>
                </select>

                <button
                  onClick={loadInitialData}
                  disabled={loading}
                  className="p-2.5 bg-[#001726] border border-[#1e293b] hover:border-[#0078D4] text-white rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 text-[#0078D4] ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Tabela Principal */}
            <LicencasTable data={filteredLicencas} onRefresh={fetchLicencas} />
          </div>
        )}

        {/* TAB 2: SOFTWARES */}
        {tab === 'softwares' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Inventário de Softwares</h2>
                <p className="text-xs text-[#94a3b8] mt-1">Gerencie a quantidade contratada e os tipos de licença.</p>
              </div>
              <button
                onClick={() => setIsSoftwareModalOpen(true)}
                className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#0063b1] text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" /> Novo Software
              </button>
            </div>

            {/* Grid/Lista de Softwares cadastrados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {softwares.map(sw => (
                <div key={sw.id} className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 shadow-md">
                  <h3 className="font-bold text-white text-base">{sw.nome}</h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{sw.fabricante || 'Fabricante N/A'}</p>
                  <div className="mt-4 pt-4 border-t border-[#1e293b] flex justify-between items-center text-xs">
                    <span className="text-[#94a3b8]">Quantidade Total:</span>
                    <span className="font-bold text-white text-sm">{sw.quantidade_total || sw.quantidade || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: IMPORTAR DADOS */}
        {tab === 'importar' && (
          <div className="animate-fade-in">
            <ImportModal onImportSuccess={loadInitialData} />
          </div>
        )}

        {/* TAB 4: ADMIN LOCAIS */}
        {tab === 'admin_locais' && (
          <div className="animate-fade-in">
            <AdminLocais />
          </div>
        )}

        {/* TAB 5: GESTÃO DE ACESSOS (APENAS SUPER ADMIN) */}
        {tab === 'acessos' && userProfile?.role === 'super_admin' && (
          <div className="animate-fade-in">
            <GestaoAcessos />
          </div>
        )}
      </main>

      {/* MODAL DE SOFTWARE */}
      {isSoftwareModalOpen && (
        <SoftwareModal
          isOpen={isSoftwareModalOpen}
          onClose={() => setIsSoftwareModalOpen(false)}
          onSuccess={fetchSoftwares}
        />
      )}
    </div>
  );
}
