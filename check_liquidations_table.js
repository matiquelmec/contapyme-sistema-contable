// Script para verificar qué columnas tiene la tabla payroll_liquidations
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLiquidationsTable() {
  console.log('🔍 Verificando estructura de tabla payroll_liquidations...\n');
  
  try {
    // Intentar hacer una consulta para obtener la estructura
    const { data, error } = await supabase
      .from('payroll_liquidations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error consultando payroll_liquidations:', error);
      return;
    }
    
    console.log('✅ Tabla payroll_liquidations encontrada');
    
    if (data && data.length > 0) {
      console.log('📊 Columnas disponibles en el primer registro:');
      Object.keys(data[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
    } else {
      console.log('📝 Tabla payroll_liquidations vacía - verificando columnas específicas...');
      
      // Intentar consultas específicas
      const tests = [
        'company_id',
        'employee_id',
        'period_year',
        'period_month',
        'net_salary'
      ];
      
      for (const field of tests) {
        try {
          const { error } = await supabase
            .from('payroll_liquidations')
            .select(field)
            .limit(1);
            
          if (error) {
            console.log(`  ❌ ${field} - NO EXISTE (${error.code}: ${error.message})`);
          } else {
            console.log(`  ✅ ${field} - EXISTE`);
          }
        } catch (e) {
          console.log(`  ❌ ${field} - ERROR: ${e.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkLiquidationsTable();