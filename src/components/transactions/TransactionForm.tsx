'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'

interface TransactionEntry {
  accountId: string
  debit: number
  credit: number
  description?: string
}

interface TransactionFormProps {
  companyId: string
  accounts: Array<{
    id: string
    code: string
    name: string
    type: string
  }>
  transaction?: {
    id: string
    date: string
    description: string
    reference?: string
    entries: Array<{
      id: string
      account_id: string
      debit: number
      credit: number
      description?: string
    }>
  }
}

export default function TransactionForm({ companyId, accounts, transaction }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    date: transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    description: transaction?.description || '',
    reference: transaction?.reference || ''
  })
  
  const [entries, setEntries] = useState<TransactionEntry[]>(
    transaction?.entries?.map(entry => ({
      accountId: entry.account_id,
      debit: Number(entry.debit),
      credit: Number(entry.credit),
      description: entry.description || ''
    })) || [
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' }
    ]
  )
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Calculate totals
  const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredits = entries.reduce((sum, entry) => sum + entry.credit, 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleEntryChange = (index: number, field: keyof TransactionEntry, value: string | number) => {
    const newEntries = [...entries]
    if (field === 'debit' || field === 'credit') {
      newEntries[index][field] = Number(value) || 0
    } else {
      newEntries[index][field] = value as string
    }
    setEntries(newEntries)
  }

  const addEntry = () => {
    setEntries([...entries, { accountId: '', debit: 0, credit: 0, description: '' }])
  }

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!isBalanced) {
      setError('Los débitos y créditos deben estar balanceados')
      setLoading(false)
      return
    }

    const validEntries = entries.filter(entry => 
      entry.accountId && (entry.debit > 0 || entry.credit > 0)
    )

    if (validEntries.length < 2) {
      setError('Debe haber al menos 2 asientos con cuenta y monto')
      setLoading(false)
      return
    }

    try {
      if (transaction) {
        // Update existing transaction
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            date: formData.date,
            description: formData.description,
            reference: formData.reference || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id)

        if (updateError) throw updateError

        // Delete existing entries
        const { error: deleteError } = await supabase
          .from('transaction_entries')
          .delete()
          .eq('transaction_id', transaction.id)

        if (deleteError) throw deleteError

        // Insert new entries
        const entriesToInsert = validEntries.map(entry => ({
          transaction_id: transaction.id,
          account_id: entry.accountId,
          debit: entry.debit,
          credit: entry.credit,
          description: entry.description || null
        }))

        const { error: entriesError } = await supabase
          .from('transaction_entries')
          .insert(entriesToInsert)

        if (entriesError) throw entriesError

      } else {
        // Create new transaction
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .insert([{
            company_id: companyId,
            date: formData.date,
            description: formData.description,
            reference: formData.reference || null
          }])
          .select()
          .single()

        if (transactionError) throw transactionError

        // Insert entries
        const entriesToInsert = validEntries.map(entry => ({
          transaction_id: transactionData.id,
          account_id: entry.accountId,
          debit: entry.debit,
          credit: entry.credit,
          description: entry.description || null
        }))

        const { error: entriesError } = await supabase
          .from('transaction_entries')
          .insert(entriesToInsert)

        if (entriesError) throw entriesError
      }

      router.push(`/companies/${companyId}/transactions`)
      router.refresh()

    } catch (err: any) {
      setError(err.message || 'Error inesperado. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Transaction Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Fecha *
          </label>
          <input
            type="date"
            name="date"
            id="date"
            required
            value={formData.date}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-gray-700">
            Referencia
          </label>
          <input
            type="text"
            name="reference"
            id="reference"
            value={formData.reference}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Nº factura, cheque, etc."
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700">
            Balance
          </label>
          <div className={`mt-1 px-3 py-2 text-sm font-medium rounded-md ${
            isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isBalanced ? '✓ Balanceado' : `Diferencia: $${Math.abs(totalDebits - totalCredits).toLocaleString()}`}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Descripción *
        </label>
        <input
          type="text"
          name="description"
          id="description"
          required
          value={formData.description}
          onChange={handleFormChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Descripción de la transacción"
        />
      </div>

      {/* Transaction Entries */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Asientos Contables</h3>
          <button
            type="button"
            onClick={addEntry}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
          >
            + Agregar línea
          </button>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 text-sm font-medium text-gray-700 border-b">
            <div className="col-span-4">Cuenta</div>
            <div className="col-span-3">Descripción</div>
            <div className="col-span-2 text-right">Debe</div>
            <div className="col-span-2 text-right">Haber</div>
            <div className="col-span-1"></div>
          </div>

          {entries.map((entry, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 p-3 border-b last:border-b-0">
              <div className="col-span-4">
                <select
                  value={entry.accountId}
                  onChange={(e) => handleEntryChange(index, 'accountId', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <input
                  type="text"
                  value={entry.description}
                  onChange={(e) => handleEntryChange(index, 'description', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Detalle específico"
                />
              </div>

              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entry.debit || ''}
                  onChange={(e) => handleEntryChange(index, 'debit', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entry.credit || ''}
                  onChange={(e) => handleEntryChange(index, 'credit', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div className="col-span-1 flex justify-center">
                {entries.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Totals */}
          <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 font-medium">
            <div className="col-span-7 text-right">TOTALES:</div>
            <div className="col-span-2 text-right">${totalDebits.toLocaleString()}</div>
            <div className="col-span-2 text-right">${totalCredits.toLocaleString()}</div>
            <div className="col-span-1"></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !isBalanced}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : (transaction ? 'Actualizar' : 'Crear transacción')}
        </button>
      </div>
    </form>
  )
}