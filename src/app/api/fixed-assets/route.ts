import { NextRequest, NextResponse } from 'next/server';
import { databaseSimple } from '@/lib/database/databaseSimple';
import { CreateFixedAssetData, FixedAsset } from '@/types';
import { DEMO_USER_ID } from '@/lib/constants';

// Hacer la ruta dinámica explícitamente
export const dynamic = 'force-dynamic';

// GET /api/fixed-assets - Obtener todos los activos fijos del usuario
export async function GET(request: NextRequest) {
  try {
    // Usar nextUrl.searchParams en lugar de new URL(request.url)
    const status = request.nextUrl.searchParams.get('status');
    const category = request.nextUrl.searchParams.get('category');

    // Ir directo a la query - si la tabla no existe, manejaremos el error
    console.log('Fetching fixed assets for user:', DEMO_USER_ID);

    let query = `
      SELECT 
        id_fixed_assets as id,
        *
      FROM fixed_assets fa
      WHERE fa.user_id = $1
    `;

    const params: any[] = [DEMO_USER_ID];  // Inicializar con DEMO_USER_ID
    
    if (status && status !== 'all') {
      query += ' AND fa.status = $' + (params.length + 1);
      params.push(status);
    }
    
    if (category && category !== 'all') {
      query += ' AND fa.category = $' + (params.length + 1);
      params.push(category);
    }

    query += ' ORDER BY fa.created_at DESC';

    const { data, error } = await databaseSimple.query(query, params);

    if (error) {
      console.error('Error fetching fixed assets:', error);
      // Si la tabla no existe, retornar mensaje específico
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ 
          assets: [],
          message: 'Tabla de activos fijos no existe - ejecutar migración SQL' 
        });
      }
      // Otros errores
      return NextResponse.json({ 
        assets: [],
        message: 'Error al cargar activos: ' + error.message 
      });
    }

    return NextResponse.json({ assets: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    // En modo demo, retornar array vacío en lugar de error 500
    return NextResponse.json({ 
      assets: [],
      message: 'Funcionalidad de activos fijos en desarrollo' 
    });
  }
}

// POST /api/fixed-assets - Crear nuevo activo fijo
export async function POST(request: NextRequest) {
  try {
    console.log('Creating new fixed asset...');

    const body: CreateFixedAssetData = await request.json();

    // Validaciones básicas
    if (!body.name || !body.category || !body.purchase_value || !body.useful_life_years) {
      return NextResponse.json(
        { error: 'Campos requeridos: name, category, purchase_value, useful_life_years' },
        { status: 400 }
      );
    }

    if (body.purchase_value <= 0 || body.useful_life_years <= 0) {
      return NextResponse.json(
        { error: 'El valor de compra y años de vida útil deben ser positivos' },
        { status: 400 }
      );
    }

    if (body.residual_value < 0 || body.residual_value >= body.purchase_value) {
      return NextResponse.json(
        { error: 'El valor residual debe ser mayor o igual a 0 y menor al valor de compra' },
        { status: 400 }
      );
    }

    // Insertar activo fijo con manejo de errores mejorado
    const insertQuery = `
      INSERT INTO fixed_assets (
        user_id,
        name,
        description,
        category,
        purchase_value,
        residual_value,
        purchase_date,
        start_depreciation_date,
        useful_life_years,
        depreciation_method,
        asset_account_code,
        depreciation_account_code,
        expense_account_code,
        serial_number,
        brand,
        model,
        location,
        responsible_person,
        status
      ) VALUES (
        $1,
        $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active'
      )
      RETURNING id_fixed_assets as id, *
    `;

    const { data, error } = await databaseSimple.query(insertQuery, [
      DEMO_USER_ID,
      body.name,
      body.description || null,
      body.category,
      body.purchase_value,
      body.residual_value || 0,
      body.purchase_date,
      body.start_depreciation_date || body.purchase_date,
      body.useful_life_years,
      'linear', // Por defecto método lineal
      body.asset_account_code || null,
      body.depreciation_account_code || null,
      body.expense_account_code || null,
      body.serial_number || null,
      body.brand || null,
      body.model || null,
      body.location || null,
      body.responsible_person || null
    ]);

    if (error) {
      console.error('Error creating fixed asset:', error);
      return NextResponse.json(
        { error: 'Error al crear activo fijo' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo crear el activo fijo' },
        { status: 500 }
      );
    }

    const newAsset = data[0];

    // Generar cronograma de depreciación automáticamente
    try {
      const scheduleQuery = `
        INSERT INTO fixed_assets_depreciation 
        (fixed_asset_id, period_year, period_month, monthly_depreciation, accumulated_depreciation, book_value)
        SELECT 
          $1,
          period_year,
          period_month, 
          monthly_depreciation,
          accumulated_depreciation,
          book_value
        FROM generate_depreciation_schedule($1)
      `;

      await databaseSimple.query(scheduleQuery, [newAsset.id]);
    } catch (scheduleError) {
      console.error('Error generating depreciation schedule:', scheduleError);
      // No fallar la creación del activo por esto
    }

    return NextResponse.json({ 
      asset: newAsset,
      message: 'Activo fijo creado exitosamente' 
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}