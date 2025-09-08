// Company components exports
export { default as CompanyHeader } from './CompanyHeader';
export { CompanyHeaderCompact } from './CompanyHeader';

// Context exports for convenience
export { 
  CompanyProvider, 
  useCompany, 
  useCompanyData,
  getCurrentCompany,
  isDemoMode,
  getCompanyConfig,
  DEMO_COMPANY,
  DEMO_MODE
} from '@/contexts/CompanyContext';

// Types
export type { Company } from '@/contexts/CompanyContext';