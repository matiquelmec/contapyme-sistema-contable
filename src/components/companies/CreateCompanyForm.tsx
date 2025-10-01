'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logUserActivity } from '@/lib/auth-client'

interface CreateCompanyFormProps {
  userId: string
  currentCompanies: number
  maxCompanies: number
}

export default function CreateCompanyForm({ userId, currentCompanies, maxCompanies }: CreateCompanyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    business_name: '',
    legal_name: '',
    rut: '',
    industry_sector: '',
    address: '',
    phone: '',
    email: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Auto-fill legal_name si no se ha modificado
    if (name === 'business_name' && !formData.legal_name) {
      setFormData(prev => ({
        ...prev,
        legal_name: value
      }))
    }
  }

  const formatRut = (rut: string) => {
    // Eliminar puntos y guiones
    const cleanRut = rut.replace(/[.-]/g, '')

    if (cleanRut.length < 2) return cleanRut

    // Separar número y dígito verificador
    const rutNumber = cleanRut.slice(0, -1)
    const dv = cleanRut.slice(-1)

    // Formatear número con puntos
    const formattedNumber = rutNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    return `${formattedNumber}-${dv}`
  }

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formattedRut = formatRut(value)

    setFormData(prev => ({
      ...prev,
      rut: formattedRut
    }))
  }

  const validateRut = (rut: string): boolean => {
    const cleanRut = rut.replace(/[.-]/g, '')

    if (cleanRut.length < 8 || cleanRut.length > 9) return false

    const rutNumber = cleanRut.slice(0, -1)
    const dv = cleanRut.slice(-1).toLowerCase()

    let sum = 0
    let multiplier = 2

    for (let i = rutNumber.length - 1; i >= 0; i--) {
      sum += parseInt(rutNumber[i]) * multiplier
      multiplier = multiplier === 7 ? 2 : multiplier + 1
    }

    const remainder = sum % 11
    const calculatedDv = remainder === 0 ? '0' : remainder === 1 ? 'k' : (11 - remainder).toString()

    return dv === calculatedDv
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validaciones
      if (!formData.business_name.trim()) {
        throw new Error('El nombre de la empresa es requerido')
      }

      if (!formData.rut.trim()) {
        throw new Error('El RUT es requerido')
      }

      if (!validateRut(formData.rut)) {
        throw new Error('El RUT ingresado no es válido')
      }

      if (currentCompanies >= maxCompanies) {
        throw new Error('Has alcanzado el límite de empresas para tu plan')
      }

      // Crear la empresa via API
      const response = await fetch('/api/companies/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: formData.business_name.trim(),
          legal_name: formData.legal_name.trim() || formData.business_name.trim(),
          rut: formData.rut.trim(),
          industry_sector: formData.industry_sector.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim()
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      const company = result.company

      // Log de actividad
      await logUserActivity(
        userId,
        'company_created',
        'Nueva empresa creada',
        {
          company_id: company.id,
          company_name: company.business_name,
          rut: company.rut
        }
      )

      // Redirigir al dashboard con mensaje de éxito
      router.push('/dashboard?success=company_created')

    } catch (error) {
      console.error('Error creando empresa:', error)
      setError(error instanceof Error ? error.message : 'Error inesperado al crear la empresa')
    } finally {
      setLoading(false)
    }
  }

  const industryOptions = [
    'Agricultura y Ganadería',
    'Minería',
    'Industria Manufacturera',
    'Construcción',
    'Comercio al por Mayor y Menor',
    'Transporte y Almacenamiento',
    'Alojamiento y Servicios de Comida',
    'Información y Comunicaciones',
    'Actividades Financieras y de Seguros',
    'Actividades Inmobiliarias',
    'Actividades Profesionales y Técnicas',
    'Servicios Administrativos',
    'Administración Pública',
    'Enseñanza',
    'Servicios Sociales y de Salud',
    'Arte y Entretenimiento',
    'Otras Actividades de Servicios',
    'Otro'
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Información Básica */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Información Básica</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
                Nombre Comercial *
              </label>
              <input
                type="text"
                id="business_name"
                name="business_name"
                required
                value={formData.business_name}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ej: Mi PyME Ltda."
              />
            </div>

            <div>
              <label htmlFor="legal_name" className="block text-sm font-medium text-gray-700">
                Razón Social
              </label>
              <input
                type="text"
                id="legal_name"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Razón social completa"
              />
              <p className="mt-1 text-xs text-gray-500">
                Si no se especifica, se usará el nombre comercial
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rut" className="block text-sm font-medium text-gray-700">
                RUT *
              </label>
              <input
                type="text"
                id="rut"
                name="rut"
                required
                value={formData.rut}
                onChange={handleRutChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="12.345.678-9"
                maxLength={12}
              />
            </div>

            <div>
              <label htmlFor="industry_sector" className="block text-sm font-medium text-gray-700">
                Sector Industrial
              </label>
              <select
                id="industry_sector"
                name="industry_sector"
                value={formData.industry_sector}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Seleccionar sector</option>
                {industryOptions.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Información de Contacto</h3>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Dirección
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Dirección completa de la empresa"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="+56 9 9999 9999"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="contacto@empresa.cl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creando empresa...
              </div>
            ) : (
              'Crear Empresa'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}