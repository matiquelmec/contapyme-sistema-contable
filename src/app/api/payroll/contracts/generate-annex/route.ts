import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAnnex, type AnnexData } from '@/lib/templates/contractAnnexTemplates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ✅ FUNCIÓN PARA GUARDAR MODIFICACIONES CONTRACTUALES AUTOMÁTICAMENTE
async function saveContractModifications(supabase: any, employeeId: string, annexData: AnnexData) {
  try {
    const modifications = [];
    const effectiveDate = annexData.effectiveDate || annexData.annexDate;

    // Obtener company_id una sola vez
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employeeId)
      .single();
    
    if (employeeError || !employeeData) {
      console.error('❌ Error obteniendo company_id:', employeeError);
      return;
    }

    const companyId = employeeData.company_id;

    // 1. RENOVACIÓN CON CAMBIO SALARIAL
    if (annexData.annexType === 'renovation' && annexData.newSalary && annexData.newSalary !== annexData.currentSalary) {
      modifications.push({
        employee_id: employeeId,
        company_id: companyId,
        modification_type: 'salary_change',
        effective_date: effectiveDate,
        created_date: new Date().toISOString().split('T')[0],
        old_values: { base_salary: annexData.currentSalary },
        new_values: { base_salary: annexData.newSalary },
        reason: `Renovación contractual con cambio salarial - Anexo ${annexData.renovationType === 'indefinite' ? 'indefinido' : 'plazo fijo'}`,
        document_reference: `ANEXO-RENO-${Date.now()}`
      });
    }

    // 2. RENOVACIÓN PLAZO FIJO → INDEFINIDO
    if (annexData.annexType === 'renovation' && annexData.renovationType === 'indefinite') {
      modifications.push({
        employee_id: employeeId,
        company_id: companyId,
        modification_type: 'contract_type_change',
        effective_date: effectiveDate,
        created_date: new Date().toISOString().split('T')[0],
        old_values: { contract_type: 'plazo_fijo' },
        new_values: { contract_type: 'indefinido' },
        reason: 'Renovación contractual - Cambio a contrato indefinido',
        document_reference: `ANEXO-TIPO-${Date.now()}`
      });
    }

    // 3. CAMBIO SALARIAL DIRECTO
    if (annexData.annexType === 'salary_change' && annexData.newSalary) {
      modifications.push({
        employee_id: employeeId,
        company_id: companyId,
        modification_type: 'salary_change',
        effective_date: effectiveDate,
        created_date: new Date().toISOString().split('T')[0],
        old_values: { base_salary: annexData.currentSalary },
        new_values: { base_salary: annexData.newSalary },
        reason: 'Cambio salarial por anexo contractual',
        document_reference: `ANEXO-SUEL-${Date.now()}`
      });
    }

    // 4. CAMBIO DE CARGO/POSICIÓN
    if (annexData.annexType === 'position_change' && annexData.newPosition) {
      modifications.push({
        employee_id: employeeId,
        company_id: companyId,
        modification_type: 'position_change',
        effective_date: effectiveDate,
        created_date: new Date().toISOString().split('T')[0],
        old_values: { position: annexData.employeePosition },
        new_values: { position: annexData.newPosition },
        reason: 'Cambio de cargo por anexo contractual',
        document_reference: `ANEXO-CARGO-${Date.now()}`
      });

      // Cambio salarial asociado al cambio de cargo
      if (annexData.newSalary && annexData.newSalary !== annexData.currentSalary) {
        modifications.push({
          employee_id: employeeId,
          company_id: companyId,
          modification_type: 'salary_change',
          effective_date: effectiveDate,
          created_date: new Date().toISOString().split('T')[0],
          old_values: { base_salary: annexData.currentSalary },
          new_values: { base_salary: annexData.newSalary },
          reason: 'Cambio salarial asociado a cambio de cargo',
          document_reference: `ANEXO-CARGO-SUEL-${Date.now()}`
        });
      }
    }

    // 5. CAMBIO DE HORARIO
    if (annexData.annexType === 'schedule_change' && annexData.newSchedule) {
      modifications.push({
        employee_id: employeeId,
        company_id: companyId,
        modification_type: 'schedule_change',
        effective_date: effectiveDate,
        created_date: new Date().toISOString().split('T')[0],
        old_values: { schedule: 'Horario anterior' },
        new_values: { schedule: annexData.newSchedule },
        reason: 'Cambio de horario por anexo contractual',
        document_reference: `ANEXO-HORA-${Date.now()}`
      });
    }

    // 6. GUARDAR EN BASE DE DATOS
    if (modifications.length > 0) {
      const { data, error } = await supabase
        .from('contract_modifications')
        .insert(modifications)
        .select();

      if (error) {
        console.error('❌ Error guardando modificaciones contractuales:', error);
      } else {
        console.log(`✅ ${modifications.length} modificaciones contractuales guardadas automáticamente`);
        console.log('📋 Modificaciones:', modifications.map(m => `${m.modification_type} - ${m.reason}`));
      }
    } else {
      console.log('ℹ️  No hay modificaciones contractuales que guardar para este anexo');
    }

  } catch (error) {
    console.error('❌ Error en saveContractModifications:', error);
  }
}

// GET: Generar anexo basado en datos del empleado
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employee_id = searchParams.get('employee_id');
    const annex_type = searchParams.get('type') as AnnexData['annexType'];
    
    if (!employee_id || !annex_type) {
      return NextResponse.json({ 
        error: 'employee_id y type son requeridos' 
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener datos del empleado y su contrato
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        employment_contracts!inner(
          id,
          position,
          department,
          base_salary,
          start_date,
          end_date,
          contract_type,
          entry_time,
          exit_time
        ),
        companies!inner(
          name,
          rut,
          legal_representative_name,
          legal_representative_rut,
          fiscal_address,
          fiscal_city
        )
      `)
      .eq('id', employee_id)
      .single();

    if (employeeError || !employeeData) {
      console.error('Error fetching employee:', employeeError);
      return NextResponse.json({ 
        error: 'Empleado no encontrado' 
      }, { status: 404 });
    }

    // Obtener configuración de empresa desde payroll_settings
    const { data: payrollSettings } = await supabase
      .from('payroll_settings')
      .select('settings')
      .eq('company_id', employeeData.company_id)
      .single();

    const companyInfo = payrollSettings?.settings?.company_info;
    const legalRep = companyInfo?.legal_representative;

    // Preparar datos base para el anexo
    const baseAnnexData: Partial<AnnexData> = {
      // Datos del empleado
      employeeName: `${employeeData.first_name} ${employeeData.last_name} ${employeeData.middle_name || ''}`.trim(),
      employeeRut: employeeData.rut,
      employeeAddress: employeeData.address,
      employeePosition: employeeData.employment_contracts?.[0]?.position || '',
      employeeDepartment: employeeData.employment_contracts?.[0]?.department,
      
      // Datos de la empresa
      companyName: companyInfo?.company_name || employeeData.companies?.name,
      companyRut: companyInfo?.company_rut || employeeData.companies?.rut,
      companyAddress: companyInfo?.company_address || employeeData.companies?.fiscal_address,
      legalRepresentativeName: legalRep?.full_name || employeeData.companies?.legal_representative_name,
      legalRepresentativeRut: legalRep?.rut || employeeData.companies?.legal_representative_rut,
      
      // Datos del contrato
      originalContractDate: employeeData.employment_contracts?.[0]?.start_date,
      currentSalary: employeeData.employment_contracts?.[0]?.base_salary,
      
      // Tipo de anexo
      annexType: annex_type,
      annexDate: new Date().toISOString().split('T')[0]
    };

    // Devolver HTML base para que el frontend pueda editarlo
    return NextResponse.json({
      success: true,
      baseData: baseAnnexData,
      message: 'Datos base del anexo listos para edición'
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/contracts/generate-annex:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

// POST: Generar anexo con datos personalizados
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let annexData = body as AnnexData;

    // Crear cliente Supabase para todo el flujo
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Si se proporciona employee_id, cargar datos del empleado
    if (body.employee_id && !annexData.employeeName) {

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select(`
          *,
          employment_contracts!inner(
            position,
            department,
            base_salary,
            start_date
          ),
          companies!inner(
            name,
            rut,
            legal_representative_name,
            legal_representative_rut,
            fiscal_address,
            fiscal_city
          )
        `)
        .eq('id', body.employee_id)
        .single();

      if (employeeError || !employeeData) {
        return NextResponse.json({ 
          error: 'Empleado no encontrado' 
        }, { status: 404 });
      }

      // Obtener configuración de empresa desde payroll_settings
      const { data: payrollSettings } = await supabase
        .from('payroll_settings')
        .select('settings')
        .eq('company_id', employeeData.company_id)
        .single();

      const companyInfo = payrollSettings?.settings?.company_info;

      // Completar datos de anexo con información del empleado
      annexData = {
        ...annexData,
        employeeName: `${employeeData.first_name} ${employeeData.last_name} ${employeeData.middle_name || ''}`.trim(),
        employeeRut: employeeData.rut,
        employeeAddress: employeeData.address,
        employeePosition: employeeData.employment_contracts?.[0]?.position || '',
        employeeDepartment: employeeData.employment_contracts?.[0]?.department,
        companyName: companyInfo?.company_name || employeeData.companies?.name,
        companyRut: companyInfo?.company_rut || employeeData.companies?.rut,
        companyAddress: companyInfo?.company_address || employeeData.companies?.fiscal_address,
        legalRepresentativeName: companyInfo?.legal_representative?.name || employeeData.companies?.legal_representative_name,
        legalRepresentativeRut: companyInfo?.legal_representative?.rut || employeeData.companies?.legal_representative_rut,
        currentSalary: employeeData.employment_contracts?.[0]?.base_salary || 0,
        originalContractDate: employeeData.employment_contracts?.[0]?.start_date,
        annexDate: body.annexDate || new Date().toISOString().split('T')[0]
      };
    }

    if (!annexData.annexType) {
      return NextResponse.json({ 
        error: 'annexType es requerido' 
      }, { status: 400 });
    }

    // Validaciones específicas por tipo
    if (annexData.annexType === 'renovation') {
      if (!annexData.renovationType) {
        return NextResponse.json({ 
          error: 'renovationType es requerido para renovación' 
        }, { status: 400 });
      }
      
      if (annexData.renovationType === 'fixed_term' && !annexData.newEndDate) {
        return NextResponse.json({ 
          error: 'newEndDate es requerido para contrato a plazo fijo' 
        }, { status: 400 });
      }
    }

    if (annexData.annexType === 'vacation') {
      if (!annexData.vacationStartDate || !annexData.vacationEndDate) {
        return NextResponse.json({ 
          error: 'Fechas de inicio y fin son requeridas para feriado' 
        }, { status: 400 });
      }
    }

    if (annexData.annexType === 'night_shift') {
      // Aplicar valores por defecto si no vienen
      annexData.nightShiftPercentage = annexData.nightShiftPercentage || 20;
      annexData.nightShiftStartTime = annexData.nightShiftStartTime || '21:00';
      annexData.nightShiftEndTime = annexData.nightShiftEndTime || '07:00';
    }

    // ✅ GUARDAR MODIFICACIONES CONTRACTUALES EN LA BASE DE DATOS
    if (body.employee_id) {
      await saveContractModifications(supabase, body.employee_id, annexData);
    }

    // Generar el HTML del anexo
    const html = generateAnnex(annexData);

    // Log para auditoría
    console.log(`📄 Anexo ${annexData.annexType} generado para: ${annexData.employeeName}`);
    console.log(`🏢 Empresa: ${annexData.companyName}`);
    console.log(`📅 Fecha: ${annexData.annexDate}`);

    // Devolver el HTML directamente para mostrar en el navegador
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="anexo_${annexData.annexType}_${annexData.employeeRut?.replace(/[.-]/g, '')}.html"`
      }
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/contracts/generate-annex:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}