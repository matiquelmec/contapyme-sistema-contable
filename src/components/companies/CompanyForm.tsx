'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'

interface CompanyFormProps {
  company?: {
    id: string
    name: string
    rut: string
    address?: string
    phone?: string
    email?: string
  }
  onSuccess?: () => void
}

export default function CompanyForm({ company, onSuccess }: CompanyFormProps) {
  const [formData, setFormData] = useState({
    name: company?.name || '',
    rut: company?.rut || '',
    address: company?.address || '',
    phone: company?.phone || '',
    email: company?.email || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuario no autenticado')
        return
      }

      if (company) {
        // Update existing company
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            name: formData.name,
            rut: formData.rut,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', company.id)

        if (updateError) {
          setError(updateError.message)
        } else {
          onSuccess?.()
          router.refresh()
        }
      } else {
        // Create new company
        const { error: insertError } = await supabase
          .from('companies')
          .insert([
            {
              name: formData.name,
              rut: formData.rut,
              address: formData.address || null,
              phone: formData.phone || null,
              email: formData.email || null,
              user_id: user.id
            }
          ])

        if (insertError) {
          setError(insertError.message)
        } else {
          onSuccess?.()
          router.push('/explore')
          router.refresh()
        }
      }
    } catch (err) {
      setError('Error inesperado. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nombre de la empresa *
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Ej: Mi Empresa Ltda."
        />
      </div>

      <div>
        <label htmlFor="rut" className="block text-sm font-medium text-gray-700">
          RUT *
        </label>
        <input
          type="text"
          name="rut"
          id="rut"
          required
          value={formData.rut}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Ej: 12.345.678-9"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email corporativo
        </label>
        <input
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="contacto@miempresa.cl"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Teléfono
        </label>
        <input
          type="tel"
          name="phone"
          id="phone"
          value={formData.phone}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="+56 9 1234 5678"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Dirección
        </label>
        <input
          type="text"
          name="address"
          id="address"
          value={formData.address}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Calle, número, comuna, ciudad"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : (company ? 'Actualizar' : 'Crear empresa')}
        </button>
      </div>
    </form>
  )
}