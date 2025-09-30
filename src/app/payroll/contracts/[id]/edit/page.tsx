'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PayrollHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';

interface Contract {
  id: string;
  employee_id: string;
  position: string;
  department: string;
  contract_type: string;
  start_date: string;
  end_date?: string;
  base_salary: number;
  weekly_hours: number;
  workplace_address?: string;
  status: string;
}

export default function EditContractPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

  useEffect(() => {
    if (contractId) {
      fetchContract();
    }
  }, [contractId]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payroll/contracts/${contractId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setContract(data.data);
      } else {
        setError('Error al cargar el contrato');
      }
    } catch (err) {
      console.error('Error fetching contract:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/payroll/contracts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contract),
      });

      if (response.ok) {
        router.push(`/payroll/contracts/${contractId}`);
      } else {
        setError('Error al guardar el contrato');
      }
    } catch (err) {
      console.error('Error saving contract:', err);
      setError('Error de conexión al guardar');
    } finally {
      setSaving(false);
    }
  };

  const updateContract = (field: keyof Contract, value: any) => {
    if (!contract) return;
    setContract({ ...contract, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PayrollHeader 
          title="Editando Contrato"
          subtitle="Cargando información del contrato..."
          showBackButton
        />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando contrato...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PayrollHeader 
          title="Error"
          subtitle="No se pudo cargar el contrato"
          showBackButton
        />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">{error || 'Contrato no encontrado'}</p>
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PayrollHeader 
        title="Editar Contrato"
        subtitle={`Editando contrato de ${contract.position}`}
        showBackButton
      />

      <div className="max-w-4xl mx-auto py-8 px-4">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Información del Contrato</CardTitle>
              <CardDescription>
                Edita los detalles del contrato laboral
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo/Posición
                  </label>
                  <input
                    type="text"
                    value={contract.position}
                    onChange={(e) => updateContract('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={contract.department || ''}
                    onChange={(e) => updateContract('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Contrato
                  </label>
                  <select
                    value={contract.contract_type}
                    onChange={(e) => updateContract('contract_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="indefinido">Indefinido</option>
                    <option value="plazo_fijo">Plazo Fijo</option>
                    <option value="por_obra">Por Obra</option>
                    <option value="part_time">Part Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sueldo Base (CLP)
                  </label>
                  <input
                    type="number"
                    value={contract.base_salary}
                    onChange={(e) => updateContract('base_salary', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={contract.start_date}
                    onChange={(e) => updateContract('start_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas Semanales
                  </label>
                  <input
                    type="number"
                    value={contract.weekly_hours}
                    onChange={(e) => updateContract('weekly_hours', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    min="1"
                    max="45"
                  />
                </div>

                {contract.contract_type !== 'indefinido' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Término
                    </label>
                    <input
                      type="date"
                      value={contract.end_date || ''}
                      onChange={(e) => updateContract('end_date', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={contract.status}
                    onChange={(e) => updateContract('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">Borrador</option>
                    <option value="active">Activo</option>
                    <option value="terminated">Terminado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección del Lugar de Trabajo
                </label>
                <textarea
                  value={contract.workplace_address || ''}
                  onChange={(e) => updateContract('workplace_address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Dirección completa del lugar de trabajo"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}