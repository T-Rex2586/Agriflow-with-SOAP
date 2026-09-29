'use client'

import { useState, useEffect, useCallback } from 'react'
import SidebarPemerintah from '@/components/pemerintah/SideBar'
import TopBar from '@/components/layout/TopBar'
import { invokeSoap } from '@/lib/soap-pemerintah'
import { HelpCircle, Mail } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'

// ─── Types ─────────────────────────────────────────────────────────────────
interface HelpRequest {
  no: number
  namaLengkap: string
  email: string
  topik: string
  ringkasan: string
}

interface HelpResponse {
  helpRequests: HelpRequest[]
  totalRows: number
}

const PAGE_SIZE = 6

// ─── Page ──────────────────────────────────────────────────────────────────
export default function BantuanPemerintahPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<HelpRequest | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    try {
      // 🔓 UNSIGNED SOAP — GetHelpRequests
      const res = await invokeSoap('GetHelpRequests', { Page: p })
      if (res.data) {
        const raw = res.data
        const rawList: any[] = raw.ListBantuan
          ? Array.isArray(raw.ListBantuan) ? raw.ListBantuan : [raw.ListBantuan]
          : []
        const total = rawList[0]?.TotalRows ?? raw.Total ?? rawList.length
        const normalized: HelpRequest[] = rawList.map((r: any, idx: number) => ({
          no: Number(r.No ?? idx + 1),
          namaLengkap: [r.FirstName, r.LastName].filter(Boolean).join(' ') || r.NamaLengkap || '-',
          email: r.Email ?? '-',
          topik: r.Topik ?? '-',
          ringkasan: r.Ringkasan ?? '-',
        }))
        setRequests(normalized)
        setTotalRows(Number(total))
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data bantuan via SOAP')
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
              Bantuan & Keluhan
            </h1>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              Daftar laporan bantuan dan keluhan yang masuk dari publik
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
              <HelpCircle size={20} color="#1e6b1e" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>
                Daftar Laporan Masuk
              </h2>
              <span
                style={{
                  marginLeft: 'auto',
                  padding: '4px 14px',
                  borderRadius: '999px',
                  background: '#e8f5e9',
                  color: '#1e6b1e',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {totalRows} laporan
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#1e6b1e', fontFamily: 'var(--font-display)' }}>
                Memuat...
              </div>
            ) : requests.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
                Belum ada laporan bantuan
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1.2fr 1.8fr 1.5fr 1fr',
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
                  <span>No</span>
                  <span>Nama</span>
                  <span>Email</span>
                  <span>Topik</span>
                  <span>Detail</span>
                </div>

                {/* Rows */}
                {requests.map((r) => (
                  <div
                    key={r.no}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '48px 1.2fr 1.8fr 1.5fr 1fr',
                      padding: '14px 24px',
                      borderBottom: '1px solid #f0f0f0',
                      alignItems: 'center',
                      fontSize: '14px',
                    }}
                  >
                    <span style={{ color: '#888' }}>{r.no}</span>
                    <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{r.namaLengkap}</span>
                    <span style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} color="#888" />
                      {r.email}
                    </span>
                    <span>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '999px',
                          background: '#f0f9f0',
                          color: '#1e6b1e',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: '1px solid #c8e6c9',
                        }}
                      >
                        {r.topik}
                      </span>
                    </span>
                    <button
                      onClick={() => setSelected(r)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '999px',
                        background: 'transparent',
                        border: '1.5px solid #1e6b1e',
                        color: '#1e6b1e',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      Lihat Isi
                    </button>
                  </div>
                ))}

                {/* Pagination */}
                <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee' }}>
                  <p style={{ fontSize: '13px', color: '#888' }}>
                    Menampilkan {requests.length} dari {totalRows} laporan
                  </p>
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </div>

        </main>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              width: '480px',
              maxWidth: '90vw',
              boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#1a1a1a', marginBottom: '20px' }}>
              Detail Laporan
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Nama', value: selected.namaLengkap },
                { label: 'Email', value: selected.email },
                { label: 'Topik', value: selected.topik },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: '12px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 500 }}>{value}</p>
                </div>
              ))}
              <div>
                <p style={{ fontSize: '12px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Ringkasan
                </p>
                <p style={{ fontSize: '14px', color: '#333', lineHeight: 1.6, background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                  {selected.ringkasan}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '12px',
                borderRadius: '999px',
                background: '#1e6b1e',
                color: 'white',
                border: 'none',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
