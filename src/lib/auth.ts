// Versión simplificada para desarrollo local sin Supabase configurado

export const getUser = async () => {
  // Retorna null hasta que Supabase esté configurado
  return null
}

export const getSession = async () => {
  // Retorna null hasta que Supabase esté configurado  
  return null
}

export const createClient = () => {
  // Mock client para desarrollo
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ 
        data: null, 
        error: { message: 'Supabase no está configurado. Configura las variables de entorno.' }
      }),
      signUp: async () => ({ 
        data: null, 
        error: { message: 'Supabase no está configurado. Configura las variables de entorno.' }
      }),
      signOut: async () => ({ error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({
            limit: () => ({ data: [], error: null })
          })
        }),
        order: () => ({ data: [], error: null })
      }),
      insert: () => ({ data: null, error: null }),
      update: () => ({
        eq: () => ({ data: null, error: null })
      }),
      delete: () => ({
        eq: () => ({ data: null, error: null })
      })
    })
  }
}

export const createServerClient = createClient