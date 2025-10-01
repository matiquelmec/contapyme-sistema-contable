import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LoginForm from '@/components/auth/LoginForm'
import { Suspense } from 'react'

interface LoginPageProps {
  searchParams?: {
    message?: string
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginForm message={searchParams?.message} />
    </Suspense>
  )
}