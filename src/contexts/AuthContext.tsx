import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthUser, SystemRole } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  role: SystemRole;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'consulta',
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<SystemRole>('consulta');
  const [loading, setLoading] = useState(true);

  async function fetchUserRole(email: string) {
    try {
      const { data, error } = await supabase
        .from('permissoes_usuarios')
        .select('role')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('Erro ao consultar permissoes_usuarios:', error);
        setRole('consulta');
        return;
      }

      if (data && data.role) {
        setRole(data.role as SystemRole);
      } else {
        setRole('consulta');
      }
    } catch (err) {
      console.error('Erro na requisição de role:', err);
      setRole('consulta');
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = (session?.user as unknown as AuthUser) || null;
      setUser(currentUser);
      if (currentUser?.email) {
        fetchUserRole(currentUser.email);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = (session?.user as unknown as AuthUser) || null;
      setUser(currentUser);
      if (currentUser?.email) {
        fetchUserRole(currentUser.email);
      } else {
        setRole('consulta');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
