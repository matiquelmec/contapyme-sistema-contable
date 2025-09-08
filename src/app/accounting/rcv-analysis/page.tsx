'use client';

import { useState, useCallback, useRef } from 'react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { FileText, Upload, AlertCircle, CheckCircle, X, BarChart3, Download, TrendingUp, Building2, Trash2, Play, Calculator, FileDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import MissingEntitiesManager from '@/components/accounting/MissingEntitiesManager';

interface ProveedorSummary {
  rutProveedor: string;
  razonSocial: string;
  totalTransacciones: number;
  transaccionesSuma: number;
  transaccionesResta: number;
  montoExentoTotal: number;
  montoNetoTotal: number;
  montoIVATotal: number;
  montoCalculado: number;
  porcentajeDelTotal: number;
}

interface RCVAnalysis {
  totalTransacciones: number;
  transaccionesSuma: number;
  transaccionesResta: number;
  montoExentoGlobal: number;
  montoNetoGlobal: number;
  montoIVAGlobal: number;
  montoCalculadoGlobal: number;
  proveedoresPrincipales: ProveedorSummary[];
  periodoInicio: string;
  periodoFin: string;
  confidence: number;
  method: string;
}

interface FileResult {
  file: File;
  result: RCVAnalysis | null;
  error: string | null;
  storageResult: any;
  uploading: boolean;
}

interface JournalEntryLine {
  account_code: string;
  account_name: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

interface PreliminaryJournalEntry {
  description: string;
  total_debit: number;
  total_credit: number;
  lines: JournalEntryLine[];
  period: string;
  is_balanced: boolean;
}

export default function RCVAnalysisMultiplePage() {
  const [files, setFiles] = useState<FileResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [rcvType, setRcvType] = useState<'purchase' | 'sales'>('purchase');
  const [storeInDB, setStoreInDB] = useState(true);
  const [globalUploading, setGlobalUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [showDetailed, setShowDetailed] = useState<number | null>(null);
  const [journalEntry, setJournalEntry] = useState<PreliminaryJournalEntry | null>(null);
  const [generatingJournalEntry, setGeneratingJournalEntry] = useState(false);
  const [postingToJournal, setPostingToJournal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const companyId = '8033ee69-b420-4d91-ba0e-482f46cd6fce'; // TODO: Get from auth

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

    const droppedFiles = Array.from(e.dataTransfer.files);
    const csvFiles = droppedFiles.filter(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      alert('Por favor, selecciona archivos CSV válidos');
      return;
    }

    const newFileResults: FileResult[] = csvFiles.map(file => ({
      file,
      result: null,
      error: null,
      storageResult: null,
      uploading: false
    }));

    setFiles(prev => [...prev, ...newFileResults]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const csvFiles = selectedFiles.filter(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      alert('Por favor, selecciona archivos CSV válidos');
      return;
    }

    const newFileResults: FileResult[] = csvFiles.map(file => ({
      file,
      result: null,
      error: null,
      storageResult: null,
      uploading: false
    }));

    setFiles(prev => [...prev, ...newFileResults]);
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (activeTab >= index && activeTab > 0) {
      setActiveTab(prev => prev - 1);
    }
  };

  const clearAllFiles = () => {
    setFiles([]);
    setActiveTab(0);
    setShowDetailed(null);
  };

  const processFile = async (fileIndex: number): Promise<void> => {
    const fileData = files[fileIndex];
    if (!fileData || fileData.uploading) return;

    // Marcar archivo como en proceso
    setFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, uploading: true, error: null } : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('company_id', companyId);
      formData.append('rcv_type', rcvType);
      formData.append('store_in_db', storeInDB.toString());

      console.log('🚀 Procesando archivo RCV:', {
        fileName: fileData.file.name,
        rcvType,
        storeInDB,
        companyId
      });

      const response = await fetch('/api/parse-rcv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data) {
        setFiles(prev => prev.map((f, i) => 
          i === fileIndex ? {
            ...f,
            uploading: false,
            result: data.data,
            storageResult: data.storage,
            error: null
          } : f
        ));
        console.log(`✅ RCV ${fileData.file.name} procesado exitosamente`);
      } else {
        setFiles(prev => prev.map((f, i) => 
          i === fileIndex ? {
            ...f,
            uploading: false,
            error: data.error || 'Error al procesar el archivo RCV'
          } : f
        ));
      }
    } catch (err) {
      console.error('Error procesando RCV:', err);
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? {
          ...f,
          uploading: false,
          error: 'Error de conexión. Inténtalo nuevamente.'
        } : f
      ));
    }
  };

  const handleBatchAnalysis = async () => {
    if (files.length === 0) return;

    setGlobalUploading(true);

    // Procesar archivos en lotes de 3 para no sobrecargar el servidor
    const batchSize = 3;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && i + j < files.length; j++) {
        batch.push(processFile(i + j));
      }
      await Promise.all(batch);
      
      // Pequeña pausa entre lotes
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setGlobalUploading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const [day, month, year] = dateStr.split('/');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatPeriod = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const [day, month, year] = dateStr.split('/');
      // Formato YYYYMM (6 caracteres) en lugar de YYYY-MM (7 caracteres)
      return `${year}${month.padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const generateJournalEntry = async () => {
    if (!result) return;
    
    setGeneratingJournalEntry(true);
    
    try {
      const period = formatPeriod(result.periodoInicio);
      
      const response = await fetch('/api/accounting/rcv-analysis/journal-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          rcv_analysis: result,
          period: period,
          ledger_id: currentFile?.storageResult?.ledger_id || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJournalEntry(data.data);
        console.log('✅ Asiento contable preliminar generado:', data.data);
      } else {
        console.error('❌ Error generando asiento contable:', data.error);
        alert('Error al generar el asiento contable: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error en request de asiento contable:', error);
      alert('Error de conexión al generar asiento contable');
    } finally {
      setGeneratingJournalEntry(false);
    }
  };

  const postToJournalBook = async () => {
    if (!result || !journalEntry || !journalEntry.is_balanced) {
      alert('El asiento debe estar balanceado antes de contabilizar');
      return;
    }

    setPostingToJournal(true);
    setShowConfirmDialog(false);
    
    try {
      const period = formatPeriod(result.periodoInicio);
      const ledger_id = currentFile?.storageResult?.ledger_id || null;
      
      const response = await fetch('/api/accounting/rcv-analysis/post-to-journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          rcv_analysis: result,
          preliminary_entry: journalEntry,
          ledger_id: ledger_id,
          period: period
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Asiento contabilizado exitosamente!\n\n` +
              `Número de Asiento: #${data.data.entry_number}\n` +
              `Líneas Contables: ${data.data.total_lines}\n` +
              `Total Debe: ${formatCurrency(data.data.total_debit)}\n` +
              `Total Haber: ${formatCurrency(data.data.total_credit)}\n\n` +
              `El asiento ha sido creado en el libro diario.`);
        
        // Opcional: Limpiar el asiento preliminar después de contabilizar
        setJournalEntry(null);
        
        console.log('✅ Asiento contabilizado en libro diario:', data.data);
      } else {
        console.error('❌ Error contabilizando asiento:', data.error);
        alert('Error al contabilizar el asiento: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error en request de contabilización:', error);
      alert('Error de conexión al contabilizar asiento');
    } finally {
      setPostingToJournal(false);
    }
  };

  // Obtener estadísticas globales
  const getGlobalStats = () => {
    const processed = files.filter(f => f.result && !f.error);
    const totalFiles = files.length;
    const totalProcessed = processed.length;
    const totalTransactions = processed.reduce((sum, f) => sum + (f.result?.totalTransacciones || 0), 0);
    const totalAmount = processed.reduce((sum, f) => sum + (f.result?.montoCalculadoGlobal || 0), 0);
    const totalSuppliers = processed.reduce((sum, f) => sum + (f.result?.proveedoresPrincipales.length || 0), 0);

    return {
      totalFiles,
      totalProcessed,
      totalTransactions,
      totalAmount,
      totalSuppliers,
      hasErrors: files.some(f => f.error),
      isProcessing: files.some(f => f.uploading) || globalUploading
    };
  };

  const currentFile = files[activeTab];
  const result = currentFile?.result;

  // Preparar datos para gráficos del archivo activo
  const chartData = result ? result.proveedoresPrincipales.slice(0, 10).map(p => ({
    name: p.razonSocial.length > 25 ? p.razonSocial.substring(0, 25) + '...' : p.razonSocial,
    fullName: p.razonSocial,
    monto: Math.abs(p.montoCalculado),
    montoReal: p.montoCalculado,
    transacciones: p.totalTransacciones,
    transaccionesSuma: p.transaccionesSuma,
    transaccionesResta: p.transaccionesResta,
    porcentaje: p.porcentajeDelTotal,
    tipo: p.montoCalculado >= 0 ? 'Compras' : 'Devoluciones'
  })) : [];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'];

  // Función para extraer RUT y período del nombre del archivo
  const extractFileInfo = (fileName: string) => {
    // Ejemplo: RCV_COMPRA_REGISTRO_77199932-8_202507.csv
    // Patrón: RCV_[TIPO]_REGISTRO_[RUT]_[YYYYMM].csv
    const match = fileName.match(/RCV_(?:COMPRA|VENTA)_REGISTRO_(\d{7,8}-[\dkK])_(\d{6})/i);
    
    if (match) {
      const rut = match[1]; // 77199932-8
      const yearMonth = match[2]; // 202507
      
      // Convertir YYYYMM a formato legible
      const year = yearMonth.substring(0, 4);
      const month = yearMonth.substring(4, 6);
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthName = monthNames[parseInt(month) - 1];
      const period = `${monthName} ${year}`;
      
      return { rut, period, yearMonth };
    }
    
    // Fallback si no coincide el patrón
    return { 
      rut: '12.345.678-9', 
      period: `${formatDate(result?.periodoInicio || '')} - ${formatDate(result?.periodoFin || '')}`,
      yearMonth: result?.periodoInicio?.replace(/\//g, '') || '010125'
    };
  };

  const exportToPDF = async () => {
    if (!result || !currentFile) return;

    setExportingPDF(true);
    
    try {
      // Importar dinámicamente las librerías
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Crear PDF con múltiples páginas
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      let currentY = 0;

      // FUNCIÓN AUXILIAR: Agregar nueva página si es necesario
      const addPageIfNeeded = (neededHeight: number) => {
        if (currentY + neededHeight > pdfHeight - 20) {
          pdf.addPage();
          currentY = 20;
        }
      };

      // FUNCIÓN AUXILIAR: Capturar elemento como imagen
      const captureElement = async (element: HTMLElement) => {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#FFFFFF'
        });
        return canvas.toDataURL('image/png');
      };

      // ===== PÁGINA 1: HEADER Y MÉTRICAS =====
      const headerContainer = document.createElement('div');
      headerContainer.style.cssText = `
        position: absolute; left: -9999px; width: 800px; background: white; 
        padding: 40px; font-family: Arial, sans-serif;
      `;
      
      // Extraer información del archivo
      const fileInfo = extractFileInfo(currentFile.file.name);
      
      headerContainer.innerHTML = `
        <div style="margin-bottom: 30px; text-align: center; border-bottom: 2px solid #3B82F6; padding-bottom: 20px;">
          <h1 style="color: #1E40AF; margin-bottom: 10px; font-size: 28px; font-weight: bold;">ContaPyme - Análisis RCV</h1>
          <h2 style="color: #374151; margin-bottom: 8px; font-size: 20px;">RUT Empresa: ${fileInfo.rut}</h2>
          <p style="color: #6B7280; margin: 5px 0; font-size: 16px; font-weight: 500;">Período: ${fileInfo.period}</p>
          <p style="color: #6B7280; margin: 0; font-size: 14px;">Generado el ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #F3F4F6, #E5E7EB); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #D1D5DB;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px; font-weight: 600;">Total Transacciones</h3>
            <p style="color: #1F2937; font-size: 28px; font-weight: bold; margin: 0;">${result.totalTransacciones.toLocaleString()}</p>
          </div>
          <div style="background: linear-gradient(135deg, #F3F4F6, #E5E7EB); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #D1D5DB;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px; font-weight: 600;">Total ${rcvType === 'purchase' ? 'Proveedores' : 'Clientes'}</h3>
            <p style="color: #1F2937; font-size: 28px; font-weight: bold; margin: 0;">${result.proveedoresPrincipales.length}</p>
          </div>
          <div style="background: linear-gradient(135deg, #F3F4F6, #E5E7EB); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #D1D5DB;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px; font-weight: 600;">Monto Total Calculado</h3>
            <p style="color: ${result.montoCalculadoGlobal >= 0 ? '#1F2937' : '#DC2626'}; font-size: 28px; font-weight: bold; margin: 0;">${formatCurrency(result.montoCalculadoGlobal)}</p>
          </div>
        </div>
      `;
      
      document.body.appendChild(headerContainer);
      const headerImg = await captureElement(headerContainer);
      document.body.removeChild(headerContainer);

      // Agregar header al PDF
      const headerHeight = 80;
      pdf.addImage(headerImg, 'PNG', 0, currentY, pdfWidth, headerHeight);
      currentY += headerHeight + 10;

      // ===== CAPTURAR GRÁFICOS =====
      console.log('📊 Capturando gráficos...');
      
      // Buscar los contenedores de gráficos existentes
      const barChartContainer = document.querySelector('[data-chart="bar"]') as HTMLElement;
      const pieChartContainer = document.querySelector('[data-chart="pie"]') as HTMLElement;

      if (barChartContainer) {
        addPageIfNeeded(110);
        const barChartImg = await captureElement(barChartContainer);
        pdf.addImage(barChartImg, 'PNG', 2, currentY, pdfWidth - 4, 105);
        currentY += 115;
      }

      if (pieChartContainer) {
        addPageIfNeeded(110);
        const pieChartImg = await captureElement(pieChartContainer);
        pdf.addImage(pieChartImg, 'PNG', 2, currentY, pdfWidth - 4, 105);
        currentY += 115;
      }

      // ===== TABLA COMPLETA DE TODOS LOS PROVEEDORES =====
      addPageIfNeeded(30);
      
      // Título de la tabla
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      pdf.text(`Detalle Completo - Todos los ${rcvType === 'purchase' ? 'Proveedores' : 'Clientes'} (${result.proveedoresPrincipales.length})`, 20, currentY);
      currentY += 15;

      // Configuración de la tabla
      const startY = currentY;
      const rowHeight = 8;
      const colWidths = [25, 80, 20, 35, 20]; // RUT, Razón Social, Trans, Monto, %
      let currentX = 20;

      // Headers de la tabla
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, currentY, pdfWidth - 40, rowHeight, 'F');
      
      const headers = ['RUT', 'Razón Social', 'Trans.', 'Monto Calculado', '% Total'];
      headers.forEach((header, i) => {
        pdf.text(header, currentX + 2, currentY + 5);
        currentX += colWidths[i];
      });
      
      currentY += rowHeight;

      // Datos de todos los proveedores
      pdf.setFont('helvetica', 'normal');
      result.proveedoresPrincipales.forEach((proveedor, index) => {
        addPageIfNeeded(rowHeight + 5);
        
        currentX = 20;
        
        // Alternar color de fondo
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(20, currentY, pdfWidth - 40, rowHeight, 'F');
        }
        
        // RUT
        pdf.setFontSize(8);
        pdf.text(proveedor.rutProveedor, currentX + 2, currentY + 5);
        currentX += colWidths[0];
        
        // Razón Social (truncar si es muy larga)
        pdf.setFontSize(9);
        const razonSocial = proveedor.razonSocial.length > 35 
          ? proveedor.razonSocial.substring(0, 35) + '...' 
          : proveedor.razonSocial;
        pdf.text(razonSocial, currentX + 2, currentY + 5);
        currentX += colWidths[1];
        
        // Transacciones
        pdf.setFontSize(9);
        pdf.text(proveedor.totalTransacciones.toString(), currentX + 2, currentY + 5);
        currentX += colWidths[2];
        
        // Monto (color rojo si es negativo)
        pdf.setFontSize(9);
        if (proveedor.montoCalculado < 0) {
          pdf.setTextColor(220, 38, 38); // Rojo
        } else {
          pdf.setTextColor(0, 0, 0); // Negro
        }
        const montoText = formatCurrency(proveedor.montoCalculado).replace(/\s/g, '');
        pdf.text(montoText, currentX + 2, currentY + 5);
        pdf.setTextColor(0, 0, 0); // Resetear color
        currentX += colWidths[3];
        
        // Porcentaje
        pdf.setFontSize(9);
        pdf.text(`${proveedor.porcentajeDelTotal.toFixed(2)}%`, currentX + 2, currentY + 5);
        
        currentY += rowHeight;
      });

      // ===== FOOTER =====
      addPageIfNeeded(20);
      currentY += 10;
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Análisis generado por ContaPyme - Sistema Contable para PyMEs', 20, currentY);
      pdf.text(`© 2025 ContaPyme. Reporte generado automáticamente.`, 20, currentY + 5);

      // Descargar el PDF
      const fileName = `Analisis_RCV_Completo_${fileInfo.rut.replace('-', '')}_${fileInfo.yearMonth}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Inténtalo nuevamente.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportResults = () => {
    if (!result || !currentFile) return;

    const csvData = [
      ['RUT Proveedor', 'Razón Social', 'Total Trans.', 'Compras (33/34)', 'Devoluciones (61)', 'Monto Exento', 'Monto Neto', 'Monto IVA', 'Monto Calculado', 'Porcentaje'],
      ...result.proveedoresPrincipales.map(p => [
        p.rutProveedor,
        p.razonSocial,
        p.totalTransacciones.toString(),
        p.transaccionesSuma.toString(),
        p.transaccionesResta.toString(),
        p.montoExentoTotal.toString(),
        p.montoNetoTotal.toString(),
        p.montoIVATotal.toString(),
        p.montoCalculado.toString(),
        p.porcentajeDelTotal.toFixed(2) + '%'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `RCV_${currentFile.file.name.replace('.csv', '')}_${result.periodoInicio.replace(/\//g, '')}_${result.periodoFin.replace(/\//g, '')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const stats = getGlobalStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Análisis RCV Múltiple"
        subtitle="Procesa múltiples registros de compras y ventas simultáneamente con análisis comparativo"
        showBackButton={true}
        backHref="/accounting"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => window.open('/accounting/rcv-history', '_blank')}>
              📋 Ver Historial RCV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('/accounting/f29-analysis', '_blank')}>
              📊 Análisis F29
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        
        {/* Stats Overview */}
        {files.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Archivos</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalFiles}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Procesados</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.totalProcessed}/{stats.totalFiles}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transacciones</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.totalTransactions.toLocaleString()}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{rcvType === 'purchase' ? 'Proveedores' : 'Clientes'}</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {stats.totalSuppliers.toLocaleString()}
                    </p>
                  </div>
                  <Building2 className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Valor Total</p>
                    <p className={`text-2xl font-bold ${stats.totalAmount >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {formatCurrency(stats.totalAmount)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Cargar Archivos RCV Múltiples</span>
                </CardTitle>
                <CardDescription>
                  Arrastra y suelta múltiples archivos CSV del SII para procesarlos simultáneamente. Todos deben ser del mismo tipo (compras o ventas).
                </CardDescription>
              </div>
              {files.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllFiles}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpiar Todo
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-6 ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Arrastra múltiples archivos RCV aquí
              </h4>
              <p className="text-gray-600 mb-4">
                o haz clic para seleccionar varios archivos CSV simultáneamente
              </p>
              <Button 
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
              >
                Seleccionar Archivos CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                Solo archivos CSV • Máximo 10MB por archivo • Sin límite de cantidad
              </p>
            </div>

            {/* Files List */}
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Tipo de RCV */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de RCV (aplicable a todos los archivos)
                    </label>
                    <select
                      value={rcvType}
                      onChange={(e) => setRcvType(e.target.value as 'purchase' | 'sales')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={globalUploading || files.some(f => f.uploading)}
                    >
                      <option value="purchase">📈 Registro de Compras</option>
                      <option value="sales">💰 Registro de Ventas</option>
                    </select>
                  </div>

                  {/* Almacenar en BD */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Almacenamiento
                    </label>
                    <div className="flex items-center space-x-3 mt-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={storeInDB}
                          onChange={(e) => setStoreInDB(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={globalUploading || files.some(f => f.uploading)}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          💾 Guardar todos en base de datos
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Files Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {files.map((fileData, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            fileData.uploading ? 'bg-yellow-500 animate-pulse' :
                            fileData.error ? 'bg-red-500' :
                            fileData.result ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {fileData.file.name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={fileData.uploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>

                      {fileData.uploading && (
                        <div className="text-xs text-yellow-600 mb-2">
                          🔄 Procesando...
                        </div>
                      )}

                      {fileData.error && (
                        <div className="text-xs text-red-600 mb-2">
                          ❌ {fileData.error}
                        </div>
                      )}

                      {fileData.result && !fileData.error && (
                        <div className="text-xs text-green-600 mb-2">
                          ✅ {fileData.result.totalTransacciones} transacciones
                          {fileData.storageResult && ' • Almacenado en BD'}
                        </div>
                      )}

                      {fileData.result && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab(index)}
                          fullWidth
                        >
                          Ver Análisis
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Process Button */}
                <div className="flex justify-center">
                  <Button
                    variant="primary"
                    onClick={handleBatchAnalysis}
                    disabled={globalUploading || files.some(f => f.uploading)}
                    loading={globalUploading}
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {globalUploading ? 'Procesando Archivos...' : `Procesar ${files.length} Archivo${files.length !== 1 ? 's' : ''} como ${rcvType === 'purchase' ? 'Compras' : 'Ventas'}`}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {files.some(f => f.result) && (
          <>
            {/* File Tabs */}
            <Card>
              <CardHeader>
                <CardTitle>Resultados del Análisis</CardTitle>
                <CardDescription>Selecciona un archivo para ver su análisis detallado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-6">
                  {files.map((fileData, index) => (
                    fileData.result && (
                      <button
                        key={index}
                        onClick={() => setActiveTab(index)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeTab === index
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {fileData.file.name.replace('.csv', '')}
                      </button>
                    )
                  ))}
                </div>

                {/* Current File Results */}
                {currentFile?.result && (
                  <div className="space-y-6">
                    {/* Summary Cards for Active File */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Transacciones</p>
                              <p className="text-2xl font-bold text-gray-900">{result!.totalTransacciones.toLocaleString()}</p>
                            </div>
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total {rcvType === 'purchase' ? 'Proveedores' : 'Clientes'}</p>
                              <p className="text-2xl font-bold text-gray-900">{result!.proveedoresPrincipales.length}</p>
                            </div>
                            <Building2 className="w-6 h-6 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Monto Neto Calculado</p>
                              <p className={`text-2xl font-bold ${result!.montoCalculadoGlobal >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                {formatCurrency(result!.montoCalculadoGlobal)}
                              </p>
                            </div>
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Período</p>
                              <p className="text-lg font-bold text-gray-900">
                                {formatDate(result!.periodoInicio)} - {formatDate(result!.periodoFin)}
                              </p>
                            </div>
                            <BarChart3 className="w-6 h-6 text-orange-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Missing Entities Manager */}
                    <MissingEntitiesManager
                      rcvAnalysis={result}
                      rcvType={rcvType}
                      companyId={companyId}
                      onEntitiesAdded={() => {
                        console.log('🔄 Entidades agregadas - podrías recargar configuración aquí si es necesario');
                      }}
                    />

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {/* Bar Chart */}
                      <Card data-chart="bar">
                        <CardHeader>
                          <CardTitle>Top 10 {rcvType === 'purchase' ? 'Proveedores' : 'Clientes'} por Monto</CardTitle>
                          <CardDescription>Ranking principal por volumen de {rcvType === 'purchase' ? 'compras' : 'ventas'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="name" 
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                  fontSize={12}
                                />
                                <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                                <Tooltip 
                                  formatter={(value: number, name: string) => [formatCurrency(value), 'Monto Calculado']}
                                  labelFormatter={(label) => {
                                    const item = chartData.find(d => d.name === label);
                                    return item ? `${item.fullName} (${item.tipo})` : label;
                                  }}
                                />
                                <Bar dataKey="monto" fill="#3B82F6" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pie Chart */}
                      <Card data-chart="pie">
                        <CardHeader>
                          <CardTitle>Concentración Top 10</CardTitle>
                          <CardDescription>Distribución porcentual de los principales {rcvType === 'purchase' ? 'proveedores' : 'clientes'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={chartData}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={100}
                                  fill="#8884d8"
                                  dataKey="porcentaje"
                                  label={({ name, porcentaje }) => `${porcentaje.toFixed(1)}%`}
                                >
                                  {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Porcentaje']}
                                  labelFormatter={(label) => {
                                    const item = chartData.find(d => d.name === label);
                                    return item?.fullName || label;
                                  }}
                                />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleExportResults}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Exportar CSV
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={exportToPDF}
                        disabled={exportingPDF}
                        loading={exportingPDF}
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        {exportingPDF ? 'Generando PDF...' : 'Exportar PDF'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowDetailed(showDetailed === activeTab ? null : activeTab)}
                      >
                        <BarChart3 className="w-4 h-4 mr-1" />
                        {showDetailed === activeTab ? 'Ocultar Detalle' : 'Ver Detalle Completo'}
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={generateJournalEntry}
                        disabled={generatingJournalEntry}
                        loading={generatingJournalEntry}
                      >
                        <Calculator className="w-4 h-4 mr-1" />
                        {generatingJournalEntry ? 'Generando...' : 'Generar Asiento Preliminar'}
                      </Button>
                    </div>

                    {/* Detailed Table */}
                    {showDetailed === activeTab && result && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Detalle Completo - {currentFile.file.name}</CardTitle>
                          <CardDescription>Lista completa de todos los {rcvType === 'purchase' ? 'proveedores' : 'clientes'} analizados</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">RUT</th>
                                  <th className="text-left p-2">Razón Social</th>
                                  <th className="text-center p-2">Total Trans.</th>
                                  <th className="text-center p-2">{rcvType === 'purchase' ? 'Compras/Devoluc.' : 'Ventas/Devoluc.'}</th>
                                  <th className="text-right p-2">Monto Exento</th>
                                  <th className="text-right p-2">Monto Neto</th>
                                  <th className="text-right p-2">Monto IVA</th>
                                  <th className="text-right p-2">Monto Calculado</th>
                                  <th className="text-center p-2">% del Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {result.proveedoresPrincipales.map((proveedor, index) => (
                                  <tr key={proveedor.rutProveedor} className="border-b hover:bg-gray-50">
                                    <td className="p-2 font-mono text-sm">{proveedor.rutProveedor}</td>
                                    <td className="p-2">{proveedor.razonSocial}</td>
                                    <td className="p-2 text-center">{proveedor.totalTransacciones}</td>
                                    <td className="p-2 text-center">
                                      <span className="text-green-600 font-medium">{proveedor.transaccionesSuma}</span>
                                      {proveedor.transaccionesResta > 0 && (
                                        <span className="text-red-600 font-medium"> (-{proveedor.transaccionesResta})</span>
                                      )}
                                    </td>
                                    <td className="p-2 text-right">{formatCurrency(proveedor.montoExentoTotal)}</td>
                                    <td className="p-2 text-right">{formatCurrency(proveedor.montoNetoTotal)}</td>
                                    <td className="p-2 text-right">{formatCurrency(proveedor.montoIVATotal)}</td>
                                    <td className={`p-2 text-right font-semibold ${proveedor.montoCalculado >= 0 ? '' : 'text-red-600'}`}>
                                      {formatCurrency(proveedor.montoCalculado)}
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        proveedor.porcentajeDelTotal >= 10 ? 'bg-red-100 text-red-800' :
                                        proveedor.porcentajeDelTotal >= 5 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {proveedor.porcentajeDelTotal.toFixed(2)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Journal Entry Section */}
                    {journalEntry && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Calculator className="w-5 h-5 text-green-600" />
                            <span>Asiento Contable Preliminar</span>
                            {journalEntry.is_balanced ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                          </CardTitle>
                          <CardDescription>
                            {journalEntry.description} - Período: {journalEntry.period}
                            {journalEntry.is_balanced ? (
                              <span className="text-green-600 ml-2">✅ Asiento balanceado</span>
                            ) : (
                              <span className="text-red-600 ml-2">⚠️ Asiento desbalanceado</span>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-sm font-medium text-blue-600">Total Debe</p>
                              <p className="text-xl font-bold text-blue-900">
                                {formatCurrency(journalEntry.total_debit)}
                              </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <p className="text-sm font-medium text-green-600">Total Haber</p>
                              <p className="text-xl font-bold text-green-900">
                                {formatCurrency(journalEntry.total_credit)}
                              </p>
                            </div>
                            <div className={`p-4 rounded-lg ${
                              journalEntry.is_balanced ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                              <p className={`text-sm font-medium ${
                                journalEntry.is_balanced ? 'text-green-600' : 'text-red-600'
                              }`}>Diferencia</p>
                              <p className={`text-xl font-bold ${
                                journalEntry.is_balanced ? 'text-green-900' : 'text-red-900'
                              }`}>
                                {formatCurrency(Math.abs(journalEntry.total_debit - journalEntry.total_credit))}
                              </p>
                            </div>
                          </div>

                          {/* Journal Entry Lines */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b-2 border-gray-200">
                                  <th className="text-left p-3 font-semibold">Código Cuenta</th>
                                  <th className="text-left p-3 font-semibold">Nombre Cuenta</th>
                                  <th className="text-left p-3 font-semibold">Descripción</th>
                                  <th className="text-right p-3 font-semibold">Debe</th>
                                  <th className="text-right p-3 font-semibold">Haber</th>
                                </tr>
                              </thead>
                              <tbody>
                                {journalEntry.lines.map((line, index) => (
                                  <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-mono text-sm">{line.account_code}</td>
                                    <td className="p-3 font-medium">{line.account_name}</td>
                                    <td className="p-3 text-gray-700">{line.description}</td>
                                    <td className="p-3 text-right font-mono">
                                      {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                                    </td>
                                    <td className="p-3 text-right font-mono">
                                      {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                                  <td colSpan={3} className="p-3 text-right">TOTALES:</td>
                                  <td className="p-3 text-right font-mono">
                                    {formatCurrency(journalEntry.total_debit)}
                                  </td>
                                  <td className="p-3 text-right font-mono">
                                    {formatCurrency(journalEntry.total_credit)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Action Buttons for Journal Entry */}
                          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                            <Button 
                              variant="primary" 
                              size="sm"
                              disabled={!journalEntry.is_balanced || postingToJournal}
                              loading={postingToJournal}
                              onClick={() => {
                                if (journalEntry.is_balanced) {
                                  setShowConfirmDialog(true);
                                } else {
                                  alert('El asiento debe estar balanceado antes de poder crearlo.');
                                }
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {postingToJournal ? 'Contabilizando...' : 
                               journalEntry.is_balanced ? 'Contabilizar en Libro Diario' : 'Asiento Desbalanceado'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const csvData = [
                                  ['Código Cuenta', 'Nombre Cuenta', 'Descripción', 'Debe', 'Haber'],
                                  ...journalEntry.lines.map(line => [
                                    line.account_code,
                                    line.account_name,
                                    line.description,
                                    line.debit_amount.toString(),
                                    line.credit_amount.toString()
                                  ]),
                                  ['', '', 'TOTALES:', journalEntry.total_debit.toString(), journalEntry.total_credit.toString()]
                                ];
                                
                                const csvContent = csvData.map(row => row.join(',')).join('\n');
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                
                                if (link.download !== undefined) {
                                  const url = URL.createObjectURL(blob);
                                  link.setAttribute('href', url);
                                  link.setAttribute('download', `AsientoRCV_${journalEntry.period}.csv`);
                                  link.style.visibility = 'hidden';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
                              }}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Exportar Asiento CSV
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setJournalEntry(null)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cerrar Asiento
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Confirmation Dialog */}
                    {showConfirmDialog && journalEntry && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                          <div className="flex items-center space-x-2 mb-4">
                            <AlertCircle className="w-6 h-6 text-yellow-600" />
                            <h3 className="text-lg font-semibold">Confirmar Contabilización</h3>
                          </div>
                          
                          <div className="mb-6">
                            <p className="text-gray-700 mb-4">
                              ¿Estás seguro de que deseas contabilizar este asiento en el libro diario?
                            </p>
                            
                            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                              <p><strong>Descripción:</strong> {journalEntry.description}</p>
                              <p><strong>Período:</strong> {journalEntry.period}</p>
                              <p><strong>Líneas:</strong> {journalEntry.lines.length}</p>
                              <p><strong>Total Debe:</strong> {formatCurrency(journalEntry.total_debit)}</p>
                              <p><strong>Total Haber:</strong> {formatCurrency(journalEntry.total_credit)}</p>
                            </div>
                            
                            <p className="text-sm text-gray-600 mt-3">
                              <strong>Nota:</strong> Una vez contabilizado, el asiento será definitivo en el libro diario.
                            </p>
                          </div>
                          
                          <div className="flex justify-end space-x-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowConfirmDialog(false)}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={postToJournalBook}
                              disabled={postingToJournal}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirmar Contabilización
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}