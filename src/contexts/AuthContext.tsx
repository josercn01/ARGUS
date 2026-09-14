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
      options: {
        redirectTo: window.location.origin,
        scopes: 'openid email profile User.Read',
      },
    });
    if (error) setAuthError(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('consulta');
  };

  // Busca role no banco
  const fetchRoleFromDB = async (email: string): Promise<SystemRole> => {
    const { data, error } = await supabase
      .from('permissoes_usuarios')
      .select('role')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar permissoes_usuarios:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error(`E-mail ${email} não encontrado em permissoes_usuarios`);
    }

    return data.role as SystemRole;
  };

  useEffect(() => {
    // 1. Sessão inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user?.email) {
          const dbRole = await fetchRoleFromDB(session.user.email.toLowerCase());
          setUser(session.user as unknown as AuthUser);
          setRole(dbRole);
        }
      } catch (e: any) {
        console.error(e);
        setAuthError(e.message);
        setUser(null);
        await supabase.auth.signOut();
      } finally {
        setLoading(false);
      }
    });

    // 2. Listener de mudança de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user?.email) {
          const dbRole = await fetchRoleFromDB(session.user.email.toLowerCase());
          setUser(session.user as unknown as AuthUser);
          setRole(dbRole);
          setAuthError(null);
        } else {
          setUser(null);
          setRole('consulta');
        }
      } catch (e: any) {
        console.error(e);
        setAuthError(e.message);
        setUser(null);
        setRole('consulta');
        await supabase.auth.signOut();
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
