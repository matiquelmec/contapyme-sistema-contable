'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'

interface AccountFormProps {
  companyId: string
  parentAccount?: {
    id: string
    name: string
    code: string
  }
  account?: {
    id: string
    code: string
    name: string
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
    parent_id?: string
  }
  onSuccess?: () => void
}

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Activo' },
  { value: 'LIABILITY', label: 'Pasivo' },
  { value: 'EQUITY', label: 'Patrimonio' },
  { value: 'INCOME', label: 'Ingresos' },
  { value: 'EXPENSE', label: 'Gastos' }
]

export default function AccountForm({ companyId, parentAccount, account, onSuccess }: AccountFormProps) {
  const [formData, setFormData] = useState({
    code: account?.code || '',
    name: account?.name || '',
    type: account?.type || (parentAccount ? 'ASSET' : 'ASSET') as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
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
      if (account) {
        // Update existing account
        const { error: updateError } = await supabase
          .from('accounts')
          .update({
            code: formData.code,
            name: formData.name,
            type: formData.type,
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id)

        if (updateError) {
          setError(updateError.message)
        } else {
          onSuccess?.()
          router.refresh()
        }
      } else {
        // Create new account
        const { error: insertError } = await supabase
          .from('accounts')
          .insert([
            {
              code: formData.code,
              name: formData.name,
              type: formData.type,
              company_id: companyId,
              parent_id: parentAccount?.id || null
            }
          ])

        if (insertError) {
          setError(insertError.message)
        } else {
          onSuccess?.()
          router.back()
          router.refresh()
        }
      }
    } catch (err) {
      setError('Error inesperado. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {parentAccount && (
        <div className="bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Cuenta padre:</strong> {parentAccount.code} - {parentAccount.name}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Código de cuenta *
        </label>
        <input
          type="text"
          name="code"
          id="code"
          required
          value={formData.code}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Ej: 1101, 2101, 3101"
        />
        <p className="mt-1 text-xs text-gray-500">
          Código numérico único para identificar la cuenta
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nombre de la cuenta *
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Ej: Caja, Banco Estado, Ventas"
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Tipo de cuenta *
        </label>
        <select
          name="type"
          id="type"
          required
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Clasifica la cuenta según el tipo contable
        </p>
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
          {loading ? 'Guardando...' : (account ? 'Actualizar' : 'Crear cuenta')}
        </button>
      </div>
    </form>
  )
}