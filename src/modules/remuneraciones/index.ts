// 💰 MÓDULO REMUNERACIONES - Export Central
// Punto de entrada único para el módulo de remuneraciones

// 🏗️ Servicios
export * from './services/empleadoService'
export * from './services/liquidacionService'
export * from './services/calculadorService'
export * from './services/configuracionService'

// 🎣 Hooks
export * from './hooks/useEmpleados'
export * from './hooks/useLiquidaciones'
export * from './hooks/useCalculadora'
export * from './hooks/useConfiguracion'

// 🧩 Componentes principales
export * from './components/empleados'
export * from './components/liquidaciones'
export * from './components/configuracion'

// 📝 Tipos
export * from './types/empleado.types'
export * from './types/liquidacion.types'
export * from './types/configuracion.types'

// 🛠️ Utilidades
export * from './utils/validaciones'
export * from './utils/formatters'
export * from './utils/calculosChilenos'

// 📊 Constantes
export * from './constants/parametrosLegales'
export * from './constants/codigosPrevisionales'

// 🏷️ Metadata del módulo
export const REMUNERACIONES_MODULE = {
  name: 'remuneraciones',
  version: '1.0.0',
  description: 'Módulo de gestión de remuneraciones y liquidaciones',
  author: 'ContaPymePuq'
} as const