import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import RegisterForm from '@/components/auth/RegisterForm'

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const session = await getSession()
  
  if (session) {
    redirect('/explore')
  }

  return <RegisterForm />
}