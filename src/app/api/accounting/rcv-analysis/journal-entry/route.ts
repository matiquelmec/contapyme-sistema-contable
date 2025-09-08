import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/database/databaseSimple';

// Tipos para el asiento contable
interface JournalEntryLine {
  account_code: string;
  account_name: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

interface PreliminaryJournalEntry {
  description: string;
  total_debit: number;
  total_credit: number;
  lines: JournalEntryLine[];
  period: string;
  is_balanced: boolean;
}

/**
 * POST /api/accounting/rcv-analysis/journal-entry
 * Genera asiento contable preliminar basado en análisis RCV
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, rcv_analysis, period, ledger_id } = body;
    
    console.log('🧾 Generando asiento contable preliminar RCV:', {
      company_id,
      total_proveedores: rcv_analysis.proveedoresPrincipales.length,
      monto_total: rcv_analysis.montoCalculadoGlobal,
      period
    });

    if (!company_id || !rcv_analysis) {
      return NextResponse.json({
        success: false,
        error: 'Faltan datos requeridos para generar asiento'
      }, { status: 400 });
    }

    const supabase = getDatabaseConnection();

    // CALCULAR TOTALES REALES DESDE LA BASE DE DATOS
    let realTotalNet = 0;
    let realTotalIVA = 0;
    let realTotalAmount = 0;
    
    if (ledger_id) {
      console.log('📊 Calculando totales reales desde base de datos para ledger_id:', ledger_id);
      
      // Obtener datos del ledger para determinar período y tipo
      const { data: ledgerData } = await supabase
        .from('rcv_ledger')
        .select('period_identifier, rcv_type')
        .eq('id', ledger_id)
        .single();
        
      if (ledgerData) {
        const tableName = ledgerData.rcv_type === 'purchase' ? 'purchase_documents' : 'sales_documents';
        const { data: documents } = await supabase
          .from(tableName)
          .select('net_amount, tax_amount, total_amount')
          .eq('company_id', company_id)
          .like('period', `${ledgerData.period_identifier}%`);
          
        if (documents && documents.length > 0) {
          realTotalNet = documents.reduce((sum, doc) => sum + (doc.net_amount || 0), 0);
          realTotalIVA = documents.reduce((sum, doc) => sum + (doc.tax_amount || 0), 0);
          realTotalAmount = documents.reduce((sum, doc) => sum + (doc.total_amount || 0), 0);
          
          console.log('💰 Totales reales calculados desde BD:');
          console.log('📊 Net Amount:', realTotalNet?.toLocaleString());
          console.log('📊 IVA Amount:', realTotalIVA?.toLocaleString());
          console.log('📊 Total Amount:', realTotalAmount?.toLocaleString());
          console.log('📋 Documents count:', documents.length);
          
          // SOBRESCRIBIR los valores del análisis con los datos reales
          rcv_analysis.montoNetoGlobal = realTotalNet;
          rcv_analysis.montoIVAGlobal = realTotalIVA;
          rcv_analysis.montoCalculadoGlobal = realTotalAmount;
          
          console.log('✅ Análisis RCV actualizado con datos reales de la BD');
        }
      }
    }

    // 1. OBTENER CONFIGURACIÓN DE ENTIDADES RCV
    const { data: rcvEntities } = await supabase
      .from('rcv_entities')
      .select('entity_rut, account_code, account_name, entity_name')
      .eq('company_id', company_id)
      .eq('entity_type', 'supplier');

    console.log('🏢 Entidades RCV configuradas:', rcvEntities?.length || 0);

    // 2. GENERAR LÍNEAS DEL ASIENTO
    const journalLines: JournalEntryLine[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    // 3. PROCESAR PROVEEDORES PARA CUENTAS DE GASTO (DEBE)
    // IMPORTANTE: El monto neto debe incluir K + Z + J (monto exento)
    const entityMap = new Map(rcvEntities?.map(e => [e.entity_rut, e]) || []);
    const accountTotals = new Map<string, { account_code: string; account_name: string; total: number }>();

    for (const proveedor of rcv_analysis.proveedoresPrincipales) {
      const rutFormateado = formatRut(proveedor.rutProveedor);
      const entity = entityMap.get(rutFormateado);
      
      // El monto neto del proveedor ya incluye K + Z del parser
      // Además debemos sumar el monto exento (J)
      const montoNetoProveedor = proveedor.montoNetoTotal + (proveedor.montoExentoTotal || 0);
      
      // Aplicar solo si hay monto (puede ser negativo por notas de crédito)
      if (montoNetoProveedor !== 0) {
        if (entity) {
          // Usar cuenta específica de la entidad
          const key = `${entity.account_code}-${entity.account_name}`;
          const existing = accountTotals.get(key);
          
          if (existing) {
            existing.total += montoNetoProveedor;
          } else {
            accountTotals.set(key, {
              account_code: entity.account_code,
              account_name: entity.account_name,
              total: montoNetoProveedor
            });
          }
        } else {
          // Usar cuenta genérica de gastos
          const key = '5.1.1.001-Gastos Generales';
          const existing = accountTotals.get(key);
          
          if (existing) {
            existing.total += montoNetoProveedor;
          } else {
            accountTotals.set(key, {
              account_code: '5.1.1.001',
              account_name: 'Gastos Generales',
              total: montoNetoProveedor
            });
          }
        }
      }
    }

    // Agregar líneas de gastos al asiento (DEBE)
    // Usar las cuentas específicas por entidad con los montos K + Z + J
    for (const [key, accountData] of accountTotals) {
      // Solo agregar líneas con monto positivo al debe o negativo al haber
      if (accountData.total > 0) {
        journalLines.push({
          account_code: accountData.account_code,
          account_name: accountData.account_name,
          description: `Gastos del período ${period} (K+Z+J)`,
          debit_amount: accountData.total,
          credit_amount: 0
        });
        totalDebit += accountData.total;
      } else if (accountData.total < 0) {
        // Notas de crédito van al haber
        journalLines.push({
          account_code: accountData.account_code,
          account_name: accountData.account_name,
          description: `Devoluciones del período ${period}`,
          debit_amount: 0,
          credit_amount: Math.abs(accountData.total)
        });
        totalCredit += Math.abs(accountData.total);
      }
    }
    
    // Si no hay cuentas específicas, usar monto global como fallback
    if (accountTotals.size === 0 && rcv_analysis.montoNetoGlobal) {
      const montoNetoTotal = Math.abs(rcv_analysis.montoNetoGlobal) + Math.abs(rcv_analysis.montoExentoGlobal || 0);
      journalLines.push({
        account_code: '5.1.1.001',
        account_name: 'Gastos Generales',
        description: `Gastos del período ${period} (K+Z+J)`,
        debit_amount: montoNetoTotal,
        credit_amount: 0
      });
      totalDebit += montoNetoTotal;
    }

    // 4. IVA CRÉDITO FISCAL (DEBE)
    const totalIVA = Math.abs(rcv_analysis.montoIVAGlobal || 0);
    if (totalIVA > 0) {
      journalLines.push({
        account_code: '1.1.4.002',
        account_name: 'IVA Crédito Fiscal',
        description: `IVA Crédito Fiscal período ${period}`,
        debit_amount: totalIVA,
        credit_amount: 0
      });
      
      totalDebit += totalIVA;
    }

    // 5. PROVEEDORES POR PAGAR (HABER)
    // DEBE SER LA SUMA DE NETO CORREGIDO (K+Z) + EXENTO (J) + IVA (L)
    const montoNetoCorregidoTotal = Math.abs(rcv_analysis.montoNetoGlobal || 0);
    const montoExentoTotal = Math.abs(rcv_analysis.montoExentoGlobal || 0);
    const montoIVATotal = Math.abs(rcv_analysis.montoIVAGlobal || 0);
    const totalProveedores = montoNetoCorregidoTotal + montoExentoTotal + montoIVATotal;
    
    if (totalProveedores > 0) {
      journalLines.push({
        account_code: '2.1.1.001',
        account_name: 'Proveedores',
        description: `Proveedores por pagar período ${period} (K+Z+J+L)`,
        debit_amount: 0,
        credit_amount: totalProveedores
      });
      
      totalCredit += totalProveedores;
    }

    // 6. CREAR ASIENTO PRELIMINAR
    const journalEntry: PreliminaryJournalEntry = {
      description: `Asiento RCV Compras ${period}`,
      total_debit: totalDebit,
      total_credit: totalCredit,
      lines: journalLines,
      period,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
    };

    console.log('✅ Asiento contable generado:', {
      lines: journalLines.length,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: journalEntry.is_balanced
    });

    return NextResponse.json({
      success: true,
      data: journalEntry
    });

  } catch (error) {
    console.error('❌ Error generando asiento contable RCV:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * Formatea un RUT al formato chileno estándar
 */
function formatRut(rut: string): string {
  if (!rut) return '';
  
  // Remover puntos y guiones existentes
  const cleanRut = rut.replace(/[.\-]/g, '');
  
  if (cleanRut.length < 2) return rut;
  
  // Separar número y dígito verificador
  const number = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  
  // Agregar puntos cada tres dígitos desde la derecha
  const formattedNumber = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${formattedNumber}-${dv}`;
}