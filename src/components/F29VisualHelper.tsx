'use client'

import { useState } from 'react'

interface F29VisualHelperProps {
  onCodesEntered: (codes: any) => void
}

export default function F29VisualHelper({ onCodesEntered }: F29VisualHelperProps) {
  const [manualCodes, setManualCodes] = useState({
    codigo538: '',
    codigo511: '',
    codigo062: '',
    codigo077: '',
    codigo563: ''
  })
  
  const [showHelper, setShowHelper] = useState(false)
  
  const handleSubmit = () => {
    const codes = {
      codigo538: parseInt(manualCodes.codigo538.replace(/\D/g, '')) || 0,
      codigo511: parseInt(manualCodes.codigo511.replace(/\D/g, '')) || 0,
      codigo062: parseInt(manualCodes.codigo062.replace(/\D/g, '')) || 0,
      codigo077: parseInt(manualCodes.codigo077.replace(/\D/g, '')) || 0,
      codigo563: parseInt(manualCodes.codigo563.replace(/\D/g, '')) || 0
    }
    onCodesEntered(codes)
    setShowHelper(false)
  }
  
  return (
    <div className="mb-6">
      <button
        onClick={() => setShowHelper(!showHelper)}
        className="text-sm text-indigo-600 hover:text-indigo-700 underline"
      >
        ¿Problemas con el PDF? Ingresa los códigos manualmente
      </button>
      
      {showHelper && (
        <div className="mt-4 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Ingreso Manual de Códigos F29</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <img 
                src="/f29-example.png" 
                alt="Ejemplo F29"
                className="w-full rounded border"
              />
              <p className="text-xs text-gray-600 mt-2">
                Busca estos códigos en tu formulario F29
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Código 538 - Débito Fiscal
                </label>
                <input
                  type="text"
                  value={manualCodes.codigo538}
                  onChange={(e) => setManualCodes({...manualCodes, codigo538: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="ej: 2.850.000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Código 511 - Crédito Fiscal
                </label>
                <input
                  type="text"
                  value={manualCodes.codigo511}
                  onChange={(e) => setManualCodes({...manualCodes, codigo511: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="ej: 1.650.000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Código 062 - PPM
                </label>
                <input
                  type="text"
                  value={manualCodes.codigo062}
                  onChange={(e) => setManualCodes({...manualCodes, codigo062: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="ej: 450.000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Código 077 - Remanente
                </label>
                <input
                  type="text"
                  value={manualCodes.codigo077}
                  onChange={(e) => setManualCodes({...manualCodes, codigo077: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="ej: 125.000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Código 563 - Ventas Netas
                </label>
                <input
                  type="text"
                  value={manualCodes.codigo563}
                  onChange={(e) => setManualCodes({...manualCodes, codigo563: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="ej: 15.000.000"
                />
              </div>
              
              <button
                onClick={handleSubmit}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md"
              >
                Analizar con estos valores
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}