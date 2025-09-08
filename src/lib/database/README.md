# 🗄️ Database - Acceso a Datos

Esta carpeta centraliza toda la configuración y acceso a la base de datos Supabase.

## 📄 Archivos

### **supabase.ts**
- **Propósito**: Cliente base de Supabase
- **Configuración**: Cliente autenticado para operaciones generales
- **Uso**:
  ```typescript
  import { supabase } from '@/lib/database';
  const { data, error } = await supabase.from('table').select();
  ```

### **supabaseConfig.ts** 
- **Propósito**: Configuración y validación de variables de entorno
- **Características**:
  - Validación automática de credenciales
  - Logging de configuración para debugging
  - Manejo de errores de conexión

### **databaseSimple.ts**
- **Propósito**: Funciones especializadas y optimizadas
- **Características**:
  - Funciones high-level para operaciones comunes
  - Manejo automático de errores
  - Validación de datos
- **Funciones principales**:
  ```typescript
  // F29 Operations
  insertF29Form(formData)
  getF29Forms()
  
  // Indicators
  getIndicatorsByCategory()
  updateIndicatorValue()
  
  // Fixed Assets
  getFixedAssets()
  createFixedAsset()
  ```

## 🔐 Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## 🏗️ Arquitectura de Datos

### **Tablas Principales**

1. **f29_analysis_forms**
   - Almacena formularios F29 parseados
   - Índices por período, RUT, fecha

2. **economic_indicators** 
   - Indicadores económicos en tiempo real
   - UF, UTM, USD, EUR, etc.

3. **fixed_assets**
   - Gestión completa de activos fijos
   - Cálculos automáticos de depreciación

4. **chart_of_accounts**
   - Plan de cuentas IFRS para Chile
   - Importación/exportación CSV

## 📊 Funciones PostgreSQL

```sql
-- Obtener indicadores por categoría
SELECT * FROM get_indicators_by_category('monetary');

-- Último valor de indicador
SELECT get_latest_indicator_value('uf');
```

## 🚀 Optimizaciones

### **Índices Implementados**
- `f29_analysis_forms(period, rut)`
- `economic_indicators(code, date)`
- `fixed_assets(status, depreciation_percentage)`

### **Triggers Automáticos**
- `updated_at` en todas las tablas
- Validaciones de integridad referencial
- Constraints únicos por entidad

## 🔧 Debugging

Para verificar conexión:
```bash
# Endpoint de debug
GET /api/debug/supabase
```

El endpoint retorna:
- ✅ Estado de conexión
- 📊 Configuración actual (sin credenciales)
- 🔍 Tablas disponibles
- 📈 Estadísticas básicas

## 🛡️ Seguridad

### **Row Level Security (RLS)**
- Habilitado en todas las tablas sensibles
- Políticas por usuario y role
- Filtrado automático por sesión

### **Service Role vs Anon Key**
- **Anon Key**: Operaciones públicas (lectura de indicadores)
- **Service Role**: Operaciones administrativas (inserción F29)

---

**Base de Datos**: Supabase PostgreSQL 15  
**Región**: US East  
**Backup**: Automático cada 24h