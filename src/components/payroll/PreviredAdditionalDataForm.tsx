'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface PreviredConcept {
  concept_code: string;
  concept_name: string;
  concept_description: string;
  is_taxable: boolean;
  calculation_type: string;
  percentage_rate: number;
  fixed_amount: number;
}

interface PreviredAdditionalData {
  start_work_date?: string;
  end_work_date?: string;
  incorporation_workplace_amount?: number;
  sick_leave_days?: number;
  sick_leave_start_date?: string;
  sick_leave_end_date?: string;
  sick_leave_amount?: number;
  vacation_days?: number;
  vacation_amount?: number;
  partial_period_reason?: string;
  previred_notes?: string;
  movement_code?: string;
  worker_type_code?: string;
  has_special_regime?: boolean;
}

interface Props {
  companyId: string;
  employeeId?: string;
  daysWorked?: number;
  baseSalary?: number;
  data?: PreviredAdditionalData;
  onChange: (data: PreviredAdditionalData) => void;
  onApplyConcepts?: (concepts: any[]) => void;
}

export default function PreviredAdditionalDataForm({ 
  companyId, 
  employeeId,
  daysWorked = 30, 
  baseSalary = 0,
  data = {}, 
  onChange,
  onApplyConcepts 
}: Props) {
  const [formData, setFormData] = useState<PreviredAdditionalData>(data);
  const [concepts, setConcepts] = useState<PreviredConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Cargar conceptos Previred disponibles
  useEffect(() => {
    if (companyId) {
      loadPreviredConcepts();
    }
  }, [companyId]);

  const loadPreviredConcepts = async () => {
    try {
      const response = await fetch(`/api/payroll/previred-concepts?company_id=${companyId}`);
      const result = await response.json();
      
      if (result.success) {
        setConcepts(result.data || []);
      }
    } catch (error) {
      console.error('Error cargando conceptos Previred:', error);
    }
  };

  const handleInputChange = (field: keyof PreviredAdditionalData, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange(newData);
  };

  const calculateProportionalAmount = (baseAmount: number, days: number) => {
    if (daysWorked >= 30) return baseAmount;
    return Math.round((baseAmount * days) / 30);
  };

  const applyConcept = async (conceptCode: string) => {
    const concept = concepts.find(c => c.concept_code === conceptCode);
    if (!concept) return;

    let calculatedAmount = 0;
    
    switch (concept.calculation_type) {
      case 'fixed':
        calculatedAmount = concept.fixed_amount;
        break;
      case 'percentage':
        calculatedAmount = Math.round(baseSalary * (concept.percentage_rate / 100));
        break;
      case 'days':
        calculatedAmount = calculateProportionalAmount(
          concept.fixed_amount || Math.round(baseSalary / 30), 
          daysWorked
        );
        break;
    }

    // Aplicar según el tipo de concepto
    switch (conceptCode) {
      case 'INCORP_WORKPLACE':
        handleInputChange('incorporation_workplace_amount', calculatedAmount);
        break;
      case 'SICK_LEAVE_SUBSIDY':
        handleInputChange('sick_leave_amount', calculatedAmount);
        break;
      case 'VACATION_BONUS':
        handleInputChange('vacation_amount', calculatedAmount);
        break;
    }

    // Notificar al componente padre si hay callback
    if (onApplyConcepts) {
      onApplyConcepts([{
        concept_code: conceptCode,
        concept_name: concept.concept_name,
        amount: calculatedAmount,
        is_taxable: concept.is_taxable
      }]);
    }
  };

  // Tabla N°7: Movimiento de Personal (Previred oficial)
  const getMovementOptions = () => [
    { value: '0', label: '0 - Sin Movimiento en el Mes' },
    { value: '1', label: '1 - Contratación a plazo indefinido' },
    { value: '2', label: '2 - Retiro' },
    { value: '3', label: '3 - Subsidios' },
    { value: '4', label: '4 - Permiso Sin Goce de Sueldos' },
    { value: '5', label: '5 - Incorporación en el Lugar de Trabajo' },
    { value: '6', label: '6 - Accidentes del Trabajo' },
    { value: '7', label: '7 - Contratación a plazo fijo' },
    { value: '8', label: '8 - Cambio Contrato plazo fijo a plazo indefinido' },
    { value: '11', label: '11 - Otros Movimientos (Ausentismos)' },
    { value: '12', label: '12 - Reliquidación, Premio, Bono' },
    { value: '13', label: '13 - Suspensión Contrato acto de autoridad (Ley N°21.227)' },
    { value: '14', label: '14 - Suspensión Contrato por pacto (Ley N°21.227)' },
    { value: '15', label: '15 - Reducción de Jornada (Ley N°21.227)' }
  ];

  const getWorkerTypeOptions = () => [
    { value: '0', label: 'Trabajador activo normal' },
    { value: '1', label: 'Trabajador con régimen especial' },
    { value: '2', label: 'Trabajador temporal' },
    { value: '3', label: 'Trabajador por obra' }
  ];

  // Solo mostrar si hay 29 días o menos trabajados
  if (daysWorked >= 30) {
    return null; // No mostrar componente para períodos completos
  }

  if (!isExpanded) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              <div>
                <p className="font-medium text-orange-900">
                  📋 Movimiento de Personal Previred
                </p>
                <p className="text-sm text-orange-700">
                  <strong>Período parcial detectado ({daysWorked} días)</strong> - Requerido para Previred
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Configurar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            📋 Movimiento de Personal - Tabla N°7 Previred
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-white hover:bg-white/20"
          >
            ✕
          </Button>
        </div>
        <p className="text-orange-100 text-sm">
          <strong>Período parcial: {daysWorked} días trabajados</strong> - Información requerida para reporte Previred oficial
        </p>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* PRINCIPAL: Código Movimiento de Personal (Tabla N°7) */}
        <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
          <div className="mb-4">
            <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
              📋 Código Movimiento de Personal (REQUERIDO)
            </h3>
            <p className="text-red-700 text-sm">
              Selecciona el motivo por el cual el trabajador tiene <strong>{daysWorked} días</strong> en lugar de 30 días completos
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Tabla N°7: Movimiento de Personal
            </label>
            <select
              value={formData.movement_code || '0'}
              onChange={(e) => handleInputChange('movement_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            >
              {getMovementOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600">
              Este código se incluirá automáticamente en el reporte Previred (Campo 15: Código Movimiento Personal)
            </p>
          </div>
        </div>

        {/* Información del Período - Fechas */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-3">📅 Fechas del Período</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fecha Inicio Trabajo en Período
              </label>
              <input
                type="date"
                value={formData.start_work_date || ''}
                onChange={(e) => handleInputChange('start_work_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fecha Fin Trabajo en Período
              </label>
              <input
                type="date"
                value={formData.end_work_date || ''}
                onChange={(e) => handleInputChange('end_work_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Incorporación en Lugar de Trabajo */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-3">💼 Incorporación en Lugar de Trabajo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Monto Incorporación
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.incorporation_workplace_amount || ''}
                  onChange={(e) => handleInputChange('incorporation_workplace_amount', parseInt(e.target.value) || 0)}
                  placeholder="Monto en pesos"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyConcept('INCORP_WORKPLACE')}
                  className="shrink-0"
                >
                  Calcular
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Licencia Médica */}
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-medium text-red-900 mb-3">🏥 Licencia Médica</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Días de Licencia
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={formData.sick_leave_days || ''}
                onChange={(e) => handleInputChange('sick_leave_days', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fecha Inicio Licencia
              </label>
              <input
                type="date"
                value={formData.sick_leave_start_date || ''}
                onChange={(e) => handleInputChange('sick_leave_start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fecha Fin Licencia
              </label>
              <input
                type="date"
                value={formData.sick_leave_end_date || ''}
                onChange={(e) => handleInputChange('sick_leave_end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Monto Subsidio Licencia
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.sick_leave_amount || ''}
                  onChange={(e) => handleInputChange('sick_leave_amount', parseInt(e.target.value) || 0)}
                  placeholder="Monto subsidio en pesos"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyConcept('SICK_LEAVE_SUBSIDY')}
                  className="shrink-0"
                >
                  Calcular
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Vacaciones */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium text-green-900 mb-3">🏖️ Vacaciones Proporcionales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Días de Vacaciones
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={formData.vacation_days || ''}
                onChange={(e) => handleInputChange('vacation_days', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Monto Vacaciones
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.vacation_amount || ''}
                  onChange={(e) => handleInputChange('vacation_amount', parseInt(e.target.value) || 0)}
                  placeholder="Monto en pesos"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyConcept('VACATION_BONUS')}
                  className="shrink-0"
                >
                  Calcular
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Configuración Adicional */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-medium text-purple-900 mb-3">⚙️ Configuración Adicional</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tipo de Trabajador
              </label>
              <select
                value={formData.worker_type_code || '0'}
                onChange={(e) => handleInputChange('worker_type_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {getWorkerTypeOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_special_regime || false}
                  onChange={(e) => handleInputChange('has_special_regime', e.target.checked)}
                  className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  Trabajador con régimen especial
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Razón y Notas */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Razón del Período Parcial
            </label>
            <input
              type="text"
              value={formData.partial_period_reason || ''}
              onChange={(e) => handleInputChange('partial_period_reason', e.target.value)}
              placeholder="Ej: Ingreso el día 15, Licencia médica, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Notas Adicionales para Previred
            </label>
            <textarea
              value={formData.previred_notes || ''}
              onChange={(e) => handleInputChange('previred_notes', e.target.value)}
              placeholder="Observaciones especiales para el reporte Previred..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
            />
          </div>
        </div>

        {/* Información contextual */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">ℹ️ Información del Período</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Días Trabajados:</p>
              <p className="font-medium">{daysWorked} de 30</p>
            </div>
            <div>
              <p className="text-gray-600">Sueldo Base:</p>
              <p className="font-medium">${baseSalary?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Días Proporcional:</p>
              <p className="font-medium">{Math.round((baseSalary / 30) * daysWorked).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">% Período:</p>
              <p className="font-medium">{Math.round((daysWorked / 30) * 100)}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}