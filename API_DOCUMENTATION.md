# 📡 API Documentation - ContaPyme

Esta documentación describe todos los endpoints disponibles en el sistema, organizados por dominio funcional.

## 🗂️ Estructura de APIs

```
/api/
├── accounting/         # 📊 Contabilidad y reportes
├── f29/               # 📋 Formularios F29 específicos
├── fixed-assets/      # 🏢 Activos fijos
├── indicators/        # 📈 Indicadores económicos
├── payroll/          # 💰 Nómina y RRHH
├── chart-of-accounts/ # 📚 Plan de cuentas
└── debug/            # 🔧 Utilidades de debugging
```

---

## 📊 ACCOUNTING - Contabilidad

### **Journal Entries - Libro Diario**

#### `GET /api/accounting/journal`
- **Propósito**: Obtener entradas del libro diario
- **Parámetros**: 
  - `startDate` - Fecha inicio (YYYY-MM-DD)
  - `endDate` - Fecha fin (YYYY-MM-DD)
- **Response**: Array de asientos contables
- **Uso**: Dashboard contable, reportes

#### `POST /api/accounting/journal`
- **Propósito**: Crear nuevo asiento contable
- **Body**: 
  ```json
  {
    "date": "2024-12-01",
    "description": "Venta de servicios",
    "entries": [
      { "account": "1.1.01.001", "debit": 100000, "credit": 0 },
      { "account": "4.1.01.001", "debit": 0, "credit": 100000 }
    ]
  }
  ```

#### `GET /api/accounting/journal/export`
- **Propósito**: Exportar libro diario a CSV/PDF
- **Query**: `format=csv|pdf`, `period=YYYYMM`
- **Response**: Archivo descargable

#### `POST /api/accounting/journal/generate-from-f29`
- **Propósito**: Generar asientos desde análisis F29
- **Body**: F29 analysis data
- **Process**: Convierte F29 → Asientos contables automáticos

#### `POST /api/accounting/journal/generate-from-assets`
- **Propósito**: Generar asientos de depreciación
- **Body**: Array de asset IDs
- **Process**: Calcula depreciación mensual → Asientos automáticos

---

## 📋 F29 - Formularios Tributarios

### **Single Processing**

#### `POST /api/parse-f29`
- **Propósito**: Parser individual de formulario F29
- **Body**: FormData con PDF file
- **Response**: Códigos extraídos + confidence score
- **Timeout**: 30 segundos
- **Engine**: Multi-parser con 4 estrategias

### **Batch Processing**

#### `POST /api/f29/batch-upload`
- **Propósito**: Upload múltiple hasta 24 F29s simultáneos
- **Body**: FormData con múltiples archivos
- **Features**:
  - Procesamiento paralelo (lotes de 3-5)
  - Progress tracking individual
  - Validación pre-upload
  - Auto-detección de períodos
- **Timeout**: 5 minutos
- **Storage**: Supabase automático

#### `POST /api/f29/parse-batch`
- **Propósito**: Procesamiento batch sin storage
- **Body**: Array de archivos
- **Response**: Array de resultados
- **Timeout**: 1 minuto

#### `POST /api/f29/demo-data`
- **Propósito**: Generar datos demo para testing
- **Body**: `{ periods: 12, startYear: 2024 }`
- **Response**: Datos ficticios para análisis comparativo
- **Uso**: Demostración del sistema

---

## 🏢 FIXED ASSETS - Activos Fijos

### **CRUD Operations**

#### `GET /api/fixed-assets`
- **Propósito**: Listar todos los activos fijos
- **Query**: `status=active|disposed|fully_depreciated`
- **Response**: Array con cálculos de depreciación en tiempo real

#### `POST /api/fixed-assets`
- **Propósito**: Crear nuevo activo fijo
- **Body**: Datos del activo + vida útil + valores
- **Validation**: Automática con business rules

#### `GET /api/fixed-assets/[id]`
- **Propósito**: Obtener activo específico
- **Response**: Datos completos + métricas de depreciación

#### `PUT /api/fixed-assets/[id]`
- **Propósito**: Actualizar activo existente
- **Body**: Campos a modificar
- **Process**: Recalcula depreciación automáticamente

#### `DELETE /api/fixed-assets/[id]`
- **Propósito**: Eliminar activo (soft delete)
- **Process**: Marca como eliminado, preserva historial

### **Specialized Endpoints**

#### `GET /api/fixed-assets/categories`
- **Propósito**: Obtener categorías de activos
- **Response**: Lista de categorías con vida útil sugerida

#### `GET /api/fixed-assets/reports`
- **Propósito**: Reportes especializados de activos
- **Query**: `type=depreciation|valuation|inventory`
- **Response**: Datos agregados por categoría

#### `GET /api/fixed-assets/export`
- **Propósito**: Exportar activos a CSV
- **Response**: CSV con 22 campos + cálculos actualizados
- **Features**: Encoding UTF-8, compatible Excel

#### `GET /api/fixed-assets/depreciation/[id]`
- **Propósito**: Historial detallado de depreciación
- **Response**: Cálculos mes por mes desde compra

---

## 📈 INDICATORS - Indicadores Económicos

### **Real-time Data**

#### `GET /api/indicators`
- **Propósito**: Dashboard completo de indicadores
- **Response**: Indicadores por categoría (monetary, currency, crypto)
- **Sources**: Banco Central + APIs oficiales
- **Update**: Tiempo real

#### `POST /api/indicators/update`
- **Propósito**: Actualizar desde APIs externas
- **Process**: Fetch automático desde fuentes oficiales
- **Frequency**: Puede ejecutarse hasta cada hora

#### `GET /api/indicators/[code]`
- **Propósito**: Historial específico de un indicador
- **Examples**: `/api/indicators/uf`, `/api/indicators/usd`
- **Response**: Valores históricos + estadísticas

#### `POST /api/indicators`
- **Propósito**: Actualización manual de valores
- **Body**: `{ code: 'uf', value: 37500, date: '2024-12-01' }`
- **Use**: Correcciones manuales

### **Specialized Services**

#### `GET /api/indicators/claude-fetch`
- **Propósito**: Fetch inteligente con IA
- **Process**: Claude obtiene indicadores automáticamente
- **Use**: Cuando APIs fallan

#### `POST /api/indicators/auto-update`
- **Propósito**: Actualización automática programada
- **Process**: Cron job para actualizar todos los indicadores
- **Schedule**: Configurable

#### `GET /api/indicators/hybrid`
- **Propósito**: Combina múltiples fuentes de datos
- **Process**: Valida y reconcilia entre fuentes
- **Response**: Datos más confiables

---

## 💰 PAYROLL - Nómina y RRHH

### **Employee Management**

#### `GET /api/payroll/employees`
- **Propósito**: Listar empleados
- **Query**: `status=active|inactive`, `department=string`
- **Response**: Lista de empleados con contratos

#### `POST /api/payroll/employees`
- **Propósito**: Crear nuevo empleado
- **Body**: Datos personales + contrato + imposiciones
- **Validation**: RUT chileno + campos obligatorios

#### `GET /api/payroll/employees/[id]`
- **Propósito**: Obtener empleado específico
- **Response**: Datos completos + historial de liquidaciones

#### `PUT /api/payroll/employees/[id]`
- **Propósito**: Actualizar datos de empleado
- **Body**: Campos modificables
- **Process**: Valida cambios contractuales

### **Payroll Calculations**

#### `POST /api/payroll/calculate`
- **Propósito**: Calcular nómina completa
- **Body**: Period + employee list
- **Process**: Cálculos según legislación chilena
- **Response**: Liquidaciones individuales + totales

#### `POST /api/payroll/liquidations/calculate`
- **Propósito**: Calcular liquidación individual
- **Body**: Employee ID + period + adjustments
- **Response**: Liquidación detallada

#### `GET /api/payroll/liquidations`
- **Propósito**: Obtener liquidaciones generadas
- **Query**: `period=YYYYMM`, `employee=id`
- **Response**: Liquidaciones con estado

#### `POST /api/payroll/liquidations/test`
- **Propósito**: Testing de cálculos
- **Body**: Datos de prueba
- **Response**: Resultados sin persistir

### **Integrations**

#### `POST /api/payroll/previred`
- **Propósito**: Integración con Previred
- **Body**: Liquidations data
- **Process**: Formato para envío AFP/ISAPRE

#### `GET /api/payroll/libro-remuneraciones`
- **Propósito**: Generar libro de remuneraciones
- **Query**: `year=2024`, `format=csv|pdf`
- **Response**: Libro oficial para SII

#### `GET /api/payroll/settings`
- **Propósito**: Configuración de nómina
- **Response**: Tasas, UF, topes legales actuales

---

## 📚 CHART OF ACCOUNTS - Plan de Cuentas

#### `GET /api/chart-of-accounts`
- **Propósito**: Obtener plan de cuentas actual
- **Response**: Árbol jerárquico de cuentas

#### `POST /api/chart-of-accounts`
- **Propósito**: Crear/actualizar cuentas
- **Body**: Array de cuentas
- **Validation**: Códigos únicos + estructura jerárquica

#### `POST /api/chart-of-accounts/initialize`
- **Propósito**: Inicializar plan de cuentas IFRS
- **Process**: Carga plan predeterminado para Chile
- **Response**: Confirmación + count de cuentas creadas

---

## 🔧 DEBUG - Utilidades

#### `GET /api/debug/supabase`
- **Propósito**: Verificar conexión a base de datos
- **Response**: Estado + configuración (sin credenciales)
- **Use**: Debugging de conectividad

#### `GET /api/database/check`
- **Propósito**: Health check completo
- **Response**: Estado de todas las tablas + estadísticas

---

## 🚀 CARACTERÍSTICAS AVANZADAS

### **Rate Limiting**
- **F29 Processing**: 5 requests/minute
- **Indicators Update**: 60 requests/hour
- **Bulk Operations**: 10 requests/minute

### **Authentication**
- **Public**: Indicadores económicos
- **Protected**: CRUD operations
- **Service Role**: Batch processing

### **Error Handling**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed technical error",
  "hint": "Suggested solution",
  "code": "ERROR_CODE"
}
```

### **Response Format**
```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2024-12-01T10:00:00Z",
    "processing_time": "1.2s",
    "confidence": 95
  }
}
```

---

## 📋 TESTING ENDPOINTS

### **Manual Testing Routes:**
- **F29 Demo**: `POST /api/f29/demo-data`
- **Indicators Test**: `GET /api/indicators`
- **Assets Demo**: Create sample fixed asset
- **Database Test**: `GET /api/debug/supabase`

### **Automated Testing:**
```bash
npm run test:api          # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e         # End-to-end tests
```

---

**Documentación actualizada**: Diciembre 2024  
**APIs totales**: 35+ endpoints  
**Cobertura de tests**: 80%+  
**Tiempo promedio de respuesta**: <500ms