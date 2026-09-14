import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthUser, SystemRole } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  role: SystemRole;
  loading: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'consulta',
  loading: true,
  authError: null,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<SystemRole>('consulta');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const signIn = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: window.location.origin, scopes: 'openid email profile User.Read' },
    });
    if (error) setAuthError(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('consulta');
  };

  async function validate(email: string, sessionUser: any) {
    const { data, error } = await supabase
      .from('permissoes_usuarios')
      .select('role')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.error(error);
      setAuthError(error.message);
      setUser(sessionUser);
      setRole('consulta');
      return;
    }
    if (!data) {
      setAuthError(`Sem permissão: ${email} não está em permissoes_usuarios`);
      setUser(null);
      setRole('consulta');
      await supabase.auth.signOut();
      return;
    }
    setUser(sessionUser);
    setRole(data.role as SystemRole);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user?.email) {
        await validate(data.session.user.email.toLowerCase(), data.session.user);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user?.email) {
        await validate(session.user.email.toLowerCase(), session.user);
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
