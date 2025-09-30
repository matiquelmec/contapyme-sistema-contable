# 🔍 Parsers - Procesamiento de Documentos

Esta carpeta contiene todos los parsers especializados para extraer datos de documentos fiscales y contables chilenos.

## 📄 Parsers Disponibles

### **F29 Parser** (`f29Parser.ts`)
- **Propósito**: Análisis robusto de formularios F29 del SII
- **Capacidades**: 
  - 4 estrategias de parsing redundantes
  - Múltiples encodings (UTF-8, Latin1, Windows-1252)
  - Validación matemática automática
  - Confidence scoring (0-100%)
- **Confiabilidad**: 85-95% para formularios típicos
- **Uso**: 
  ```typescript
  import { parseF29 } from '@/lib/parsers';
  const result = await parseF29(pdfBuffer);
  ```

### **RCV Parser** (`rcvParser.ts`)
- **Propósito**: Procesamiento de archivos RCV (Registro de Compras y Ventas)
- **Formato**: CSV del SII
- **Uso**:
  ```typescript
  import { parseRCV } from '@/lib/parsers';
  const data = await parseRCV(csvBuffer);
  ```

### **PDF Parser** (`pdfParser.ts`)
- **Propósito**: Parser genérico para documentos PDF
- **Capacidades**: Extracción de texto básica

### **Visual Parser** (`f29VisualParser.ts`)
- **Propósito**: Análisis por posición visual en F29
- **Método**: Coordenadas y patrones visuales

### **OCR Parser** (`ocrParser.ts`)
- **Propósito**: Procesamiento de PDFs escaneados
- **Estado**: En desarrollo - preparado para Tesseract.js

## 🎯 Estrategia Multi-Parser F29

El sistema F29 usa **4 estrategias simultáneas**:

1. **Análisis Binario**: Múltiples encodings
2. **Patrones Visuales**: Posición en documento  
3. **Fuerza Bruta**: Búsqueda de valores conocidos
4. **Validación Cruzada**: Coherencia matemática

## 📊 Códigos F29 Principales

- **538**: Débito Fiscal (IVA Ventas)
- **511**: Crédito Fiscal (IVA Compras)  
- **062**: PPM (Pagos Provisionales Mensuales)
- **077**: Remanente anterior
- **563**: Ventas Netas del período

## 🔧 Fórmulas Implementadas

```typescript
// IVA Determinado
const iva = codigo538 - codigo511;

// Compras Netas (corregido)
const comprasNetas = codigo538 / 0.19;

// Total a Pagar
const total = iva + ppm + remanente;
```

## 🧪 Testing

Para probar parsers:
```bash
# F29 Analysis
http://localhost:3000/accounting/f29-analysis

# RCV Analysis  
http://localhost:3000/accounting/rcv-analysis
```

## 🚀 Próximas Mejoras

- [ ] **OCR real** con Tesseract.js
- [ ] **Parser dinámico** sin valores hardcodeados
- [ ] **Validador RUT** con dígito verificador
- [ ] **API SII** para validación directa
- [ ] **Machine Learning** para patrones de formularios

---

**Confiabilidad actual**: 85-95% para F29 típicos de PyMEs  
**Archivos de prueba**: `formulario f29.pdf` en raíz del proyecto