import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRightLeft, FileCode2, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenInspector: () => void;
}

export const Navbar: React.FC<Props> = ({ activeTab, setActiveTab, onOpenInspector }) => {
  const { user, logout } = useAuth();

  return (
    <header style={{
      backgroundColor: '#1e293b',
      borderBottom: '1px solid #334155',
      padding: '0 24px',
      height: '68px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* BRAND */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setActiveTab('penebusan')}>
          <span style={{ fontSize: '26px' }}>🌾</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                AgriFlow 2
              </span>
              <span style={{
                background: '#2563eb',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
              }}>
                SOAP API
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              XML Envelope Client
            </span>
          </div>
        </div>

        {/* NAVIGATION PILLS */}
        <nav style={{ display: 'flex', gap: '6px', marginLeft: '24px' }}>
          <button
            onClick={() => setActiveTab('penebusan')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'penebusan' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              color: activeTab === 'penebusan' ? '#4ade80' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            👨‍🌾 Penebusan Pupuk
          </button>

          <button
            onClick={() => setActiveTab('stok')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'stok' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              color: activeTab === 'stok' ? '#4ade80' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🏪 Stok Kios
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'dashboard' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              color: activeTab === 'dashboard' ? '#4ade80' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🏛️ Dashboard Nasional
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'comparison' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'comparison' ? '#60a5fa' : '#94a3b8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚖️ Analisis REST vs SOAP
          </button>
        </nav>
      </div>

      {/* RIGHT CONTROLS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* INSPECTOR BUTTON */}
        <button
          onClick={onOpenInspector}
          style={{
            background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
            border: '1px solid #3b82f6',
            color: '#fff',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          }}
        >
          <ArrowRightLeft size={15} />
          <span>REST vs SOAP Inspector</span>
        </button>

        {/* WSDL LINK */}
        <a
          href="http://localhost:8002/soap/agriflow?wsdl"
          target="_blank"
          rel="noreferrer"
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            color: '#38bdf8',
            padding: '7px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FileCode2 size={14} />
          WSDL Contract
        </a>

        {/* USER PROFILE / LOGOUT */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px' }}>
            <div style={{
              background: '#0f172a',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}>
              <ShieldCheck size={14} color="#4ade80" />
              <span>{user.name || user.email}</span>
              <span style={{
                background: '#15803d',
                color: '#fff',
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '3px',
                fontWeight: 700,
              }}>
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#f87171',
                padding: '7px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActiveTab('login')}
            style={{
              background: '#15803d',
              color: '#fff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserIcon size={14} /> Login SOAP
          </button>
        )}
      </div>
    </header>
  );
};
