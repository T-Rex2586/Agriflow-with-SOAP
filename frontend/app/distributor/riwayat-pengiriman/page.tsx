'use client'

import { useState, useRef, useEffect } from 'react'
import Sidebar from '@/components/distributor/SideBar'
import TopBar from '@/components/layout/TopBar'
import { Search, SlidersHorizontal, Calendar, X } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { api } from '@/lib/api'
import { formatStock } from '@/lib/format'

interface PengirimanItem {
  kirimanId: string
  jenisPupuk: string
  jumlahDikirim: number
  jumlahDiterima: number | null
  timestampDikirim: string
  timestampDiterima: string | null
  status: string
  pengecer: { nama: string; email: string }
}

interface ShipmentSummary {
  totalDistributed: number
  totalMismatch: number
}

type Status = 'Semua' | 'Diterima' | 'Dikirim' | 'Tidak Sesuai'

function formatDisplay(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function RiwayatPengirimanPage() {
  const [pengirimanData, setPengirimanData] = useState<PengirimanItem[]>([])
  const [summary, setSummary] = useState<ShipmentSummary>({ totalDistributed: 0, totalMismatch: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch]     = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter popup
  const [showFilter, setShowFilter] = useState(false)
  const [startIso, setStartIso]   = useState('')
  const [endIso, setEndIso]       = useState('')
  const [statusFilter, setStatusFilter] = useState<Status>('Semua')
  
  // applied
  const [appliedStart, setAppliedStart]   = useState('')
  const [appliedEnd, setAppliedEnd]       = useState('')
  const [appliedStatus, setAppliedStatus] = useState<Status>('Semua')

  const popupRef      = useRef<HTMLDivElement>(null)
  const startInputRef = useRef<HTMLInputElement>(null)
  const endInputRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node))
        setShowFilter(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  useEffect(() => {
    api.get<{ summary: ShipmentSummary; shipments: PengirimanItem[] }>('/api/distributor/pengiriman/history')
      .then(res => {
        if (res.data) {
          setPengirimanData(res.data.shipments ?? [])
          setSummary(res.data.summary ?? { totalDistributed: 0, totalMismatch: 0 })
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const statusLabel = (s: string): Status => {
    if (s === 'Diterima' || s === 'Sesuai') return 'Diterima'
    if (s === 'Dikirim') return 'Dikirim'
    if (s === 'Tidak Sesuai') return 'Tidak Sesuai'
    return 'Semua'
  }

  const filtered = pengirimanData.filter(row => {
    const matchSearch = row.jenisPupuk.toLowerCase().includes(search.toLowerCase())
    const rowTs = row.timestampDikirim ? new Date(row.timestampDikirim).getTime() : null
    const matchStart = appliedStart ? (rowTs !== null && rowTs >= new Date(appliedStart).getTime()) : true
    const matchEnd   = appliedEnd   ? (rowTs !== null && rowTs <= new Date(appliedEnd + 'T23:59:59').getTime()) : true
    const rowStatus: Status = statusLabel(row.status)
    const matchStatus = appliedStatus === 'Semua' || rowStatus === appliedStatus
    return matchSearch && matchStart && matchEnd && matchStatus
  })

  const totalPengiriman  = summary.totalDistributed
  const totalTidakSesuai = summary.totalMismatch
  const isFilterActive   = appliedStart || appliedEnd || appliedStatus !== 'Semua'

  const pageSize = 6
  const totalPages = Math.ceil(filtered.length / pageSize)
  const displayed = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar />

        <main style={{ flex: 1, padding: '32px 36px' }}>
          
          {/* Header row: Kiri (Judul + Search) & Kanan (Stat Cards) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            
            {/* Bagian Kiri: Judul dan Search Bar dirapatkan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: '#1a1a1a', letterSpacing: '-0.02em', margin: 0 }}>
                Riwayat Pengiriman
              </h1>
              
              {/* Search + filter (Kini menempel di bawah judul) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '15px', color: '#333' }}>Jenis Pupuk :</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                  placeholder="Semua Jenis"
                  style={{ padding: '9px 16px', borderRadius: '10px', border: '1.5px solid #ddd', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none', width: '200px', background: 'white' }}
                />
                <button style={{ width: 38, height: 38, border: '1.5px solid #ddd', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Search size={16} color="#555" />
                </button>

                {/* Filter button + popup */}
                <div style={{ position: 'relative' }} ref={popupRef}>
                  <button
                    onClick={() => setShowFilter(v => !v)}
                    style={{ width: 38, height: 38, border: `1.5px solid ${isFilterActive ? '#1e6b1e' : '#ddd'}`, borderRadius: '10px', background: isFilterActive ? '#f0f9f0' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <SlidersHorizontal size={16} color={isFilterActive ? '#1e6b1e' : '#555'} />
                  </button>

                  {showFilter && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 100, background: 'white', border: '1.5px solid #e5e5e5', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '20px 20px 16px', width: '320px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>Filter</span>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }} onClick={() => setShowFilter(false)}>
                          <X size={18} color="#888" />
                        </button>
                      </div>

                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Sesuaikan Rentang Data</p>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <div
                            onClick={() => startInputRef.current?.showPicker()}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px',
                                border: `1.5px solid ${startIso ? '#1e6b1e' : '#ddd'}`, background: startIso ? '#f0f9f0' : 'white',
                                color: startIso ? '#1e6b1e' : '#555', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
                                cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', position: 'relative'
                            }}
                        >
                          {startIso ? formatDisplay(startIso) : 'Start Date'}
                            <Calendar size={14} color={startIso ? '#1e6b1e' : '#888'} />
                            <input
                                ref={startInputRef} type="date" value={startIso} onChange={e => setStartIso(e.target.value)}
                                style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                            />
                        </div>
                        <div
                        onClick={() => endInputRef.current?.showPicker()}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px',
                            border: `1.5px solid ${endIso ? '#1e6b1e' : '#ddd'}`, background: endIso ? '#f0f9f0' : 'white',
                            color: endIso ? '#1e6b1e' : '#555', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
                            cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', position: 'relative'
                        }}
                        >
                          {endIso ? formatDisplay(endIso) : 'End Date'}
                            <Calendar size={14} color={endIso ? '#1e6b1e' : '#888'} />
                            <input
                                ref={endInputRef} type="date" value={endIso} onChange={e => setEndIso(e.target.value)}
                                style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                            />
                        </div>
                      </div>

                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Status Pengiriman</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {(['Semua', 'Diterima', 'Dikirim'] as Status[]).map(s => (
                            <button
                              key={s}
                              onClick={() => setStatusFilter(s)}
                              style={{
                                padding: '7px 16px', borderRadius: '999px', border: `1.5px solid ${statusFilter === s ? '#1e6b1e' : '#ddd'}`,
                                background: statusFilter === s ? '#1e6b1e' : 'white', color: statusFilter === s ? 'white' : '#555',
                                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                              }}
                            >{s}</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {(['Tidak Sesuai'] as Status[]).map(s => (
                            <button
                              key={s}
                              onClick={() => setStatusFilter(s)}
                              style={{
                                padding: '7px 16px', borderRadius: '999px', border: `1.5px solid ${statusFilter === s ? '#1e6b1e' : '#ddd'}`,
                                background: statusFilter === s ? '#1e6b1e' : 'white', color: statusFilter === s ? 'white' : '#555',
                                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                              }}
                            >{s}</button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => { setStartIso(''); setEndIso(''); setStatusFilter('Semua'); setAppliedStart(''); setAppliedEnd(''); setAppliedStatus('Semua') }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#555', fontFamily: 'var(--font-display)', fontWeight: 500 }}
                        >Reset</button>
                        <button onClick={() => { setAppliedStart(startIso); setAppliedEnd(endIso); setAppliedStatus(statusFilter); setShowFilter(false); setCurrentPage(1) }}
                          style={{ padding: '8px 24px', borderRadius: '10px', background: '#1e6b1e', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}
                        >Terapkan</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bagian Kanan: Stat cards */}
            <div style={{ display: 'flex', gap: '16px' }}>
              {[
                { label: 'Total Pengiriman (Ton)',  value: totalPengiriman },
                { label: 'Pengiriman Tidak Sesuai', value: totalTidakSesuai },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'white', border: '1.5px solid #eee', borderRadius: '16px', padding: '16px 28px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minWidth: '160px' }}>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '40px', color: '#1a1a1a', lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1.2fr 1.2fr 120px 120px 140px 140px 130px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0' }}>
              {['ID Kiriman', 'Pengecer', 'Jenis Pupuk', 'Dikirim', 'Diterima', 'Tgl Kirim', 'Tgl Terima', 'Status'].map(h => (
                <span key={h} style={{ fontSize: '13px', color: '#888', fontWeight: 600, textAlign: 'center' }}>{h}</span>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Memuat...</div>
            ) : error ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#c53030', fontSize: '14px' }}>{error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Tidak ada data yang cocok.</div>
            ) : (
              displayed.map((row, i) => {
                const bgColor = row.status === 'Diterima' || row.status === 'Sesuai' ? '#72A94F'
                  : row.status === 'Dikirim' ? '#E6A817'
                  : '#BA1A1A'
                return (
                  <div key={row.kirimanId || i} style={{ display: 'grid', gridTemplateColumns: '120px 1.2fr 1.2fr 120px 120px 140px 140px 130px', padding: '16px 24px', background: i % 2 === 0 ? '#fafafa' : 'white', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#555', textAlign: 'center' }}>{row.kirimanId?.slice(0, 8) || '-'}</span>
                    <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{row.pengecer?.nama || '-'}</span>
                    <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{row.jenisPupuk}</span>
                    <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{formatStock(row.jumlahDikirim)}</span>
                    <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{row.jumlahDiterima != null ? formatStock(row.jumlahDiterima) : '-'}</span>
                    <span style={{ fontSize: '13px', color: '#555', textAlign: 'center' }}>
                      {row.timestampDikirim ? new Date(row.timestampDikirim).toLocaleDateString('id-ID') : '-'}
                    </span>
                    <span style={{ fontSize: '13px', color: '#555', textAlign: 'center' }}>
                      {row.timestampDiterima ? new Date(row.timestampDiterima).toLocaleDateString('id-ID') : '-'}
                    </span>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '5px 0', borderRadius: '999px', background: bgColor, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px', width: '100px', textAlign: 'center' }}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </main>
      </div>
    </div>
  )
}