import { PemerintahService } from '../modules/pemerintah/pemerintah.service';

const service = new PemerintahService();

export interface GetDashboardPemerintahArgs {
  TahunAwal?: number;
  TahunAkhir?: number;
  Provinsi?: string;
  PupukId?: number;
}

export interface GetPendingUsersArgs {
  Page?: number;
  PageSize?: number;
}

export interface ApproveUserArgs {
  UserId: number;
  ApproverId: number;
}

export interface RejectUserArgs {
  UserId: number;
  ApproverId: number;
  Alasan?: string;
}

export interface GetDeteksiAnomaliArgs {
  UserId?: number;
  BatasKg?: number;
  Page?: number;
}

export interface GetStockTimeSeriesArgs {
  Weeks?: number;
}

export interface GetUsersByStatusArgs {
  Status?: string;
  Page?: number;
  PageSize?: number;
}

export interface GetTopNotificationsArgs {
  UserId: number;
}

export interface GetHelpRequestsArgs {
  Page?: number;
}

// ========================================================
// 🔐 SIGNED SOAP OPERATIONS (Wajib WS-Security Signature)
// ========================================================

/**
 * 1. GetDashboardPemerintah [SIGNED SOAP]
 */
export async function getDashboardPemerintahSoap(args: GetDashboardPemerintahArgs) {
  try {
    const rawData = await service.getDashboard({
      tahunAwal: args.TahunAwal ? Number(args.TahunAwal) : undefined,
      tahunAkhir: args.TahunAkhir ? Number(args.TahunAkhir) : undefined,
      provinsi: args.Provinsi || undefined,
      pupukId: args.PupukId ? Number(args.PupukId) : undefined,
    });

    return {
      Success: true,
      TotalTerserapTon: rawData.totalAbsorbed?.TotalTerserapTon || '0',
      RealisasiPersen: rawData.realizationPercent?.RealisasiPersen || '0.00',
      TopProvinces: rawData.topProvinces || [],
      MapByProvince: rawData.mapByProvince || [],
      MonthlyTrend: rawData.monthlyTrend || [],
      TopSectors: rawData.topSectors || [],
    };
  } catch (error: any) {
    return {
      Success: false,
      TotalTerserapTon: '0',
      RealisasiPersen: '0.00',
      TopProvinces: [],
      MapByProvince: [],
      MonthlyTrend: [],
      TopSectors: [],
      Error: error.message,
    };
  }
}

/**
 * 2. GetPendingUsers [SIGNED SOAP]
 */
export async function getPendingUsersSoap(args: GetPendingUsersArgs) {
  try {
    const page = Number(args.Page) || 1;
    const pageSize = Number(args.PageSize) || 10;
    const res = await service.getPendingUsers(page, pageSize);

    return {
      Success: true,
      Summary: res.summary?.[0] || { Total: 0, TotalAktif: 0, TotalDitolak: 0 },
      Total: res.pendingUsers.length,
      ListUsers: res.pendingUsers.map((u: any) => ({
        No: u.No,
        UserId: u.UserId,
        NamaLengkap: u.NamaLengkap,
        Email: u.Email,
        Role: u.Role,
        RegistrationProof: u.RegistrationProof || '',
        TotalRows: u.TotalRows,
      })),
    };
  } catch (error: any) {
    return {
      Success: false,
      Summary: { Total: 0, TotalAktif: 0, TotalDitolak: 0 },
      Total: 0,
      ListUsers: [],
      Error: error.message,
    };
  }
}

/**
 * 3. ApproveUser [SIGNED SOAP]
 */
export async function approveUserSoap(args: ApproveUserArgs) {
  try {
    const targetUserId = Number(args.UserId);
    const approverId = Number(args.ApproverId);
    if (!targetUserId || !approverId) {
      return { Success: false, Message: 'UserId dan ApproverId wajib diisi' };
    }

    const res = await service.approveUser(targetUserId, approverId);
    return {
      Success: true,
      Message: res.message || 'User berhasil disetujui via Signed SOAP',
      UserId: targetUserId,
      Status: 'Active',
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: error.message || 'Gagal menyetujui user',
    };
  }
}

/**
 * 4. RejectUser [SIGNED SOAP]
 */
export async function rejectUserSoap(args: RejectUserArgs) {
  try {
    const targetUserId = Number(args.UserId);
    const approverId = Number(args.ApproverId);
    if (!targetUserId || !approverId) {
      return { Success: false, Message: 'UserId dan ApproverId wajib diisi' };
    }

    const res = await service.rejectUser(targetUserId, approverId);
    return {
      Success: true,
      Message: res.message || 'User berhasil ditolak via Signed SOAP',
      UserId: targetUserId,
      Status: 'Rejected',
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: error.message || 'Gagal menolak user',
    };
  }
}

/**
 * 5. GetDeteksiAnomali [SIGNED SOAP]
 */
export async function getDeteksiAnomaliSoap(args: GetDeteksiAnomaliArgs) {
  try {
    const userId = Number(args.UserId) || 1;
    const page = Number(args.Page) || 1;
    const rawAnomalies = await service.getAnomalies(userId, page);

    return {
      Success: true,
      TotalAnomali: rawAnomalies.length,
      ListAnomali: rawAnomalies.map((a: any) => ({
        NotifikasiId: String(a.NotifikasiId || ''),
        Jenis: a.Jenis || 'ANOMALI',
        Judul: a.Judul || '',
        Pesan: a.Pesan || '',
        StatusDibaca: Boolean(a.StatusDibaca),
        Timestamp: a.Timestamp ? new Date(a.Timestamp).toISOString() : '',
        TotalRows: a.TotalRows || 0,
      })),
    };
  } catch (error: any) {
    return {
      Success: false,
      TotalAnomali: 0,
      ListAnomali: [],
      Error: error.message,
    };
  }
}

// ========================================================
// 🔓 UNSIGNED SOAP OPERATIONS (Tidak butuh WS-Security)
// ========================================================

/**
 * 6. GetStockTimeSeries [UNSIGNED SOAP]
 */
export async function getStockTimeSeriesSoap(args: GetStockTimeSeriesArgs) {
  try {
    const weeks = Number(args.Weeks) || 52;
    const raw = await service.getStockTimeSeries(weeks);

    return {
      Success: true,
      Series: raw.series || [],
    };
  } catch (error: any) {
    return {
      Success: false,
      Series: [],
      Error: error.message,
    };
  }
}

/**
 * 7. GetUsersByStatus [UNSIGNED SOAP]
 */
export async function getUsersByStatusSoap(args: GetUsersByStatusArgs) {
  try {
    const status = args.Status || 'Active';
    const page = Number(args.Page) || 1;
    const pageSize = Number(args.PageSize) || 10;
    const res = await service.getUsersByStatus(status, page, pageSize);

    return {
      Success: true,
      TotalRows: res.totalRows,
      Users: res.users.map((u: any) => ({
        No: u.no,
        UserId: u.userId,
        NamaLengkap: u.namaLengkap,
        Email: u.email,
        Role: u.role,
        CreatedAt: u.createdAt ? new Date(u.createdAt).toISOString() : '',
      })),
    };
  } catch (error: any) {
    return {
      Success: false,
      TotalRows: 0,
      Users: [],
      Error: error.message,
    };
  }
}

/**
 * 8. GetTopNotifications [UNSIGNED SOAP]
 */
export async function getTopNotificationsSoap(args: GetTopNotificationsArgs) {
  try {
    const userId = Number(args.UserId) || 1;
    const res = await service.getTopNotifications(userId);

    return {
      Success: true,
      ListNotifikasi: res.map((n: any) => ({
        NotifikasiId: n.NotifikasiId || '',
        Jenis: n.Jenis || '',
        Judul: n.Judul || '',
        Pesan: n.Pesan || '',
        Timestamp: n.Timestamp ? new Date(n.Timestamp).toISOString() : '',
      })),
    };
  } catch (error: any) {
    return {
      Success: false,
      ListNotifikasi: [],
      Error: error.message,
    };
  }
}

/**
 * 9. GetHelpRequests [UNSIGNED SOAP]
 */
export async function getHelpRequestsSoap(args: GetHelpRequestsArgs) {
  try {
    const page = Number(args.Page) || 1;
    const res = await service.getHelpRequests(page);

    return {
      Success: true,
      Total: res.length,
      ListBantuan: res.map((b: any) => ({
        No: b.No,
        BantuanId: b.BantuanId || 0,
        FirstName: b.FirstName || '',
        LastName: b.LastName || '',
        Email: b.Email || '',
        Topik: b.Topik || '',
        Ringkasan: b.Ringkasan || '',
        Status: b.Status || '',
        Timestamp: b.Timestamp ? new Date(b.Timestamp).toISOString() : '',
        TotalRows: b.TotalRows || 0,
      })),
    };
  } catch (error: any) {
    return {
      Success: false,
      Total: 0,
      ListBantuan: [],
      Error: error.message,
    };
  }
}
