'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/distributor/SideBar'
import TopBar from '@/components/layout/TopBar'
import { X, AlertTriangle } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { api } from '@/lib/api'

interface NotifikasiItem {
  notifikasiId: string
  judul: string
  pesan: string
  statusDibaca: boolean
  timestamp: string
  jenis: string
}

export default function NotifikasiDistributorPage() {
  const [notifikasiData, setNotifikasiData] = useState<NotifikasiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedNotif, setSelectedNotif] = useState<NotifikasiItem | null>(null)
  const [markingRead, setMarkingRead] = useState(false)

  const ITEMS_PER_PAGE = 5
  const totalPages = Math.max(1, Math.ceil(notifikasiData.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentData = notifikasiData.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    api.get<NotifikasiItem[]>('/api/distributor/notifikasi')
      .then(res => {
        if (res.data) setNotifikasiData(Array.isArray(res.data) ? res.data : [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleMarkRead() {
    if (!selectedNotif || selectedNotif.statusDibaca) return
    setMarkingRead(true)
    try {
      await api.patch(`/api/notifications/${selectedNotif.notifikasiId}/read`)
      const updated = { ...selectedNotif, statusDibaca: true }
      setSelectedNotif(updated)
      setNotifikasiData(prev =>
        prev.map(n => n.notifikasiId === updated.notifikasiId ? updated : n)
      )
    } catch {
      // silent
    } finally {
      setMarkingRead(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar />

        <main style={{ flex: 1, padding: '32px 36px', position: 'relative' }}>
          
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              Notifikasi
            </h1>
            <p style={{ fontSize: '15px', color: '#555', fontWeight: 500 }}>
              Laporan Ketidaksesuaian Penerimaan Pengecer
            </p>
          </div>

          {/* Tabel Notifikasi */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '60px 220px 1fr 160px 160px', padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
              {['NO', 'JENIS NOTIFIKASI', 'JUDUL', 'Tanggal', 'Aksi'].map(h => (
                <span 
                  key={h} 
                  style={{ 
                    fontSize: '13px', color: '#888', fontWeight: 600, textTransform: 'uppercase', 
                    textAlign: h === 'NO' || h === 'Tanggal' || h === 'Aksi' ? 'center' : 'left' 
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Memuat...</div>
            ) : error ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#c53030', fontSize: '14px' }}>{error}</div>
            ) : currentData.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Tidak ada notifikasi.</div>
            ) : (
              currentData.map((row, i) => (
                <div 
                  key={row.notifikasiId || i} 
                  style={{ 
                    display: 'grid', gridTemplateColumns: '60px 220px 1fr 160px 160px', padding: '16px 24px', 
                    background: row.statusDibaca ? '#f0f0f0' : i % 2 === 0 ? '#fafafa' : 'white',
                    alignItems: 'center', 
                    borderBottom: i === currentData.length - 1 ? 'none' : '1px solid #f9f9f9',
                    opacity: row.statusDibaca ? 0.55 : 1,
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#555', textAlign: 'center', fontWeight: row.statusDibaca ? 400 : 600 }}>{startIndex + i + 1}</span>
                  <span style={{ fontSize: '13px', color: row.statusDibaca ? '#999' : '#c53030', fontWeight: row.statusDibaca ? 500 : 700, letterSpacing: '0.02em' }}>{row.jenis || 'PENERIMAAN'}</span>
                  <div>
                    <span style={{ fontSize: '15px', color: row.statusDibaca ? '#999' : '#1a1a1a', fontWeight: row.statusDibaca ? 400 : 600, display: 'block' }}>{row.judul}</span>
                    <span style={{ fontSize: '12px', color: row.statusDibaca ? '#bbb' : '#888' }}>ID: {row.notifikasiId?.slice(0, 8) || '-'}</span>
                  </div>
                  <span style={{ fontSize: '14px', color: row.statusDibaca ? '#bbb' : '#555', textAlign: 'center', fontWeight: row.statusDibaca ? 400 : 500 }}>
                    {row.timestamp ? new Date(row.timestamp).toLocaleDateString('id-ID') : '-'}
                  </span>
                  
                  <div style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedNotif(row)}
                      style={{
                        padding: '8px 20px', borderRadius: '999px', border: '1.5px solid #1e6b1e', 
                        background: 'transparent', color: '#1e6b1e', fontFamily: 'var(--font-display)', 
                        fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f0f9f0'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Lihat Detail
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>

          {/* ========================================================
              MODAL POPUP DETAIL PENERIMAAN TIDAK SESUAI
              ======================================================== */}
          {selectedNotif && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                background: 'white', width: '480px', borderRadius: '24px', padding: '32px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.1)', position: 'relative'
              }}>
                
                {/* Tombol Close */}
                <button 
                  onClick={() => setSelectedNotif(null)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={24} color="#888" />
                </button>

                {/* Header Modal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={24} color="#c53030" />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#1a1a1a' }}>
                      Penerimaan Tidak Sesuai
                    </h2>
                    <p style={{ fontSize: '13px', color: '#666' }}>Laporan dari Pengecer</p>
                  </div>
                </div>

                {/* Isi Modal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f9fafb', borderRadius: '16px', padding: '20px', border: '1px solid #eee' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                    <span style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>ID Notifikasi</span>
                    <span style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>{selectedNotif.notifikasiId?.slice(0, 8) || '-'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                    <span style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Jenis</span>
                    <span style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>{selectedNotif.jenis || '-'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                    <span style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Pesan</span>
                    <span style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>{selectedNotif.pesan}</span>
                  </div>
                  
                  <div style={{ height: '1px', background: '#e5e5e5', margin: '4px 0' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                    <span style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Waktu</span>
                    <span style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
                      {selectedNotif.timestamp ? new Date(selectedNotif.timestamp).toLocaleString('id-ID') : '-'} WIB
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                    <span style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Status Dibaca</span>
                    <span style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>{selectedNotif.statusDibaca ? 'Sudah' : 'Belum'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  {!selectedNotif.statusDibaca && (
                    <button
                      onClick={handleMarkRead}
                      disabled={markingRead}
                      style={{
                        flex: 1, padding: '14px', borderRadius: '12px',
                        background: markingRead ? '#6B8F6B' : '#1e6b1e', color: 'white',
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
                        border: 'none', cursor: markingRead ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {markingRead ? 'Memproses...' : 'Tandai Sudah Dibaca'}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedNotif(null)}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '12px',
                      background: 'white', color: '#1e6b1e',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
                      border: '2px solid #1e6b1e', cursor: 'pointer',
                    }}
                  >
                    Tutup
                  </button>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}