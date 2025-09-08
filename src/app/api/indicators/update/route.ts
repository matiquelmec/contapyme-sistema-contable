import { NextRequest, NextResponse } from 'next/server';
import { updateIndicatorValue } from '@/lib/database/databaseSimple';

// Función para obtener datos de mindicador.cl
async function fetchFromMindicador(indicator: string) {
  try {
    const response = await fetch(`https://mindicador.cl/api/${indicator}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${indicator} from mindicador.cl:`, error);
    return null;
  }
}

// Función para obtener datos de criptomonedas
async function fetchCryptoData() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return null;
  }
}

// POST /api/indicators/update - Actualizar indicadores desde APIs externas
export async function POST(request: NextRequest) {
  try {
    const { indicators } = await request.json();
    const results = [];
    const errors = [];

    // Mapeo de indicadores a sus respectivas APIs
    const indicatorMappings = {
      'uf': 'uf',
      'utm': 'utm',
      'dolar': 'dolar',
      'euro': 'euro',
      'ipc': 'ipc',
      'tpm': 'tpm',
      'tasa_desempleo': 'tasa_desempleo',
      'bitcoin': 'crypto'
    };

    for (const indicatorCode of indicators || Object.keys(indicatorMappings)) {
      try {
        let value = null;
        let date = new Date().toISOString().split('T')[0];

        if (indicatorCode === 'bitcoin') {
          // Obtener datos de criptomonedas
          const cryptoData = await fetchCryptoData();
          if (cryptoData && cryptoData.bitcoin) {
            value = cryptoData.bitcoin.usd;
          }
        } else if (indicatorCode === 'sueldo_minimo') {
          // Sueldo mínimo se actualiza manualmente o desde otra fuente
          console.log('⚠️ Sueldo mínimo requiere actualización manual');
          continue;
        } else {
          // Obtener desde mindicador.cl
          const apiIndicator = indicatorMappings[indicatorCode as keyof typeof indicatorMappings];
          if (apiIndicator && apiIndicator !== 'crypto') {
            const data = await fetchFromMindicador(apiIndicator);
            if (data && data.serie && data.serie.length > 0) {
              const latest = data.serie[0];
              value = latest.valor;
              date = latest.fecha.split('T')[0];
            }
          }
        }

        if (value !== null) {
          const { data, error } = await updateIndicatorValue(indicatorCode, value, date);
          
          if (error) {
            errors.push({
              indicator: indicatorCode,
              error: error.message || 'Error desconocido'
            });
          } else {
            results.push({
              indicator: indicatorCode,
              value,
              date,
              updated: true
            });
          }
        } else {
          errors.push({
            indicator: indicatorCode,
            error: 'No se pudo obtener valor desde la API'
          });
        }
      } catch (indicatorError) {
        console.error(`Error processing indicator ${indicatorCode}:`, indicatorError);
        errors.push({
          indicator: indicatorCode,
          error: 'Error al procesar indicador'
        });
      }
    }

    return NextResponse.json({
      message: `Actualizados ${results.length} indicadores`,
      results,
      errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Unexpected error in update indicators:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}