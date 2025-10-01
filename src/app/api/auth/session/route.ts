import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value
    const userId = cookieStore.get('sb-user-id')?.value

    if (!accessToken || !userId) {
      return NextResponse.json({ user: null, session: null })
    }

    // Crear cliente admin para verificar sesión
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

    // Verificar que el token es válido y obtener usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken)

    if (userError || !user) {
      // Token inválido, limpiar cookies
      cookieStore.delete('sb-access-token')
      cookieStore.delete('sb-refresh-token')
      cookieStore.delete('sb-user-id')

      return NextResponse.json({ user: null, session: null })
    }

    // Obtener perfil completo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users_new')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ user: null, session: null })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: profile.full_name,
        plan: profile.subscription_plan,
        status: profile.subscription_status,
        profile: profile
      },
      session: {
        access_token: accessToken,
        expires_at: user.app_metadata?.expires_at,
        user: user
      }
    })

  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json({ user: null, session: null })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()

    // Limpiar todas las cookies de sesión
    cookieStore.delete('sb-access-token')
    cookieStore.delete('sb-refresh-token')
    cookieStore.delete('sb-user-id')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging out:', error)
    return NextResponse.json(
      { error: 'Error cerrando sesión' },
      { status: 500 }
    )
  }
}