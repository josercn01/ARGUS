import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import { Header, TabKey } from '@/components/Header';
import { Dashboard } from '@/pages/Dashboard';
import { AdminLocais } from '@/components/AdminLocais';
import { AccessManagement } from '@/components/AccessManagement';
import { MicrosoftApps } from '@/components/MicrosoftApps';
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

  // Normaliza a aba ativa para lowercase e remove caracteres especiais para comparação segura
  const normalizedTab = String(activeTab || '').toLowerCase().trim();

  const isDashboard = normalizedTab === 'dashboard' || normalizedTab === '';
  const isAdminLocais = normalizedTab.includes('local') || normalizedTab.includes('admin-locais');
  const isPermissoes = normalizedTab.includes('permiss') || normalizedTab.includes('access');
  const isMicrosoft = normalizedTab.includes('microsoft') || normalizedTab.includes('aplicativ');

  return (
    <div className="min-h-screen bg-[#000d17] text-white flex">
      {/* Sidebar Fixa na Esquerda */}
      <Header 
        user={user} 
        role={role} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 ml-72 p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {isDashboard && <Dashboard user={user} role={role} />}
          {isAdminLocais && <AdminLocais />}
          {isPermissoes && <AccessManagement />}
          {isMicrosoft && <MicrosoftApps />}
        </div>
      </main>
    </div>
  );
}

export default App;
