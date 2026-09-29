/**
 * SOAP Client untuk Halaman Pemerintah — AgriFlow 2
 *
 * Mengirimkan SOAP 1.1 Envelope XML langsung dari browser ke backend
 * /soap/agriflow endpoint. Mendukung dua mode:
 *
 *  1. Unsigned SOAP — operasi baca/monitoring (tanpa WS-Security header)
 *  2. Signed SOAP   — operasi admin (dengan WS-Security HMAC-SHA256 signature)
 *
 * Semua request terlihat jelas di Network Tab DevTools sebagai
 * Content-Type: text/xml dengan SOAPAction header.
 */

import { getToken } from './api'

const SOAP_ENDPOINT =
  (typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002')
    : 'http://localhost:3002') + '/soap/agriflow'

const SOAP_NS = 'http://agriflow.id/soap'

// ─── Crypto helpers (Web Crypto API — browser only) ────────────────

async function hmacSha256(payload: string, key: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateNonce(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── WS-Security Header builder ────────────────────────────────────

async function buildWsSecurityHeader(
  accessToken: string,
): Promise<{ headerXml: string; nonce: string; timestamp: string; signature: string }> {
  const timestamp = new Date().toISOString()
  const nonce = generateNonce()
  const canonicalPayload = `${accessToken}:${timestamp}:${nonce}`

  // Sign using the JWT secret that is embedded in the access token
  // Backend will verify by re-computing HMAC(canonicalPayload, jwtSecret)
  const jwtSecret = 'agriflow_jwt_access_secret_super_secure_key_123'
  const signature = await hmacSha256(canonicalPayload, jwtSecret)

  const headerXml = `
    <soapenv:Header>
      <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <wsse:UsernameToken>
          <wsse:Username>${escapeXml(accessToken)}</wsse:Username>
          <wsse:Timestamp>${escapeXml(timestamp)}</wsse:Timestamp>
          <wsse:Nonce>${escapeXml(nonce)}</wsse:Nonce>
          <wsse:Signature>${escapeXml(signature)}</wsse:Signature>
        </wsse:UsernameToken>
      </wsse:Security>
    </soapenv:Header>`

  return { headerXml, nonce, timestamp, signature }
}

// ─── XML helpers ───────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildParamsXml(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `<agr:${k}>${escapeXml(String(v))}</agr:${k}>`)
    .join('\n          ')
}

/**
 * Parse XML response text into a plain JS object.
 * Uses the browser's DOMParser — handles SOAP namespaces automatically.
 */
function parseXmlResponse(xmlText: string): Record<string, any> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')

  // Navigate to the Body child (first element under soap:Body)
  const body =
    doc.getElementsByTagNameNS('http://schemas.xmlsoap.org/soap/envelope/', 'Body')[0] ??
    doc.querySelector('Body')
  if (!body || !body.firstElementChild) return {}

  return elementToObj(body.firstElementChild)
}

function elementToObj(el: Element): any {
  // If it has no child elements, return its text content
  if (el.children.length === 0) {
    const txt = el.textContent ?? ''
    // Auto-cast boolean / number
    if (txt === 'true') return true
    if (txt === 'false') return false
    if (/^-?\d+(\.\d+)?$/.test(txt) && txt.length < 16) return Number(txt)
    return txt
  }

  const obj: Record<string, any> = {}
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i]
    const tag = child.localName
    const val = elementToObj(child)

    if (obj[tag] !== undefined) {
      // Multiple same-named siblings → array
      if (!Array.isArray(obj[tag])) obj[tag] = [obj[tag]]
      obj[tag].push(val)
    } else {
      obj[tag] = val
    }
  }
  return obj
}

// ─── Core invocation ───────────────────────────────────────────────

export interface SoapResult<T = any> {
  ok: boolean
  data: T
  rawXmlRequest: string
  rawXmlResponse: string
  durationMs: number
  isSigned: boolean
}

/**
 * Invoke a SOAP operation (unsigned — no WS-Security header).
 */
export async function invokeSoap<T = any>(
  operation: string,
  params: Record<string, unknown> = {},
): Promise<SoapResult<T>> {
  const paramsXml = buildParamsXml(params)
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:agr="${SOAP_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <agr:${operation}Request>
      ${paramsXml}
    </agr:${operation}Request>
  </soapenv:Body>
</soapenv:Envelope>`

  const soapAction = `${SOAP_NS}/${operation}`
  const t0 = performance.now()

  const res = await fetch(SOAP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: soapAction,
    },
    body: envelope,
  })

  const rawXmlResponse = await res.text()
  const durationMs = Math.round(performance.now() - t0)
  const data = parseXmlResponse(rawXmlResponse) as T

  return { ok: res.ok, data, rawXmlRequest: envelope, rawXmlResponse, durationMs, isSigned: false }
}

/**
 * Invoke a signed SOAP operation (with WS-Security HMAC-SHA256 header).
 * Requires the user to be logged in (JWT access token).
 */
export async function invokeSignedSoap<T = any>(
  operation: string,
  params: Record<string, unknown> = {},
): Promise<SoapResult<T>> {
  const accessToken = getToken()
  if (!accessToken) {
    throw new Error('Signed SOAP memerlukan autentikasi — silakan login terlebih dahulu.')
  }

  const { headerXml } = await buildWsSecurityHeader(accessToken)
  const paramsXml = buildParamsXml(params)

  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:agr="${SOAP_NS}">
  ${headerXml}
  <soapenv:Body>
    <agr:${operation}Request>
      ${paramsXml}
      <agr:WsSecurityHeader>${escapeXml(headerXml)}</agr:WsSecurityHeader>
    </agr:${operation}Request>
  </soapenv:Body>
</soapenv:Envelope>`

  const soapAction = `${SOAP_NS}/${operation}`
  const t0 = performance.now()

  const res = await fetch(SOAP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: soapAction,
      'Authorization': `Bearer ${accessToken}`,
    },
    body: envelope,
  })

  const rawXmlResponse = await res.text()
  const durationMs = Math.round(performance.now() - t0)
  const data = parseXmlResponse(rawXmlResponse) as T

  return { ok: res.ok, data, rawXmlRequest: envelope, rawXmlResponse, durationMs, isSigned: true }
}
