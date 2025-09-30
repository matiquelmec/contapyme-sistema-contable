import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuración por defecto para asientos automáticos
const DEFAULT_INTEGRATION_CONFIG = {
  // Configuración para RCV Ventas
  rcv_sales: {
    enabled: true,
    accounts: {
      debit_client_account: '1105001', // Clientes
      credit_sales_account: '4101001', // Ventas
      credit_iva_account: '2104001'    // IVA Débito Fiscal
    },
    description_template: 'Venta según RCV {period} - {file_name}',
    auto_process: true
  },
  // Configuración para RCV Compras
  rcv_purchases: {
    enabled: true,
    accounts: {
      debit_expense_account: '5101001', // Gastos
      debit_iva_account: '1104001',     // IVA Crédito Fiscal
      credit_supplier_account: '2101001' // Proveedores
    },
    description_template: 'Compra según RCV {period} - {file_name}',
    auto_process: true
  },
  // Configuración para Activos Fijos
  fixed_assets: {
    enabled: true,
    accounts: {
      debit_asset_account: '', // Se usa la cuenta del activo específico
      credit_cash_account: '1101001', // Caja/Bancos por defecto
      credit_supplier_account: '2101001' // Proveedores alternativo
    },
    description_template: 'Adquisición Activo Fijo: {asset_name}',
    auto_process: false // Requiere revisión manual
  }
};

/**
 * GET /api/accounting/journal-book/integration-config
 * Obtiene la configuración de integración para asientos automáticos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    console.log(`🔍 Integration Config GET - Company: ${companyId}`);

    // Por ahora usar configuración por defecto directamente
    // En el futuro se puede implementar tabla integration_config
    console.log('📋 Using default integration config');
    const config = DEFAULT_INTEGRATION_CONFIG;

    return NextResponse.json({
      success: true,
      data: {
        company_id: companyId,
        config,
        is_default: true,
        updated_at: null
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo configuración de integración:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/journal-book/integration-config
 * Actualiza la configuración de integración
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, config } = body;

    if (!company_id || !config) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    console.log(`💾 Integration Config POST - Company: ${company_id}`);

    // Validar estructura de configuración
    const validationResult = validateIntegrationConfig(config);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { success: false, error: `Configuración inválida: ${validationResult.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Verificar si ya existe configuración
    const { data: existingConfig } = await supabase
      .from('integration_config')
      .select('id')
      .eq('company_id', company_id)
      .single();

    let result;

    if (existingConfig) {
      // Actualizar configuración existente
      const { data, error } = await supabase
        .from('integration_config')
        .update({
          config,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', company_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Crear nueva configuración
      const { data, error } = await supabase
        .from('integration_config')
        .insert({
          company_id,
          config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Configuración de integración actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando configuración de integración:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Valida la estructura de la configuración de integración
 */
function validateIntegrationConfig(config: any) {
  const errors = [];

  // Validar estructura general
  if (typeof config !== 'object') {
    errors.push('La configuración debe ser un objeto');
    return { isValid: false, errors };
  }

  // Validar configuración RCV Ventas
  if (config.rcv_sales) {
    if (!config.rcv_sales.accounts) {
      errors.push('Faltan cuentas para RCV Ventas');
    } else {
      const accounts = config.rcv_sales.accounts;
      if (!accounts.debit_client_account) errors.push('Falta cuenta de clientes (débito)');
      if (!accounts.credit_sales_account) errors.push('Falta cuenta de ventas (crédito)');
      if (!accounts.credit_iva_account) errors.push('Falta cuenta de IVA (crédito)');
    }
  }

  // Validar configuración RCV Compras
  if (config.rcv_purchases) {
    if (!config.rcv_purchases.accounts) {
      errors.push('Faltan cuentas para RCV Compras');
    } else {
      const accounts = config.rcv_purchases.accounts;
      if (!accounts.debit_expense_account) errors.push('Falta cuenta de gastos (débito)');
      if (!accounts.debit_iva_account) errors.push('Falta cuenta de IVA crédito (débito)');
      if (!accounts.credit_supplier_account) errors.push('Falta cuenta de proveedores (crédito)');
    }
  }

  // Validar configuración Activos Fijos
  if (config.fixed_assets) {
    if (!config.fixed_assets.accounts) {
      errors.push('Faltan cuentas para Activos Fijos');
    } else {
      const accounts = config.fixed_assets.accounts;
      if (!accounts.credit_cash_account && !accounts.credit_supplier_account) {
        errors.push('Falta al menos una cuenta de crédito para Activos Fijos (caja o proveedores)');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * DELETE /api/accounting/journal-book/integration-config
 * Elimina la configuración personalizada y vuelve a la configuración por defecto
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Integration Config DELETE - Company: ${companyId}`);

    const { error } = await supabase
      .from('integration_config')
      .delete()
      .eq('company_id', companyId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Configuración restablecida a valores por defecto'
    });

  } catch (error) {
    console.error('❌ Error eliminando configuración de integración:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}