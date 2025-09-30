import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  elementId: string;
  employeeName: string;
  period: string;
}

/**
 * Exportar elemento HTML a PDF
 * Función simple y eficiente para generar PDFs profesionales
 */
export const exportToPDF = async (options: PDFExportOptions): Promise<boolean> => {
  try {
    const {
      filename = `liquidacion-${options.employeeName.replace(/\s+/g, '-')}-${options.period.replace(/\s+/g, '-')}.pdf`,
      elementId,
      employeeName,
      period
    } = options;

    console.log('🔄 Iniciando exportación PDF...');

    // Obtener el elemento HTML
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('❌ Elemento no encontrado:', elementId);
      return false;
    }

    // Configurar opciones para captura de alta calidad
    const canvas = await html2canvas(element, {
      scale: 2, // Alta resolución
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0
    });

    // Calcular dimensiones para PDF (A4)
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Crear PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Si la imagen es más alta que A4, dividir en páginas
    if (imgHeight <= 297) { // A4 height in mm
      // Cabe en una página
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      // Múltiples páginas
      const totalPages = Math.ceil(imgHeight / 297);
      const pageHeight = 297;
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        
        const yOffset = -(i * pageHeight * canvas.width / imgWidth);
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95), 
          'JPEG', 
          0, 
          yOffset, 
          imgWidth, 
          imgHeight
        );
      }
    }

    // Guardar PDF
    pdf.save(filename);
    
    console.log('✅ PDF exportado exitosamente:', filename);
    return true;

  } catch (error) {
    console.error('❌ Error al exportar PDF:', error);
    return false;
  }
};

/**
 * Generar nombre de archivo PDF limpio
 */
export const generatePDFFilename = (employeeName: string, period: string): string => {
  const cleanName = employeeName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, '-');
  
  const cleanPeriod = period
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, '-');
  
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  return `liquidacion-${cleanName}-${cleanPeriod}-${timestamp}.pdf`;
};