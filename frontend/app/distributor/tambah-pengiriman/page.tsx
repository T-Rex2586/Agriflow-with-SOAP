'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle2, Calendar } from 'lucide-react'
import Sidebar from '@/components/distributor/SideBar'
import TopBar from '@/components/layout/TopBar'
import { api, ApiError } from '@/lib/api'
import { formatStock } from '@/lib/format'

interface StockItem { pupukId: number; jenisPupuk: string; jumlah: number; lastUpdated: string }

type Step = 1 | 2 | 3

export default function TambahPengirimanPage() {
  const [step, setStep]           = useState<Step>(1)
  
  // Step 1: Cari Pengecer
  const [namaInput, setNamaInput] = useState('')
  const [showPengecerDropdown, setShowPengecerDropdown] = useState(false)
  const [pengecerList, setPengecerList] = useState<{ userId: number; nama: string }[]>([])
  const [pengecer, setPengecer]   = useState<{ userId: number; nama: string } | null>(null)
  const [idKonfirm, setIdKonfirm] = useState('')
  const [idError, setIdError]     = useState('')
  const pengecerRef = useRef<HTMLDivElement>(null)

  // Step 2 form
  const [jenis, setJenis]         = useState('')
  const [jenisSearch, setJenisSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [jumlah, setJumlah]       = useState('')
  const [waktu, setWaktu]         = useState('') 
  const dateInputRef              = useRef<HTMLInputElement>(null)
  const dropdownRef               = useRef<HTMLDivElement>(null)

  // Step 3 result
  const [waktuKonfirmasi, setWaktuKonfirmasi] = useState('')

  const [availableStock, setAvailableStock] = useState<StockItem[]>([])
  const [recentShipments, setRecentShipments] = useState<{ kirimanId: string; timestampDikirim: string; jenisPupuk: string; jumlahDikirim: number }[]>([])

  const searchPengecer = useCallback(async (q: string) => {
    try {
      const res = await api.get<{ userId: number; nama: string }[]>(`/api/distributor/pengecer/search?q=${encodeURIComponent(q)}`)
      if (res.data) setPengecerList(Array.isArray(res.data) ? res.data : [])
    } catch { setPengecerList([]) }
  }, [])

  const pengecerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  function handleNamaInput(v: string) {
    setNamaInput(v)
    setPengecer(null)
    setIdKonfirm('')
    setIdError('')
    setShowPengecerDropdown(true)
    if (pengecerTimer.current) clearTimeout(pengecerTimer.current)
    pengecerTimer.current = setTimeout(() => searchPengecer(v), 300)
  }

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (pengecerRef.current && !pengecerRef.current.contains(e.target as Node))
        setShowPengecerDropdown(false)
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  useEffect(() => {
    api.get<{ totalStockTon: number; stockItems: StockItem[] }>('/api/distributor/stok')
      .then(res => {
        if (res.data?.stockItems) setAvailableStock(res.data.stockItems.filter(s => s.jumlah > 0))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.get<{ summary: unknown; shipments: typeof recentShipments }>('/api/distributor/pengiriman/history')
      .then(res => {
        if (res.data?.shipments) setRecentShipments(res.data.shipments.slice(0, 4))
      })
      .catch(() => {})
  }, [])

  const stockOptions = availableStock.map(s => ({ name: s.jenisPupuk, pupukId: s.pupukId, stok: s.jumlah }))
  const filteredJenis = stockOptions.filter(s =>
    s.name.toLowerCase().includes(jenisSearch.toLowerCase())
  )

  const [kirimLoading, setKirimLoading] = useState(false)
  const [kirimError, setKirimError] = useState('')

  function handlePilihPengecer(u: { userId: number; nama: string }) {
    setPengecer(u)
    setIdKonfirm(String(u.userId))
    setNamaInput(u.nama)
    setShowPengecerDropdown(false)
    setIdError('')
    setJenis('')
    setJumlah('')
    setWaktu('')
    setStep(2)
  }

  async function handleKonfirmasi() {
    if (!jenis || !jumlah || !waktu) return
    setKirimLoading(true)
    setKirimError('')
    try {
      const selected = stockOptions.find(s => s.name === jenis)
      if (!selected) throw new Error('Jenis pupuk tidak ditemukan')
      const [dd, mm, yyyy] = waktu.split('/')
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateObj = new Date(+yyyy, +mm - 1, +dd, now.getHours(), now.getMinutes())
      const timestamp = dateObj.toISOString()

      await api.post('/api/distributor/pengiriman', {
        pengecerId: idKonfirm,
        pupukId: selected.pupukId,
        jumlah: parseFloat(jumlah),
        timestamp,
      })

      const jam = `${pad(now.getHours())}:${pad(now.getMinutes())} WIB`
      setWaktuKonfirmasi(`${waktu} | ${jam}`)
      setStep(3)
    } catch (err) {
      setKirimError(err instanceof ApiError ? err.message : 'Gagal mengirim pengiriman')
    } finally {
      setKirimLoading(false)
    }
  }

  const steps = [
    { n: 1, label: 'Cari Pengecer' },
    { n: 2, label: 'Detail Pengiriman' },
    { n: 3, label: 'Simpan Pengiriman' },
  ]

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: '12px',
    border: '1.5px solid #c8e0c8', fontSize: '15px',
    fontFamily: 'var(--font-body)', color: '#1a1a1a',
    background: 'white', outline: 'none',
  }

  const btnPrimary = {
    width: '100%', padding: '15px', borderRadius: '12px',
    background: '#1e6b1e', color: 'white', fontFamily: 'var(--font-display)',
    fontWeight: 700, fontSize: '15px', letterSpacing: '0.05em',
    border: 'none', cursor: 'pointer',
  }

  const btnOutline = {
    width: '100%', padding: '15px', borderRadius: '12px',
    background: 'white', color: '#1e6b1e', fontFamily: 'var(--font-display)',
    fontWeight: 700, fontSize: '15px', letterSpacing: '0.05em',
    border: '2px solid #1e6b1e', cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar />

        <main style={{ flex: 1, padding: '32px 36px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '40px', alignItems: 'start' }}>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px', marginBottom: '32px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                Tambah Pengiriman
              </h1>
              {step >= 2 && (
                <span style={{ fontSize: '15px', color: '#555', fontWeight: 500 }}>
                  Tujuan: {pengecer?.nama} ({idKonfirm})
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '32px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {steps.map(({ n, label }, i) => {
                  const active  = step === n
                  const pending = step < n
                  return (
                    <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: pending ? 'white' : '#1e6b1e',
                          border: `2px solid ${pending ? '#ccc' : '#1e6b1e'}`, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0,
                        }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: pending ? '#aaa' : 'white' }}>{n}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: active ? 700 : 400, fontSize: '14px', color: pending ? '#aaa' : '#1e6b1e' }}>{label}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div style={{ width: 2, height: 36, background: step > n ? '#1e6b1e' : '#ddd', marginLeft: '17px', marginTop: '2px', marginBottom: '2px' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              <div>
                {step === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', color: '#1a1a1a' }}>Masukkan Nama Pengecer</p>
                    <div ref={pengecerRef} style={{ position: 'relative' }}>
                      <input type="text" value={namaInput} onChange={e => handleNamaInput(e.target.value)} onFocus={() => { searchPengecer(namaInput); setShowPengecerDropdown(true) }} placeholder="Cari nama pengecer..." style={{ ...inputStyle, paddingRight: '40px' }} />
                      <span onClick={() => setShowPengecerDropdown(v => !v)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#1e6b1e', userSelect: 'none' }}>▾</span>
                      {showPengecerDropdown && pengecerList.length > 0 && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'white', border: '1.5px solid #c8e0c8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                          {pengecerList.map((u, i) => (
                            <div key={u.userId} onMouseDown={() => handlePilihPengecer(u)} style={{ padding: '11px 16px', fontSize: '14px', color: '#1a1a1a', cursor: 'pointer', background: 'white', borderRadius: i === 0 ? '10px 10px 0 0' : i === pengecerList.length - 1 ? '0 0 10px 10px' : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.1s' }}>
                              <span>{u.nama}</span>
                              <span style={{ fontSize: '12px', color: '#1e6b1e', fontWeight: 600 }}>ID: {u.userId}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {idError && <p style={{ fontSize: '13px', color: '#c53030' }}>{idError}</p>}
                    {kirimError && <p style={{ fontSize: '13px', color: '#c53030' }}>{kirimError}</p>}
                  </div>
                )}

                {step === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '10px', color: '#1a1a1a' }}>Jenis Pupuk</p>
                      <div ref={dropdownRef} style={{ position: 'relative' }}>
                        <input type="text" value={jenisSearch || jenis} onChange={e => { setJenisSearch(e.target.value); setJenis(''); setShowDropdown(true) }} onFocus={() => setShowDropdown(true)} placeholder="Cari jenis pupuk..." style={{ ...inputStyle, paddingRight: '40px' }} />
                        <span onClick={() => setShowDropdown(v => !v)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#1e6b1e', userSelect: 'none' }}>▾</span>
                        {showDropdown && filteredJenis.length > 0 && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'white', border: '1.5px solid #c8e0c8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredJenis.map((s, i) => (
                              <div key={s.name} onMouseDown={() => { setJenis(s.name); setJenisSearch(''); setShowDropdown(false) }} style={{ padding: '11px 16px', fontSize: '14px', color: '#1a1a1a', cursor: 'pointer', background: jenis === s.name ? '#f0f9f0' : 'white', borderRadius: i === 0 ? '10px 10px 0 0' : i === filteredJenis.length - 1 ? '0 0 10px 10px' : '0', fontWeight: jenis === s.name ? 600 : 400, transition: 'background 0.1s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{s.name}</span>
                                <span style={{ fontSize: '12px', color: '#1e6b1e', fontWeight: 600 }}>{formatStock(s.stok)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '10px', color: '#1a1a1a' }}>Jumlah Pupuk (Kg)</p>
                      <input type="number" value={jumlah} onChange={e => setJumlah(e.target.value)} placeholder="Masukkan jumlah pupuk" style={inputStyle} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '10px', color: '#1a1a1a' }}>Waktu Pengiriman</p>
                      <div style={{ position: 'relative' }}>
                        <input type="text" value={waktu} onChange={e => setWaktu(e.target.value)} placeholder="DD/MM/YYYY" maxLength={10} style={{ ...inputStyle, paddingRight: '44px' }} />
                        <input ref={dateInputRef} type="date" onChange={e => { if (!e.target.value) return; const [y, m, d] = e.target.value.split('-'); setWaktu(`${d}/${m}/${y}`) }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px', opacity: 0, cursor: 'pointer', zIndex: 3 }} />
                        <Calendar size={18} color="#1e6b1e" onClick={() => dateInputRef.current?.showPicker?.()} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 2, pointerEvents: 'auto' }} />
                      </div>
                    </div>
                    {kirimError && <p style={{ fontSize: '13px', color: '#c53030', marginBottom: '8px' }}>{kirimError}</p>}
                    <button style={{ ...btnPrimary, opacity: kirimLoading ? 0.6 : 1 }} disabled={kirimLoading} onClick={handleKonfirmasi}>{kirimLoading ? 'Mengirim...' : 'KONFIRMASI'}</button>
                    <button style={btnOutline} onClick={() => setStep(1)}>KEMBALI</button>
                  </div>
                )}

                {step === 3 && (
                  <div style={{ background: '#f0f9f0', borderRadius: '20px', padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', maxWidth: '420px' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e6b1e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                      <CheckCircle2 size={36} color="white" strokeWidth={2} />
                    </div>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#1a1a1a' }}>Data Berhasil Disimpan</p>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>Data Pengiriman berhasil dikirim ke Pengecer</p>
                    {[
                      { label: 'ID Pengecer',      val: idKonfirm },
                      { label: 'Nama Tujuan',      val: pengecer?.nama },
                      { label: 'Jenis Pupuk',      val: jenis },
                      { label: 'Jumlah Pupuk',     val: formatStock(parseFloat(jumlah) || 0) },
                      { label: 'Waktu Pengiriman', val: waktuKonfirmasi },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: '14px', color: '#555' }}>{label}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{val}</span>
                      </div>
                    ))}
                    <Link href="/distributor/dashboard" style={{ ...btnPrimary, display: 'block', textAlign: 'center', marginTop: '20px', textDecoration: 'none' }}>Kembali ke Halaman Utama</Link>
                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                      <Link href="/distributor/riwayat-pengiriman" style={{ ...btnOutline, flex: 1, display: 'block', textAlign: 'center', textDecoration: 'none', fontSize: '13px' }}>Riwayat Pengiriman</Link>
                      <Link href="/distributor/manajemen-stok" style={{ ...btnOutline, flex: 1, display: 'block', textAlign: 'center', textDecoration: 'none', fontSize: '13px' }}>Manajemen Stok</Link>
                    </div>
                    <p style={{ fontSize: '13px', color: '#555', marginTop: '16px', textAlign: 'center' }}>
                      Ada kendala? <Link href="/bantuan" style={{ color: '#1e6b1e', fontWeight: 700, textDecoration: 'underline' }}>Hubungi Bantuan</Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#1a1a1a' }}>Riwayat Pengiriman</h2>
              <Link href="/distributor/riwayat-pengiriman" style={{ fontSize: '13px', color: '#1e6b1e', fontWeight: 600 }}>Lihat Semua</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentShipments.length === 0 && (
                <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '16px' }}>Belum ada pengiriman</p>
              )}
              {recentShipments.map(({ kirimanId, timestampDikirim, jenisPupuk, jumlahDikirim }) => (
                <div key={kirimanId} style={{ background: '#f0f0f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>ID : {kirimanId?.slice(0, 8) || '-'}</p>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{timestampDikirim ? new Date(timestampDikirim).toLocaleDateString('id-ID') : '-'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>{jenisPupuk}</p>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{formatStock(jumlahDikirim)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}