# 📊 Data - Datos Estáticos y Configuraciones

Esta carpeta contiene todos los datos estáticos, configuraciones y estructuras de datos predefinidas del sistema.

## 📄 Archivos de Datos

### **📋 Planes de Cuentas**

#### **planDeCuentasChilenoFinal.ts**
- **Propósito**: Plan de cuentas IFRS oficial para Chile
- **Estructura**: Árbol jerárquico de cuentas contables
- **Características**:
  - ✅ Compatible con SII (Servicio de Impuestos Internos)
  - ✅ Estándar IFRS internacional
  - ✅ Adaptado para PyMEs chilenas
  - ✅ Más de 200 cuentas predefinidas

#### **planDeCuentasChileno.ts**
- **Propósito**: Versión base del plan de cuentas
- **Estado**: Legacy - mantenido para compatibilidad

#### **planDeCuentasChilenoActualizado.ts** 
- **Propósito**: Versión intermedia con actualizaciones
- **Estado**: Deprecado en favor de `Final`

#### **chartOfAccounts.ts**
- **Propósito**: Funciones auxiliares para manejo de cuentas
- **Características**:
  - Búsqueda de cuentas por código
  - Validación de códigos contables
  - Generación de reportes de cuentas

## 🏗️ Estructura de Datos

### **Cuenta Contable**
```typescript
interface Account {
  code: string;          // "1.1.01.001"
  name: string;          // "Caja"
  type: AccountType;     // "Asset" | "Liability" | "Equity"
  category: string;      // "Activo Corriente"
  level: number;         // 1-5 (nivel de jerarquía)
  parent?: string;       // Código de cuenta padre
  isDebitBalance: boolean; // true para activos
  description?: string;    // Descripción detallada
}
```

### **Tipos de Cuenta**
```typescript
enum AccountType {
  Asset = 'Asset',           // Activos
  Liability = 'Liability',   // Pasivos  
  Equity = 'Equity',         // Patrimonio
  Revenue = 'Revenue',       // Ingresos
  Expense = 'Expense'        // Gastos
}
```

## 🎯 Clasificación de Cuentas

### **1. Activos (1.x.xx.xxx)**
- **1.1** - Activos Corrientes
  - 1.1.01 - Efectivo y Equivalentes
  - 1.1.02 - Deudores Comerciales
  - 1.1.03 - Inventarios
- **1.2** - Activos No Corrientes
  - 1.2.01 - Propiedades, Planta y Equipo
  - 1.2.02 - Intangibles

### **2. Pasivos (2.x.xx.xxx)**
- **2.1** - Pasivos Corrientes
  - 2.1.01 - Acreedores Comerciales
  - 2.1.02 - Préstamos Bancarios
- **2.2** - Pasivos No Corrientes

### **3. Patrimonio (3.x.xx.xxx)**
- **3.1** - Capital
- **3.2** - Resultados Acumulados

### **4. Ingresos (4.x.xx.xxx)**
- **4.1** - Ingresos Operacionales
- **4.2** - Ingresos No Operacionales

### **5. Gastos (5.x.xx.xxx)**
- **5.1** - Costos de Ventas
- **5.2** - Gastos de Administración

## 🔧 Uso en el Sistema

### **Inicialización Automática**
```typescript
import { planDeCuentasChilenoFinal } from '@/lib/data';

// Cargar plan de cuentas por defecto
await initializeChartOfAccounts(planDeCuentasChilenoFinal);
```

### **Búsqueda de Cuentas**
```typescript
import { findAccountByCode, getAccountsByType } from '@/lib/data';

// Buscar cuenta específica
const cashAccount = findAccountByCode("1.1.01.001");

// Obtener todas las cuentas de activo
const assets = getAccountsByType("Asset");
```

### **Validación**
```typescript
import { validateAccountCode, isValidTransaction } from '@/lib/data';

// Validar código de cuenta
const isValid = validateAccountCode("1.1.01.001"); // true

// Validar transacción contable
const transaction = {
  debit: { account: "1.1.01.001", amount: 100000 },
  credit: { account: "4.1.01.001", amount: 100000 }
};
const isBalanced = isValidTransaction(transaction); // true
```

## 📊 Reportes Predefinidos

### **Balance General**
- Estructura automática según plan de cuentas
- Agrupación por tipo y categoría
- Cálculos automáticos de totales

### **Estado de Resultados**
- Ingresos vs Gastos por período
- Resultado operacional y no operacional
- Utilidad/pérdida neta

### **Libro Diario**
- Asientos contables cronológicos
- Validación de partida doble
- Referencias cruzadas entre cuentas

## 🚀 Personalización

### **Plan de Cuentas Personalizado**
```typescript
// Extender plan base con cuentas específicas
const customPlan = {
  ...planDeCuentasChilenoFinal,
  "1.1.01.010": {
    code: "1.1.01.010",
    name: "Caja Chica Sucursal Norte",
    type: "Asset",
    category: "Efectivo",
    level: 4,
    parent: "1.1.01.001"
  }
};
```

### **Configuraciones por Industria**
- **Retail**: Cuentas de inventario especializadas
- **Servicios**: Cuentas de ingresos diferidos
- **Manufactura**: Cuentas de WIP y materias primas

## 📋 Mantenimiento

### **Actualización de Planes**
1. **Backup del plan actual**
2. **Migración de datos existentes**
3. **Validación de integridad**
4. **Deploy gradual**

### **Versionado**
- `v1.0`: Plan base inicial
- `v2.0`: Adaptación IFRS completa
- `v3.0`: Optimización para PyMEs

---

**Estándar**: IFRS para PyMEs (Chile)  
**Última actualización**: SII 2024  
**Mantenido por**: Contador Público certificado