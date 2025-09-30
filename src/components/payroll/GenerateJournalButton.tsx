'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Eye,
  Calculator,
  Zap
} from 'lucide-react';

interface GenerateJournalButtonProps {
  period: string;
  companyId?: string;
  autoIntegrate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function GenerateJournalButton({
  period,
  companyId = '8033ee69-b420-4d91-ba0e-482f46cd6fce',
  autoIntegrate = false,
  onSuccess,
  onError,
  className = '',
  size = 'md',
  variant = 'primary'
}: GenerateJournalButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateJournal = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const [year, month] = period.split('-');
      
      console.log('🔄 Generando asiento contable para:', { 
        period, 
        year: parseInt(year), 
        month: parseInt(month),
        autoIntegrate 
      });

      const response = await fetch('/api/payroll/libro-remuneraciones/generate-journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period_year: parseInt(year),
          period_month: parseInt(month),
          company_id: companyId,
          auto_integrate: autoIntegrate
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar asiento contable');
      }

      console.log('✅ Asiento contable generado:', data);
      setResult(data);
      
      if (onSuccess) {
        onSuccess(data);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error generando asiento:', errorMessage);
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setGenerating(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300';
      case 'outline':
        return 'bg-white hover:bg-gray-50 text-blue-600 border border-blue-300';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  // Estado de éxito
  if (result && result.success) {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-green-600 text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          <span>Asiento Generado</span>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <div className="text-sm text-green-800">
            <strong>Asiento #{result.data.journal_entry.entry_number}</strong>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
            <div>
              <span className="font-medium">Empleados:</span> {result.data.summary.employee_count}
            </div>
            <div>
              <span className="font-medium">Líneas:</span> {result.data.summary.lines_created}
            </div>
            <div>
              <span className="font-medium">Debe:</span> ${result.data.cuadratura.debe?.toLocaleString('es-CL')}
            </div>
            <div>
              <span className="font-medium">Haber:</span> ${result.data.cuadratura.haber?.toLocaleString('es-CL')}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 text-xs">
            {result.data.cuadratura.cuadrado ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-green-600 font-medium">Asiento Cuadrado</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-red-600" />
                <span className="text-red-600">
                  Diferencia: ${Math.abs(result.data.cuadratura.diferencia).toLocaleString('es-CL')}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-green-200">
            <span className="text-xs text-green-600">
              Estado: {result.data.summary.status === 'approved' ? 'Integrado' : 'Pendiente'}
            </span>
            
            <Button
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1"
              onClick={() => {
                window.open(`/accounting/journal/${result.data.journal_entry.id}`, '_blank');
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver Asiento
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-red-600 text-sm font-medium">
          <AlertCircle className="h-4 w-4" />
          <span>Error al Generar</span>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
          
          <div className="flex justify-end pt-2 border-t border-red-200 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1"
              onClick={() => {
                setError(null);
                setResult(null);
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Botón principal
  return (
    <Button
      onClick={handleGenerateJournal}
      disabled={generating}
      className={`${getSizeClasses()} ${getVariantClasses()} ${className} transition-all duration-200`}
    >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {autoIntegrate ? 'Generando e Integrando...' : 'Generando Asiento...'}
        </>
      ) : (
        <>
          {autoIntegrate ? (
            <Zap className="h-4 w-4 mr-2" />
          ) : (
            <Calculator className="h-4 w-4 mr-2" />
          )}
          {autoIntegrate ? 'Generar e Integrar' : 'Generar Asiento'}
        </>
      )}
    </Button>
  );
}