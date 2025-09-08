'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import jsPDF from 'jspdf';
import { PayrollHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { 
  ArrowLeft, 
  Download, 
  Edit3, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  User,
  FileText,
  Calculator,
  Building,
  Trash2,
  CheckCircle,
  X,
  Clock,
  AlertTriangle,
  Eye,
  Send
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

interface LiquidationDetail {
  id: string;
  employee: {
    rut: string;
    first_name: string;
    last_name: string;
  };
  period_year: number;
  period_month: number;
  days_worked: number;
  
  // Haberes
  base_salary: number;
  overtime_amount: number;
  bonuses: number;
  commissions: number;
  gratification: number;
  legal_gratification_art50: number;
  food_allowance: number;
  transport_allowance: number;
  family_allowance: number;
  total_taxable_income: number;
  total_non_taxable_income: number;
  
  // Descuentos
  afp_percentage: number;
  afp_commission_percentage: number;
  afp_amount: number;
  afp_commission_amount: number;
  health_percentage: number;
  health_amount: number;
  unemployment_percentage: number;
  unemployment_amount: number;
  income_tax_amount: number;
  
  // Otros descuentos
  loan_deductions: number;
  advance_payments: number;
  apv_amount: number;
  other_deductions: number;
  total_other_deductions: number;
  
  // Totales
  total_gross_income: number;
  total_deductions: number;
  net_salary: number;
  
  status: string;
  created_at: string;
  updated_at: string;
}

export default function LiquidationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const liquidationId = params.id as string;
  
  const [liquidation, setLiquidation] = useState<LiquidationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

  // 🎯 SISTEMA DE WORKFLOW: Estados y configuración
  type LiquidationStatus = 'draft' | 'review' | 'approved' | 'paid' | 'cancelled';
  
  const STATUS_CONFIG = {
    draft: { 
      label: 'Borrador', 
      color: 'bg-gray-100 text-gray-800', 
      icon: FileText,
      description: 'Puede editarse libremente'
    },
    review: { 
      label: 'En Revisión', 
      color: 'bg-yellow-100 text-yellow-800', 
      icon: Clock,
      description: 'Pendiente de aprobación'
    },
    approved: { 
      label: 'Aprobada', 
      color: 'bg-green-100 text-green-800', 
      icon: CheckCircle,
      description: 'Lista para pago'
    },
    paid: { 
      label: 'Pagada', 
      color: 'bg-blue-100 text-blue-800', 
      icon: DollarSign,
      description: 'Proceso completado'
    },
    cancelled: { 
      label: 'Cancelada', 
      color: 'bg-red-100 text-red-800', 
      icon: X,
      description: 'Liquidación cancelada'
    }
  };

  // Transiciones permitidas entre estados
  const WORKFLOW_TRANSITIONS = {
    draft: ['review', 'cancelled'],      // Borrador → Revisión o Cancelar
    review: ['approved', 'draft'],       // Revisión → Aprobar o Rechazar
    approved: ['paid', 'cancelled'],     // Aprobada → Pagar o Cancelar
    paid: [],                           // Pagada → Estado final
    cancelled: ['draft']                // Cancelada → Restaurar a borrador
  };

  useEffect(() => {
    if (liquidationId) {
      fetchLiquidationDetail();
    }
  }, [liquidationId]);

  const fetchLiquidationDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/payroll/liquidations/${liquidationId}?company_id=${COMPANY_ID}`
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setLiquidation(data.data);
      } else {
        setError('Liquidación no encontrada');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching liquidation:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 FUNCIÓN PRINCIPAL: Actualizar estado de liquidación
  const updateLiquidationStatus = async (newStatus: LiquidationStatus, confirmMessage?: string) => {
    if (!liquidation) return;

    // Verificar si la transición está permitida
    const currentStatus = liquidation.status as LiquidationStatus;
    if (!WORKFLOW_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      setError(`No se puede cambiar de ${STATUS_CONFIG[currentStatus]?.label} a ${STATUS_CONFIG[newStatus]?.label}`);
      return;
    }

    // Confirmar la acción con el usuario
    const confirmed = confirm(
      confirmMessage || `¿Confirmas cambiar el estado a "${STATUS_CONFIG[newStatus].label}"?`
    );
    if (!confirmed) return;

    try {
      setUpdatingStatus(true);
      setError(null);

      const response = await fetch(`/api/payroll/liquidations/${liquidationId}?company_id=${COMPANY_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLiquidation({ ...liquidation, status: newStatus });
        setSuccessMessage(`Estado actualizado a: ${STATUS_CONFIG[newStatus].label}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Error al actualizar estado');
      }
    } catch (err) {
      setError('Error de conexión al actualizar estado');
      console.error('Error updating liquidation status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 🗑️ FUNCIÓN: Eliminar liquidación con confirmación detallada
  const handleDelete = async () => {
    if (!liquidation) return;

    const employeeName = `${liquidation.employee.first_name} ${liquidation.employee.last_name}`;
    const period = formatPeriod(liquidation.period_year, liquidation.period_month);
    
    const confirmed = confirm(
      `⚠️ ELIMINAR LIQUIDACIÓN\n\n` +
      `Empleado: ${employeeName}\n` +
      `Período: ${period}\n` +
      `Monto: ${formatCurrency(calculateNetSalary(liquidation))}\n\n` +
      `Esta acción NO se puede deshacer.\n\n` +
      `¿Estás completamente seguro?`
    );

    if (!confirmed) return;

    try {
      setUpdatingStatus(true);
      setError(null);

      const response = await fetch(`/api/payroll/liquidations/${liquidationId}?company_id=${COMPANY_ID}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/payroll/liquidations?deleted=true');
      } else {
        setError(data.error || 'Error al eliminar liquidación');
      }
    } catch (err) {
      setError('Error de conexión al eliminar');
      console.error('Error deleting liquidation:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 🎯 ACCIONES ESPECÍFICAS: Cada una con su mensaje personalizado
  const handleSubmitForReview = () => updateLiquidationStatus(
    'review', 
    '📋 ENVIAR A REVISIÓN\n\nEsta liquidación será enviada para revisión y aprobación.\n\n¿Confirmas el envío?'
  );

  const handleApprove = () => updateLiquidationStatus(
    'approved',
    '✅ APROBAR LIQUIDACIÓN\n\nEsta liquidación será marcada como aprobada y estará lista para el pago.\n\n¿Confirmas la aprobación?'
  );

  const handleReject = () => updateLiquidationStatus(
    'draft',
    '❌ RECHAZAR LIQUIDACIÓN\n\nEsta liquidación será devuelta al estado de borrador para correcciones.\n\n¿Confirmas el rechazo?'
  );

  const handleMarkAsPaid = () => updateLiquidationStatus(
    'paid',
    '💰 MARCAR COMO PAGADA\n\nEsta liquidación será marcada como pagada y el proceso estará completo.\n\n¿Confirmas que el pago fue realizado?'
  );

  const handleCancel = () => updateLiquidationStatus(
    'cancelled',
    '🚫 CANCELAR LIQUIDACIÓN\n\nEsta liquidación será cancelada.\n\nPuedes restaurarla posteriormente si es necesario.\n\n¿Confirmas la cancelación?'
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Función para limpiar caracteres con encoding incorrecto
  const cleanText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/Ã¡/g, 'á')  // á
      .replace(/Ã©/g, 'é')  // é
      .replace(/Ã­/g, 'í')  // í
      .replace(/Ã³/g, 'ó')  // ó
      .replace(/Ãº/g, 'ú')  // ú
      .replace(/Ã±/g, 'ñ')  // ñ
      .replace(/Ã/g, 'Á')   // Á
      .replace(/�/g, 'é')   // Reemplazar símbolos raros comunes
      .replace(/Ã/g, 'ñ')   // Otro patrón común para ñ
      .trim();
  };

  const formatPeriod = (year: number, month: number) => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  // ✅ FUNCIÓN PARA CALCULAR TOTAL DESCUENTOS DINÁMICAMENTE (igual que en PDF)
  const calculateTotalDeductions = (liq: LiquidationDetail) => {
    return (liq.afp_amount || 0) + 
           (liq.afp_commission_amount || 0) +
           (liq.health_amount || 0) + 
           (liq.unemployment_amount || 0) + 
           (liq.income_tax_amount || 0) +
           (liq.loan_deductions || 0) +
           (liq.advance_payments || 0) +
           (liq.apv_amount || 0) +
           (liq.other_deductions || 0);
  };

  // ✅ CALCULAR LÍQUIDO A PAGAR DINÁMICAMENTE
  const calculateNetSalary = (liq: LiquidationDetail) => {
    return liq.total_gross_income - calculateTotalDeductions(liq);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_CONFIG[status as LiquidationStatus] || STATUS_CONFIG.draft;
    const IconComponent = statusConfig.icon;
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {statusConfig.label}
      </span>
    );
  };

  // 🎯 FUNCIÓN: Generar botones contextuales según estado actual
  const getActionButtons = () => {
    if (!liquidation) return null;
    
    const currentStatus = liquidation.status as LiquidationStatus;
    const availableActions = WORKFLOW_TRANSITIONS[currentStatus] || [];
    
    const buttons = [];
    
    // Botones específicos según transiciones disponibles
    availableActions.forEach(targetStatus => {
      switch (targetStatus) {
        case 'review':
          buttons.push(
            <Button 
              key="submit-review"
              variant="warning"
              size="sm"
              onClick={handleSubmitForReview}
              disabled={updatingStatus}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar a Revisión
            </Button>
          );
          break;
          
        case 'approved':
          buttons.push(
            <Button 
              key="approve"
              variant="success"
              size="sm"
              onClick={handleApprove}
              disabled={updatingStatus}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar
            </Button>
          );
          break;
          
        case 'paid':
          buttons.push(
            <Button 
              key="mark-paid"
              variant="primary"
              size="sm"
              onClick={handleMarkAsPaid}
              disabled={updatingStatus}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Marcar Pagada
            </Button>
          );
          break;
          
        case 'draft':
          buttons.push(
            <Button 
              key="reject"
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={updatingStatus}
            >
              <X className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
          );
          break;
          
        case 'cancelled':
          buttons.push(
            <Button 
              key="cancel"
              variant="danger"
              size="sm"
              onClick={handleCancel}
              disabled={updatingStatus}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          );
          break;
      }
    });
    
    // Botón de eliminar (siempre disponible, pero con confirmación extra)
    if (currentStatus === 'draft') {
      buttons.push(
        <Button 
          key="delete"
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={updatingStatus}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      );
    }
    
    return buttons;
  };


  const handleDownloadPDF = async () => {
    if (!liquidation) return;
    
    try {
      setDownloadingPDF(true);
      
      console.log('🔍 Iniciando descarga PDF para liquidación:', liquidationId);
      
      // Llamar a la API de exportación con la liquidación existente
      const response = await fetch(`/api/payroll/liquidations/export?company_id=${COMPANY_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          liquidation_id: liquidationId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Crear un blob con el contenido HTML y abrir en nueva ventana para imprimir/descargar
        const htmlContent = data.data.html;
        const filename = data.data.filename;
        
        console.log('✅ Liquidación HTML recibida. Generando archivo:', filename);
        
        const newWindow = window.open('', '_blank');
        
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
          
          // Esperar a que se cargue el contenido y luego mostrar diálogo de impresión
          setTimeout(() => {
            newWindow.print();
          }, 1000);
          
          console.log('✅ PDF generado exitosamente con formato completo');
        } else {
          // Fallback: crear blob y descargar directamente
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename.replace('.pdf', '.html');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          console.log('✅ HTML descargado como fallback');
        }
      } else {
        setError(data.error || 'Error al generar PDF');
        console.error('❌ Error en API export:', data.error);
      }
    } catch (error) {
      setError('Error de conexión al generar PDF');
      console.error('❌ Error downloading PDF:', error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadDirectPDF = () => {
    if (!liquidation) return;
    
    try {
      setDownloadingPDF(true);
      
      console.log('🔍 Generando PDF directo para liquidación:', liquidationId);
      
      // Crear PDF usando jsPDF
      const pdf = new jsPDF();
      
      // Configuración
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const lineHeight = 7;
      let yPosition = margin;
      
      // Helper para agregar texto
      const addText = (text: string, x = margin, fontSize = 12, style = 'normal') => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', style);
        pdf.text(text, x, yPosition);
        yPosition += lineHeight;
      };
      
      // Header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LIQUIDACIÓN DE SUELDO', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight * 2;
      
      // Período
      pdf.setFontSize(14);
      pdf.text(formatPeriod(liquidation.period_year, liquidation.period_month), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight * 2;
      
      // Datos del empleado
      addText('DATOS DEL TRABAJADOR', margin, 14, 'bold');
      addText(`Nombre: ${liquidation.employee.first_name} ${liquidation.employee.last_name}`);
      addText(`RUT: ${liquidation.employee.rut}`);
      addText(`Días Trabajados: ${liquidation.days_worked}`);
      yPosition += lineHeight;
      
      // Haberes
      addText('HABERES', margin, 14, 'bold');
      addText(`Sueldo Base: ${formatCurrency(liquidation.base_salary)}`);
      if (liquidation.overtime_amount > 0) addText(`Horas Extras: ${formatCurrency(liquidation.overtime_amount)}`);
      if (liquidation.bonuses > 0) addText(`Bonos: ${formatCurrency(liquidation.bonuses)}`);
      if (liquidation.commissions > 0) addText(`Comisiones: ${formatCurrency(liquidation.commissions)}`);
      if (liquidation.gratification > 0) addText(`Gratificación: ${formatCurrency(liquidation.gratification)}`);
      if (liquidation.legal_gratification_art50 > 0) addText(`Gratificación Legal Art. 50: ${formatCurrency(liquidation.legal_gratification_art50)}`);
      if (liquidation.food_allowance > 0) addText(`Colación: ${formatCurrency(liquidation.food_allowance)}`);
      if (liquidation.transport_allowance > 0) addText(`Movilización: ${formatCurrency(liquidation.transport_allowance)}`);
      if (liquidation.family_allowance > 0) addText(`Asignación Familiar: ${formatCurrency(liquidation.family_allowance)}`);
      
      addText(`TOTAL HABERES: ${formatCurrency(liquidation.total_gross_income)}`, margin, 12, 'bold');
      yPosition += lineHeight;
      
      // Descuentos
      addText('DESCUENTOS', margin, 14, 'bold');
      addText(`AFP (${liquidation.afp_percentage}%): ${formatCurrency(liquidation.afp_amount)}`);
      addText(`Comisión AFP (${liquidation.afp_commission_percentage}%): ${formatCurrency(liquidation.afp_commission_amount)}`);
      addText(`Salud (${liquidation.health_percentage}%): ${formatCurrency(liquidation.health_amount)}`);
      if (liquidation.unemployment_amount > 0) addText(`Cesantía (${liquidation.unemployment_percentage}%): ${formatCurrency(liquidation.unemployment_amount)}`);
      if (liquidation.income_tax_amount > 0) addText(`Impuesto Único: ${formatCurrency(liquidation.income_tax_amount)}`);
      if (liquidation.loan_deductions > 0) addText(`Préstamos: ${formatCurrency(liquidation.loan_deductions)}`);
      if (liquidation.advance_payments > 0) addText(`Anticipos: ${formatCurrency(liquidation.advance_payments)}`);
      if (liquidation.apv_amount > 0) addText(`APV: ${formatCurrency(liquidation.apv_amount)}`);
      if (liquidation.other_deductions > 0) addText(`Otros: ${formatCurrency(liquidation.other_deductions)}`);
      
      addText(`TOTAL DESCUENTOS: ${formatCurrency(calculateTotalDeductions(liquidation))}`, margin, 12, 'bold');
      yPosition += lineHeight * 2;
      
      // Líquido a pagar
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`LÍQUIDO A PAGAR: ${formatCurrency(calculateNetSalary(liquidation))}`, pageWidth / 2, yPosition, { align: 'center' });
      
      // Descargar
      const fileName = `liquidacion_${liquidation.employee.rut}_${liquidation.period_year}_${String(liquidation.period_month).padStart(2, '0')}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF directo generado exitosamente:', fileName);
      
    } catch (error) {
      setError('Error al generar PDF directo');
      console.error('❌ Error generating direct PDF:', error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleEdit = () => {
    // TODO: Implementar página de edición completa
    // Por ahora, mostrar modal de confirmación o redireccionar a generación con datos prellenados
    const confirmed = confirm('¿Deseas editar esta liquidación?\n\nNota: Esta funcionalidad abrirá la liquidación en modo edición.');
    if (confirmed) {
      // Opción 1: Página de edición dedicada (futuro)
      // router.push(`/payroll/liquidations/${liquidationId}/edit`);
      
      // Opción 2: Redirigir a generación con parámetros (implementación inicial)
      router.push(`/payroll/liquidations/generate?edit=${liquidationId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PayrollHeader 
          title="Liquidación de Sueldo"
          subtitle="Cargando detalles..."
          showBackButton
          backUrl="/payroll/liquidations"
        />
        <div className="max-w-4xl mx-auto py-6 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando liquidación...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !liquidation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PayrollHeader 
          title="Liquidación de Sueldo"
          subtitle="Error al cargar"
          showBackButton
          backUrl="/payroll/liquidations"
        />
        <div className="max-w-4xl mx-auto py-6 px-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-900 mb-2">
                  {error || 'Liquidación no encontrada'}
                </h3>
                <p className="text-red-700 mb-6">
                  No se pudo cargar la información de la liquidación solicitada.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/payroll/liquidations')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a Liquidaciones
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="print:hidden">
        <PayrollHeader 
          title="Liquidación de Sueldo"
          subtitle={`${cleanText(liquidation.employee.first_name)} ${cleanText(liquidation.employee.last_name)} - ${formatPeriod(liquidation.period_year, liquidation.period_month)}`}
          showBackButton
          backUrl="/payroll/liquidations"
          actions={
            <div className="w-full space-y-4">
              {/* Badge de estado - moderno y destacado */}
              <div className="flex justify-center sm:justify-start">
                <div className="px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-green-700 font-medium text-sm">Aprobada</span>
                  </div>
                </div>
              </div>
              
              {/* Botones modernos - glass effect */}
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                
                {/* Botones de workflow contextuales - modernos */}
                <button
                  onClick={handleMarkAsPaid}
                  className="group relative px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 backdrop-blur-sm transition-all duration-200 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <DollarSign className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">Marcar Pagada</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>

                <button
                  onClick={handleCancel}
                  className="group relative px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 backdrop-blur-sm transition-all duration-200 flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
                >
                  <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">Cancelar</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
                
                {/* Botón Editar (solo para borradores) - estilo moderno */}
                {liquidation.status === 'draft' && (
                  <button
                    onClick={handleEdit}
                    className="group relative px-4 py-2.5 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/20 hover:border-gray-500/40 backdrop-blur-sm transition-all duration-200 flex items-center gap-2 text-gray-600 hover:text-gray-700 font-medium"
                  >
                    <Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Editar</span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                )}
                
                {/* Botón Descargar PDF - más prominente y moderno */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="group relative px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 hover:border-purple-500/50 backdrop-blur-sm transition-all duration-200 flex items-center gap-2 text-purple-700 hover:text-purple-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">
                    {downloadingPDF ? 'Generando...' : 'Descargar PDF'}
                  </span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {downloadingPDF && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse"></div>
                  )}
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* 🎯 MENSAJES DE ÉXITO/ERROR */}
      {successMessage && (
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <X className="h-4 w-4" />
            <span className="font-medium">{error}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-auto p-1 h-auto"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto py-6 px-4 print:py-0 print:px-0 print:max-w-none">
        {/* Header de liquidación para impresión */}
        <div className="hidden print:block mb-8 border-b-2 border-gray-800 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LIQUIDACIÓN DE SUELDO</h1>
              <p className="text-lg text-gray-700 mt-1">
                {formatPeriod(liquidation.period_year, liquidation.period_month)}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center text-gray-600 mb-2">
                <Building className="h-4 w-4 mr-2" />
                <span>ContaPyme Demo</span>
              </div>
              <div className="text-sm text-gray-500">
                Fecha: {formatDate(new Date().toISOString().split('T')[0])}
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 HERO SECTION - Información destacada del empleado y resultado */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 print:bg-white print:border-gray-300">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Información del empleado */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {cleanText(liquidation.employee.first_name)} {cleanText(liquidation.employee.last_name)}
                      </h2>
                      <p className="text-gray-600">RUT: {liquidation.employee.rut}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {formatPeriod(liquidation.period_year, liquidation.period_month)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{liquidation.days_worked} días trabajados</span>
                    </div>
                  </div>
                </div>

                {/* Resultado destacado */}
                <div className="lg:text-right">
                  <div className="text-sm text-gray-600 mb-2">Líquido a Pagar</div>
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {formatCurrency(calculateNetSalary(liquidation))}
                  </div>
                  <div className="text-xs text-gray-500">
                    Estado: {getStatusBadge(liquidation.status)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 📊 MÉTRICAS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-green-200 bg-green-50/50 print:bg-white">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(liquidation.total_gross_income)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Haberes</div>
              <div className="text-xs text-gray-500 mt-2">
                Imponible: {formatCurrency(liquidation.total_taxable_income)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                (Incluye Imponibles y No Imponibles)
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200 bg-red-50/50 print:bg-white">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-700">
                {formatCurrency(calculateTotalDeductions(liquidation))}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Descuentos</div>
              <div className="text-xs text-gray-500 mt-2">
                Previsionales + Otros
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50/50 print:bg-white">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(calculateNetSalary(liquidation))}
              </div>
              <div className="text-sm text-gray-600 mt-1">Líquido Final</div>
              <div className="text-xs text-gray-500 mt-2">
                Total Haberes - Total Descuentos
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 📋 DESGLOSE DETALLADO MEJORADO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 💰 HABERES */}
          <Card className="border-green-200 print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span>Haberes</span>
                </div>
                <span className="text-lg font-bold text-green-700">
                  {formatCurrency(liquidation.total_gross_income)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Haberes Imponibles */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Haberes Imponibles
                  </h4>
                  <span className="text-sm font-medium text-green-700">
                    {formatCurrency(liquidation.total_taxable_income)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sueldo Base</span>
                    <span className="font-medium">{formatCurrency(liquidation.base_salary)}</span>
                  </div>
                  {liquidation.overtime_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Horas Extras</span>
                      <span className="font-medium">{formatCurrency(liquidation.overtime_amount)}</span>
                    </div>
                  )}
                  {liquidation.bonuses > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bonos</span>
                      <span className="font-medium">{formatCurrency(liquidation.bonuses)}</span>
                    </div>
                  )}
                  {liquidation.commissions > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Comisiones</span>
                      <span className="font-medium">{formatCurrency(liquidation.commissions)}</span>
                    </div>
                  )}
                  {liquidation.gratification > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Gratificación</span>
                      <span className="font-medium">{formatCurrency(liquidation.gratification)}</span>
                    </div>
                  )}
                  {liquidation.legal_gratification_art50 > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Gratificación Legal Art. 50</span>
                      <span className="font-medium text-blue-700">{formatCurrency(liquidation.legal_gratification_art50)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Haberes No Imponibles */}
              {(liquidation.food_allowance > 0 || liquidation.transport_allowance > 0 || liquidation.family_allowance > 0) && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Haberes No Imponibles
                    </h4>
                    <span className="text-sm font-medium text-green-700">
                      {formatCurrency(liquidation.total_non_taxable_income)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {liquidation.food_allowance > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Colación</span>
                        <span className="font-medium">{formatCurrency(liquidation.food_allowance)}</span>
                      </div>
                    )}
                    {liquidation.transport_allowance > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Movilización</span>
                        <span className="font-medium">{formatCurrency(liquidation.transport_allowance)}</span>
                      </div>
                    )}
                    {liquidation.family_allowance > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Asignación Familiar</span>
                        <span className="font-medium">{formatCurrency(liquidation.family_allowance)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 💸 DESCUENTOS */}
          <Card className="border-red-200 print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span>Descuentos</span>
                </div>
                <span className="text-lg font-bold text-red-700">
                  {formatCurrency(calculateTotalDeductions(liquidation))}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Descuentos Previsionales */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Descuentos Previsionales
                  </h4>
                  <span className="text-sm font-medium text-red-700">
                    {formatCurrency(liquidation.afp_amount + liquidation.afp_commission_amount + liquidation.health_amount + liquidation.unemployment_amount)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">AFP ({liquidation.afp_percentage}%)</span>
                    <span className="font-medium">{formatCurrency(liquidation.afp_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Comisión AFP ({liquidation.afp_commission_percentage}%)</span>
                    <span className="font-medium">{formatCurrency(liquidation.afp_commission_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Salud ({liquidation.health_percentage}%)</span>
                    <span className="font-medium">{formatCurrency(liquidation.health_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cesantía ({liquidation.unemployment_percentage}%)</span>
                    <span className="font-medium">{formatCurrency(liquidation.unemployment_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Otros Descuentos */}
              {(liquidation.other_deductions > 0) && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Otros Descuentos
                    </h4>
                    <span className="text-sm font-medium text-red-700">
                      {formatCurrency(liquidation.other_deductions)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Otros descuentos</span>
                      <span className="font-medium">{formatCurrency(liquidation.other_deductions)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 🎯 RESUMEN FINAL DESTACADO */}
        <Card className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border-2 border-blue-300 mb-8">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Resumen Final</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Total Haberes</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(liquidation.total_gross_income)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Total Descuentos</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(calculateTotalDeductions(liquidation))}
                  </div>
                </div>
                <div className="text-center border-l border-blue-300 md:pl-6">
                  <div className="text-sm text-gray-600 mb-1">Líquido a Pagar</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(calculateNetSalary(liquidation))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Para transferir al empleado
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Estado Actual</label>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(liquidation.status)}
                    <span className="text-xs text-gray-500">• {STATUS_CONFIG[liquidation.status as LiquidationStatus]?.description || 'Estado válido'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Creado</label>
                  <p className="text-gray-900">
                    {formatDate(liquidation.created_at.split('T')[0], 'long')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Última Modificación</label>
                  <p className="text-gray-900">
                    {formatDate(liquidation.updated_at.split('T')[0], 'long')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">ID de Referencia</label>
                  <p className="text-gray-900 font-mono text-sm bg-gray-50 px-2 py-1 rounded">
                    {liquidation.id.split('-')[0]}...
                  </p>
                </div>
              </div>
              
              {/* 🎯 WORKFLOW DE ESTADO */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Workflow de Estados</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {STATUS_CONFIG[liquidation.status as LiquidationStatus]?.description || 'Estado válido'}
                    </p>
                    
                    {/* Transiciones disponibles */}
                    {WORKFLOW_TRANSITIONS[liquidation.status as LiquidationStatus]?.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-600">Próximos estados posibles: </span>
                        {WORKFLOW_TRANSITIONS[liquidation.status as LiquidationStatus].map((nextStatus, index) => (
                          <span key={nextStatus} className="text-xs text-blue-600">
                            {STATUS_CONFIG[nextStatus]?.label}
                            {index < WORKFLOW_TRANSITIONS[liquidation.status as LiquidationStatus].length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Utiliza Ctrl+P para imprimir</div>
                    {updatingStatus && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                        Actualizando...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer para impresión */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
          <p>Este documento fue generado automáticamente por ContaPyme el {formatDate(new Date().toISOString().split('T')[0])}</p>
        </div>
      </div>
    </div>
  );
}