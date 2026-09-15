import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'super_admin' | 'admin' | 'editor' | 'consulta'
const AuthContext = createContext<any>(null)

// Seus emails com poder total, sem depender do banco
const SUPER_ADMINS = ['josercn@senado.leg.br', 'josercr@senado.leg.br']

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<Role>('consulta')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function evaluateUser(sessionUser: any) {
      if (!sessionUser) {
        if(mounted){ setUser(null); setRole('consulta') }
        return
      }

      if(mounted) setUser(sessionUser)
      const emailUser = sessionUser.email?.toLowerCase() || ''

      // REGRA SUPREMA: mantém a sua, só adicionei os 2 emails
      if (SUPER_ADMINS.includes(emailUser)) {
        if(mounted) setRole('super_admin')
        return
      }

      // BLINDAGEM: Busca no banco com timeout de 1.5s pra não travar a tela preta
      // Se o RLS bloquear (seu caso), ele aborta e te deixa como consulta
      try {
        const queryPromise = supabase
          .from('permissoes_usuarios')
          .select('role')
          .ilike('email', emailUser)
          .maybeSingle()
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout-permissao')), 1500)
        )

        const { data: perm } = await Promise.race([queryPromise, timeoutPromise]) as any
        
        if (mounted) {
          if (perm?.role) setRole(perm.role.toLowerCase() as Role)
          else setRole('consulta')
        }
      } catch (e: any) {
        // Se deu timeout ou RLS, não trava - só loga e segue
        if(e.message !== 'timeout-permissao') console.error('Erro ao buscar permissão', e)
        if(mounted) setRole('consulta')
      }
    }

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        if (mounted) await evaluateUser(data.session?.user)
      } catch (e) {
        console.error('Auth init error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Timeout de segurança: nunca fica mais de 2.5s em loading
    const timeout = setTimeout(() => { if(mounted) setLoading(false) }, 2500)
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
      options: { 
        // Adicionei offline_access pra garantir que o provider_token venha na sessão
        // Mantive seus escopos que você já tem permissão
        scopes: 'openid profile email offline_access User.Read User.ReadBasic.All',
        redirectTo: window.location.origin
      }
    })
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      // Limpa primeiro, depois reseta estado
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setRole('consulta');
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
