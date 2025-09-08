'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Upload, FileText, Zap, Loader2, CheckCircle, AlertTriangle, X, Sparkles, Save } from 'lucide-react';
import { SavedJobDescriptionsSelector } from './SavedJobDescriptionsSelector';
import { useCompanyId } from '@/contexts/CompanyContext';

interface JobDescriptionData {
  position?: string;
  department?: string;
  job_functions?: string[];
  obligations?: string[];
  prohibitions?: string[];
  requirements?: string[];
  raw_response?: string;
}

interface JobDescriptionAssistantProps {
  onDataExtracted: (data: JobDescriptionData) => void;
  currentPosition?: string;
  currentDepartment?: string;
}

export function JobDescriptionAssistant({ 
  onDataExtracted, 
  currentPosition = '',
  currentDepartment = '' 
}: JobDescriptionAssistantProps) {
  const companyId = useCompanyId();
  const [activeTab, setActiveTab] = useState<'upload' | 'ai' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRefinedResult, setShowRefinedResult] = useState(false);
  const [showSavedSelector, setShowSavedSelector] = useState(false);

  // Estados para asistente IA
  const [aiForm, setAiForm] = useState({
    position: currentPosition,
    department: currentDepartment,
    company_type: '',
    additional_context: ''
  });

  // Estados para upload PDF
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Estados para entrada manual
  const [manualForm, setManualForm] = useState({
    position: currentPosition,
    department: currentDepartment,
    functions: [''],
    obligations: [''],
    prohibitions: ['']
  });

  // Sincronizar manualForm con props cuando cambien
  useEffect(() => {
    setManualForm(prev => ({
      ...prev,
      position: currentPosition,
      department: currentDepartment
    }));
  }, [currentPosition, currentDepartment]);

  // Manejar generación IA
  const handleAIGeneration = async () => {
    if (!currentPosition.trim()) {
      setError('El cargo es requerido para generar el descriptor. Completa el campo "Cargo" en el formulario principal.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Usar valores del formulario principal
      const requestData = {
        position: currentPosition,
        department: currentDepartment,
        company_type: aiForm.company_type,
        additional_context: aiForm.additional_context
      };

      const response = await fetch('/api/payroll/job-description/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar descriptor');
      }

      setResult(data);
      onDataExtracted(data.data);

    } catch (err) {
      console.error('Error generating job description:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Manejar upload PDF
  const handlePDFUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/payroll/job-description/parse', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al analizar PDF');
      }

      setResult(data);
      onDataExtracted(data.data);
      setUploadedFile(file);

    } catch (err) {
      console.error('Error parsing PDF:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Manejar drag & drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        handlePDFUpload(file);
      } else {
        setError('Solo se permiten archivos PDF');
      }
    }
  };

  // Refinador IA universal
  const handleRefineWithAI = async () => {
    let dataToRefine: any = {};

    // Determinar qué datos refinar según el contexto
    if (result && result.data) {
      // Si hay resultados previos (PDF o IA), usar esos
      dataToRefine = {
        position: result.data.position || aiForm.position || manualForm.position,
        department: result.data.department || aiForm.department || manualForm.department,
        raw_functions: result.data.job_functions || [],
        raw_obligations: result.data.obligations || [],
        raw_prohibitions: result.data.prohibitions || []
      };
    } else {
      // Si no hay resultados previos, usar datos manuales
      const nonEmptyFunctions = manualForm.functions.filter(f => f.trim());
      const nonEmptyObligations = manualForm.obligations.filter(o => o.trim());
      const nonEmptyProhibitions = manualForm.prohibitions.filter(p => p.trim());

      // Si no hay datos en el formulario manual, pero hay un cargo, generar desde cero
      if (!nonEmptyFunctions.length && !nonEmptyObligations.length && !nonEmptyProhibitions.length) {
        if (manualForm.position || aiForm.position) {
          // Si hay cargo pero no funciones, generar desde cero
          return handleAIGeneration();
        } else {
          setError('Ingrese al menos un cargo o agregue funciones para poder refinar');
          return;
        }
      }

      dataToRefine = {
        position: manualForm.position || aiForm.position,
        department: manualForm.department || aiForm.department,
        raw_functions: nonEmptyFunctions,
        raw_obligations: nonEmptyObligations,
        raw_prohibitions: nonEmptyProhibitions,
        company_type: aiForm.company_type,
        additional_context: aiForm.additional_context
      };
    }

    setRefining(true);
    setError(null);

    try {
      const response = await fetch('/api/payroll/job-description/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToRefine)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al refinar descriptor');
      }

      // Actualizar resultado con datos refinados
      setResult({
        ...data,
        message: 'Descriptor refinado con IA según normativa chilena'
      });
      setShowRefinedResult(true);
      
      // Enviar datos refinados al componente padre
      onDataExtracted({
        position: data.data.position,
        department: data.data.department,
        job_functions: data.data.refined_functions,
        obligations: data.data.refined_obligations,
        prohibitions: data.data.refined_prohibitions
      });

    } catch (err) {
      console.error('Error refining job description:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setRefining(false);
    }
  };

  // Manejar cambios en formulario manual
  const handleManualChange = (field: string, index: number, value: string) => {
    setManualForm(prev => ({
      ...prev,
      [field]: field === 'position' || field === 'department' 
        ? value 
        : prev[field as keyof typeof prev].map((item: string, i: number) => i === index ? value : item)
    }));
  };

  // Agregar nueva línea en formulario manual
  const addManualLine = (field: 'functions' | 'obligations' | 'prohibitions') => {
    setManualForm(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  // Eliminar línea en formulario manual
  const removeManualLine = (field: 'functions' | 'obligations' | 'prohibitions', index: number) => {
    setManualForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Manejar selección de descriptor guardado
  const handleSavedDescriptorSelect = (descriptor: any) => {
    const data = {
      position: descriptor.job_position,
      department: descriptor.department,
      job_functions: descriptor.job_functions,
      obligations: descriptor.obligations,
      prohibitions: descriptor.prohibitions
    };

    setResult({
      success: true,
      data,
      message: 'Descriptor cargado desde base de datos',
      confidence: null
    });

    onDataExtracted(data);
    setShowSavedSelector(false);
  };

  // Limpiar resultados
  const clearResults = () => {
    setResult(null);
    setError(null);
    setUploadedFile(null);
    setShowRefinedResult(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-purple-600" />
              Asistente de Descriptor de Cargo
            </CardTitle>
            <p className="text-sm text-gray-600">
              Genere automáticamente las funciones del cargo usando IA o extraiga información de un PDF
            </p>
          </div>
          {companyId && (
            <Button
              onClick={() => setShowSavedSelector(true)}
              variant="outline"
              className="flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Save className="h-4 w-4" />
              Usar Guardado
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'manual'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Manual
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="h-4 w-4 inline mr-2" />
            Asistente IA
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Subir PDF
          </button>
        </div>

        {/* Contenido del tab activo */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            {/* Información editable del cargo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-900">Información del Cargo</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Cargo *
                  </label>
                  <input
                    type="text"
                    value={manualForm.position}
                    onChange={(e) => setManualForm(prev => ({
                      ...prev,
                      position: e.target.value
                    }))}
                    placeholder="Ej: Cajero, Vendedor"
                    className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={manualForm.department}
                    onChange={(e) => setManualForm(prev => ({
                      ...prev,
                      department: e.target.value
                    }))}
                    placeholder="Ej: Caja, Ventas"
                    className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                💡 Estos campos se sincronizan automáticamente con el formulario principal
              </p>
            </div>

            {/* Funciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Funciones del Cargo
              </label>
              {manualForm.functions.map((func, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={func}
                    onChange={(e) => handleManualChange('functions', index, e.target.value)}
                    placeholder="ej: Atender clientes de manera cordial"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {manualForm.functions.length > 1 && (
                    <Button
                      onClick={() => removeManualLine('functions', index)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={() => addManualLine('functions')}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                + Agregar función
              </Button>
            </div>

            {/* Obligaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Obligaciones (opcional)
              </label>
              {manualForm.obligations.map((obl, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={obl}
                    onChange={(e) => handleManualChange('obligations', index, e.target.value)}
                    placeholder="ej: Cumplir horarios de trabajo establecidos"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {manualForm.obligations.length > 1 && (
                    <Button
                      onClick={() => removeManualLine('obligations', index)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={() => addManualLine('obligations')}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                + Agregar obligación
              </Button>
            </div>

            {/* Prohibiciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prohibiciones (opcional)
              </label>
              {manualForm.prohibitions.map((proh, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={proh}
                    onChange={(e) => handleManualChange('prohibitions', index, e.target.value)}
                    placeholder="ej: No usar teléfono personal durante horario laboral"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {manualForm.prohibitions.length > 1 && (
                    <Button
                      onClick={() => removeManualLine('prohibitions', index)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={() => addManualLine('prohibitions')}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                + Agregar prohibición
              </Button>
            </div>

            {/* Botón para usar datos manuales */}
            <Button
              type="button"
              onClick={() => {
                const data = {
                  position: manualForm.position,
                  department: manualForm.department,
                  job_functions: manualForm.functions.filter(f => f.trim()),
                  obligations: manualForm.obligations.filter(o => o.trim()),
                  prohibitions: manualForm.prohibitions.filter(p => p.trim())
                };
                
                setResult({
                  success: true,
                  data,
                  message: 'Datos manuales aplicados correctamente',
                  confidence: null
                });
                
                onDataExtracted(data);
              }}
              variant="primary"
              className="w-full"
              disabled={!manualForm.position.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              Aplicar Información Manual
            </Button>
            
            {!manualForm.position.trim() && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Completa el campo "Cargo" arriba para aplicar la información
              </p>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            {/* Información de contexto usando valores del formulario principal */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h4 className="text-sm font-medium text-purple-900">Información del Cargo para IA</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-purple-700 font-medium">Cargo:</span> 
                  <span className="ml-2 text-purple-800">{currentPosition || 'No especificado'}</span>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Departamento:</span> 
                  <span className="ml-2 text-purple-800">{currentDepartment || 'No especificado'}</span>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                🤖 La IA usará esta información del formulario principal para generar el descriptor
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de empresa
              </label>
              <select
                value={aiForm.company_type}
                onChange={(e) => setAiForm(prev => ({ ...prev, company_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Seleccionar tipo de empresa</option>
                <option value="Retail/Comercio">Retail/Comercio</option>
                <option value="Servicios">Servicios</option>
                <option value="Manufactura">Manufactura</option>
                <option value="Construcción">Construcción</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Salud">Salud</option>
                <option value="Educación">Educación</option>
                <option value="Transporte">Transporte</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contexto adicional
              </label>
              <textarea
                value={aiForm.additional_context}
                onChange={(e) => setAiForm(prev => ({ ...prev, additional_context: e.target.value }))}
                placeholder="Describa características específicas del cargo, herramientas a usar, objetivos especiales, etc."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <Button
              type="button"
              onClick={handleAIGeneration}
              disabled={loading || !currentPosition.trim()}
              variant="primary"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando descriptor...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generar con IA
                </>
              )}
            </Button>
            
            {!currentPosition.trim() && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Completa el campo "Cargo" arriba para generar el descriptor
              </p>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-purple-400 bg-purple-50' 
                  : 'border-gray-300 hover:border-purple-400'
              }`}
            >
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Arrastra tu descriptor de cargo aquí
              </p>
              <p className="text-sm text-gray-500 mb-4">
                O haz clic para seleccionar un archivo PDF
              </p>
              <input
                type="file"
                id="pdf-upload"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePDFUpload(file);
                }}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('pdf-upload')?.click()}
                variant="outline"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar PDF
                  </>
                )}
              </Button>
            </div>

            {uploadedFile && (
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-sm text-gray-700 flex-1">{uploadedFile.name}</span>
                <Button
                  onClick={() => setUploadedFile(null)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Mostrar errores */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Mostrar resultados con previsualización detallada */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* Header del resultado */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {result.message}
                    </p>
                    {result.confidence && (
                      <p className="text-xs text-green-600">
                        Confianza: {result.confidence}%
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={clearResults}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-sm text-green-700">
                <p>✅ Funciones extraídas: {result.data.job_functions?.length || result.data.refined_functions?.length || 0}</p>
                <p>✅ Obligaciones extraídas: {result.data.obligations?.length || result.data.refined_obligations?.length || 0}</p>
                <p>✅ Prohibiciones extraídas: {result.data.prohibitions?.length || result.data.refined_prohibitions?.length || 0}</p>
                {result.data.improvements_made && result.data.improvements_made.length > 0 && (
                  <p>🎯 Mejoras aplicadas: {result.data.improvements_made.length}</p>
                )}
                {result.data.compliance_notes && result.data.compliance_notes.length > 0 && (
                  <p>⚖️ Validaciones legales: {result.data.compliance_notes.length}</p>
                )}
              </div>

              {/* Botón refinador IA universal */}
              {!showRefinedResult ? (
                <div className="mt-4 pt-3 border-t border-green-200">
                  <Button
                    type="button"
                    onClick={handleRefineWithAI}
                    disabled={refining}
                    variant="primary"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {refining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Refinando con IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        ✨ Refinar con IA (Normativa Chilena)
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-green-600 text-center mt-2">
                    Mejora automáticamente las funciones según normativa laboral chilena
                  </p>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-green-200">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200 mb-3">
                    <div className="flex items-center">
                      <Sparkles className="h-4 w-4 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-purple-800">
                        Descriptor refinado con IA según normativa chilena
                      </span>
                    </div>
                    <div className="text-xs text-purple-600">
                      ✨ Listo para usar
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setShowRefinedResult(false)}
                    variant="outline"
                    size="sm"
                    className="w-full text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    🔄 Refinar nuevamente
                  </Button>
                </div>
              )}
            </div>

            {/* Previsualización detallada */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Previsualización del Descriptor de Cargo
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Este contenido se incorporará automáticamente al contrato PDF
                </p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Información básica */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Información del Cargo</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p><strong>Cargo:</strong> {result.data.position || 'No especificado'}</p>
                    <p><strong>Departamento:</strong> {result.data.department || 'No especificado'}</p>
                  </div>
                </div>

                {/* Funciones principales */}
                {(result.data.job_functions?.length > 0 || result.data.refined_functions?.length > 0) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-bold">
                          {result.data.refined_functions?.length || result.data.job_functions?.length}
                        </span>
                      </div>
                      Funciones Principales
                    </h4>
                    <div className="space-y-2">
                      {(result.data.refined_functions || result.data.job_functions || []).map((func: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-sm text-gray-800 flex-1">{func}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Obligaciones */}
                {(result.data.obligations?.length > 0 || result.data.refined_obligations?.length > 0) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-bold">
                          {result.data.refined_obligations?.length || result.data.obligations?.length}
                        </span>
                      </div>
                      Obligaciones Laborales
                    </h4>
                    <div className="space-y-2">
                      {(result.data.refined_obligations || result.data.obligations || []).map((obl: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                            ✓
                          </div>
                          <p className="text-sm text-gray-800 flex-1">{obl}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prohibiciones */}
                {(result.data.prohibitions?.length > 0 || result.data.refined_prohibitions?.length > 0) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-sm font-bold">
                          {result.data.refined_prohibitions?.length || result.data.prohibitions?.length}
                        </span>
                      </div>
                      Prohibiciones
                    </h4>
                    <div className="space-y-2">
                      {(result.data.refined_prohibitions || result.data.prohibitions || []).map((proh: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                          <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                            ✕
                          </div>
                          <p className="text-sm text-gray-800 flex-1">{proh}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas de cumplimiento legal */}
                {result.data.compliance_notes && result.data.compliance_notes.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                      ⚖️ Cumplimiento Legal
                    </h4>
                    <ul className="space-y-1">
                      {result.data.compliance_notes.map((note: string, index: number) => (
                        <li key={index} className="text-sm text-yellow-700">• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Nota sobre incorporación al contrato */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-indigo-900 mb-1">
                        Incorporación Automática al Contrato
                      </h4>
                      <p className="text-sm text-indigo-700">
                        Estos datos se incorporarán automáticamente en la sección "SEGUNDO" del contrato PDF, 
                        detallando las funciones específicas del cargo, y en la sección "SEXTO" con las 
                        obligaciones y prohibiciones según la normativa laboral chilena.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botón refinador para entrada manual (cuando no hay resultados) */}
        {!result && activeTab === 'manual' && (
          <div className="mt-6">
            <Button
              type="button"
              onClick={handleRefineWithAI}
              disabled={refining}
              variant="primary"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {refining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refinando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  ✨ Refinar con IA (Normativa Chilena)
                </>
              )}
            </Button>
            <p className="text-xs text-gray-600 text-center mt-2">
              Mejora automáticamente las funciones según normativa laboral chilena
            </p>
          </div>
        )}

        {/* Modal de selector de descriptores guardados */}
        {showSavedSelector && companyId && (
          <SavedJobDescriptionsSelector
            companyId={companyId}
            onSelect={handleSavedDescriptorSelect}
            onClose={() => setShowSavedSelector(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}