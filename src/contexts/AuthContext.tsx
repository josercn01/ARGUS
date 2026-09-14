import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'super_admin' | 'admin' | 'consulta'
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
          // busca role SEM travar
          const { data: perm } = await supabase
            .from('permissoes_usuarios')
            .select('role')
            .ilike('email', data.session.user.email!)
            .maybeSingle()
          
          if (perm?.role) setRole(perm.role as Role)
          else if (data.session.user.email?.toLowerCase() === 'josercr@senado.leg.br') setRole('super_admin')
        }
      } catch (e) {
        console.error('Auth init error', e)
      } finally {
        if (mounted) setLoading(false) // <--- ISSO DESTRAVA O BOTÃO
      }
    }

    // Safety: destrava em 3s de qualquer jeito
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
        if (perm?.role) setRole(perm.role as Role)
      } else {
        setUser(null)
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
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signInWithMicrosoft, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
