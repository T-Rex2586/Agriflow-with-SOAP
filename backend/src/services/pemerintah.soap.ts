import prisma from '../database/prisma';

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

export interface GetDashboardPemerintahArgs {
  TahunAwal?: number;
  TahunAkhir?: number;
}

export interface GetPendingUsersArgs {
  Page?: number;
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
  BatasKg?: number;
}

export async function getDashboardPemerintahSoap(args: GetDashboardPemerintahArgs) {
  try {
    const { TahunAwal, TahunAkhir } = args;

    const whereClause: any = {
      Status: { in: ['Selesai', 'Berhasil'] },
    };

    if (TahunAwal) {
      whereClause.TimestampPenebusan = {
        gte: new Date(`${TahunAwal}-01-01`),
      };
    }
    if (TahunAkhir) {
      whereClause.TimestampPenebusan = {
        ...(whereClause.TimestampPenebusan || {}),
        lt: new Date(`${TahunAkhir + 1}-01-01`),
      };
    }

    const [tebusAggregate, kuotaAggregate] = await Promise.all([
      prisma.penebusanPupuk.aggregate({
        _sum: { Jumlah: true },
        where: whereClause,
      }),
      prisma.kuotaPetani.aggregate({
        _sum: { SisaKuota: true },
      }),
    ]);

    const totalDitebusKg = Number(tebusAggregate._sum.Jumlah || 0);
    const totalSisaKuotaKg = Number(kuotaAggregate._sum.SisaKuota || 0);
    const totalAlokasiKg = totalDitebusKg + totalSisaKuotaKg;

    const totalTerserapTon = totalDitebusKg / 1000;
    const realisasiPersen =
      totalAlokasiKg > 0 ? ((totalDitebusKg / totalAlokasiKg) * 100).toFixed(2) + '%' : '0.00%';

    return {
      TotalTerserapTon: Number(totalTerserapTon.toFixed(2)),
      TotalSisaKuotaKg: Number(totalSisaKuotaKg.toFixed(2)),
      TotalAlokasiKg: Number(totalAlokasiKg.toFixed(2)),
      RealisasiPersen: realisasiPersen,
    };
  } catch (error: any) {
    return {
      TotalTerserapTon: 0,
      TotalSisaKuotaKg: 0,
      TotalAlokasiKg: 0,
      RealisasiPersen: '0.00%',
    };
  }
}

export async function getPendingUsersSoap(_args: GetPendingUsersArgs) {
  try {
    const users = await prisma.user.findMany({
      where: {
        Status: 'Pending',
      },
      include: {
        Role: true,
      },
      orderBy: {
        CreatedAt: 'desc',
      },
    });

    const listUsers = users.map((u) => {
      const nama = [u.FirstName, u.MiddleName, u.LastName].filter(Boolean).join(' ');
      return {
        UserId: u.UserId,
        NamaLengkap: nama,
        Email: u.Email,
        Role: u.Role.RoleName,
        Status: u.Status,
        TanggalDaftar: u.CreatedAt.toISOString(),
      };
    });

    return {
      Total: listUsers.length,
      ListUsers: listUsers,
    };
  } catch (error: any) {
    return {
      Total: 0,
      ListUsers: [],
    };
  }
}

export async function approveUserSoap(args: ApproveUserArgs) {
  try {
    const { UserId, ApproverId } = args;
    const targetUserId = Number(UserId);
    const approverIdNum = Number(ApproverId);

    if (!targetUserId || !approverIdNum) {
      return {
        Success: false,
        Message: 'UserId dan ApproverId wajib diisi',
      };
    }

    const user = await prisma.user.findUnique({
      where: { UserId: targetUserId },
    });

    if (!user) {
      return {
        Success: false,
        Message: 'Pengguna tidak ditemukan',
      };
    }

    await prisma.user.update({
      where: { UserId: targetUserId },
      data: {
        Status: 'Active',
        UserIdPenyetuju: approverIdNum,
        TimestampDisetujui: new Date(),
      },
    });

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          'APPROVE_USER',
          ${esc(`Pemerintah (ID: ${approverIdNum}) menyetujui akun: ${user.Email}`)},
          ${approverIdNum},
          GETDATE()
        )
      `);
    } catch (logErr: any) {
      console.error('[SOAP-LOG-ERROR]', logErr?.message);
    }

    return {
      Success: true,
      Message: `Akun ${user.Email} berhasil disetujui dan diaktifkan via SOAP`,
      UserId: targetUserId,
      Status: 'Active',
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: `Gagal menyetujui akun: ${error.message}`,
    };
  }
}

export async function rejectUserSoap(args: RejectUserArgs) {
  try {
    const { UserId, ApproverId, Alasan } = args;
    const targetUserId = Number(UserId);
    const approverIdNum = Number(ApproverId);

    if (!targetUserId || !approverIdNum) {
      return {
        Success: false,
        Message: 'UserId dan ApproverId wajib diisi',
      };
    }

    const user = await prisma.user.findUnique({
      where: { UserId: targetUserId },
    });

    if (!user) {
      return {
        Success: false,
        Message: 'Pengguna tidak ditemukan',
      };
    }

    await prisma.user.update({
      where: { UserId: targetUserId },
      data: {
        Status: 'Rejected',
        UserIdPenyetuju: approverIdNum,
        TimestampDisetujui: new Date(),
      },
    });

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          'REJECT_USER',
          ${esc(`Pemerintah menolak akun: ${user.Email}. Alasan: ${Alasan || '-'}`)},
          ${approverIdNum},
          GETDATE()
        )
      `);
    } catch (logErr: any) {
      console.error('[SOAP-LOG-ERROR]', logErr?.message);
    }

    return {
      Success: true,
      Message: `Akun ${user.Email} telah ditolak via SOAP`,
      UserId: targetUserId,
      Status: 'Rejected',
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: `Gagal menolak akun: ${error.message}`,
    };
  }
}

export async function getDeteksiAnomaliSoap(args: GetDeteksiAnomaliArgs) {
  try {
    const threshold = Number(args.BatasKg || 150); // Default threshold 150 kg

    const anomaliRecords = await prisma.penebusanPupuk.findMany({
      where: {
        Jumlah: {
          gt: threshold,
        },
      },
      include: {
        Pupuk: true,
        Petani: true,
        Pengecer: true,
      },
      orderBy: {
        Jumlah: 'desc',
      },
      take: 20,
    });

    const listAnomali = anomaliRecords.map((a) => {
      const namaPetani = [a.Petani?.FirstName, a.Petani?.MiddleName, a.Petani?.LastName]
        .filter(Boolean).join(' ');
      const namaPengecer = [a.Pengecer?.FirstName, a.Pengecer?.MiddleName, a.Pengecer?.LastName]
        .filter(Boolean).join(' ');

      return {
        TebusanId: a.TebusanId,
        PetaniId: a.PetaniId,
        NamaPetani: namaPetani,
        NamaPengecer: namaPengecer,
        PupukId: a.PupukId,
        NamaPupuk: a.Pupuk?.JenisPupuk || `Pupuk #${a.PupukId}`,
        JumlahKg: Number(a.Jumlah),
        AlasanAnomali: `Penebusan sebesar ${a.Jumlah} kg melebihi batas wajar harian (${threshold} kg)`,
        Timestamp: a.TimestampPenebusan.toISOString(),
      };
    });

    return {
      TotalAnomali: listAnomali.length,
      BatasAmbangKg: threshold,
      ListAnomali: listAnomali,
    };
  } catch (error: any) {
    return {
      TotalAnomali: 0,
      BatasAmbangKg: Number(args.BatasKg || 150),
      ListAnomali: [],
    };
  }
}
