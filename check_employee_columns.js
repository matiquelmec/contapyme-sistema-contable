// Script para verificar qué columnas tiene la tabla employees
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEmployeeColumns() {
  console.log('🔍 Verificando estructura de tabla employees...\n');
  
  try {
    // Intentar hacer una consulta para obtener la estructura
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error consultando employees:', error);
      return;
    }
    
    console.log('✅ Tabla employees encontrada');
    
    if (data && data.length > 0) {
      console.log('📊 Columnas disponibles en el primer registro:');
      Object.keys(data[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
    } else {
      console.log('📝 Tabla employees vacía - no se pueden mostrar columnas desde datos');
      console.log('🔍 Intentando consulta específica para verificar columnas...');
      
      // Intentar consultas específicas
      const tests = [
        'first_name',
        'last_name', 
        'full_name',
        'employment_status',
        'status'
      ];
      
      for (const field of tests) {
        try {
          const { error } = await supabase
            .from('employees')
            .select(field)
            .limit(1);
            
          if (error) {
            console.log(`  ❌ ${field} - NO EXISTE (${error.code})`);
          } else {
            console.log(`  ✅ ${field} - EXISTE`);
          }
        } catch (e) {
          console.log(`  ❌ ${field} - ERROR: ${e.message}`);
        }
      }
    }
    
    console.log('\n🔍 Verificando tabla payroll_config...');
    const { data: configData, error: configError } = await supabase
      .from('payroll_config')
      .select('*')
      .limit(1);
      
    if (configError) {
      if (configError.code === 'PGRST106') {
        console.log('❌ Tabla payroll_config NO EXISTE');
      } else {
        console.log('❌ Error verificando payroll_config:', configError.message);
      }
    } else {
      console.log('✅ Tabla payroll_config EXISTE');
    }
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkEmployeeColumns();