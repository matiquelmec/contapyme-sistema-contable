import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/database/databaseSimple';
import { DigitalSignatureService } from '@/lib/services/digitalSignatureService';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código de verificación requerido' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Buscar la firma por código de verificación
    const { data: signature, error: findError } = await supabase
      .from('digital_signatures')
      .select('*')
      .eq('verification_code', code.toUpperCase())
      .single();

    if (findError || !signature) {
      return NextResponse.json(
        { success: false, error: 'Código de verificación no encontrado' },
        { status: 404 }
      );
    }

    // Verificar la integridad de la firma
    const signaturePayload = DigitalSignatureService.decryptAndVerifySignature(signature.signature_data);
    
    let signatureValid = true;
    let verificationDetails: any = {};

    if (!signaturePayload) {
      signatureValid = false;
    } else {
      // Verificar que el hash del documento coincida
      const currentDocumentHash = DigitalSignatureService.generateDocumentHash(signature.document_content);
      const documentIntegrityValid = currentDocumentHash === signature.document_hash;
      
      signatureValid = documentIntegrityValid && signature.is_valid;
      
      verificationDetails = {
        document_hash: signature.document_hash,
        signature_hash: signature.signature_hash,
        document_integrity: documentIntegrityValid,
        signature_payload_valid: !!signaturePayload,
        company_name: signaturePayload?.companyName || 'No especificada'
      };
    }

    // Verificar si está revocada o expirada
    const isRevoked = !!signature.revoked_at;
    const isExpired = signature.valid_until ? new Date(signature.valid_until) < new Date() : false;
    
    const isFinallyValid = signatureValid && !isRevoked && !isExpired;

    // Registrar la verificación
    const { error: logError } = await supabase
      .from('signature_verifications')
      .insert({
        signature_id: signature.id,
        verification_code: code.toUpperCase(),
        is_valid: isFinallyValid,
        verification_details: {
          ...verificationDetails,
          expired: isExpired,
          revoked: isRevoked,
          verified_at: new Date().toISOString(),
          client_ip: request.ip || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        },
        verifier_ip: request.ip || null,
        verifier_agent: request.headers.get('user-agent')
      });

    if (logError) {
      console.error('Error registrando verificación:', logError);
    }

    // Obtener conteo de verificaciones
    const { count: verificationCount } = await supabase
      .from('signature_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('signature_id', signature.id);

    // Preparar respuesta
    const responseData = {
      is_valid: isFinallyValid,
      document_type: signature.document_type,
      document_name: signature.document_name,
      signer_name: signature.signer_name,
      signer_rut: signature.signer_rut,
      signer_role: signature.signer_role,
      signed_at: signature.created_at,
      valid_until: signature.valid_until,
      revoked: isRevoked,
      revocation_reason: signature.revocation_reason,
      verification_details: {
        ...verificationDetails,
        verification_count: (verificationCount || 0) + 1,
        expired: isExpired,
        reasons: []
      }
    };

    // Agregar razones de invalidez
    if (!isFinallyValid) {
      const reasons = [];
      if (isRevoked) reasons.push('Firma revocada');
      if (isExpired) reasons.push('Firma expirada');
      if (!verificationDetails.document_integrity) reasons.push('Documento modificado');
      if (!verificationDetails.signature_payload_valid) reasons.push('Firma corrupta');
      if (!signature.is_valid) reasons.push('Firma marcada como inválida');
      
      responseData.verification_details.reasons = reasons;
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error verificando firma digital:', error);
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

// GET para verificación simple (solo lectura)
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código de verificación requerido' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Usar la función PostgreSQL para verificación
    const { data: verificationResult, error: verifyError } = await supabase
      .rpc('verify_signature', { p_verification_code: code.toUpperCase() });

    if (verifyError) {
      console.error('Error en función de verificación:', verifyError);
      return NextResponse.json(
        { success: false, error: 'Error al verificar la firma' },
        { status: 500 }
      );
    }

    if (!verificationResult || verificationResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Código de verificación no encontrado' },
        { status: 404 }
      );
    }

    const result = verificationResult[0];

    return NextResponse.json({
      success: true,
      data: {
        is_valid: result.is_valid,
        document_type: result.document_type,
        document_name: result.document_name,
        signer_name: result.signer_name,
        signer_rut: result.signer_rut,
        signer_role: result.signer_role,
        signed_at: result.signed_at,
        valid_until: result.valid_until,
        revoked: result.revoked,
        revocation_reason: result.revocation_reason
      }
    });

  } catch (error) {
    console.error('Error en verificación GET:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}