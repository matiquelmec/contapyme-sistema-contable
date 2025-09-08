'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Edit2,
  Trash2,
  Download,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Header } from '@/components/layout';
import { FixedAsset, FixedAssetReport } from '@/types';
import AddFixedAssetForm from '@/components/fixed-assets/AddFixedAssetForm';
import EditFixedAssetForm from '@/components/fixed-assets/EditFixedAssetForm';

interface FixedAssetsPageProps {}

// Constantes de paginación
const ITEMS_PER_PAGE = 20;

// Hook optimizado para activos (sin dependencias externas problemáticas)
function useOptimizedAssets() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FixedAssetReport | null>(null);
  
  // Referencias estables para evitar recreaciones
  const fetchAssetsRef = useRef<(() => Promise<void>) | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Fetch optimizado con throttling
  const fetchAssets = useCallback(async () => {
    const now = Date.now();
    // Throttle: máximo 1 request cada 2 segundos
    if (now - lastFetchRef.current < 2000) {
      return;
    }
    
    lastFetchRef.current = now;
    setLoading(true);
    
    try {
      // Fetch assets y report en paralelo
      const [assetsRes, reportRes] = await Promise.all([
        fetch('/api/fixed-assets?status=all'),
        fetch('/api/fixed-assets/reports?type=summary')
      ]);

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setAssets(assetsData.assets || []);
      }

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setReport(reportData.report || null);
      }

    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Guardar referencia estable
  fetchAssetsRef.current = fetchAssets;

  // Fetch inicial con cleanup
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted && fetchAssetsRef.current) {
        await fetchAssetsRef.current();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []); // Sin dependencias = solo al montar

  // Operaciones CRUD optimizadas
  const createAsset = useCallback(async (assetData: any) => {
    try {
      const response = await fetch('/api/fixed-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear activo');
      }

      const result = await response.json();
      
      // Optimistic update local
      setAssets(prev => [result.asset, ...prev]);
      
      // Refrescar report después de 1 segundo
      setTimeout(() => {
        if (fetchAssetsRef.current) {
          fetchAssetsRef.current();
        }
      }, 1000);
      
      return result.asset;
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear activo');
    }
  }, []);

  const updateAsset = useCallback(async (id: string, updateData: any) => {
    try {
      const response = await fetch(`/api/fixed-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar activo');
      }

      const result = await response.json();
      
      // Optimistic update local
      setAssets(prev => prev.map(asset => 
        asset.id === id ? result.asset : asset
      ));
      
      return result.asset;
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar activo');
    }
  }, []);

  const deleteAsset = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/fixed-assets/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar activo');
      }

      // Optimistic update local
      setAssets(prev => prev.filter(asset => asset.id !== id));
      
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar activo');
    }
  }, []);

  const refreshAssets = useCallback(() => {
    if (fetchAssetsRef.current) {
      return fetchAssetsRef.current();
    }
  }, []);

  return {
    assets,
    loading,
    report,
    createAsset,
    updateAsset,
    deleteAsset,
    refreshAssets
  };
}

export default function FixedAssetsPage({}: FixedAssetsPageProps) {
  const { 
    assets, 
    loading, 
    report,
    createAsset,
    updateAsset,
    deleteAsset,
    refreshAssets
  } = useOptimizedAssets();

  // Estados locales (sin dependencias externas)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReportDetails, setShowReportDetails] = useState(false);

  // Filtrado memoizado (solo cuando cambian los inputs relevantes)
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Filtro por texto de búsqueda
      const matchesSearch = !searchTerm || (
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.serial_number && asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.brand && asset.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.model && asset.model.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // Filtro por estado
      const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [assets, searchTerm, selectedStatus]);

  // Paginación memoizada
  const paginatedAssets = useMemo(() => {
    const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    return {
      assets: filteredAssets.slice(startIndex, endIndex),
      totalPages,
      startIndex,
      endIndex: Math.min(endIndex, filteredAssets.length)
    };
  }, [filteredAssets, currentPage]);

  // Cálculos de valor libro memoizados (solo para activos visibles)
  const bookValues = useMemo(() => {
    const values = new Map<string, number>();
    
    paginatedAssets.assets.forEach(asset => {
      try {
        const monthsSinceDepreciation = Math.max(0, Math.floor(
          (new Date().getTime() - new Date(asset.start_depreciation_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
        ));
        
        const depreciableValue = asset.purchase_value - (asset.residual_value || 0);
        const totalMonths = asset.useful_life_years * 12;
        const monthlyDepreciation = depreciableValue / totalMonths;
        
        const accumulatedDepreciation = Math.min(
          monthsSinceDepreciation * monthlyDepreciation,
          depreciableValue
        );
        
        const bookValue = Math.max(
          asset.purchase_value - accumulatedDepreciation, 
          asset.residual_value || 0
        );
        
        values.set(asset.id, bookValue);
      } catch (error) {
        values.set(asset.id, asset.purchase_value);
      }
    });
    
    return values;
  }, [paginatedAssets.assets]);

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus]);

  // Handlers optimizados con useCallback
  const handleAssetCreated = useCallback(async () => {
    setShowAddForm(false);
    // Refrescar datos después de crear
    setTimeout(() => {
      if (refreshAssets) {
        refreshAssets();
      }
    }, 500);
  }, [refreshAssets]);

  const handleAssetUpdated = useCallback(async () => {
    setSelectedAsset(null);
    setShowEditForm(false);
  }, []);

  const openEditModal = useCallback((asset: FixedAsset) => {
    setSelectedAsset(asset);
    setShowEditForm(true);
  }, []);

  const handleDeleteAsset = useCallback(async (asset: FixedAsset) => {
    if (confirm(`¿Estás seguro de eliminar el activo "${asset.name}"?`)) {
      try {
        await deleteAsset(asset.id);
        // Refrescar report después de eliminar
        setTimeout(() => {
          if (refreshAssets) {
            refreshAssets();
          }
        }, 500);
      } catch (error: any) {
        alert(error.message || 'Error al eliminar activo');
      }
    }
  }, [deleteAsset, refreshAssets]);

  const handleExportAssets = useCallback(async () => {
    try {
      const response = await fetch('/api/fixed-assets/export?format=csv');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activos_fijos_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error al exportar activos fijos');
      }
    } catch (error) {
      console.error('Error exporting assets:', error);
      alert('Error al exportar activos fijos');
    }
  }, []);

  // Formatters memoizados
  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(amount);
    };
  }, []);

  const formatDate = useMemo(() => {
    return (dateString: string) => {
      return new Date(dateString).toLocaleDateString('es-CL');
    };
  }, []);

  const getBookValue = useCallback((assetId: string): number => {
    return bookValues.get(assetId) || 0;
  }, [bookValues]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando activos fijos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header 
        title="Gestión de Activos Fijos"
        subtitle="Control completo con depreciación automática y reportes ejecutivos"
        showBackButton={true}
        backHref="/accounting"
        variant="premium"
        actions={
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-orange-100 to-red-100 rounded-full text-xs font-medium text-orange-800">
              <Package className="w-3 h-3" />
              <span>CRUD Completo</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAssets}
              className="border-green-200 hover:bg-green-50 hover:border-green-300"
            >
              <Download className="w-4 h-4 mr-1" />
              Exportar CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nuevo Activo
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Tarjetas de Resumen Simplificadas */}
          {showReportDetails && report ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Package className="h-7 w-7 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-700 mb-1">Total Activos</p>
                    <p className="text-3xl font-bold text-blue-900">{report.total_assets}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-2 border-green-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
                    <DollarSign className="h-7 w-7 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-700 mb-1">Valor Compra Total</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(report?.total_purchase_value || 0)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-2 border-purple-100 hover:border-purple-200 transition-all duration-300 hover:shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg">
                    <TrendingUp className="h-7 w-7 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-700 mb-1">Valor Libro Total</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(report?.total_book_value || 0)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-2 border-orange-100 hover:border-orange-200 transition-all duration-300 hover:shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg">
                    <Calendar className="h-7 w-7 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-orange-700 mb-1">Depreciación Mensual</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatCurrency(report?.monthly_depreciation || 0)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-blue-800">
                        Resumen de Activos Fijos
                      </h3>
                      <p className="text-blue-600">
                        {filteredAssets.length} activos encontrados
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowReportDetails(true);
                      if (!report && refreshAssets) {
                        refreshAssets();
                      }
                    }}
                    className="border-blue-200 hover:bg-blue-50"
                  >
                    Ver estadísticas detalladas
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filtros y Búsqueda */}
          <Card className="bg-white/90 backdrop-blur-sm border-2 border-gray-100 hover:border-gray-200 transition-colors mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <span>Filtros de Búsqueda</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Búsqueda */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, marca o número de serie..."
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-300 transition-all duration-300 bg-white/80"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Filtro por estado */}
                <div className="lg:w-48">
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-300 transition-all duration-300 bg-white/80 font-medium"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">🔍 Todos los estados</option>
                    <option value="active">✅ Activo</option>
                    <option value="disposed">❌ Dado de baja</option>
                    <option value="fully_depreciated">📉 Totalmente depreciado</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Activos Fijos */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Activos Fijos ({filteredAssets.length})
                </h2>
                {paginatedAssets.totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {paginatedAssets.totalPages}
                    </span>
                  </div>
                )}
              </div>
              
              {filteredAssets.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay activos fijos</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedStatus !== 'all' 
                      ? 'No se encontraron activos con los filtros aplicados.'
                      : 'Comienza agregando tu primer activo fijo.'
                    }
                  </p>
                  {!searchTerm && selectedStatus === 'all' && (
                    <div className="mt-6">
                      <Button
                        variant="primary"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => setShowAddForm(true)}
                      >
                        Agregar Primer Activo
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-orange-50 to-red-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider">
                          🏢 Activo
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider">
                          💰 Valor Compra
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider">
                          📈 Valor Libro
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider">
                          ⏰ Vida Útil
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider">
                          🟢 Estado
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider">
                          ⚙️ Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedAssets.assets.map((asset) => {
                        const bookValue = getBookValue(asset.id);
                        
                        return (
                          <tr key={asset.id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-300">
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {asset.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {asset.serial_number && `S/N: ${asset.serial_number}`}
                                    {asset.brand && ` • ${asset.brand}`}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-semibold text-green-900">
                                {formatCurrency(asset.purchase_value)}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-semibold text-purple-900">
                                {formatCurrency(bookValue)}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm text-orange-700 font-medium">
                                {asset.useful_life_years} años
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                                asset.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                                asset.status === 'disposed' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }`}>
                                {asset.status === 'active' ? '✅ Activo' :
                                 asset.status === 'disposed' ? '❌ Dado de baja' :
                                 '📉 Totalmente depreciado'}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Link href={`/accounting/fixed-assets/${asset.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<FileText className="w-4 h-4" />}
                                    className="border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                                  >
                                    Ver
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<Edit2 className="w-4 h-4" />}
                                  onClick={() => openEditModal(asset)}
                                  className="border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<Trash2 className="w-4 h-4" />}
                                  className="border-red-200 hover:bg-red-50 hover:border-red-300"
                                  onClick={() => handleDeleteAsset(asset)}
                                >
                                  Eliminar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Controles de Paginación */}
              {paginatedAssets.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="border-gray-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(paginatedAssets.totalPages, prev + 1))}
                      disabled={currentPage === paginatedAssets.totalPages}
                      className="border-gray-300"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Mostrando {paginatedAssets.startIndex + 1} - {paginatedAssets.endIndex} de {filteredAssets.length} activos
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Agregar Activo */}
      <AddFixedAssetForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={handleAssetCreated}
        createAssetOptimistic={createAsset}
      />

      {/* Modal Editar Activo */}
      {selectedAsset && (
        <EditFixedAssetForm
          isOpen={showEditForm}
          onClose={() => {
            setShowEditForm(false);
            setSelectedAsset(null);
          }}
          onSuccess={handleAssetUpdated}
          asset={selectedAsset}
        />
      )}
    </div>
  );
}