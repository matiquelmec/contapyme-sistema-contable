'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { useChileanCurrency, useContractTypeInfo } from '../../hooks/useCalculadora';
import { LiquidationResult } from '../../services/calculadorService';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  User,
  Calendar,
  Briefcase,
  Heart,
  Shield,
  PiggyBank,
  Receipt,
  Settings,
  Database
} from 'lucide-react';

interface LivePayrollPreviewProps {
  result: LiquidationResult | null;
  isCalculating: boolean;
  errors: string[];
  warnings: string[];
  isValid: boolean;
  employeeName?: string;
  configurationStatus?: 'loading' | 'default' | 'custom'; // ✅ NUEVO
}

export function LivePayrollPreview({
  result,
  isCalculating,
  errors,
  warnings,
  isValid,
  employeeName,
  configurationStatus = 'default' // ✅ NUEVO
}: LivePayrollPreviewProps) {
  const formatCurrency = useChileanCurrency();
  const getContractInfo = useContractTypeInfo();

  if (!isValid && errors.length > 0) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            Errores de Validación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                {error}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isCalculating) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-blue-700 font-medium">Calculando liquidación...</p>
            <p className="text-blue-600 text-sm">Aplicando normativa chilena 2025</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-3" />
            <p className="font-medium">Previsualización de Liquidación</p>
            <p className="text-sm">Complete los datos para ver el cálculo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const contractInfo = getContractInfo(result.employee.contract_type);

  return (
    <div className="space-y-4">
      {/* Header con información del empleado */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {employeeName || `${result.employee.first_name} ${result.employee.last_name}`}
                </h3>
                <p className="text-sm text-gray-600">{result.employee.rut}</p>
              </div>
            </div>
            <div className="text-right">
              {/* ✅ NUEVO: Indicador de configuración */}
              <div className="flex items-center gap-2 mb-2">
                {configurationStatus === 'loading' && (
                  <div className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 rounded-full">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Cargando config...</span>
                  </div>
                )}
                {configurationStatus === 'custom' && (
                  <div className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    <Settings className="w-3 h-3" />
                    <span>Config. personalizada</span>
                  </div>
                )}
                {configurationStatus === 'default' && (
                  <div className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                    <Database className="w-3 h-3" />
                    <span>Config. por defecto</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {new Date(result.period.year, result.period.month - 1).toLocaleDateString('es-CL', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-500" />
                <span className={`text-sm font-medium ${contractInfo.color}`}>
                  {contractInfo.name}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              Advertencias
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index} className="text-xs text-yellow-600">
                  {warning}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Haberes */}
      <Card className="border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <TrendingUp className="w-5 h-5" />
            Haberes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Haberes imponibles */}
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2 text-sm">Imponibles</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Sueldo Base</span>
                <span className="font-medium">{formatCurrency(result.base_salary)}</span>
              </div>
              {result.overtime_amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Horas Extras</span>
                  <span className="font-medium">{formatCurrency(result.overtime_amount)}</span>
                </div>
              )}
              {result.bonuses > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bonos</span>
                  <span className="font-medium">{formatCurrency(result.bonuses)}</span>
                </div>
              )}
              {result.commissions > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Comisiones</span>
                  <span className="font-medium">{formatCurrency(result.commissions)}</span>
                </div>
              )}
              {result.gratification > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Gratificación</span>
                  <span className="font-medium">{formatCurrency(result.gratification)}</span>
                </div>
              )}
              {result.legal_gratification_art50 > 0 && (
                <div className="bg-purple-50 -mx-1 px-1 py-1 rounded">
                  <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Incluye Gratificación Art. 50: {formatCurrency(result.legal_gratification_art50)}</span>
                  </div>
                  <div className="text-xs text-purple-600">
                    ✓ Ya incluida en subtotal imponible (25% base imponible)
                  </div>
                </div>
              )}
            </div>
            <div className="border-t mt-2 pt-2 flex justify-between items-center font-medium">
              <span className="text-sm">Subtotal Imponible</span>
              <span>{formatCurrency(result.total_taxable_income)}</span>
            </div>
          </div>

          {/* Haberes no imponibles */}
          {(result.family_allowance > 0 || result.food_allowance > 0 || result.transport_allowance > 0 || result.cash_allowance > 0) && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2 text-sm">No Imponibles</h4>
              <div className="space-y-2">
                {result.family_allowance > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Asignación Familiar</span>
                    <span className="font-medium">{formatCurrency(result.family_allowance)}</span>
                  </div>
                )}
                {result.food_allowance > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Colación</span>
                    <span className="font-medium">{formatCurrency(result.food_allowance)}</span>
                  </div>
                )}
                {result.transport_allowance > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Movilización</span>
                    <span className="font-medium">{formatCurrency(result.transport_allowance)}</span>
                  </div>
                )}
                {result.cash_allowance > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Asignación de Caja</span>
                    <span className="font-medium">{formatCurrency(result.cash_allowance)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-green-100 p-3 rounded-lg">
            <div className="flex justify-between items-center font-bold text-green-800">
              <span>Total Haberes</span>
              <span className="text-lg">{formatCurrency(result.total_gross_income)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Descuentos */}
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <TrendingDown className="w-5 h-5" />
            Descuentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Descuentos previsionales */}
          <div className="bg-red-50 p-3 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2 text-sm">Previsionales</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-3 h-3" />
                  <span className="text-sm">AFP (10%)</span>
                </div>
                <span className="font-medium">{formatCurrency(result.afp_amount)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-3 h-3" />
                  <span className="text-sm">Comisión AFP ({result.afp_commission_percentage}%)</span>
                </div>
                <span className="font-medium">{formatCurrency(result.afp_commission_amount)}</span>
              </div>


              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Heart className="w-3 h-3" />
                  <span className="text-sm">Salud (7%)</span>
                </div>
                <span className="font-medium">{formatCurrency(result.health_amount)}</span>
              </div>

              {result.unemployment_amount > 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    <span className="text-sm">Cesantía ({result.unemployment_percentage}%)</span>
                  </div>
                  <span className="font-medium">{formatCurrency(result.unemployment_amount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Impuestos */}
          {result.income_tax_amount > 0 && (
            <div className="bg-orange-50 p-3 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2 text-sm">Impuestos</h4>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Receipt className="w-3 h-3" />
                  <span className="text-sm">Impuesto 2ª Categoría</span>
                </div>
                <span className="font-medium">{formatCurrency(result.income_tax_amount)}</span>
              </div>
            </div>
          )}

          {/* Otros descuentos */}
          {result.total_other_deductions > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2 text-sm">Otros Descuentos</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Otros</span>
                <span className="font-medium">{formatCurrency(result.total_other_deductions)}</span>
              </div>
            </div>
          )}

          <div className="bg-red-100 p-3 rounded-lg">
            <div className="flex justify-between items-center font-bold text-red-800">
              <span>Total Descuentos</span>
              <span className="text-lg">{formatCurrency(result.total_deductions)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Costos Patronales (Informativos) */}
      {result.employer_costs && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Briefcase className="w-5 h-5" />
              Costos Patronales (Informativos)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2 text-sm">Costos del Empleador</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    <span className="text-sm">SIS (1.88%)</span>
                  </div>
                  <span className="font-medium">{formatCurrency(result.employer_costs.sis_amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    <span className="text-sm">Cesantía Empleador</span>
                  </div>
                  <span className="font-medium">{formatCurrency(result.employer_costs.unemployment_employer)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Heart className="w-3 h-3" />
                    <span className="text-sm">Mutual de Seguridad</span>
                  </div>
                  <span className="font-medium">{formatCurrency(result.employer_costs.mutual_insurance)}</span>
                </div>
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between items-center font-medium">
                <span className="text-sm text-blue-800">Total Costos Patronales</span>
                <span className="text-blue-800">{formatCurrency(result.employer_costs.total)}</span>
              </div>
            </div>
            <div className="text-xs text-blue-600 italic">
              ℹ️ Estos costos son del empleador, no se descuentan del trabajador
            </div>
          </CardContent>
        </Card>
      )}

      {/* Líquido a pagar */}
      <Card className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-medium opacity-90">Líquido a Pagar</h3>
                <p className="text-3xl font-bold">{formatCurrency(result.net_salary)}</p>
              </div>
            </div>
            <div className="text-right">
              <CheckCircle className="w-8 h-8 text-green-200 mb-1" />
              <p className="text-xs opacity-75">Cálculo Verificado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Días trabajados:</span>
              <span className="font-medium ml-2">{result.period.days_worked}</span>
            </div>
            <div>
              <span className="text-gray-600">Período:</span>
              <span className="font-medium ml-2">
                {result.period.month.toString().padStart(2, '0')}/{result.period.year}
              </span>
            </div>
            {result.tope_imponible_exceeded && (
              <div className="col-span-2">
                <span className="text-amber-600 text-xs">⚠️ Tope imponible excedido</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}