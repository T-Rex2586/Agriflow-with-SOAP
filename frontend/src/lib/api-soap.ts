import { invokeSoap, invokeSignedSoap } from './soap-client';

export interface UserSession {
  userId: number;
  email: string;
  name: string;
  role: 'DISTRIBUTOR' | 'PENGECER' | 'PEMERINTAH';
  status: string;
  accessToken?: string;
}

export interface PetaniData {
  found: boolean;
  petaniId: string;
  nik: string;
  namaLengkap: string;
  nomorHp: string;
  alamat: string;
  desaKelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  luasLahan: number;
  sektor: string;
  status: string;
}

export interface KuotaItem {
  pupukId: number;
  namaPupuk: string;
  sisaKuota: number;
}

export interface StokItem {
  pupukId: number;
  namaPupuk: string;
  jumlahStok: number;
  terakhirUpdate: string;
}

export interface DashboardPemerintahData {
  totalTerserapTon: number;
  totalSisaKuotaKg: number;
  totalAlokasiKg: number;
  realisasiPersen: string;
}

export interface PendingUserItem {
  userId: number;
  namaLengkap: string;
  email: string;
  role: string;
  status: string;
  tanggalDaftar: string;
}

export interface AnomaliItem {
  tebusanId: number;
  petaniId: string;
  namaPetani: string;
  namaPengecer: string;
  namaPupuk: string;
  jumlahKg: number;
  alasanAnomali: string;
  timestamp: string;
}

/**
 * Service API SOAP Terintegrasi
 */
export const soapApi = {
  /**
   * Operasi SOAP: LoginUser
   */
  async loginUser(email: string, password: string): Promise<UserSession> {
    const xml = `
      <agr:LoginUserRequest>
        <agr:Email>${escapeXml(email)}</agr:Email>
        <agr:Password>${escapeXml(password)}</agr:Password>
      </agr:LoginUserRequest>
    `.trim();

    const { data } = await invokeSoap('LoginUser', xml, {
      method: 'POST',
      endpoint: '/api/auth/login',
      requestObj: { email, password },
    });

    if (!data.Success && data.Success !== undefined) {
      throw new Error(data.Message || 'Login gagal via SOAP');
    }

    return {
      userId: Number(data.UserId),
      email: data.Email,
      name: data.Name,
      role: data.Role,
      status: data.Status,
      accessToken: data.AccessToken,
    };
  },

  /**
   * Operasi SOAP: GetPetaniByNIK
   */
  async getPetaniByNIK(nik: string): Promise<PetaniData> {
    const xml = `
      <agr:GetPetaniByNIKRequest>
        <agr:NIK>${escapeXml(nik)}</agr:NIK>
      </agr:GetPetaniByNIKRequest>
    `.trim();

    const { data } = await invokeSoap('GetPetaniByNIK', xml, {
      method: 'GET',
      endpoint: `/api/petani/${nik}`,
      requestObj: { nik },
    });

    return {
      found: Boolean(data.Found),
      petaniId: data.PetaniId || '',
      nik: data.NIK || nik,
      namaLengkap: data.NamaLengkap || '',
      nomorHp: data.NomorHp || '',
      alamat: data.Alamat || '',
      desaKelurahan: data.DesaKelurahan || '',
      kecamatan: data.Kecamatan || '',
      kabupatenKota: data.KabupatenKota || '',
      provinsi: data.Provinsi || '',
      luasLahan: Number(data.LuasLahan || 0),
      sektor: data.Sektor || '',
      status: data.Status || '',
    };
  },

  /**
   * Operasi SOAP: CekKuotaPetani
   */
  async cekKuotaPetani(petaniId: string): Promise<{ petaniId: string; namaPetani: string; listKuota: KuotaItem[] }> {
    const xml = `
      <agr:CekKuotaPetaniRequest>
        <agr:PetaniId>${escapeXml(petaniId)}</agr:PetaniId>
      </agr:CekKuotaPetaniRequest>
    `.trim();

    const { data } = await invokeSoap('CekKuotaPetani', xml, {
      method: 'GET',
      endpoint: `/api/petani/${petaniId}/kuota`,
      requestObj: { petaniId },
    });

    const kuotaRaw = data.ListKuota || [];
    const listKuota: KuotaItem[] = (Array.isArray(kuotaRaw) ? kuotaRaw : [kuotaRaw])
      .filter((k: any) => k && k.PupukId !== undefined)
      .map((k: any) => ({
        pupukId: Number(k.PupukId),
        namaPupuk: k.NamaPupuk || `Pupuk #${k.PupukId}`,
        sisaKuota: Number(k.SisaKuota || 0),
      }));

    return {
      petaniId: data.PetaniId || petaniId,
      namaPetani: data.NamaPetani || '',
      listKuota,
    };
  },

  /**
   * Operasi SOAP: PenebusanPupuk
   */
  async penebusanPupuk(params: {
    userIdPengecer: number;
    petaniId: string;
    pupukId: number;
    jumlah: number;
  }) {
    const xml = `
      <agr:PenebusanPupukRequest>
        <agr:UserIdPengecer>${params.userIdPengecer}</agr:UserIdPengecer>
        <agr:PetaniId>${escapeXml(params.petaniId)}</agr:PetaniId>
        <agr:PupukId>${params.pupukId}</agr:PupukId>
        <agr:Jumlah>${params.jumlah}</agr:Jumlah>
      </agr:PenebusanPupukRequest>
    `.trim();

    const { data } = await invokeSoap('PenebusanPupuk', xml, {
      method: 'POST',
      endpoint: '/api/redemption',
      requestObj: params,
    });

    if (!data.Success && data.Success !== undefined) {
      throw new Error(data.Message || 'Transaksi penebusan gagal');
    }

    return {
      success: Boolean(data.Success),
      message: data.Pesan || data.Message || 'Penebusan berhasil',
      tebusanId: Number(data.TebusanId),
      sisaKuotaBaru: Number(data.SisaKuota),
      timestamp: data.Timestamp,
    };
  },

  /**
   * Operasi SOAP: CekStokPengecer
   */
  async cekStokPengecer(userIdPengecer: number): Promise<{ namaPengecer: string; listStok: StokItem[] }> {
    const xml = `
      <agr:CekStokPengecerRequest>
        <agr:UserIdPengecer>${userIdPengecer}</agr:UserIdPengecer>
      </agr:CekStokPengecerRequest>
    `.trim();

    const { data } = await invokeSoap('CekStokPengecer', xml, {
      method: 'GET',
      endpoint: `/api/stock/pengecer/${userIdPengecer}`,
      requestObj: { userIdPengecer },
    });

    const stokRaw = data.ListStok || [];
    const listStok: StokItem[] = (Array.isArray(stokRaw) ? stokRaw : [stokRaw])
      .filter((s: any) => s && s.PupukId !== undefined)
      .map((s: any) => ({
        pupukId: Number(s.PupukId),
        namaPupuk: s.NamaPupuk || `Pupuk #${s.PupukId}`,
        jumlahStok: Number(s.JumlahStok || 0),
        terakhirUpdate: s.TerakhirUpdate || new Date().toISOString(),
      }));

    return {
      namaPengecer: data.NamaPengecer || `Pengecer #${userIdPengecer}`,
      listStok,
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 🔐 ADMIN OPERATIONS — Semua menggunakan Signed SOAP (WS-Security HMAC-SHA256)
  // Hanya dapat diakses oleh pengguna dengan role PEMERINTAH yang sudah login.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 🔐 Operasi Signed SOAP: GetDashboardPemerintah
   * Memerlukan WS-Security header dengan digital signature HMAC-SHA256.
   */
  async getDashboardPemerintah(
    tahunAwal: number = 2024,
    tahunAkhir: number = 2026,
    accessToken: string
  ): Promise<DashboardPemerintahData> {
    const xml = `
      <agr:GetDashboardPemerintahRequest>
        <agr:TahunAwal>${tahunAwal}</agr:TahunAwal>
        <agr:TahunAkhir>${tahunAkhir}</agr:TahunAkhir>
      </agr:GetDashboardPemerintahRequest>
    `.trim();

    const { data } = await invokeSignedSoap('GetDashboardPemerintah', xml, accessToken, {
      method: 'GET',
      endpoint: `/api/pemerintah/dashboard?tahunAwal=${tahunAwal}&tahunAkhir=${tahunAkhir}`,
      requestObj: { tahunAwal, tahunAkhir },
    });

    return {
      totalTerserapTon: Number(data.TotalTerserapTon || 0),
      totalSisaKuotaKg: Number(data.TotalSisaKuotaKg || 0),
      totalAlokasiKg: Number(data.TotalAlokasiKg || 0),
      realisasiPersen: String(data.RealisasiPersen || '0.00%'),
    };
  },

  /**
   * 🔐 Operasi Signed SOAP: GetPendingUsers
   * Memerlukan WS-Security header dengan digital signature HMAC-SHA256.
   */
  async getPendingUsers(accessToken: string): Promise<{ total: number; listUsers: PendingUserItem[] }> {
    const xml = `
      <agr:GetPendingUsersRequest>
        <agr:Page>1</agr:Page>
      </agr:GetPendingUsersRequest>
    `.trim();

    const { data } = await invokeSignedSoap('GetPendingUsers', xml, accessToken, {
      method: 'GET',
      endpoint: '/api/pemerintah/pending-users',
      requestObj: {},
    });

    const usersRaw = data.ListUsers || [];
    const listUsers: PendingUserItem[] = (Array.isArray(usersRaw) ? usersRaw : [usersRaw])
      .filter((u: any) => u && u.UserId !== undefined)
      .map((u: any) => ({
        userId: Number(u.UserId),
        namaLengkap: u.NamaLengkap || '',
        email: u.Email || '',
        role: u.Role || '',
        status: u.Status || '',
        tanggalDaftar: u.TanggalDaftar || '',
      }));

    return {
      total: Number(data.Total || 0),
      listUsers,
    };
  },

  /**
   * 🔐 Operasi Signed SOAP: ApproveUser
   * Memerlukan WS-Security header dengan digital signature HMAC-SHA256.
   */
  async approveUser(targetUserId: number, approverId: number, accessToken: string) {
    const xml = `
      <agr:ApproveUserRequest>
        <agr:UserId>${targetUserId}</agr:UserId>
        <agr:ApproverId>${approverId}</agr:ApproverId>
      </agr:ApproveUserRequest>
    `.trim();

    const { data } = await invokeSignedSoap('ApproveUser', xml, accessToken, {
      method: 'PATCH',
      endpoint: `/api/pemerintah/users/${targetUserId}/approve`,
      requestObj: { targetUserId, approverId },
    });

    if (!data.Success && data.Success !== undefined) {
      throw new Error(data.Message || 'Gagal menyetujui akun');
    }
    return data;
  },

  /**
   * 🔐 Operasi Signed SOAP: RejectUser
   * Memerlukan WS-Security header dengan digital signature HMAC-SHA256.
   */
  async rejectUser(targetUserId: number, approverId: number, alasan: string, accessToken: string) {
    const xml = `
      <agr:RejectUserRequest>
        <agr:UserId>${targetUserId}</agr:UserId>
        <agr:ApproverId>${approverId}</agr:ApproverId>
        <agr:Alasan>${escapeXml(alasan)}</agr:Alasan>
      </agr:RejectUserRequest>
    `.trim();

    const { data } = await invokeSignedSoap('RejectUser', xml, accessToken, {
      method: 'PATCH',
      endpoint: `/api/pemerintah/users/${targetUserId}/reject`,
      requestObj: { targetUserId, approverId, alasan },
    });

    if (!data.Success && data.Success !== undefined) {
      throw new Error(data.Message || 'Gagal menolak akun');
    }
    return data;
  },

  /**
   * 🔐 Operasi Signed SOAP: GetDeteksiAnomali
   * Memerlukan WS-Security header dengan digital signature HMAC-SHA256.
   */
  async getDeteksiAnomali(
    batasKg: number = 150,
    accessToken: string
  ): Promise<{ totalAnomali: number; batasAmbangKg: number; listAnomali: AnomaliItem[] }> {
    const xml = `
      <agr:GetDeteksiAnomaliRequest>
        <agr:BatasKg>${batasKg}</agr:BatasKg>
      </agr:GetDeteksiAnomaliRequest>
    `.trim();

    const { data } = await invokeSignedSoap('GetDeteksiAnomali', xml, accessToken, {
      method: 'GET',
      endpoint: `/api/pemerintah/anomali?batasKg=${batasKg}`,
      requestObj: { batasKg },
    });

    const anomaliRaw = data.ListAnomali || [];
    const listAnomali: AnomaliItem[] = (Array.isArray(anomaliRaw) ? anomaliRaw : [anomaliRaw])
      .filter((a: any) => a && a.TebusanId !== undefined)
      .map((a: any) => ({
        tebusanId: Number(a.TebusanId),
        petaniId: String(a.PetaniId || ''),
        namaPetani: a.NamaPetani || '',
        namaPengecer: a.NamaPengecer || '',
        namaPupuk: a.NamaPupuk || '',
        jumlahKg: Number(a.JumlahKg || 0),
        alasanAnomali: a.AlasanAnomali || '',
        timestamp: a.Timestamp || '',
      }));

    return {
      totalAnomali: Number(data.TotalAnomali || 0),
      batasAmbangKg: Number(data.BatasAmbangKg || batasKg),
      listAnomali,
    };
  },
};

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
