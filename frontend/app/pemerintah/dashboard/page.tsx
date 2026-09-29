'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import SidebarPemerintah from '@/components/pemerintah/SideBar'
import TopBar from '@/components/layout/TopBar'
import Gauge from '@/components/ui/Gauge'
import LineChart from '@/components/ui/LineChart'
import FilledMultiLineChart from '@/components/ui/FilledMultiLineChart'
import HorizontalBar from '@/components/ui/HorizontalBar'
import { invokeSignedSoap, invokeSoap } from '@/lib/soap-pemerintah'
import { AlertTriangle, MapPin, Layers, TrendingUp, Leaf } from 'lucide-react'

const MapChart = dynamic(() => import('@/components/ui/MapChart'), { ssr: false })

interface ProvinsiData {
  provinsi: string
  totalPupuk: number
}

interface TrenBulanan {
  tahun: number
  bulan: number
  totalPupuk: number
}

interface TopSektor {
  sektor: string
  totalPupuk: number
}

interface StockTimeSeriesPoint {
  tanggalMulai: string
  distributorKg: number
  pengecerKg: number
  petaniKg: number
}

interface DashboardData {
  petaProvinsi: ProvinsiData[]
  totalTerserapTon: string
  realisasiPersen: string
  top3Provinsi: ProvinsiData[]
  trenBulanan: TrenBulanan[]
  top3Sektor: TopSektor[]
  stockTimeSeries?: StockTimeSeriesPoint[]
}

interface Notification {
  notifikasiId: string
  judul: string
  tanggal: string
}

function formatNum(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0' : n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

export default function DashboardPemerintahPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.allSettled([
      // 🔐 SIGNED SOAP — GetDashboardPemerintah
      invokeSignedSoap('GetDashboardPemerintah', {}),
      // 🔓 UNSIGNED SOAP — GetStockTimeSeries
      invokeSoap('GetStockTimeSeries', { Weeks: 52 }),
      // 🔓 UNSIGNED SOAP — GetTopNotifications
      invokeSoap('GetTopNotifications', { UserId: 1 }),
    ])
      .then(([dashRes, stockRes, notifRes]) => {
        if (dashRes.status === 'fulfilled' && dashRes.value.data) {
          const raw = dashRes.value.data
          const normalized: DashboardData = {
            petaProvinsi: (Array.isArray(raw.MapByProvince) ? raw.MapByProvince : raw.MapByProvince ? [raw.MapByProvince] : []).map((p: any) => ({
              provinsi: p.Provinsi ?? p.provinsi ?? '',
              totalPupuk: Number(p.TotalPupuk ?? p.totalPupuk ?? 0),
            })),
            totalTerserapTon: String(raw.TotalTerserapTon ?? '0'),
            realisasiPersen: String(raw.RealisasiPersen ?? '0'),
            top3Provinsi: (Array.isArray(raw.TopProvinces) ? raw.TopProvinces : raw.TopProvinces ? [raw.TopProvinces] : []).map((p: any) => ({
              provinsi: p.Provinsi ?? p.provinsi ?? '',
              totalPupuk: Number(p.TotalPupuk ?? p.totalPupuk ?? 0),
            })),
            trenBulanan: (Array.isArray(raw.MonthlyTrend) ? raw.MonthlyTrend : raw.MonthlyTrend ? [raw.MonthlyTrend] : []).map((t: any) => ({
              tahun: Number(t.Tahun ?? t.tahun ?? 0),
              bulan: Number(t.Bulan ?? t.bulan ?? 0),
              totalPupuk: Number(t.TotalPupuk ?? t.totalPupuk ?? 0),
            })),
            top3Sektor: (Array.isArray(raw.TopSectors) ? raw.TopSectors : raw.TopSectors ? [raw.TopSectors] : []).map((s: any) => ({
              sektor: s.Sektor ?? s.sektor ?? '',
              totalPupuk: Number(s.TotalPupuk ?? s.totalPupuk ?? 0),
            })),
          }
          setData(normalized)
          setError('')
        }
        if (stockRes.status === 'fulfilled' && stockRes.value.data) {
          const raw = stockRes.value.data
          const seriesArr = Array.isArray(raw.Series) ? raw.Series : raw.Series ? [raw.Series] : []
          const series: StockTimeSeriesPoint[] = seriesArr.map((s: any) => ({
            tanggalMulai: s.tanggalMulai ?? '',
            distributorKg: Number(s.distributorKg ?? 0),
            pengecerKg: Number(s.pengecerKg ?? 0),
            petaniKg: Number(s.petaniKg ?? 0),
          }))
          setData(prev => prev ? { ...prev, stockTimeSeries: series } : null)
        }
        if (notifRes.status === 'fulfilled' && notifRes.value.data) {
          const raw = notifRes.value.data
          const rawList: any[] = Array.isArray(raw.ListNotifikasi) ? raw.ListNotifikasi : raw.ListNotifikasi ? [raw.ListNotifikasi] : []
          const list: Notification[] = rawList.map((n: any) => ({
            notifikasiId: String(n.NotifikasiId ?? ''),
            judul: n.Judul ?? '-',
            tanggal: n.Timestamp ?? '-',
          }))
          setNotifs(list)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])


  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
        <SidebarPemerintah />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopBar />
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ height: '160px', borderRadius: '20px', background: '#e0e0e0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ height: '68px', borderRadius: '8px', background: '#e0e0e0' }} />
                  <div style={{ height: '200px', borderRadius: '8px', background: '#e0e0e0' }} />
                </div>
                <div style={{ height: '284px', borderRadius: '8px', background: '#e0e0e0' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ height: '120px', borderRadius: '8px', background: '#e0e0e0' }} />
                <div style={{ height: '120px', borderRadius: '8px', background: '#e0e0e0' }} />
              </div>
              <div style={{ height: '260px', borderRadius: '8px', background: '#e0e0e0' }} />
            </main>
            <aside style={{ width: '360px', background: '#fafafa', borderLeft: '1px solid #e5e5e5', padding: '32px 28px' }}>
              <div style={{ height: '24px', width: '120px', marginBottom: '24px', borderRadius: '8px', background: '#e0e0e0' }} />
              {[1,2,3].map(i => <div key={i} style={{ height: '72px', marginBottom: '12px', borderRadius: '8px', background: '#e0e0e0' }} />)}
            </aside>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <SidebarPemerintah />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Hero */}
            <div
              style={{
                borderRadius: '20px', overflow: 'hidden', height: '160px',
                backgroundImage: "url('/utama.png')", backgroundSize: 'cover', backgroundPosition: 'center',
                display: 'flex', alignItems: 'center', padding: '0 40px', position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,40,10,0.38)', borderRadius: '20px' }} />
              <h1 style={{ position: 'relative', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: 'white', letterSpacing: '-0.02em' }}>
                Dashboard Pemerintah
              </h1>
            </div>

            {error && (
              <div style={{ padding: '12px', borderRadius: '8px', background: '#FEE2E2', color: '#991B1B', fontSize: '14px' }}>
                {error}
              </div>
            )}

            {/* Row: KPI + Gauge (left) + Map (right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                <div style={{ flex: 1, background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={24} color='#1e6b1e' />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#888', fontWeight: 500, marginBottom: '4px' }}>Total Pupuk Terserap</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: '#1a1a1a', lineHeight: 1.2 }}>
                      {formatNum(data?.totalTerserapTon)} <span style={{ fontSize: '16px', fontWeight: 600, color: '#888' }}>Ton</span>
                    </p>
                  </div>
                </div>
                <div style={{ flex: 1, background: 'white', borderRadius: '16px', padding: '16px 20px 20px', border: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <TrendingUp size={16} color='#1e6b1e' />
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>Realisasi Penebusan</h2>
                  </div>
                  <Gauge value={parseFloat(data?.realisasiPersen ?? '0')} target={75} label='Target 75%' />
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <MapPin size={16} color='#1e6b1e' />
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>Peta Monitoring Stok Pupuk</h2>
                </div>
                <MapChart data={data?.petaProvinsi ?? []} />
              </div>
            </div>

            {/* Row: Top 3 Provinsi + Top 3 Sektor (horizontal bars side by side) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                  <MapPin size={16} color='#1e6b1e' />
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>Top 3 Provinsi Penyerapan</h2>
                </div>
                <HorizontalBar data={(data?.top3Provinsi ?? []).map(p => ({ label: p.provinsi, value: p.totalPupuk }))} unit='Kg' />
              </div>
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                  <Leaf size={16} color='#1e6b1e' />
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>Top 3 Sektor Petani</h2>
                </div>
                <HorizontalBar data={(data?.top3Sektor ?? []).map(s => ({ label: s.sektor, value: s.totalPupuk }))} color='#D97706' unit='Kg' />
              </div>
            </div>

            {/* Line Chart: Tren Penyerapan Bulanan */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <TrendingUp size={16} color='#1e6b1e' />
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>Tren Penyerapan Bulanan</h2>
              </div>
              <LineChart data={data?.trenBulanan ?? []} />
            </div>

            {/* Stock Time Series Chart */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <Layers size={16} color='#1e6b1e' />
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>Tren Stok Pupuk (Distributor, Pengecer, Petani)</h2>
              </div>
              <FilledMultiLineChart data={data?.stockTimeSeries ?? []} />
            </div>

          </main>

          {/* Sidebar Notifikasi */}
          <aside style={{ width: '360px', background: '#fafafa', borderLeft: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '32px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #72A94F', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#114111' }}>
                  Notifikasi
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notifs.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '12px' }}>Tidak ada notifikasi</p>
                ) : (
                  notifs.map((n, idx) => (
                    <div key={n.notifikasiId || idx} style={{ background: '#e8e8e8', borderRadius: '12px', position: 'relative', overflow: 'hidden', padding: '12px 16px' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '6px', background: '#BA1A1A' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', paddingLeft: '8px' }}>
                        <AlertTriangle size={16} color='#BA1A1A' strokeWidth={2} />
                        <span style={{ fontSize: '12px', color: '#333' }}>{n.tanggal || '-'}</span>
                      </div>
                      <p style={{ paddingLeft: '8px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: '#1a1a1a' }}>
                        {n.judul}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  )
}
