import React from 'react';
import { SoapCallMetadata } from '../lib/soap-client';
import { X, ArrowRightLeft, Code, Layers, FileCode2, Zap, Lock, ShieldCheck } from 'lucide-react';

interface Props {
  call: SoapCallMetadata | null;
  onClose: () => void;
}

export const RestVsSoapModal: React.FC<Props> = ({ call, onClose }) => {
  if (!call) return null;

  const ratio = call.equivalentRest.restBytes > 0
    ? (call.soapBytes / call.equivalentRest.restBytes).toFixed(1)
    : '2.5';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1100px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        color: '#f8fafc',
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: '#3b82f6',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ArrowRightLeft size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                Live Inspector: SOAP vs REST API
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                Perbandingan Langsung Operasi: <strong style={{ color: '#22c55e' }}>{call.operation}</strong> ({call.durationMs}ms)
                {call.isSigned && (
                  <span style={{
                    marginLeft: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(16,185,129,0.18)',
                    border: '1px solid #10b981',
                    borderRadius: '999px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#34d399',
                  }}>
                    <Lock size={9} /> WS-Security Signed SOAP
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* COMPARISON METRICS BAR */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#172554',
          borderBottom: '1px solid #1e3a8a',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          alignItems: 'center',
          fontSize: '13px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="#60a5fa" />
            <span>Ukuran SOAP XML: <strong style={{ color: '#93c5fd' }}>{call.soapBytes} bytes</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="#34d399" />
            <span>Ukuran REST JSON: <strong style={{ color: '#6ee7b7' }}>{call.equivalentRest.restBytes} bytes</strong></span>
          </div>
          <div style={{
            marginLeft: 'auto',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid #3b82f6',
            padding: '4px 12px',
            borderRadius: '999px',
            color: '#bfdbfe',
            fontWeight: 600,
          }}>
            Payload SOAP ~{ratio}x lebih besar karena tag XML & namespace
          </div>
        </div>

        {/* DUAL COLUMN CODE VIEW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {/* KOLOM KIRI: SOAP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0f172a',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #334155',
            }}>
              <span style={{ fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCode2 size={16} /> SOAP 1.1 Web Service (AgriFlow 2)
              </span>
              <span style={{ fontSize: '11px', background: '#0284c7', padding: '2px 8px', borderRadius: '4px' }}>
                POST /soap/agriflow
              </span>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SOAPAction Header
              </label>
              <div style={{
                background: '#090d16',
                padding: '8px 12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#facc15',
                border: '1px solid #1e293b',
              }}>
                {call.soapAction}
              </div>
            </div>

            {/* 🔐 WS-SECURITY SIGNATURE INFO (hanya tampil jika Signed SOAP) */}
            {call.isSigned && call.signatureInfo && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.07)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <ShieldCheck size={13} /> WS-Security Digital Signature
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', display: 'grid', gap: '3px' }}>
                  {[
                    ['Algoritma', call.signatureInfo.algorithm],
                    ['Signed By (UserId)', call.signatureInfo.signedBy],
                    ['Timestamp', call.signatureInfo.timestamp],
                    ['Nonce', call.signatureInfo.nonce],
                    ['Signature (HMAC)', call.signatureInfo.signatureHex.slice(0, 32) + '…'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ color: '#64748b', minWidth: '120px' }}>{k}:</span>
                      <span style={{ color: '#86efac', wordBreak: 'break-all' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                XML Request Envelope ({new Blob([call.rawXmlRequest]).size} bytes)
              </label>
              <pre style={{
                background: '#090d16',
                padding: '12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#38bdf8',
                maxHeight: '220px',
                overflow: 'auto',
                border: '1px solid #1e293b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {call.rawXmlRequest}
              </pre>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                XML Response Envelope ({new Blob([call.rawXmlResponse]).size} bytes)
              </label>
              <pre style={{
                background: '#090d16',
                padding: '12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#4ade80',
                maxHeight: '220px',
                overflow: 'auto',
                border: '1px solid #1e293b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {call.rawXmlResponse}
              </pre>
            </div>
          </div>

          {/* KOLOM KANAN: REST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0f172a',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #334155',
            }}>
              <span style={{ fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code size={16} /> RESTful JSON API (AgriFlow 1)
              </span>
              <span style={{
                fontSize: '11px',
                background: call.equivalentRest.method === 'GET' ? '#059669' : '#d97706',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
              }}>
                {call.equivalentRest.method} {call.equivalentRest.endpoint}
              </span>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                HTTP Headers
              </label>
              <div style={{
                background: '#090d16',
                padding: '8px 12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#a78bfa',
                border: '1px solid #1e293b',
              }}>
                Content-Type: application/json
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                JSON Request Body ({new Blob([call.equivalentRest.requestJson]).size} bytes)
              </label>
              <pre style={{
                background: '#090d16',
                padding: '12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#fbbf24',
                maxHeight: '220px',
                overflow: 'auto',
                border: '1px solid #1e293b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {call.equivalentRest.requestJson}
              </pre>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                JSON Response Body ({new Blob([call.equivalentRest.responseJson]).size} bytes)
              </label>
              <pre style={{
                background: '#090d16',
                padding: '12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#2dd4bf',
                maxHeight: '220px',
                overflow: 'auto',
                border: '1px solid #1e293b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {call.equivalentRest.responseJson}
              </pre>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          fontSize: '13px',
        }}>
          <span style={{ color: '#94a3b8' }}>
            💡 <strong>SOAP</strong> unggul pada kontrak formal WSDL & integritas ACID perbankan. <strong>REST</strong> unggul pada kecepatan & keringanan payload.
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#334155',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tutup Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
