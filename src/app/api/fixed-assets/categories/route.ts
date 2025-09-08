import { NextRequest, NextResponse } from 'next/server';
import { getFixedAssetCategories } from '@/lib/database/databaseSimple';

// GET /api/fixed-assets/categories - Obtener categorías de activos fijos
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getFixedAssetCategories();

    if (error) {
      console.error('Error fetching fixed asset categories:', error);
      return NextResponse.json(
        { error: 'Error al obtener categorías de activos fijos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}