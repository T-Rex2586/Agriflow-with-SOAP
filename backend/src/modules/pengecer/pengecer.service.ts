import prisma from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';
import { isBeforeDate } from '../../utils/date.util';

function esc(val: string | null | undefined): string {
  if (val == null) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

function extractSqlError(message: string): string {
  const match = message.match(/Message: `(.+?)`/)
  return match ? match[1] : message
}

/**
 * Pengecer (Retailer) Service
 * Handles all retailer-related business logic using stored procedures
 */
export class PengecerService {
  /**
   * Get pengecer dashboard data
   * Composed from individual queries (avoiding multi-result-set SP limitation)
   */
  async getDashboard(userId: number) {
    const [stockRows, farmerCount, sisaKuotaRows, recentReceipts, recentRedemptions, notifications] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(Jumlah), 0) AS totalStock
        FROM trans.STOK WHERE UserId = ${userId}
      `,
      prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS totalPetani
        FROM master.PETANI WHERE UserIdPengecer = ${userId}
      `,
      prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(kp.SisaKuota), 0) AS totalSisaKuota
        FROM master.KUOTA_PETANI kp
        JOIN master.PETANI p ON kp.PetaniId = p.PetaniId
        WHERE p.UserIdPengecer = ${userId}
      `,
      prisma.$queryRaw<any[]>`
        SELECT TOP 5
          k.KirimanId AS kirimanId,
          p.JenisPupuk AS jenisPupuk,
          k.JumlahDikirim AS jumlahDikirim,
          k.TimestampDikirim AS timestampDikirim,
          k.Status AS status
        FROM trans.KIRIMAN_PUPUK k
        JOIN master.PUPUK p ON k.PupukId = p.PupukId
        WHERE k.UserIdPengecer = ${userId}
        ORDER BY k.TimestampDikirim DESC
      `,
      prisma.$queryRaw<any[]>`
        SELECT TOP 5
          pb.TebusanId AS tebusanId,
          p.JenisPupuk AS jenisPupuk,
          pb.Jumlah AS jumlah,
          pb.TimestampPenebusan AS timestampPenebusan,
          pb.Status AS status,
          pt.FirstName AS petaniNama
        FROM trans.PENEBUSAN_PUPUK pb
        JOIN master.PUPUK p ON pb.PupukId = p.PupukId
        JOIN master.PETANI pt ON pb.PetaniId = pt.PetaniId
        WHERE pb.UserIdPengecer = ${userId}
        ORDER BY pb.TimestampPenebusan DESC
      `,
      prisma.$queryRaw<any[]>`EXEC dbo.usp_GetPengecerNotifikasi @UserId = ${userId}`,
    ]);

    return {
      summary: {
        totalStock: Number(stockRows[0]?.totalStock ?? 0),
        totalPetani: Number(farmerCount[0]?.totalPetani ?? 0),
        totalSisaKuota: Number(sisaKuotaRows[0]?.totalSisaKuota ?? 0),
      },
      notifications: (notifications || []).map(r => ({
        notifikasiId: String(r.NotifikasiId ?? ''),
        judul: r.JudulNotifikasi || r.Judul || '',
        pesan: r.PesanNotifikasi || r.Pesan || '',
        timestamp: r.TanggalNotifikasi || r.Timestamp || null,
        statusDibaca: Boolean(r.StatusDibaca),
        jenis: r.Jenis || r.JenisNotifikasi || '',
      })),
      recentReceipts: (recentReceipts || []).map(r => ({
        kirimanId: String(r.kirimanId ?? ''),
        jenisPupuk: r.jenisPupuk || '',
        jumlahDikirim: Number(r.jumlahDikirim ?? 0),
        timestampDikirim: r.timestampDikirim || null,
        status: r.status || '',
      })),
      recentRedemptions: (recentRedemptions || []).map(r => ({
        tebusanId: String(r.tebusanId ?? ''),
        jenisPupuk: r.jenisPupuk || '',
        jumlah: Number(r.jumlah ?? 0),
        timestampPenebusan: r.timestampPenebusan || null,
        status: r.status || '',
        petani: r.petaniNama || '',
      })),
    };
  }

  /**
   * Get recent receipts
   * SP: dbo.usp_GetPengecerRecentPenerimaan
   */
  async getRecentReceipts(userId: number) {
    const result = await prisma.$queryRaw<any[]>`
      EXEC dbo.usp_GetPengecerRecentPenerimaan @UserIdPengecer = ${userId}
    `;

    return result;
  }

  /**
   * Validate shipment for receiving
   * SP: dbo.usp_ValidateKirimanForPengecer
   */
  async validateShipment(userId: number, kirimanId: number) {
    const result = await prisma.$queryRaw<any[]>`
      EXEC dbo.usp_ValidateKirimanForPengecer
        @UserIdPengecer = ${userId},
        @KirimanId = ${kirimanId}
    `;

    const validation = result[0];

    if (!validation.IsValid) {
      throw new AppError(validation.Message, 400);
    }

    return validation;
  }

  /**
   * GET /api/pengecer/kiriman/search
   * Search incoming shipments by ID or distributor name
   */
  async searchKiriman(userId: number, query: string) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT
          k.KirimanId,
          k.JumlahDikirim,
          k.TimestampDikirim,
          k.Status,
          p.JenisPupuk,
          u.FirstName AS distFirstName,
          u.MiddleName AS distMiddleName,
          u.LastName AS distLastName
        FROM trans.KIRIMAN_PUPUK k
        JOIN master.PUPUK p ON k.PupukId = p.PupukId
        JOIN [master].[USER] u ON k.UserIdDistributor = u.UserId
        WHERE k.UserIdPengecer = ${userId}
          AND (
            CAST(k.KirimanId AS NVARCHAR(20)) LIKE ${`%${query}%`}
            OR u.FirstName LIKE ${`%${query}%`}
            OR u.MiddleName LIKE ${`%${query}%`}
            OR u.LastName LIKE ${`%${query}%`}
          )
        ORDER BY k.TimestampDikirim DESC
      `;

      return (result || []).map(r => ({
        kirimanId: String(r.KirimanId ?? ''),
        jenisPupuk: r.JenisPupuk || '',
        jumlahDikirim: Number(r.JumlahDikirim ?? 0),
        timestampDikirim: r.TimestampDikirim || null,
        status: r.Status || '',
        distributor: [r.distFirstName, r.distMiddleName, r.distLastName].filter(Boolean).join(' '),
      }));
    } catch (error: any) {
      throw new AppError('Gagal mencari pengiriman', 500);
    }
  }

  /**
   * Receive shipment from distributor
   */
  async receiveShipment(data: {
    pengecerId: number;
    kirimanId: number;
    jumlahDiterima: number;
    timestampDiterima?: Date;
  }) {
    if (data.jumlahDiterima <= 0) {
      throw new AppError('Jumlah diterima harus lebih dari 0', 400);
    }

    const timestampStr = data.timestampDiterima
      ? `'${data.timestampDiterima.toISOString()}'`
      : 'NULL';

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Get shipment data with pupuk info
      const [shipment] = await tx.$queryRaw<any[]>`
        SELECT k.KirimanId, k.PupukId, k.UserIdDistributor, k.JumlahDikirim, k.TimestampDikirim, p.JenisPupuk
        FROM trans.KIRIMAN_PUPUK k
        JOIN master.PUPUK p ON k.PupukId = p.PupukId
        WHERE k.KirimanId = ${data.kirimanId} AND k.UserIdPengecer = ${data.pengecerId}
      `;

      if (!shipment) {
        throw new AppError('Pengiriman tidak ditemukan', 400);
      }

      if (shipment.Status && shipment.Status !== 'Dikirim') {
        throw new AppError('Pengiriman sudah diterima sebelumnya', 400);
      }

      const finalTimestampDiterima = data.timestampDiterima || new Date();
      if (shipment.TimestampDikirim && isBeforeDate(finalTimestampDiterima, shipment.TimestampDikirim)) {
        throw new AppError('Tanggal diterima tidak boleh lebih awal dari tanggal pengiriman', 400);
      }

      // 2. Determine status
      const status = Number(data.jumlahDiterima) === Number(shipment.JumlahDikirim)
        ? 'Diterima'
        : 'Tidak Sesuai';

      // 3. Update KIRIMAN_PUPUK
      await tx.$executeRawUnsafe(`
        UPDATE trans.KIRIMAN_PUPUK
        SET Status = '${status}',
            JumlahDiterima = ${data.jumlahDiterima},
            TimestampDiterima = ${timestampStr}
        WHERE KirimanId = ${data.kirimanId}
      `);

      // 4. Get current stock
      const [existingStock] = await tx.$queryRaw<any[]>`
        SELECT Jumlah FROM trans.STOK
        WHERE UserId = ${data.pengecerId} AND PupukId = ${shipment.PupukId}
      `;

      const jumlahAwal = existingStock ? Number(existingStock.Jumlah) : 0;
      const jumlahAkhir = jumlahAwal + Number(data.jumlahDiterima);

      // 5. Upsert STOK
      if (existingStock) {
        await tx.$executeRawUnsafe(`
          UPDATE trans.STOK
          SET Jumlah = ${jumlahAkhir}, Timestamp = GETDATE()
          WHERE UserId = ${data.pengecerId} AND PupukId = ${shipment.PupukId}
        `);
      } else {
        await tx.$executeRawUnsafe(`
          INSERT INTO trans.STOK (UserId, PupukId, Jumlah, Timestamp)
          VALUES (${data.pengecerId}, ${shipment.PupukId}, ${data.jumlahDiterima}, GETDATE())
        `);
      }

      // 6. Insert RIWAYAT_STOK
      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${data.pengecerId},
          ${shipment.PupukId},
          ${jumlahAwal},
          ${jumlahAkhir},
          'Stok Masuk',
          GETDATE()
        )
      `);

      // 7. Get names for notification
      const getNama = async (userId: number) => {
        const [user] = await tx.$queryRaw<any[]>`
          SELECT FirstName, MiddleName, LastName FROM master.[USER] WHERE UserId = ${userId}
        `;
        if (!user) return `User #${userId}`;
        return [user.FirstName, user.MiddleName, user.LastName].filter(Boolean).join(' ') || `User #${userId}`;
      };

      const [namaDistributor, namaPengecer] = await Promise.all([
        getNama(shipment.UserIdDistributor),
        getNama(data.pengecerId),
      ]);

      const isSesuai = status === 'Diterima';
      const statusNotif = isSesuai ? 'diterima sesuai' : 'diterima tidak sesuai';
      const pesanPengecer = `Kiriman #${data.kirimanId} (${shipment.JenisPupuk}) ${statusNotif}. Dikirim: ${Number(shipment.JumlahDikirim).toFixed(2)} kg, Diterima: ${Number(data.jumlahDiterima).toFixed(2)} kg`;

      // Truncate to fit NVARCHAR(100)
      const maxLen = 100;
      const truncatedPengecer = pesanPengecer.slice(0, maxLen);
      const pesanDistributor = `Kiriman #${data.kirimanId} (${shipment.JenisPupuk}) ${statusNotif} oleh ${namaPengecer}. Dikirim: ${Number(shipment.JumlahDikirim).toFixed(2)} kg, Diterima: ${Number(data.jumlahDiterima).toFixed(2)} kg`;
      const truncatedDistributor = pesanDistributor.slice(0, maxLen);

      // Insert notification for pengecer (only for mismatch)
      if (status === 'Tidak Sesuai') {
        const [notifIdPengecer] = await tx.$queryRaw<any[]>`
          SELECT ISNULL(MAX(NotifikasiId), 0) + 1 AS nextId FROM evt.NOTIFIKASI WITH (TABLOCKX)
        `;
        await tx.$executeRawUnsafe(`
          INSERT INTO evt.NOTIFIKASI (NotifikasiId, Jenis, Judul, Pesan, StatusDibaca, UserId, Timestamp)
          VALUES (${Number(notifIdPengecer.nextId)}, 'KETIDAKSESUAIAN', 'Penerimaan Tidak Sesuai', ${esc(truncatedPengecer)}, 0, ${data.pengecerId}, GETDATE())
        `);

        // Insert notification for distributor
        const [notifIdDistributor] = await tx.$queryRaw<any[]>`
          SELECT ISNULL(MAX(NotifikasiId), 0) + 1 AS nextId FROM evt.NOTIFIKASI WITH (TABLOCKX)
        `;
        await tx.$executeRawUnsafe(`
          INSERT INTO evt.NOTIFIKASI (NotifikasiId, Jenis, Judul, Pesan, StatusDibaca, UserId, Timestamp)
          VALUES (${Number(notifIdDistributor.nextId)}, 'KETIDAKSESUAIAN', 'Penerimaan Tidak Sesuai', ${esc(truncatedDistributor)}, 0, ${shipment.UserIdDistributor}, GETDATE())
        `);
      }

      // 8. Insert LOG_AKTIVITAS
      await tx.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          'RECEIVE_SHIPMENT',
          ${esc(`Pengecer menerima kiriman #${data.kirimanId} (${shipment.JenisPupuk}) - ${status}`)},
          ${data.pengecerId},
          GETDATE()
        )
      `);

      // Format timestamp for display
      const ts = data.timestampDiterima || new Date();
      const dd = String(ts.getDate()).padStart(2, '0');
      const mm = String(ts.getMonth() + 1).padStart(2, '0');
      const yyyy = ts.getFullYear();
      const hh = String(ts.getHours()).padStart(2, '0');
      const min = String(ts.getMinutes()).padStart(2, '0');

      return {
        KirimanId: data.kirimanId,
        JenisPupuk: shipment.JenisPupuk,
        JumlahPupuk: Number(data.jumlahDiterima).toFixed(2),
        WaktuPenerimaan: `${dd}/${mm}/${yyyy} | ${hh}:${min}`,
        StatusPenerimaan: status,
      };
    });

    return result;
  }

  /**
   * Get stock dashboard with pagination
   * Composed from individual queries (avoiding multi-result-set SP limitation)
   */
  async getStockDashboard(
    userId: number,
    pageNumber: number = 1,
    sortColumn: 'JumlahStok' | 'LastUpdated' = 'LastUpdated',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ) {
    const [totalRows, stockItems] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(Jumlah), 0) AS totalStockTon
        FROM trans.STOK WHERE UserId = ${userId}
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          s.PupukId AS pupukId,
          p.JenisPupuk AS jenisPupuk,
          s.Jumlah AS jumlahStok,
          s.Timestamp AS lastUpdated
        FROM trans.STOK s
        JOIN master.PUPUK p ON s.PupukId = p.PupukId
        WHERE s.UserId = ${userId}
        ORDER BY s.Timestamp DESC
      `,
    ]);

    return {
      totalStockTon: totalRows[0]?.totalStockTon ?? 0,
      stockItems: stockItems || [],
    };
  }

  /**
   * Add incoming stock
   * SP: dbo.usp_TambahStokPengecer
   */
  async addStock(data: {
    userId: number;
    pupukId: number;
    jumlahMasuk: number;
    waktu?: Date;
  }) {
    try {
      if (data.jumlahMasuk <= 0) {
        throw new AppError('Jumlah stok masuk harus lebih dari 0', 400);
      }

      const waktuParam = data.waktu ? data.waktu.toISOString() : null;

      const result = await prisma.$queryRaw<any[]>`
        EXEC dbo.usp_TambahStokPengecer
          @UserId = ${data.userId},
          @PupukId = ${data.pupukId},
          @JumlahMasuk = ${data.jumlahMasuk},
          @Waktu = ${waktuParam}
      `;

      return result[0];
    } catch (error: any) {
      throw new AppError(extractSqlError(error.message), 400);
    }
  }

  /**
   * Get receipt history (incoming stock)
   */
  async getReceiptHistory(userId: number, pageNumber: number = 1) {
    const [summary, receipts] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT
          COUNT(*) AS totalPenerimaan,
          COALESCE(SUM(JumlahDikirim), 0) AS totalJumlah,
          COALESCE(SUM(CASE WHEN Status = 'Tidak Sesuai' THEN 1 ELSE 0 END), 0) AS totalMismatch
        FROM trans.KIRIMAN_PUPUK
        WHERE UserIdPengecer = ${userId}
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          k.KirimanId AS kirimanId,
          p.JenisPupuk AS jenisPupuk,
          k.JumlahDikirim AS jumlahDikirim,
          k.JumlahDiterima AS jumlahDiterima,
          k.TimestampDikirim AS timestampDikirim,
          k.TimestampDiterima AS timestampDiterima,
          k.Status AS status,
          u.FirstName AS distributorNamaDepan,
          u.MiddleName AS distributorNamaTengah,
          u.LastName AS distributorNamaBelakang
        FROM trans.KIRIMAN_PUPUK k
        JOIN master.PUPUK p ON k.PupukId = p.PupukId
        JOIN [master].[USER] u ON k.UserIdDistributor = u.UserId
        WHERE k.UserIdPengecer = ${userId}
        ORDER BY k.TimestampDikirim DESC
      `,
    ]);

    return {
      summary: {
        totalPenerimaan: Number(summary[0]?.totalPenerimaan ?? 0),
        totalJumlah: Number(summary[0]?.totalJumlah ?? 0),
        totalMismatch: Number(summary[0]?.totalMismatch ?? 0),
      },
      receipts: (receipts || []).map(r => ({
        kirimanId: String(r.kirimanId ?? ''),
        jenisPupuk: r.jenisPupuk || '',
        jumlahDikirim: Number(r.jumlahDikirim ?? 0),
        jumlahDiterima: r.jumlahDiterima != null ? Number(r.jumlahDiterima) : null,
        timestampDikirim: r.timestampDikirim || null,
        timestampDiterima: r.timestampDiterima || null,
        status: r.status || '',
        distributor: [r.distributorNamaDepan, r.distributorNamaTengah, r.distributorNamaBelakang].filter(Boolean).join(' ') || '',
      })),
    };
  }

  /**
   * Get redemption history
   */
  async getRedemptionHistory(userId: number, pageNumber: number = 1) {
    const [summary, redemptions] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT
          COUNT(*) AS totalPenebusan,
          COALESCE(SUM(Jumlah), 0) AS totalJumlah
        FROM trans.PENEBUSAN_PUPUK
        WHERE UserIdPengecer = ${userId}
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          pb.TebusanId AS tebusanId,
          p.JenisPupuk AS jenisPupuk,
          pb.Jumlah AS jumlah,
          pb.TimestampPenebusan AS timestampPenebusan,
          pb.Status AS status,
          pt.FirstName AS petaniNamaDepan,
          pt.LastName AS petaniNamaBelakang
        FROM trans.PENEBUSAN_PUPUK pb
        JOIN master.PUPUK p ON pb.PupukId = p.PupukId
        JOIN master.PETANI pt ON pb.PetaniId = pt.PetaniId
        WHERE pb.UserIdPengecer = ${userId}
        ORDER BY pb.TimestampPenebusan DESC
      `,
    ]);

    return {
      summary: {
        totalPenebusan: Number(summary[0]?.totalPenebusan ?? 0),
        totalJumlah: Number(summary[0]?.totalJumlah ?? 0),
      },
      redemptions: (redemptions || []).map(r => ({
        tebusanId: String(r.tebusanId ?? ''),
        jenisPupuk: r.jenisPupuk || '',
        jumlah: Number(r.jumlah ?? 0),
        timestampPenebusan: r.timestampPenebusan || null,
        status: r.status || '',
        petani: [r.petaniNamaDepan, r.petaniNamaBelakang].filter(Boolean).join(' ') || '',
      })),
    };
  }

  /**
   * Get notifications with pagination
   * SP: dbo.usp_GetPengecerNotifikasi
   */
  async getNotifications(userId: number, pageNumber: number = 1) {
    const rows = await prisma.$queryRaw<any[]>`
      EXEC dbo.usp_GetPengecerNotifikasi
        @UserId = ${userId},
        @PageNumber = ${pageNumber}
    `;

    return (rows || []).map(r => ({
      notifikasiId: String(r.NotifikasiId ?? ''),
      id: r.NotifikasiId,
      judul: r.JudulNotifikasi || r.Judul || '',
      pesan: r.PesanNotifikasi || r.Pesan || '',
      timestamp: r.TanggalNotifikasi || r.Timestamp || null,
      statusDibaca: Boolean(r.StatusDibaca),
      jenis: r.Jenis || r.JenisNotifikasi || '',
    }));
  }

  /**
   * Validate petani (farmer) for redemption
   * Composed from individual queries (avoiding multi-result-set SP limitation)
   */
  async validatePetani(userId: number, petaniId: string) {
    try {
      const [petaniRows, quotaRows] = await Promise.all([
        prisma.$queryRaw<any[]>`
          SELECT
            PetaniId AS petaniId,
            FirstName AS namaDepan,
            MiddleName AS namaTengah,
            LastName AS namaBelakang,
            NomorHp AS nomorHp,
            Status AS status,
            AwalTerdaftar AS awalTerdaftar,
            AkhirTerdaftar AS akhirTerdaftar
          FROM master.PETANI
          WHERE PetaniId = ${petaniId} AND UserIdPengecer = ${userId}
        `,
        prisma.$queryRaw<any[]>`
          SELECT
            kp.PupukId AS pupukId,
            p.JenisPupuk AS jenisPupuk,
            kp.SisaKuota AS sisaKuota
          FROM master.KUOTA_PETANI kp
          JOIN master.PUPUK p ON kp.PupukId = p.PupukId
          WHERE kp.PetaniId = ${petaniId}
        `,
      ]);

      const petani = petaniRows[0];
      if (!petani) {
        throw new AppError('Petani tidak ditemukan', 400);
      }
      if (petani.status !== 'Aktif' && petani.status !== 'Active') {
        throw new AppError('Petani tidak aktif', 400);
      }

      return {
        petaniDetails: {
          petaniId: petani.petaniId,
          nama: [petani.namaDepan, petani.namaTengah, petani.namaBelakang].filter(Boolean).join(' '),
          nomorHp: petani.nomorHp,
          status: petani.status,
        },
        quotas: (quotaRows || []).map(q => ({
          pupukId: Number(q.pupukId ?? 0),
          jenisPupuk: q.jenisPupuk || '',
          sisaKuota: Number(q.sisaKuota ?? 0),
        })),
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      if (error.message.includes('tidak ditemukan') || error.message.includes('tidak aktif')) {
        throw new AppError(error.message, 400);
      }
      throw error;
    }
  }

  /**
   * Create fertilizer redemption for farmer
   * SP: dbo.usp_CreatePenebusan
   */
  async createRedemption(data: {
    pengecerId: number;
    petaniId: string;
    pupukId: number;
    jumlah: number;
  }) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        EXEC dbo.usp_CreatePenebusan
          @UserIdPengecer = ${data.pengecerId},
          @PetaniId = ${data.petaniId},
          @PupukId = ${data.pupukId},
          @Jumlah = ${data.jumlah}
      `;

      return result[0];
    } catch (error: any) {
      const msg = extractSqlError(error.message);
      if (
        msg.includes('Stok tidak mencukupi') ||
        msg.includes('Kuota tidak mencukupi') ||
        msg.includes('tidak valid')
      ) {
        throw new AppError(msg, 400);
      }
      throw error;
    }
  }

  /**
   * Mark notification as read
   * SP: dbo.usp_MarkNotifikasiDibaca
   */
  async markNotificationRead(notifikasiId: number, userId: number) {
    const result = await prisma.$queryRaw<any[]>`
      EXEC dbo.usp_MarkNotifikasiDibaca
        @NotifikasiId = ${notifikasiId},
        @UserId = ${userId}
    `;

    return result[0];
  }
}
