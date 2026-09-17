import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import { Header, TabKey } from '@/components/Header';
import { Dashboard } from '@/pages/Dashboard';
import { AdminLocais } from '@/components/AdminLocais';
import { AccessManagement } from '@/components/AccessManagement';
import { MicrosoftApps } from '@/components/MicrosoftApps';
import { AdobeApps } from '@/components/AdobeApps';
import { SistemasCorporativos } from '@/components/SistemasCorporativos';
import { CertificadosBirdId } from '@/components/CertificadosBirdId';
import { CartelaClientes } from '@/components/CartelaClientes';
import { Loader2, Menu, X } from 'lucide-react';

const STORAGE_TAB_KEY = 'argus_active_tab';

export function App() {
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TAB_KEY) as TabKey;
      return saved || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TAB_KEY, activeTab);
    } catch {}
    setMobileOpen(false);
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#00121E] flex items-center justify-center text-[#D4AF37]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-[11px] font-mono tracking-widest text-[#64748b]">ARGUS • CARREGANDO</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen w-full bg-[#000d17] text-white flex overflow-x-hidden">
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 rounded-xl bg-[#00121E] border border-[#1e293b] flex items-center justify-center text-[#D4AF37]"
      >
        {mobileOpen? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar - Desktop sempre visível, mobile drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300
        lg:translate-x-0
        ${mobileOpen? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Header user={user} role={role} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Conteúdo - agora sem p-8 conflitando com -m-8 das telas */}
      <main className="flex-1 lg:ml-72 min-h-screen bg-[#000d17] w-full">
        <div className="w-full">
          {activeTab === 'dashboard' && <Dashboard user={user} role={role} />}
          {activeTab === 'admin-locais' && <AdminLocais role={role} />}
          {activeTab === 'permissoes' && <AccessManagement currentRole={role} currentUserEmail={user?.email || ''} />}
          {activeTab === 'microsoft-apps' && <MicrosoftApps />}
          {activeTab === 'adobe-apps' && <AdobeApps />}
          {activeTab === 'sistemas-corporativos' && <SistemasCorporativos />}
          {activeTab === 'certificados-bird' && <CertificadosBirdId />}
          {activeTab === 'cartela-clientes' && <CartelaClientes />}
        </div>
      </main>
    </div>
  );
}

export default App;
