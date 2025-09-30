'use client';

import React, { useState, useRef } from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface RutInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function RutInput({
  value,
  onChange,
  onValidChange,
  placeholder = "11.111.111-1",
  className = "",
  required = false,
  disabled = false,
  autoFocus = false
}: RutInputProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Función para limpiar RUT
  const cleanRut = (rut: string): string => {
    return rut.replace(/[^0-9kK]/g, '').toUpperCase();
  };

  // Función para formatear RUT
  const formatRut = (rut: string): string => {
    const clean = cleanRut(rut);
    if (clean.length === 0) return '';
    
    // Separar número y dígito verificador
    const dv = clean.slice(-1);
    const num = clean.slice(0, -1);
    
    // Formatear número con puntos
    let formatted = '';
    for (let i = num.length - 1, j = 0; i >= 0; i--, j++) {
      if (j > 0 && j % 3 === 0) {
        formatted = '.' + formatted;
      }
      formatted = num[i] + formatted;
    }
    
    // Agregar guión y dígito verificador
    if (clean.length > 1) {
      formatted += '-' + dv;
    }
    
    return formatted;
  };

  // Función para validar RUT chileno
  const validateRut = (rut: string): boolean => {
    const clean = cleanRut(rut);
    
    if (clean.length < 2) return false;
    
    const dv = clean.slice(-1);
    const num = clean.slice(0, -1);
    
    // Calcular dígito verificador
    let sum = 0;
    let multiplier = 2;
    
    for (let i = num.length - 1; i >= 0; i--) {
      sum += parseInt(num[i]) * multiplier;
      multiplier++;
      if (multiplier > 7) multiplier = 2;
    }
    
    const expectedDv = 11 - (sum % 11);
    let calculatedDv: string;
    
    if (expectedDv === 11) {
      calculatedDv = '0';
    } else if (expectedDv === 10) {
      calculatedDv = 'K';
    } else {
      calculatedDv = expectedDv.toString();
    }
    
    return dv === calculatedDv;
  };

  // Obtener valor formateado para mostrar
  const getDisplayValue = () => {
    // Si el valor ya está formateado, devolverlo tal como está
    if (value.includes('.') || value.includes('-')) {
      return value;
    }
    // Si no está formateado, formatearlo
    return formatRut(value);
  };

  // Manejar cambios en el input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const clean = cleanRut(inputValue);
    
    // Limitar a 9 dígitos (8 números + 1 dígito verificador)
    if (clean.length > 9) return;
    
    // Actualizar valor formateado para el formulario
    const formatted = formatRut(clean);
    onChange(formatted);
    
    // Validar si tiene el largo correcto
    if (clean.length >= 8) {
      const valid = validateRut(clean);
      setIsValid(valid);
      onValidChange?.(valid);
    } else {
      setIsValid(null);
      onValidChange?.(false);
    }
  };

  // Determinar clases del input
  const inputClasses = `
    w-full px-3 py-2 pr-10 border rounded-md 
    focus:outline-none focus:ring-2 
    ${isValid === true ? 'border-green-500 focus:ring-green-500' : ''}
    ${isValid === false ? 'border-red-500 focus:ring-red-500' : ''}
    ${isValid === null ? 'border-gray-300 focus:ring-blue-500' : ''}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={getDisplayValue()}
        onChange={handleChange}
        placeholder={placeholder}
        className={inputClasses}
        required={required}
        disabled={disabled}
        maxLength={12} // 11.111.111-1
        autoFocus={autoFocus}
      />
      
      {/* Indicador de validación */}
      {!disabled && value && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isValid === true && (
            <Check className="h-5 w-5 text-green-500" />
          )}
          {isValid === false && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
      )}
      
      {/* Mensaje de error */}
      {isValid === false && (
        <p className="mt-1 text-sm text-red-600">RUT inválido</p>
      )}
    </div>
  );
}