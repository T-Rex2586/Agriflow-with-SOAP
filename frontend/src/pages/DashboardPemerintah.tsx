import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { soapApi, DashboardPemerintahData, PendingUserItem, AnomaliItem } from '../lib/api-soap';
import {
  Landmark, ArrowRightLeft, TrendingUp, PieChart, Database, Activity,
  RefreshCw, Shield, CheckCircle, XCircle, AlertTriangle, Users, Lock, KeyRound,
} from 'lucide-react';

interface Props {
  onOpenInspector: () => void;
}

type AdminTab = 'dashboard' | 'pending' | 'anomali';

export const DashboardPemerintah: React.FC<Props> = ({ onOpenInspector }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Dashboard state
  const [data, setData] = useState<DashboardPemerintahData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tahunAwal, setTahunAwal] = useState(2024);
  const [tahunAkhir, setTahunAkhir] = useState(2026);

  // Pending users state
  const [pendingUsers, setPendingUsers] = useState<PendingUserItem[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Anomali state
  const [anomaliList, setAnomaliyList] = useState<AnomaliItem[]>([]);
  const [loadingAnomali, setLoadingAnomali] = useState(false);
  const [batasKg, setBatasKg] = useState(150);

  const accessToken = user?.accessToken || '';

  // ── Fetch Dashboard ──────────────────────────────────────────────────────
  const fetchDashboard = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await soapApi.getDashboardPemerintah(tahunAwal, tahunAkhir, accessToken);
      setData(res);
    } catch (err: any) {
      console.error('[Signed SOAP] GetDashboardPemerintah error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Pending Users ──────────────────────────────────────────────────
  const fetchPendingUsers = async () => {
    if (!accessToken) return;
    setLoadingPending(true);
    setActionMsg(null);
    try {
      const res = await soapApi.getPendingUsers(accessToken);
      setPendingUsers(res.listUsers);
    } catch (err: any) {
      console.error('[Signed SOAP] GetPendingUsers error:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  // ── Fetch Anomali ────────────────────────────────────────────────────────
  const fetchAnomali = async () => {
    if (!accessToken) return;
    setLoadingAnomali(true);
    try {
      const res = await soapApi.getDeteksiAnomali(batasKg, accessToken);
      setAnomaliyList(res.listAnomali);
    } catch (err: any) {
      console.error('[Signed SOAP] GetDeteksiAnomali error:', err);
    } finally {
      setLoadingAnomali(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') fetchPendingUsers();
    if (activeTab === 'anomali') fetchAnomali();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Approve / Reject ─────────────────────────────────────────────────────
  const handleApprove = async (targetId: number) => {
    if (!accessToken || !user) return;
    try {
      await soapApi.approveUser(targetId, user.userId, accessToken);
      setActionMsg({ type: 'success', text: `✅ Akun ID ${targetId} berhasil disetujui via Signed SOAP` });
      fetchPendingUsers();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: `❌ Gagal: ${err.message}` });
    }
  };

  const handleReject = async (targetId: number) => {
    if (!accessToken || !user) return;
    const alasan = window.prompt('Masukkan alasan penolakan:') || '-';
    try {
      await soapApi.rejectUser(targetId, user.userId, alasan, accessToken);
      setActionMsg({ type: 'success', text: `⛔ Akun ID ${targetId} ditolak via Signed SOAP` });
      fetchPendingUsers();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: `❌ Gagal: ${err.message}` });
    }
  };

  // ── Shared badge ─────────────────────────────────────────────────────────
  const SignedBadge = () => (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: 'rgba(16, 185, 129, 0.15)',
      border: '1px solid #10b981',
      borderRadius: '999px',
      padding: '3px 10px',
      fontSize: '11px',
      fontWeight: 700,
      color: '#34d399',
      letterSpacing: '0.3px',
    }}>
      <Lock size={11} />
      WS-Security · HMAC-SHA256 Signed SOAP
    </div>
  );

  // ── Tab buttons ──────────────────────────────────────────────────────────
  const tabStyle = (tab: AdminTab): React.CSSProperties => ({
    background: activeTab === tab ? '#1d4ed8' : 'transparent',
    border: activeTab === tab ? '1px solid #3b82f6' : '1px solid #334155',
    color: activeTab === tab ? '#fff' : '#94a3b8',
    padding: '7px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark size={22} color="#a78bfa" />
            Dashboard Admin Pemerintah
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 0' }}>
            Operasi SOAP:&nbsp;
            <code style={{ color: '#38bdf8' }}>GetDashboardPemerintah</code>,&nbsp;
            <code style={{ color: '#38bdf8' }}>GetPendingUsers</code>,&nbsp;
            <code style={{ color: '#38bdf8' }}>ApproveUser</code>,&nbsp;
            <code style={{ color: '#38bdf8' }}>GetDeteksiAnomali</code>
          </p>
          <div style={{ marginTop: '8px' }}>
            <SignedBadge />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid #7c3aed',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            color: '#c4b5fd',
          }}>
            <KeyRound size={14} />
            Token: {accessToken ? `${accessToken.slice(0, 16)}…` : 'Belum login'}
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
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button style={tabStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>
          <TrendingUp size={15} /> Statistik Nasional
        </button>
        <button style={tabStyle('pending')} onClick={() => setActiveTab('pending')}>
          <Users size={15} /> Persetujuan Akun
          {pendingUsers.length > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '999px',
              padding: '1px 6px',
            }}>
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button style={tabStyle('anomali')} onClick={() => setActiveTab('anomali')}>
          <AlertTriangle size={15} /> Deteksi Anomali
        </button>
      </div>

      {/* ── TAB: DASHBOARD STATISTIK ─────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <>
          {/* Filter Tahun */}
          <div style={{
            background: '#1e293b',
            padding: '16px 24px',
            borderRadius: '12px',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <Shield size={16} color="#10b981" />
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>Rentang Tahun:</label>
            <input
              type="number"
              value={tahunAwal}
              onChange={(e) => setTahunAwal(Number(e.target.value))}
              style={{
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: '6px', padding: '6px 12px', color: '#fff', width: '90px',
              }}
            />
            <span style={{ color: '#94a3b8' }}>sampai</span>
            <input
              type="number"
              value={tahunAkhir}
              onChange={(e) => setTahunAkhir(Number(e.target.value))}
              style={{
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: '6px', padding: '6px 12px', color: '#fff', width: '90px',
              }}
            />
            <button
              onClick={fetchDashboard}
              disabled={loading}
              style={{
                background: loading ? '#166534' : 'linear-gradient(135deg, #15803d, #16a34a)',
                color: '#fff', border: 'none', borderRadius: '6px',
                padding: '7px 16px', fontSize: '13px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Mengirim Signed SOAP…' : 'Terapkan Filter'}
            </button>
          </div>

          {/* Stats Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              {
                label: 'Total Pupuk Terserap',
                value: data ? `${data.totalTerserapTon.toLocaleString('id-ID')} Ton` : '— Ton',
                sub: 'Berdasarkan transaksi penebusan sah',
                color: '#22c55e',
                Icon: TrendingUp,
              },
              {
                label: 'Tingkat Realisasi',
                value: data ? data.realisasiPersen : '—',
                sub: 'Persentase serapan kuota alokasi',
                color: '#3b82f6',
                Icon: Activity,
              },
              {
                label: 'Sisa Kuota Alokasi',
                value: data ? `${(data.totalSisaKuotaKg / 1000).toFixed(2)} Ton` : '— Ton',
                sub: 'Belum ditebus oleh kelompok tani',
                color: '#eab308',
                Icon: PieChart,
              },
              {
                label: 'Total Alokasi Subsidi',
                value: data ? `${(data.totalAlokasiKg / 1000).toFixed(2)} Ton` : '— Ton',
                sub: 'Total pagu subsidi nasional',
                color: '#a855f7',
                Icon: Database,
              },
            ].map(({ label, value, sub, color, Icon }) => (
              <div key={label} style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
                  <Icon size={20} color={color} />
                </div>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#fff' }}>{value}</span>
                <span style={{ fontSize: '11px', color: '#4ade80' }}>{sub}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TAB: PERSETUJUAN AKUN ────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#cbd5e1', fontWeight: 600 }}>
              Daftar Akun Menunggu Persetujuan
            </span>
            <button
              onClick={fetchPendingUsers}
              disabled={loadingPending}
              style={{
                background: '#1e3a8a', border: '1px solid #3b82f6',
                color: '#93c5fd', padding: '6px 14px', borderRadius: '6px',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <RefreshCw size={13} />
              {loadingPending ? 'Memuat…' : 'Refresh (Signed SOAP)'}
            </button>
          </div>

          {actionMsg && (
            <div style={{
              background: actionMsg.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${actionMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              color: actionMsg.type === 'success' ? '#34d399' : '#fca5a5',
            }}>
              {actionMsg.text}
            </div>
          )}

          {loadingPending ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>
              🔐 Mengirim GetPendingUsers via Signed SOAP…
            </div>
          ) : pendingUsers.length === 0 ? (
            <div style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: '12px', padding: '40px',
              textAlign: 'center', color: '#64748b', fontSize: '14px',
            }}>
              ✅ Tidak ada akun yang menunggu persetujuan
            </div>
          ) : (
            pendingUsers.map((u) => (
              <div key={u.userId} style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '14px' }}>{u.namaLengkap}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{u.email}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6',
                      color: '#93c5fd', fontSize: '10px', fontWeight: 700,
                      padding: '2px 8px', borderRadius: '4px',
                    }}>{u.role}</span>
                    <span style={{
                      background: 'rgba(234,179,8,0.15)', border: '1px solid #eab308',
                      color: '#fde047', fontSize: '10px', fontWeight: 700,
                      padding: '2px 8px', borderRadius: '4px',
                    }}>{u.status}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Daftar: {new Date(u.tanggalDaftar).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleApprove(u.userId)}
                    style={{
                      background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981',
                      color: '#34d399', padding: '7px 14px', borderRadius: '6px',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    <CheckCircle size={14} /> Setujui
                  </button>
                  <button
                    onClick={() => handleReject(u.userId)}
                    style={{
                      background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444',
                      color: '#fca5a5', padding: '7px 14px', borderRadius: '6px',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    <XCircle size={14} /> Tolak
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: DETEKSI ANOMALI ─────────────────────────────────────────── */}
      {activeTab === 'anomali' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: '10px', padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          }}>
            <AlertTriangle size={16} color="#f59e0b" />
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
              Batas Wajar Penebusan:
            </label>
            <input
              type="number"
              value={batasKg}
              onChange={(e) => setBatasKg(Number(e.target.value))}
              style={{
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: '6px', padding: '6px 12px', color: '#fff', width: '100px',
              }}
            />
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>kg/hari</span>
            <button
              onClick={fetchAnomali}
              disabled={loadingAnomali}
              style={{
                background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b',
                color: '#fbbf24', padding: '7px 16px', borderRadius: '6px',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <RefreshCw size={13} />
              {loadingAnomali ? 'Menganalisis…' : 'Deteksi via Signed SOAP'}
            </button>
          </div>

          {loadingAnomali ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>
              🔐 Mengirim GetDeteksiAnomali via Signed SOAP…
            </div>
          ) : anomaliList.length === 0 ? (
            <div style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: '12px', padding: '40px',
              textAlign: 'center', color: '#64748b', fontSize: '14px',
            }}>
              ✅ Tidak ada anomali terdeteksi di atas batas {batasKg} kg
            </div>
          ) : (
            anomaliList.map((a, i) => (
              <div key={i} style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fca5a5', fontSize: '13px' }}>
                      🚨 Transaksi #{a.tebusanId} — {a.namaPupuk}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                      Petani: <strong style={{ color: '#f1f5f9' }}>{a.namaPetani}</strong> &nbsp;|&nbsp;
                      Pengecer: <strong style={{ color: '#f1f5f9' }}>{a.namaPengecer}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '4px' }}>
                      ⚠️ {a.alasanAnomali}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444',
                    borderRadius: '8px', padding: '8px 14px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#fca5a5' }}>
                      {a.jumlahKg.toLocaleString('id-ID')}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>kg</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  {new Date(a.timestamp).toLocaleString('id-ID')}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
