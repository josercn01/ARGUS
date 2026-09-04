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

  // Função disparada pelo botão "Entrar com Conta Corporativa" com os escopos corrigidos para o Azure
  const signIn = async () => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: window.location.origin,
          scopes: 'openid email profile User.Read',
        },
      });
      if (error) {
        console.error('Erro no signInWithOAuth:', error.message);
        setAuthError(error.message);
      }
    } catch (err) {
      console.error('Erro inesperado ao iniciar login:', err);
      setAuthError('Erro inesperado ao conectar com o provedor de identidade.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('consulta');
    setAuthError(null);
  };

  async function validateAndFetchUser(sessionUser: any) {
    if (!sessionUser?.email) {
      setUser(null);
      setLoading(false);
      return;
    }

    const email = sessionUser.email.toLowerCase();

    // 1. Validação estrita do domínio do Senado
    if (!email.endsWith('@senado.leg.br')) {
      setAuthError('Acesso restrito a contas com o domínio @senado.leg.br.');
      await supabase.auth.signOut();
      setUser(null);
      setRole('consulta');
      setLoading(false);
      return;
    }

    // 2. Validação se o usuário está cadastrado na tabela correta permissoes_usuarios
    try {
      const { data, error } = await supabase
        .from('permissoes_usuarios')
        .select('role')
        .eq('email', email)
        .maybeSingle();

      if (error || !data) {
        setAuthError('Seu e-mail corporativo não está cadastrado como autorizado neste sistema.');
        await supabase.auth.signOut();
        setUser(null);
        setRole('consulta');
        setLoading(false);
        return;
      }

      setAuthError(null);
      setUser(sessionUser as AuthUser);
      setRole(data.role as SystemRole);
    } catch (err) {
      console.error('Erro ao validar permissões:', err);
      setAuthError('Erro interno ao validar permissões de acesso.');
      await supabase.auth.signOut();
      setUser(null);
      setRole('consulta');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        validateAndFetchUser(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        validateAndFetchUser(session.user);
      } else {
        setUser(null);
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

export const useAuth = () => useContext(AuthContext);
