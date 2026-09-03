import { useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import { Header } from '@/components/Header';
import { Dashboard } from '@/pages/Dashboard';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#001726] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#001E33] border border-[#D4AF37]/30 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#001726] text-white">
      <Header />
      <main>
        <Dashboard />
      </main>
    </div>
  );
}
