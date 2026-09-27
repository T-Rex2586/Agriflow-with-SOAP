import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { RestVsSoapModal } from './components/RestVsSoapModal';
import { LoginPage } from './pages/LoginPage';
import { PenebusanPage } from './pages/PenebusanPage';
import { StokPage } from './pages/StokPage';
import { DashboardPemerintah } from './pages/DashboardPemerintah';
import { ComparisonPage } from './pages/ComparisonPage';
import { getLastSoapCall, subscribeSoapCall, SoapCallMetadata } from './lib/soap-client';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('penebusan');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [activeCall, setActiveCall] = useState<SoapCallMetadata | null>(getLastSoapCall());

  useEffect(() => {
    const unsub = subscribeSoapCall((call) => {
      setActiveCall(call);
    });
    return unsub;
  }, []);

  const handleOpenInspector = () => {
    // If no active call yet, generate a default representation
    if (!activeCall) {
      setActiveCall({
        operation: 'GetPetaniByNIK',
        endpoint: '/soap/agriflow',
        soapAction: 'http://agriflow.id/soap/GetPetaniByNIK',
        rawXmlRequest: `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:agr="http://agriflow.id/soap">
  <soapenv:Header/>
  <soapenv:Body>
    <agr:GetPetaniByNIKRequest>
      <agr:NIK>3301010101700001</agr:NIK>
    </agr:GetPetaniByNIKRequest>
  </soapenv:Body>
</soapenv:Envelope>`,
        rawXmlResponse: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetPetaniByNIKResponse xmlns="http://agriflow.id/soap">
      <Found>true</Found>
      <PetaniId>3301010101700001</PetaniId>
      <NamaLengkap>Budi Santoso</NamaLengkap>
      <DesaKelurahan>Sidomulyo</DesaKelurahan>
      <Kecamatan>Godean</Kecamatan>
      <Status>Aktif</Status>
    </GetPetaniByNIKResponse>
  </soap:Body>
</soap:Envelope>`,
        soapBytes: 680,
        durationMs: 42,
        equivalentRest: {
          method: 'GET',
          endpoint: '/api/petani/3301010101700001',
          requestJson: '(Tidak ada request body pada metode HTTP GET)',
          responseJson: JSON.stringify({
            found: true,
            petaniId: '3301010101700001',
            namaLengkap: 'Budi Santoso',
            desaKelurahan: 'Sidomulyo',
            kecamatan: 'Godean',
            status: 'Aktif'
          }, null, 2),
          restBytes: 245,
        },
      });
    }
    setIsInspectorOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInspector={handleOpenInspector}
      />

      <main style={{ flex: 1, padding: '32px 24px' }}>
        {activeTab === 'login' && (
          <LoginPage
            onSuccess={() => setActiveTab('penebusan')}
            onOpenInspector={handleOpenInspector}
          />
        )}

        {activeTab === 'penebusan' && (
          <PenebusanPage onOpenInspector={handleOpenInspector} />
        )}

        {activeTab === 'stok' && (
          <StokPage onOpenInspector={handleOpenInspector} />
        )}

        {activeTab === 'dashboard' && (
          <DashboardPemerintah onOpenInspector={handleOpenInspector} />
        )}

        {activeTab === 'comparison' && (
          <ComparisonPage />
        )}
      </main>

      {/* FOOTER */}
      <footer style={{
        backgroundColor: '#1e293b',
        borderTop: '1px solid #334155',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#94a3b8',
      }}>
        🌾 <strong>AgriFlow 2</strong> — Implementasi SOAP 1.1 Web Service & WSDL Contract. Dibandingkan dengan <strong>AgriFlow 1</strong> (REST API).
      </footer>

      {/* REST VS SOAP LIVE MODAL */}
      {isInspectorOpen && (
        <RestVsSoapModal
          call={activeCall}
          onClose={() => setIsInspectorOpen(false)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
