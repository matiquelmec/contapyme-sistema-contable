'use client';

import { useState, useEffect } from 'react';
import { Account } from '@/types';

interface CachedAccountsData {
  accounts: Account[];
  timestamp: number;
  version: string;
}

const CACHE_KEY = 'chart_of_accounts_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
const CACHE_VERSION = '1.0'; // Incrementar para invalidar caché

export function useChartOfAccountsCache() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener datos del caché
  const getCachedAccounts = (): Account[] | null => {
    try {
      if (typeof window === 'undefined') return null;
      
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: CachedAccountsData = JSON.parse(cached);
      
      // Verificar versión y expiración
      const isExpired = Date.now() - data.timestamp > CACHE_DURATION;
      const isOldVersion = data.version !== CACHE_VERSION;
      
      if (isExpired || isOldVersion) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      console.log('✅ Plan de cuentas cargado desde caché:', data.accounts.length, 'cuentas');
      return data.accounts;
    } catch (error) {
      console.error('❌ Error leyendo caché:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  };

  // Guardar datos en caché
  const setCachedAccounts = (accounts: Account[]): void => {
    try {
      if (typeof window === 'undefined') return;
      
      const data: CachedAccountsData = {
        accounts,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      console.log('💾 Plan de cuentas guardado en caché:', accounts.length, 'cuentas');
    } catch (error) {
      console.error('❌ Error guardando caché:', error);
    }
  };

  // Cargar cuentas (caché primero, API como fallback)
  const loadAccounts = async (filters: any = {}): Promise<Account[]> => {
    setLoading(true);
    setError(null);

    try {
      // 1. Intentar cargar desde caché primero
      const cachedAccounts = getCachedAccounts();
      if (cachedAccounts && cachedAccounts.length > 0) {
        // Aplicar filtros si los hay
        const filteredAccounts = applyFilters(cachedAccounts, filters);
        setAccounts(filteredAccounts);
        setLoading(false);
        return filteredAccounts;
      }

      // 2. Si no hay caché, cargar desde API
      console.log('🔄 Cargando plan de cuentas desde API...');
      
      const params = new URLSearchParams();
      if (filters.level) params.append('level', filters.level);
      if (filters.type) params.append('type', filters.type);
      
      const response = await fetch(`/api/chart-of-accounts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const apiAccounts = data.accounts || [];

      // Convertir formato API a formato Account
      const normalizedAccounts: Account[] = apiAccounts.map((acc: any) => ({
        id: acc.code,
        code: acc.code,
        name: acc.name,
        level: acc.level_type === 'Imputable' ? 4 : 
               acc.level_type === '3er Nivel' ? 3 :
               acc.level_type === '2do Nivel' ? 2 : 1,
        account_type: acc.account_type.toLowerCase(),
        is_detail: acc.level_type === 'Imputable',
        is_active: acc.is_active !== false
      }));

      // 3. Guardar en caché para próximas consultas
      setCachedAccounts(normalizedAccounts);

      // 4. Aplicar filtros y retornar
      const filteredAccounts = applyFilters(normalizedAccounts, filters);
      setAccounts(filteredAccounts);
      setLoading(false);
      
      return filteredAccounts;

    } catch (error: any) {
      console.error('❌ Error cargando plan de cuentas:', error);
      setError(error.message || 'Error desconocido');
      setLoading(false);
      return [];
    }
  };

  // Aplicar filtros a las cuentas
  const applyFilters = (accounts: Account[], filters: any): Account[] => {
    let filtered = [...accounts];

    if (filters.level) {
      const levelMap: Record<string, string> = {
        'Imputable': '4',
        '3er Nivel': '3', 
        '2do Nivel': '2',
        '1er Nivel': '1'
      };
      const targetLevel = levelMap[filters.level] || filters.level;
      filtered = filtered.filter(acc => acc.level.toString() === targetLevel);
    }

    if (filters.type) {
      filtered = filtered.filter(acc => 
        acc.account_type.toLowerCase() === filters.type.toLowerCase()
      );
    }

    return filtered.sort((a, b) => a.code.localeCompare(b.code));
  };

  // Invalidar caché manualmente
  const invalidateCache = (): void => {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Caché de plan de cuentas invalidado');
  };

  // Obtener información del caché
  const getCacheInfo = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: CachedAccountsData = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      const remainingTime = CACHE_DURATION - age;
      
      return {
        accounts: data.accounts.length,
        age: Math.floor(age / 1000 / 60), // minutos
        remainingTime: Math.floor(remainingTime / 1000 / 60), // minutos
        version: data.version
      };
    } catch {
      return null;
    }
  };

  // Cargar automáticamente al montar
  useEffect(() => {
    loadAccounts();
  }, []);

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    invalidateCache,
    getCacheInfo,
    refreshCache: () => {
      invalidateCache();
      return loadAccounts();
    }
  };
}