'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { 
  Upload, 
  FileText, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Download,
  Filter,
  Search,
  Calendar,
  DollarSign,
  Building2
} from 'lucide-react';

interface RCVRecord {
  id: string;
  record_type: 'purchase' | 'sale';
  document_type: string;
  document_number?: string;
  document_date: string;
  entity_rut: string;
  entity_name: string;
  entity_business_name?: string;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'pending' | 'processed' | 'error';
  created_at: string;
}

interface EntitySummary {
  entity_rut: string;
  entity_name: string;
  entity_business_name?: string;
  purchase_count: number;
  sale_count: number;
  total_purchases: number;
  total_sales: number;
  total_transactions: number;
  suggested_entity_type: 'supplier' | 'customer' | 'both';
  entity_exists: boolean;
  first_transaction: string;
  last_transaction: string;
}

interface ImportBatch {
  id: string;
  batch_id: string;
  file_name: string;
  total_records: number;
  processed_records: number;
  success_records: number;
  error_records: number;
  status: 'processing' | 'completed' | 'failed' | 'partial';
  created_at: string;
  total_amount: number;
}

interface RCVStatistics {
  total_records: number;
  total_purchases: number;
  total_sales: number;
  unique_entities: number;
  total_net_amount: number;
  total_tax_amount: number;
  total_amount: number;
  pending_records: number;
  processed_records: number;
}

export default function RCVHistoryPage() {
  const [activeTab, setActiveTab] = useState<'records' | 'entities' | 'import'>('records');
  const [records, setRecords] = useState<RCVRecord[]>([]);
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [statistics, setStatistics] = useState<RCVStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    record_type: '',
    status: '',
    search: '',
    start_date: '',
    end_date: ''
  });

  // ID de compañía demo - en producción vendría del contexto/auth
  const companyId = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRecords(),
        loadEntities(),
        loadImportBatches()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      const params = new URLSearchParams({
        company_id: companyId,
        limit: '50',
        ...filters
      });

      const response = await fetch(`/api/accounting/rcv/records?${params}`);
      const result = await response.json();

      if (result.success) {
        setRecords(result.data.records);
        setStatistics(result.data.statistics);
      }
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  const loadEntities = async () => {
    try {
      const response = await fetch(`/api/accounting/rcv/entities-summary?company_id=${companyId}`);
      const result = await response.json();

      if (result.success) {
        setEntities(result.data.entities);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
    }
  };

  const loadImportBatches = async () => {
    try {
      const response = await fetch(`/api/accounting/rcv/import?company_id=${companyId}`);
      const result = await response.json();

      if (result.success) {
        setImportBatches(result.data);
      }
    } catch (error) {
      console.error('Error loading import batches:', error);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const recordType = 'purchase'; // Default, podría ser seleccionable
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId);
    formData.append('record_type', recordType);

    setLoading(true);
    try {
      const response = await fetch('/api/accounting/rcv/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Importación exitosa: ${result.data.records_imported} registros procesados`);
        await loadData();
      } else {
        alert(`Error en importación: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error al importar archivo');
    } finally {
      setLoading(false);
    }
  };

  const createMissingEntities = async () => {
    const missingEntities = entities.filter(e => !e.entity_exists);
    if (missingEntities.length === 0) {
      alert('No hay entidades faltantes para crear');
      return;
    }

    const entityRuts = missingEntities.map(e => e.entity_rut);
    
    setLoading(true);
    try {
      const response = await fetch('/api/accounting/rcv/entities-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: companyId,
          entity_ruts: entityRuts
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`${result.data.total_created} entidades creadas exitosamente`);
        await loadEntities();
      } else {
        alert(`Error creando entidades: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating entities:', error);
      alert('Error al crear entidades');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Historial RCV"
        subtitle="Registro de Compras y Ventas con generación automática de entidades"
        showBackButton
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas principales */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Registros</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.total_records}</p>
                  </div>
                  <FileText className="h-12 w-12 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entidades Únicas</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.unique_entities}</p>
                  </div>
                  <Users className="h-12 w-12 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monto Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(statistics.total_amount)}
                    </p>
                  </div>
                  <DollarSign className="h-12 w-12 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Procesados</p>
                    <p className="text-3xl font-bold text-green-600">{statistics.processed_records}</p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navegación por pestañas */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('records')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'records'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Registros RCV
              </button>
              <button
                onClick={() => setActiveTab('entities')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'entities'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Entidades Detectadas
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Importar Archivo
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de pestañas */}
        {activeTab === 'records' && (
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Registros RCV
                </span>
                <Button 
                  onClick={loadRecords}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  Actualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {records.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros RCV</h3>
                    <p className="text-gray-500">Importa un archivo CSV para comenzar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Fecha
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Entidad
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            RUT
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Monto Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {records.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                record.record_type === 'purchase' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {record.record_type === 'purchase' ? 'Compra' : 'Venta'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(record.document_date)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="font-medium">{record.entity_name}</div>
                              {record.entity_business_name && (
                                <div className="text-xs text-gray-500">{record.entity_business_name}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                              {record.entity_rut}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatCurrency(record.total_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                record.status === 'processed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : record.status === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {record.status === 'processed' ? 'Procesado' : 
                                 record.status === 'error' ? 'Error' : 'Pendiente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'entities' && (
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Entidades Detectadas
                </span>
                <div className="flex gap-2">
                  <Button 
                    onClick={createMissingEntities}
                    variant="primary"
                    size="sm"
                    disabled={loading || entities.filter(e => !e.entity_exists).length === 0}
                  >
                    Crear Faltantes ({entities.filter(e => !e.entity_exists).length})
                  </Button>
                  <Button 
                    onClick={loadEntities}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    Actualizar
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {entities.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay entidades detectadas</h3>
                    <p className="text-gray-500">Importa registros RCV para detectar entidades automáticamente</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Entidad
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            RUT
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Tipo Sugerido
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Transacciones
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Monto Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {entities.map((entity) => (
                          <tr key={entity.entity_rut} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="font-medium">{entity.entity_name}</div>
                              {entity.entity_business_name && (
                                <div className="text-xs text-gray-500">{entity.entity_business_name}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                              {entity.entity_rut}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                entity.suggested_entity_type === 'supplier' 
                                  ? 'bg-orange-100 text-orange-800'
                                  : entity.suggested_entity_type === 'customer'
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {entity.suggested_entity_type === 'supplier' ? 'Proveedor' :
                                 entity.suggested_entity_type === 'customer' ? 'Cliente' : 'Ambos'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>{entity.total_transactions} total</div>
                              <div className="text-xs text-gray-500">
                                {entity.purchase_count} compras, {entity.sale_count} ventas
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatCurrency(entity.total_purchases + entity.total_sales)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                entity.entity_exists 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {entity.entity_exists ? 'Configurada' : 'Pendiente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Importar nuevo archivo */}
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Archivo RCV
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Importar archivo CSV de RCV
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Sube un archivo CSV con datos de compras o ventas para generar entidades automáticamente
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileImport}
                      className="hidden"
                      id="file-upload"
                      disabled={loading}
                    />
                    <label htmlFor="file-upload">
                      <Button variant="primary" disabled={loading} className="cursor-pointer">
                        {loading ? 'Procesando...' : 'Seleccionar Archivo'}
                      </Button>
                    </label>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Formato esperado del CSV:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>RUT:</strong> RUT del proveedor/cliente (formato XX.XXX.XXX-X)</li>
                      <li>• <strong>Nombre/Razón Social:</strong> Nombre de la entidad</li>
                      <li>• <strong>Tipo Doc:</strong> Tipo de documento (Factura, Boleta, etc.)</li>
                      <li>• <strong>Fecha:</strong> Fecha del documento (DD/MM/YYYY o YYYY-MM-DD)</li>
                      <li>• <strong>Neto:</strong> Monto neto</li>
                      <li>• <strong>IVA:</strong> Monto IVA</li>
                      <li>• <strong>Total:</strong> Monto total</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Historial de importaciones */}
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Historial de Importaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {importBatches.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay importaciones previas</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {importBatches.map((batch) => (
                        <div 
                          key={batch.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">{batch.file_name}</div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(batch.created_at)} • {batch.total_records} registros
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(batch.total_amount)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {batch.success_records}/{batch.total_records} procesados
                              </div>
                            </div>
                            
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              batch.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : batch.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : batch.status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {batch.status === 'completed' ? 'Completado' : 
                               batch.status === 'failed' ? 'Falló' :
                               batch.status === 'partial' ? 'Parcial' : 'Procesando'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}