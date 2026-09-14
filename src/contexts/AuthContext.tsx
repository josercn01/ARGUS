import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('consulta');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: window.location.origin, scopes: 'openid email profile User.Read' },
    });
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    // MAPA FIXO - não consulta tabela
    const MAP: any = {
      'josercr@senado.leg.br': 'super_admin',
      'guijust@senado.leg.br': 'editor',
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const email = data.session.user.email.toLowerCase();
        setUser(data.session.user);
        setRole(MAP[email] || 'consulta');
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        const email = session.user.email.toLowerCase();
        setUser(session.user);
        setRole(MAP[email] || 'consulta');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
