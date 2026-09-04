import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { Dashboard } from '@/pages/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#00121E] flex items-center justify-center text-[#D4AF37]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return <Dashboard user={user} role={role} />;
}
