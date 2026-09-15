import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'super_admin' | 'admin' | 'editor' | 'consulta'
const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<Role>('consulta')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function evaluateUser(sessionUser: any) {
      if (!sessionUser) {
        setUser(null)
        setRole('consulta')
        return
      }

      setUser(sessionUser)
      const emailUser = sessionUser.email?.toLowerCase() || ''

      // REGRA SUPREMA: Força super_admin imediatamente para o seu e-mail
      if (emailUser === 'josercn@senado.leg.br') {
        setRole('super_admin')
        return
      }

      // Busca na tabela de permissões para os demais usuários
      try {
        const { data: perm } = await supabase
          .from('permissoes_usuarios')
          .select('role')
          .ilike('email', emailUser)
          .maybeSingle()
        
        if (perm?.role) {
          setRole(perm.role.toLowerCase() as Role)
        } else {
          setRole('consulta')
        }
      } catch (e) {
        console.error('Erro ao buscar permissão', e)
        setRole('consulta')
      }
    }

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        if (mounted) {
          await evaluateUser(data.session?.user)
        }
      } catch (e) {
        console.error('Auth init error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    const timeout = setTimeout(() => setLoading(false), 3000)
    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        await evaluateUser(session?.user)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { scopes: 'email openid profile' }
    })
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      setUser(null);
      setRole('consulta');

      // Redireciona limpando os tokens e hashes da URL para evitar re-login automático
      window.location.href = window.location.origin + window.location.pathname;
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signInWithMicrosoft, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
