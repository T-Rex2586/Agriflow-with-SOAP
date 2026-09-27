import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRightLeft, Lock, Mail, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onOpenInspector: () => void;
}

export const LoginPage: React.FC<Props> = ({ onSuccess, onOpenInspector }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('pemerintah@agriflow.id');
  const [password, setPassword] = useState('PasswordAman123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await login(email, password);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '60px auto',
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          background: 'rgba(34, 197, 94, 0.15)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <Shield size={28} color="#4ade80" />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
          Login via SOAP Web Service
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          Autentikasi akun menggunakan pesan XML Envelope & SOAPAction <code style={{ color: '#38bdf8' }}>LoginUser</code>
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid #22c55e',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#86efac',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle size={18} />
          <span>Login SOAP Berhasil! Mengalihkan...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
            Email Pengguna
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 12px 10px 38px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
            Kata Sandi
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 12px 10px 38px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '8px',
            transition: 'opacity 0.2s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Mengirim XML SOAP Request...' : 'Kirim SOAP LoginUser'} 🚀
        </button>
      </form>

      {/* INSPECTOR CALLOUT */}
      <div style={{
        marginTop: '24px',
        padding: '14px',
        background: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
      }}>
        <span style={{ color: '#94a3b8' }}>Ingin melihat perbandingan XML vs JSON?</span>
        <button
          type="button"
          onClick={onOpenInspector}
          style={{
            background: '#1e3a8a',
            border: '1px solid #3b82f6',
            color: '#93c5fd',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <ArrowRightLeft size={13} /> Bandingkan
        </button>
      </div>
    </div>
  );
};
