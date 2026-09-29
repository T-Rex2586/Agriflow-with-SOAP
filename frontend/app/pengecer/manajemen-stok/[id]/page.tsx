'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/pengecer/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { ChevronLeft } from 'lucide-react'
import { formatStock } from '@/lib/format'
import { api } from '@/lib/api'

interface StokItem {
  pupukId: number
  jenisPupuk: string
  jumlahStok: number
  lastUpdated: string
}

interface StockData { totalStockTon: number; stockItems: StokItem[] }

interface ReceiptItem {
  KirimanId?: string; kirimanId?: string
  JenisPupuk?: string; jenisPupuk?: string
  JumlahDikirim?: number; jumlahDikirim?: number
  TimestampDikirim?: string; timestampDikirim?: string
  Status?: string; status?: string
}

export default function DetailStokPage() {
  const params = useParams()
  const pupukId = Number(params.id)

  const [item, setItem] = useState<StokItem | null>(null)
  const [receipts, setReceipts] = useState<ReceiptItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pupukId) return

    Promise.all([
      api.get<StockData>('/api/pengecer/stok'),
      api.get<{ receipts: ReceiptItem[] }>('/api/pengecer/penerimaan/history'),
    ])
      .then(([stockRes, receiptRes]) => {
        const found = stockRes.data?.stockItems?.find(s => s.pupukId === pupukId)
        if (!found) { setError('Stok tidak ditemukan'); return }

        setItem(found)

        const allReceipts = receiptRes.data?.receipts ?? []
        const filtered = allReceipts.filter(r => {
          const jenis = r.JenisPupuk || r.jenisPupuk || ''
          return jenis.toLowerCase() === found.jenisPupuk.toLowerCase()
        })
        setReceipts(filtered)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [pupukId])

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
        <Sidebar notifCount={2} />
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
        <Sidebar notifCount={2} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <TopBar />
          <main style={{ flex: 1, padding: '32px 36px' }}>
            <p style={{ color: '#c53030', fontSize: '14px' }}>{error || 'Stok tidak ditemukan'}</p>
            <Link href="/pengecer/manajemen-stok" style={{ color: '#1e6b1e', fontWeight: 600, fontSize: '14px', marginTop: '16px', display: 'inline-block' }}>Kembali ke Manajemen Stok</Link>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar notifCount={2} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar />
        <main style={{ flex: 1, padding: '32px 36px' }}>
          <Link href="/pengecer/manajemen-stok" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#555', fontSize: '14px', fontWeight: 500, textDecoration: 'none', marginBottom: '20px' }}>
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
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>{formatStock(item.jumlahStok)}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>Terakhir Diperbarui</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>{item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('id-ID') : '-'}</p>
              </div>
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#1a1a1a', marginBottom: '16px' }}>
            Riwayat Penerimaan
          </h2>

          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 200px 160px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0' }}>
              {['ID Pengiriman', 'Jenis Pupuk', 'Jumlah', 'Tanggal', 'Status'].map(h => (
                <span key={h} style={{ fontSize: '14px', color: '#888', fontWeight: 500, textAlign: 'center' }}>{h}</span>
              ))}
            </div>
            {receipts.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Belum ada riwayat penerimaan.</div>
            ) : (
              receipts.map((r, i) => {
                const idStr = r.KirimanId || r.kirimanId || '-'
                const jenis = r.JenisPupuk || r.jenisPupuk || '-'
                const jml = r.JumlahDikirim ?? r.jumlahDikirim ?? 0
                const ts = r.TimestampDikirim || r.timestampDikirim
                const tgl = ts ? new Date(ts).toLocaleDateString('id-ID') : '-'
                const status = r.Status || r.status || 'Sesuai'
                const bgColor = status === 'Dikirim' ? '#eab308'
                  : status === 'Tidak Sesuai' ? '#dc2626'
                  : '#16a34a'

                return (
                  <div key={`${idStr}-${i}`} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 200px 160px', padding: '16px 24px', background: i % 2 === 0 ? '#fafafa' : 'white', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#555', textAlign: 'center' }}>{idStr.slice(0, 8)}</span>
                    <span style={{ fontSize: '15px', color: '#333', textAlign: 'center' }}>{jenis}</span>
                    <span style={{ fontSize: '15px', color: '#333', textAlign: 'center' }}>{formatStock(jml)}</span>
                    <span style={{ fontSize: '14px', color: '#555', textAlign: 'center' }}>{tgl}</span>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '5px 0', borderRadius: '999px', width: '120px', textAlign: 'center', background: bgColor, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px' }}>{status}</span>
                    </div>
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
