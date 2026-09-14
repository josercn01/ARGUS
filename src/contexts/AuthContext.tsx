import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'super_admin' | 'admin' | 'consulta'

export const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<Role>('consulta')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Pega sessão atual
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user
      if (sessionUser?.email) {
        await resolveRole(sessionUser)
      }
      setLoading(false)
    })

    // Escuta login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        await resolveRole(session.user)
      } else {
        setUser(null)
        setRole('consulta')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function resolveRole(authUser: any) {
    const email = authUser.email.toLowerCase().trim()
    setUser(authUser)

    // 1. Busca sem dar throw - maybeSingle nunca estoura erro
    const { data, error } = await supabase
      .from('permissoes_usuarios')
      .select('role')
      .ilike('email', email)
      .maybeSingle()

    if (data?.role) {
      setRole(data.role as Role)
      return
    }

    // 2. Se não achou, CRIA AUTOMATICAMENTE como consulta (nunca bloqueia)
    // Se for o josercr, já cria como super_admin
    const newRole = email === 'josercr@senado.leg.br' ? 'super_admin' : 'consulta'
    
    const { data: inserted } = await supabase
      .from('permissoes_usuarios')
      .upsert({ email: email, role: newRole }, { onConflict: 'email' })
      .select('role')
      .single()

    setRole((inserted?.role as Role) || newRole)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
