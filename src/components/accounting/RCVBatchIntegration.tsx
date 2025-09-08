'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Upload, 
  FileText, 
  Database,
  Package,
  AlertTriangle,
  Building2,
  DollarSign,
  Split,
  Save,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

interface EntityValidation {
  entity_rut: string;
  entity_name: string;
  has_account: boolean;
  account_code?: string;
  account_name?: string;
  is_active: boolean;
}

interface BatchResult {
  batch: number;
  success: boolean;
  transactions?: number;
  total_amount?: number;
  error?: string;
}

interface JournalEntry {
  description: string;
  reference: string;
  entry_date: string;
  details: Array<{
    account_code: string;
    account_name: string;
    description: string;
    debit_amount: number;
    credit_amount: number;
  }>;
  metadata?: {
    batch_number?: number;
    total_batches?: number;
    transactions_included?: number;
  };
}

interface RCVBatchIntegrationProps {
  companyId: string;
  rcvData: any[];
  period: string;
  rcvType: 'purchase' | 'sales';
  onClose?: () => void;
  onSuccess?: (results: any) => void;
}

export default function RCVBatchIntegration({ 
  companyId, 
  rcvData, 
  period, 
  rcvType,
  onClose,
  onSuccess 
}: RCVBatchIntegrationProps) {
  const [loading, setLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [processingResults, setProcessingResults] = useState<BatchResult[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [activeTab, setActiveTab] = useState('validation');
  const [saveToDatabase, setSaveToDatabase] = useState(false);
  const [forceProcess, setForceProcess] = useState(false);
  const [batchConfig, setBatchConfig] = useState<any>(null);

  // Cargar estado de validación al montar
  useEffect(() => {
    loadValidationStatus();
  }, []);

  const loadValidationStatus = async () => {
    try {
      const response = await fetch(`/api/accounting/journal-book/integration/rcv-batch?company_id=${companyId}`);
      if (response.ok) {
        const result = await response.json();
        setValidationStatus(result.data);
        setBatchConfig(result.data.batch_limits);
      }
    } catch (error) {
      console.error('Error cargando estado de validación:', error);
    }
  };

  const validateAndProcess = async () => {
    setLoading(true);
    setProcessingResults([]);
    setJournalEntries([]);
    
    try {
      const response = await fetch('/api/accounting/journal-book/integration/rcv-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          period,
          rcv_data: rcvData,
          rcv_type: rcvType,
          options: {
            save_to_database: saveToDatabase,
            force_process: forceProcess
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setValidationResult(result.data.validation);
        setProcessingResults(result.data.processing_results || []);
        setJournalEntries(result.data.journal_entries || []);
        setActiveTab('results');
        
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        // Si falló la validación, mostrar detalles
        if (result.validation) {
          setValidationResult(result.validation);
          setActiveTab('validation');
        }
        alert(result.error || 'Error procesando RCV');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error procesando archivo RCV');
    } finally {
      setLoading(false);
    }
  };

  const downloadJournalEntries = () => {
    const data = journalEntries.map(entry => ({
      fecha: entry.entry_date,
      descripcion: entry.description,
      referencia: entry.reference,
      lote: entry.metadata?.batch_number,
      transacciones: entry.metadata?.transactions_included,
      detalles: entry.details.map(d => ({
        cuenta: d.account_code,
        nombre_cuenta: d.account_name,
        descripcion: d.description,
        debe: d.debit_amount,
        haber: d.credit_amount
      }))
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asientos_rcv_${period}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const calculateTotals = () => {
    const totalTransactions = rcvData.length;
    const totalAmount = rcvData.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const estimatedBatches = Math.ceil(totalTransactions / (batchConfig?.max_transactions_per_batch || 100));
    
    return { totalTransactions, totalAmount, estimatedBatches };
  };

  const { totalTransactions, totalAmount, estimatedBatches } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Integración RCV por Lotes - {rcvType === 'purchase' ? 'Compras' : 'Ventas'}
          </CardTitle>
          <CardDescription>
            Período: {period} | {totalTransactions} transacciones | ${totalAmount.toLocaleString('es-CL')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <div className="text-sm text-muted-foreground">Transacciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{estimatedBatches}</div>
              <div className="text-sm text-muted-foreground">Lotes estimados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                ${(totalAmount / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-muted-foreground">Monto total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de validación y resultados */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="validation">Validación</TabsTrigger>
          <TabsTrigger value="configuration">Configuración</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
        </TabsList>

        {/* Tab de Validación */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Validación</CardTitle>
              <CardDescription>
                Verificación de cuentas contables y entidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationStatus && (
                <>
                  {/* Estado de entidades */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Entidades RCV
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-sm">Total configuradas:</span>
                        <Badge variant="outline">{validationStatus.entity_status.total_entities}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Con cuentas asignadas:</span>
                        <Badge variant="outline" className="bg-green-50">
                          {validationStatus.entity_status.entities_with_accounts}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Sin cuentas:</span>
                        <Badge variant="outline" className="bg-yellow-50">
                          {validationStatus.entity_status.entities_without_accounts}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Cobertura:</span>
                        <Badge variant="outline">
                          {validationStatus.entity_status.coverage_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={validationStatus.entity_status.coverage_percentage} 
                      className="h-2"
                    />
                  </div>

                  {/* Estado de configuración central */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Configuración Central
                    </h4>
                    <div className="space-y-1">
                      {validationStatus.central_config_status.configured ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Configuración central detectada</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">Sin configuración central</span>
                        </div>
                      )}
                      
                      {validationStatus.central_config_status.has_default_accounts && (
                        <div className="flex items-center gap-2 text-green-600 ml-6">
                          <CheckCircle className="h-3 w-3" />
                          <span className="text-xs">Cuentas por defecto configuradas</span>
                        </div>
                      )}
                      
                      {validationStatus.central_config_status.has_iva_accounts && (
                        <div className="flex items-center gap-2 text-green-600 ml-6">
                          <CheckCircle className="h-3 w-3" />
                          <span className="text-xs">Cuentas IVA configuradas</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resultados de validación si existen */}
                  {validationResult && (
                    <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {validationResult.errors.length > 0 && (
                          <div className="space-y-1">
                            <strong>Errores:</strong>
                            {validationResult.errors.map((error: string, i: number) => (
                              <div key={i} className="text-sm">{error}</div>
                            ))}
                          </div>
                        )}
                        {validationResult.warnings.length > 0 && (
                          <div className="space-y-1 mt-2">
                            <strong>Advertencias:</strong>
                            {validationResult.warnings.slice(0, 5).map((warning: string, i: number) => (
                              <div key={i} className="text-sm">{warning}</div>
                            ))}
                            {validationResult.warnings.length > 5 && (
                              <div className="text-sm text-muted-foreground">
                                ... y {validationResult.warnings.length - 5} más
                              </div>
                            )}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Configuración */}
        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Procesamiento</CardTitle>
              <CardDescription>
                Opciones para el procesamiento por lotes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Límites de lotes */}
              {batchConfig && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Split className="h-4 w-4" />
                    Límites por Lote
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Máx. transacciones:</span>
                      <Badge variant="outline">{batchConfig.max_transactions_per_batch}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Máx. líneas de detalle:</span>
                      <Badge variant="outline">{batchConfig.max_details_per_entry}</Badge>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span>Máx. monto por lote:</span>
                      <Badge variant="outline">
                        ${(batchConfig.max_amount_per_batch / 1000000).toFixed(0)}M
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Opciones de procesamiento */}
              <div className="space-y-3">
                <h4 className="font-medium">Opciones de Procesamiento</h4>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="save-db"
                    checked={saveToDatabase}
                    onCheckedChange={(checked) => setSaveToDatabase(checked as boolean)}
                  />
                  <label 
                    htmlFor="save-db" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Guardar asientos en base de datos
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="force-process"
                    checked={forceProcess}
                    onCheckedChange={(checked) => setForceProcess(checked as boolean)}
                  />
                  <label 
                    htmlFor="force-process" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Procesar con cuentas por defecto (ignorar advertencias)
                  </label>
                </div>
              </div>

              {/* Advertencia si force process está activo */}
              {forceProcess && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Al activar esta opción, las entidades sin cuenta configurada usarán las cuentas por defecto.
                    Esto puede generar asientos menos precisos.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Resultados */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Resultados del Procesamiento</CardTitle>
              <CardDescription>
                Asientos contables generados por lote
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resultados por lote */}
              {processingResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Procesamiento por Lotes</h4>
                  <div className="space-y-2">
                    {processingResults.map((result, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          result.success ? 'bg-green-50' : 'bg-red-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm font-medium">Lote {result.batch}</span>
                        </div>
                        <div className="text-sm">
                          {result.success ? (
                            <span>
                              {result.transactions} transacciones - 
                              ${result.total_amount?.toLocaleString('es-CL')}
                            </span>
                          ) : (
                            <span className="text-red-600">{result.error}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vista previa de asientos */}
              {journalEntries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Asientos Generados</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={downloadJournalEntries}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar JSON
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {journalEntries.slice(0, 3).map((entry, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">{entry.description}</div>
                            <div className="text-xs text-muted-foreground">
                              Ref: {entry.reference} | Fecha: {entry.entry_date}
                            </div>
                          </div>
                          <Badge variant="outline">
                            Lote {entry.metadata?.batch_number}/{entry.metadata?.total_batches}
                          </Badge>
                        </div>
                        
                        <div className="text-xs space-y-1">
                          <div className="grid grid-cols-4 gap-2 font-medium border-b pb-1">
                            <div>Cuenta</div>
                            <div>Descripción</div>
                            <div className="text-right">Debe</div>
                            <div className="text-right">Haber</div>
                          </div>
                          {entry.details.slice(0, 3).map((detail, i) => (
                            <div key={i} className="grid grid-cols-4 gap-2">
                              <div>{detail.account_code}</div>
                              <div className="truncate">{detail.description}</div>
                              <div className="text-right">
                                {detail.debit_amount > 0 && 
                                  `$${detail.debit_amount.toLocaleString('es-CL')}`
                                }
                              </div>
                              <div className="text-right">
                                {detail.credit_amount > 0 && 
                                  `$${detail.credit_amount.toLocaleString('es-CL')}`
                                }
                              </div>
                            </div>
                          ))}
                          {entry.details.length > 3 && (
                            <div className="text-muted-foreground">
                              ... y {entry.details.length - 3} líneas más
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {journalEntries.length > 3 && (
                      <div className="text-center text-sm text-muted-foreground">
                        Mostrando 3 de {journalEntries.length} asientos generados
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botones de acción */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={loadValidationStatus}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Revalidar
          </Button>
          
          <Button 
            onClick={validateAndProcess}
            disabled={loading || (!validationStatus?.central_config_status.configured && !forceProcess)}
          >
            {loading ? (
              <>Procesando...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Procesar e Integrar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}