import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/auth'

// Rutas que requieren autenticación
const protectedRoutes = [
  '/explore',
  '/accounting',
  '/payroll',
  '/dashboard',
  '/companies',
  '/settings',
  '/profile'
]

// Rutas de autenticación (redirigir si ya está autenticado)
const authRoutes = [
  '/login',
  '/register',
  '/auth'
]

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  '/about',
  '/pricing',
  '/contact',
  '/api/public'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir archivos estáticos y API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // archivos con extensión
  ) {
    return NextResponse.next()
  }

  try {
    // Crear respuesta y verificar cookies de autenticación
    const response = NextResponse.next()

    // Verificar si hay cookies de autenticación de nuestro sistema
    const accessToken = request.cookies.get('sb-access-token')?.value
    const userId = request.cookies.get('sb-user-id')?.value

    // Si tenemos cookies de nuestro sistema, considerar autenticado
    let isAuthenticated = !!(accessToken && userId)

    // Fallback: verificar con Supabase si no hay cookies
    if (!isAuthenticated) {
      try {
        const supabase = createServerClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        isAuthenticated = !!session?.user
      } catch (supabaseError) {
        console.error('[Middleware] Error checking Supabase session:', supabaseError)
        isAuthenticated = false
      }
    }
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))

    // Permitir acceso a la página raíz (módulos) para usuarios autenticados
    if (pathname === '/') {
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/register', request.url))
      }
      // Si está autenticado, permitir acceso a la página principal de módulos
      return NextResponse.next()
    }

    // Redirigir a login si intenta acceder a ruta protegida sin estar autenticado
    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Redirigir a página principal si está autenticado e intenta acceder a rutas de auth
    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Bloquear acceso a rutas no definidas para usuarios no autenticados
    if (!isAuthenticated && !isAuthRoute && !isPublicRoute) {
      return NextResponse.redirect(new URL('/register', request.url))
    }

    // Comentar temporalmente verificación compleja de perfil
    // TODO: Reactivar después de confirmar que el login básico funciona
    /*
    if (isAuthenticated && isProtectedRoute) {
      // Verificación de perfil simplificada...
    }
    */

    // Agregar headers básicos si está autenticado
    if (isAuthenticated && userId) {
      response.headers.set('x-user-id', userId)
    }

    return response

  } catch (error) {
    console.error('Error en middleware:', error)

    // En caso de error, solo permitir rutas de autenticación y redirigir todo lo demás
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))

    if (isAuthRoute || isPublicRoute) {
      return NextResponse.next()
    }

    // Redirigir cualquier otra ruta a registro
    return NextResponse.redirect(new URL('/register', request.url))
  }
}

export const config = {
  matcher: [
    '/:path*'
  ],
}