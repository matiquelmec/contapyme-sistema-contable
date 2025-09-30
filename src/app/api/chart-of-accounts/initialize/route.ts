import { NextResponse } from 'next/server';
import { createBasicChartOfAccounts } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// POST /api/chart-of-accounts/initialize - Inicializar plan de cuentas básico
export async function POST() {
  try {
    console.log('🏗️ Inicializando plan de cuentas básico...');
    
    const accounts = await createBasicChartOfAccounts();
    
    if (accounts && accounts.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Plan de cuentas básico inicializado correctamente',
        accounts_created: accounts.length,
        accounts: accounts
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No se pudieron crear las cuentas',
        accounts_created: 0
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Error inicializando plan de cuentas:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message || 'Error desconocido'
    }, { status: 500 });
  }
}