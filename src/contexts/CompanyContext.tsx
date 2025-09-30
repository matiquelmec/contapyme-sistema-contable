'use client';

import React, { createContext, useContext, ReactNode } from 'react';

// Definición de tipos
export interface Company {
  id: string;
  rut: string;
  razon_social: string;
  nombre_fantasia?: string;
  giro: string;
  direccion: string;
  telefono: string;
  email: string;
  website?: string;
  logo?: string;
  created_at: string;
  plan_tipo: 'demo' | 'basico' | 'profesional' | 'empresarial';
  estado: 'activo' | 'suspendido' | 'inactivo';
}

// Empresa demo con datos realistas chilenos
export const DEMO_COMPANY: Company = {
  id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', // ✅ CORREGIDO: Usar UUID de Supabase
  rut: '78.223.873-6',
  razon_social: 'ContaPyme Puq',
  nombre_fantasia: 'ContaPyme Puq',
  giro: 'Servicios de Consultoría Contable y Tributaria',
  direccion: 'Punta Arenas, Región de Magallanes, Chile',
  telefono: '+56 9 1234 5678',
  email: 'contacto@contapymepuq.cl',
  website: 'https://contapymepuq.cl',
  logo: '/logo-demo-company.png',
  created_at: '2024-01-15T10:00:00Z',
  plan_tipo: 'demo',
  estado: 'activo'
};

// Context configuration
interface CompanyContextType {
  company: Company;
  isDemoMode: boolean;
  switchCompany?: (companyId: string) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

// Provider Props
interface CompanyProviderProps {
  children: ReactNode;
  company?: Company;
  demoMode?: boolean;
}

// Provider Component
export function CompanyProvider({ 
  children, 
  company = DEMO_COMPANY, 
  demoMode = true 
}: CompanyProviderProps) {
  
  const contextValue: CompanyContextType = {
    company,
    isDemoMode: demoMode,
    isLoading: false,
    switchCompany: demoMode ? undefined : (companyId: string) => {
      console.log('Switching to company:', companyId);
      // En modo producción: lógica de cambio de empresa
      // En modo demo: no hace nada
    }
  };

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
}

// Hook para usar el contexto
export function useCompany() {
  const context = useContext(CompanyContext);
  
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  
  return context;
}

// Hook para datos de empresa
export function useCompanyData() {
  const { company, isDemoMode } = useCompany();
  
  return {
    rut: company.rut,
    razonSocial: company.razon_social,
    nombreFantasia: company.nombre_fantasia,
    giro: company.giro,
    direccion: company.direccion,
    telefono: company.telefono,
    email: company.email,
    website: company.website,
    logo: company.logo,
    planTipo: company.plan_tipo,
    estado: company.estado,
    isDemoMode,
    
    // Métodos de utilidad
    isActive: company.estado === 'activo',
    isPremium: ['profesional', 'empresarial'].includes(company.plan_tipo),
    getDisplayName: () => company.nombre_fantasia || company.razon_social,
    getShortRut: () => company.rut.replace(/\./g, '').replace('-', ''),
    
    // Formatters
    formatRut: () => company.rut,
    formatAddress: () => company.direccion,
    formatPhone: () => company.telefono
  };
}

// Configuración de modo demo
export const DEMO_MODE = true;

// Función para obtener empresa actual
export function getCurrentCompany(): Company {
  if (DEMO_MODE) {
    return DEMO_COMPANY;
  }
  
  // En producción: obtener de localStorage, session, etc.
  // Por ahora retorna demo
  return DEMO_COMPANY;
}

// Función para verificar si está en modo demo
export function isDemoMode(): boolean {
  return DEMO_MODE;
}

// Hook simplificado para obtener solo el company ID
export function useCompanyId(): string {
  const { company } = useCompany();
  return company.id;
}

// Función para obtener configuración de empresa
export function getCompanyConfig() {
  const company = getCurrentCompany();
  
  return {
    company,
    features: {
      f29Analysis: true,
      f29Comparative: true,
      economicIndicators: true,
      fixedAssets: company.plan_tipo !== 'demo' ? true : true, // En demo también disponible
      payroll: company.plan_tipo !== 'demo' ? true : true,
      reports: company.plan_tipo !== 'demo' ? true : true,
      configuration: true
    },
    limits: {
      employees: company.plan_tipo === 'demo' ? 10 : company.plan_tipo === 'basico' ? 25 : 100,
      f29Documents: company.plan_tipo === 'demo' ? 24 : 1000,
      storage: company.plan_tipo === 'demo' ? '100MB' : '10GB'
    },
    support: {
      email: company.plan_tipo === 'demo' ? false : true,
      phone: ['profesional', 'empresarial'].includes(company.plan_tipo),
      whatsapp: company.plan_tipo !== 'demo'
    }
  };
}