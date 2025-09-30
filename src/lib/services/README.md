# ⚙️ Services - Lógica de Negocio

Esta carpeta contiene todos los servicios que implementan la lógica de negocio compleja del sistema.

## 📄 Servicios Disponibles

### **💰 Nómina y RRHH**

#### **payrollCalculator.ts**
- **Propósito**: Cálculos de nómina según legislación chilena
- **Características**:
  - Cálculo automático de imposiciones (10% AFP, 7% salud)
  - Descuentos legales y adicionales
  - Gratificación legal y bonos
- **Uso**:
  ```typescript
  import { calculatePayroll } from '@/lib/services';
  const liquidation = calculatePayroll(employee, period);
  ```

#### **liquidationService.ts**
- **Propósito**: Generación de liquidaciones de sueldo
- **Formatos**: PDF, datos estructurados
- **Integración**: Previred, SII, AFP

#### **simpleLiquidationService.ts**
- **Propósito**: Versión simplificada para PyMEs
- **Características**: Menor complejidad, UI amigable

#### **fileEmployeeStore.ts / mockEmployeeStore.ts**
- **Propósito**: Gestión de datos de empleados
- **Características**: Almacenamiento local y mock data para testing

### **📊 Indicadores Económicos**

#### **indicatorsDataService.ts**
- **Propósito**: Servicio principal de indicadores económicos
- **Fuentes**: Banco Central de Chile, APIs oficiales
- **Indicadores**:
  - 💰 UF, UTM (unidades tributarias)
  - 💱 USD, EUR (divisas)
  - 📈 IPC, TPM (índices económicos)
  - ₿ Bitcoin, Ethereum (criptomonedas)

#### **indicatorsWebFallback.ts**
- **Propósito**: Servicio de respaldo para indicadores
- **Uso**: Cuando API principal falla
- **Método**: Web scraping seguro

### **📄 Procesamiento de Documentos**

#### **pdfExport.ts**
- **Propósito**: Generación de reportes PDF
- **Capacidades**:
  - Liquidaciones de sueldo
  - Reportes de activos fijos
  - Análisis F29 con gráficos
- **Librerías**: jsPDF, html2canvas

#### **cloudOCR.ts**
- **Propósito**: OCR para documentos escaneados
- **Estado**: Preparado para integración con Tesseract.js
- **Uso futuro**: F29 escaneados, facturas

### **📈 Reportes y Analytics**

#### **reports.ts**
- **Propósito**: Generación de reportes contables
- **Tipos**:
  - Balance General
  - Estado de Resultados  
  - Libro Diario
  - Análisis de Activos Fijos

## 🎯 Patrones de Diseño

### **Service Layer Pattern**
Cada service encapsula lógica de negocio específica:

```typescript
// ✅ Correcto - lógica en service
const payroll = await calculatePayroll(employee, period);

// ❌ Incorrecto - lógica en componente
const grossSalary = employee.salary;
const afp = grossSalary * 0.10;
// ... cálculos complejos en UI
```

### **Factory Pattern**
Para creación de objetos complejos:

```typescript
// Liquidations Factory
const liquidation = LiquidationFactory.create(type, employee, period);
```

### **Strategy Pattern** 
Para múltiples algoritmos:

```typescript
// Different calculation strategies
const calculator = PayrollStrategyFactory.get(contractType);
const result = calculator.calculate(employee);
```

## 🔧 Configuración de Servicios

### **Variables de Entorno**
```env
# Indicadores económicos
MINDICADOR_API_URL=https://mindicador.cl/api
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# PDFs
PDF_TEMPLATE_PATH=/templates/pdf
PDF_OUTPUT_PATH=/tmp/pdfs
```

### **Rate Limiting**
- **Indicadores**: 60 requests/hour
- **OCR**: 10 documentos/minuto  
- **PDF Generation**: 5 reportes/minuto

## 🧪 Testing de Servicios

### **Unit Tests**
```bash
npm test -- --testPathPattern=services
```

### **Integration Tests**
```bash
# Test con datos reales
npm run test:integration
```

### **Manual Testing**
- **Payroll**: `/payroll/liquidations/generate`
- **Indicators**: `/accounting/indicators`  
- **Reports**: `/accounting/reports`

## 🚀 Próximas Mejoras

### **Corto Plazo**
- [ ] **Caché Redis** para indicadores económicos
- [ ] **Queue system** para procesamiento PDF
- [ ] **Webhooks** para notificaciones automáticas

### **Mediano Plazo**  
- [ ] **ML Service** para predicciones financieras
- [ ] **API Gateway** para rate limiting avanzado
- [ ] **Microservices** para servicios independientes

### **Largo Plazo**
- [ ] **Blockchain integration** para auditoría
- [ ] **AI Service** para análisis predictivo
- [ ] **Real-time analytics** con WebSockets

---

**Patrón arquitectónico**: Service Layer + Repository  
**Testing**: Jest + Supertest  
**Monitoreo**: Console logs + Error tracking