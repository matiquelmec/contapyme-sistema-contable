import { NextRequest, NextResponse } from 'next/server';
import { getFixedAssetById, updateFixedAsset, deleteFixedAsset } from '@/lib/database/databaseSimple';
import { UpdateFixedAssetData } from '@/types';

// GET /api/fixed-assets/[id] - Obtener activo fijo específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await getFixedAssetById(id, 'demo-user');

    if (error) {
      console.error('Error fetching fixed asset:', error);
      return NextResponse.json(
        { error: 'Error al obtener activo fijo' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Activo fijo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ asset: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/fixed-assets/[id] - Actualizar activo fijo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body: UpdateFixedAssetData = await request.json();

    // Validaciones básicas
    if (body.purchase_value && body.purchase_value <= 0) {
      return NextResponse.json(
        { error: 'El valor de compra debe ser positivo' },
        { status: 400 }
      );
    }

    if (body.useful_life_years && body.useful_life_years <= 0) {
      return NextResponse.json(
        { error: 'Los años de vida útil deben ser positivos' },
        { status: 400 }
      );
    }

    if (body.residual_value && body.purchase_value && 
        (body.residual_value < 0 || body.residual_value >= body.purchase_value)) {
      return NextResponse.json(
        { error: 'El valor residual debe ser mayor o igual a 0 y menor al valor de compra' },
        { status: 400 }
      );
    }

    // Usar función directa de actualización
    const { data, error } = await updateFixedAsset(id, body, 'demo-user');

    if (error) {
      console.error('Error updating fixed asset:', error);
      return NextResponse.json(
        { error: 'Error al actualizar activo fijo' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Activo fijo no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      asset: data,
      message: 'Activo fijo actualizado exitosamente' 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/fixed-assets/[id] - Eliminar activo fijo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await deleteFixedAsset(id, 'demo-user');

    if (error) {
      console.error('Error deleting fixed asset:', error);
      return NextResponse.json(
        { error: 'Error al eliminar activo fijo' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Activo fijo no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: `Activo fijo "${data.name}" eliminado exitosamente` 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}