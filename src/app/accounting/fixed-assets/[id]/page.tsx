'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Package,
  Calendar,
  DollarSign,
  TrendingDown,
  FileText,
  Building,
  Settings
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { FixedAsset } from '@/types';
import EditFixedAssetForm from '@/components/fixed-assets/EditFixedAssetForm';

export default function FixedAssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<FixedAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);

  const assetId = params.id as string;

  // Cargar datos del activo
  const fetchAsset = async () => {
    try {
      const response = await fetch(`/api/fixed-assets/${assetId}`);
      
      if (response.ok) {
        const data = await response.json();
        setAsset(data.asset);
      } else {
        console.error('Failed to load asset');
        router.push('/accounting/fixed-assets');
      }
    } catch (error) {
      console.error('Error loading asset:', error);
      router.push('/accounting/fixed-assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchAsset();
    }
  }, [assetId, router]);

  // Manejar éxito en edición
  const handleAssetUpdated = () => {
    fetchAsset(); // Recargar datos del activo
    setShowEditForm(false);
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  // Calcular valor libro actual
  const calculateBookValue = (asset: FixedAsset) => {
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
      
      return Math.max(
        asset.purchase_value - accumulatedDepreciation, 
        asset.residual_value || 0
      );
    } catch (error) {
      return asset.purchase_value;
    }
  };

  // Calcular porcentaje de depreciación
  const calculateDepreciationPercentage = (asset: FixedAsset) => {
    const bookValue = calculateBookValue(asset);
    const depreciableValue = asset.purchase_value - (asset.residual_value || 0);
    const depreciated = asset.purchase_value - bookValue;
    return Math.min((depreciated / depreciableValue) * 100, 100);
  };

  // Manejar eliminación
  const handleDelete = async () => {
    if (!asset) return;

    if (confirm(`¿Estás seguro de eliminar el activo "${asset.name}"?`)) {
      try {
        const response = await fetch(`/api/fixed-assets/${asset.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          router.push('/accounting/fixed-assets');
        } else {
          alert('Error al eliminar el activo fijo');
        }
      } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Error al eliminar el activo fijo');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
          <p className="mt-4 text-gray-600">Cargando activo fijo...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">Activo fijo no encontrado</p>
          <Link href="/accounting/fixed-assets">
            <Button className="mt-4">Volver a la lista</Button>
          </Link>
        </div>
      </div>
    );
  }

  const bookValue = calculateBookValue(asset);
  const depreciationPercentage = calculateDepreciationPercentage(asset);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/accounting/fixed-assets">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Volver
                </Button>
              </Link>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
                <p className="text-gray-600">{asset.category}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                leftIcon={<Edit2 className="w-4 h-4" />}
                onClick={() => setShowEditForm(true)}
              >
                Editar
              </Button>
              <Button
                variant="danger"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={handleDelete}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Métricas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Valor de Compra</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(asset.purchase_value)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Valor Libro Actual</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(bookValue)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Vida Útil</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {asset.useful_life_years} años
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Depreciación</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {depreciationPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Detalles del Activo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Información General */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Información General
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Nombre</label>
                  <p className="mt-1 text-sm text-gray-900">{asset.name}</p>
                </div>
                {asset.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Descripción</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Categoría</label>
                  <p className="mt-1 text-sm text-gray-900">{asset.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Estado</label>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
                    asset.status === 'active' ? 'bg-green-100 text-green-800' :
                    asset.status === 'disposed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {asset.status === 'active' ? 'Activo' :
                     asset.status === 'disposed' ? 'Dado de baja' :
                     asset.status === 'fully_depreciated' ? 'Totalmente depreciado' :
                     asset.status}
                  </span>
                </div>
              </div>
            </Card>

            {/* Información Técnica */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Información Técnica
              </h3>
              <div className="space-y-4">
                {asset.serial_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número de Serie</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{asset.serial_number}</p>
                  </div>
                )}
                {asset.brand && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Marca</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.brand}</p>
                  </div>
                )}
                {asset.model && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Modelo</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.model}</p>
                  </div>
                )}
                {asset.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ubicación</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.location}</p>
                  </div>
                )}
                {asset.responsible_person && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Responsable</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.responsible_person}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Información Financiera */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Información Financiera
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Fecha de Compra</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(asset.purchase_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Inicio Depreciación</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(asset.start_depreciation_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Valor de Compra</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{formatCurrency(asset.purchase_value)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Valor Residual</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(asset.residual_value || 0)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Valor Libro Actual</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold text-blue-600">{formatCurrency(bookValue)}</p>
                </div>
              </div>
            </Card>

            {/* Información Contable */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Información Contable
              </h3>
              <div className="space-y-4">
                {asset.asset_account_code && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cuenta de Activo</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{asset.asset_account_code}</p>
                  </div>
                )}
                {asset.depreciation_account_code && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cuenta Depreciación Acumulada</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{asset.depreciation_account_code}</p>
                  </div>
                )}
                {asset.expense_account_code && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cuenta Gasto Depreciación</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{asset.expense_account_code}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Método de Depreciación</label>
                  <p className="mt-1 text-sm text-gray-900">{asset.depreciation_method || 'Lineal'}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal Editar Activo */}
      {asset && (
        <EditFixedAssetForm
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSuccess={handleAssetUpdated}
          asset={asset}
        />
      )}
    </div>
  );
}