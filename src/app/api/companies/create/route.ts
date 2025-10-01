import { NextRequest, NextResponse } from 'next/server'
import { createUserCompany, getUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener datos del request
    const companyData = await request.json()

    // Validar datos requeridos
    if (!companyData.business_name || !companyData.rut) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Crear la empresa
    const company = await createUserCompany(user.id, {
      business_name: companyData.business_name,
      legal_name: companyData.legal_name,
      rut: companyData.rut,
      industry_sector: companyData.industry_sector,
      address: companyData.address,
      phone: companyData.phone,
      email: companyData.email
    })

    return NextResponse.json({
      success: true,
      company
    })

  } catch (error) {
    console.error('Error en API crear empresa:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}