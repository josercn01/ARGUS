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

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        if (mounted && data.session?.user) {
          setUser(data.session.user)
          const { data: perm } = await supabase
            .from('permissoes_usuarios')
            .select('role')
            .ilike('email', data.session.user.email!)
            .maybeSingle()
          
          if (perm?.role) {
            setRole(perm.role.toLowerCase() as Role)
          } else if (data.session.user.email?.toLowerCase() === 'josercn@senado.leg.br') {
            setRole('super_admin')
          }
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
      if (session?.user) {
        setUser(session.user)
        const { data: perm } = await supabase
          .from('permissoes_usuarios')
          .select('role')
          .ilike('email', session.user.email!)
          .maybeSingle()
        
        if (perm?.role) {
          setRole(perm.role.toLowerCase() as Role)
        } else if (session.user.email?.toLowerCase() === 'josercn@senado.leg.br') {
          setRole('super_admin')
        }
      } else {
        setUser(null)
        setRole('consulta')
      }
      setLoading(false)
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
      // Encerra a sessão globalmente no Supabase
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      // Limpeza profunda de armazenamentos e tokens residuais
      localStorage.clear();
      sessionStorage.clear();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          localStorage.removeItem(key);
        }
      }

      setUser(null);
      setRole('consulta');

      // Redireciona e limpa o histórico da sessão atual
      window.location.replace('/');
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signInWithMicrosoft, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
