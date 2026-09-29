'use client'

import { useState, useEffect, useCallback } from 'react'
import SidebarPemerintah from '@/components/pemerintah/SideBar'
import TopBar from '@/components/layout/TopBar'
import { X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { invokeSoap } from '@/lib/soap-pemerintah'
import Pagination from '@/components/ui/Pagination'
import { formatStock } from '@/lib/format'

interface UserItem {
  no: number
  userId: number
  namaLengkap: string
  email: string
  role: string
  createdAt: string
}

interface UsersResponse {
  users: UserItem[]
  totalRows: number
}

interface DistributorCandidate {
  userId: number
  namaLengkap: string
  email: string
  totalMismatch: number
}

interface PengecerCandidate {
  userId: number
  namaLengkap: string
  email: string
  totalStock: number
  totalRedemption: number
  ratio: number
}

type MainTab = 'Active' | 'Rejected' | 'Nonaktifkan'
type RoleTab = 'DISTRIBUTOR' | 'PENGECER'

const PAGE_SIZE = 5

export default function UserManagementPage() {
  const [tab, setTab] = useState<MainTab>('Active')
  const [roleTab, setRoleTab] = useState<RoleTab>('DISTRIBUTOR')
  const [users, setUsers] = useState<UserItem[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(1)
  const [nonaktifkanPage, setNonaktifkanPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Nonaktifkan candidates data
  const [distributors, setDistributors] = useState<DistributorCandidate[]>([])
  const [pengecerList, setPengecerList] = useState<PengecerCandidate[]>([])

  // Edit modal
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [resettingPw, setResettingPw] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async (t: MainTab, p: number) => {
    if (t === 'Nonaktifkan') return
    setLoading(true)
    setError('')
    try {
      // 🔓 UNSIGNED SOAP — GetUsersByStatus
      const res = await invokeSoap('GetUsersByStatus', {
        Status: t,
        Page: p,
        PageSize: PAGE_SIZE,
      })
      if (res.data) {
        const raw = res.data
        const rawUsers = raw.Users
          ? Array.isArray(raw.Users) ? raw.Users : [raw.Users]
          : []
        const mapped: UserItem[] = rawUsers.map((u: any, idx: number) => ({
          no: Number(u.No ?? (p - 1) * PAGE_SIZE + idx + 1),
          userId: Number(u.UserId ?? 0),
          namaLengkap: u.NamaLengkap ?? '-',
          email: u.Email ?? '-',
          role: u.Role ?? '-',
          createdAt: u.CreatedAt ?? '',
        }))
        setUsers(mapped)
        setTotalRows(Number(raw.TotalRows ?? mapped.length))
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data via SOAP')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchNonaktifkan = useCallback(async (role: RoleTab) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<any>(`/api/pemerintah/users/nonaktifkan-candidates?role=${role}`)
      if (res.data) {
        const list = Array.isArray(res.data) ? res.data : []
        if (role === 'DISTRIBUTOR') {
          setDistributors(list)
        } else {
          setPengecerList(list)
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'Nonaktifkan') {
      fetchNonaktifkan(roleTab)
    } else {
      fetchData(tab, page)
    }
  }, [tab, page, roleTab, fetchData, fetchNonaktifkan])

  function handleTabChange(t: MainTab) {
    setTab(t)
    setPage(1)
  }

  function handleRoleTabChange(r: RoleTab) {
    setRoleTab(r)
    setNonaktifkanPage(1)
  }

  function openEditModal(u: UserItem) {
    setEditingUser(u)
    setEditNama(u.namaLengkap)
    setEditEmail(u.email)
    setEditRole(u.role)
    setNewPassword('')
    setSaving(false)
    setResettingPw(false)
  }

  async function handleSaveEdit() {
    if (!editingUser) return
    setSaving(true)
    try {
      await api.patch(`/api/pemerintah/users/${editingUser.userId}/edit`, {
        namaLengkap: editNama,
        email: editEmail,
        roleName: editRole,
      })
      showToast('User berhasil diperbarui', 'ok')
      setEditingUser(null)
      fetchData(tab, page)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal menyimpan', 'err')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!editingUser) return
    setResettingPw(true)
    try {
      const res = await api.post<{ newPassword: string }>(`/api/pemerintah/users/${editingUser.userId}/reset-password`)
      if (res.data?.newPassword) {
        setNewPassword(res.data.newPassword)
        showToast('Password berhasil di-reset', 'ok')
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal reset password', 'err')
    } finally {
      setResettingPw(false)
    }
  }

  async function handleToggleStatus(u: UserItem | DistributorCandidate | PengecerCandidate) {
    try {
      const res = await api.post<{ newStatus: string }>(`/api/pemerintah/users/${u.userId}/toggle-status`)
      const newStatus = res.data?.newStatus
      showToast(`User ${newStatus === 'Active' ? 'diaktifkan' : 'dinonaktifkan'}`, 'ok')
      if (tab === 'Nonaktifkan') {
        setNonaktifkanPage(1)
        fetchNonaktifkan(roleTab)
      } else {
        fetchData(tab, page)
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal mengubah status', 'err')
    }
  }

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

  const renderMainTable = () => {
    if (tab === 'Nonaktifkan') {
      return renderNonaktifkanTable()
    }
    return renderUserTable()
  }

  const renderUserTable = () => (
    <>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>
          {tab === 'Active' ? 'Akun Aktif' : 'Akun Ditolak'}
        </h2>
      </div>
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#1e6b1e', fontFamily: 'var(--font-display)' }}>
          Memuat...
        </div>
      ) : users.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
          {tab === 'Active' ? 'Tidak ada akun aktif' : 'Tidak ada akun ditolak'}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1.2fr 1.8fr 120px 160px 140px', padding: '12px 24px', background: '#f9fafb', borderBottom: '1px solid #eee', fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>No</span>
            <span>Nama</span>
            <span>Email</span>
            <span>Role</span>
            <span>Tanggal Buat</span>
            <span style={{ textAlign: 'center' }}>Aksi</span>
          </div>
          {users.map((u) => (
            <div key={u.userId} style={{ display: 'grid', gridTemplateColumns: '48px 1.2fr 1.8fr 120px 160px 140px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ color: '#888' }}>{u.no}</span>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{u.namaLengkap}</span>
              <span style={{ color: '#555' }}>{u.email}</span>
              <span>
                <span style={{ padding: '4px 12px', borderRadius: '999px', background: '#e8f5e9', color: '#1e6b1e', fontSize: '12px', fontWeight: 600 }}>{u.role}</span>
              </span>
              <span style={{ color: '#555', fontSize: '13px' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}</span>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <button onClick={() => openEditModal(u)} style={{ padding: '5px 12px', borderRadius: '999px', border: '1.5px solid #1e6b1e', background: 'transparent', color: '#1e6b1e', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleToggleStatus(u)} style={{ padding: '5px 12px', borderRadius: '999px', border: '1.5px solid #BA1A1A', background: 'transparent', color: '#BA1A1A', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {tab === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            </div>
          ))}
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee' }}>
            <p style={{ fontSize: '13px', color: '#888' }}>
              Menampilkan {users.length} dari {totalRows} data
            </p>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}
    </>
  )

  const renderNonaktifkanTable = () => {
    const PAGE_SIZE_NONAKTIF = 5

    if (roleTab === 'DISTRIBUTOR') {
      const nonaktifkanTotalPages = Math.max(1, Math.ceil(distributors.length / PAGE_SIZE_NONAKTIF))
      const sliced = distributors.slice((nonaktifkanPage - 1) * PAGE_SIZE_NONAKTIF, nonaktifkanPage * PAGE_SIZE_NONAKTIF)
      return (
        <>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>
              Distributor
            </h2>
          </div>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#1e6b1e', fontFamily: 'var(--font-display)' }}>Memuat...</div>
          ) : distributors.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Tidak ada distributor aktif</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1.5fr 2fr 180px 120px', padding: '12px 24px', background: '#f9fafb', borderBottom: '1px solid #eee', fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>No</span>
                <span>Nama</span>
                <span>Email</span>
                <span>Jml Pengiriman Tidak Sesuai</span>
                <span style={{ textAlign: 'center' }}>Aksi</span>
              </div>
              {sliced.map((d, i) => (
                <div key={d.userId} style={{ display: 'grid', gridTemplateColumns: '48px 1.5fr 2fr 180px 120px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px' }}>
                  <span style={{ color: '#888' }}>{(nonaktifkanPage - 1) * PAGE_SIZE_NONAKTIF + i + 1}</span>
                  <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{d.namaLengkap}</span>
                  <span style={{ color: '#555' }}>{d.email}</span>
                  <span style={{ color: d.totalMismatch > 0 ? '#BA1A1A' : '#555', fontWeight: d.totalMismatch > 0 ? 700 : 400 }}>
                    {d.totalMismatch} kali
                  </span>
                  <div style={{ textAlign: 'center' }}>
                    <button onClick={() => handleToggleStatus(d)} style={{ padding: '5px 12px', borderRadius: '999px', border: '1.5px solid #BA1A1A', background: 'transparent', color: '#BA1A1A', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      Nonaktifkan
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee' }}>
                <p style={{ fontSize: '13px', color: '#888' }}>
                  Menampilkan {sliced.length} dari {distributors.length} data
                </p>
                <Pagination currentPage={nonaktifkanPage} totalPages={nonaktifkanTotalPages} onPageChange={setNonaktifkanPage} />
              </div>
            </>
          )}
        </>
      )
    }

    const nonaktifkanTotalPages = Math.max(1, Math.ceil(pengecerList.length / PAGE_SIZE_NONAKTIF))
    const sliced = pengecerList.slice((nonaktifkanPage - 1) * PAGE_SIZE_NONAKTIF, nonaktifkanPage * PAGE_SIZE_NONAKTIF)
    return (
      <>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>
              Pengecer
          </h2>
        </div>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#1e6b1e', fontFamily: 'var(--font-display)' }}>Memuat...</div>
        ) : pengecerList.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Tidak ada pengecer aktif</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '48px 1.5fr 2fr 140px 140px 120px 110px', padding: '12px 24px', background: '#f9fafb', borderBottom: '1px solid #eee', fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>No</span>
              <span>Nama</span>
              <span>Email</span>
              <span>Total Stok</span>
              <span>Total Penebusan</span>
              <span>Rasio</span>
              <span style={{ textAlign: 'center' }}>Aksi</span>
            </div>
            {sliced.map((p, i) => (
              <div key={p.userId} style={{ display: 'grid', gridTemplateColumns: '48px 1.5fr 2fr 140px 140px 120px 110px', padding: '14px 24px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px' }}>
                <span style={{ color: '#888' }}>{(nonaktifkanPage - 1) * PAGE_SIZE_NONAKTIF + i + 1}</span>
                <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{p.namaLengkap}</span>
                <span style={{ color: '#555' }}>{p.email}</span>
                <span style={{ color: '#333' }}>{formatStock(p.totalStock)}</span>
                <span style={{ color: '#333' }}>{formatStock(p.totalRedemption)}</span>
                <span style={{ color: p.ratio > 5 ? '#BA1A1A' : '#555', fontWeight: p.ratio > 5 ? 700 : 400 }}>{p.ratio.toFixed(2)}</span>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => handleToggleStatus(p)} style={{ padding: '5px 12px', borderRadius: '999px', border: '1.5px solid #BA1A1A', background: 'transparent', color: '#BA1A1A', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    Nonaktifkan
                  </button>
                </div>
              </div>
            ))}
            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee' }}>
              <p style={{ fontSize: '13px', color: '#888' }}>
                Menampilkan {sliced.length} dari {pengecerList.length} data
              </p>
              <Pagination currentPage={nonaktifkanPage} totalPages={nonaktifkanTotalPages} onPageChange={setNonaktifkanPage} />
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <SidebarPemerintah />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />

        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', color: '#1a1a1a' }}>
              User Management
            </h1>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              Kelola akun pengguna
            </p>
          </div>

          {error && (
            <div style={{ padding: '12px', borderRadius: '8px', background: '#FEE2E2', color: '#991B1B', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {/* Main Tabs */}
          <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: '12px', padding: '4px', width: '380px' }}>
            <button style={tabBtn(tab === 'Active')} onClick={() => handleTabChange('Active')}>Aktif</button>
            <button style={tabBtn(tab === 'Rejected')} onClick={() => handleTabChange('Rejected')}>Ditolak</button>
            <button style={tabBtn(tab === 'Nonaktifkan')} onClick={() => handleTabChange('Nonaktifkan')}>Nonaktifkan</button>
          </div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {tab === 'Nonaktifkan' && (
              <div style={{ display: 'flex', gap: '8px', padding: '16px 24px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
                {(['DISTRIBUTOR', 'PENGECER'] as RoleTab[]).map(r => (
                  <button key={r} onClick={() => handleRoleTabChange(r)}
                    style={{
                      padding: '6px 18px', borderRadius: '999px', border: `1.5px solid ${roleTab === r ? '#1e6b1e' : '#ddd'}`,
                      background: roleTab === r ? '#1e6b1e' : 'white',
                      color: roleTab === r ? 'white' : '#555',
                      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{r === 'DISTRIBUTOR' ? 'Distributor' : 'Pengecer'}</button>
                ))}
              </div>
            )}
            {renderMainTable()}
          </div>

        </main>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div onClick={() => setEditingUser(null)} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '36px 40px', width: '460px', maxWidth: '94vw', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', color: '#1a1a1a', margin: 0 }}>Edit User</h2>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={20} color="#888" />
              </button>
            </div>

            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '10px', background: '#f5f5f5', fontSize: '14px', color: '#555' }}>
              ID: {editingUser.userId}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '6px' }}>Nama Lengkap</label>
                <input type="text" value={editNama} onChange={e => setEditNama(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #ddd', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '6px' }}>Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #ddd', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '6px' }}>Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #ddd', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none', background: 'white' }}>
                  <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                  <option value="PENGECER">PENGECER</option>
                </select>
              </div>

              <div>
                <button onClick={handleResetPassword} disabled={resettingPw} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #D97706', background: 'transparent', color: '#D97706', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', cursor: resettingPw ? 'not-allowed' : 'pointer', opacity: resettingPw ? 0.6 : 1 }}>
                  {resettingPw ? 'Memproses...' : 'Reset Password'}
                </button>
                {newPassword && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', background: '#fefce8', border: '1px solid #fde047', fontSize: '13px', color: '#713f12' }}>
                    Password baru: <strong>{newPassword}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #ddd', background: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Batal</button>
                <button onClick={handleSaveEdit} disabled={saving || !editNama || !editEmail} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: saving || !editNama || !editEmail ? '#6B8F6B' : '#1e6b1e', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', cursor: saving || !editNama || !editEmail ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '32px', right: '32px', padding: '14px 24px', borderRadius: '12px', background: toast.type === 'ok' ? '#1e6b1e' : '#BA1A1A', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
