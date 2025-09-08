export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'ADMIN' | 'CLIENT' | 'ACCOUNTANT'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'ADMIN' | 'CLIENT' | 'ACCOUNTANT'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'ADMIN' | 'CLIENT' | 'ACCOUNTANT'
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          rut: string
          address: string | null
          phone: string | null
          email: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          rut: string
          address?: string | null
          phone?: string | null
          email?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          rut?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          code: string
          name: string
          type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
          parent_id: string | null
          company_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
          parent_id?: string | null
          company_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
          parent_id?: string | null
          company_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          date: string
          description: string
          reference: string | null
          company_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          description: string
          reference?: string | null
          company_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          description?: string
          reference?: string | null
          company_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      transaction_entries: {
        Row: {
          id: string
          transaction_id: string
          account_id: string
          debit: number
          credit: number
          description: string | null
        }
        Insert: {
          id?: string
          transaction_id: string
          account_id: string
          debit?: number
          credit?: number
          description?: string | null
        }
        Update: {
          id?: string
          transaction_id?: string
          account_id?: string
          debit?: number
          credit?: number
          description?: string | null
        }
      }
      financial_reports: {
        Row: {
          id: string
          type: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'TRIAL_BALANCE'
          company_id: string
          start_date: string
          end_date: string
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          type: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'TRIAL_BALANCE'
          company_id: string
          start_date: string
          end_date: string
          data: Json
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'TRIAL_BALANCE'
          company_id?: string
          start_date?: string
          end_date?: string
          data?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}