'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { UserCircle, MapPin, CheckCircle2 } from 'lucide-react'
import Sidebar from '@/components/pengecer/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { api, ApiError } from '@/lib/api'
import { formatStock } from '@/lib/format'

interface KuotaPupuk { jenis: string; kuota: number }
interface DataPetani { nama: string; alamat: string; kuotaPupuk: KuotaPupuk[] }

const jenisPupukOptions = ['Urea', 'Kompos', 'NPK', 'SP-36', 'NPK Formulasi Khusus', 'Organik', 'Kimia']

const pupukMap: Record<string, number> = {
  'Urea': 1, 'Kompos': 2, 'NPK': 3, 'SP-36': 4, 'NPK Formulasi Khusus': 5, 'Organik': 6, 'Kimia': 7,
}

type Step = 1 | 2 | 3

interface PetaniSearchResult {
  petaniId: string
  nama: string
  alamat: string
}

export default function PenebusanPupukPage() {
  const [step, setStep]               = useState<Step>(1)

  const [petaniSearch, setPetaniSearch] = useState('')
  const [showPetaniDropdown, setShowPetaniDropdown] = useState(false)
  const [petaniList, setPetaniList] = useState<PetaniSearchResult[]>([])
  const [idError, setIdError]         = useState('')
  const [petani, setPetani]           = useState<DataPetani | null>(null)
  const [idKonfirm, setIdKonfirm]     = useState('')
  const [kirimLoading, setKirimLoading] = useState(false)
  const [kirimError, setKirimError]   = useState('')
  const petaniRef = useRef<HTMLDivElement>(null)

  const [jenis, setJenis]             = useState('')
  const [jenisSearch, setJenisSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [jumlah, setJumlah]           = useState('')
  const dropdownRef                   = useRef<HTMLDivElement>(null)

  const [waktuTebus, setWaktuTebus]   = useState('')
  const [status, setStatus]           = useState<'Berhasil' | 'Gagal'>('Berhasil')

  const searchPetani = useCallback(async (q: string) => {
    try {
      const res = await api.get<PetaniSearchResult[]>(`/api/petani/search?q=${encodeURIComponent(q)}`)
      if (res.data) setPetaniList(Array.isArray(res.data) ? res.data : [])
    } catch { setPetaniList([]) }
  }, [])

  const petaniTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  function handlePetaniInput(v: string) {
    setPetaniSearch(v)
    setPetani(null)
    setIdKonfirm('')
    setIdError('')
    setShowPetaniDropdown(true)
    if (petaniTimer.current) clearTimeout(petaniTimer.current)
    petaniTimer.current = setTimeout(() => searchPetani(v), 300)
  }

  const availableJenis = petani
    ? petani.kuotaPupuk.map(k => k.jenis)
    : jenisPupukOptions

  const filteredJenis = availableJenis.filter(j =>
    j.toLowerCase().includes(jenisSearch.toLowerCase())
  )

  // ── Step 1: cari & pilih petani ────────────────────────────────────────────
  async function handlePilihPetani(p: PetaniSearchResult) {
    setShowPetaniDropdown(false)
    setPetaniSearch(p.nama)
    setIdError('')
    try {
      const res = await api.get<{ petaniDetails: any; quotas: KuotaPupuk[] }>(`/api/pengecer/validasi-petani/${p.petaniId}`)
      if (res.data) {
        const pd = res.data.petaniDetails
        const q = (res.data.quotas ?? []).map((q: any) => ({
          jenis: q.JenisPupuk || q.jenisPupuk || q.jenis || '',
          kuota: q.SisaKuota ?? q.sisaKuota ?? q.kuota ?? 0,
        }))
        setPetani({
          nama: pd.NamaPetani || pd.namaPetani || pd.nama || p.nama,
          alamat: pd.AlamatPetani || pd.alamatPetani || pd.alamat || p.alamat,
          kuotaPupuk: q,
        })
        setIdKonfirm(p.petaniId)
        setJenis(''); setJenisSearch(''); setJumlah('')
        setStep(2)
      }
    } catch (err) {
      setIdError(err instanceof ApiError ? err.message : 'Data petani tidak ditemukan')
    }
  }

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (petaniRef.current && !petaniRef.current.contains(e.target as Node))
        setShowPetaniDropdown(false)
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  // ── Step 2: konfirmasi ─────────────────────────────────────────────────────
  async function handleKonfirmasi() {
    if (!petani || !jenis || !jumlah) return
    setKirimLoading(true)
    setKirimError('')
    try {
      await api.post('/api/pengecer/penebusan', {
        petaniId: idKonfirm,
        pupukId: pupukMap[jenis] || 1,
        jumlah: parseFloat(jumlah),
      })

      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const tgl = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
      const jam = `${pad(now.getHours())}:${pad(now.getMinutes())}`
      setWaktuTebus(`${tgl} | ${jam}`)
      setStatus('Berhasil')
      setStep(3)
    } catch (err) {
      setKirimError(err instanceof ApiError ? err.message : 'Penebusan gagal')
      setStatus('Gagal')
    } finally {
      setKirimLoading(false)
    }
  }

  // ── Stepper ────────────────────────────────────────────────────────────────
  const steps = [
    { n: 1, label: 'Cari Petani' },
    { n: 2, label: 'Detail Penebusan' },
    { n: 3, label: 'Konfirmasi Penebusan' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '12px',
    border: '1.5px solid #c8e0c8',
    fontSize: '15px',
    fontFamily: 'var(--font-body)',
    color: '#1a1a1a',
    background: 'white',
    outline: 'none',
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '15px',
    borderRadius: '12px',
    background: '#1e6b1e',
    color: 'white',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '15px',
    letterSpacing: '0.05em',
    border: 'none',
    cursor: 'pointer',
  }

  const btnOutline: React.CSSProperties = {
    width: '100%',
    padding: '15px',
    borderRadius: '12px',
    background: 'white',
    color: '#1e6b1e',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '15px',
    letterSpacing: '0.05em',
    border: '2px solid #1e6b1e',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar notifCount={2} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar />

        <main style={{ flex: 1, padding: '32px 36px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: '32px' }}>
            {step === 1 ? 'Penebusan Pupuk' : step === 2 ? 'Detail Penerimaan' : 'Detail Penerimaan'}
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '32px', alignItems: 'start', maxWidth: '860px' }}>

            {/* Stepper */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {steps.map(({ n, label }, i) => {
                const done    = step > n
                const active  = step === n
                const pending = step < n
                return (
                  <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: pending ? 'white' : '#1e6b1e',
                        border: `2px solid ${pending ? '#ccc' : '#1e6b1e'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: pending ? '#aaa' : 'white' }}>{n}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: active ? 700 : 400, fontSize: '14px', color: pending ? '#aaa' : '#1e6b1e' }}>
                        {label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div style={{ width: 2, height: 36, background: step > n ? '#1e6b1e' : '#ddd', marginLeft: '17px', marginTop: '2px', marginBottom: '2px' }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Content */}
            <div>

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', color: '#1a1a1a' }}>
                    Cari Petani
                  </p>
                  <div ref={petaniRef} style={{ position: 'relative' }}>
                    <input type="text" value={petaniSearch} onChange={e => handlePetaniInput(e.target.value)} onFocus={() => { searchPetani(petaniSearch); setShowPetaniDropdown(true) }} placeholder="Cari nama petani..." style={{ ...inputStyle, paddingRight: '40px' }} />
                    <span onClick={() => setShowPetaniDropdown(v => !v)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#1e6b1e', userSelect: 'none' }}>▾</span>
                    {showPetaniDropdown && petaniList.length > 0 && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'white', border: '1.5px solid #c8e0c8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                        {petaniList.map((p, i) => (
                          <div key={p.petaniId} onMouseDown={() => handlePilihPetani(p)} style={{ padding: '11px 16px', fontSize: '14px', color: '#1a1a1a', cursor: 'pointer', background: 'white', borderRadius: i === 0 ? '10px 10px 0 0' : i === petaniList.length - 1 ? '0 0 10px 10px' : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.1s' }}>
                            <span>{p.nama}</span>
                            <span style={{ fontSize: '12px', color: '#1e6b1e', fontWeight: 600 }}># {p.petaniId}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {idError && <p style={{ fontSize: '13px', color: '#c53030' }}>{idError}</p>}
                  {kirimError && <p style={{ fontSize: '13px', color: '#c53030' }}>{kirimError}</p>}
                </div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && petani && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px' }}>

                  {/* Info petani card */}
                  <div style={{
                    background: '#eaf4ea',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <UserCircle size={44} color="#1e6b1e" strokeWidth={1.5} />
                      <div>
                        <p style={{ fontSize: '12px', color: '#4a7a4a', fontWeight: 500, marginBottom: '2px' }}>Nama Petani</p>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#155215', letterSpacing: '-0.01em' }}>
                          {petani.nama}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <MapPin size={13} color="#4a7a4a" />
                          <span style={{ fontSize: '13px', color: '#4a7a4a', fontWeight: 600 }}>{petani.alamat}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '13px', color: '#4a7a4a', fontWeight: 600, marginBottom: '4px' }}>
                        {jenis ? `Kuota ${jenis}` : 'Sisa Kuota (Total)'}
                      </p>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', color: '#155215' }}>
                        {jenis
                          ? formatStock(petani.kuotaPupuk.find(k => k.jenis === jenis)?.kuota ?? 0)
                          : formatStock(petani.kuotaPupuk.reduce((s, k) => s + k.kuota, 0))
                        }
                      </p>
                    </div>
                  </div>

                  {/* Jenis & Jumlah Pupuk — side by side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                    {/* Jenis Pupuk — searchable dropdown */}
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '10px', color: '#1a1a1a' }}>
                        Jenis Pupuk
                      </p>
                      <div ref={dropdownRef} style={{ position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            value={jenis || jenisSearch}
                            onChange={e => { setJenisSearch(e.target.value); setJenis(''); setShowDropdown(true) }}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Jenis Pupuk"
                            style={{ ...inputStyle, paddingRight: '36px' }}
                          />
                          <span
                            onClick={() => setShowDropdown(v => !v)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#1e6b1e', userSelect: 'none' }}
                          >▾</span>
                        </div>
                        {showDropdown && filteredJenis.length > 0 && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                            background: 'white', border: '1.5px solid #c8e0c8', borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '180px', overflowY: 'auto',
                          }}>
                            {filteredJenis.map((j, i) => (
                              <div
                                key={j}
                                onMouseDown={() => { setJenis(j); setJenisSearch(''); setShowDropdown(false) }}
                                style={{
                                  padding: '10px 14px', fontSize: '14px', cursor: 'pointer',
                                  background: jenis === j ? '#f0f9f0' : 'white',
                                  fontWeight: jenis === j ? 600 : 400,
                                  borderRadius: i === 0 ? '10px 10px 0 0' : i === filteredJenis.length - 1 ? '0 0 10px 10px' : '0',
                                  color: '#1a1a1a',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f0f9f0')}
                                onMouseLeave={e => (e.currentTarget.style.background = jenis === j ? '#f0f9f0' : 'white')}
                              >{j}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Jumlah Pupuk */}
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '10px', color: '#1a1a1a' }}>
Jumlah Pupuk (Kg)
                      </p>
                      <input
                        type="number"
                        value={jumlah}
                        onChange={e => setJumlah(e.target.value)}
                        placeholder="0"
                        style={inputStyle}
                        min={0}
                      />
                    </div>
                  </div>

                  {kirimError && <p style={{ fontSize: '13px', color: '#c53030', marginBottom: '8px' }}>{kirimError}</p>}
                  <button style={{ ...btnPrimary, opacity: kirimLoading ? 0.6 : 1 }} disabled={kirimLoading || !jenis || !jumlah} onClick={handleKonfirmasi}>
                    {kirimLoading ? 'Mengirim...' : 'KONFIRMASI'}
                  </button>
                  <button style={btnOutline} onClick={() => setStep(1)}>KEMBALI</button>
                </div>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && petani && (
                <div style={{
                  background: '#f0f9f0', borderRadius: '20px', padding: '36px 32px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', maxWidth: '440px',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: status === 'Berhasil' ? '#1e6b1e' : '#c53030',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px',
                  }}>
                    <CheckCircle2 size={36} color="white" strokeWidth={2} />
                  </div>

                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#1a1a1a' }}>
                    {status === 'Berhasil' ? 'Penebusan Berhasil' : 'Penebusan Gagal'}
                  </p>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                    {status === 'Berhasil' ? 'Data penebusan berhasil disimpan' : 'Jumlah melebihi sisa kuota petani'}
                  </p>

                  {/* Detail rows */}
                  {[
                    { label: 'ID Petani',        val: idKonfirm },
                    { label: 'Nama Petani',       val: petani.nama },
                    { label: 'Jenis Pupuk',       val: jenis },
                    { label: 'Jumlah Pupuk',      val: formatStock(parseFloat(jumlah) || 0) },
                    { label: 'Waktu Penebusan',   val: waktuTebus },
                    { label: 'Status',            val: status },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '14px', color: '#555' }}>{label}</span>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
                        color: label === 'Status'
                          ? (status === 'Berhasil' ? '#1e6b1e' : '#c53030')
                          : '#1a1a1a',
                      }}>{val}</span>
                    </div>
                  ))}

                  {/* Buttons */}
                  <Link href="/pengecer/dashboard" style={{ ...btnPrimary, display: 'block', textAlign: 'center', marginTop: '20px', textDecoration: 'none' }}>
                    Kembali ke Halaman Utama
                  </Link>
                  <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <Link href="/pengecer/riwayat" style={{ ...btnOutline, flex: 1, display: 'block', textAlign: 'center', textDecoration: 'none', fontSize: '13px' }}>
                      Riwayat Transaksi
                    </Link>
                    <button
                      onClick={() => { setStep(1); setPetaniSearch(''); setPetani(null); setJenis(''); setJumlah('') }}
                      style={{ ...btnOutline, flex: 1, fontSize: '13px' }}
                    >
                      Penebusan Baru
                    </button>
                  </div>

                  <p style={{ fontSize: '13px', color: '#555', marginTop: '8px' }}>
                    Ada kendala ?{' '}
                    <Link href="/bantuan" style={{ color: '#1e6b1e', fontWeight: 600 }}>Hubungi Bantuan</Link>
                  </p>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}