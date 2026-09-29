import prisma from '../../config/database';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/middleware/error.middleware';
import redisClient from '../../config/redis';
import bcrypt from 'bcrypt';

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}


/**
 * Pemerintah (Government) Service
 * Handles all government-related business logic using stored procedures
 */
export class PemerintahService {
  /**
   * Get top 3 unread notifications for home page
   * SP: dbo.usp_GetPemerintahNotifikasiTop3
   */
  async getTopNotifications(userId: number) {
    const result = await prisma.$queryRaw<any[]>`
      EXEC dbo.usp_GetPemerintahNotifikasiTop3 @UserId = ${userId}
    `;

    return result.map((r: any) => ({
      ...r,
      NotifikasiId: r.NotifikasiId !== undefined ? String(r.NotifikasiId) : undefined,
    }));
  }

  /**
   * Get comprehensive dashboard with filters
   * SP: dbo.usp_GetPemerintahDashboard
   */
  async getDashboard(filters: {
    provinsi?: string;
    tahunAwal?: number;
    tahunAkhir?: number;
    pupukId?: number;
  }) {
    const cacheKey = `dashboard:pemerintah:${JSON.stringify(filters)}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch { /* Redis unavailable, skip cache */ }

    // Build parameterized conditions using Prisma.sql to prevent SQL Injection
    const conditions: Prisma.Sql[] = [
      Prisma.sql`pp.Status = 'Berhasil'`,
      Prisma.sql`p.Status = 'Aktif'`,
    ];

    if (filters.provinsi) {
      conditions.push(Prisma.sql`kp.Provinsi = ${filters.provinsi}`);
    }
    if (filters.tahunAwal) {
      const startStr = `${filters.tahunAwal}-01-01`;
      conditions.push(Prisma.sql`pp.TimestampPenebusan >= ${startStr}`);
    }
    if (filters.tahunAkhir) {
      const endStr = `${filters.tahunAkhir}-01-01`;
      conditions.push(Prisma.sql`pp.TimestampPenebusan < DATEADD(YEAR, 1, ${endStr})`);
    }
    if (filters.pupukId) {
      conditions.push(Prisma.sql`pp.PupukId = ${filters.pupukId}`);
    }

    const whereSql = Prisma.join(conditions, ' AND ');

    const kuotaConditions: Prisma.Sql[] = [
      Prisma.sql`p2.Status = 'Aktif'`,
    ];
    if (filters.pupukId) {
      kuotaConditions.push(Prisma.sql`kp2.PupukId = ${filters.pupukId}`);
    }
    const kuotaWhereSql = Prisma.join(kuotaConditions, ' AND ');

    const [totalAbsorbedRes, provRes, trendRes, sectorsRes, kuotaRes] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT CAST(ISNULL(SUM(pp.Jumlah), 0) / 1000 AS DECIMAL(18,2)) AS TotalTerserapTon
        FROM trans.PENEBUSAN_PUPUK pp
        JOIN master.PETANI p ON pp.PetaniId = p.PetaniId
        JOIN ref.KODE_POS kp ON p.KodePos = kp.KodePosId
        WHERE ${whereSql}
      `,
      prisma.$queryRaw<any[]>`
        SELECT kp.Provinsi, ISNULL(SUM(pp.Jumlah), 0) AS TotalPupuk
        FROM trans.PENEBUSAN_PUPUK pp
        JOIN master.PETANI p ON pp.PetaniId = p.PetaniId
        JOIN ref.KODE_POS kp ON p.KodePos = kp.KodePosId
        WHERE ${whereSql}
        GROUP BY kp.Provinsi
        ORDER BY TotalPupuk DESC
      `,
      prisma.$queryRaw<any[]>`
        SELECT TOP 24
          YEAR(pp.TimestampPenebusan) AS Tahun,
          MONTH(pp.TimestampPenebusan) AS Bulan,
          SUM(pp.Jumlah) AS TotalPupuk
        FROM trans.PENEBUSAN_PUPUK pp
        JOIN master.PETANI p ON pp.PetaniId = p.PetaniId
        JOIN ref.KODE_POS kp ON p.KodePos = kp.KodePosId
        WHERE ${whereSql}
        GROUP BY YEAR(pp.TimestampPenebusan), MONTH(pp.TimestampPenebusan)
        ORDER BY Tahun DESC, Bulan DESC
      `,
      prisma.$queryRaw<any[]>`
        SELECT TOP 3 p.Sektor, SUM(pp.Jumlah) AS TotalPupuk
        FROM trans.PENEBUSAN_PUPUK pp
        JOIN master.PETANI p ON pp.PetaniId = p.PetaniId
        JOIN ref.KODE_POS kp ON p.KodePos = kp.KodePosId
        WHERE ${whereSql}
        AND p.Sektor IS NOT NULL
        GROUP BY p.Sektor
        ORDER BY TotalPupuk DESC
      `,
      prisma.$queryRaw<any[]>`
        SELECT ISNULL(SUM(kp2.SisaKuota), 0) AS TotalSisaKuota
        FROM master.KUOTA_PETANI kp2
        JOIN master.PETANI p2 ON kp2.PetaniId = p2.PetaniId
        WHERE ${kuotaWhereSql}
      `,
    ]);

    const totalTon = Number(totalAbsorbedRes[0]?.TotalTerserapTon ?? 0);
    const totalSisaKuota = Number(kuotaRes[0]?.TotalSisaKuota ?? 0);
    const totalDitebus = totalTon * 1000;
    const totalAlokasi = totalDitebus + totalSisaKuota;
    const realisasiPersen = totalAlokasi > 0
      ? ((totalDitebus / totalAlokasi) * 100).toFixed(2)
      : '0.00';

    const allProvinces = provRes.map((r: any) => ({
      Provinsi: r.Provinsi,
      TotalPupuk: Number(r.TotalPupuk),
    }));

    const result = {
      mapByProvince: allProvinces,
      totalAbsorbed: { TotalTerserapTon: String(totalTon) },
      realizationPercent: { RealisasiPersen: realisasiPersen },
      topProvinces: allProvinces.slice(0, 3),
      monthlyTrend: trendRes.map((r: any) => ({
        Tahun: Number(r.Tahun),
        Bulan: Number(r.Bulan),
        TotalPupuk: Number(r.TotalPupuk),
      })),
      topSectors: sectorsRes.map((r: any) => ({
        Sektor: r.Sektor,
        TotalPupuk: Number(r.TotalPupuk),
      })),
    };

    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    } catch { /* Redis unavailable, skip cache */ }

    return result;
  }

  /**
   * Get anomaly detection notifications
   * SP: dbo.usp_GetPemerintahDeteksiAnomali
   */
  async getAnomalies(userId: number, pageNumber: number = 1) {
    const result = await prisma.$queryRaw<any[]>`
      EXEC dbo.usp_GetPemerintahDeteksiAnomali
        @UserId = ${userId},
        @PageNumber = ${pageNumber}
    `;

    return result.map((r: any) => ({
      ...r,
      TotalRows: r.TotalRows !== undefined ? Number(r.TotalRows) : undefined,
    }));
  }

  /**
   * GET /api/pemerintah/users/list
   * Get users by status (Active / Rejected) with pagination
   */
  async getUsersByStatus(status: string, pageNumber: number = 1, pageSize: number = 10) {
    const skip = (pageNumber - 1) * pageSize;

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: { Status: status },
        select: {
          UserId: true,
          FirstName: true,
          MiddleName: true,
          LastName: true,
          Email: true,
          CreatedAt: true,
          Role: { select: { RoleName: true } },
        },
        orderBy: { CreatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where: { Status: status } }),
    ]);

    const mapped = users.map((u, idx) => ({
      no: skip + idx + 1,
      userId: u.UserId,
      namaLengkap: [u.FirstName, u.MiddleName, u.LastName].filter(Boolean).join(' '),
      email: u.Email,
      role: u.Role.RoleName,
      createdAt: u.CreatedAt,
    }));

    return { users: mapped, totalRows: totalCount };
  }

  /**
   * Get pending users for verification with pagination
   */
  async getPendingUsers(pageNumber: number = 1, pageSize: number = 10) {
    const skip = (pageNumber - 1) * pageSize;

    const [users, totalCount, totalAll, totalAktif, totalDitolak] = await Promise.all([
      prisma.user.findMany({
        where: { Status: 'Pending' },
        select: {
          UserId: true,
          FirstName: true,
          MiddleName: true,
          LastName: true,
          Email: true,
          RegistrationProof: true,
          Role: { select: { RoleName: true } },
        },
        orderBy: { CreatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where: { Status: 'Pending' } }),
      prisma.user.count(),
      prisma.user.count({ where: { Status: 'Active' } }),
      prisma.user.count({ where: { Status: 'Rejected' } }),
    ]);

    const pendingUsers = users.map((u, idx) => ({
      No: skip + idx + 1,
      UserId: u.UserId,
      NamaLengkap: [u.FirstName, u.MiddleName, u.LastName].filter(Boolean).join(' '),
      Email: u.Email,
      Role: u.Role.RoleName,
      RegistrationProof: u.RegistrationProof,
      TotalRows: totalCount,
    }));

    return {
      summary: [{ Total: totalAll, TotalAktif: totalAktif, TotalDitolak: totalDitolak }],
      pendingUsers,
    };
  }

  /**
   * Approve pending user
   */
  async approveUser(userId: number, approverId: number) {
    const user = await prisma.user.findUnique({
      where: { UserId: userId },
    });

    if (!user) {
      throw new AppError('Pengguna tidak ditemukan', 404);
    }

    if (user.Status !== 'Pending') {
      throw new AppError('Pengguna sudah diproses', 400);
    }

    await prisma.user.update({
      where: { UserId: userId },
      data: {
        Status: 'Active',
        UserIdPenyetuju: approverId,
        TimestampDisetujui: new Date(),
      },
    });

    await prisma.$executeRawUnsafe(`
      INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
      VALUES (
        (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
        'APPROVE_USER',
        ${esc(`Pengguna disetujui: ${user.Email}`)},
        ${approverId},
        GETDATE()
      )
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO evt.NOTIFIKASI (NotifikasiId, Jenis, Judul, Pesan, StatusDibaca, UserId, Timestamp)
      VALUES (
        (SELECT ISNULL(MAX(NotifikasiId), 0) + 1 FROM evt.NOTIFIKASI WITH (TABLOCKX)),
        'APPROVAL',
        'Akun Disetujui',
        'Akun Anda telah disetujui dan sekarang aktif.',
        0,
        ${userId},
        GETDATE()
      )
    `);

    return { message: 'User berhasil disetujui' };
  }

  /**
   * Reject pending user
   */
  async rejectUser(userId: number, approverId: number) {
    const user = await prisma.user.findUnique({
      where: { UserId: userId },
    });

    if (!user) {
      throw new AppError('Pengguna tidak ditemukan', 404);
    }

    if (user.Status !== 'Pending') {
      throw new AppError('Pengguna sudah diproses', 400);
    }

    await prisma.user.update({
      where: { UserId: userId },
      data: {
        Status: 'Rejected',
        UserIdPenyetuju: approverId,
        TimestampDisetujui: new Date(),
      },
    });

    await prisma.$executeRawUnsafe(`
      INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
      VALUES (
        (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
        'REJECT_USER',
        ${esc(`Pengguna ditolak: ${user.Email}`)},
        ${approverId},
        GETDATE()
      )
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO evt.NOTIFIKASI (NotifikasiId, Jenis, Judul, Pesan, StatusDibaca, UserId, Timestamp)
      VALUES (
        (SELECT ISNULL(MAX(NotifikasiId), 0) + 1 FROM evt.NOTIFIKASI WITH (TABLOCKX)),
        'REJECTION',
        'Akun Ditolak',
        'Maaf, akun Anda telah ditolak.',
        0,
        ${userId},
        GETDATE()
      )
    `);

    return { message: 'User berhasil ditolak' };
  }

  /**
   * PATCH /api/pemerintah/users/:userId/edit
   * Update user name, email, role
   */
  async editUser(userId: number, data: { namaLengkap?: string; email?: string; roleName?: string }) {
    const user = await prisma.user.findUnique({ where: { UserId: userId } });
    if (!user) throw new AppError('Pengguna tidak ditemukan', 404);

    const updateData: any = {};

    if (data.namaLengkap !== undefined) {
      const parts = data.namaLengkap.split(' ').filter(Boolean);
      updateData.FirstName = parts[0] || '';
      updateData.MiddleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : null;
      updateData.LastName = parts.length > 1 ? parts[parts.length - 1] : null;
    }

    if (data.email !== undefined) {
      const existing = await prisma.user.findUnique({ where: { Email: data.email } });
      if (existing && existing.UserId !== userId) throw new AppError('Email sudah digunakan', 400);
      updateData.Email = data.email;
    }

    if (data.roleName !== undefined) {
      const role = await prisma.role.findUnique({ where: { RoleName: data.roleName } });
      if (!role) throw new AppError('Role tidak ditemukan', 400);
      updateData.RoleId = role.RoleId;
    }

    await prisma.user.update({ where: { UserId: userId }, data: updateData });

    return { message: 'User berhasil diperbarui' };
  }

  /**
   * POST /api/pemerintah/users/:userId/reset-password
   * Generate random password, hash, save, return plaintext
   */
  async resetPassword(userId: number) {
    const user = await prisma.user.findUnique({ where: { UserId: userId } });
    if (!user) throw new AppError('Pengguna tidak ditemukan', 404);

    const plainPassword = `Agri${Math.random().toString(36).slice(2, 8)}`;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await prisma.user.update({
      where: { UserId: userId },
      data: { HashedPassword: hashedPassword },
    });

    return { newPassword: plainPassword };
  }

  /**
   * POST /api/pemerintah/users/:userId/toggle-status
   * Toggle between Active and Rejected
   */
  async toggleUserStatus(userId: number) {
    const user = await prisma.user.findUnique({ where: { UserId: userId } });
    if (!user) throw new AppError('Pengguna tidak ditemukan', 404);
    if (user.Status === 'Pending') throw new AppError('User pending tidak bisa dinonaktifkan', 400);

    const newStatus = user.Status === 'Active' ? 'Rejected' : 'Active';

    await prisma.user.update({
      where: { UserId: userId },
      data: { Status: newStatus },
    });

    return { newStatus };
  }

  /**
   * Get stock time series for dashboard chart
   * Returns weekly cumulative data for: distributor stock, pengecer stock, redeemed (petani)
   */
  async getStockTimeSeries(weeks: number = 52) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);
    const startStr = startDate.toISOString().split('T')[0];

    // 1. Weekly shipments from distributors
    const shipmentsRaw = await prisma.$queryRaw<any[]>`
      SELECT
        DATEADD(DAY, (DATEDIFF(DAY, '1900-01-01', TimestampDikirim) / 7) * 7, '1900-01-01') AS tanggalMulai,
        SUM(JumlahDikirim) AS total
      FROM trans.KIRIMAN_PUPUK
      WHERE TimestampDikirim >= ${startStr}
      GROUP BY DATEADD(DAY, (DATEDIFF(DAY, '1900-01-01', TimestampDikirim) / 7) * 7, '1900-01-01')
      ORDER BY tanggalMulai
    `;

    // 2. Weekly received by pengecer
    const receivedRaw = await prisma.$queryRaw<any[]>`
      SELECT
        DATEADD(DAY, (DATEDIFF(DAY, '1900-01-01', TimestampDiterima) / 7) * 7, '1900-01-01') AS tanggalMulai,
        SUM(JumlahDiterima) AS total
      FROM trans.KIRIMAN_PUPUK
      WHERE TimestampDiterima IS NOT NULL
        AND TimestampDiterima >= ${startStr}
      GROUP BY DATEADD(DAY, (DATEDIFF(DAY, '1900-01-01', TimestampDiterima) / 7) * 7, '1900-01-01')
      ORDER BY tanggalMulai
    `;

    // 3. Weekly redemptions
    const redeemedRaw = await prisma.$queryRaw<any[]>`
      SELECT
        DATEADD(DAY, (DATEDIFF(DAY, '1900-01-01', TimestampPenebusan) / 7) * 7, '1900-01-01') AS tanggalMulai,
        SUM(Jumlah) AS total
      FROM trans.PENEBUSAN_PUPUK
      WHERE Status = 'Selesai'
        AND TimestampPenebusan >= ${startStr}
      GROUP BY DATEADD(DAY, (DATEDIFF(DAY, '1900-01-01', TimestampPenebusan) / 7) * 7, '1900-01-01')
      ORDER BY tanggalMulai
    `;

    // Build week range (last N weeks, Monday of each week)
    const weekRange: string[] = [];
    const toWeekKey = (d: Date): string => {
      const monday = new Date(d);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(monday.getDate() + diff);
      return monday.toISOString().split('T')[0];
    };

    const today = new Date();
    const currentMonday = new Date(toWeekKey(today));
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() - i * 7);
      weekRange.push(d.toISOString().split('T')[0]);
    }

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const toMap = (arr: any[]) => {
      const m = new Map<string, number>();
      arr.forEach((r: any) => {
        const d = r.tanggalMulai instanceof Date ? r.tanggalMulai : new Date(r.tanggalMulai);
        m.set(formatDate(d), Number(r.total) || 0);
      });
      return m;
    };

    const shipmentsMap = toMap(shipmentsRaw);
    const receivedMap = toMap(receivedRaw);
    const redeemedMap = toMap(redeemedRaw);

    let cumShipments = 0;
    let cumReceived = 0;
    let cumRedeemed = 0;

    const series = weekRange.map((tanggalMulai) => {
      cumShipments += shipmentsMap.get(tanggalMulai) || 0;
      cumReceived += receivedMap.get(tanggalMulai) || 0;
      cumRedeemed += redeemedMap.get(tanggalMulai) || 0;

      const distributorStock = cumShipments - cumReceived;
      const pengecerStock = cumReceived - cumRedeemed;

      return {
        tanggalMulai,
        distributorKg: Math.max(0, distributorStock),
        pengecerKg: Math.max(0, pengecerStock),
        petaniKg: cumRedeemed,
      };
    });

    return { series };
  }

  /**
   * Get users sorted by nonaktifkan criteria for government user management
   * Distributor: sorted by most mismatched shipments DESC
   * Pengecer: sorted by ratio of stock / redemptions DESC (high stock, low redemption)
   */
  async getNonaktifkanCandidates(role: string) {
    if (role === 'DISTRIBUTOR') {
      const result = await prisma.$queryRaw<any[]>`
        SELECT
          u.UserId,
          u.FirstName,
          u.MiddleName,
          u.LastName,
          u.Email,
          ISNULL(mismatch.total, 0) AS totalMismatch
        FROM master.[USER] u
        LEFT JOIN (
          SELECT UserIdDistributor AS userId, COUNT(*) AS total
          FROM trans.KIRIMAN_PUPUK
          WHERE Status = 'Tidak Sesuai'
          GROUP BY UserIdDistributor
        ) mismatch ON u.UserId = mismatch.userId
        WHERE u.RoleId = (SELECT RoleId FROM ref.ROLE WHERE RoleName = 'DISTRIBUTOR')
          AND u.Status = 'Active'
        ORDER BY totalMismatch DESC, u.FirstName ASC
      `;
      return result.map((r: any) => ({
        userId: Number(r.UserId),
        namaLengkap: [r.FirstName, r.MiddleName, r.LastName].filter(Boolean).join(' '),
        email: r.Email,
        totalMismatch: Number(r.totalMismatch),
      }));
    }

    if (role === 'PENGECER') {
      const result = await prisma.$queryRaw<any[]>`
        SELECT
          u.UserId,
          u.FirstName,
          u.MiddleName,
          u.LastName,
          u.Email,
          ISNULL(stk.jumlah, 0) AS totalStock,
          ISNULL(red.total, 0) AS totalRedemption
        FROM master.[USER] u
        LEFT JOIN (
          SELECT UserId, SUM(Jumlah) AS jumlah
          FROM trans.STOK
          GROUP BY UserId
        ) stk ON u.UserId = stk.UserId
        LEFT JOIN (
          SELECT UserIdPengecer AS userId, SUM(Jumlah) AS total
          FROM trans.PENEBUSAN_PUPUK
          WHERE Status = 'Selesai'
          GROUP BY UserIdPengecer
        ) red ON u.UserId = red.userId
        WHERE u.RoleId = (SELECT RoleId FROM ref.ROLE WHERE RoleName = 'PENGECER')
          AND u.Status = 'Active'
        ORDER BY
          CASE WHEN ISNULL(red.total, 0) = 0 THEN 999999 ELSE ISNULL(stk.jumlah, 0) / red.total END DESC,
          ISNULL(stk.jumlah, 0) DESC,
          u.FirstName ASC
      `;
      return result.map((r: any) => ({
        userId: Number(r.UserId),
        namaLengkap: [r.FirstName, r.MiddleName, r.LastName].filter(Boolean).join(' '),
        email: r.Email,
        totalStock: Number(r.totalStock),
        totalRedemption: Number(r.totalRedemption),
        ratio: Number(r.totalRedemption) > 0
          ? Number((Number(r.totalStock) / Number(r.totalRedemption)).toFixed(2))
          : Number(r.totalStock) > 0 ? 999.99 : 0,
      }));
    }

    return [];
  }

  /**
   * Get help requests (bantuan)
   * SP: dbo.usp_GetPemerintahBantuan
   */
  async getHelpRequests(pageNumber: number = 1) {
    const result = await prisma.$queryRaw<any[]>`
      EXEC dbo.usp_GetPemerintahBantuan @PageNumber = ${pageNumber}
    `;

    // Serialize BigInt fields to string/number
    return result.map((r: any) => ({
      ...r,
      No: r.No !== undefined ? Number(r.No) : undefined,
      TotalRows: r.TotalRows !== undefined ? Number(r.TotalRows) : undefined,
    }));
  }
}
