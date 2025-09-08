import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * DELETE /api/accounting/configuration/centralized/[id]
 * Elimina una configuración centralizada
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const configId = params.id;

    if (!configId) {
      return NextResponse.json(
        { success: false, error: 'ID de configuración es requerido' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting centralized config: ${configId}`);

    const { error } = await supabase
      .from('centralized_account_config')
      .delete()
      .eq('id', configId);

    if (error) {
      console.error('Error deleting centralized config:', error);
      return NextResponse.json(
        { success: false, error: 'Error eliminando configuración' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando configuración centralizada:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}