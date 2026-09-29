'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/distributor/SideBar'
import TopBar from '@/components/layout/TopBar'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatStock } from '@/lib/format'

interface DashboardData {
  stockSummary: { totalStock: number; totalInbound: number; totalOutgoing: number }
  recentShipments: { kirimanId: string; jenisPupuk: string; jumlahDikirim: number; timestampDikirim: string; status: string }[]
  recentStockOut: { id: string; jenisPupuk: string; jumlah: number; timestamp: string; status: string }[]
  notifications: { notifikasiId: string; judul: string; pesan: string; timestamp: string }[]
}

function StatusBadge({ status }: { status: string }) {
  const isGreen = status === 'Berhasil' || status === 'Sesuai' || status === 'Aman' || status === 'Dikirim' || status === 'Diterima' || status === 'Masuk'
  return (
    <span
      style={{
        padding: '5px 0',
        borderRadius: '999px',
        background: isGreen ? '#72A94F' : '#BA1A1A',
        color: 'white',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: '13px',
        width: '100px',
        textAlign: 'center',
        display: 'inline-block',
      }}
    >
      {status}
    </span>
  )
}

function ActivityRow({ kirimanId, jenisPupuk, jumlahDikirim, timestampDikirim, status }: DashboardData['recentShipments'][0]) {
  const date = timestampDikirim ? timestampDikirim.split(' | ')[0] : '-'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: '10px',
        background: '#f5f5f5',
        gap: '12px',
        height: '68px',
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', color: '#1a1a1a' }}>
          ID : {kirimanId?.slice(0, 8) || '-'}
        </p>
        <p style={{ fontSize: '12px', color: '#888' }}>{date}</p>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>{jenisPupuk}</p>
        <p style={{ fontSize: '12px', color: '#888' }}>{formatStock(jumlahDikirim)}</p>
      </div>
      <StatusBadge status={status} />
    </div>
  )
}

function StokRow({ id, jenisPupuk, jumlah, timestamp, status }: DashboardData['recentStockOut'][0]) {
  const date = timestamp ? timestamp.split(' | ')[0] : '-'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: '10px',
        background: '#f5f5f5',
        gap: '12px',
        height: '68px',
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', color: '#1a1a1a' }}>
          ID : {id?.slice(0, 8) || '-'}
        </p>
        <p style={{ fontSize: '12px', color: '#888' }}>{date}</p>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>{jenisPupuk}</p>
        <p style={{ fontSize: '12px', color: '#888' }}>{formatStock(jumlah)}</p>
      </div>
      <StatusBadge status={status} />
    </div>
  )
}

export default function DashboardDistributorPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<DashboardData>('/api/distributor/dashboard')
      .then(res => {
        if (res.data) setData(res.data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const statCards = data ? [
    { label: 'Total Stok Keseluruhan',  value: data.stockSummary?.totalStock ?? 0 },
    { label: 'Total Stok Masuk',        value: data.stockSummary?.totalInbound ?? 0 },
    { label: 'Total Stok Keluar',       value: data.stockSummary?.totalOutgoing ?? 0 },
  ] : []

  const aktivitasPengiriman = data?.recentShipments?.slice(0, 3) ?? []
  const stokPupuk = data?.recentStockOut?.slice(0, 3) ?? []
  const notifikasi = data?.notifications ?? []

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', color: '#1e6b1e' }}>Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Main Content Kiri */}
          <main style={{ flex: 1, padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>

            {/* Hero banner */}
            <div
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                height: '200px',
                backgroundImage: "url('/utama.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                padding: '0 40px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(10,40,10,0.35)',
                  borderRadius: '20px',
                }}
              />
              <h1
                style={{
                  position: 'relative',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '36px',
                  color: 'white',
                  letterSpacing: '-0.02em',
                }}
              >
                Selamat Datang, Distributor!
              </h1>
            </div>

            {error && (
              <div style={{ padding: '12px', borderRadius: '8px', background: '#FEE2E2', color: '#991B1B', fontSize: '14px' }}>
                {error}
              </div>
            )}

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {statCards.map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '28px 24px',
                    border: '1px solid #eee',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: '#1a1a1a', lineHeight: 1 }}>
                    {formatStock(value)}
                  </p>
                </div>
              ))}
            </div>

            {/* Aktivitas Terbaru */}
            <div
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '28px 28px',
                border: '1px solid #eee',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', marginBottom: '20px', color: '#1a1a1a' }}>
                Aktivitas Terbaru
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                
                {/* Aktivitas Pengiriman */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>Aktivitas Pengiriman</p>
                    <Link href="/distributor/riwayat-pengiriman" style={{ fontSize: '13px', color: '#1e6b1e', fontWeight: 500 }}>
                      Lihat Semua
                    </Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {aktivitasPengiriman.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '12px' }}>Belum ada aktivitas</p>
                    ) : (
                      aktivitasPengiriman.map((item) => <ActivityRow key={item.kirimanId} {...item} />)
                    )}
                  </div>
                </div>

                {/* Aktivitas Stok */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>Aktivitas Stok</p>
                    <Link href="/distributor/manajemen-stok" style={{ fontSize: '13px', color: '#1e6b1e', fontWeight: 500 }}>
                      Lihat Semua
                    </Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stokPupuk.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '12px' }}>Belum ada aktivitas stok</p>
                    ) : (
                      stokPupuk.map((item, idx) => <StokRow key={item.id || idx} {...item} />)
                    )}
                  </div>
                </div>

              </div>
            </div>

          </main>

          {/* Sidebar Kanan Notifikasi */}
          <aside style={{ width: '380px', background: '#fafafa', borderLeft: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '32px 28px' }}>
              
              {/* Header Notifikasi */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #72A94F', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', color: '#114111' }}>
                  Notifikasi
                </h2>
                <Link href="/distributor/notifikasi" style={{ fontSize: '13px', color: '#72A94F', textDecoration: 'underline', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                  Lihat Semua
                </Link>
              </div>

              {/* List Kartu Notifikasi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                {notifikasi.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '12px' }}>Tidak ada notifikasi</p>
                ) : (
                  notifikasi.map((notif, index) => (
                    <div 
                      key={notif.notifikasiId || index} 
                      style={{ 
                        background: '#e8e8e8', 
                        borderRadius: '12px', 
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '6px', background: '#BA1A1A' }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', paddingLeft: '8px' }}>
                        <AlertTriangle size={18} color="#BA1A1A" strokeWidth={2} />
                        <span style={{ fontSize: '12px', color: '#333', fontWeight: 500 }}>
                          {notif.timestamp ? new Date(notif.timestamp).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </div>
                      
                      <div style={{ paddingLeft: '8px' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: '#1a1a1a', lineHeight: 1.2, marginBottom: '2px' }}>
                          {notif.judul}
                        </p>
                        <p style={{ fontSize: '12px', color: '#555' }}>
                          ID : {notif.notifikasiId?.slice(0, 8) || '-'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </aside>

        </div>
      </div>
    </div>
  )
}