'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Calendar, TrendingUp, Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface F29Record {
  id: string;
  period: string;
  file_name: string;
  year: number;
  month: number;
  rut: string;
  ventas_netas: number;
  compras_netas: number;
  iva_determinado: number;
  confidence_score: number;
  validation_status: string;
  created_at: string;
}

interface F29HistoryProps {
  companyId?: string;
  userId?: string;
  onF29Select?: (f29Records: F29Record[]) => void;
  maxRecords?: number;
}

export default function F29History({ 
  companyId = '550e8400-e29b-41d4-a716-446655440001',
  userId,
  onF29Select,
  maxRecords = 24 
}: F29HistoryProps) {
  const [f29Records, setF29Records] = useState<F29Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [groupedRecords, setGroupedRecords] = useState<Record<string, F29Record[]>>({});

  // Formatters memoizados
  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(amount || 0);
    };
  }, []);

  const formatPeriod = useMemo(() => {
    const monthNames = [
      '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return (period: string) => {
      if (!period || period.length !== 6) return period;
      const year = period.substring(0, 4);
      const month = parseInt(period.substring(4, 6));
      return `${monthNames[month] || month} ${year}`;
    };
  }, []);

  // Fetch de F29 históricos
  const fetchF29Records = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        company_id: companyId,
        limit: maxRecords.toString()
      });
      
      if (userId) {
        params.append('user_id', userId);
      }

      const response = await fetch(`/api/f29/save?${params}`);
      const data = await response.json();

      if (data.success) {
        setF29Records(data.data || []);
        setGroupedRecords(data.grouped || {});
      } else {
        console.error('Error cargando F29:', data.error);
        setF29Records([]);
      }
      
    } catch (error) {
      console.error('Error fetching F29:', error);
      setF29Records([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, maxRecords]);

  useEffect(() => {
    fetchF29Records();
  }, [fetchF29Records]);

  // Toggle selección de F29
  const toggleSelection = useCallback((recordId: string) => {
    setSelectedRecords(prev => {
      const newSelection = prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId];
      
      // Notificar cambios al componente padre
      if (onF29Select) {
        const selectedF29s = f29Records.filter(record => newSelection.includes(record.id));
        onF29Select(selectedF29s);
      }
      
      return newSelection;
    });
  }, [f29Records, onF29Select]);

  // Seleccionar todos los F29 del año
  const selectAllYear = useCallback((year: string) => {
    const yearRecords = groupedRecords[year] || [];
    const yearIds = yearRecords.map(record => record.id);
    
    setSelectedRecords(prev => {
      const newSelection = [...new Set([...prev, ...yearIds])];
      
      if (onF29Select) {
        const selectedF29s = f29Records.filter(record => newSelection.includes(record.id));
        onF29Select(selectedF29s);
      }
      
      return newSelection;
    });
  }, [groupedRecords, f29Records, onF29Select]);

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedRecords([]);
    if (onF29Select) {
      onF29Select([]);
    }
  }, [onF29Select]);

  if (loading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-2 border-blue-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Cargando F29 históricos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (f29Records.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-gray-600" />
            <span>F29 Históricos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay F29 guardados</h3>
          <p className="text-gray-600 mb-4">
            Los F29 que proceses se guardarán automáticamente aquí para análisis futuros.
          </p>
          <Button variant="outline" onClick={fetchF29Records}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-2 border-green-100">
      <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-green-600" />
            <span>F29 Históricos</span>
            <span className="bg-white/60 px-2 py-1 rounded-full text-sm">
              {f29Records.length} formularios
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {selectedRecords.length > 0 && (
              <span className="text-sm text-green-600">
                {selectedRecords.length} seleccionados
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchF29Records}
              className="border-green-200 hover:bg-green-50"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Controles de selección */}
        {Object.keys(groupedRecords).length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Selección rápida:</span>
              {Object.keys(groupedRecords).sort().reverse().map(year => (
                <Button
                  key={year}
                  variant="outline"
                  size="sm"
                  onClick={() => selectAllYear(year)}
                  className="text-xs"
                >
                  Todo {year} ({groupedRecords[year].length})
                </Button>
              ))}
              {selectedRecords.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="text-xs border-red-200 text-red-600 hover:bg-red-50"
                >
                  Limpiar ({selectedRecords.length})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Lista agrupada por año */}
        <div className="space-y-6">
          {Object.keys(groupedRecords).sort().reverse().map(year => (
            <div key={year}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Año {year}</span>
                <span className="text-sm text-gray-500">({groupedRecords[year].length} F29)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {groupedRecords[year].map(record => (
                  <div
                    key={record.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedRecords.includes(record.id)
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                    onClick={() => toggleSelection(record.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {formatPeriod(record.period)}
                      </h4>
                      <div className="flex items-center space-x-1">
                        {record.validation_status === 'validated' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-xs text-gray-500">
                          {record.confidence_score}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ventas:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(record.ventas_netas)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Compras:</span>
                        <span className="font-medium">
                          {formatCurrency(record.compras_netas)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IVA Det.:</span>
                        <span className={`font-medium ${
                          record.iva_determinado >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(record.iva_determinado)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{record.file_name}</span>
                        <span>{new Date(record.created_at).toLocaleDateString('es-CL')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Botón de análisis */}
        {selectedRecords.length > 1 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">¿Analizar F29 seleccionados?</h4>
                <p className="text-sm text-gray-600">
                  {selectedRecords.length} formularios listos para análisis comparativo
                </p>
              </div>
              <Button className="bg-gradient-to-r from-blue-600 to-green-600">
                <TrendingUp className="w-4 h-4 mr-2" />
                Generar Análisis
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}