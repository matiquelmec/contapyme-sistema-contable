// OCR Parser para PDFs escaneados
// npm install tesseract.js

export async function performOCR(imageData: Blob): Promise<string> {
  // Cargar Tesseract dinámicamente solo cuando se necesite
  const Tesseract = await import('tesseract.js');
  
  const result = await Tesseract.recognize(
    imageData,
    'spa', // Español
    {
      logger: (info) => console.log('OCR Progress:', info)
    }
  );
  
  return result.data.text;
}

// Convertir PDF a imágenes para OCR
export async function pdfToImages(file: File): Promise<Blob[]> {
  // Usar pdf-to-img o similar
  // Por ahora retornamos array vacío
  return [];
}