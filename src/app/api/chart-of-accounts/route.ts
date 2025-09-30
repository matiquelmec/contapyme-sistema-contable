import { NextRequest, NextResponse } from 'next/server';
import { databaseSimple } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// GET /api/chart-of-accounts - Obtener plan de cuentas
export async function GET(request: NextRequest) {
  try {
    const account_type = request.nextUrl.searchParams.get('type');
    const level_type = request.nextUrl.searchParams.get('level');
    const parent = request.nextUrl.searchParams.get('parent');

    console.log('Loading chart of accounts with filters:', { account_type, level_type, parent });

    let query = `
      SELECT 
        code,
        name,
        level_type,
        account_type,
        parent_code,
        is_active
      FROM chart_of_accounts
      WHERE is_active = true
    `;

    const params: string[] = [];

    if (account_type) {
      query += ` AND account_type = $${params.length + 1}`;
      params.push(account_type);
    }

    if (level_type) {
      query += ` AND level_type = $${params.length + 1}`;
      params.push(level_type);
    }

    if (parent) {
      query += ` AND parent_code = $${params.length + 1}`;
      params.push(parent);
    }

    query += ' ORDER BY code ASC';

    const { data, error } = await databaseSimple.query(query, params);

    if (error) {
      console.error('Error fetching chart of accounts:', error);
      return NextResponse.json({ 
        accounts: [],
        message: 'Error al cargar plan de cuentas: ' + error.message 
      });
    }

    return NextResponse.json({ 
      accounts: data || [],
      total: data?.length || 0
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      accounts: [],
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// POST /api/chart-of-accounts - Crear nueva cuenta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validaciones básicas
    if (!body.code || !body.name || !body.level_type || !body.account_type) {
      return NextResponse.json(
        { success: false, error: 'Campos requeridos: code, name, level_type, account_type' },
        { status: 400 }
      );
    }

    // Verificar que el código no exista EN CUENTAS ACTIVAS
    const checkQuery = `SELECT id, code FROM chart_of_accounts WHERE code = $1 AND is_active = true`;
    const { data: existing } = await databaseSimple.query(checkQuery, [body.code]);
    
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Ya existe una cuenta activa con el código ${body.code}` },
        { status: 409 }
      );
    }

    // Validar cuenta padre si se especifica
    if (body.parent_code) {
      const parentQuery = `SELECT id FROM chart_of_accounts WHERE code = $1`;
      const { data: parent } = await databaseSimple.query(parentQuery, [body.parent_code]);
      
      if (!parent || parent.length === 0) {
        return NextResponse.json(
          { success: false, error: `Cuenta padre con código ${body.parent_code} no existe` },
          { status: 400 }
        );
      }
    }

    const insertQuery = `
      INSERT INTO chart_of_accounts (
        code, name, level_type, account_type, parent_code, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const { data, error } = await databaseSimple.query(insertQuery, [
      body.code,
      body.name,
      body.level_type,
      body.account_type,
      body.parent_code || null,
      body.is_active !== undefined ? body.is_active : true
    ]);

    if (error) {
      console.error('Error creating account:', error);
      return NextResponse.json(
        { success: false, error: 'Error al crear cuenta contable: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      data: data?.[0],
      message: `Cuenta ${body.code} - ${body.name} creada exitosamente` 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/chart-of-accounts - Actualizar cuenta existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'ID de cuenta es requerido' },
        { status: 400 }
      );
    }

    // Validar que el código no esté duplicado (excluyendo la cuenta actual)
    if (body.code) {
      const checkQuery = `SELECT id FROM chart_of_accounts WHERE code = $1 AND id != $2`;
      const { data: existing } = await databaseSimple.query(checkQuery, [body.code, body.id]);
      
      if (existing && existing.length > 0) {
        return NextResponse.json(
          { success: false, error: `Ya existe otra cuenta con el código ${body.code}` },
          { status: 409 }
        );
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (body.code !== undefined) {
      updateFields.push(`code = $${paramIndex++}`);
      params.push(body.code);
    }
    if (body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(body.name);
    }
    if (body.level_type !== undefined) {
      updateFields.push(`level_type = $${paramIndex++}`);
      params.push(body.level_type);
    }
    if (body.account_type !== undefined) {
      updateFields.push(`account_type = $${paramIndex++}`);
      params.push(body.account_type);
    }
    if (body.parent_code !== undefined) {
      updateFields.push(`parent_code = $${paramIndex++}`);
      params.push(body.parent_code);
    }
    if (body.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      params.push(body.is_active);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    params.push(body.id); // ID va al final
    
    const updateQuery = `
      UPDATE chart_of_accounts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { data, error } = await databaseSimple.query(updateQuery, params);

    if (error) {
      console.error('Error updating account:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar cuenta: ' + error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cuenta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data[0],
      message: `Cuenta ${data[0].code} - ${data[0].name} actualizada exitosamente`
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/chart-of-accounts - Eliminar cuenta (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de cuenta es requerido' },
        { status: 400 }
      );
    }

    console.log(`🔥 Eliminando cuenta ID: ${id}`);
    
    // Obtener información completa de la cuenta
    const accountQuery = `SELECT id, code, name, is_active, level_type FROM chart_of_accounts WHERE id = $1`;
    const { data: accountData, error: fetchError } = await databaseSimple.query(accountQuery, [id]);
    
    if (fetchError || !accountData || accountData.length === 0) {
      console.error('❌ Error obteniendo cuenta:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Cuenta no encontrada' },
        { status: 404 }
      );
    }
    
    const accountInfo = accountData[0];
    console.log(`🗑️ Intentando eliminar cuenta: ${accountInfo.code} - ${accountInfo.name}`);

    // Verificar si la cuenta tiene cuentas hijas
    const childrenQuery = `SELECT id, code, name FROM chart_of_accounts WHERE parent_code = $1`;
    const { data: children } = await databaseSimple.query(childrenQuery, [accountInfo.code]);
    
    console.log(`👶 Cuentas hijas encontradas para ${accountInfo.code}:`, children?.length || 0);
    if (children && children.length > 0) {
      console.log(`📋 Primeras 3 cuentas hijas:`, children.slice(0, 3));
    }

    if (children && children.length > 0 && !force) {
      return NextResponse.json(
        { success: false, error: `No se puede eliminar la cuenta ${accountInfo.code} porque tiene ${children.length} cuentas hijas. Use force=true para eliminar todas.` },
        { status: 400 }
      );
    }

    // SIEMPRE hacer hard delete para cuentas imputables
    const shouldHardDelete = force || accountInfo.level_type === 'Imputable';
    
    if (shouldHardDelete) {
      // Physical delete para cuentas imputables
      console.log(`🗑️ Eliminando permanentemente cuenta imputable`);
      const deleteQuery = `DELETE FROM chart_of_accounts WHERE id = $1 RETURNING code, name`;
      const { data: deletedData, error: deleteError } = await databaseSimple.query(deleteQuery, [id]);
      
      if (deleteError) {
        console.error('❌ Error eliminando cuenta:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Error al eliminar cuenta: ' + deleteError.message },
          { status: 500 }
        );
      }
      
      console.log(`✅ Cuenta eliminada permanentemente`);
      return NextResponse.json({
        success: true,
        message: `Cuenta ${accountInfo.code} - ${accountInfo.name} eliminada definitivamente`
      });
    } else {
      // Soft delete para cuentas de nivel superior
      console.log(`✏️ Desactivando cuenta de nivel superior`);
      const updateQuery = `UPDATE chart_of_accounts SET is_active = false WHERE id = $1 RETURNING code, name`;
      const { data: updatedData, error: updateError } = await databaseSimple.query(updateQuery, [id]);
      
      if (updateError) {
        console.error('❌ Error desactivando cuenta:', updateError);
        return NextResponse.json(
          { success: false, error: 'Error al desactivar cuenta: ' + updateError.message },
          { status: 500 }
        );
      }
      
      console.log(`✅ Cuenta desactivada exitosamente`);
      return NextResponse.json({
        success: true,
        message: `Cuenta ${accountInfo.code} - ${accountInfo.name} desactivada exitosamente`
      });
    }

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}