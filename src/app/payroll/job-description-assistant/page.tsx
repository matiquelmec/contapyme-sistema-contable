'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PayrollHeader } from '@/components/layout';
import { JobDescriptionAssistant } from '@/components/payroll/JobDescriptionAssistant';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { ArrowLeft, Save, FileText, Sparkles, CheckCircle2, Trash2, Eye, Clock, TrendingUp } from 'lucide-react';
import { useCompanyId } from '@/contexts/CompanyContext';

interface ExtractedData {
  position?: string;
  department?: string;
  job_functions?: string[];
  obligations?: string[];
  prohibitions?: string[];
}

export default function JobDescriptionAssistantPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [savedDescriptions, setSavedDescriptions] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Manejar datos extraídos del asistente
  const handleDataExtracted = (data: ExtractedData) => {
    setExtractedData(data);
    setIsComplete(true);
  };

  // Navegar a crear empleado con datos pre-llenados
  const goToCreateEmployee = () => {
    // Guardar datos en sessionStorage para pre-llenar formulario
    if (extractedData) {
      sessionStorage.setItem('job_description_data', JSON.stringify(extractedData));
    }
    router.push('/payroll/employees/new?tab=contract&prefilled=true');
  };

  // Navegar a crear contrato directo
  const goToCreateContract = () => {
    if (extractedData) {
      sessionStorage.setItem('job_description_data', JSON.stringify(extractedData));
      sessionStorage.setItem('job_description_source', 'assistant');
    }
    router.push('/payroll/contracts/new?prefilled=true&source=job-assistant');
  };

  // Cargar descriptores guardados
  useEffect(() => {
    if (companyId) {
      loadSavedDescriptions();
    }
  }, [companyId]);

  const loadSavedDescriptions = async () => {
    try {
      setLoadingSaved(true);
      const response = await fetch(`/api/payroll/job-descriptions?company_id=${companyId}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setSavedDescriptions(data.data || []);
      }
    } catch (error) {
      console.error('Error loading saved descriptions:', error);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Guardar descriptor en base de datos
  const saveToDatabase = async () => {
    if (!extractedData || !companyId) return;

    try {
      setSaving(true);
      const title = `${extractedData.position || 'Cargo'} - ${new Date().toLocaleDateString('es-CL')}`;
      
      const response = await fetch('/api/payroll/job-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          title,
          position: extractedData.position || '',
          department: extractedData.department || '',
          job_functions: extractedData.job_functions || [],
          obligations: extractedData.obligations || [],
          prohibitions: extractedData.prohibitions || [],
          source_type: 'ai_assistant'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Descriptor guardado exitosamente en la base de datos');
        loadSavedDescriptions(); // Recargar lista
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      alert('Error al guardar el descriptor');
    } finally {
      setSaving(false);
    }
  };

  // Usar un descriptor guardado
  const useDescriptor = async (descriptor: any) => {
    try {
      // Incrementar contador de uso
      await fetch(`/api/payroll/job-descriptions/${descriptor.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      });

      // Cargar datos en el estado actual
      setExtractedData({
        position: descriptor.job_position,
        department: descriptor.department,
        job_functions: descriptor.job_functions,
        obligations: descriptor.obligations,
        prohibitions: descriptor.prohibitions
      });
      setIsComplete(true);
      setShowSaved(false);
    } catch (error) {
      console.error('Error using descriptor:', error);
    }
  };

  // Eliminar descriptor
  const deleteDescriptor = async (descriptorId: string) => {
    if (!confirm('¿Estás seguro de eliminar este descriptor?')) return;

    try {
      const response = await fetch(`/api/payroll/job-descriptions/${descriptorId}?company_id=${companyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadSavedDescriptions(); // Recargar lista
      }
    } catch (error) {
      console.error('Error deleting descriptor:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PayrollHeader 
        title="Asistente de Descriptor de Cargo"
        subtitle="Genera funciones profesionales usando IA, PDF o entrada manual"
        showBackButton
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Asistente Inteligente de Descriptores
            </h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              Crea descriptores de cargo profesionales que cumplen con la normativa laboral chilena
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center bg-white/20 rounded-full px-4 py-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Normativa Chilena
              </div>
              <div className="flex items-center bg-white/20 rounded-full px-4 py-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                IA Especializada
              </div>
              <div className="flex items-center bg-white/20 rounded-full px-4 py-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Parser PDF Avanzado
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          
          {/* Asistente Principal */}
          <JobDescriptionAssistant
            onDataExtracted={handleDataExtracted}
            currentPosition=""
            currentDepartment=""
          />

          {/* Resultados y Acciones */}
          {isComplete && extractedData && (
            <Card className="border-2 border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <CheckCircle2 className="h-6 w-6 mr-2" />
                  Descriptor de Cargo Completado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {extractedData.job_functions?.length || 0}
                    </div>
                    <div className="text-sm text-green-700">Funciones</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {extractedData.obligations?.length || 0}
                    </div>
                    <div className="text-sm text-green-700">Obligaciones</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {extractedData.prohibitions?.length || 0}
                    </div>
                    <div className="text-sm text-green-700">Prohibiciones</div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-green-200 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">¿Qué quieres hacer con este descriptor?</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Crear Empleado Completo */}
                    <div className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-colors">
                      <div className="text-center mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <h4 className="font-medium text-gray-900">Crear Empleado</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Empleado completo con contrato incluido
                        </p>
                      </div>
                      <Button
                        onClick={goToCreateEmployee}
                        variant="primary"
                        className="w-full"
                      >
                        Crear Empleado
                      </Button>
                    </div>

                    {/* Crear Solo Contrato */}
                    <div className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 transition-colors">
                      <div className="text-center mb-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <h4 className="font-medium text-gray-900">Solo Contrato</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Contrato independiente para empleado existente
                        </p>
                      </div>
                      <Button
                        onClick={goToCreateContract}
                        variant="outline"
                        className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        Crear Contrato
                      </Button>
                    </div>

                    {/* Guardar para Después */}
                    <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-400 transition-colors">
                      <div className="text-center mb-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <Save className="h-6 w-6 text-gray-600" />
                        </div>
                        <h4 className="font-medium text-gray-900">Guardar</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Guardar para usar más tarde
                        </p>
                      </div>
                      <Button
                        onClick={saveToDatabase}
                        disabled={saving}
                        variant="outline"
                        className="w-full"
                      >
                        {saving ? 'Guardando...' : 'Guardar en BD'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Preview del Descriptor */}
                {extractedData.position && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Preview: {extractedData.position}
                      {extractedData.department && ` - ${extractedData.department}`}
                    </h4>
                    <div className="text-sm text-gray-600">
                      <p>✅ {extractedData.job_functions?.length || 0} funciones principales definidas</p>
                      <p>✅ {extractedData.obligations?.length || 0} obligaciones laborales incluidas</p>
                      <p>✅ {extractedData.prohibitions?.length || 0} prohibiciones específicas</p>
                      <p>✅ Cumple con normativa laboral chilena</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Descriptores Guardados */}
          <Card className="border-2 border-indigo-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5 text-indigo-600" />
                  Descriptores Guardados ({savedDescriptions.length})
                </CardTitle>
                <Button
                  onClick={() => setShowSaved(!showSaved)}
                  variant="outline"
                  className="text-sm"
                >
                  {showSaved ? 'Ocultar' : 'Ver Todos'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSaved ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Cargando descriptores...</p>
                </div>
              ) : savedDescriptions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay descriptores guardados
                  </h3>
                  <p className="text-gray-600">
                    Los descriptores que generes se guardarán aquí para reutilizar
                  </p>
                </div>
              ) : (
                <>
                  {/* Mostrar los 3 más populares siempre */}
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    {savedDescriptions.slice(0, 3).map((descriptor) => (
                      <div key={descriptor.id} className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{descriptor.job_position}</h4>
                            <p className="text-sm text-gray-600">
                              {descriptor.department} • Usado {descriptor.times_used} veces
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => useDescriptor(descriptor)}
                              size="sm"
                              variant="primary"
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Usar
                            </Button>
                            <Button
                              onClick={() => deleteDescriptor(descriptor.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>✓ {descriptor.job_functions?.length || 0} funciones</span>
                          <span>✓ {descriptor.obligations?.length || 0} obligaciones</span>
                          <span>✓ {descriptor.prohibitions?.length || 0} prohibiciones</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mostrar todos si está expandido */}
                  {showSaved && savedDescriptions.length > 3 && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Todos los Descriptores</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedDescriptions.slice(3).map((descriptor) => (
                          <div key={descriptor.id} className="p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h5 className="font-medium text-gray-900 text-sm">{descriptor.job_position}</h5>
                                <p className="text-xs text-gray-500">
                                  {descriptor.department} • {descriptor.times_used} usos
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => useDescriptor(descriptor)}
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 py-1"
                                >
                                  Usar
                                </Button>
                                <Button
                                  onClick={() => deleteDescriptor(descriptor.id)}
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 py-1 text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Guía de Uso */}
          {!isComplete && (
            <Card>
              <CardHeader>
                <CardTitle>¿Cómo usar el asistente?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">1. Manual</h3>
                    <p className="text-sm text-gray-600">
                      Escribe las funciones directamente y déjanos refinarlas con IA
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">2. Asistente IA</h3>
                    <p className="text-sm text-gray-600">
                      Proporciona el cargo y contexto, la IA genera todo automáticamente
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">3. Subir PDF</h3>
                    <p className="text-sm text-gray-600">
                      Sube un descriptor existente y extraemos la información automáticamente
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Save className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">4. Guardar</h3>
                    <p className="text-sm text-gray-600">
                      Guarda descriptores en la BD para reutilizar en futuros empleados
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}