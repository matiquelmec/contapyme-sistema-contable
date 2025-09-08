'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Employee {
  id: string;
  rut: string;
  first_name: string;
  last_name: string;
  email?: string;
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
}

interface Contract {
  id?: string;
  base_salary?: number;
  contract_type?: string;
}

interface PayrollConfig {
  afp_code?: string;
  health_institution_code?: string;
  legal_gratification_type?: string;
}

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSave: () => void;
}

export default function EmployeeEditModal({ isOpen, onClose, employeeId, onSave }: EmployeeEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [payrollConfig, setPayrollConfig] = useState<PayrollConfig | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    // Datos personales
    email: '',
    
    // Datos bancarios
    bank_name: '',
    bank_account_type: 'cuenta_vista',
    bank_account_number: '',
    
    // Datos contractuales
    base_salary: 0,
    contract_type: 'indefinido',
    
    // Datos previsionales
    afp_code: 'HABITAT',
    health_institution_code: 'FONASA',
    legal_gratification_type: 'none'
  });

  useEffect(() => {
    if (isOpen && employeeId) {
      loadEmployeeData();
    }
  }, [isOpen, employeeId]);

  const loadEmployeeData = async () => {
    setLoading(true);
    try {
      // Cargar datos del empleado
      const response = await fetch(`/api/payroll/employees/${employeeId}`);
      const data = await response.json();
      
      if (data.success) {
        setEmployee(data.employee);
        setContract(data.contract);
        setPayrollConfig(data.payrollConfig);
        
        // Llenar el formulario con los datos actuales
        setFormData({
          email: data.employee?.email || '',
          bank_name: data.employee?.bank_name || '',
          bank_account_type: data.employee?.bank_account_type || 'cuenta_vista',
          bank_account_number: data.employee?.bank_account_number || '',
          base_salary: data.contract?.base_salary || 0,
          contract_type: data.contract?.contract_type || 'indefinido',
          afp_code: data.payrollConfig?.afp_code || 'HABITAT',
          health_institution_code: data.payrollConfig?.health_institution_code || 'FONASA',
          legal_gratification_type: data.payrollConfig?.legal_gratification_type || 'none'
        });
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      alert('Error cargando datos del empleado');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/payroll/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Datos guardados exitosamente');
        onSave();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error guardando datos: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving employee data:', error);
      alert('Error guardando los datos');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            Editar Datos de {employee?.first_name} {employee?.last_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2">Cargando datos...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información Personal */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Información Personal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT
                  </label>
                  <input
                    type="text"
                    value={employee?.rut || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* Información Bancaria */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Información Bancaria</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco
                  </label>
                  <select
                    value={formData.bank_name}
                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Seleccionar banco...</option>
                    <option value="BANCO_CHILE">Banco de Chile</option>
                    <option value="BANCO_ESTADO">Banco Estado</option>
                    <option value="SANTANDER">Santander</option>
                    <option value="BCI">BCI</option>
                    <option value="SCOTIABANK">Scotiabank</option>
                    <option value="ITAU">Itaú</option>
                    <option value="SECURITY">Security</option>
                    <option value="FALABELLA">Falabella</option>
                    <option value="RIPLEY">Ripley</option>
                    <option value="CONSORCIO">Consorcio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Cuenta
                  </label>
                  <select
                    value={formData.bank_account_type}
                    onChange={(e) => setFormData({...formData, bank_account_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="cuenta_corriente">Cuenta Corriente</option>
                    <option value="cuenta_vista">Cuenta Vista</option>
                    <option value="cuenta_ahorro">Cuenta de Ahorro</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Cuenta
                  </label>
                  <input
                    type="text"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({...formData, bank_account_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Número de cuenta bancaria"
                  />
                </div>
              </div>
            </div>

            {/* Información Contractual */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Información Contractual</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Contrato
                  </label>
                  <select
                    value={formData.contract_type}
                    onChange={(e) => setFormData({...formData, contract_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="indefinido">Indefinido</option>
                    <option value="plazo_fijo">Plazo Fijo</option>
                    <option value="por_obra">Por Obra o Faena</option>
                    <option value="part_time">Part Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sueldo Base
                  </label>
                  <input
                    type="number"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({...formData, base_salary: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Sueldo base mensual"
                  />
                </div>
              </div>
            </div>

            {/* Información Previsional */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Información Previsional</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AFP
                  </label>
                  <select
                    value={formData.afp_code}
                    onChange={(e) => setFormData({...formData, afp_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="CAPITAL">Capital</option>
                    <option value="CUPRUM">Cuprum</option>
                    <option value="HABITAT">Habitat</option>
                    <option value="PLANVITAL">PlanVital</option>
                    <option value="PROVIDA">ProVida</option>
                    <option value="MODELO">Modelo</option>
                    <option value="UNO">Uno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salud
                  </label>
                  <select
                    value={formData.health_institution_code}
                    onChange={(e) => setFormData({...formData, health_institution_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="FONASA">Fonasa</option>
                    <option value="BANMEDICA">Banmédica</option>
                    <option value="CONSALUD">Consalud</option>
                    <option value="CRUZ_BLANCA">Cruz Blanca</option>
                    <option value="VIDA_TRES">Vida Tres</option>
                    <option value="COLMENA">Colmena</option>
                    <option value="MAS_VIDA">Más Vida</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gratificación Legal Art. 50
                  </label>
                  <select
                    value={formData.legal_gratification_type}
                    onChange={(e) => setFormData({...formData, legal_gratification_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="none">Sin gratificación Art. 50</option>
                    <option value="article_50">Con gratificación Art. 50 (25% con tope)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}