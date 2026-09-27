import React, { useState } from 'react';
import { Layers, ArrowRightLeft, FileCode2, CheckCircle2, XCircle, Zap, Shield, Globe } from 'lucide-react';

export const ComparisonPage: React.FC = () => {
  const [selectedOp, setSelectedOp] = useState<'Login' | 'Petani' | 'Penebusan'>('Penebusan');

  const comparisons = {
    Login: {
      opName: 'LoginUser',
      soapAction: 'http://agriflow.id/soap/LoginUser',
      soapUrl: 'POST /soap/agriflow',
      restUrl: 'POST /api/auth/login',
      soapReq: `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:agr="http://agriflow.id/soap">
  <soapenv:Header/>
  <soapenv:Body>
    <agr:LoginUserRequest>
      <agr:Email>pemerintah@agriflow.id</agr:Email>
      <agr:Password>PasswordAman123!</agr:Password>
    </agr:LoginUserRequest>
  </soapenv:Body>
</soapenv:Envelope>`,
      restReq: `{
  "email": "pemerintah@agriflow.id",
  "password": "PasswordAman123!"
}`,
      soapRes: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <LoginUserResponse xmlns="http://agriflow.id/soap">
      <Success>true</Success>
      <Message>Login berhasil via SOAP Web Service</Message>
      <UserId>1</UserId>
      <Email>pemerintah@agriflow.id</Email>
      <Role>PEMERINTAH</Role>
      <AccessToken>eyJhbGciOi...</AccessToken>
    </LoginUserResponse>
  </soap:Body>
</soap:Envelope>`,
      restRes: `{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "userId": 1,
    "email": "pemerintah@agriflow.id",
    "role": "PEMERINTAH",
    "accessToken": "eyJhbGciOi..."
  }
}`,
      soapBytes: 742,
      restBytes: 298,
    },

    Petani: {
      opName: 'GetPetaniByNIK',
      soapAction: 'http://agriflow.id/soap/GetPetaniByNIK',
      soapUrl: 'POST /soap/agriflow',
      restUrl: 'GET /api/petani/3301010101700001',
      soapReq: `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:agr="http://agriflow.id/soap">
  <soapenv:Header/>
  <soapenv:Body>
    <agr:GetPetaniByNIKRequest>
      <agr:NIK>3301010101700001</agr:NIK>
    </agr:GetPetaniByNIKRequest>
  </soapenv:Body>
</soapenv:Envelope>`,
      restReq: `(Tidak ada request body pada metode HTTP GET)`,
      soapRes: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetPetaniByNIKResponse xmlns="http://agriflow.id/soap">
      <Found>true</Found>
      <PetaniId>3301010101700001</PetaniId>
      <NamaLengkap>Budi Santoso</NamaLengkap>
      <DesaKelurahan>Sidomulyo</DesaKelurahan>
      <Kecamatan>Godean</Kecamatan>
      <KabupatenKota>Sleman</KabupatenKota>
      <LuasLahan>1.5</LuasLahan>
      <Status>Aktif</Status>
    </GetPetaniByNIKResponse>
  </soap:Body>
</soap:Envelope>`,
      restRes: `{
  "found": true,
  "petaniId": "3301010101700001",
  "namaLengkap": "Budi Santoso",
  "desaKelurahan": "Sidomulyo",
  "kecamatan": "Godean",
  "kabupatenKota": "Sleman",
  "luasLahan": 1.5,
  "status": "Aktif"
}`,
      soapBytes: 680,
      restBytes: 245,
    },

    Penebusan: {
      opName: 'PenebusanPupuk',
      soapAction: 'http://agriflow.id/soap/PenebusanPupuk',
      soapUrl: 'POST /soap/agriflow',
      restUrl: 'POST /api/redemption',
      soapReq: `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:agr="http://agriflow.id/soap">
  <soapenv:Header/>
  <soapenv:Body>
    <agr:PenebusanPupukRequest>
      <agr:UserIdPengecer>2</agr:UserIdPengecer>
      <agr:PetaniId>3301010101700001</agr:PetaniId>
      <agr:PupukId>1</agr:PupukId>
      <agr:Jumlah>50.0</agr:Jumlah>
    </agr:PenebusanPupukRequest>
  </soapenv:Body>
</soapenv:Envelope>`,
      restReq: `{
  "userIdPengecer": 2,
  "petaniId": "3301010101700001",
  "pupukId": 1,
  "jumlah": 50.0
}`,
      soapRes: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <PenebusanPupukResponse xmlns="http://agriflow.id/soap">
      <Success>true</Success>
      <Message>Penebusan pupuk bersubsidi berhasil</Message>
      <TebusanId>1042</TebusanId>
      <JumlahDitebus>50.0</JumlahDitebus>
      <SisaKuota>150.0</SisaKuota>
      <Timestamp>2026-09-09T15:20:00Z</Timestamp>
    </PenebusanPupukResponse>
  </soap:Body>
</soap:Envelope>`,
      restRes: `{
  "success": true,
  "message": "Penebusan pupuk bersubsidi berhasil",
  "data": {
    "tebusanId": 1042,
    "jumlahDitebus": 50.0,
    "sisaKuota": 150.0,
    "timestamp": "2026-09-09T15:20:00Z"
  }
}`,
      soapBytes: 810,
      restBytes: 312,
    },
  };

  const curr = comparisons[selectedOp];
  const ratio = (curr.soapBytes / curr.restBytes).toFixed(1);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* HEADER */}
      <div style={{
        background: '#1e293b',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
            ⚖️ Analisis Mendalam Perbandingan: REST API vs SOAP Web Service
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '6px 0 0' }}>
            Membandingkan implementasi <strong>AgriFlow 1 (REST JSON)</strong> vs <strong>AgriFlow 2 (SOAP XML WSDL)</strong>
          </p>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', backgroundColor: '#0f172a' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
            📊 Matriks Perbandingan Arsitektur & Karakteristik
          </h2>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '14px 20px', width: '25%' }}>Dimensi Karakteristik</th>
              <th style={{ padding: '14px 20px', width: '37.5%', color: '#34d399' }}>REST API (AgriFlow 1)</th>
              <th style={{ padding: '14px 20px', width: '37.5%', color: '#38bdf8' }}>SOAP Web Service (AgriFlow 2)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '14px 20px', fontWeight: 600, color: '#cbd5e1' }}>Definisi & Filosofi</td>
              <td style={{ padding: '14px 20px' }}>Arsitektur berorientasi Resource (URI) dan kata kerja HTTP standar.</td>
              <td style={{ padding: '14px 20px' }}>Protokol formal berbasis RPC (Remote Procedure Call) berorientasi Aksi/Operasi.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(15, 23, 42, 0.4)' }}>
              <td style={{ padding: '14px 20px', fontWeight: 600, color: '#cbd5e1' }}>Format Data & Payload</td>
              <td style={{ padding: '14px 20px' }}><strong style={{ color: '#4ade80' }}>JSON</strong> (Ringan, mudah dibaca manusia & browser).</td>
              <td style={{ padding: '14px 20px' }}><strong style={{ color: '#38bdf8' }}>XML Envelope</strong> (Lebih verbose, tag pembuka/penutup ganda).</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '14px 20px', fontWeight: 600, color: '#cbd5e1' }}>Kontrak Layanan</td>
              <td style={{ padding: '14px 20px' }}>Opsional (Swagger/OpenAPI). Sifat kontrak lebih longgar (loose).</td>
              <td style={{ padding: '14px 20px' }}><strong style={{ color: '#38bdf8' }}>WSDL 1.1 Wajib & Mengikat</strong>. Validasi tipe data ketat pada skema XSD.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(15, 23, 42, 0.4)' }}>
              <td style={{ padding: '14px 20px', fontWeight: 600, color: '#cbd5e1' }}>Ukuran Pesan (Overhead)</td>
              <td style={{ padding: '14px 20px' }}><strong style={{ color: '#4ade80' }}>Sangat Efisien</strong> (Rata-rata 250 - 350 bytes per request).</td>
              <td style={{ padding: '14px 20px' }}>Lebih besar ~2.5x hingga 3x lipat karena namespace XML.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '14px 20px', fontWeight: 600, color: '#cbd5e1' }}>Standar Keamanan</td>
              <td style={{ padding: '14px 20px' }}>HTTPS, OAuth2, JWT Bearer Token, API Key.</td>
              <td style={{ padding: '14px 20px' }}>HTTPS + <strong>WS-Security</strong> (Enkripsi tingkat pesan XML & tanda tangan digital).</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(15, 23, 42, 0.4)' }}>
              <td style={{ padding: '14px 20px', fontWeight: 600, color: '#cbd5e1' }}>Penanganan Error</td>
              <td style={{ padding: '14px 20px' }}>HTTP Status Code (400, 401, 404, 500) + payload JSON error.</td>
              <td style={{ padding: '14px 20px' }}><strong>SOAP Fault</strong> (<code style={{ color: '#f87171' }}>&lt;faultcode&gt;</code>, <code style={{ color: '#f87171' }}>&lt;faultstring&gt;</code>).</td>
            </tr>
            <tr>
              <td style={{ padding: '14px 20px', fontWeight: 600, color: '#cbd5e1' }}>Kasus Penggunaan Terbaik</td>
              <td style={{ padding: '14px 20px' }}>Aplikasi Web Modern, Mobile Apps, Microservices berkecepatan tinggi.</td>
              <td style={{ padding: '14px 20px' }}>Integrasi Perbankan, BUMN/Pemerintahan, Transaksi Finansial ACID.</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* INTERACTIVE PAYLOAD SIMULATOR */}
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
              🔬 Simulator Payload Berdampingan (Side-by-Side Playground)
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
              Pilih operasi di bawah ini untuk melihat perbandingan format data XML SOAP vs JSON REST secara riil:
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSelectedOp('Login')}
              style={{
                background: selectedOp === 'Login' ? '#15803d' : '#0f172a',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              1. LoginUser
            </button>
            <button
              onClick={() => setSelectedOp('Petani')}
              style={{
                background: selectedOp === 'Petani' ? '#15803d' : '#0f172a',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              2. GetPetaniByNIK
            </button>
            <button
              onClick={() => setSelectedOp('Penebusan')}
              style={{
                background: selectedOp === 'Penebusan' ? '#15803d' : '#0f172a',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              3. PenebusanPupuk
            </button>
          </div>
        </div>

        {/* METRICS COMPARISON TAG */}
        <div style={{
          background: '#0f172a',
          padding: '12px 18px',
          borderRadius: '8px',
          border: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
        }}>
          <div>
            Ukuran SOAP XML: <strong style={{ color: '#38bdf8' }}>{curr.soapBytes} bytes</strong> vs REST JSON: <strong style={{ color: '#34d399' }}>{curr.restBytes} bytes</strong>
          </div>
          <span style={{ color: '#eab308', fontWeight: 700 }}>
            Payload SOAP ~{ratio}x lebih besar
          </span>
        </div>

        {/* DUAL PRE CODE BLOCKS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* SOAP COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 700, fontSize: '13px' }}>
              <span>SOAP XML Request Envelope</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>POST /soap/agriflow</span>
            </div>
            <pre style={{
              background: '#090d16',
              padding: '14px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#38bdf8',
              maxHeight: '260px',
              overflow: 'auto',
              border: '1px solid #334155',
              whiteSpace: 'pre-wrap',
            }}>
              {curr.soapReq}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontWeight: 700, fontSize: '13px', marginTop: '8px' }}>
              <span>SOAP XML Response Envelope</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Content-Type: text/xml</span>
            </div>
            <pre style={{
              background: '#090d16',
              padding: '14px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#4ade80',
              maxHeight: '260px',
              overflow: 'auto',
              border: '1px solid #334155',
              whiteSpace: 'pre-wrap',
            }}>
              {curr.soapRes}
            </pre>
          </div>

          {/* REST COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399', fontWeight: 700, fontSize: '13px' }}>
              <span>REST JSON Request</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{curr.restUrl}</span>
            </div>
            <pre style={{
              background: '#090d16',
              padding: '14px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#facc15',
              maxHeight: '260px',
              overflow: 'auto',
              border: '1px solid #334155',
              whiteSpace: 'pre-wrap',
            }}>
              {curr.restReq}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2dd4bf', fontWeight: 700, fontSize: '13px', marginTop: '8px' }}>
              <span>REST JSON Response</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Content-Type: application/json</span>
            </div>
            <pre style={{
              background: '#090d16',
              padding: '14px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#2dd4bf',
              maxHeight: '260px',
              overflow: 'auto',
              border: '1px solid #334155',
              whiteSpace: 'pre-wrap',
            }}>
              {curr.restRes}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
