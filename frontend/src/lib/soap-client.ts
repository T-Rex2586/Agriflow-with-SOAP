/**
 * Core SOAP Client Engine untuk AgriFlow 2
 * Menggunakan protokol XML SOAP 1.1 & WSDL Contract
 *
 * Mendukung dua mode request:
 *  - invokeSoap()       : SOAP biasa (tanpa security header)
 *  - invokeSignedSoap() : Signed SOAP dengan WS-Security header (HMAC-SHA256)
 *                         Digunakan untuk operasi admin PEMERINTAH
 */

export interface SoapCallMetadata {
  operation: string;
  endpoint: string;
  soapAction: string;
  rawXmlRequest: string;
  rawXmlResponse: string;
  soapBytes: number;
  durationMs: number;
  isSigned?: boolean;           // true jika menggunakan WS-Security Signed SOAP
  signatureInfo?: SignatureInfo; // detail signature untuk ditampilkan di inspector
  equivalentRest: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    endpoint: string;
    requestJson: string;
    responseJson: string;
    restBytes: number;
  };
}

export interface SignatureInfo {
  algorithm: string;
  nonce: string;
  timestamp: string;
  signedBy: string; // userId (JWT payload)
  signatureHex: string;
}

let lastSoapCall: SoapCallMetadata | null = null;
const listeners: Array<(call: SoapCallMetadata) => void> = [];

export function getLastSoapCall(): SoapCallMetadata | null {
  return lastSoapCall;
}

export function subscribeSoapCall(callback: (call: SoapCallMetadata) => void) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notifyListeners(call: SoapCallMetadata) {
  lastSoapCall = call;
  listeners.forEach((fn) => fn(call));
}

/**
 * Menghasilkan HMAC-SHA256 signature di browser menggunakan Web Crypto API.
 * Key yang digunakan adalah JWT secret yang di-encode — di sini kita gunakan
 * pendekatan "sign with token" yaitu signature menggunakan accessToken itu sendiri
 * sebagai key (HMAC-SHA256(payload, accessToken)).
 *
 * Canonical payload: `${username}:${timestamp}:${nonce}`
 * Di mana username = JWT access token (untuk diverifikasi di backend).
 */
async function hmacSha256Browser(payload: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Menghasilkan nonce acak (16 byte hex)
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Membangun WS-Security SOAP Header XML dengan digital signature HMAC-SHA256.
 *
 * Struktur yang dihasilkan:
 * <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/...">
 *   <wsse:UsernameToken>
 *     <wsse:Username>{accessToken}</wsse:Username>
 *     <wsse:Timestamp>{ISO8601}</wsse:Timestamp>
 *     <wsse:Nonce>{hex}</wsse:Nonce>
 *     <wsse:Signature>{HMAC-SHA256}</wsse:Signature>
 *   </wsse:UsernameToken>
 * </wsse:Security>
 *
 * Canonical string yang di-sign: `{accessToken}:{timestamp}:{nonce}`
 * Key HMAC: jwtSecret — namun karena ini client-side, kita gunakan accessToken sebagai key
 * (backend akan reverify menggunakan jwt.verify() untuk mendapatkan userId/role, lalu
 *  recompute HMAC dengan jwt secret).
 */
async function buildWsSecurityHeader(
  accessToken: string
): Promise<{ headerXml: string; signatureInfo: SignatureInfo }> {
  const timestamp = new Date().toISOString();
  const nonce = generateNonce();

  // Canonical payload: accessToken (sebagai username) + timestamp + nonce
  const canonicalPayload = `${accessToken}:${timestamp}:${nonce}`;

  // Sign menggunakan JWT_SECRET yang sudah ter-encode di dalam accessToken itu sendiri
  // Di backend, verifikasi dilakukan dengan: HMAC-SHA256(payload, jwtSecret)
  // Client harus sign dengan secret yang sama — untuk demo akademik ini, kita gunakan
  // secret yang diketahui (environment variable atau hardcoded untuk dev).
  // Dalam produksi nyata: gunakan PKI (private key di server, public key di client).
  const JWT_SECRET = 'agriflow-soap-secure-secret-key-2026'; // harus sama dengan backend
  const signatureHex = await hmacSha256Browser(canonicalPayload, JWT_SECRET);

  const headerXml = `
  <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
                 xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
                 soap:mustUnderstand="1">
    <wsse:UsernameToken wsu:Id="AdminToken-${nonce.slice(0, 8)}">
      <wsse:Username>${escapeXmlAttr(accessToken)}</wsse:Username>
      <wsse:Timestamp>${timestamp}</wsse:Timestamp>
      <wsse:Nonce>${nonce}</wsse:Nonce>
      <wsse:Signature>${signatureHex}</wsse:Signature>
    </wsse:UsernameToken>
  </wsse:Security>`.trim();

  return {
    headerXml,
    signatureInfo: {
      algorithm: 'HMAC-SHA256',
      nonce,
      timestamp,
      signedBy: accessToken.split('.')[1] ? (() => {
        try {
          return JSON.parse(atob(accessToken.split('.')[1])).userId?.toString() || 'unknown';
        } catch { return 'unknown'; }
      })() : 'unknown',
      signatureHex,
    },
  };
}

/**
 * Mengirim SOAP Request Envelope ke backend (tanpa WS-Security)
 */
export async function invokeSoap<T = any>(
  operation: string,
  xmlBodyContent: string,
  equivalentRest: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    endpoint: string;
    requestObj: any;
  }
): Promise<{ data: T; metadata: SoapCallMetadata }> {
  const soapEndpoint = '/soap/agriflow';
  const soapAction = `http://agriflow.id/soap/${operation}`;

  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:agr="http://agriflow.id/soap">
  <soapenv:Header/>
  <soapenv:Body>
    ${xmlBodyContent}
  </soapenv:Body>
</soapenv:Envelope>`.trim();

  return _executeSoapRequest(operation, envelope, soapEndpoint, soapAction, equivalentRest, false);
}

/**
 * 🔐 Mengirim Signed SOAP Request dengan WS-Security Header (HMAC-SHA256 Digital Signature).
 * Digunakan khusus untuk operasi admin PEMERINTAH.
 *
 * @param accessToken  - JWT access token dari sesi login PEMERINTAH
 */
export async function invokeSignedSoap<T = any>(
  operation: string,
  xmlBodyContent: string,
  accessToken: string,
  equivalentRest: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    endpoint: string;
    requestObj: any;
  }
): Promise<{ data: T; metadata: SoapCallMetadata }> {
  const soapEndpoint = '/soap/agriflow';
  const soapAction = `http://agriflow.id/soap/${operation}`;

  const { headerXml, signatureInfo } = await buildWsSecurityHeader(accessToken);

  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:agr="http://agriflow.id/soap"
                  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    ${headerXml}
  </soapenv:Header>
  <soapenv:Body>
    ${xmlBodyContent}
  </soapenv:Body>
</soapenv:Envelope>`.trim();

  return _executeSoapRequest(
    operation,
    envelope,
    soapEndpoint,
    soapAction,
    equivalentRest,
    true,
    signatureInfo
  );
}

/**
 * Eksekutor internal: mengirim SOAP envelope dan memproses respons
 */
async function _executeSoapRequest<T>(
  operation: string,
  envelope: string,
  soapEndpoint: string,
  soapAction: string,
  equivalentRest: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    endpoint: string;
    requestObj: any;
  },
  isSigned: boolean,
  signatureInfo?: SignatureInfo
): Promise<{ data: T; metadata: SoapCallMetadata }> {
  const startTime = performance.now();

  try {
    const res = await fetch(soapEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
      },
      body: envelope,
    });

    const durationMs = Math.round(performance.now() - startTime);
    const xmlResponseText = await res.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlResponseText, 'text/xml');

    // Cek SOAP Fault
    const fault = xmlDoc.getElementsByTagName('faultstring')[0] ||
                  xmlDoc.getElementsByTagName('soap:Fault')[0] ||
                  xmlDoc.getElementsByTagName('Fault')[0];
    if (fault) {
      const faultMsg = fault.textContent || 'SOAP Fault Error';
      throw new Error(`SOAP Fault: ${faultMsg}`);
    }

    const parsedData = extractDataFromXml(xmlDoc, `${operation}Response`);

    // Perhitungan komparasi ukuran payload byte
    const soapBytes = new Blob([envelope]).size + new Blob([xmlResponseText]).size;
    const restReqJson = JSON.stringify(equivalentRest.requestObj, null, 2);
    const restResJson = JSON.stringify(parsedData, null, 2);
    const restBytes = new Blob([restReqJson]).size + new Blob([restResJson]).size;

    const metadata: SoapCallMetadata = {
      operation,
      endpoint: soapEndpoint,
      soapAction,
      rawXmlRequest: envelope,
      rawXmlResponse: xmlResponseText,
      soapBytes,
      durationMs,
      isSigned,
      signatureInfo,
      equivalentRest: {
        method: equivalentRest.method,
        endpoint: equivalentRest.endpoint,
        requestJson: restReqJson,
        responseJson: restResJson,
        restBytes,
      },
    };

    notifyListeners(metadata);

    return { data: parsedData as T, metadata };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    const failMetadata: SoapCallMetadata = {
      operation,
      endpoint: soapEndpoint,
      soapAction,
      rawXmlRequest: envelope,
      rawXmlResponse: `<soap:Fault><faultstring>${err.message}</faultstring></soap:Fault>`,
      soapBytes: new Blob([envelope]).size,
      durationMs,
      isSigned,
      signatureInfo,
      equivalentRest: {
        method: equivalentRest.method,
        endpoint: equivalentRest.endpoint,
        requestJson: JSON.stringify(equivalentRest.requestObj, null, 2),
        responseJson: JSON.stringify({ error: err.message }, null, 2),
        restBytes: 0,
      },
    };
    notifyListeners(failMetadata);
    throw err;
  }
}

/**
 * Helper rekursif untuk mengubah Node XML menjadi JSON objek JavaScript
 */
function extractDataFromXml(xmlDoc: Document, responseTagName: string): any {
  let rootNode = xmlDoc.getElementsByTagName(responseTagName)[0];
  if (!rootNode) {
    // fallback tag namespace tanpa prefix
    const elements = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].localName === responseTagName) {
        rootNode = elements[i];
        break;
      }
    }
  }

  if (!rootNode) return {};

  return domNodeToObj(rootNode);
}

function domNodeToObj(node: Element): any {
  const obj: any = {};
  const children = Array.from(node.children);

  if (children.length === 0) {
    const text = node.textContent?.trim() || '';
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(text) && text.length < 15) {
      return Number(text);
    }
    return text;
  }

  for (const child of children) {
    const key = child.localName;
    const value = domNodeToObj(child);

    if (obj[key] !== undefined) {
      if (!Array.isArray(obj[key])) {
        obj[key] = [obj[key]];
      }
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  }

  return obj;
}

function escapeXmlAttr(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
