'use client'

import { useState, useRef, useEffect } from 'react'
import Sidebar from '@/components/pengecer/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { Search, ArrowUpDown, Plus, X } from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'
import { api } from '@/lib/api'
import { formatStock } from '@/lib/format'

interface StokItem {
  pupukId: number
  jenisPupuk: string
  jumlahStok: number
  lastUpdated: string
}

interface StockData { totalStockTon: number; stockItems: StokItem[] }

type SortOrder = 'asc' | 'desc' | null

export default function ManajemenStokPage() {
  const [stokItems, setStokItems] = useState<StokItem[]>([])
  const [totalTon, setTotalTon] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch]         = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Sort popup
  const [showSort, setShowSort]           = useState(false)
  // order per kategori (independent)
  const [jumlahOrder, setJumlahOrder]     = useState<SortOrder>(null)
  const [tanggalOrder, setTanggalOrder]   = useState<SortOrder>(null)
  // applied
  const [appliedJumlahOrder, setAppliedJumlahOrder]   = useState<SortOrder>(null)
  const [appliedTanggalOrder, setAppliedTanggalOrder] = useState<SortOrder>(null)
  // dummy compat
  const appliedSortBy = appliedJumlahOrder || appliedTanggalOrder ? 'jumlah' : null

  const popupRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowSort(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    api.get<StockData>('/api/pengecer/stok')
      .then(res => {
        if (res.data) {
          setStokItems(res.data.stockItems ?? [])
          setTotalTon(res.data.totalStockTon ?? 0)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Filter + sort
  let filtered = stokItems.filter(s =>
    s.jenisPupuk.toLowerCase().includes(search.toLowerCase())
  )
  if (appliedJumlahOrder) {
    filtered = [...filtered].sort((a, b) =>
      appliedJumlahOrder === 'asc' ? a.jumlahStok - b.jumlahStok : b.jumlahStok - a.jumlahStok
    )
  }
  if (appliedTanggalOrder) {
    filtered = [...filtered].sort((a, b) =>
      appliedTanggalOrder === 'asc'
        ? new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
        : new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )
  }

  const pageSize = 6
  const totalPages = Math.ceil(filtered.length / pageSize)
  const displayed = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const btnIconStyle = {
    width: 38, height: 38,
    border: '1.5px solid #ddd',
    borderRadius: '10px',
    background: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  } as React.CSSProperties

  const chipStyle = (active: boolean) => ({
    padding: '7px 18px',
    borderRadius: '999px',
    border: `1.5px solid ${active ? '#1e6b1e' : '#ddd'}`,
    background: active ? '#f0f9f0' : 'white',
    color: active ? '#1e6b1e' : '#555',
    fontFamily: 'var(--font-display)',
    fontWeight: active ? 700 : 500,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar notifCount={2} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar />

        <main style={{ flex: 1, padding: '32px 36px' }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px',
                color: '#1a1a1a', marginBottom: '16px', letterSpacing: '-0.02em',
              }}>
                Manajemen Stok
              </h1>

              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '15px', color: '#333' }}>
                  Jenis Pupuk :
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                  placeholder="Semua Jenis"
                  style={{
                    padding: '9px 16px', borderRadius: '10px', border: '1.5px solid #ddd',
                    fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none',
                    width: '200px', background: 'white',
                  }}
                />

                {/* Search icon — sudah realtime, ini decorative */}
                <button style={btnIconStyle}>
                  <Search size={16} color="#555" />
                </button>

                {/* Sort / Urutkan */}
                <div style={{ position: 'relative' }} ref={popupRef}>
                  <button
                    style={{ ...btnIconStyle, borderColor: appliedSortBy ? '#1e6b1e' : '#ddd', background: appliedSortBy ? '#f0f9f0' : 'white' }}
                    onClick={() => setShowSort(v => !v)}
                  >
                    <ArrowUpDown size={16} color={appliedSortBy ? '#1e6b1e' : '#555'} />
                  </button>

                  {/* Popup */}
                  {showSort && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        zIndex: 100,
                        background: 'white',
                        border: '1.5px solid #e5e5e5',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        padding: '20px 20px 16px',
                        width: '280px',
                      }}
                    >
                      {/* Popup header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: '#1a1a1a' }}>
                          Urutkan
                        </span>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                          onClick={() => setShowSort(false)}>
                          <X size={18} color="#888" />
                        </button>
                      </div>

                      {/* Jumlah Stok */}
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                        Jumlah Stok
                      </p>
                      <div style={{ display: 'flex', gap: '0', marginBottom: '16px', border: '1.5px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
                        <button
                          onClick={() => setJumlahOrder(jumlahOrder === 'asc' ? null : 'asc')}
                          style={{ flex: 1, padding: '8px 0', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', border: 'none', borderRight: '1px solid #ddd', background: jumlahOrder === 'asc' ? '#1e6b1e' : 'white', color: jumlahOrder === 'asc' ? 'white' : '#555', transition: 'all 0.15s' }}
                        >Ascending</button>
                        <button
                          onClick={() => setJumlahOrder(jumlahOrder === 'desc' ? null : 'desc')}
                          style={{ flex: 1, padding: '8px 0', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', border: 'none', background: jumlahOrder === 'desc' ? '#1e6b1e' : 'white', color: jumlahOrder === 'desc' ? 'white' : '#555', transition: 'all 0.15s' }}
                        >Descending</button>
                      </div>

                      {/* Tanggal Diperbarui */}
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                        Tanggal Diperbarui
                      </p>
                      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1.5px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
                        <button
                          onClick={() => setTanggalOrder(tanggalOrder === 'asc' ? null : 'asc')}
                          style={{ flex: 1, padding: '8px 0', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', border: 'none', borderRight: '1px solid #ddd', background: tanggalOrder === 'asc' ? '#1e6b1e' : 'white', color: tanggalOrder === 'asc' ? 'white' : '#555', transition: 'all 0.15s' }}
                        >Ascending</button>
                        <button
                          onClick={() => setTanggalOrder(tanggalOrder === 'desc' ? null : 'desc')}
                          style={{ flex: 1, padding: '8px 0', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', border: 'none', background: tanggalOrder === 'desc' ? '#1e6b1e' : 'white', color: tanggalOrder === 'desc' ? 'white' : '#555', transition: 'all 0.15s' }}
                        >Descending</button>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          onClick={() => {
                            setJumlahOrder(null); setTanggalOrder(null)
                            setAppliedJumlahOrder(null); setAppliedTanggalOrder(null)
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#555', fontFamily: 'var(--font-display)', fontWeight: 500 }}
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => {
                            setAppliedJumlahOrder(jumlahOrder)
                            setAppliedTanggalOrder(tanggalOrder)
                            setShowSort(false)
                          }}
                          style={{ padding: '8px 24px', borderRadius: '10px', background: '#1e6b1e', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* + Terima Stok */}
                <Link href="/pengecer/terima-stok" style={{ ...btnIconStyle, textDecoration: 'none', color: 'inherit' }}>
                  <Plus size={16} color="#555" />
                </Link>
              </div>
            </div>

            {/* Total stok card */}
            <div style={{
              background: 'white', border: '1.5px solid #eee', borderRadius: '16px',
              padding: '20px 32px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minWidth: '180px',
            }}>
              <p style={{ fontSize: '14px', color: '#555', fontWeight: 600, marginBottom: '8px' }}>Total Stok (Ton)</p>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '48px', color: '#1a1a1a', lineHeight: 1 }}>
                {totalTon}
              </p>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 160px 160px 160px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0' }}>
              {['ID Pupuk', 'Jenis Pupuk', 'Jumlah Pupuk', 'Diperbarui', 'Riwayat Penerimaan'].map(h => (
                <span key={h} style={{ fontSize: '14px', color: '#888', fontWeight: 500, textAlign: 'center' }}>{h}</span>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Memuat...</div>
            ) : error ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#c53030', fontSize: '14px' }}>{error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Tidak ada data.</div>
            ) : (
              displayed.map((row, i) => (
                <div key={row.pupukId} style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 160px 160px 160px',
                  padding: '16px 24px', background: i % 2 === 0 ? '#fafafa' : 'white', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '15px', color: '#333', textAlign: 'center', fontWeight: 500 }}>{row.pupukId}</span>
                  <span style={{ fontSize: '15px', color: '#333', textAlign: 'center' }}>{row.jenisPupuk}</span>
                  <span style={{ fontSize: '15px', color: '#333', textAlign: 'center' }}>{formatStock(row.jumlahStok)}</span>
                  <span style={{ fontSize: '15px', color: '#333', textAlign: 'center' }}>{row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString('id-ID') : '-'}</span>
                  <div style={{ textAlign: 'center' }}>
                    <Link href={`/pengecer/manajemen-stok/${row.pupukId}`} style={{ fontSize: '14px', color: '#1e6b1e', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                      Lihat
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>

        </main>
      </div>
    </div>
  )
}