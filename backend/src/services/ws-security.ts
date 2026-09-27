/**
 * WS-Security Signature Verifier untuk AgriFlow 2
 *
 * Mengimplementasikan verifikasi HMAC-SHA256 Digital Signature
 * pada WS-Security Security Header untuk operasi admin (PEMERINTAH).
 *
 * Struktur WS-Security Header yang didukung:
 *   <wsse:Security>
 *     <wsse:UsernameToken>
 *       <wsse:Username>userId</wsse:Username>
 *       <wsse:Timestamp>ISO8601</wsse:Timestamp>
 *       <wsse:Nonce>randomHex</wsse:Nonce>
 *       <wsse:Signature>HMAC-SHA256(userId+timestamp+nonce, secret)</wsse:Signature>
 *     </wsse:UsernameToken>
 *   </wsse:Security>
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface WsSecurityClaims {
  userId: number;
  email: string;
  role: string;
  nonce: string;
  timestamp: string;
}

export interface WsSecurityVerifyResult {
  valid: boolean;
  claims?: WsSecurityClaims;
  error?: string;
}

const SIGNATURE_VALIDITY_WINDOW_MS = 5 * 60 * 1000; // 5 menit

/**
 * Menghasilkan HMAC-SHA256 signature dari payload string menggunakan JWT secret
 */
export function hmacSign(payload: string): string {
  return crypto
    .createHmac('sha256', config.jwt.secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verifikasi WS-Security SOAP Header.
 *
 * @param securityHeaderXml - String XML isi <wsse:Security> ... </wsse:Security>
 *   atau null jika header tidak ada.
 * @returns WsSecurityVerifyResult
 */
export function verifyWsSecurityHeader(
  securityHeaderXml: string | null | undefined
): WsSecurityVerifyResult {
  if (!securityHeaderXml) {
    return { valid: false, error: 'WS-Security header tidak ada pada request' };
  }

  try {
    // Parse field dari XML (regex sederhana — tidak butuh full XML parser)
    const username = extractTag(securityHeaderXml, 'wsse:Username') ||
                     extractTag(securityHeaderXml, 'Username');
    const timestamp = extractTag(securityHeaderXml, 'wsse:Timestamp') ||
                      extractTag(securityHeaderXml, 'Timestamp');
    const nonce     = extractTag(securityHeaderXml, 'wsse:Nonce') ||
                      extractTag(securityHeaderXml, 'Nonce');
    const signature = extractTag(securityHeaderXml, 'wsse:Signature') ||
                      extractTag(securityHeaderXml, 'Signature');

    if (!username || !timestamp || !nonce || !signature) {
      return {
        valid: false,
        error: `WS-Security header tidak lengkap (username=${username}, timestamp=${timestamp}, nonce=${nonce}, signature=${signature ? 'ada' : 'tidak ada'})`,
      };
    }

    // Verifikasi timestamp tidak kadaluarsa
    const requestTime = new Date(timestamp).getTime();
    if (isNaN(requestTime)) {
      return { valid: false, error: 'Format timestamp WS-Security tidak valid' };
    }
    const ageMs = Date.now() - requestTime;
    if (ageMs > SIGNATURE_VALIDITY_WINDOW_MS) {
      return {
        valid: false,
        error: `WS-Security token kadaluarsa (usia: ${Math.round(ageMs / 1000)}s, batas: ${SIGNATURE_VALIDITY_WINDOW_MS / 1000}s)`,
      };
    }

    // Recompute signature: HMAC-SHA256(username + ":" + timestamp + ":" + nonce)
    const canonicalPayload = `${username}:${timestamp}:${nonce}`;
    const expectedSignature = hmacSign(canonicalPayload);

    if (signature !== expectedSignature) {
      return {
        valid: false,
        error: 'Digital signature WS-Security tidak valid — kemungkinan token telah dimanipulasi',
      };
    }

    // Decode JWT username (yang sebenarnya adalah JWT access token) untuk mendapatkan claims
    let claims: WsSecurityClaims;
    try {
      const decoded: any = jwt.verify(username, config.jwt.secret);
      claims = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        nonce,
        timestamp,
      };
    } catch (jwtErr: any) {
      return {
        valid: false,
        error: `JWT access token dalam WS-Security header tidak valid: ${jwtErr.message}`,
      };
    }

    // Validasi role: hanya PEMERINTAH yang diizinkan mengakses operasi admin
    if (claims.role !== 'PEMERINTAH') {
      return {
        valid: false,
        error: `Akses ditolak: role '${claims.role}' tidak memiliki hak akses operasi admin PEMERINTAH`,
      };
    }

    return { valid: true, claims };
  } catch (err: any) {
    return {
      valid: false,
      error: `Kesalahan verifikasi WS-Security: ${err.message}`,
    };
  }
}

/**
 * Ekstrak konten text dari tag XML sederhana
 */
function extractTag(xml: string, tagName: string): string | null {
  const escapedTag = tagName.replace(/:/g, ':');
  const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\/${escapedTag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Ekstrak konten <wsse:Security> dari SOAP Envelope XML
 */
export function extractWsSecurityHeader(soapEnvelopeXml: string): string | null {
  // Coba ambil dari <wsse:Security> atau <Security>
  const patterns = [
    /<wsse:Security[\s\S]*?>([\s\S]*?)<\/wsse:Security>/i,
    /<Security[\s\S]*?>([\s\S]*?)<\/Security>/i,
  ];
  for (const pattern of patterns) {
    const match = soapEnvelopeXml.match(pattern);
    if (match) return match[0];
  }
  return null;
}
