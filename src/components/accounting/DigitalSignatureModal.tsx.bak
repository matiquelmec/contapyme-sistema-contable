'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { X, FileText, Shield, Download, Eye, QrCode } from 'lucide-react';

interface DigitalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureData: SignatureFormData) => Promise<void>;
  isLoading: boolean;
  balanceData: any;
  period: string;
  companyName: string;
  companyId: string;
}

interface SignatureFormData {
  signerName: string;
  signerRut: string;
  signerRole: string;
  signerEmail: string;
}

interface SignatureResult {
  signatureId: string;
  verificationCode: string;
  signedAt: string;
  documentHash: string;
  signatureHash: string;
  qrCodeData: string;
  pdfBase64: string;
  certificateBase64: string;
}

export default function DigitalSignatureModal({
  isOpen,
  onClose,
  onSign,
  isLoading,
  balanceData,
  period,
  companyName,
  companyId
}: DigitalSignatureModalProps) {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [signatureResult, setSignatureResult] = useState<SignatureResult | null>(null);
  const [formData, setFormData] = useState<SignatureFormData>({
    signerName: '',
    signerRut: '',
    signerRole: 'Contador',
    signerEmail: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<SignatureFormData>>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: Partial<SignatureFormData> = {};
    
    if (!formData.signerName.trim()) {
      errors.signerName = 'Nombre del firmante es requerido';
    }
    
    if (!formData.signerRut.trim()) {
      errors.signerRut = 'RUT del firmante es requerido';
    } else if (!/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(formData.signerRut)) {
      errors.signerRut = 'Formato RUT inválido (ej: 12.345.678-9)';
    }
    
    if (!formData.signerRole.trim()) {
      errors.signerRole = 'Cargo del firmante es requerido';
    }
    
    if (formData.signerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.signerEmail)) {
      errors.signerEmail = 'Email inválido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const response = await fetch('/api/accounting/balance-8-columns/generate-signed-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId,
          period,
          companyName,
          balanceData,
          ...formData
        })
      });

      const result = await response.json();

      if (result.success) {
        setSignatureResult(result.data);
        setStep('result');
        await onSign(formData);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error firmando documento:', error);
      alert('Error al firmar el documento');
    }
  };

  const handleInputChange = (field: keyof SignatureFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const downloadPDF = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCertificate = () => {
    if (signatureResult) {
      downloadPDF(
        signatureResult.certificateBase64, 
        `Certificado-Firma-${signatureResult.verificationCode}.pdf`
      );
    }
  };

  const downloadSignedBalance = () => {
    if (signatureResult) {
      downloadPDF(
        signatureResult.pdfBase64, 
        `Balance-8-Columnas-Firmado-${period}.pdf`
      );
    }
  };

  const copyVerificationCode = () => {
    if (signatureResult) {
      navigator.clipboard.writeText(signatureResult.verificationCode);
      alert('Código de verificación copiado al portapapeles');
    }
  };

  const resetModal = () => {
    setStep('form');
    setSignatureResult(null);
    setFormData({
      signerName: '',
      signerRut: '',
      signerRole: 'Contador',
      signerEmail: ''
    });
    setFormErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Firma Digital del Balance
              </h2>
              <p className="text-sm text-gray-500">
                {step === 'form' ? 'Complete los datos del firmante' : 'Documento firmado exitosamente'}
              </p>
            </div>
          </div>
          <button
            onClick={resetModal}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 'form' && (
          <div className="p-6">
            {/* Información del documento */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900">Documento a firmar</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Balance de 8 Columnas - {period}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {companyName}
                  </p>
                  {balanceData?.accounts && (
                    <p className="text-xs text-blue-600 mt-2">
                      {balanceData.accounts.length} cuentas contables incluidas
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Formulario de firma */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del firmante *
                </label>
                <input
                  type="text"
                  value={formData.signerName}
                  onChange={(e) => handleInputChange('signerName', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.signerName ? 'border-red-500' : ''}`}
                  placeholder="Ej: Juan Carlos González"
                  disabled={isLoading}
                />
                {formErrors.signerName && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.signerName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RUT del firmante *
                </label>
                <input
                  type="text"
                  value={formData.signerRut}
                  onChange={(e) => handleInputChange('signerRut', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.signerRut ? 'border-red-500' : ''}`}
                  placeholder="12.345.678-9"
                  disabled={isLoading}
                />
                {formErrors.signerRut && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.signerRut}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargo/Profesión *
                </label>
                <select
                  value={formData.signerRole}
                  onChange={(e) => handleInputChange('signerRole', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.signerRole ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                >
                  <option value="Contador">Contador</option>
                  <option value="Contador Auditor">Contador Auditor</option>
                  <option value="Gerente General">Gerente General</option>
                  <option value="Gerente de Finanzas">Gerente de Finanzas</option>
                  <option value="Auditor">Auditor</option>
                  <option value="Representante Legal">Representante Legal</option>
                  <option value="Otro">Otro</option>
                </select>
                {formErrors.signerRole && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.signerRole}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={formData.signerEmail}
                  onChange={(e) => handleInputChange('signerEmail', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.signerEmail ? 'border-red-500' : ''}`}
                  placeholder="email@empresa.com"
                  disabled={isLoading}
                />
                {formErrors.signerEmail && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.signerEmail}</p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-800">
                      Importante sobre la firma digital
                    </h4>
                    <ul className="text-xs text-yellow-700 mt-2 space-y-1">
                      <li>• La firma digital garantiza la autenticidad e integridad del documento</li>
                      <li>• Se generará un código QR único para verificación pública</li>
                      <li>• El documento incluirá un certificado de firma descargable</li>
                      <li>• La firma queda registrada con fecha y hora exacta</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {step === 'result' && signatureResult && (
          <div className="p-6">
            {/* Confirmación exitosa */}
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">
                    Documento firmado exitosamente
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    Firmado el {new Date(signatureResult.signedAt).toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>

            {/* Información de verificación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Código de Verificación</h4>
                <div className="flex items-center space-x-2">
                  <code className="bg-white px-3 py-1 rounded border text-lg font-mono">
                    {signatureResult.verificationCode}
                  </code>
                  <button
                    onClick={copyVerificationCode}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Hash del Documento</h4>
                <code className="text-xs text-gray-600 font-mono break-all">
                  {signatureResult.documentHash.substring(0, 32)}...
                </code>
              </div>
            </div>

            {/* Acciones disponibles */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={downloadSignedBalance}
                  leftIcon={<Download className="w-4 h-4" />}
                  className="w-full"
                  variant="primary"
                >
                  Descargar PDF Firmado
                </Button>

                <Button
                  onClick={downloadCertificate}
                  leftIcon={<FileText className="w-4 h-4" />}
                  className="w-full"
                  variant="secondary"
                >
                  Descargar Certificado
                </Button>
              </div>

              <Button
                onClick={() => window.open(`/verify-signature/${signatureResult.verificationCode}`, '_blank')}
                leftIcon={<Eye className="w-4 h-4" />}
                className="w-full"
                variant="outline"
              >
                Verificar Firma Online
              </Button>
            </div>

            {/* Código QR */}
            <div className="text-center mt-6 p-4 bg-gray-50 rounded-lg">
              <QrCode className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                El PDF incluye un código QR para verificación directa
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          {step === 'form' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={resetModal}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                onClick={handleSubmit}
                disabled={isLoading}
                loading={isLoading}
              >
                {isLoading ? 'Firmando...' : 'Firmar Documento'}
              </Button>
            </>
          )}
          {step === 'result' && (
            <Button
              type="button"
              variant="primary"
              onClick={resetModal}
            >
              Cerrar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}