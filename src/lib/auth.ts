import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente para uso en componentes del lado del cliente
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'contapyme-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
}

// Cliente para uso en el servidor (con cookies)
export const createServerClient = () => {
  const cookieStore = cookies()

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'cache-control': 'no-cache',
      },
    },
    // Configuración de cookies para SSR
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options })
      },
    },
  })
}

// Función para obtener el usuario actual en el servidor
export const getUser = async () => {
  try {
    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('Error obteniendo usuario:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error en getUser:', error)
    return null
  }
}

// Función para obtener la sesión actual en el servidor
export const getSession = async () => {
  try {
    const supabase = createServerClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Error obteniendo sesión:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Error en getSession:', error)
    return null
  }
}

// Función para obtener el perfil completo del usuario con empresas
export const getUserProfile = async (userId: string) => {
  try {
    const supabase = createServerClient()

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('users_new')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error obteniendo perfil:', profileError)
      return null
    }

    // Obtener empresas accesibles del usuario
    const { data: companies, error: companiesError } = await supabase
      .rpc('get_user_companies_new', { user_uuid: userId })

    if (companiesError) {
      console.error('Error obteniendo empresas:', companiesError)
    }

    // Obtener suscripción activa
    const { data: subscription, error: subscriptionError } = await supabase
      .rpc('get_active_subscription_new', { user_uuid: userId })

    if (subscriptionError) {
      console.error('Error obteniendo suscripción:', subscriptionError)
    }

    return {
      ...profile,
      companies: companies || [],
      subscription: subscription || null
    }
  } catch (error) {
    console.error('Error en getUserProfile:', error)
    return null
  }
}

// Función para verificar si el usuario puede crear empresas
export const canUserCreateCompany = async (userId: string): Promise<boolean> => {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .rpc('can_create_company_new', { user_uuid: userId })

    if (error) {
      console.error('Error verificando límite de empresas:', error)
      return false
    }

    return data || false
  } catch (error) {
    console.error('Error en canUserCreateCompany:', error)
    return false
  }
}

// Función para obtener empresas del usuario
export const getUserCompanies = async (userId: string) => {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .rpc('get_user_companies_new', { user_uuid: userId })

    if (error) {
      console.error('Error obteniendo empresas del usuario:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error en getUserCompanies:', error)
    return []
  }
}

// Función para crear una nueva empresa
export const createUserCompany = async (
  userId: string,
  companyData: {
    business_name: string
    legal_name?: string
    rut: string
    industry_sector?: string
    address?: string
    phone?: string
    email?: string
  }
) => {
  try {
    const supabase = createServerClient()

    // Verificar que el usuario puede crear empresas
    const canCreate = await canUserCreateCompany(userId)
    if (!canCreate) {
      throw new Error('Has alcanzado el límite de empresas para tu plan')
    }

    // Crear la empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{
        business_name: companyData.business_name,
        legal_name: companyData.legal_name || companyData.business_name,
        rut: companyData.rut,
        industry_sector: companyData.industry_sector,
        address: companyData.address,
        phone: companyData.phone,
        email: companyData.email,
        status: 'active'
      }])
      .select()
      .single()

    if (companyError) {
      throw companyError
    }

    // Crear la relación usuario-empresa
    const { error: relationError } = await supabase
      .from('user_companies')
      .insert([{
        user_id: userId,
        company_id: company.id,
        role: 'owner',
        is_active: true
      }])

    if (relationError) {
      // Si falla la relación, eliminar la empresa creada
      await supabase.from('companies').delete().eq('id', company.id)
      throw relationError
    }

    return company
  } catch (error) {
    console.error('Error creando empresa:', error)
    throw error
  }
}

// Función para actualizar el plan de suscripción
export const updateUserSubscription = async (
  userId: string,
  newPlan: 'monthly' | 'semestral' | 'annual'
) => {
  try {
    const supabase = createServerClient()

    const { error } = await supabase
      .rpc('update_user_limits_new', {
        user_uuid: userId,
        new_plan: newPlan
      })

    if (error) {
      throw error
    }

    return true
  } catch (error) {
    console.error('Error actualizando suscripción:', error)
    throw error
  }
}

// Función para log de actividad del usuario
export const logUserActivity = async (
  userId: string,
  action: string,
  description?: string,
  metadata?: Record<string, any>,
  companyId?: string
) => {
  try {
    const supabase = createServerClient()

    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userId,
        company_id: companyId,
        action,
        description,
        metadata: metadata || {}
      }])
  } catch (error) {
    console.error('Error logging activity:', error)
    // No fallar silenciosamente el log
  }
}

// Hook personalizado para usar en componentes React
export const useAuth = () => {
  if (typeof window === 'undefined') {
    throw new Error('useAuth debe usarse solo en el cliente')
  }

  return createClient()
}

// Tipos TypeScript para el sistema
export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  timezone: string
  language: string
  subscription_plan: 'monthly' | 'semestral' | 'annual'
  subscription_status: 'active' | 'trial' | 'suspended' | 'expired'
  max_companies: number
  last_login?: string
  email_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  companies?: UserCompany[]
  subscription?: UserSubscription
}

export interface UserCompany {
  company_id: string
  company_name: string
  company_rut: string
  user_role: 'owner' | 'admin' | 'accountant' | 'viewer'
  is_owner: boolean
}

export interface UserSubscription {
  id: string
  plan_type: 'monthly' | 'semestral' | 'annual'
  status: 'active' | 'trial' | 'suspended' | 'cancelled' | 'expired'
  current_period_start: string
  current_period_end: string
  trial_end?: string
  company_limit: number
  employee_limit: number
  amount_cents?: number
  currency: string
}