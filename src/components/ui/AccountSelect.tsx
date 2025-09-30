'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Account {
  code: string;
  name: string;
  account_type: string;
  level_type: string;
}

interface AccountSelectProps {
  value: string;
  name: string;
  onCodeChange: (code: string) => void;
  onNameChange: (name: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function AccountSelect({ 
  value, 
  name, 
  onCodeChange, 
  onNameChange, 
  placeholder = "Ej: 1.1.1.001",
  required = false 
}: AccountSelectProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar catálogo de cuentas al montar
  useEffect(() => {
    loadAccounts();
  }, []);

  // Actualizar nombre cuando cambia el código y hay cuentas disponibles
  useEffect(() => {
    if (value && accounts.length > 0) {
      const matchedAccount = accounts.find(account => account.code === value);
      if (matchedAccount && matchedAccount.name !== name) {
        console.log(`🔄 Actualizando nombre de cuenta ${value}: "${name}" → "${matchedAccount.name}"`);
        onNameChange(matchedAccount.name);
      }
    }
  }, [value, accounts]);

  // Filtrar cuentas cuando cambia el valor
  useEffect(() => {
    if (value && accounts.length > 0) {
      const filtered = accounts.filter(account => 
        account.code.toLowerCase().includes(value.toLowerCase()) ||
        account.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredAccounts(filtered.slice(0, 10)); // Mostrar máximo 10 resultados
    } else {
      setFilteredAccounts([]);
    }
  }, [value, accounts]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/chart-of-accounts');
      const data = await response.json();
      
      if (data.success && data.data) {
        setAccounts(data.data);
      } else {
        // Si no hay catálogo, usar cuentas básicas predefinidas
        setAccounts(getDefaultAccounts());
      }
    } catch (error) {
      console.error('Error cargando catálogo:', error);
      setAccounts(getDefaultAccounts());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultAccounts = (): Account[] => [
    // ACTIVOS
    { code: '1.1.1.001', name: 'Caja General', account_type: 'activo', level_type: 'detalle' },
    { code: '1.1.1.002', name: 'Banco Estado', account_type: 'activo', level_type: 'detalle' },
    { code: '1.1.2.001', name: 'Banco Chile', account_type: 'activo', level_type: 'detalle' },
    { code: '1.1.2.002', name: 'Banco Chile', account_type: 'activo', level_type: 'detalle' },
    { code: '1.1.3.001', name: 'Clientes Nacionales', account_type: 'activo', level_type: 'detalle' },
    { code: '1.1.4.001', name: 'IVA Crédito Fiscal', account_type: 'activo', level_type: 'detalle' },
    { code: '1.2.1.001', name: 'Inventario Mercaderías', account_type: 'activo', level_type: 'detalle' },
    { code: '1.3.1.001', name: 'Equipos de Oficina', account_type: 'activo', level_type: 'detalle' },
    { code: '1.3.1.002', name: 'Vehículos', account_type: 'activo', level_type: 'detalle' },
    
    // PASIVOS
    { code: '2.1.1.001', name: 'Proveedores Nacionales', account_type: 'pasivo', level_type: 'detalle' },
    { code: '2.1.2.001', name: 'IVA Débito Fiscal', account_type: 'pasivo', level_type: 'detalle' },
    { code: '2.1.3.001', name: 'Remuneraciones por Pagar', account_type: 'pasivo', level_type: 'detalle' },
    { code: '2.1.3.002', name: 'Leyes Sociales por Pagar', account_type: 'pasivo', level_type: 'detalle' },
    { code: '2.1.4.001', name: 'Impuesto a la Renta por Pagar', account_type: 'pasivo', level_type: 'detalle' },
    { code: '2.2.1.001', name: 'Préstamos Bancarios', account_type: 'pasivo', level_type: 'detalle' },
    
    // PATRIMONIO
    { code: '3.1.1.001', name: 'Capital Social', account_type: 'patrimonio', level_type: 'detalle' },
    { code: '3.2.1.001', name: 'Utilidades Retenidas', account_type: 'patrimonio', level_type: 'detalle' },
    { code: '3.3.1.001', name: 'Resultado del Ejercicio', account_type: 'patrimonio', level_type: 'detalle' },
    
    // INGRESOS
    { code: '4.1.1.001', name: 'Ventas Nacionales', account_type: 'ingreso', level_type: 'detalle' },
    { code: '4.1.1.002', name: 'Servicios Prestados', account_type: 'ingreso', level_type: 'detalle' },
    { code: '4.2.1.001', name: 'Otros Ingresos', account_type: 'ingreso', level_type: 'detalle' },
    
    // GASTOS
    { code: '5.1.1.001', name: 'Costo de Ventas', account_type: 'gasto', level_type: 'detalle' },
    { code: '5.2.1.001', name: 'Remuneraciones', account_type: 'gasto', level_type: 'detalle' },
    { code: '5.2.1.002', name: 'Leyes Sociales', account_type: 'gasto', level_type: 'detalle' },
    { code: '5.2.2.001', name: 'Arriendo Oficina', account_type: 'gasto', level_type: 'detalle' },
    { code: '5.2.2.002', name: 'Servicios Básicos', account_type: 'gasto', level_type: 'detalle' },
    { code: '5.2.3.001', name: 'Gastos Generales', account_type: 'gasto', level_type: 'detalle' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onCodeChange(inputValue);
    setShowDropdown(inputValue.length > 0);
  };

  const handleAccountSelect = (account: Account) => {
    onCodeChange(account.code);
    onNameChange(account.name);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (value.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        required={required}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoComplete="off"
      />
      
      {showDropdown && filteredAccounts.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredAccounts.map((account, index) => (
            <div
              key={`${account.code}-${index}`}
              onClick={() => handleAccountSelect(account)}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm text-gray-900">{account.code}</div>
                  <div className="text-xs text-gray-600">{account.name}</div>
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {account.account_type}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {loading && showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3">
          <div className="text-sm text-gray-500">Cargando cuentas...</div>
        </div>
      )}
    </div>
  );
}