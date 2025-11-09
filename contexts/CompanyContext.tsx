'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Company {
  id: number;
  name: string;
  tax_id: string;
  pb_merchant_id: string | null;
  pb_api_token: string | null;
  checkbox_license_key: string | null;
  checkbox_cashier_pin: string | null;
  created_at: string;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  companies: Company[];
  setSelectedCompany: (company: Company | null) => void;
  loadCompanies: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load companies from API
  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Don't set error on initial load - just skip loading companies
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
        setError(null);

        // Auto-select first company if none selected
        if (data.companies && data.companies.length > 0 && !selectedCompany) {
          const savedCompanyId = localStorage.getItem('selectedCompanyId');
          const companyToSelect = savedCompanyId
            ? data.companies.find((c: Company) => c.id === parseInt(savedCompanyId))
            : data.companies[0];

          setSelectedCompanyState(companyToSelect || data.companies[0]);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Невідома помилка' }));
        const errorMessage = errorData.error || `Помилка ${response.status}: ${response.statusText}`;
        setError(errorMessage);
        console.error('Failed to fetch companies:', errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Помилка з\'єднання з сервером';
      setError(errorMessage);
      console.error('Error loading companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set selected company and save to localStorage
  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
    if (company) {
      localStorage.setItem('selectedCompanyId', company.id.toString());
      console.log('Selected company:', company.name);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
  };

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        companies,
        setSelectedCompany,
        loadCompanies,
        isLoading,
        error,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

// Custom hook to use the company context
export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
