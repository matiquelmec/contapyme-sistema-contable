// ==========================================
// PLAN DE CUENTAS CHILENO REAL
// Basado en el archivo CSV proporcionado
// ==========================================

import { Account } from '@/types';

export const planDeCuentasChileno: Account[] = [
  {
    id: '1',
    code: '1',
    name: 'ACTIVO',
    account_type: 'asset',
    level: 1,
    is_active: true,
    is_detail: false,
    children: [
      {
        id: '1.1',
        code: '1.1',
        name: 'Activo Corriente',
        account_type: 'asset',
        parent_id: '1',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '1.1.01',
            code: '1.1.01',
            name: 'Efectivo y Equivalentes al Efectivo',
            account_type: 'asset',
            parent_id: '1.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '1.1.01.001',
                code: '1.1.01.001',
                name: 'Caja',
                account_type: 'asset',
                parent_id: '1.1.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.01.002',
                code: '1.1.01.002',
                name: 'Caja Chica',
                account_type: 'asset',
                parent_id: '1.1.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.01.003',
                code: '1.1.01.003',
                name: 'Caja Moneda Extranjera',
                account_type: 'asset',
                parent_id: '1.1.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.01.004',
                code: '1.1.01.004',
                name: 'Banco Estado',
                account_type: 'asset',
                parent_id: '1.1.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.01.005',
                code: '1.1.01.005',
                name: 'Caja Chica Dpto de Ventas',
                account_type: 'asset',
                parent_id: '1.1.01',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '1.1.02',
            code: '1.1.02',
            name: 'Activos Financieros',
            account_type: 'asset',
            parent_id: '1.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '1.1.02.001',
                code: '1.1.02.001',
                name: 'Fondos Mutuos',
                account_type: 'asset',
                parent_id: '1.1.02',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '1.1.03',
            code: '1.1.03',
            name: 'Inventarios',
            account_type: 'asset',
            parent_id: '1.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '1.1.03.001',
                code: '1.1.03.001',
                name: 'Existencias',
                account_type: 'asset',
                parent_id: '1.1.03',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '1.1.04',
            code: '1.1.04',
            name: 'Servicios y Otros pagos Anticipados',
            account_type: 'asset',
            parent_id: '1.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '1.1.04.001',
                code: '1.1.04.001',
                name: 'Anticipo de Proveedores',
                account_type: 'asset',
                parent_id: '1.1.04',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.04.002',
                code: '1.1.04.002',
                name: 'Anticipo de Sueldos',
                account_type: 'asset',
                parent_id: '1.1.04',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.04.003',
                code: '1.1.04.003',
                name: 'Anticipo de Honorarios',
                account_type: 'asset',
                parent_id: '1.1.04',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '1.1.05',
            code: '1.1.05',
            name: 'Clientes Nacionales',
            account_type: 'asset',
            parent_id: '1.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '1.1.06',
            code: '1.1.06',
            name: 'Activos por Impuestos Corrientes',
            account_type: 'asset',
            parent_id: '1.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '1.1.06.001',
                code: '1.1.06.001',
                name: 'Pagos Provisionales Mensuales',
                account_type: 'asset',
                parent_id: '1.1.06',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.06.002',
                code: '1.1.06.002',
                name: 'IVA CF',
                account_type: 'asset',
                parent_id: '1.1.06',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.06.003',
                code: '1.1.06.003',
                name: 'Remanente CF',
                account_type: 'asset',
                parent_id: '1.1.06',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.06.004',
                code: '1.1.06.004',
                name: 'IVA Anticipado',
                account_type: 'asset',
                parent_id: '1.1.06',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.1.06.005',
                code: '1.1.06.005',
                name: 'Remanente IVA Anticipado',
                account_type: 'asset',
                parent_id: '1.1.06',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '1.1.07',
            code: '1.1.07',
            name: 'Activos No Corrientes Disponibles para la venta y Operaciones discontinuadas',
            account_type: 'asset',
            parent_id: '1.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '1.1.08',
            code: '1.1.08',
            name: 'Otros Activos Corrientes',
            account_type: 'asset',
            parent_id: '1.1',
            level: 3,
            is_active: true,
            is_detail: true
          }
        ]
      },
      {
        id: '1.2',
        code: '1.2',
        name: 'Activo No Corriente',
        account_type: 'asset',
        parent_id: '1',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '1.2.01',
            code: '1.2.01',
            name: 'Propiedad, Planta y Equipo',
            account_type: 'asset',
            parent_id: '1.2',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '1.2.01.001',
                code: '1.2.01.001',
                name: 'Instalaciones y Equipos',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.2.01.002',
                code: '1.2.01.002',
                name: 'Muebles y Utiles',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.2.01.003',
                code: '1.2.01.003',
                name: 'Equipos computacionales',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.2.01.004',
                code: '1.2.01.004',
                name: 'Otras Maquinas y Equipos',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.2.01.005',
                code: '1.2.01.005',
                name: 'Utencilios Cocina',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.2.01.101',
                code: '1.2.01.101',
                name: 'Dep. Acum. Instalaciones y Equipos',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.2.01.102',
                code: '1.2.01.102',
                name: 'Dep. Acum. Muebles y Utiles',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.2.01.103',
                code: '1.2.01.103',
                name: 'Dep. Acum. Equipos computacionales',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.2.01.104',
                code: '1.2.01.104',
                name: 'Dep. Acum. Otras Maquinas y Equipos',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '1.2.01.105',
                code: '1.2.01.105',
                name: 'Dep. Acum. Utencilios Cocina',
                account_type: 'asset',
                parent_id: '1.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '1.2.02',
            code: '1.2.02',
            name: 'Propiedades de Inversion',
            account_type: 'asset',
            parent_id: '1.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '1.2.03',
            code: '1.2.03',
            name: 'Activos Biologicos',
            account_type: 'asset',
            parent_id: '1.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '1.2.04',
            code: '1.2.04',
            name: 'Activos Intangible',
            account_type: 'asset',
            parent_id: '1.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '1.2.05',
            code: '1.2.05',
            name: 'Activos por Impuesto a la Renta Diferido',
            account_type: 'asset',
            parent_id: '1.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '1.2.06',
            code: '1.2.06',
            name: 'Activos Financieros No Corrientes',
            account_type: 'asset',
            parent_id: '1.2',
            level: 3,
            is_active: true,
            is_detail: true
          }
        ]
      }
    ]
  },
  {
    id: '2',
    code: '2',
    name: 'PASIVOS',
    account_type: 'liability',
    level: 1,
    is_active: true,
    is_detail: false,
    children: [
      {
        id: '2.1',
        code: '2.1',
        name: 'Pasivos Corrientes',
        account_type: 'liability',
        parent_id: '2',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '2.1.01',
            code: '2.1.01',
            name: 'Pasivos Financieros a Valor Razonable con Cambios en Resultado',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.1.02',
            code: '2.1.02',
            name: 'Pasivos por Contratos de Arrendamiento Financiero',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.1.03',
            code: '2.1.03',
            name: 'Cuentas y Documentos por Pagar',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '2.1.03.001',
                code: '2.1.03.001',
                name: 'Proveedores Nacionales',
                account_type: 'liability',
                parent_id: '2.1.03',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '2.1.03.002',
                code: '2.1.03.002',
                name: 'Honorarios por Pagar',
                account_type: 'liability',
                parent_id: '2.1.03',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '2.1.03.003',
                code: '2.1.03.003',
                name: 'Sueldos por Pagar',
                account_type: 'liability',
                parent_id: '2.1.03',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '2.1.04',
            code: '2.1.04',
            name: 'Obligaciones con Instituciones Financieras',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '2.1.04.001',
                code: '2.1.04.001',
                name: 'Credito FGP Banco Estado',
                account_type: 'liability',
                parent_id: '2.1.04',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '2.1.05',
            code: '2.1.05',
            name: 'Provisiones',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.1.06',
            code: '2.1.06',
            name: 'Porción Corriente Obligaciones Emitidas',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.1.07',
            code: '2.1.07',
            name: 'Otras Obligaciones Corrientes',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '2.1.07.001',
                code: '2.1.07.001',
                name: 'IVA DF',
                account_type: 'liability',
                parent_id: '2.1.07',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '2.1.07.002',
                code: '2.1.07.002',
                name: 'Retención 2ª Categoria',
                account_type: 'liability',
                parent_id: '2.1.07',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '2.1.07.003',
                code: '2.1.07.003',
                name: 'Impuesto Unico',
                account_type: 'liability',
                parent_id: '2.1.07',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '2.1.07.004',
                code: '2.1.07.004',
                name: 'IVA por Pagar',
                account_type: 'liability',
                parent_id: '2.1.07',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '2.1.07.005',
                code: '2.1.07.005',
                name: 'Instituciones Previsionales',
                account_type: 'liability',
                parent_id: '2.1.07',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '2.1.07.006',
                code: '2.1.07.006',
                name: 'Ret. 3% RTA 42 NR1 Reint',
                account_type: 'liability',
                parent_id: '2.1.07',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '2.1.07.007',
                code: '2.1.07.007',
                name: 'PPM por pagar',
                account_type: 'liability',
                parent_id: '2.1.07',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '2.1.08',
            code: '2.1.08',
            name: 'Cuentas por Pagar Diversas / Relacionadas',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.1.09',
            code: '2.1.09',
            name: 'Otros Pasivos Financieros',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '2.1.09.001',
                code: '2.1.09.001',
                name: 'Anticipo Clientes',
                account_type: 'liability',
                parent_id: '2.1.09',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '2.1.10',
            code: '2.1.10',
            name: 'Pasivos Directamente Asociados con Activos no Corrientes Disponibles para la Venta y Operaciones Discontinuadas',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.1.11',
            code: '2.1.11',
            name: 'Porción Corriente Provisiones por Beneficios a Empleados',
            account_type: 'liability',
            parent_id: '2.1',
            level: 3,
            is_active: true,
            is_detail: true
          }
        ]
      },
      {
        id: '2.2',
        code: '2.2',
        name: 'Pasivo No Corriente',
        account_type: 'liability',
        parent_id: '2',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '2.2.01',
            code: '2.2.01',
            name: 'Pasivos por Contratos de Arrendamiento Financiero',
            account_type: 'liability',
            parent_id: '2.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.2.02',
            code: '2.2.02',
            name: 'Cuentas y Documentos por Pagar',
            account_type: 'liability',
            parent_id: '2.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.2.03',
            code: '2.2.03',
            name: 'Obligaciones con Instituciones Financieras',
            account_type: 'liability',
            parent_id: '2.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.2.04',
            code: '2.2.04',
            name: 'Cuentas por Pagar Diversas / Relacionadas',
            account_type: 'liability',
            parent_id: '2.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.2.05',
            code: '2.2.05',
            name: 'Obligaciones Emitidas',
            account_type: 'liability',
            parent_id: '2.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.2.06',
            code: '2.2.06',
            name: 'Anticipo Clientes',
            account_type: 'liability',
            parent_id: '2.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.2.07',
            code: '2.2.07',
            name: 'Provisiones por Beneficios a Empleados',
            account_type: 'liability',
            parent_id: '2.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '2.2.08',
            code: '2.2.08',
            name: 'Otras Provisiones',
            account_type: 'liability',
            parent_id: '2.2',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '2.2.08.001',
                code: '2.2.08.001',
                name: 'Provision Impuesto Renta',
                account_type: 'liability',
                parent_id: '2.2.08',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '2.2.09',
            code: '2.2.09',
            name: 'Pasivo Diferido',
            account_type: 'liability',
            parent_id: '2.2',
            level: 3,
            is_active: true,
            is_detail: true
          }
        ]
      }
    ]
  },
  {
    id: '3',
    code: '3',
    name: 'PATRIMONIO NETO',
    account_type: 'equity',
    level: 1,
    is_active: true,
    is_detail: false,
    children: [
      {
        id: '3.1',
        code: '3.1',
        name: 'Capital Suscrito o Asignado',
        account_type: 'equity',
        parent_id: '3',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '3.1.01',
            code: '3.1.01',
            name: 'Capital',
            account_type: 'equity',
            parent_id: '3.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '3.1.02',
            code: '3.1.02',
            name: 'Fondo Reval. Capital Propio',
            account_type: 'equity',
            parent_id: '3.1',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '3.1.03',
            code: '3.1.03',
            name: '(-) Capital Suscrito no Pagado, Acciones en Tesoreria',
            account_type: 'equity',
            parent_id: '3.1',
            level: 3,
            is_active: true,
            is_detail: true
          }
        ]
      },
      {
        id: '3.2',
        code: '3.2',
        name: 'Aportes de Socios o Accionistas para Futura Capitalización',
        account_type: 'equity',
        parent_id: '3',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '3.2.01',
            code: '3.2.01',
            name: 'Aportes por enterar',
            account_type: 'equity',
            parent_id: '3.2',
            level: 3,
            is_active: true,
            is_detail: true
          }
        ]
      },
      {
        id: '3.3',
        code: '3.3',
        name: 'Reservas',
        account_type: 'equity',
        parent_id: '3',
        level: 2,
        is_active: true,
        is_detail: true
      },
      {
        id: '3.4',
        code: '3.4',
        name: 'Otros Resultados Integrales',
        account_type: 'equity',
        parent_id: '3',
        level: 2,
        is_active: true,
        is_detail: true
      },
      {
        id: '3.5',
        code: '3.5',
        name: 'Resultados Acumulados',
        account_type: 'equity',
        parent_id: '3',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '3.5.01',
            code: '3.5.01',
            name: 'Perdidas Acumuladas',
            account_type: 'equity',
            parent_id: '3.5',
            level: 3,
            is_active: true,
            is_detail: true
          }
        ]
      },
      {
        id: '3.6',
        code: '3.6',
        name: 'Resultado del Ejercicio',
        account_type: 'equity',
        parent_id: '3',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '3.6.01',
            code: '3.6.01',
            name: 'Perdidas y Ganancias',
            account_type: 'equity',
            parent_id: '3.6',
            level: 3,
            is_active: true,
            is_detail: true
          }
        ]
      }
    ]
  },
  {
    id: '4',
    code: '4',
    name: 'GASTOS',
    account_type: 'expense',
    level: 1,
    is_active: true,
    is_detail: false,
    children: [
      {
        id: '4.1',
        code: '4.1',
        name: 'Gastos de Explotación',
        account_type: 'expense',
        parent_id: '4',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '4.1.01',
            code: '4.1.01',
            name: 'Costos de Venta',
            account_type: 'expense',
            parent_id: '4.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '4.1.01.001',
                code: '4.1.01.001',
                name: 'Costos de Venta',
                account_type: 'expense',
                parent_id: '4.1.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.1.01.002',
                code: '4.1.01.002',
                name: 'Remuneraciones y leyes sociales',
                account_type: 'expense',
                parent_id: '4.1.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.1.01.003',
                code: '4.1.01.003',
                name: 'Aporte Patronal',
                account_type: 'expense',
                parent_id: '4.1.01',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          }
        ]
      },
      {
        id: '4.2',
        code: '4.2',
        name: 'Gastos Fuera de Explotación',
        account_type: 'expense',
        parent_id: '4',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '4.2.01',
            code: '4.2.01',
            name: 'Gastos de Administración',
            account_type: 'expense',
            parent_id: '4.2',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '4.2.01.001',
                code: '4.2.01.001',
                name: 'Honorarios',
                account_type: 'expense',
                parent_id: '4.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.2.01.002',
                code: '4.2.01.002',
                name: 'Asesorias Contables',
                account_type: 'expense',
                parent_id: '4.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.2.01.003',
                code: '4.2.01.003',
                name: 'Consumos Basicos',
                account_type: 'expense',
                parent_id: '4.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.2.01.004',
                code: '4.2.01.004',
                name: 'Fletes',
                account_type: 'expense',
                parent_id: '4.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.2.01.005',
                code: '4.2.01.005',
                name: 'Gastos Generales',
                account_type: 'expense',
                parent_id: '4.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.2.01.006',
                code: '4.2.01.006',
                name: 'Gastos Oficina',
                account_type: 'expense',
                parent_id: '4.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.2.01.007',
                code: '4.2.01.007',
                name: 'Repuestos, Reparacion',
                account_type: 'expense',
                parent_id: '4.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.2.01.008',
                code: '4.2.01.008',
                name: 'Servicios Contratados',
                account_type: 'expense',
                parent_id: '4.2.01',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '4.2.02',
            code: '4.2.02',
            name: 'Gastos de Comercialización',
            account_type: 'expense',
            parent_id: '4.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '4.2.03',
            code: '4.2.03',
            name: 'Gastos Financieros',
            account_type: 'expense',
            parent_id: '4.2',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '4.2.03.001',
                code: '4.2.03.001',
                name: 'Comisiones Bancarias',
                account_type: 'expense',
                parent_id: '4.2.03',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.2.03.002',
                code: '4.2.03.002',
                name: 'Comisiones Transbank',
                account_type: 'expense',
                parent_id: '4.2.03',
                level: 4,
                is_active: true,
                is_detail: true
              },
              {
                id: '4.2.03.003',
                code: '4.2.03.003',
                name: 'Otros Gastos Financieros',
                account_type: 'expense',
                parent_id: '4.2.03',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '4.2.04',
            code: '4.2.04',
            name: 'Otras Perdidas',
            account_type: 'expense',
            parent_id: '4.2',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '4.2.04.001',
                code: '4.2.04.001',
                name: 'Multas e Intereses Fiscales',
                account_type: 'expense',
                parent_id: '4.2.04',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '4.2.05',
            code: '4.2.05',
            name: 'Resultado en Inversiones en Asociadas / Subsidiarias y Otras',
            account_type: 'expense',
            parent_id: '4.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '4.2.06',
            code: '4.2.06',
            name: 'Diferencia de Cambio',
            account_type: 'expense',
            parent_id: '4.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '4.2.07',
            code: '4.2.07',
            name: 'Corrección Monetaria',
            account_type: 'expense',
            parent_id: '4.2',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '4.2.07.001',
                code: '4.2.07.001',
                name: 'Corrección Monetaria',
                account_type: 'expense',
                parent_id: '4.2.07',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '5',
    code: '5',
    name: 'INGRESO',
    account_type: 'income',
    level: 1,
    is_active: true,
    is_detail: false,
    children: [
      {
        id: '5.1',
        code: '5.1',
        name: 'Ingresos de Explotación',
        account_type: 'income',
        parent_id: '5',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '5.1.01',
            code: '5.1.01',
            name: 'Ingresos de la Operación',
            account_type: 'income',
            parent_id: '5.1',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '5.1.01.001',
                code: '5.1.01.001',
                name: 'Ventas',
                account_type: 'income',
                parent_id: '5.1.01',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          }
        ]
      },
      {
        id: '5.2',
        code: '5.2',
        name: 'Ingresos Fuera de Explotación',
        account_type: 'income',
        parent_id: '5',
        level: 2,
        is_active: true,
        is_detail: false,
        children: [
          {
            id: '5.2.01',
            code: '5.2.01',
            name: 'Otros Ingresos',
            account_type: 'income',
            parent_id: '5.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '5.2.02',
            code: '5.2.02',
            name: 'Ingresos Financieros',
            account_type: 'income',
            parent_id: '5.2',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '5.2.02.001',
                code: '5.2.02.001',
                name: 'Otros Ingresos Financieros',
                account_type: 'income',
                parent_id: '5.2.02',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '5.2.03',
            code: '5.2.03',
            name: 'Otras Ganancias',
            account_type: 'income',
            parent_id: '5.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '5.2.04',
            code: '5.2.04',
            name: 'Diferencias de Cambio',
            account_type: 'income',
            parent_id: '5.2',
            level: 3,
            is_active: true,
            is_detail: false,
            children: [
              {
                id: '5.2.04.001',
                code: '5.2.04.001',
                name: 'Diferencias de Cambio',
                account_type: 'income',
                parent_id: '5.2.04',
                level: 4,
                is_active: true,
                is_detail: true
              }
            ]
          },
          {
            id: '5.2.05',
            code: '5.2.05',
            name: 'Resultado en Inversiones en Asociadas / Subsidiarias y Otras',
            account_type: 'income',
            parent_id: '5.2',
            level: 3,
            is_active: true,
            is_detail: true
          },
          {
            id: '5.2.06',
            code: '5.2.06',
            name: 'Corrección Monetaria',
            account_type: 'income',
            parent_id: '5.2',
            level: 3,
            is_active: true,
            is_detail: true
          }
        ]
      }
    ]
  }
];