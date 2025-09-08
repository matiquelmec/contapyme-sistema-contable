'use client';

import { useState, useEffect } from 'react';

interface Account {
  code: string;
  name: string;
  level_type: string;
  account_type: string;
  parent_code?: string;
  is_active: boolean;
}

interface AccountSelectorProps {
  value?: string;
  onSelect: (accountCode: string, accountName: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function AccountSelector({ 
  value = '', 
  onSelect, 
  placeholder = "Seleccionar cuenta...", 
  className = "",
  disabled = false
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Load accounts from API
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chart-of-accounts');
      const result = await response.json();
      
      if (result.accounts) {
        setAccounts(result.accounts);
      }
    } catch (error) {
      console.error('Error loading chart of accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Set initial selected account based on value prop
  useEffect(() => {
    if (value && accounts.length > 0) {
      const account = accounts.find(acc => acc.code === value);
      setSelectedAccount(account || null);
    }
  }, [value, accounts]);

  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account => 
    account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setIsOpen(false);
    setSearchTerm('');
    onSelect(account.code, account.name);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearchTerm('');
    }
  };

  const displayValue = selectedAccount 
    ? `${selectedAccount.code} - ${selectedAccount.name}`
    : '';

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div
        onClick={handleInputClick}
        className={`
          w-full px-3 py-2 border rounded-md cursor-pointer transition-colors
          ${disabled 
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed text-gray-500' 
            : 'bg-white border-gray-300 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'
          }
          ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={`block truncate ${displayValue ? 'text-gray-900' : 'text-gray-500'}`}>
            {displayValue || placeholder}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {/* Search Input */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-4 text-center text-gray-500">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                Cargando cuentas...
              </div>
            </div>
          )}

          {/* Account List */}
          {!loading && (
            <div className="max-h-48 overflow-y-auto">
              {filteredAccounts.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">
                  {searchTerm ? 'No se encontraron cuentas' : 'No hay cuentas disponibles'}
                </div>
              ) : (
                filteredAccounts.map((account) => (
                  <div
                    key={account.code}
                    onClick={() => handleAccountSelect(account)}
                    className={`
                      px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0
                      ${selectedAccount?.code === account.code ? 'bg-blue-100' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {account.code}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {account.name}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {account.level_type}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Click outside handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}