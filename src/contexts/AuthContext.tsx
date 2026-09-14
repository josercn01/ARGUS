import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<any>('consulta');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const signIn = async () => {
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

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email?.toLowerCase();
        console.log('Tentando validar:', email);
        
        // EMERGÊNCIA: libera seu email sem consultar banco
        if (email === 'josercr@senado.leg.br') {
          setUser(session.user);
          setRole('super_admin');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.from('permissoes_usuarios').select('role').ilike('email', email).maybeSingle();
        console.log('Resultado DB:', data, 'Erro:', error);
        
        if (data) {
          setUser(session.user);
          setRole(data.role);
        } else {
          setAuthError(`DB retornou vazio para ${email}. Erro: ${error?.message}`);
          // NÃO DESLOGA MAIS - quebra o loop
          setUser(session.user);
          setRole('consulta');
        }
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        if (session.user.email?.toLowerCase() === 'josercr@senado.leg.br') {
          setUser(session.user);
          setRole('super_admin');
          return;
        }
        const { data } = await supabase.from('permissoes_usuarios').select('role').ilike('email', session.user.email).maybeSingle();
        setUser(session.user);
        setRole(data?.role || 'consulta');
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, role, loading, authError, signIn, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
