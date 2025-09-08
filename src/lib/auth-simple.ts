// Versión simplificada sin Supabase para testing
export const getUser = async () => {
  return null
}

export const getSession = async () => {
  return null
}

export const createClient = () => {
  return {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ error: new Error('Supabase no configurado') }),
      signUp: async () => ({ error: new Error('Supabase no configurado') }),
      signOut: async () => ({ error: null })
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
      insert: () => ({ error: null }),
      update: () => ({ eq: () => ({ error: null }) }),
      delete: () => ({ eq: () => ({ error: null }) })
    })
  }
}