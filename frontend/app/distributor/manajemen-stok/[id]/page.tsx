'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/distributor/SideBar'
import TopBar from '@/components/layout/TopBar'
import { ChevronLeft } from 'lucide-react'
import { formatStock } from '@/lib/format'
import { api } from '@/lib/api'

interface StokItem {
  pupukId: number
  jenisPupuk: string
  jumlah: number
  lastUpdated: string
}

interface StockData { totalStockTon: number; stockItems: StokItem[] }

interface RiwayatItem {
  riwayatId: string
  jenisPupuk: string
  jumlahAwal: number
  jumlahAkhir: number
  tipePerubahan: string
  timestamp: string
}

export default function DetailStokDistributorPage() {
  const params = useParams()
  const pupukId = Number(params.id)

  const [item, setItem] = useState<StokItem | null>(null)
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pupukId) return

    Promise.all([
      api.get<StockData>('/api/distributor/stok'),
      api.get<RiwayatItem[]>('/api/distributor/stok/history/masuk'),
    ])
      .then(([stockRes, riwayatRes]) => {
        const found = stockRes.data?.stockItems?.find(s => s.pupukId === pupukId)
        if (!found) { setError('Stok tidak ditemukan'); return }

        setItem(found)

        const allRiwayat = Array.isArray(riwayatRes.data) ? riwayatRes.data : []
        const filtered = allRiwayat.filter(r => r.jenisPupuk.toLowerCase() === found.jenisPupuk.toLowerCase())
        setRiwayat(filtered)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [pupukId])

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <TopBar />
          <main style={{ flex: 1, padding: '32px 36px' }}>
            <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Memuat...</div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <TopBar />
          <main style={{ flex: 1, padding: '32px 36px' }}>
            <p style={{ color: '#c53030', fontSize: '14px' }}>{error || 'Stok tidak ditemukan'}</p>
            <Link href="/distributor/manajemen-stok" style={{ color: '#1e6b1e', fontWeight: 600, fontSize: '14px', marginTop: '16px', display: 'inline-block' }}>Kembali ke Manajemen Stok</Link>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar />
        <main style={{ flex: 1, padding: '32px 36px' }}>
          <Link href="/distributor/manajemen-stok" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#555', fontSize: '14px', fontWeight: 500, textDecoration: 'none', marginBottom: '20px' }}>
            <ChevronLeft size={16} /> Kembali
          </Link>

          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', padding: '28px 32px', marginBottom: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', color: '#1a1a1a', marginBottom: '20px' }}>
              {item.jenisPupuk}
            </h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>ID Pupuk</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>{item.pupukId}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>Jumlah Stok</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>{formatStock(Number(item.jumlah))}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>Terakhir Diperbarui</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>{item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('id-ID') : '-'}</p>
              </div>
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#1a1a1a', marginBottom: '16px' }}>
            Riwayat Stok Masuk
          </h2>

          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 200px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0' }}>
              {['ID', 'Jenis Pupuk', 'Jumlah', 'Tanggal'].map(h => (
                <span key={h} style={{ fontSize: '14px', color: '#888', fontWeight: 500, textAlign: 'center' }}>{h}</span>
              ))}
            </div>
            {riwayat.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Belum ada riwayat stok masuk.</div>
            ) : (
              riwayat.map((r, i) => {
                const tgl = r.timestamp ? new Date(r.timestamp).toLocaleDateString('id-ID') : '-'
                return (
                  <div key={r.riwayatId || i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 200px', padding: '16px 24px', background: i % 2 === 0 ? '#fafafa' : 'white', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#555', textAlign: 'center' }}>{r.riwayatId?.slice(0, 8) || '-'}</span>
                    <span style={{ fontSize: '15px', color: '#333', textAlign: 'center' }}>{r.jenisPupuk}</span>
                    <span style={{ fontSize: '15px', color: '#1e6b1e', textAlign: 'center', fontWeight: 600 }}>{formatStock(r.jumlahAkhir)}</span>
                    <span style={{ fontSize: '14px', color: '#555', textAlign: 'center' }}>{tgl}</span>
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
