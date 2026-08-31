import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthUser, Role } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SUPER_ADMIN_EMAILS = ['josercn@senado.leg.br'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUserProfile(email: string, displayName: string) {
    const { data } = await supabase
      .from('perfis_usuarios')
      .select('role')
      .eq('email', email)
      .maybeSingle();

    let role: Role;
    if (SUPER_ADMIN_EMAILS.includes(email.toLowerCase())) {
      role = 'super_admin';
      await supabase
        .from('perfis_usuarios')
        .upsert({ email, role: 'super_admin' }, { onConflict: 'email' });
    } else {
      role = (data?.role as Role) ?? 'consulta';
    }
    setUser({ email, name: displayName, role });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email ?? '';
        const name =
          session.user.user_metadata?.full_name ??
          session.user.user_metadata?.name ??
          email;
        (async () => {
          await loadUserProfile(email, name);
          setLoading(false);
        })();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        (async () => {
          if (session?.user) {
            const email = session.user.email ?? '';
            const name =
              session.user.user_metadata?.full_name ??
              session.user.user_metadata?.name ??
              email;
            await loadUserProfile(email, name);
          } else {
            setUser(null);
          }
          setLoading(false);
        })();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile',
        redirectTo: window.location.origin,
        queryParams: {
          tenant: '751d81cc-4c2c-4d22-ad41-440700d5dd0e',
        },
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
