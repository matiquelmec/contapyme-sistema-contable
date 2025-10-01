import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Crear una única instancia del cliente de Supabase para el lado del cliente
const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'contapyme-auth',
    // Asegurarse de que localStorage solo se usa en el navegador
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// Exportar la instancia única para ser usada en toda la aplicación
export const supabaseClient = supabase;

// Función createClient para compatibilidad con LoginForm
export const createClient = () => {
  return supabaseClient;
};

// Hook personalizado para usar en componentes React
export const useAuth = () => {
  if (typeof window === 'undefined') {
    throw new Error('useAuth debe usarse solo en el cliente');
  }
  return supabaseClient;
};

// Función para log de actividad del usuario (desde el cliente)
export const logUserActivity = async (
  userId: string,
  action: string,
  description?: string,
  metadata?: Record<string, any>,
  companyId?: string
) => {
  try {
    await supabaseClient
      .from('user_activity_log')
      .insert([
        {
          user_id: userId,
          company_id: companyId,
          action,
          description,
          metadata: metadata || {},
        },
      ]);
  } catch (error) {
    console.error('Error logging activity:', error);
    // No fallar silenciosamente el log
  }
};

// Tipos TypeScript para el sistema (duplicados para usar en cliente)
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