import CryptoJS from 'crypto-js';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface SignatureData {
  documentType: string;
  documentName: string;
  documentPeriod?: string;
  signerName: string;
  signerRut: string;
  signerRole: string;
  signerEmail?: string;
  documentContent: any;
  companyId: string;
}

interface SignatureResult {
  signatureHash: string;
  documentHash: string;
  signatureData: string;
  verificationCode: string;
  qrCodeData: string;
  signedAt: Date;
}

export class DigitalSignatureService {
  private static SECRET_KEY = process.env.SIGNATURE_SECRET_KEY || 'ContaPyme2025-SecureKey';

  /**
   * Genera una firma digital para un documento
   */
  static async generateSignature(data: SignatureData): Promise<SignatureResult> {
    // Generar hash del documento
    const documentHash = this.generateDocumentHash(data.documentContent);
    
    // Generar código de verificación único
    const verificationCode = this.generateVerificationCode();
    
    // Crear payload de la firma
    const signaturePayload = {
      documentHash,
      documentType: data.documentType,
      documentName: data.documentName,
      documentPeriod: data.documentPeriod,
      signerName: data.signerName,
      signerRut: data.signerRut,
      signerRole: data.signerRole,
      signerEmail: data.signerEmail,
      companyId: data.companyId,
      timestamp: new Date().toISOString(),
      verificationCode
    };

    // Generar firma digital encriptada
    const signatureData = this.encryptSignature(signaturePayload);
    
    // Generar hash de la firma
    const signatureHash = CryptoJS.SHA256(signatureData).toString();
    
    // Generar datos del código QR
    const qrData = await this.generateQRData(verificationCode, signatureHash);
    
    return {
      signatureHash,
      documentHash,
      signatureData,
      verificationCode,
      qrCodeData: qrData,
      signedAt: new Date()
    };
  }

  /**
   * Genera hash SHA-256 del contenido del documento
   */
  static generateDocumentHash(content: any): string {
    const contentString = typeof content === 'string' 
      ? content 
      : JSON.stringify(content);
    return CryptoJS.SHA256(contentString).toString();
  }

  /**
   * Genera código de verificación único
   */
  private static generateVerificationCode(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    const hash = CryptoJS.SHA256(timestamp + random).toString();
    return hash.substring(0, 10).toUpperCase();
  }

  /**
   * Encripta los datos de la firma
   */
  private static encryptSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    return CryptoJS.AES.encrypt(payloadString, this.SECRET_KEY).toString();
  }

  /**
   * Desencripta y verifica una firma
   */
  static decryptAndVerifySignature(signatureData: string): any {
    try {
      const decrypted = CryptoJS.AES.decrypt(signatureData, this.SECRET_KEY);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Error al verificar firma:', error);
      return null;
    }
  }

  /**
   * Genera datos para código QR
   */
  private static async generateQRData(verificationCode: string, signatureHash: string): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-signature/${verificationCode}`;
    
    const qrData = {
      url: verificationUrl,
      code: verificationCode,
      hash: signatureHash.substring(0, 8),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(qrData);
  }

  /**
   * Genera código QR como imagen base64
   */
  static async generateQRCodeImage(qrData: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generando QR:', error);
      throw error;
    }
  }

  /**
   * Agrega firma digital a un PDF existente
   */
  static async signPDF(
    pdfBytes: Uint8Array, 
    signatureData: SignatureResult,
    signerInfo: {
      name: string;
      rut: string;
      role: string;
    }
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    // Cargar fuentes
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Configuración de posición y estilo
    const signatureBoxY = 50; // Desde abajo
    const signatureBoxHeight = 100;
    const signatureBoxWidth = 250;
    const signatureBoxX = width - signatureBoxWidth - 50; // Esquina inferior derecha
    
    // Dibujar caja de firma
    firstPage.drawRectangle({
      x: signatureBoxX,
      y: signatureBoxY,
      width: signatureBoxWidth,
      height: signatureBoxHeight,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.98)
    });
    
    // Título de la firma
    firstPage.drawText('DOCUMENTO FIRMADO DIGITALMENTE', {
      x: signatureBoxX + 10,
      y: signatureBoxY + signatureBoxHeight - 20,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    
    // Información del firmante
    const infoLines = [
      `Firmado por: ${signerInfo.name}`,
      `RUT: ${signerInfo.rut}`,
      `Cargo: ${signerInfo.role}`,
      `Fecha: ${new Date(signatureData.signedAt).toLocaleString('es-CL')}`,
      `Código: ${signatureData.verificationCode}`
    ];
    
    let yPosition = signatureBoxY + signatureBoxHeight - 40;
    for (const line of infoLines) {
      firstPage.drawText(line, {
        x: signatureBoxX + 10,
        y: yPosition,
        size: 8,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2)
      });
      yPosition -= 12;
    }
    
    // Generar y agregar código QR
    try {
      const qrImageBase64 = await this.generateQRCodeImage(signatureData.qrCodeData);
      const qrImageBytes = Uint8Array.from(
        atob(qrImageBase64.split(',')[1]),
        c => c.charCodeAt(0)
      );
      
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      const qrSize = 60;
      
      firstPage.drawImage(qrImage, {
        x: signatureBoxX + signatureBoxWidth - qrSize - 10,
        y: signatureBoxY + 10,
        width: qrSize,
        height: qrSize
      });
    } catch (error) {
      console.error('Error agregando QR al PDF:', error);
    }
    
    // Agregar marca de agua en todas las páginas
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText('Firmado Digitalmente', {
        x: width / 2 - 100,
        y: height - 30,
        size: 8,
        font: helveticaFont,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.5
      });
    }
    
    // Agregar metadata al PDF
    pdfDoc.setTitle(`${signerInfo.name} - Documento Firmado`);
    pdfDoc.setAuthor(signerInfo.name);
    pdfDoc.setSubject(`Firmado digitalmente con código ${signatureData.verificationCode}`);
    pdfDoc.setKeywords(['firmado', 'digital', 'contapyme', signatureData.verificationCode]);
    pdfDoc.setProducer('ContaPyme - Sistema de Firma Digital');
    pdfDoc.setCreator('ContaPyme');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());
    
    return await pdfDoc.save();
  }

  /**
   * Verifica la integridad de un documento firmado
   */
  static verifyDocumentIntegrity(
    documentContent: any, 
    storedDocumentHash: string
  ): boolean {
    const currentHash = this.generateDocumentHash(documentContent);
    return currentHash === storedDocumentHash;
  }

  /**
   * Genera certificado de firma para descarga
   */
  static async generateSignatureCertificate(
    signatureData: SignatureResult,
    signerInfo: {
      name: string;
      rut: string;
      role: string;
      email?: string;
    },
    documentInfo: {
      type: string;
      name: string;
      period?: string;
    }
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    
    // Cargar fuentes
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    
    // Título principal
    page.drawText('CERTIFICADO DE FIRMA DIGITAL', {
      x: width / 2 - 150,
      y: height - 100,
      size: 20,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0.8)
    });
    
    // Línea decorativa
    page.drawRectangle({
      x: 50,
      y: height - 120,
      width: width - 100,
      height: 2,
      color: rgb(0, 0, 0.8)
    });
    
    // Contenido del certificado
    const content = [
      '',
      'Este documento certifica que:',
      '',
      `${signerInfo.name}`,
      `RUT: ${signerInfo.rut}`,
      `En calidad de: ${signerInfo.role}`,
      signerInfo.email ? `Email: ${signerInfo.email}` : '',
      '',
      'Ha firmado digitalmente el siguiente documento:',
      '',
      `Tipo: ${documentInfo.type}`,
      `Nombre: ${documentInfo.name}`,
      documentInfo.period ? `Período: ${documentInfo.period}` : '',
      '',
      'Información técnica de la firma:',
      '',
      `Código de verificación: ${signatureData.verificationCode}`,
      `Hash del documento: ${signatureData.documentHash.substring(0, 32)}...`,
      `Hash de la firma: ${signatureData.signatureHash.substring(0, 32)}...`,
      `Fecha y hora: ${new Date(signatureData.signedAt).toLocaleString('es-CL')}`,
      '',
      'Este certificado garantiza:',
      '• La identidad del firmante',
      '• La integridad del documento',
      '• El no repudio de la firma',
      '• La fecha y hora de la firma',
      '',
      'Para verificar la autenticidad de esta firma, escanee el código QR',
      'o visite: www.contapyme.cl/verificar/' + signatureData.verificationCode
    ];
    
    let yPosition = height - 160;
    for (const line of content) {
      if (line === '') {
        yPosition -= 20;
        continue;
      }
      
      const isBold = line.includes('Este documento certifica') || 
                    line.includes('Ha firmado digitalmente') ||
                    line.includes('Información técnica') ||
                    line.includes('Este certificado garantiza');
      
      const isMainInfo = line.includes(signerInfo.name) && !line.includes(':');
      
      page.drawText(line, {
        x: 70,
        y: yPosition,
        size: isMainInfo ? 14 : (isBold ? 12 : 11),
        font: isMainInfo ? helveticaBoldFont : (isBold ? helveticaBoldFont : helveticaFont),
        color: isMainInfo ? rgb(0, 0, 0.8) : rgb(0, 0, 0)
      });
      
      yPosition -= isMainInfo ? 25 : 20;
    }
    
    // Agregar código QR
    try {
      const qrImageBase64 = await this.generateQRCodeImage(signatureData.qrCodeData);
      const qrImageBytes = Uint8Array.from(
        atob(qrImageBase64.split(',')[1]),
        c => c.charCodeAt(0)
      );
      
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      const qrSize = 100;
      
      page.drawImage(qrImage, {
        x: width / 2 - qrSize / 2,
        y: 50,
        width: qrSize,
        height: qrSize
      });
    } catch (error) {
      console.error('Error agregando QR al certificado:', error);
    }
    
    // Pie de página
    page.drawText('ContaPyme - Sistema de Gestión Contable', {
      x: width / 2 - 100,
      y: 30,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5)
    });
    
    // Metadata
    pdfDoc.setTitle('Certificado de Firma Digital');
    pdfDoc.setAuthor('ContaPyme');
    pdfDoc.setSubject(`Certificado de firma ${signatureData.verificationCode}`);
    pdfDoc.setCreationDate(new Date());
    
    return await pdfDoc.save();
  }
}