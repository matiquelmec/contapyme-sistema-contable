'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Save, Eye, Trash2, Clock, TrendingUp, X, Loader2 } from 'lucide-react';

interface JobDescriptor {
  id: string;
  title: string;
  job_position: string;
  department?: string;
  job_functions: string[];
  obligations: string[];
  prohibitions: string[];
  times_used: number;
  created_at: string;
  last_used_at?: string;
}

interface SavedJobDescriptionsSelectorProps {
  companyId: string;
  onSelect: (descriptor: JobDescriptor) => void;
  onClose: () => void;
}

export function SavedJobDescriptionsSelector({ 
  companyId, 
  onSelect, 
  onClose 
}: SavedJobDescriptionsSelectorProps) {
  const [descriptors, setDescriptors] = useState<JobDescriptor[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadDescriptors();
  }, [companyId]);

  const loadDescriptors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payroll/job-descriptions?company_id=${companyId}&popular=true&limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setDescriptors(data.data || []);
      }
    } catch (error) {
      console.error('Error loading descriptors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (descriptor: JobDescriptor) => {
    try {
      // Incrementar contador de uso
      await fetch(`/api/payroll/job-descriptions/${descriptor.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      });

      onSelect(descriptor);
    } catch (error) {
      console.error('Error using descriptor:', error);
      // Aún así continuar con la selección
      onSelect(descriptor);
    }
  };

  const filteredDescriptors = descriptors.filter(desc =>
    desc.job_position.toLowerCase().includes(filter.toLowerCase()) ||
    (desc.department?.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Descriptores de Cargo Guardados</h3>
            <p className="text-sm text-gray-600 mt-1">
              Selecciona un descriptor existente para reutilizar
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <input
            type="text"
            placeholder="Buscar por cargo o departamento..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">Cargando descriptores...</p>
            </div>
          ) : filteredDescriptors.length === 0 ? (
            <div className="text-center py-12">
              <Save className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {filter ? 'No se encontraron descriptores' : 'No hay descriptores guardados'}
              </h4>
              <p className="text-gray-600">
                {filter ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer descriptor con el asistente IA'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDescriptors.map((descriptor) => (
                <div
                  key={descriptor.id}
                  className="p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => handleSelect(descriptor)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600">
                        {descriptor.job_position}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {descriptor.department || 'Sin departamento'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{descriptor.times_used}</span>
                      </div>
                      {descriptor.last_used_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(descriptor.last_used_at).toLocaleDateString('es-CL')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="font-semibold text-blue-700">
                        {descriptor.job_functions?.length || 0}
                      </div>
                      <div className="text-blue-600">Funciones</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="font-semibold text-green-700">
                        {descriptor.obligations?.length || 0}
                      </div>
                      <div className="text-green-600">Obligaciones</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <div className="font-semibold text-red-700">
                        {descriptor.prohibitions?.length || 0}
                      </div>
                      <div className="text-red-600">Prohibiciones</div>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Usar Este Descriptor
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {descriptors.length} descriptor{descriptors.length !== 1 ? 'es' : ''} disponible{descriptors.length !== 1 ? 's' : ''}
            </span>
            <span>
              Los descriptores más usados aparecen primero
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}