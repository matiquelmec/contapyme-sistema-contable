/**
 * File Employee Store - Persistencia definitiva en archivo JSON
 * 
 * SOLUCIÓN SIMPLE Y DEFINITIVA:
 * - Guarda empleados en archivo JSON local
 * - Persiste entre reinicios del servidor
 * - Acumula empleados (no se pierden)
 * - Independiente de base de datos externa
 * - Funciona inmediatamente
 */

import * as fs from 'fs';
import * as path from 'path';

interface Employee {
  id: string;
  company_id: string;
  rut: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  birth_date: string;
  gender?: string;
  marital_status?: string;
  nationality?: string;
  email: string;
  phone?: string;
  mobile_phone?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  status: string;
  created_at: string;
  updated_at: string;
  employment_contracts?: any[];
  payroll_config?: any[];
}

interface FileData {
  employees: Record<string, Employee[]>; // Por company_id
  metadata: {
    created_at: string;
    last_updated: string;
    total_employees: number;
    version: string;
  };
}

class FileEmployeeStore {
  private dataFilePath: string;
  private data: FileData;
  
  constructor() {
    // Archivo en la raíz del proyecto para persistencia
    this.dataFilePath = path.join(process.cwd(), 'employees-data.json');
    this.loadData();
  }
  
  /**
   * Cargar datos desde archivo o inicializar
   */
  private loadData() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const fileContent = fs.readFileSync(this.dataFilePath, 'utf8');
        this.data = JSON.parse(fileContent);
        console.log('✅ Datos de empleados cargados desde archivo:', Object.keys(this.data.employees).length, 'empresas');
        
        // Contar empleados totales
        let totalEmployees = 0;
        Object.values(this.data.employees).forEach(companyEmployees => {
          totalEmployees += companyEmployees.length;
        });
        console.log('👥 Total empleados cargados:', totalEmployees);
      } else {
        console.log('📁 Archivo de empleados no existe, inicializando con datos de ejemplo...');
        this.initializeWithDefaults();
      }
    } catch (error) {
      console.error('❌ Error cargando datos de empleados:', error);
      console.log('🔄 Inicializando con datos por defecto...');
      this.initializeWithDefaults();
    }
  }
  
  /**
   * Inicializar con datos de ejemplo
   */
  private initializeWithDefaults() {
    const companyId = '8033ee69-b420-4d91-ba0e-482f46cd6fce';
    
    const defaultEmployees: Employee[] = [
      {
        id: 'file-employee-1',
        company_id: companyId,
        rut: '12.345.678-9',
        first_name: 'Juan',
        last_name: 'Pérez',
        middle_name: 'Carlos',
        birth_date: '1985-05-15',
        gender: 'masculino',
        marital_status: 'casado',
        nationality: 'chilena',
        email: 'juan.perez@empresa.cl',
        phone: '+56912345678',
        address: 'Av. Principal 123',
        city: 'Santiago',
        region: 'Metropolitana',
        status: 'active',
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date().toISOString(),
        employment_contracts: [
          {
            id: 'file-contract-1',
            position: 'Desarrollador Senior',
            department: 'Tecnología',
            contract_type: 'indefinido',
            start_date: '2024-01-01',
            base_salary: 1500000,
            salary_type: 'monthly',
            status: 'active'
          }
        ],
        payroll_config: [
          {
            afp_code: 'HABITAT',
            health_institution_code: 'FONASA',
            family_allowances: 2,
            legal_gratification_type: 'code_47',
            has_unemployment_insurance: true
          }
        ]
      },
      {
        id: 'file-employee-2',
        company_id: companyId,
        rut: '98.765.432-1',
        first_name: 'María',
        last_name: 'González',
        middle_name: 'Isabel',
        birth_date: '1990-08-22',
        gender: 'femenino',
        marital_status: 'soltera',
        nationality: 'chilena',
        email: 'maria.gonzalez@empresa.cl',
        phone: '+56987654321',
        address: 'Calle Sur 456',
        city: 'Santiago',
        region: 'Metropolitana',
        status: 'active',
        created_at: new Date('2023-06-15').toISOString(),
        updated_at: new Date().toISOString(),
        employment_contracts: [
          {
            id: 'file-contract-2',
            position: 'Contadora',
            department: 'Finanzas',
            contract_type: 'indefinido',
            start_date: '2023-06-15',
            base_salary: 1200000,
            salary_type: 'monthly',
            status: 'active'
          }
        ],
        payroll_config: [
          {
            afp_code: 'PROVIDA',
            health_institution_code: 'ISAPRE_CONSALUD',
            family_allowances: 1,
            legal_gratification_type: 'code_50',
            has_unemployment_insurance: true
          }
        ]
      }
    ];
    
    this.data = {
      employees: {
        [companyId]: defaultEmployees
      },
      metadata: {
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        total_employees: defaultEmployees.length,
        version: '1.0.0'
      }
    };
    
    this.saveData();
  }
  
  /**
   * Guardar datos al archivo
   */
  private saveData() {
    try {
      // Actualizar metadata
      let totalEmployees = 0;
      Object.values(this.data.employees).forEach(companyEmployees => {
        totalEmployees += companyEmployees.length;
      });
      
      this.data.metadata.last_updated = new Date().toISOString();
      this.data.metadata.total_employees = totalEmployees;
      
      // Escribir archivo con formato legible
      const jsonContent = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(this.dataFilePath, jsonContent, 'utf8');
      
      console.log('✅ Datos guardados en archivo:', this.dataFilePath);
      console.log('📊 Total empleados guardados:', totalEmployees);
    } catch (error) {
      console.error('❌ Error guardando datos:', error);
    }
  }
  
  /**
   * Obtener todos los empleados de una empresa
   */
  getEmployeesByCompany(companyId: string): Employee[] {
    const employees = this.data.employees[companyId] || [];
    console.log(`📋 FileStore: Retornando ${employees.length} empleados para empresa ${companyId}`);
    return employees;
  }
  
  /**
   * Agregar un nuevo empleado (ACUMULATIVO)
   */
  addEmployee(employee: Employee): Employee {
    // Asegurar que existe array para la empresa
    if (!this.data.employees[employee.company_id]) {
      this.data.employees[employee.company_id] = [];
    }
    
    const companyEmployees = this.data.employees[employee.company_id];
    
    // Generar ID único si no tiene
    if (!employee.id || employee.id.includes('mock-employee-') || employee.id === '') {
      employee.id = `file-emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Agregar timestamps
    employee.created_at = employee.created_at || new Date().toISOString();
    employee.updated_at = new Date().toISOString();
    
    // AGREGAR (no reemplazar) el nuevo empleado
    companyEmployees.push(employee);
    
    // Guardar inmediatamente al archivo
    this.saveData();
    
    console.log(`✅ FileStore: Empleado agregado: ${employee.first_name} ${employee.last_name} (${employee.id})`);
    console.log(`📊 FileStore: Total empleados en empresa ${employee.company_id}: ${companyEmployees.length}`);
    
    return employee;
  }
  
  /**
   * Obtener un empleado por ID
   */
  getEmployeeById(companyId: string, employeeId: string): Employee | null {
    const employees = this.getEmployeesByCompany(companyId);
    return employees.find(emp => emp.id === employeeId) || null;
  }
  
  /**
   * Actualizar un empleado
   */
  updateEmployee(companyId: string, employeeId: string, updates: Partial<Employee>): Employee | null {
    const companyEmployees = this.data.employees[companyId] || [];
    const index = companyEmployees.findIndex(emp => emp.id === employeeId);
    
    if (index === -1) {
      return null;
    }
    
    // Actualizar empleado
    companyEmployees[index] = {
      ...companyEmployees[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Guardar al archivo
    this.saveData();
    
    console.log(`✅ FileStore: Empleado actualizado: ${employeeId}`);
    return companyEmployees[index];
  }
  
  /**
   * Eliminar un empleado (soft delete)
   */
  deleteEmployee(companyId: string, employeeId: string): boolean {
    const employee = this.getEmployeeById(companyId, employeeId);
    
    if (!employee) {
      return false;
    }
    
    // Soft delete - cambiar estado
    this.updateEmployee(companyId, employeeId, { status: 'terminated' });
    console.log(`✅ FileStore: Empleado desactivado: ${employeeId}`);
    
    return true;
  }
  
  /**
   * Obtener estadísticas del store
   */
  getStats(): { companies: number; totalEmployees: number; filePath: string } {
    return {
      companies: Object.keys(this.data.employees).length,
      totalEmployees: this.data.metadata.total_employees,
      filePath: this.dataFilePath
    };
  }
}

// Singleton instance
const fileEmployeeStore = new FileEmployeeStore();

// Exportar instance para uso global
export default fileEmployeeStore;

// Exportar tipos
export type { Employee };