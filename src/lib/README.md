# 📚 Lib - Arquitectura Organizada

Esta carpeta contiene toda la lógica de negocio y utilidades del proyecto, organizada por dominio y responsabilidad.

## 📁 Estructura

```
lib/
├── data/          # 📊 Datos estáticos y configuraciones
├── database/      # 🗄️  Conexiones y adaptadores de base de datos
├── parsers/       # 🔍 Parsers de documentos (F29, RCV, PDF)
├── services/      # ⚙️  Servicios de negocio y lógica compleja
├── auth.ts        # 🔐 Autenticación y autorización
├── constants.ts   # 📋 Constantes globales
└── utils.ts       # 🛠️  Utilidades generales
```

## 🎯 Principios de Organización

### **Por Dominio**
Cada carpeta agrupa archivos relacionados funcionalmente:
- `parsers/` - Todo lo relacionado con análisis de documentos
- `services/` - Lógica de negocio compleja 
- `database/` - Acceso y configuración de datos

### **Exportaciones Centralizadas**
Cada carpeta tiene un `index.ts` para imports limpios:

```typescript
// ✅ Recomendado
import { parseF29, parseRCV } from '@/lib/parsers';
import { supabase } from '@/lib/database';

// ❌ Evitar
import { parseF29 } from '@/lib/parsers/f29Parser';
import { parseRCV } from '@/lib/parsers/rcvParser';
```

## 🚀 Cómo Agregar Nuevos Archivos

1. **Identifica el dominio**: ¿Es parser, service, data o database?
2. **Colócalo en la carpeta correcta**
3. **Exporta desde index.ts** de la carpeta
4. **Usa el import centralizado** en otros archivos

## 📖 Documentación por Carpeta

- [📊 Data](./data/README.md) - Planes de cuentas y datos estáticos
- [🗄️ Database](./database/README.md) - Conexiones Supabase
- [🔍 Parsers](./parsers/README.md) - Procesamiento de documentos
- [⚙️ Services](./services/README.md) - Lógica de negocio

---

**Actualizado**: Diciembre 2024  
**Mantenido por**: Equipo ContaPyme