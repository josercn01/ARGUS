import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import { Header, TabKey } from '@/components/Header';
import { Dashboard } from '@/pages/Dashboard';
import { AdminLocais } from '@/components/AdminLocais';
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

  return (
    <div className="min-h-screen bg-[#000d17] text-white flex">
      {/* Sidebar Fixa na Esquerda */}
      <Header 
        user={user} 
        role={role} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Conteúdo Principal com margem para compensar a sidebar (ml-72) */}
      <main className="flex-1 ml-72 p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard user={user} role={role} />}
          {activeTab === 'admin-locais' && <AdminLocais />}
          {activeTab === 'microsoft-apps' && <MicrosoftApps />}
        </div>
      </main>
    </div>
  );
}

export default App;
