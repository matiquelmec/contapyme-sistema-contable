import { NextRequest, NextResponse } from 'next/server';
import { databaseSimple } from '@/lib/database/databaseSimple';
import { DEMO_USER_ID } from '@/lib/constants';

// Hacer la ruta dinámica explícitamente
export const dynamic = 'force-dynamic';

// GET /api/fixed-assets/depreciation/[id] - Obtener cronograma de depreciación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    // Usar nextUrl.searchParams en lugar de new URL(request.url)
    const year = request.nextUrl.searchParams.get('year');

    // Verificar que el activo pertenece al usuario
    const assetQuery = `
      SELECT id, name FROM fixed_assets 
      WHERE id = $1 AND user_id = $2
    `;

    const { data: assetData, error: assetError } = await databaseSimple.query(assetQuery, [id, DEMO_USER_ID]);

    if (assetError || !assetData || assetData.length === 0) {
      return NextResponse.json(
        { error: 'Activo fijo no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // Obtener cronograma de depreciación
    let depreciationQuery = `
      SELECT 
        fad.*,
        fa.name as asset_name,
        fa.purchase_value,
        fa.residual_value
      FROM fixed_assets_depreciation fad
      JOIN fixed_assets fa ON fad.fixed_asset_id = fa.id
      WHERE fad.fixed_asset_id = $1
    `;

    const params: any[] = [id];

    if (year) {
      depreciationQuery += ' AND fad.period_year = $2';
      params.push(parseInt(year));
    }

    depreciationQuery += ' ORDER BY fad.period_year ASC, fad.period_month ASC';

    const { data, error } = await databaseSimple.query(depreciationQuery, params);

    if (error) {
      console.error('Error fetching depreciation schedule:', error);
      return NextResponse.json(
        { error: 'Error al obtener cronograma de depreciación' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      asset: assetData[0],
      depreciation_schedule: data || [] 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}