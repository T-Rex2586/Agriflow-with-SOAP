'use client'

import { useState, useEffect, useCallback } from 'react'
import SidebarPemerintah from '@/components/pemerintah/SideBar'
import TopBar from '@/components/layout/TopBar'
import { invokeSignedSoap } from '@/lib/soap-pemerintah'
import { AlertTriangle } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'

// ─── Types ─────────────────────────────────────────────────────────────────
interface Anomaly {
  jenisNotifikasi: string
  judulNotifikasi: string
  pesanNotifikasi: string
  tanggal: string
}

interface AnomalyResponse {
  anomalies: Anomaly[]
  totalRows: number
}

const PAGE_SIZE = 6

const JENIS_COLOR: Record<string, string> = {
  Warning: '#BA1A1A',
  Stok: '#D97706',
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function DeteksiAnomaliPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    try {
      // 🔐 SIGNED SOAP — GetDeteksiAnomali
      const res = await invokeSignedSoap('GetDeteksiAnomali', { Page: p, BatasKg: 500 })
      if (res.data) {
        const raw = res.data
        let rawList: any[] = []
        if (raw.ListAnomali) {
          rawList = Array.isArray(raw.ListAnomali) ? raw.ListAnomali : [raw.ListAnomali]
        }
        const total = rawList[0]?.TotalRows ?? raw.TotalAnomali ?? rawList.length
        const list: Anomaly[] = rawList.map((item: any) => ({
          jenisNotifikasi: item.Jenis ?? item.JenisNotifikasi ?? 'Warning',
          judulNotifikasi: item.Judul ?? item.JudulNotifikasi ?? '-',
          pesanNotifikasi: item.Pesan ?? item.PesanNotifikasi ?? '-',
          tanggal: item.Timestamp ?? item.Tanggal ?? '-',
        }))
        setAnomalies(list)
        setTotalRows(Number(total))
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data anomali via SOAP')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(page)
  }, [page, fetchData])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <SidebarPemerintah />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />

        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Header */}
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', color: '#1a1a1a' }}>
              Deteksi Anomali
            </h1>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              Pantau notifikasi peringatan dan anomali stok pupuk
            </p>
          </div>

          {error && (
            <div style={{ padding: '12px', borderRadius: '8px', background: '#FEE2E2', color: '#991B1B', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {/* Table */}
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #eee',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#BA1A1A" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>
                Daftar Anomali
              </h2>
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#1e6b1e', fontFamily: 'var(--font-display)' }}>
                Memuat...
              </div>
            ) : anomalies.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
                Tidak ada anomali terdeteksi
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 2fr 130px',
                    padding: '12px 24px',
                    background: '#f9fafb',
                    borderBottom: '1px solid #eee',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <span>Jenis</span>
                  <span>Judul</span>
                  <span>Pesan</span>
                  <span>Tanggal</span>
                </div>

                {/* Rows */}
                {anomalies.map((a, idx) => {
                  const badgeColor = JENIS_COLOR[a.jenisNotifikasi] ?? '#555'
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr 2fr 130px',
                        padding: '16px 24px',
                        borderBottom: '1px solid #f0f0f0',
                        alignItems: 'center',
                        fontSize: '14px',
                      }}
                    >
                      <span>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '999px',
                            background: badgeColor + '20',
                            color: badgeColor,
                            fontSize: '12px',
                            fontWeight: 700,
                            border: `1px solid ${badgeColor}40`,
                          }}
                        >
                          {a.jenisNotifikasi}
                        </span>
                      </span>
                      <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{a.judulNotifikasi}</span>
                      <span style={{ color: '#555', lineHeight: 1.4 }}>{a.pesanNotifikasi}</span>
                      <span style={{ color: '#888', fontSize: '13px' }}>{a.tanggal}</span>
                    </div>
                  )
                })}

                {/* Pagination */}
                <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee' }}>
                  <p style={{ fontSize: '13px', color: '#888' }}>
                    Menampilkan {anomalies.length} dari {totalRows} anomali
                  </p>
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
