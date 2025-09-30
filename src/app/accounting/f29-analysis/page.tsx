'use client';

import { useState, useCallback, useRef } from 'react';
import { MinimalHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { FileText, Upload, AlertCircle, CheckCircle, X, TrendingUp, Download, BarChart3, Eye, BookOpen, Zap, DollarSign, Database, Clock, BadgeCheck, ArrowRight } from 'lucide-react';

interface UploadResult {
  file_name: string;
  success: boolean;
  period?: string;
  confidence_score?: number;
  error?: string;
  data?: any;
}

interface F29Results {
  rut: string;
  periodo: string;
  codigo048: number; // Impuesto Único
  codigo049: number; // Préstamo Solidario
  codigo538: number; // Débito Fiscal
  codigo537: number; // Total Créditos Bruto
  codigo562: number; // Compras Netas Adicionales
  codigo062: number; // PPM
  codigo077: number; // Remanente
  codigo563: number; // Ventas Netas
  codigo151: number; // Honorarios Retenidos
  codigo556: number; // IVA Anticipado
  totalCreditos: number; // Total Créditos Neto (537-077)
  comprasNetas: number;
  ivaDeterminado: number;
  totalAPagar: number;
  margenBruto: number;
  confidence: number;
  method: string;
}

export default function F29AnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<F29Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [generatingJournal, setGeneratingJournal] = useState(false);
  const [journalResult, setJournalResult] = useState<any>(null);
  const [generatingIVACentralization, setGeneratingIVACentralization] = useState(false);
  const [ivaCentralizationResult, setIVACentralizationResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
      setResult(null); // Limpiar resultados anteriores
      setShowDetailedAnalysis(false); // Cerrar análisis detallado
    } else {
      setError('Por favor, selecciona un archivo PDF válido');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setResult(null); // Limpiar resultados anteriores
      setShowDetailedAnalysis(false); // Cerrar análisis detallado
    } else {
      setError('Por favor, selecciona un archivo PDF válido');
    }
    // Limpiar el valor del input para permitir reseleccionar el mismo archivo
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setShowDetailedAnalysis(false);
    // Limpiar el input de archivo para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalysis = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('🚀 Iniciando análisis de F29:', file.name);

      const response = await fetch('/api/parse-f29', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('📊 Respuesta de API:', data);

      if (data.success && data.data) {
        setResult(data.data);
        console.log('✅ Datos extraídos:', data.data);
      } else {
        setError(data.error || 'Error al procesar el archivo');
        console.error('❌ Error en análisis:', data.error);
      }
    } catch (err) {
      console.error('Error en análisis F29:', err);
      setError('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 90) return 'Alta Confianza';
    if (confidence >= 70) return 'Confianza Media';
    return 'Baja Confianza';
  };

  // Función para exportar resultados a CSV
  const handleExportResults = () => {
    if (!result) return;

    const csvData = [
      ['Campo', 'Valor', 'Código'],
      ['RUT', result.rut, ''],
      ['Período', result.periodo, ''],
      ['Ventas Netas', result.codigo563.toString(), '563'],
      ['Débito Fiscal', result.codigo538.toString(), '538'],
      ['Total Créditos', result.codigo537.toString(), '537'],
      ['PPM', result.codigo062.toString(), '062'],
      ['Remanente', result.codigo077.toString(), '077'],
      ...(result.codigo048 > 0 ? [['Impuesto Único', result.codigo048.toString(), '048']] : []),
      ...(result.codigo049 > 0 ? [['Préstamo Solidario', result.codigo049.toString(), '049']] : []),
      ...(result.codigo562 > 0 ? [['Compras Netas Adicionales', result.codigo562.toString(), '562']] : []),
      ...(result.codigo151 > 0 ? [['Honorarios Retenidos', result.codigo151.toString(), '151']] : []),
      ...(result.codigo556 > 0 ? [['IVA Anticipado', result.codigo556.toString(), '556']] : []),
      ['Compras Netas (Calculado)', result.comprasNetas.toString(), 'Calc'],
      ['IVA Determinado', result.ivaDeterminado.toString(), 'Calc'],
      ['Margen Bruto', result.margenBruto.toString(), 'Calc'],
      ['Total a Pagar', result.totalAPagar.toString(), 'Calc'],
      ['Confianza (%)', result.confidence.toString(), ''],
      ['Método', result.method, '']
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    // Agregar BOM para UTF-8 para evitar caracteres extraños
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `F29_${result.periodo}_${result.rut.replace(/\./g, '').replace('-', '')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Función para mostrar/ocultar análisis detallado
  const toggleDetailedAnalysis = () => {
    setShowDetailedAnalysis(!showDetailedAnalysis);
  };

  // Función para generar CSV del asiento contable
  const generateJournalCSV = (journalData: any) => {
    const headers = ['Cuenta', 'Nombre Cuenta', 'Descripción', 'Debe', 'Haber'];
    const rows = journalData.lines.map((line: any) => [
      line.account_code,
      line.account_name,
      line.description,
      line.debit_amount || 0,
      line.credit_amount || 0
    ]);
    
    // Agregar fila de totales
    rows.push([
      'TOTAL',
      '',
      '',
      journalData.totals.debit_total,
      journalData.totals.credit_total
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  };

  // Función para generar asiento contable F29
  const handleGenerateJournalEntry = async () => {
    if (!result) return;

    setGeneratingJournal(true);
    setJournalResult(null);

    try {
      console.log('📊 Generando asiento contable F29...', result);

      const response = await fetch('/api/accounting/f29-journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', // TODO: obtener dinámicamente
          f29_data: result,
          preview: false
        }),
      });

      const data = await response.json();
      console.log('📋 Respuesta asiento F29:', data);

      if (data.success) {
        setJournalResult(data.data);
        console.log('✅ Asiento F29 generado exitosamente:', data.data);
      } else {
        console.error('❌ Error generando asiento:', data.error);
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error generando asiento F29:', err);
      alert('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setGeneratingJournal(false);
    }
  };

  // Función para generar asiento de centralización IVA
  const handleGenerateIVACentralization = async () => {
    if (!result) return;

    setGeneratingIVACentralization(true);
    setIVACentralizationResult(null);

    try {
      console.log('🏛️ Generando asiento de centralización IVA...', result);

      const response = await fetch('/api/accounting/iva-centralization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', // TODO: obtener dinámicamente
          f29_data: result,
          periodo: result.periodo,
          preview: false
        }),
      });

      const data = await response.json();
      console.log('📋 Respuesta centralización IVA:', data);

      if (data.success) {
        setIVACentralizationResult(data.data);
        console.log('✅ Centralización IVA generada exitosamente:', data.data);
      } else {
        console.error('❌ Error generando centralización IVA:', data.error);
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error generando centralización IVA:', err);
      alert('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setGeneratingIVACentralization(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <MinimalHeader variant="premium" />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium mb-4">
                <Zap className="w-4 h-4 mr-2" />
                <span>IA Avanzada • 95% Precisión • Análisis Instantáneo</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                Análisis F29 Individual
              </h1>
              <p className="text-blue-100 text-lg mb-6">
                Extrae datos automáticamente de tu formulario PDF y obtén insights detallados con IA
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Claude Vision Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Métricas Financieras</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Asientos Contables</span>
                </div>
              </div>
            </div>

            {/* Actions en hero */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto lg:w-auto">
              <button
                onClick={() => window.open('/accounting/f29-comparative', '_blank')}
                className="w-full group relative px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-white font-medium"
              >
                <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Análisis Comparativo</span>
              </button>
              <button
                onClick={() => window.location.href = '/accounting'}
                className="w-full group relative px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-white font-medium"
              >
                <Database className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Volver a Contabilidad</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto py-8 px-4 space-y-8">
        {/* Status Info */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">
                Sistema de análisis F29 con Claude Vision activado
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                95% Precisión
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Análisis en tiempo real</span>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/80 transition-all duration-200">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6" />
              <span className="text-xl font-bold">Cargar Formulario F29</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                PDF • Claude Vision
              </span>
            </div>
            <p className="text-blue-100 mt-2">
              Arrastra y suelta tu archivo PDF para análisis automático con IA
            </p>
          </div>
          <div className="p-6">
            {!file ? (
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50 scale-[1.02]' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mx-auto mb-6 flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  Arrastra tu F29 aquí
                </h4>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  o haz clic para seleccionar archivo. Análisis automático con IA en segundos.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-3 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] mx-auto"
                >
                  <div className="flex items-center justify-center">
                    <FileText className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                  </div>
                  <span>Seleccionar Archivo PDF</span>
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-400 rounded-full flex items-center justify-center">
                    <Upload className="w-2.5 h-2.5 text-purple-900" />
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Solo archivos PDF</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Máximo 10MB</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>95% Precisión</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Listo para análisis
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="hover:bg-red-100 hover:text-red-600"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <button
                  onClick={handleAnalysis}
                  disabled={uploading}
                  className="w-full group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:hover:scale-100"
                >
                  {uploading ? (
                    <>
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <span className="ml-2">Analizando con Claude Vision...</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                      </div>
                      <span>Iniciar Análisis Inteligente</span>
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Zap className="w-2.5 h-2.5 text-yellow-900" />
                      </div>
                    </>
                  )}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900">Error en el análisis</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/80 transition-all duration-200">
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6" />
                  <div>
                    <span className="text-xl font-bold">Análisis Completado</span>
                    <p className="text-green-100 text-sm mt-1">
                      Período: {result.periodo} • RUT: {result.rut}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                    {getConfidenceLabel(result.confidence)} ({result.confidence}%)
                  </span>
                  <p className="text-green-100 text-xs mt-1">Método: {result.method}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Ventas */}
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/20 hover:bg-white/80 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">Ventas Netas</h4>
                      <div className="flex items-center space-x-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <DollarSign className="w-3 h-3 mr-1" />
                          Código 563
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatCurrency(result.codigo563)}
                  </div>
                  <div className="text-xs text-gray-500">Base imponible IVA</div>
                </div>

                {/* Compras */}
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/20 hover:bg-white/80 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">Compras Netas</h4>
                      <div className="flex items-center space-x-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          Calculado
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatCurrency(result.comprasNetas)}
                  </div>
                  <div className="text-xs text-gray-500">Estimación automática</div>
                </div>

                {/* IVA */}
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/20 hover:bg-white/80 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">IVA Determinado</h4>
                      <div className="flex items-center space-x-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          result.ivaDeterminado < 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {result.ivaDeterminado < 0 ? 'A favor' : 'A pagar'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatCurrency(result.ivaDeterminado)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.ivaDeterminado < 0 ? 'Crédito disponible' : 'Obligación fiscal'}
                  </div>
                </div>

                {/* Débito Fiscal */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="text-sm font-medium text-purple-700 mb-1">Débito Fiscal</h4>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(result.codigo538)}
                  </p>
                  <p className="text-xs text-purple-600">Código 538</p>
                </div>

                {/* Total Créditos */}
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <h4 className="text-sm font-medium text-orange-700 mb-1">Total Créditos</h4>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(result.codigo537)}
                  </p>
                  <p className="text-xs text-orange-600">Código 537</p>
                </div>

                {/* PPM */}
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <h4 className="text-sm font-medium text-indigo-700 mb-1">PPM</h4>
                  <p className="text-2xl font-bold text-indigo-900">
                    {formatCurrency(result.codigo062)}
                  </p>
                  <p className="text-xs text-indigo-600">Código 062</p>
                </div>

                {/* Remanente */}
                <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                  <h4 className="text-sm font-medium text-teal-700 mb-1">Remanente Crédito</h4>
                  <p className="text-2xl font-bold text-teal-900">
                    {formatCurrency(result.codigo077)}
                  </p>
                  <p className="text-xs text-teal-600">Código 077</p>
                </div>

                {/* Impuesto Único - Solo mostrar si existe */}
                {result.codigo048 > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="text-sm font-medium text-yellow-700 mb-1">Impuesto Único</h4>
                    <p className="text-2xl font-bold text-yellow-900">
                      {formatCurrency(result.codigo048)}
                    </p>
                    <p className="text-xs text-yellow-600">Código 048</p>
                  </div>
                )}

                {/* Préstamo Solidario - Solo mostrar si existe */}
                {result.codigo049 > 0 && (
                  <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                    <h4 className="text-sm font-medium text-cyan-700 mb-1">Préstamo Solidario</h4>
                    <p className="text-2xl font-bold text-cyan-900">
                      {formatCurrency(result.codigo049)}
                    </p>
                    <p className="text-xs text-cyan-600">Código 049 • Ret. 3% Rta 42 N°1</p>
                  </div>
                )}

                {/* Compras Netas Adicionales - Solo mostrar si existe */}
                {result.codigo562 > 0 && (
                  <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
                    <h4 className="text-sm font-medium text-rose-700 mb-1">Compras Netas Adicionales</h4>
                    <p className="text-2xl font-bold text-rose-900">
                      {formatCurrency(result.codigo562)}
                    </p>
                    <p className="text-xs text-rose-600">Código 562</p>
                  </div>
                )}

                {/* Honorarios Retenidos - Solo mostrar si existe */}
                {result.codigo151 > 0 && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h4 className="text-sm font-medium text-amber-700 mb-1">Honorarios Retenidos</h4>
                    <p className="text-2xl font-bold text-amber-900">
                      {formatCurrency(result.codigo151)}
                    </p>
                    <p className="text-xs text-amber-600">Código 151</p>
                  </div>
                )}

                {/* IVA Anticipado - Solo mostrar si existe */}
                {result.codigo556 > 0 && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h4 className="text-sm font-medium text-purple-700 mb-1">IVA Anticipado</h4>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(result.codigo556)}
                    </p>
                    <p className="text-xs text-purple-600">Código 556</p>
                  </div>
                )}

                {/* Total a Pagar */}
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-300">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Total a Pagar</h4>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(result.totalAPagar)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {result.ivaDeterminado > 0
                      ? `IVA + PPM${result.codigo048 > 0 ? ' + Imp. Único' : ''}${result.codigo049 > 0 ? ' + Préstamo Sol.' : ''}${result.codigo151 > 0 ? ' + Honorarios' : ''}${result.codigo556 > 0 ? ' - IVA Anticipado' : ''}`
                      : `PPM${result.codigo048 > 0 ? ' + Imp. Único' : ''}${result.codigo049 > 0 ? ' + Préstamo Sol.' : ''}${result.codigo151 > 0 ? ' + Honorarios' : ''}${result.codigo556 > 0 ? ' - IVA Anticipado' : ''} (IVA negativo)`}
                  </p>
                </div>
              </div>

              {/* Sección de Margen Bruto */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Análisis de Margen</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Ventas Netas</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(result.codigo563)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">(-) Compras Netas</p>
                    <p className="text-xl font-bold text-red-900">{formatCurrency(result.comprasNetas)}</p>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">(=) Margen Bruto</p>
                    <p className="text-xl font-bold text-green-900">{formatCurrency(result.margenBruto)}</p>
                    <p className="text-xs text-gray-500">
                      {result.codigo563 > 0 ? `${((result.margenBruto / result.codigo563) * 100).toFixed(1)}% de las ventas` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-4">
                <button
                  onClick={handleExportResults}
                  className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center gap-3 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-center">
                    <Download className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  </div>
                  <span>Exportar Resultados</span>
                </button>
                <button
                  onClick={toggleDetailedAnalysis}
                  className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center justify-center gap-3 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-center">
                    <Eye className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  </div>
                  <span>{showDetailedAnalysis ? 'Ocultar Detalle' : 'Ver Análisis Detallado'}</span>
                </button>
                <button
                  onClick={handleGenerateJournalEntry}
                  disabled={generatingJournal}
                  className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:hover:scale-100"
                >
                  {generatingJournal ? (
                    <>
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center">
                        <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                      </div>
                      <span>Crear Asiento</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleGenerateIVACentralization}
                  disabled={generatingIVACentralization}
                  className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:hover:scale-100"
                >
                  {generatingIVACentralization ? (
                    <>
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                      </div>
                      <span>Centralización IVA</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.open('/accounting/f29-comparative', '_blank')}
                  className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 flex items-center justify-center gap-3 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  </div>
                  <span>Análisis Comparativo</span>
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-900">✨</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Análisis Detallado */}
        {result && showDetailedAnalysis && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/80 transition-all duration-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Análisis Detallado F29</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Métricas avanzadas, ratios financieros y recomendaciones
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                    Análisis Completo
                  </span>
                  <p className="text-blue-100 text-xs mt-1">IA + Algoritmos</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Métricas Calculadas */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Métricas Calculadas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-sm">%</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${result.margenBruto > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {result.margenBruto > 0 ? 'Positivo' : 'Negativo'}
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 font-medium mb-1">Margen Bruto</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {result.codigo563 > 0 && result.margenBruto > 0 ? `${((result.margenBruto / result.codigo563) * 100).toFixed(2)}%` : '0.00%'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {result.codigo563 > 0 && result.margenBruto > 0
                          ? `Utilidad bruta: ${formatCurrency(result.margenBruto)}`
                          : 'Sin margen positivo en el período'
                        }
                      </p>
                    </div>

                    <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-sm">🏛️</span>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          IVA
                        </span>
                      </div>
                      <p className="text-sm text-green-700 font-medium mb-1">Efectividad IVA</p>
                      <p className="text-2xl font-bold text-green-900">
                        {result.codigo563 > 0 ? `${((result.codigo538 / result.codigo563) * 100).toFixed(2)}%` : '0.00%'}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {result.codigo563 > 0
                          ? `Tasa efectiva vs. 19% teórico`
                          : 'Sin base imponible registrada'
                        }
                      </p>
                    </div>

                    <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-sm">⚖️</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${result.codigo537 > result.codigo538 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {result.codigo537 > result.codigo538 ? 'Mayor crédito' : 'Mayor débito'}
                        </span>
                      </div>
                      <p className="text-sm text-purple-700 font-medium mb-1">Ratio Crédito/Débito</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {result.codigo538 > 0 && result.codigo537 > 0 ? `${(result.codigo537 / result.codigo538).toFixed(3)}` : '0.000'}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        {result.codigo538 > 0 && result.codigo537 > 0
                          ? `Créditos representan ${((result.codigo537 / result.codigo538) * 100).toFixed(1)}% de débitos`
                          : 'Sin créditos fiscales disponibles'
                        }
                      </p>
                    </div>

                    <div className="group bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-sm">💰</span>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          Impuestos
                        </span>
                      </div>
                      <p className="text-sm text-orange-700 font-medium mb-1">Carga Tributaria</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {result.codigo563 > 0 && result.totalAPagar > 0 ? `${((result.totalAPagar / result.codigo563) * 100).toFixed(2)}%` : '0.00%'}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        {result.codigo563 > 0 && result.totalAPagar > 0
                          ? `Total impuestos: ${formatCurrency(result.totalAPagar)}`
                          : 'Sin carga tributaria en el período'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Análisis de Tendencias */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Análisis de Ratios</h3>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-sm">🏛️</span>
                          </div>
                          <h4 className="font-semibold text-gray-900">Situación Fiscal</h4>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span>Estado IVA:</span>
                            <span className={`font-medium ${result.ivaDeterminado < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {result.ivaDeterminado < 0 ? 'A favor' : 'A pagar'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>PPM mensual:</span>
                            <span className="font-medium">{formatCurrency(result.codigo062)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Remanente disponible:</span>
                            <span className="font-medium">{formatCurrency(result.codigo077)}</span>
                          </div>
                          {result.codigo151 > 0 && (
                            <div className="flex justify-between">
                              <span>Honorarios retenidos:</span>
                              <span className="font-medium">{formatCurrency(result.codigo151)}</span>
                            </div>
                          )}
                          {result.codigo556 > 0 && (
                            <div className="flex justify-between">
                              <span>IVA anticipado:</span>
                              <span className="font-medium text-purple-600">{formatCurrency(result.codigo556)}</span>
                            </div>
                          )}
                          {result.codigo048 > 0 && (
                            <div className="flex justify-between">
                              <span>Impuesto único:</span>
                              <span className="font-medium">{formatCurrency(result.codigo048)}</span>
                            </div>
                          )}
                          {result.codigo049 > 0 && (
                            <div className="flex justify-between">
                              <span>Préstamo solidario:</span>
                              <span className="font-medium">{formatCurrency(result.codigo049)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-sm">📊</span>
                          </div>
                          <h4 className="font-semibold text-gray-900">Análisis Operacional</h4>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span>Ventas del período:</span>
                            <span className="font-medium">{formatCurrency(result.codigo563)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Compras estimadas:</span>
                            <span className="font-medium">{formatCurrency(result.comprasNetas)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Resultado bruto:</span>
                            <span className={`font-medium ${result.margenBruto > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(result.margenBruto)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recomendaciones */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Recomendaciones</h3>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <div className="space-y-4">
                      {result.ivaDeterminado < 0 && (
                        <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-green-700">IVA a favor:</span> Tienes crédito fiscal disponible de {formatCurrency(Math.abs(result.ivaDeterminado))}.
                                Puedes solicitar devolución o utilizarlo en períodos futuros.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {result.margenBruto < 0 && (
                        <div className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-yellow-700">Margen negativo:</span> Tus compras superan las ventas.
                                Revisa tu estrategia de precios y optimiza costos.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {result.codigo563 > 0 && result.codigo538 / result.codigo563 > 0.19 && (
                        <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-blue-700">Alta carga de IVA:</span> Tu débito fiscal representa más del 19% de las ventas.
                                Verifica que todas las compras estén siendo consideradas.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {result.codigo151 > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-green-700">Honorarios retenidos:</span> Se detectaron {formatCurrency(result.codigo151)} en retenciones.
                                Puedes usar este monto como crédito en tu declaración anual.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {result.codigo556 > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-purple-700">IVA anticipado:</span> Se aplicó un crédito de {formatCurrency(result.codigo556)} por pago anticipado de IVA.
                                Este monto se resta automáticamente del total a pagar.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {result.codigo048 > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-yellow-700">Impuesto único:</span> Se registraron {formatCurrency(result.codigo048)} correspondientes
                                al impuesto único de segunda categoría. Este monto debe ser pagado junto con el F29.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {result.codigo049 > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-purple-700">Préstamo solidario:</span> Se registraron {formatCurrency(result.codigo049)} correspondientes
                                a la retención del 3% sobre rentas del trabajo de tus empleados (Ley 21.133).
                                Este monto debe ser enterado al fisco.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información Técnica */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Información Técnica</h3>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">🔍</span>
                          </div>
                          <p className="font-semibold text-gray-700">Método de extracción</p>
                        </div>
                        <p className="text-gray-600 text-sm">{result.method}</p>
                      </div>

                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">📊</span>
                          </div>
                          <p className="font-semibold text-gray-700">Nivel de confianza</p>
                        </div>
                        <p className={`font-medium text-sm ${getConfidenceColor(result.confidence)}`}>
                          {result.confidence}% - {getConfidenceLabel(result.confidence)}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">📄</span>
                          </div>
                          <p className="font-semibold text-gray-700">Archivo procesado</p>
                        </div>
                        <p className="text-gray-600 text-sm truncate">{file?.name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Asiento Contable Generado */}
        {journalResult && (
          <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-bold">Asiento Contable Generado</span>
                    <p className="text-sm text-gray-600 font-normal">
                      {journalResult.description} • Asiento #{journalResult.entry_number}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    ✅ Balanceado
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Total: {formatCurrency(journalResult.totals.debit_total)}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-6 border border-orange-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Líneas del Asiento</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-700">Cuenta</th>
                        <th className="text-left p-3 font-medium text-gray-700">Descripción</th>
                        <th className="text-right p-3 font-medium text-gray-700">Debe</th>
                        <th className="text-right p-3 font-medium text-gray-700">Haber</th>
                      </tr>
                    </thead>
                    <tbody>
                      {journalResult.lines.map((line: any, index: number) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">{line.account_code}</p>
                              <p className="text-xs text-gray-600">{line.account_name}</p>
                            </div>
                          </td>
                          <td className="p-3 text-gray-700">{line.description}</td>
                          <td className="p-3 text-right font-medium text-gray-900">
                            {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                          </td>
                          <td className="p-3 text-right font-medium text-gray-900">
                            {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td className="p-3" colSpan={2}>TOTALES</td>
                        <td className="p-3 text-right text-gray-900">
                          {formatCurrency(journalResult.totals.debit_total)}
                        </td>
                        <td className="p-3 text-right text-gray-900">
                          {formatCurrency(journalResult.totals.credit_total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Resumen del asiento */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-700 mb-2">💰 Entrada de Efectivo</h5>
                    <p className="text-lg font-bold text-blue-900">
                      {formatCurrency(journalResult.f29_data.codigo563 + journalResult.f29_data.codigo538)}
                    </p>
                    <p className="text-xs text-blue-600">Ventas + IVA</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-green-700 mb-2">📊 Ventas Netas</h5>
                    <p className="text-lg font-bold text-green-900">
                      {formatCurrency(journalResult.f29_data.codigo563)}
                    </p>
                    <p className="text-xs text-green-600">Base imponible</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-red-700 mb-2">🏛️ IVA Débito</h5>
                    <p className="text-lg font-bold text-red-900">
                      {formatCurrency(journalResult.f29_data.codigo538)}
                    </p>
                    <p className="text-xs text-red-600">A enterar al SII</p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="mt-6 flex justify-center space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('/accounting/journal-book', '_blank')}
                    className="border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Ver en Libro Diario
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      const csvContent = generateJournalCSV(journalResult);
                      // Agregar BOM para UTF-8 para evitar caracteres extraños
                      const bom = '\uFEFF';
                      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `asiento_f29_${journalResult.f29_data.periodo}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Asiento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Centralización IVA Generada */}
        {ivaCentralizationResult && (
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-bold">Centralización IVA Generada</span>
                    <p className="text-sm text-gray-600 font-normal">
                      {ivaCentralizationResult.description} • Período: {ivaCentralizationResult.period}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    ✅ Balanceado
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Total: {formatCurrency(ivaCentralizationResult.totals.debit_total)}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-6 border border-purple-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">🏛️ Líneas del Asiento de Centralización IVA</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-700">Cuenta</th>
                        <th className="text-left p-3 font-medium text-gray-700">Descripción</th>
                        <th className="text-right p-3 font-medium text-gray-700">Debe</th>
                        <th className="text-right p-3 font-medium text-gray-700">Haber</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ivaCentralizationResult.lines.map((line: any, index: number) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">{line.account_code}</p>
                              <p className="text-xs text-gray-600">{line.account_name}</p>
                            </div>
                          </td>
                          <td className="p-3 text-gray-700">{line.description}</td>
                          <td className="p-3 text-right font-medium text-gray-900">
                            {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                          </td>
                          <td className="p-3 text-right font-medium text-gray-900">
                            {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td className="p-3" colSpan={2}>TOTALES</td>
                        <td className="p-3 text-right text-gray-900">
                          {formatCurrency(ivaCentralizationResult.totals.debit_total)}
                        </td>
                        <td className="p-3 text-right text-gray-900">
                          {formatCurrency(ivaCentralizationResult.totals.credit_total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Resumen de la centralización */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-purple-700 mb-2">🏛️ IVA Débito Fiscal</h5>
                    <p className="text-lg font-bold text-purple-900">
                      {formatCurrency(ivaCentralizationResult.iva_calculation.iva_debito)}
                    </p>
                    <p className="text-xs text-purple-600">A saldar</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-indigo-700 mb-2">💰 IVA Crédito Fiscal</h5>
                    <p className="text-lg font-bold text-indigo-900">
                      {formatCurrency(ivaCentralizationResult.iva_calculation.iva_credito)}
                    </p>
                    <p className="text-xs text-indigo-600">A saldar</p>
                  </div>
                  <div className={`rounded-lg p-4 ${
                    ivaCentralizationResult.iva_calculation.tipo_resultado === 'por_pagar' 
                      ? 'bg-red-50 border border-red-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <h5 className={`text-sm font-medium mb-2 ${
                      ivaCentralizationResult.iva_calculation.tipo_resultado === 'por_pagar' 
                        ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {ivaCentralizationResult.iva_calculation.tipo_resultado === 'por_pagar' 
                        ? '💸 Impuesto por Pagar' : '💚 Remanente Crédito'}
                    </h5>
                    <p className={`text-lg font-bold ${
                      ivaCentralizationResult.iva_calculation.tipo_resultado === 'por_pagar' 
                        ? 'text-red-900' : 'text-green-900'
                    }`}>
                      {formatCurrency(Math.abs(ivaCentralizationResult.iva_calculation.diferencia_iva))}
                    </p>
                    <p className={`text-xs ${
                      ivaCentralizationResult.iva_calculation.tipo_resultado === 'por_pagar' 
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      Diferencia neta
                    </p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="mt-6 flex justify-center space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('/accounting/journal-book', '_blank')}
                    className="border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Ver en Libro Diario
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      const csvContent = generateJournalCSV(ivaCentralizationResult);
                      // Agregar BOM para UTF-8 para evitar caracteres extraños
                      const bom = '\uFEFF';
                      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `centralizacion_iva_${ivaCentralizationResult.period}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Centralización
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xl font-bold">Acciones Rápidas</span>
            </div>
            <p className="text-green-100">
              Explora otras funcionalidades relacionadas con análisis financiero
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => window.open('/accounting/f29-comparative', '_blank')}
                className="group relative px-4 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <TrendingUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Análisis Comparativo
              </button>
              <button
                onClick={() => window.open('/accounting/indicators', '_blank')}
                className="group relative px-4 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Indicadores Económicos
              </button>
              <button
                onClick={() => window.location.href = '/accounting'}
                className="group relative px-4 py-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-medium"
              >
                <Database className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Volver a Contabilidad
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}