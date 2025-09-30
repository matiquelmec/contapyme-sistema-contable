import { NextRequest, NextResponse } from 'next/server';
import { databaseSimple } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// GET /api/chart-of-accounts/[id] - Obtener cuenta específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de cuenta es requerido'
      }, { status: 400 });
    }

    const query = `
      SELECT * FROM chart_of_accounts 
      WHERE id = $1
    `;

    const { data, error } = await databaseSimple.query(query, [id]);

    if (error) {
      console.error('Error fetching account:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener cuenta: ' + error.message
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Cuenta no encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: data[0]
    });

  } catch (error: any) {
    console.error('Error in GET account:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// PUT /api/chart-of-accounts/[id] - Actualizar cuenta específica
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de cuenta es requerido'
      }, { status: 400 });
    }

    // Validar que el código no esté duplicado (excluyendo la cuenta actual)
    if (body.code) {
      const checkQuery = `SELECT id FROM chart_of_accounts WHERE code = $1 AND id != $2`;
      const { data: existing } = await databaseSimple.query(checkQuery, [body.code, id]);
      
      if (existing && existing.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Ya existe otra cuenta con el código ${body.code}`
        }, { status: 409 });
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (body.code !== undefined) {
      updateFields.push(`code = $${paramIndex++}`);
      queryParams.push(body.code);
    }
    if (body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      queryParams.push(body.name);
    }
    if (body.level_type !== undefined) {
      updateFields.push(`level_type = $${paramIndex++}`);
      queryParams.push(body.level_type);
    }
    if (body.account_type !== undefined) {
      updateFields.push(`account_type = $${paramIndex++}`);
      queryParams.push(body.account_type);
    }
    if (body.parent_code !== undefined) {
      updateFields.push(`parent_code = $${paramIndex++}`);
      queryParams.push(body.parent_code);
    }
    if (body.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      queryParams.push(body.is_active);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay campos para actualizar'
      }, { status: 400 });
    }

    queryParams.push(id); // ID va al final
    
    const updateQuery = `
      UPDATE chart_of_accounts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { data, error } = await databaseSimple.query(updateQuery, queryParams);

    if (error) {
      console.error('Error updating account:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al actualizar cuenta: ' + error.message
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Cuenta no encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: data[0],
      message: `Cuenta ${data[0].code} - ${data[0].name} actualizada exitosamente`
    });

  } catch (error: any) {
    console.error('Error in PUT account:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// DELETE /api/chart-of-accounts/[id] - Eliminar cuenta específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de cuenta es requerido'
      }, { status: 400 });
    }

    // Verificar si la cuenta tiene cuentas hijas
    const childrenQuery = `SELECT id FROM chart_of_accounts WHERE parent_code = (SELECT code FROM chart_of_accounts WHERE id = $1)`;
    const { data: children } = await databaseSimple.query(childrenQuery, [id]);

    if (children && children.length > 0 && !force) {
      return NextResponse.json({
        success: false,
        error: `No se puede eliminar la cuenta porque tiene ${children.length} cuentas hijas. Use force=true para eliminar todas.`
      }, { status: 400 });
    }

    let query: string;
    const queryParams = [id];

    if (force) {
      // Eliminación física
      query = `DELETE FROM chart_of_accounts WHERE id = $1 RETURNING code, name`;
    } else {
      // Eliminación lógica (soft delete)
      query = `UPDATE chart_of_accounts SET is_active = false WHERE id = $1 RETURNING code, name`;
    }

    const { data, error } = await databaseSimple.query(query, queryParams);

    if (error) {
      console.error('Error deleting/deactivating account:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al eliminar cuenta: ' + error.message
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Cuenta no encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: force 
        ? `Cuenta ${data[0].code} - ${data[0].name} eliminada definitivamente`
        : `Cuenta ${data[0].code} - ${data[0].name} desactivada exitosamente`
    });

  } catch (error: any) {
    console.error('Error in DELETE account:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}