import { NextRequest, NextResponse } from 'next/server';
import { getFixedAssets, getFixedAssetsReport } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// GET /api/fixed-assets/export - Exportar activos fijos a CSV
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const userId = 'demo-user';

    // Obtener todos los activos fijos
    const { data: assets, error } = await getFixedAssets({ user_id: userId });

    if (error) {
      console.error('Error fetching assets for export:', error);
      return NextResponse.json(
        { error: 'Error al obtener activos fijos' },
        { status: 500 }
      );
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json(
        { error: 'No hay activos fijos para exportar' },
        { status: 404 }
      );
    }

    // Calcular valor libro para cada activo
    const enrichedAssets = assets.map(asset => {
      const currentDate = new Date();
      const startDate = new Date(asset.start_depreciation_date);
      const monthsElapsed = Math.max(0, Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      ));
      
      const depreciableValue = asset.purchase_value - (asset.residual_value || 0);
      const totalMonths = asset.useful_life_years * 12;
      const monthlyDepreciation = depreciableValue / totalMonths;
      
      const accumulatedDepreciation = Math.min(
        monthsElapsed * monthlyDepreciation,
        depreciableValue
      );
      
      const bookValue = Math.max(
        asset.purchase_value - accumulatedDepreciation, 
        asset.residual_value || 0
      );

      return {
        ...asset,
        accumulated_depreciation: accumulatedDepreciation,
        book_value: bookValue,
        monthly_depreciation: monthlyDepreciation
      };
    });

    if (format === 'csv') {
      // Generar CSV
      const headers = [
        'ID',
        'Nombre',
        'Descripción',
        'Categoría',
        'Valor de Compra',
        'Valor Residual',
        'Valor Libro Actual',
        'Depreciación Acumulada',
        'Depreciación Mensual',
        'Vida Útil (años)',
        'Fecha de Compra',
        'Inicio Depreciación',
        'Estado',
        'Número de Serie',
        'Marca',
        'Modelo',
        'Ubicación',
        'Responsable',
        'Cuenta de Activo',
        'Cuenta Depreciación',
        'Cuenta Gasto',
        'Fecha Creación'
      ];

      const csvRows = [
        headers.join(','),
        ...enrichedAssets.map(asset => [
          asset.id,
          `"${asset.name}"`,
          `"${asset.description || ''}"`,
          `"${asset.category}"`,
          asset.purchase_value,
          asset.residual_value || 0,
          Math.round(asset.book_value),
          Math.round(asset.accumulated_depreciation),
          Math.round(asset.monthly_depreciation),
          asset.useful_life_years,
          asset.purchase_date,
          asset.start_depreciation_date,
          asset.status,
          `"${asset.serial_number || ''}"`,
          `"${asset.brand || ''}"`,
          `"${asset.model || ''}"`,
          `"${asset.location || ''}"`,
          `"${asset.responsible_person || ''}"`,
          `"${asset.asset_account_code || ''}"`,
          `"${asset.depreciation_account_code || ''}"`,
          `"${asset.expense_account_code || ''}"`,
          asset.created_at ? new Date(asset.created_at).toLocaleDateString('es-CL') : ''
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const currentDate = new Date();
      const filename = `activos_fijos_${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Para otros formatos en el futuro
    return NextResponse.json(
      { error: 'Formato de exportación no soportado' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in export API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}