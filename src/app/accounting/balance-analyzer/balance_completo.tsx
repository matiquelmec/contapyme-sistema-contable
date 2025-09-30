// BALANCE COMPLETO GASTROLOGICA SPA - EXACTAMENTE COMO APARECE EN EL PDF
const sampleBalance: ExternalBalanceAccount[] = [
  // ACTIVOS (1.01.xx - 1.02.xx)
  {
    code: '1.01.01.01',
    description: 'Caja',
    debit: 253331842,
    credit: 234133183,
    saldo_deudor: 19198659,
    saldo_acreedor: 0,
    activo: 19198659,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.01.05.01',
    description: 'Deudores por venta',
    debit: 254224502,
    credit: 254224502,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.01.06.01',
    description: 'Anticipo de Empleados',
    debit: 1950000,
    credit: 1950000,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.01.06.02',
    description: 'Prestamos Empleados',
    debit: 200000,
    credit: 200000,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.01.09.01',
    description: 'Existencias',
    debit: 115924661,
    credit: 2445593,
    saldo_deudor: 113479068,
    saldo_acreedor: 0,
    activo: 113479068,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.01.10.01',
    description: 'IVA Credito Fiscal',
    debit: 25003025,
    credit: 25003025,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.01.10.02',
    description: 'PPM',
    debit: 3715785,
    credit: 0,
    saldo_deudor: 3715785,
    saldo_acreedor: 0,
    activo: 3715785,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.01.10.03',
    description: 'Otros Impuestos por Recuperar',
    debit: 29163,
    credit: 29163,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.01.10.04',
    description: 'Remanente',
    debit: 866540,
    credit: 866540,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.01.10.05',
    description: 'DL 889 por cobrar',
    debit: 891640,
    credit: 891640,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.02.04.01',
    description: 'Muebles y Utiles',
    debit: 149000,
    credit: 0,
    saldo_deudor: 149000,
    saldo_acreedor: 0,
    activo: 149000,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.02.04.02',
    description: 'Equipos Computacionales',
    debit: 347394,
    credit: 0,
    saldo_deudor: 347394,
    saldo_acreedor: 0,
    activo: 347394,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '1.02.04.03',
    description: 'Otros activos fijos',
    debit: 297000,
    credit: 0,
    saldo_deudor: 297000,
    saldo_acreedor: 0,
    activo: 297000,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  
  // PASIVOS (2.01.xx - 2.03.xx)
  {
    code: '2.01.07.01',
    description: 'Proveedores Nacionales',
    debit: 169295934,
    credit: 169311624,
    saldo_deudor: 0,
    saldo_acreedor: 15690,
    activo: 0,
    pasivo: 15690,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '2.01.07.03',
    description: 'Honorarios por Pagar',
    debit: 1308500,
    credit: 1308500,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '2.01.08.01',
    description: 'Sueldos por Pagar',
    debit: 39299605,
    credit: 48675529,
    saldo_deudor: 0,
    saldo_acreedor: 9375924,
    activo: 0,
    pasivo: 9375924,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '2.01.08.02',
    description: 'Descuentos a Trabajadores',
    debit: 200000,
    credit: 200000,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '2.01.12.01',
    description: 'Imposiciones por Pagar',
    debit: 11356152,
    credit: 14002769,
    saldo_deudor: 0,
    saldo_acreedor: 2646617,
    activo: 0,
    pasivo: 2646617,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '2.01.12.02',
    description: 'Impuesto Unico Trabajadores',
    debit: 303093,
    credit: 303093,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '2.01.12.03',
    description: 'Impuesto de 2da Categoria',
    debit: 195449,
    credit: 195449,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '2.01.12.04',
    description: 'IVA Debito Fiscal',
    debit: 40575683,
    credit: 40575683,
    saldo_deudor: 0,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '2.01.12.05',
    description: 'Impuestos por Pagar',
    debit: 12688938,
    credit: 19965789,
    saldo_deudor: 0,
    saldo_acreedor: 7276851,
    activo: 0,
    pasivo: 7276851,
    perdida: 0,
    ganancia: 0
  },
  {
    code: '2.03.01.01',
    description: 'Capital',
    debit: 0,
    credit: 500000,
    saldo_deudor: 0,
    saldo_acreedor: 500000,
    activo: 0,
    pasivo: 500000,
    perdida: 0,
    ganancia: 0
  },
  
  // INGRESOS (3.01.xx - 3.02.xx)
  {
    code: '3.01.01.01',
    description: 'Ventas Afectas',
    debit: 1841765,
    credit: 213556219,
    saldo_deudor: 0,
    saldo_acreedor: 211714454,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 211714454
  },
  {
    code: '3.02.03.02',
    description: 'DL 889',
    debit: 0,
    credit: 891640,
    saldo_deudor: 0,
    saldo_acreedor: 891640,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 891640
  },
  
  // GASTOS OPERACIONALES (4.01.03.xx)
  {
    code: '4.01.03.01',
    description: 'Honorarios Profesionales',
    debit: 1503949,
    credit: 0,
    saldo_deudor: 1503949,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 1503949,
    ganancia: 0
  },
  {
    code: '4.01.03.02',
    description: 'Gastos Notariales',
    debit: 150000,
    credit: 0,
    saldo_deudor: 150000,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 150000,
    ganancia: 0
  },
  {
    code: '4.01.03.04',
    description: 'Articulos de Oficina',
    debit: 3077764,
    credit: 0,
    saldo_deudor: 3077764,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 3077764,
    ganancia: 0
  },
  {
    code: '4.01.03.05',
    description: 'Articulos de Aseo',
    debit: 657655,
    credit: 0,
    saldo_deudor: 657655,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 657655,
    ganancia: 0
  },
  {
    code: '4.01.03.07',
    description: 'Aseo de Oficina',
    debit: 350000,
    credit: 0,
    saldo_deudor: 350000,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 350000,
    ganancia: 0
  },
  {
    code: '4.01.03.09',
    description: 'Publicidad y Marketing',
    debit: 50000,
    credit: 0,
    saldo_deudor: 50000,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 50000,
    ganancia: 0
  },
  {
    code: '4.01.03.12',
    description: 'Insumos',
    debit: 1783635,
    credit: 46386,
    saldo_deudor: 1737249,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 1737249,
    ganancia: 0
  },
  {
    code: '4.01.03.14',
    description: 'Mantencion y reparacion',
    debit: 7846463,
    credit: 368714,
    saldo_deudor: 7477749,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 7477749,
    ganancia: 0
  },
  {
    code: '4.01.03.15',
    description: 'Patentes Comerciales',
    debit: 80000,
    credit: 0,
    saldo_deudor: 80000,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 80000,
    ganancia: 0
  },
  {
    code: '4.01.03.16',
    description: 'Fletes',
    debit: 262372,
    credit: 0,
    saldo_deudor: 262372,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 262372,
    ganancia: 0
  },
  {
    code: '4.01.03.17',
    description: 'Consumos Básicos',
    debit: 3048207,
    credit: 0,
    saldo_deudor: 3048207,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 3048207,
    ganancia: 0
  },
  {
    code: '4.01.03.18',
    description: 'Combustibles',
    debit: 122005,
    credit: 0,
    saldo_deudor: 122005,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 122005,
    ganancia: 0
  },
  {
    code: '4.01.03.19',
    description: 'Asesorías Contables',
    debit: 2650000,
    credit: 0,
    saldo_deudor: 2650000,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 2650000,
    ganancia: 0
  },
  {
    code: '4.01.03.21',
    description: 'Remodelación',
    debit: 729282,
    credit: 0,
    saldo_deudor: 729282,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 729282,
    ganancia: 0
  },
  {
    code: '4.01.03.22',
    description: 'Gastos Generales',
    debit: 1922022,
    credit: 84017,
    saldo_deudor: 1838005,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 1838005,
    ganancia: 0
  },
  {
    code: '4.01.03.26',
    description: 'Uniforme del personal',
    debit: 550819,
    credit: 0,
    saldo_deudor: 550819,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 550819,
    ganancia: 0
  },
  {
    code: '4.01.03.27',
    description: 'Estampados',
    debit: 132000,
    credit: 0,
    saldo_deudor: 132000,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 132000,
    ganancia: 0
  },
  {
    code: '4.01.03.28',
    description: 'Programas computacionales',
    debit: 3711331,
    credit: 0,
    saldo_deudor: 3711331,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 3711331,
    ganancia: 0
  },
  
  // GASTOS DE PERSONAL (4.02.04.xx)
  {
    code: '4.02.04.01',
    description: 'Sueldos',
    debit: 62077018,
    credit: 0,
    saldo_deudor: 62077018,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 62077018,
    ganancia: 0
  },
  {
    code: '4.02.04.02',
    description: 'Leyes Sociales',
    debit: 3254373,
    credit: 0,
    saldo_deudor: 3254373,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 3254373,
    ganancia: 0
  },
  
  // GASTOS FINANCIEROS (4.02.07.xx)
  {
    code: '4.02.07.01',
    description: 'Gastos Bancarios',
    debit: 62085,
    credit: 0,
    saldo_deudor: 62085,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 62085,
    ganancia: 0
  },
  {
    code: '4.02.07.06',
    description: 'Comisiones portal de pago',
    debit: 1767433,
    credit: 76286,
    saldo_deudor: 1691147,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 1691147,
    ganancia: 0
  },
  
  // OTROS GASTOS (4.02.10.xx - 4.02.11.xx)
  {
    code: '4.02.10.03',
    description: 'Intereses y multas',
    debit: 22383,
    credit: 0,
    saldo_deudor: 22383,
    saldo_acreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 22383,
    ganancia: 0
  },
  {
    code: '4.02.11.01',
    description: 'Corrección monetaria',
    debit: 240,
    credit: 1363,
    saldo_deudor: 0,
    saldo_acreedor: 1123,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 1123
  }
];

// VERIFICACIÓN DE CUADRE
// Totales del Balance según PDF:
// Total Debe: 1,029,806,707
// Total Haber: 1,029,806,707
// Activo Total: 137,186,906
// Pasivo Total: 19,815,082 
// Utilidad (Ganancia Total): 212,607,217
// Pérdida Total: 95,235,393
// Resultado: 117,371,824