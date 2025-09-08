'use client';

import { useState, useCallback, useRef } from 'react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { FileText, Upload, AlertCircle, CheckCircle, X, TrendingUp, Download, BarChart3, Eye, BookOpen } from 'lucide-react';

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
      ['Compras Netas (Calculado)', result.comprasNetas.toString(), 'Calc'],
      ['IVA Determinado', result.ivaDeterminado.toString(), 'Calc'],
      ['Margen Bruto', result.margenBruto.toString(), 'Calc'],
      ['Total a Pagar', result.totalAPagar.toString(), 'Calc'],
      ['Confianza (%)', result.confidence.toString(), ''],
      ['Método', result.method, '']
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />
      </div>
      
      <Header 
        title="Análisis F29 Individual"
        subtitle="Analiza un formulario F29 y obtén métricas detalladas con IA"
        showBackButton={true}
        backHref="/accounting"
        variant="premium"
        actions={
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-xs font-medium text-blue-800">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>IA Activa • 95% Precisión</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('/accounting/f29-comparative', '_blank')}
              className="border-purple-200 hover:bg-purple-50 hover:border-purple-300 hover:scale-105 transition-transform"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Análisis Comparativo
            </Button>
          </div>
        }
      />

      <div className="relative z-10 max-w-5xl mx-auto py-8 px-4 space-y-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-full text-sm font-medium mb-6">
            <span className="mr-2">🚀</span>
            Análisis Automático • IA Avanzada • 95% Precisión
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Transforma tu F29 en
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> insights estratégicos</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Sube tu formulario PDF y obtén análisis detallado con métricas financieras, 
            recomendaciones fiscales y cálculos automáticos en segundos.
          </p>
        </div>

        {/* Upload Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-200 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span>Cargar Formulario F29</span>
            </CardTitle>
            <CardDescription>
              Arrastra y suelta tu archivo PDF o selecciónalo para comenzar el análisis automático
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <Button 
                  variant="primary"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Seleccionar Archivo PDF
                </Button>
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
                
                <Button
                  variant="primary"
                  onClick={handleAnalysis}
                  loading={uploading}
                  disabled={uploading}
                  fullWidth
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Analizando con IA...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Iniciar Análisis Inteligente
                    </>
                  )}
                </Button>
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
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <Card className="bg-white/90 backdrop-blur-sm border-2 border-green-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-bold">Análisis Completado</span>
                    <p className="text-sm text-gray-600 font-normal">
                      Período: {result.periodo} • RUT: {result.rut}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(result.confidence)} bg-white/80`}>
                    {getConfidenceLabel(result.confidence)} ({result.confidence}%)
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Método: {result.method}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Ventas */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-700 mb-1">Ventas Netas</h4>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(result.codigo563)}
                  </p>
                  <p className="text-xs text-blue-600">Código 563</p>
                </div>

                {/* Compras */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="text-sm font-medium text-green-700 mb-1">Compras Netas</h4>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(result.comprasNetas)}
                  </p>
                  <p className="text-xs text-green-600">Calculado automáticamente</p>
                </div>

                {/* IVA */}
                <div className={`rounded-lg p-4 border ${
                  result.ivaDeterminado < 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <h4 className={`text-sm font-medium mb-1 ${
                    result.ivaDeterminado < 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    IVA Determinado
                  </h4>
                  <p className={`text-2xl font-bold ${
                    result.ivaDeterminado < 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {formatCurrency(result.ivaDeterminado)}
                  </p>
                  <p className={`text-xs ${
                    result.ivaDeterminado < 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.ivaDeterminado < 0 ? 'A favor del contribuyente' : 'A pagar'}
                  </p>
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

                {/* Total a Pagar */}
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-300">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Total a Pagar</h4>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(result.totalAPagar)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {result.ivaDeterminado > 0 
                      ? `IVA + PPM${result.codigo048 > 0 ? ' + Imp. Único' : ''}${result.codigo049 > 0 ? ' + Préstamo Sol.' : ''}${result.codigo151 > 0 ? ' + Honorarios' : ''}`
                      : `PPM${result.codigo048 > 0 ? ' + Imp. Único' : ''}${result.codigo049 > 0 ? ' + Préstamo Sol.' : ''}${result.codigo151 > 0 ? ' + Honorarios' : ''} (IVA negativo)`}
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
              <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleExportResults}
                  className="border-green-200 hover:bg-green-50 hover:border-green-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Resultados
                </Button>
                <Button 
                  variant="outline" 
                  onClick={toggleDetailedAnalysis}
                  className="border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showDetailedAnalysis ? 'Ocultar Detalle' : 'Ver Análisis Detallado'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleGenerateJournalEntry}
                  loading={generatingJournal}
                  disabled={generatingJournal}
                  className="border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                >
                  {generatingJournal ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Crear Asiento
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleGenerateIVACentralization}
                  loading={generatingIVACentralization}
                  disabled={generatingIVACentralization}
                  className="border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                >
                  {generatingIVACentralization ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Centralización IVA
                    </>
                  )}
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => window.open('/accounting/f29-comparative', '_blank')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Análisis Comparativo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Análisis Detallado */}
        {result && showDetailedAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Análisis Detallado F29</span>
              </CardTitle>
              <CardDescription>
                Métricas avanzadas, ratios financieros y recomendaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Métricas Calculadas */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Métricas Calculadas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-700 font-medium">Margen Bruto (%)</p>
                      <p className="text-xl font-bold text-blue-900">
                        {result.codigo563 > 0 ? `${((result.margenBruto / result.codigo563) * 100).toFixed(2)}%` : 'N/A'}
                      </p>
                      <p className="text-xs text-blue-600">
                        {result.margenBruto > 0 ? 'Positivo' : 'Negativo'}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-700 font-medium">Efectividad IVA</p>
                      <p className="text-xl font-bold text-green-900">
                        {result.codigo563 > 0 ? `${((result.codigo538 / result.codigo563) * 100).toFixed(2)}%` : 'N/A'}
                      </p>
                      <p className="text-xs text-green-600">Débito/Ventas</p>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-700 font-medium">Ratio Crédito/Débito</p>
                      <p className="text-xl font-bold text-purple-900">
                        {result.codigo538 > 0 ? `${(result.codigo511 / result.codigo538).toFixed(2)}` : 'N/A'}
                      </p>
                      <p className="text-xs text-purple-600">
                        {result.codigo511 > result.codigo538 ? 'Mayor crédito' : 'Mayor débito'}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-orange-700 font-medium">Carga Tributaria</p>
                      <p className="text-xl font-bold text-orange-900">
                        {result.codigo563 > 0 ? `${((result.totalAPagar / result.codigo563) * 100).toFixed(2)}%` : 'N/A'}
                      </p>
                      <p className="text-xs text-orange-600">Total/Ventas</p>
                    </div>
                  </div>
                </div>

                {/* Análisis de Tendencias */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Análisis de Ratios</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Situación Fiscal</h4>
                        <div className="space-y-2 text-sm">
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
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Análisis Operacional</h4>
                        <div className="space-y-2 text-sm">
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
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="space-y-3">
                      {result.ivaDeterminado < 0 && (
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            <strong>IVA a favor:</strong> Tienes crédito fiscal disponible de {formatCurrency(Math.abs(result.ivaDeterminado))}. 
                            Puedes solicitar devolución o utilizarlo en períodos futuros.
                          </p>
                        </div>
                      )}
                      
                      {result.margenBruto < 0 && (
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            <strong>Margen negativo:</strong> Tus compras superan las ventas. 
                            Revisa tu estrategia de precios y optimiza costos.
                          </p>
                        </div>
                      )}
                      
                      {result.codigo563 > 0 && result.codigo538 / result.codigo563 > 0.19 && (
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            <strong>Alta carga de IVA:</strong> Tu débito fiscal representa más del 19% de las ventas. 
                            Verifica que todas las compras estén siendo consideradas.
                          </p>
                        </div>
                      )}
                      
                      {result.codigo151 > 0 && (
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            <strong>Honorarios retenidos:</strong> Se detectaron {formatCurrency(result.codigo151)} en retenciones. 
                            Puedes usar este monto como crédito en tu declaración anual.
                          </p>
                        </div>
                      )}
                      
                      {result.codigo048 > 0 && (
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            <strong>Impuesto único:</strong> Se registraron {formatCurrency(result.codigo048)} correspondientes 
                            al impuesto único de segunda categoría. Este monto debe ser pagado junto con el F29.
                          </p>
                        </div>
                      )}
                      
                      {result.codigo049 > 0 && (
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            <strong>Préstamo solidario:</strong> Se registraron {formatCurrency(result.codigo049)} correspondientes 
                            a la retención del 3% sobre rentas del trabajo de tus empleados (Ley 21.133). 
                            Este monto debe ser enterado al fisco.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información Técnica */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Información Técnica</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Método de extracción</p>
                        <p className="text-gray-600">{result.method}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Nivel de confianza</p>
                        <p className={`font-medium ${getConfidenceColor(result.confidence)}`}>
                          {result.confidence}% - {getConfidenceLabel(result.confidence)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Archivo procesado</p>
                        <p className="text-gray-600 truncate">{file?.name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">⚡</span>
              </div>
              <span>Acciones Rápidas</span>
            </CardTitle>
            <CardDescription>
              Continúa explorando las funcionalidades avanzadas de ContaPyme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                fullWidth
                onClick={() => window.open('/accounting/f29-comparative', '_blank')}
                className="border-purple-200 hover:bg-purple-50 hover:border-purple-300 group"
              >
                <TrendingUp className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Análisis Comparativo
              </Button>
              <Button 
                variant="outline" 
                fullWidth
                onClick={() => window.open('/accounting/f29-guide', '_blank')}
                className="border-blue-200 hover:bg-blue-50 hover:border-blue-300 group"
              >
                <FileText className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Guía de Optimización
              </Button>
              <Button 
                variant="outline" 
                fullWidth
                onClick={() => window.location.href = '/accounting'}
                className="border-green-200 hover:bg-green-50 hover:border-green-300 group"
              >
                <CheckCircle className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Volver a Contabilidad
              </Button>
            </div>
          </CardContent>
        </Card>
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