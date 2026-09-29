'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/distributor/SideBar'
import TopBar from '@/components/layout/TopBar'
import { Search, ArrowUpDown, Plus, X } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { api } from '@/lib/api'
import { formatStock } from '@/lib/format'

interface StokItem {
  pupukId: number
  jenisPupuk: string
  jumlah: number
  lastUpdated: string
}

type SortOrder = 'asc' | 'desc' | null

export default function ManajemenStokDistributorPage() {
  const [stokData, setStokData] = useState<StokItem[]>([])
  const [totalTon, setTotalTon] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch]         = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Sort popup
  const [showSort, setShowSort]           = useState(false)
  const [jumlahOrder, setJumlahOrder]     = useState<SortOrder>(null)
  const [tanggalOrder, setTanggalOrder]   = useState<SortOrder>(null)
  const [appliedJumlahOrder, setAppliedJumlahOrder]   = useState<SortOrder>(null)
  const [appliedTanggalOrder, setAppliedTanggalOrder] = useState<SortOrder>(null)
  const appliedSortBy = appliedJumlahOrder || appliedTanggalOrder ? 'jumlah' : null

  // Add Stock modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [fertilizers, setFertilizers] = useState<{ pupukId: number; jenisPupuk: string }[]>([])
  const [addPupukQuery, setAddPupukQuery] = useState('')
  const [addPupukId, setAddPupukId] = useState<number | null>(null)
  const [showPupukDropdown, setShowPupukDropdown] = useState(false)
  const addPupukRef = useRef<HTMLDivElement>(null)
  const [addJumlah, setAddJumlah] = useState('')
  const [addingStock, setAddingStock] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit Stock modal
  const [editingStock, setEditingStock] = useState<StokItem | null>(null)
  const [editJumlah, setEditJumlah] = useState('')
  const [editDateText, setEditDateText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)

  const popupRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowSort(false)
      }
      if (addPupukRef.current && !addPupukRef.current.contains(e.target as Node)) {
        setShowPupukDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    api.get<{ totalStockTon: number; stockItems: StokItem[] }>('/api/distributor/stok')
      .then(res => {
        if (res.data) {
          setStokData(res.data.stockItems ?? [])
          setTotalTon(res.data.totalStockTon ?? 0)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    api.get<{ pupukId: number; jenisPupuk: string }[]>('/api/pupuk')
      .then(res => {
        if (!cancelled && res.data) {
          setFertilizers(res.data)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])



  // Filter + sort (client-side)
  let filtered = stokData.filter(s =>
    s.jenisPupuk.toLowerCase().includes(search.toLowerCase())
  )
  const toDate = (s: string) => {
    if (!s) return 0
    const d = new Date(s)
    return d.getTime()
  }
  if (appliedJumlahOrder) {
    filtered = [...filtered].sort((a, b) =>
      appliedJumlahOrder === 'asc' ? a.jumlah - b.jumlah : b.jumlah - a.jumlah
    )
  }
  if (appliedTanggalOrder) {
    filtered = [...filtered].sort((a, b) =>
      appliedTanggalOrder === 'asc'
        ? toDate(a.lastUpdated) - toDate(b.lastUpdated)
        : toDate(b.lastUpdated) - toDate(a.lastUpdated)
    )
  }

  const pageSize = 6
  const totalPages = Math.ceil(filtered.length / pageSize)
  const displayed = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const parseDDMMYYYY = (s: string) => {
    const parts = s.split('/')
    if (parts.length !== 3) return null
    const d = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const y = parseInt(parts[2], 10)
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null
    return new Date(y, m, d)
  }

  const formatToDDMMYYYY = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const date = new Date(e.target.value + 'T00:00:00')
      setEditDateText(formatToDDMMYYYY(date))
    }
  }

  const btnIconStyle = {
    width: 38, height: 38,
    border: '1.5px solid #ddd',
    borderRadius: '10px',
    background: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  } as React.CSSProperties

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* TopBar Dinamis */}
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

                {/* Search icon */}
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

                  {/* Popup Sort */}
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

                {/* + Tambah Stok */}
                <button onClick={() => {
                  setAddPupukQuery('')
                  setAddPupukId(null)
                  setAddJumlah('')
                  setAddError('')
                  setShowAddModal(true)
                }} style={btnIconStyle}>
                  <Plus size={16} color="#555" />
                </button>
              </div>
            </div>

            {/* Total stok card */}
            <div style={{
              background: 'white', border: '1.5px solid #eee', borderRadius: '16px',
              padding: '20px 32px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minWidth: '180px',
            }}>
              <p style={{ fontSize: '14px', color: '#555', fontWeight: 600, marginBottom: '8px' }}>Total Stok</p>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '48px', color: '#1a1a1a', lineHeight: 1 }}>
                {totalTon >= 1000 ? (totalTon / 1000).toFixed(2) + ' Ton' : totalTon.toFixed(2) + ' Kg'}
              </p>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            
            {/* Header Tabel */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 160px 160px 80px 80px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0' }}>
              {['ID Pupuk', 'Jenis Pupuk', 'Jumlah Pupuk', 'Diperbarui', 'Lihat', 'Update'].map(h => (
                <span key={h} style={{ fontSize: '14px', color: '#888', fontWeight: 500, textAlign: 'center' }}>{h}</span>
              ))}
            </div>
            
            {/* Isi Tabel */}
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Memuat...</div>
            ) : error ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#c53030', fontSize: '14px' }}>{error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Tidak ada data stok.</div>
            ) : (
              displayed.map((row, i) => (
                <div key={row.pupukId} style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 160px 160px 80px 80px',
                  padding: '16px 24px', background: i % 2 === 0 ? '#fafafa' : 'white', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '15px', color: '#333', textAlign: 'center', fontWeight: 500 }}>{row.pupukId}</span>
                  <span style={{ fontSize: '15px', color: '#333', textAlign: 'center' }}>{row.jenisPupuk}</span>
                  <span style={{ fontSize: '15px', color: '#333', textAlign: 'center' }}>{formatStock(Number(row.jumlah))}</span>
                  <span style={{ fontSize: '15px', color: '#333', textAlign: 'center' }}>
                    {row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString('id-ID') : '-'}
                  </span>
                  
                  <div style={{ textAlign: 'center' }}>
                    <Link href={`/distributor/manajemen-stok/${row.pupukId}`} style={{ fontSize: '14px', color: '#1e6b1e', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                      Lihat
                    </Link>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => {
                        const today = new Date()
                        const dd = String(today.getDate()).padStart(2, '0')
                        const mm = String(today.getMonth() + 1).padStart(2, '0')
                        const yyyy = today.getFullYear()
                        setEditingStock(row)
                        setEditJumlah('')
                        setEditDateText(`${dd}/${mm}/${yyyy}`)
                        setEditError('')
                      }}
                      style={{ 
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '14px', color: '#1e6b1e', fontWeight: 600, 
                        textDecoration: 'underline', textUnderlineOffset: '3px' 
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>

          {/* ========== MODAL TAMBAH STOK ========== */}
          {showAddModal && (
            <div
              onClick={() => {
                setAddPupukQuery('')
                setAddPupukId(null)
                setAddJumlah('')
                setAddError('')
                setShowAddModal(false)
              }}
              style={{
                position: 'fixed', inset: 0, zIndex: 999,
                background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'white', borderRadius: '20px', padding: '36px 40px',
                  width: '420px', maxWidth: '94vw', boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', color: '#1a1a1a', margin: 0 }}>
                    Tambah Stok
                  </h2>
                  <button onClick={() => {
                    setAddPupukQuery('')
                    setAddPupukId(null)
                    setAddJumlah('')
                    setAddError('')
                    setShowAddModal(false)
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    <X size={20} color="#888" />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div ref={addPupukRef} style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '6px' }}>
                      Jenis Pupuk
                    </label>
                    <input
                      type="text"
                      value={addPupukQuery}
                      onChange={e => {
                        setAddPupukQuery(e.target.value)
                        setAddPupukId(null)
                        setShowPupukDropdown(true)
                      }}
                      onFocus={() => setShowPupukDropdown(true)}
                      placeholder="Ketik untuk cari jenis pupuk"
                      style={{
                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                        border: '1.5px solid #ddd', fontSize: '14px', fontFamily: 'var(--font-body)',
                        outline: 'none',
                      }}
                    />

                    {showPupukDropdown && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                        background: 'white', border: '1.5px solid #e5e5e5', borderRadius: '10px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto',
                      }}>
                        {(() => {
                          const q = addPupukQuery.toLowerCase().trim()
                          const filtered = q
                            ? fertilizers.filter(f => f.jenisPupuk.toLowerCase().includes(q))
                            : fertilizers
                          if (filtered.length === 0) {
                            return (
                              <div style={{ padding: '10px 14px', fontSize: '14px', color: '#aaa' }}>
                                Tidak ada data pupuk
                              </div>
                            )
                          }

                          return filtered.map(f => (
                            <div
                              key={f.pupukId}
                              onClick={() => {
                                setAddPupukQuery(f.jenisPupuk)
                                setAddPupukId(f.pupukId)
                                setShowPupukDropdown(false)
                              }}
                              style={{
                                padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
                                fontFamily: 'var(--font-body)', color: '#333',
                                borderBottom: '1px solid #f0f0f0',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f5f9f5')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}
                            >
                              {f.jenisPupuk}
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '6px' }}>
                      Jumlah Masuk (Kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addJumlah}
                      onChange={e => setAddJumlah(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                        border: '1.5px solid #ddd', fontSize: '14px', fontFamily: 'var(--font-body)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {addError && (
                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEE2E2', color: '#991B1B', fontSize: '13px' }}>
                      {addError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        setAddPupukQuery('')
                        setAddPupukId(null)
                        setAddJumlah('')
                        setAddError('')
                        setShowAddModal(false)
                      }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #ddd',
                        background: 'white', fontFamily: 'var(--font-display)', fontWeight: 600,
                        fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      Batal
                    </button>
                    <button
                      disabled={addingStock || !addPupukId || !addJumlah || parseFloat(addJumlah) <= 0}
                      onClick={async () => {
                        setAddError('')
                        const amount = parseFloat(addJumlah)
                        if (!amount || amount <= 0) {
                          setAddError('Jumlah harus lebih dari 0')
                          return
                        }
                        if (!addPupukId) {
                          setAddError('Pilih jenis pupuk terlebih dahulu')
                          return
                        }
                        setAddingStock(true)
                        try {
                          await api.post('/api/stock', {
                            pupukId: addPupukId,
                            jumlah: amount,
                          })
                          setShowAddModal(false)
                          setAddPupukQuery('')
                          setAddPupukId(null)
                          setAddJumlah('')
                          // Refresh data
                          const res = await api.get<{ totalStockTon: number; stockItems: StokItem[] }>('/api/distributor/stok')
                          if (res.data) {
                            setStokData(res.data.stockItems ?? [])
                            setTotalTon(res.data.totalStockTon ?? 0)
                          }
                        } catch (err: any) {
                          setAddError(err.message || 'Gagal menambah stok')
                        } finally {
                          setAddingStock(false)
                        }
                      }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                        background: addingStock || !addPupukId || !addJumlah || parseFloat(addJumlah) <= 0 ? '#6B8F6B' : '#1e6b1e',
                        color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700,
                        fontSize: '14px', cursor: addingStock || !addPupukId || !addJumlah || parseFloat(addJumlah) <= 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {addingStock ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== MODAL PERBARUI STOK ========== */}
          {editingStock && (
            <div
              onClick={() => setEditingStock(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 999,
                background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'white', borderRadius: '20px', padding: '36px 40px',
                  width: '420px', maxWidth: '94vw', boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', color: '#1a1a1a', margin: 0 }}>
                    Perbarui Stok — {editingStock.jenisPupuk}
                  </h2>
                  <button onClick={() => setEditingStock(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    <X size={20} color="#888" />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '6px' }}>
                      Stok Saat Ini
                    </label>
                    <div style={{
                      width: '100%', padding: '11px 14px', borderRadius: '10px',
                      border: '1.5px solid #e5e5e5', fontSize: '14px', fontFamily: 'var(--font-body)',
                      background: '#f5f5f5', color: '#555',
                    }}>
                      {formatStock(Number(editingStock.jumlah))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '6px' }}>
                      Jumlah Penambahan (Kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editJumlah}
                      onChange={e => setEditJumlah(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                        border: '1.5px solid #ddd', fontSize: '14px', fontFamily: 'var(--font-body)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '6px' }}>
                      Waktu Diperbarui
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={editDateText}
                        onChange={e => setEditDateText(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        style={{
                          width: '100%', padding: '11px 14px', borderRadius: '10px',
                          border: '1.5px solid #ddd', fontSize: '14px', fontFamily: 'var(--font-body)',
                          outline: 'none', paddingRight: '44px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                        style={{
                          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                          padding: '4px',
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      </button>
                      <input
                        ref={dateInputRef}
                        type="date"
                        onChange={handleCalendarChange}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                      />
                    </div>
                  </div>

                  {editError && (
                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEE2E2', color: '#991B1B', fontSize: '13px' }}>
                      {editError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button
                      onClick={() => setEditingStock(null)}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #ddd',
                        background: 'white', fontFamily: 'var(--font-display)', fontWeight: 600,
                        fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      Batal
                    </button>
                    <button
                      disabled={savingEdit || !editJumlah}
                      onClick={async () => {
                        setEditError('')
                        const jumlah = parseFloat(editJumlah)
                        if (!jumlah || jumlah <= 0) {
                          setEditError('Jumlah penambahan harus lebih dari 0')
                          return
                        }
                        setSavingEdit(true)
                        try {
                          await api.post('/api/stock', {
                            pupukId: editingStock.pupukId,
                            jumlah: jumlah,
                          })
                          setEditingStock(null)
                          // Refresh data
                          const res = await api.get<{ totalStockTon: number; stockItems: StokItem[] }>('/api/distributor/stok')
                          if (res.data) {
                            setStokData(res.data.stockItems ?? [])
                            setTotalTon(res.data.totalStockTon ?? 0)
                          }
                        } catch (err: any) {
                          setEditError(err.message || 'Gagal memperbarui stok')
                        } finally {
                          setSavingEdit(false)
                        }
                      }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                        background: savingEdit || !editJumlah ? '#6B8F6B' : '#1e6b1e',
                        color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700,
                        fontSize: '14px', cursor: savingEdit || !editJumlah ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {savingEdit ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}