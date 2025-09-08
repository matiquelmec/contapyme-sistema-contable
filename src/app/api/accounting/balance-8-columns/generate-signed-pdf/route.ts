import { NextRequest, NextResponse } from 'next/server';
import { BalancePDFGenerator } from '@/lib/services/balancePDFGenerator';
import { DigitalSignatureService } from '@/lib/services/digitalSignatureService';
import { createSupabaseServerClient } from '@/lib/database/databaseSimple';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      period,
      signerName,
      signerRut,
      signerRole,
      signerEmail,
      companyName,
      balanceData
    } = body;

    // Validaciones básicas
    if (!companyId || !period || !signerName || !signerRut || !signerRole || !balanceData) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos para la firma' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Preparar datos del balance para PDF
    const pdfData = {
      companyName: companyName || 'Empresa',
      period,
      generatedAt: new Date(),
      accounts: balanceData.accounts || [],
      totals: balanceData.totals || {},
      net_income: balanceData.net_income || 0
    };

    // Generar PDF base del balance
    console.log('Generando PDF base del Balance de 8 Columnas...');
    const basePdfBytes = await BalancePDFGenerator.generateBalancePDF(pdfData);

    // Generar firma digital
    console.log('Generando firma digital...');
    const signatureResult = await DigitalSignatureService.generateSignature({
      documentType: 'balance_8_columns',
      documentName: `Balance de 8 Columnas ${period}`,
      documentPeriod: period,
      signerName,
      signerRut,
      signerRole,
      signerEmail,
      documentContent: balanceData,
      companyId
    });

    // Agregar firma al PDF
    console.log('Agregando firma al PDF...');
    const signedPdfBytes = await DigitalSignatureService.signPDF(
      basePdfBytes,
      signatureResult,
      {
        name: signerName,
        rut: signerRut,
        role: signerRole
      }
    );

    // Guardar información de la firma en la base de datos
    console.log('Guardando firma en base de datos...');
    const { data: signatureRecord, error: saveError } = await supabase
      .from('digital_signatures')
      .insert({
        company_id: companyId,
        document_type: 'balance_8_columns',
        document_name: `Balance de 8 Columnas ${period}`,
        document_period: period,
        signer_name: signerName,
        signer_rut: signerRut,
        signer_role: signerRole,
        signer_email: signerEmail,
        signature_hash: signatureResult.signatureHash,
        signature_data: signatureResult.signatureData,
        document_hash: signatureResult.documentHash,
        document_content: balanceData,
        verification_code: signatureResult.verificationCode,
        qr_code_data: signatureResult.qrCodeData,
        is_valid: true,
        ip_address: request.ip || null,
        user_agent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          generated_at: new Date().toISOString(),
          pdf_size: signedPdfBytes.length,
          accounts_count: balanceData.accounts?.length || 0
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error guardando firma:', saveError);
      return NextResponse.json(
        { success: false, error: 'Error guardando información de la firma' },
        { status: 500 }
      );
    }

    // Generar certificado de firma (opcional)
    console.log('Generando certificado de firma...');
    const certificateBytes = await DigitalSignatureService.generateSignatureCertificate(
      signatureResult,
      {
        name: signerName,
        rut: signerRut,
        role: signerRole,
        email: signerEmail
      },
      {
        type: 'Balance de 8 Columnas',
        name: `Balance de 8 Columnas ${period}`,
        period
      }
    );

    console.log('PDF firmado generado exitosamente');

    return NextResponse.json({
      success: true,
      data: {
        signatureId: signatureRecord.id,
        verificationCode: signatureResult.verificationCode,
        signedAt: signatureResult.signedAt,
        documentHash: signatureResult.documentHash,
        signatureHash: signatureResult.signatureHash,
        qrCodeData: signatureResult.qrCodeData,
        pdfBase64: Buffer.from(signedPdfBytes).toString('base64'),
        certificateBase64: Buffer.from(certificateBytes).toString('base64')
      }
    });

  } catch (error) {
    console.error('Error generando PDF firmado:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Endpoint para generar PDF de prueba (sin firma)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const test = searchParams.get('test');

    if (test === 'true') {
      console.log('Generando PDF de prueba...');
      const sampleData = BalancePDFGenerator.generateSampleData();
      const pdfBytes = await BalancePDFGenerator.generateBalancePDF(sampleData);

      return new NextResponse(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="balance-8-columnas-prueba.pdf"'
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Endpoint GET solo disponible para pruebas con ?test=true' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error generando PDF de prueba:', error);
    return NextResponse.json(
      { success: false, error: 'Error generando PDF de prueba' },
      { status: 500 }
    );
  }
}