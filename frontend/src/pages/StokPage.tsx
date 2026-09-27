import React, { useState, useEffect } from 'react';
import { soapApi, StokItem } from '../lib/api-soap';
import { Store, ArrowRightLeft, RefreshCw, AlertCircle, Package } from 'lucide-react';

interface Props {
  onOpenInspector: () => void;
}

export const StokPage: React.FC<Props> = ({ onOpenInspector }) => {
  const [pengecerId, setPengecerId] = useState(2);
  const [loading, setLoading] = useState(false);
  const [namaPengecer, setNamaPengecer] = useState('');
  const [stokList, setStokList] = useState<StokItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchStok = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await soapApi.cekStokPengecer(id);
      setNamaPengecer(res.namaPengecer);
      setStokList(res.listStok);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data stok via SOAP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStok(pengecerId);
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1e293b',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid #334155',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>
            🏪 Monitoring Stok Kios Pengecer
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
            Operasi SOAP: <code style={{ color: '#38bdf8' }}>CekStokPengecer</code>
          </p>
        </div>

        <button
          onClick={onOpenInspector}
          style={{
            background: '#1e3a8a',
            border: '1px solid #3b82f6',
            color: '#93c5fd',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ArrowRightLeft size={16} />
          Bandingkan SOAP vs REST
        </button>
      </div>

      {/* FILTER PENGECER */}
      <div style={{
        background: '#1e293b',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
          Pilih ID Kios Pengecer:
        </label>
        <input
          type="number"
          value={pengecerId}
          onChange={(e) => setPengecerId(Number(e.target.value))}
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '8px 12px',
            color: '#fff',
            width: '100px',
          }}
        />
        <button
          onClick={() => fetchStok(pengecerId)}
          disabled={loading}
          style={{
            background: '#15803d',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Mengambil SOAP...' : 'Muat Ulang Stok'}
        </button>

        {namaPengecer && (
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#94a3b8' }}>
            Nama Kios: <strong style={{ color: '#4ade80' }}>{namaPengecer}</strong>
          </span>
        )}
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '14px',
          color: '#fca5a5',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* STOK CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
      }}>
        {stokList.length === 0 && !loading ? (
          <div style={{
            gridColumn: '1 / -1',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            color: '#94a3b8',
          }}>
            <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>Data stok untuk pengecer ini belum tersedia.</p>
          </div>
        ) : (
          stokList.map((item) => (
            <div key={item.pupukId} style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                    {item.namaPupuk}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>ID Produk: #{item.pupukId}</span>
                </div>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  color: '#4ade80',
                  fontWeight: 700,
                  fontSize: '11px',
                }}>
                  SUBSIDI
                </div>
              </div>

              <div style={{ margin: '12px 0' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#22c55e' }}>
                  {item.jumlahStok.toLocaleString('id-ID')}
                </span>
                <span style={{ fontSize: '14px', color: '#94a3b8', marginLeft: '6px' }}>Kg Fisik</span>
              </div>

              <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                Sinkronisasi Terakhir: {new Date(item.terakhirUpdate).toLocaleString('id-ID')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
