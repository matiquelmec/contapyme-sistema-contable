import { NextRequest, NextResponse } from 'next/server';
import { databaseSimple } from '@/lib/database/databaseSimple';

/**
 * GET /api/accounting/configuration/centralized
 * Obtiene las configuraciones centralizadas de cuentas por empresa
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

    console.log(`🔍 Loading centralized configs for company: ${companyId}`);

    // For now, return empty data since the table doesn't exist yet
    // TODO: Create centralized_account_config table in Supabase dashboard
    console.log('⚠️ centralized_account_config table not available yet - returning empty data');

    return NextResponse.json({
      success: true,
      data: [],
      message: 'Centralized account configuration table not available yet'
    });

  } catch (error) {
    console.error('❌ Error obteniendo configuraciones centralizadas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/configuration/centralized
 * Crea o actualiza una configuración centralizada
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_id,
      id,
      module_name,
      transaction_type,
      display_name,
      tax_account_code,
      tax_account_name,
      revenue_account_code,
      revenue_account_name,
      asset_account_code,
      asset_account_name,
      is_active = true
    } = body;

    if (!company_id || !module_name || !transaction_type || !display_name) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    console.log(`💾 ${id ? 'Updating' : 'Creating'} centralized config for company: ${company_id}`);

    let result;

    if (id) {
      // Actualizar configuración existente
      const updateQuery = `
        UPDATE centralized_account_config 
        SET module_name = $1, transaction_type = $2, display_name = $3,
            tax_account_code = $4, tax_account_name = $5,
            revenue_account_code = $6, revenue_account_name = $7,
            asset_account_code = $8, asset_account_name = $9,
            is_active = $10, updated_at = CURRENT_TIMESTAMP
        WHERE id = $11 AND company_id = $12
        RETURNING *
      `;

      const { data, error } = await databaseSimple.query(updateQuery, [
        module_name, transaction_type, display_name,
        tax_account_code, tax_account_name,
        revenue_account_code, revenue_account_name,
        asset_account_code, asset_account_name,
        is_active, id, company_id
      ]);

      if (error) throw error;
      result = data?.[0];
    } else {
      // Crear nueva configuración
      const insertQuery = `
        INSERT INTO centralized_account_config (
          company_id, module_name, transaction_type, display_name,
          tax_account_code, tax_account_name,
          revenue_account_code, revenue_account_name,
          asset_account_code, asset_account_name,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const { data, error } = await databaseSimple.query(insertQuery, [
        company_id, module_name, transaction_type, display_name,
        tax_account_code, tax_account_name,
        revenue_account_code, revenue_account_name,
        asset_account_code, asset_account_name,
        is_active
      ]);

      if (error) throw error;
      result = data?.[0];
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Configuración ${id ? 'actualizada' : 'creada'} exitosamente`
    });

  } catch (error) {
    console.error('❌ Error guardando configuración centralizada:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}