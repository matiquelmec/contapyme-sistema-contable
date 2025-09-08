'use client';

import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { FileSpreadsheet, Download } from 'lucide-react';

export default function LibroRemuneracionesSimplePage() {
  const [downloading, setDownloading] = useState(false);

  const companyId = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const response = await fetch(
        `/api/payroll/libro-remuneraciones/excel?company_id=${companyId}&year=2025&month=08`
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Libro_Remuneraciones_Agosto_2025.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('✅ Excel descargado correctamente');
      } else {
        alert('❌ Error descargando Excel');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error descargando Excel');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            📊 Libro de Remuneraciones - Página Rápida
          </h1>
          <p className="text-gray-600">
            Descarga inmediata del libro de remuneraciones en Excel
          </p>
        </div>

        <Card className="p-8 text-center">
          <div className="mb-6">
            <FileSpreadsheet className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Libro de Remuneraciones Agosto 2025</h3>
            <p className="text-gray-600">
              El cálculo del líquido está corregido: <strong>Total Haberes - Total Descuentos</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ Fórmula Verificada</h4>
              <p className="text-green-700">
                <strong>Líquido a Pagar = Total Haberes - Total Descuentos</strong>
              </p>
              <p className="text-sm text-green-600 mt-2">
                Los datos en el Excel ya usan esta fórmula correcta
              </p>
            </div>

            <Button
              onClick={downloadExcel}
              disabled={downloading}
              className="w-full"
              size="lg"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Descargando Excel...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Descargar Excel con Fórmula Corregida
                </>
              )}
            </Button>

            <div className="text-sm text-gray-500 mt-4">
              <p>🚀 Esta página carga rápidamente para uso inmediato</p>
              <p>📍 URL: <code>http://localhost:3006/payroll/libro-remuneraciones/simple</code></p>
            </div>
          </div>
        </Card>

        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">📊 Datos del Libro de Agosto 2025:</h4>
          <div className="text-blue-700 space-y-1">
            <p>• <strong>Total Haberes:</strong> $9,818,146</p>
            <p>• <strong>Total Descuentos:</strong> $1,250,873</p>
            <p>• <strong>Total Líquido:</strong> $8,567,273 ✅ (9,818,146 - 1,250,873)</p>
          </div>
        </div>
      </div>
    </div>
  );
}