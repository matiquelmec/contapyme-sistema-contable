import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    // Verificar autenticación
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener información del usuario y suscripción
    const { data: userProfile, error: userError } = await supabase
      .from('users_new')
      .select('subscription_plan, subscription_status, trial_ends_at, max_companies')
      .eq('id', user.id)
      .single()

    if (userError) {
      return NextResponse.json(
        { success: false, error: 'Error obteniendo perfil de usuario' },
        { status: 500 }
      )
    }

    // Obtener información de suscripción detallada
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const now = new Date()
    const trialEnd = userProfile.trial_ends_at ? new Date(userProfile.trial_ends_at) : null
    const isTrialActive = userProfile.subscription_status === 'trial' && trialEnd && trialEnd > now
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0

    return NextResponse.json({
      success: true,
      user: {
        subscription_plan: userProfile.subscription_plan,
        subscription_status: userProfile.subscription_status,
        trial_ends_at: userProfile.trial_ends_at,
        max_companies: userProfile.max_companies,
        is_trial_active: isTrialActive,
        days_left: daysLeft,
        is_expired: daysLeft === 0 && userProfile.subscription_status === 'trial'
      },
      subscription: subscription || null
    })

  } catch (error) {
    console.error('Error obteniendo estado de trial:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}