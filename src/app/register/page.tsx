import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import RegisterForm from '@/components/auth/RegisterForm'

export default async function RegisterPage() {
  const session = await getSession()
  
  if (session) {
    redirect('/explore')
  }

  return <RegisterForm />
}