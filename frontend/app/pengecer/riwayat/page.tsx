'use client'

import { useState, useRef, useEffect } from 'react'
import Sidebar from '@/components/pengecer/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { Search, SlidersHorizontal, Calendar, X } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { api } from '@/lib/api'
import { formatStock } from '@/lib/format'

interface RiwayatItem {
  KirimanId?: string; kirimanId?: string
  PenebusanId?: string; penebusanId?: string; tebusanId?: string
  JenisPupuk?: string; jenisPupuk?: string
  JumlahDikirim?: number; jumlahDikirim?: number
  Jumlah?: number; jumlah?: number
  TimestampDikirim?: string; timestampDikirim?: string
  TimestampPenebusan?: string; timestampPenebusan?: string
  Status?: string; status?: string
}

interface RiwayatData {
  summary: { totalDistributed?: number; totalMismatch?: number; totalPenerimaan?: number; penerimaanTidakSesuai?: number; totalPenebusan?: number; totalJumlah?: number }
  receipts?: RiwayatItem[]
  redemptions?: RiwayatItem[]
}

type Tab    = 'penerimaan' | 'penebusan'
type Status = 'Semua' | 'Diterima' | 'Dikirim' | 'Tidak Sesuai' | 'Berhasil'

function formatDisplay(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function RiwayatPage() {
  const [tab, setTab]           = useState<Tab>('penerimaan')
  const [search, setSearch]     = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [data, setData] = useState<RiwayatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filter popup
  const [showFilter, setShowFilter] = useState(false)
  const [startIso, setStartIso]   = useState('')
  const [endIso, setEndIso]       = useState('')
  const [statusFilter, setStatusFilter] = useState<Status>('Semua')
  const [appliedStart, setAppliedStart]   = useState('')
  const [appliedEnd, setAppliedEnd]       = useState('')
  const [appliedStatus, setAppliedStatus] = useState<Status>('Semua')

  const popupRef  = useRef<HTMLDivElement>(null)
  const startInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node))
        setShowFilter(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  useEffect(() => {
    setLoading(true)
    const endpoint = tab === 'penerimaan' ? '/api/pengecer/penerimaan/history' : '/api/pengecer/penebusan/history'
    api.get<RiwayatData>(endpoint)
      .then(res => { if (res.data) setData(res.data) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [tab])

  // ── Compute filtered data ──────────────────────────────────────────────────
  const raw: RiwayatItem[] = tab === 'penerimaan'
    ? (data?.receipts ?? [])
    : (data?.redemptions ?? [])

  const getStatus = (item: RiwayatItem, currentTab: string): string => {
    const s = item.Status || item.status || ''
    if (currentTab === 'penebusan') return s || 'Berhasil'
    if (s === 'Diterima' || s === 'Sesuai' || s === 'Berhasil') return 'Diterima'
    if (s === 'Dikirim') return 'Dikirim'
    if (s === 'Tidak Sesuai') return 'Tidak Sesuai'
    return s || 'Diterima'
  }

  const filtered = raw.filter(row => {
    const jenisNya = row.JenisPupuk || row.jenisPupuk || ''
    const matchSearch = jenisNya.toLowerCase().includes(search.toLowerCase())
    const timestampStr = row.TimestampDikirim || row.timestampDikirim || row.TimestampPenebusan || row.timestampPenebusan || ''
    const rowTs = timestampStr ? new Date(timestampStr).getTime() : null
    const matchStart = appliedStart ? (rowTs !== null && rowTs >= new Date(appliedStart).getTime()) : true
    const matchEnd   = appliedEnd   ? (rowTs !== null && rowTs <= new Date(appliedEnd + 'T23:59:59').getTime()) : true
    const statusVal = getStatus(row, tab)
    const matchStatus = appliedStatus === 'Semua'
      || appliedStatus === statusVal
      || (appliedStatus === 'Diterima' && statusVal === 'Diterima')
    return matchSearch && matchStart && matchEnd && matchStatus
  })

  const summaryNya = data?.summary || {}
  const totalStok = summaryNya.totalDistributed ?? summaryNya.totalPenerimaan ?? summaryNya.totalPenebusan ?? summaryNya.totalJumlah ?? 0
  const totalTidakSesuai = summaryNya.totalMismatch ?? summaryNya.penerimaanTidakSesuai ?? 0
  const isFilterActive  = appliedStart || appliedEnd || appliedStatus !== 'Semua'

  const statCards = tab === 'penerimaan'
    ? [
        { label: 'Total Penerimaan', value: formatStock(totalStok) },
        { label: 'Penerimaan Tidak Sesuai', value: String(totalTidakSesuai) },
      ]
    : [
        { label: 'Jumlah Penebusan', value: formatStock(summaryNya.totalPenebusan ?? 0) },
      ]

  const pageSize = 5
  const totalPages = Math.ceil(filtered.length / pageSize)
  const displayed = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // ── Styles ─────────────────────────────────────────────────────────────────
  const tabBtn = (active: boolean) => ({
    flex: 1,
    padding: '10px 0',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '10px',
    background: active ? 'white' : 'transparent',
    color: active ? '#1a1a1a' : '#888',
    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.2s',
  } as React.CSSProperties)

  const statusChip = (val: Status) => ({
    flex: 1,
    padding: '8px 0',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: statusFilter === val ? '#1e6b1e' : 'white',
    color: statusFilter === val ? 'white' : '#555',
    transition: 'all 0.15s',
  } as React.CSSProperties)

  const dateFieldStyle = {
    flex: 1,
    padding: '9px 40px 9px 12px',
    borderRadius: '10px',
    border: '1.5px solid #ddd',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    background: 'white',
    color: '#1a1a1a',
    cursor: 'default',
  } as React.CSSProperties

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar notifCount={2} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar />

        <main style={{ flex: 1, padding: '32px 36px' }}>

          {/* Header row: kiri (judul+tab+search) | kanan (stat cards) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>

            {/* Kiri */}
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: '12px' }}>
                Riwayat Transaksi
              </h1>

              {/* Tab: Penerimaan / Penebusan */}
              <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: '12px', padding: '4px', width: '320px' }}>
                <button style={tabBtn(tab === 'penerimaan')} onClick={() => { setTab('penerimaan'); setCurrentPage(1) }}>Penerimaan</button>
                <button style={tabBtn(tab === 'penebusan')}  onClick={() => { setTab('penebusan');  setCurrentPage(1) }}>Penebusan</button>
              </div>
            </div>

            {/* Kanan: stat cards */}
            <div style={{ display: 'flex', gap: '16px' }}>
              {statCards.map(({ label, value }) => (
                <div key={label} style={{ background: 'white', border: '1.5px solid #eee', borderRadius: '16px', padding: '16px 28px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minWidth: '160px' }}>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '40px', color: '#1a1a1a', lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Search + filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
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

                  {/* Popup header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>Filter</span>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }} onClick={() => setShowFilter(false)}>
                      <X size={18} color="#888" />
                    </button>
                  </div>

                  {/* Sesuaikan Rentang Data */}
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                    Sesuaikan Rentang Data
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {/* Start Date*/}
                    <div
                        onClick={() => startInputRef.current?.showPicker()}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px', borderRadius: '999px',
                            border: `1.5px solid ${startIso ? '#1e6b1e' : '#ddd'}`,
                            background: startIso ? '#f0f9f0' : 'white',
                            color: startIso ? '#1e6b1e' : '#555',
                            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
                            cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
                        }}
                    >
                      {startIso ? formatDisplay(startIso) : 'Start Date'}
                        <Calendar size={14} color={startIso ? '#1e6b1e' : '#888'} />
                        <input
                            ref={startInputRef}
                            type="date"
                            value={startIso}
                            onChange={e => setStartIso(e.target.value)}
                            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                        />
                    </div>

                    {/* End Date */}
                    <div
                    onClick={() => endInputRef.current?.showPicker()}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '7px 14px', borderRadius: '999px',
                        border: `1.5px solid ${endIso ? '#1e6b1e' : '#ddd'}`,
                        background: endIso ? '#f0f9f0' : 'white',
                        color: endIso ? '#1e6b1e' : '#555',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
                        cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
                    }}
                    >
                      {endIso ? formatDisplay(endIso) : 'End Date'}
                        <Calendar size={14} color={endIso ? '#1e6b1e' : '#888'} />
                        <input
                            ref={endInputRef}
                            type="date"
                            value={endIso}
                            onChange={e => setEndIso(e.target.value)}
                            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                        />
                    </div>
                  </div>

                  {/* Status Penerimaan / Penebusan */}
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                    Status {tab === 'penebusan' ? 'Penebusan' : 'Penerimaan'}
                  </p>
                  {tab === 'penebusan' ? (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                      {(['Semua', 'Berhasil'] as Status[]).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                          style={{
                            padding: '7px 16px', borderRadius: '999px',
                            border: `1.5px solid ${statusFilter === s ? '#1e6b1e' : '#ddd'}`,
                            background: statusFilter === s ? '#1e6b1e' : 'white',
                            color: statusFilter === s ? 'white' : '#555',
                            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(['Semua', 'Diterima', 'Dikirim'] as Status[]).map(s => (
                          <button key={s} onClick={() => setStatusFilter(s)}
                            style={{
                              padding: '7px 16px', borderRadius: '999px',
                              border: `1.5px solid ${statusFilter === s ? '#1e6b1e' : '#ddd'}`,
                              background: statusFilter === s ? '#1e6b1e' : 'white',
                              color: statusFilter === s ? 'white' : '#555',
                              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >{s}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(['Tidak Sesuai'] as Status[]).map(s => (
                          <button key={s} onClick={() => setStatusFilter(s)}
                            style={{
                              padding: '7px 16px', borderRadius: '999px',
                              border: `1.5px solid ${statusFilter === s ? '#1e6b1e' : '#ddd'}`,
                              background: statusFilter === s ? '#1e6b1e' : 'white',
                              color: statusFilter === s ? 'white' : '#555',
                              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        setStartIso(''); setEndIso(''); setStatusFilter('Semua')
                        setAppliedStart(''); setAppliedEnd(''); setAppliedStatus('Semua')
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#555', fontFamily: 'var(--font-display)', fontWeight: 500 }}
                    >Reset</button>
                    <button
                      onClick={() => {
                        setAppliedStart(startIso); setAppliedEnd(endIso); setAppliedStatus(statusFilter)
                        setShowFilter(false); setCurrentPage(1)
                      }}
                      style={{ padding: '8px 24px', borderRadius: '10px', background: '#1e6b1e', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}
                    >Terapkan</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          {(() => {
            if (tab === 'penerimaan') {
              return (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1.2fr 1.2fr 120px 120px 140px 140px 130px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0' }}>
                    {['ID Kiriman', 'Distributor', 'Jenis Pupuk', 'Dikirim', 'Diterima', 'Tgl Kirim', 'Tgl Terima', 'Status'].map(h => (
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
                      const idStr = row.KirimanId || row.kirimanId || '-'
                      const jenisNya = row.JenisPupuk || row.jenisPupuk || '-'
                      const jumlahDikirim = row.JumlahDikirim ?? row.jumlahDikirim ?? 0
                      const jumlahDiterima = (row as any).jumlahDiterima ?? null
                      const tsKirim = row.TimestampDikirim || row.timestampDikirim || ''
                      const tsTerima = (row as any).timestampDiterima || ''
                      const statusNya = getStatus(row, tab)
                      const statusBg = statusNya === 'Dikirim' ? '#eab308' : statusNya === 'Tidak Sesuai' ? '#dc2626' : '#16a34a'

                      return (
                        <div key={`${idStr}-${i}`} style={{ display: 'grid', gridTemplateColumns: '120px 1.2fr 1.2fr 120px 120px 140px 140px 130px', padding: '16px 24px', background: i % 2 === 0 ? '#fafafa' : 'white', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', color: '#555', textAlign: 'center' }}>{idStr.slice(0, 8)}</span>
                          <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{(row as any).distributor || '-'}</span>
                          <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{jenisNya}</span>
                          <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{formatStock(jumlahDikirim)}</span>
                          <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{jumlahDiterima != null ? formatStock(jumlahDiterima) : '-'}</span>
                          <span style={{ fontSize: '13px', color: '#555', textAlign: 'center' }}>{tsKirim ? new Date(tsKirim).toLocaleDateString('id-ID') : '-'}</span>
                          <span style={{ fontSize: '13px', color: '#555', textAlign: 'center' }}>{tsTerima ? new Date(tsTerima).toLocaleDateString('id-ID') : '-'}</span>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ padding: '5px 0', borderRadius: '999px', display: 'inline-block', width: '100px', textAlign: 'center', background: statusBg, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px' }}>
                              {statusNya}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )
            } else {
              return (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1.5fr 1.5fr 160px 160px 160px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0' }}>
                    {['ID Penebusan', 'Petani', 'Jenis Pupuk', 'Jumlah', 'Tgl Penebusan', 'Status'].map(h => (
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
                      const idStr = row.PenebusanId || row.penebusanId || row.tebusanId || '-'
                      const jenisNya = row.JenisPupuk || row.jenisPupuk || '-'
                      const jumlahNya = row.Jumlah ?? row.jumlah ?? 0
                      const tsTebus = row.TimestampPenebusan || row.timestampPenebusan || ''
                      const statusNya = getStatus(row, tab)
                      const statusBg = statusNya === 'Dikirim' ? '#eab308' : statusNya === 'Tidak Sesuai' ? '#dc2626' : '#16a34a'
                      const petaniRaw = (row as any).Petani ?? (row as any).petani ?? null
                      const petaniNama = typeof petaniRaw === 'string'
                        ? petaniRaw
                        : petaniRaw
                          ? [petaniRaw.FirstName, petaniRaw.MiddleName, petaniRaw.LastName].filter(Boolean).join(' ')
                          : '-'

                      return (
                        <div key={`${idStr}-${i}`} style={{ display: 'grid', gridTemplateColumns: '160px 1.5fr 1.5fr 160px 160px 160px', padding: '16px 24px', background: i % 2 === 0 ? '#fafafa' : 'white', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', color: '#555', textAlign: 'center' }}>{idStr.slice(0, 8)}</span>
                          <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{petaniNama}</span>
                          <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{jenisNya}</span>
                          <span style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>{formatStock(jumlahNya)}</span>
                          <span style={{ fontSize: '13px', color: '#555', textAlign: 'center' }}>{tsTebus ? new Date(tsTebus).toLocaleDateString('id-ID') : '-'}</span>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ padding: '5px 0', borderRadius: '999px', display: 'inline-block', width: '100px', textAlign: 'center', background: statusBg, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px' }}>
                              {statusNya}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )
            }
          })()}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>

        </main>
      </div>
    </div>
  )
}