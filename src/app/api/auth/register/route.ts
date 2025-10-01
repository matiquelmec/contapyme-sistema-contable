import { createServerClient } from '@/lib/auth'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, selectedPlan = 'monthly' } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // En desarrollo, usar admin client para auto-confirmar
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Crear usuario confirmado automáticamente en desarrollo
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar para desarrollo
      user_metadata: {
        name,
      }
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (data.user) {
      // Determinar límites por plan
      const planLimits = {
        monthly: { companies: 1, employees: 10, trialDays: 7 },
        semestral: { companies: 5, employees: 50, trialDays: 7 },
        annual: { companies: 10, employees: 100, trialDays: 7 }
      }
      const limits = planLimits[selectedPlan as keyof typeof planLimits] || planLimits.monthly
      const trialEndDate = new Date(Date.now() + limits.trialDays * 24 * 60 * 60 * 1000).toISOString()

      // Crear perfil usando admin client
      const { error: profileError } = await supabaseAdmin
        .from('users_new')
        .insert([{
          id: data.user.id,
          email: data.user.email!,
          full_name: name,
          subscription_plan: selectedPlan,
          subscription_status: 'trial',
          max_companies: limits.companies,
          email_verified: false,
          trial_ends_at: trialEndDate,
          timezone: 'America/Santiago',
          language: 'es',
          is_active: true
        }])

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // No fallar el registro, pero log del error
      }

      // Crear suscripción inicial
      const { error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .insert([{
          user_id: data.user.id,
          plan_type: selectedPlan,
          status: 'trial',
          current_period_end: trialEndDate,
          trial_end: trialEndDate,
          company_limit: limits.companies,
          employee_limit: limits.employees,
          amount_cents: 0,
          currency: 'CLP'
        }])

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError)
        // No fallar el registro por esto
      }

      return NextResponse.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          plan: selectedPlan
        },
        session: data.session
      })
    }

    return NextResponse.json(
      { error: 'Error inesperado en el registro' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Error in register API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}