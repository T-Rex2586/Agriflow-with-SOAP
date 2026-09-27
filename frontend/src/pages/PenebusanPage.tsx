import React, { useState } from 'react';
import { soapApi, PetaniData, KuotaItem } from '../lib/api-soap';
import { Search, ArrowRightLeft, UserCheck, PackageCheck, AlertCircle, CheckCircle2, ShoppingBag } from 'lucide-react';

interface Props {
  onOpenInspector: () => void;
}

export const PenebusanPage: React.FC<Props> = ({ onOpenInspector }) => {
  const [nik, setNik] = useState('3301010101700001');
  const [loadingPetani, setLoadingPetani] = useState(false);
  const [petani, setPetani] = useState<PetaniData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Kuota state
  const [loadingKuota, setLoadingKuota] = useState(false);
  const [kuotaList, setKuotaList] = useState<KuotaItem[]>([]);

  // Penebusan state
  const [userIdPengecer, setUserIdPengecer] = useState(2);
  const [selectedPupukId, setSelectedPupukId] = useState(1);
  const [jumlahKg, setJumlahKg] = useState(25);
  const [loadingTebus, setLoadingTebus] = useState(false);
  const [transaksiSukses, setTransaksiSukses] = useState<any | null>(null);

  const handleCariPetani = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPetani(true);
    setError(null);
    setPetani(null);
    setKuotaList([]);
    setTransaksiSukses(null);

    try {
      const data = await soapApi.getPetaniByNIK(nik);
      if (!data.found) {
        setError(`Petani dengan NIK ${nik} tidak ditemukan dalam database.`);
      } else {
        setPetani(data);
        // otomatis cek kuota via SOAP
        handleCekKuota(data.petaniId);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mencari data petani');
    } finally {
      setLoadingPetani(false);
    }
  };

  const handleCekKuota = async (petaniId: string) => {
    setLoadingKuota(true);
    try {
      const res = await soapApi.cekKuotaPetani(petaniId);
      setKuotaList(res.listKuota);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingKuota(false);
    }
  };

  const handlePenebusan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petani) return;

    setLoadingTebus(true);
    setError(null);
    setTransaksiSukses(null);

    try {
      const res = await soapApi.penebusanPupuk({
        userIdPengecer,
        petaniId: petani.petaniId,
        pupukId: selectedPupukId,
        jumlah: jumlahKg,
      });

      setTransaksiSukses(res);
      // Refresh kuota via SOAP
      await handleCekKuota(petani.petaniId);
    } catch (err: any) {
      setError(err.message || 'Gagal melakukan penebusan pupuk');
    } finally {
      setLoadingTebus(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* PAGE HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1e293b',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid #334155',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>
            👨‍🌾 Transaksi Penebusan Pupuk Bersubsidi
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
            Operasi SOAP terintegrasi: <code style={{ color: '#38bdf8' }}>GetPetaniByNIK</code>, <code style={{ color: '#38bdf8' }}>CekKuotaPetani</code>, dan <code style={{ color: '#38bdf8' }}>PenebusanPupuk</code>
          </p>
        </div>

        <button
          onClick={onOpenInspector}
          style={{
            background: '#1e3a8a',
            border: '1px solid #3b82f6',
            color: '#93c5fd',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ArrowRightLeft size={16} />
          Bandingkan SOAP vs REST
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '14px',
          color: '#fca5a5',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: FORM PENCARIAN PETANI */}
      <div style={{
        background: '#1e293b',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #334155',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#2563eb', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>1</span>
          Pencarian Petani via NIK (Operasi SOAP: GetPetaniByNIK)
        </h2>

        <form onSubmit={handleCariPetani} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              placeholder="Masukkan NIK 16 digit petani..."
              required
              style={{
                width: '100%',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 12px 10px 40px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loadingPetani}
            style={{
              background: '#15803d',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 700,
              cursor: loadingPetani ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loadingPetani ? 0.7 : 1,
            }}
          >
            {loadingPetani ? 'Mengirim SOAP...' : 'Cari Petani'}
          </button>
        </form>
      </div>

      {/* STEP 2: PROFIL PETANI & KUOTA SUBSIDI */}
      {petani && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '20px',
        }}>
          {/* DETAIL PETANI */}
          <div style={{
            background: '#1e293b',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #334155',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80' }}>
              <UserCheck size={18} /> Profil Terverifikasi Petani
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Nama Lengkap</span>
                <strong style={{ color: '#fff' }}>{petani.namaLengkap}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>NIK / Petani ID</span>
                <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{petani.nik}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Desa / Kecamatan</span>
                <span>{petani.desaKelurahan}, Kec. {petani.kecamatan}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Kabupaten / Provinsi</span>
                <span>{petani.kabupatenKota}, {petani.provinsi}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Luas Lahan</span>
                <span>{petani.luasLahan} Hektar ({petani.sektor || 'Tanaman Pangan'})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Status Keanggotaan</span>
                <span style={{ background: '#14532d', color: '#86efac', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                  {petani.status}
                </span>
              </div>
            </div>
          </div>

          {/* SISA ALOKASI KUOTA */}
          <div style={{
            background: '#1e293b',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #334155',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
              <PackageCheck size={18} /> Sisa Kuota Subsidi (SOAP: CekKuotaPetani)
            </h3>

            {loadingKuota ? (
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>Mengambil data kuota via XML...</p>
            ) : kuotaList.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>Belum ada kuota pupuk aktif terdaftar.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {kuotaList.map((item) => (
                  <div key={item.pupukId} style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#fff' }}>{item.namaPupuk}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>Pupuk ID: {item.pupukId}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#4ade80' }}>
                        {item.sisaKuota}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>Kg Tersedia</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: FORM EKSEKUSI PENEBUSAN PUPUK */}
      {petani && (
        <div style={{
          background: '#1e293b',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #334155',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#2563eb', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</span>
            Form Penebusan Pupuk (Operasi SOAP: PenebusanPupuk)
          </h2>

          {transaksiSukses && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid #22c55e',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              color: '#86efac',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px' }}>
                <CheckCircle2 size={20} color="#4ade80" />
                <span>Transaksi Penebusan SOAP Berhasil Diproses!</span>
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginLeft: '28px' }}>
                ID Transaksi Tebusan: <strong style={{ color: '#fff' }}>#{transaksiSukses.tebusanId}</strong> | Sisa Kuota Sekarang: <strong style={{ color: '#4ade80' }}>{transaksiSukses.sisaKuotaBaru} kg</strong>
              </div>
            </div>
          )}

          <form onSubmit={handlePenebusan} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                ID Pengecer (Kios)
              </label>
              <input
                type="number"
                value={userIdPengecer}
                onChange={(e) => setUserIdPengecer(Number(e.target.value))}
                required
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Jenis Pupuk Subsidi
              </label>
              <select
                value={selectedPupukId}
                onChange={(e) => setSelectedPupukId(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                <option value={1}>Pupuk Urea (ID: 1)</option>
                <option value={2}>Pupuk NPK (ID: 2)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Jumlah Ditebus (Kg)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={jumlahKg}
                onChange={(e) => setJumlahKg(Number(e.target.value))}
                required
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loadingTebus}
              style={{
                background: 'linear-gradient(135deg, #15803d, #16a34a)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 20px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: loadingTebus ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: loadingTebus ? 0.7 : 1,
              }}
            >
              <ShoppingBag size={16} />
              {loadingTebus ? 'Memproses SOAP...' : 'Eksekusi Penebusan'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
