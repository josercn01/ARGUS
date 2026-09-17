import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

export function App() {
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#00121E] flex items-center justify-center text-[#D4AF37]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen w-full bg-[#000d17] text-white flex overflow-x-hidden">
      <Header user={user} role={role} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 ml-72 min-h-screen p-8 bg-[#000d17] box-border">
        <div className="max-w-7xl mx-auto w-full">
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
