'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Building, TrendingUp, DollarSign, FileText, BarChart3 } from 'lucide-react';

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;

  // Demo company data
  const companyData = {
    'demo-1': {
      name: 'Empresa Demo S.A.',
      rut: '12.345.678-9',
      giro: 'Comercio al por menor',
      address: 'Av. Principal 123, Santiago'
    },
    'demo-2': {
      name: 'Mi Pyme Ltda.',
      rut: '98.765.432-1',
      giro: 'Servicios profesionales',
      address: 'Calle Comercio 456, Valparaíso'
    }
  };

  const company = companyData[companyId as keyof typeof companyData] || {
    name: 'Empresa No Encontrada',
    rut: 'N/A',
    giro: 'N/A',
    address: 'N/A'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={company.name}
        subtitle="Dashboard Contable"
        showBackButton={true}
        backHref="/accounting"
        actions={
          <Button variant="primary" size="sm">
            📊 Ver Reportes
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-blue-600" />
              <span>Información de la Empresa</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600">RUT</p>
                <p className="font-semibold">{company.rut}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Giro</p>
                <p className="font-semibold">{company.giro}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dirección</p>
                <p className="font-semibold">{company.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Activa
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Ingresos Mes</p>
                  <p className="text-2xl font-bold text-gray-900">$2.5M</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Crecimiento</p>
                  <p className="text-2xl font-bold text-green-600">+15%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Documentos</p>
                  <p className="text-2xl font-bold text-gray-900">127</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">F29 Procesados</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Access */}
        <Card>
          <CardHeader>
            <CardTitle>Módulos Contables</CardTitle>
            <CardDescription>
              Accede a las diferentes funcionalidades contables de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                fullWidth 
                className="h-20 flex-col space-y-2"
                onClick={() => window.open('/accounting/f29-analysis', '_blank')}
              >
                <FileText className="w-6 h-6" />
                <span>Análisis F29</span>
              </Button>

              <Button 
                variant="outline" 
                fullWidth 
                className="h-20 flex-col space-y-2"
                onClick={() => window.open('/accounting/f29-comparative', '_blank')}
              >
                <BarChart3 className="w-6 h-6" />
                <span>Análisis Comparativo</span>
              </Button>

              <Button 
                variant="outline" 
                fullWidth 
                className="h-20 flex-col space-y-2"
                disabled
              >
                <DollarSign className="w-6 h-6" />
                <span>Libro Diario</span>
              </Button>

              <Button 
                variant="outline" 
                fullWidth 
                className="h-20 flex-col space-y-2"
                disabled
              >
                <TrendingUp className="w-6 h-6" />
                <span>Balance General</span>
              </Button>

              <Button 
                variant="outline" 
                fullWidth 
                className="h-20 flex-col space-y-2"
                disabled
              >
                <Building className="w-6 h-6" />
                <span>Estado de Resultados</span>
              </Button>

              <Button 
                variant="outline" 
                fullWidth 
                className="h-20 flex-col space-y-2"
                disabled
              >
                <FileText className="w-6 h-6" />
                <span>Reportes</span>
              </Button>
            </div>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">
                🚧 Módulos en Desarrollo
              </h4>
              <p className="text-sm text-yellow-800">
                Algunos módulos están siendo implementados. El análisis F29 está completamente funcional.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}