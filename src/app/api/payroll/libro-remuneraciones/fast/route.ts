import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/payroll/libro-remuneraciones/fast
 * Consulta rápida y liviana para la página principal
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

    // ✅ CONSULTA ULTRA RÁPIDA - Solo campos esenciales
    const { data: books, error } = await supabase
      .from('payroll_books')
      .select(`
        id, period, book_number, status, total_employees,
        total_haberes, total_descuentos, total_liquido, generation_date
      `)
      .eq('company_id', companyId)
      .order('generation_date', { ascending: false })
      .limit(10);

    // ✅ Si tenemos datos reales, recalcular los totales con la misma lógica del Excel
    if (!error && books && books.length > 0) {
      // Para cada libro, recalcular los totales basados en liquidaciones
      const booksWithRecalculatedTotals = await Promise.all(
        books.map(async (book) => {
          try {
            // Obtener las liquidaciones de este período
            const [year, month] = book.period.split('-');
            const { data: liquidations } = await supabase
              .from('payroll_liquidations')
              .select(`
                total_gross_income, afp_amount, health_amount, unemployment_amount, 
                income_tax_amount, sis_amount
              `)
              .eq('company_id', companyId)
              .eq('period_year', parseInt(year))
              .eq('period_month', parseInt(month));

            if (liquidations && liquidations.length > 0) {
              // Recalcular totales con la misma lógica del Excel
              const totalHaberes = liquidations.reduce((sum, liq) => sum + (liq.total_gross_income || 0), 0);
              const totalDescuentos = liquidations.reduce((sum, liq) => {
                const afp = liq.afp_amount || 0;
                const salud = liq.health_amount || 0;
                const cesantia = liq.unemployment_amount || 0;
                const impuesto = liq.income_tax_amount || 0;
                const sis = liq.sis_amount || 0;
                return sum + (afp + salud + cesantia + impuesto + sis);
              }, 0);
              const totalLiquido = totalHaberes - totalDescuentos;

              return {
                ...book,
                total_haberes: totalHaberes,
                total_descuentos: totalDescuentos,
                total_liquido: totalLiquido
              };
            }
            return book;
          } catch (err) {
            console.log('Error recalculando libro:', book.id);
            return book;
          }
        })
      );
      
      return NextResponse.json({
        success: true,
        data: booksWithRecalculatedTotals,
        source: 'database'
      });
    }

    if (error) {
      console.log('📋 Usando datos demo - consulta rápida');
      // Datos demo mínimos para carga rápida
      const demoBooks = [
        {
          id: 'demo-1',
          period: '2025-08',
          book_number: 1,
          status: 'draft',
          total_employees: 5,
          total_haberes: 4500000,
          total_descuentos: 900000,
          total_liquido: 3600000, // = 4500000 - 900000
          generation_date: new Date().toISOString(),
          payroll_book_details: []
        }
      ];

      return NextResponse.json({
        success: true,
        data: demoBooks,
        source: 'demo'
      });
    }

    return NextResponse.json({
      success: true,
      data: books || [],
      source: 'database'
    });

  } catch (error) {
    console.error('❌ Error en consulta rápida:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}