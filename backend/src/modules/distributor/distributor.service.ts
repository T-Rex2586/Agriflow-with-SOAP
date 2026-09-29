import prisma from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';
import logger from '../../utils/logger';

function extractSqlError(message: string): string {
  const match = message.match(/Message: `(.+?)`/)
  return match ? match[1] : message
}

/**
 * Distributor Service
 * Handles all distributor-related business logic using stored procedures
 * All queries use parameterized queries to prevent SQL injection
 */
export class DistributorService {
  /**
   * Get distributor dashboard data
   * Composed from multiple individual queries (avoiding multi-result-set SP limitation)
   */
  async getDashboard(userId: number) {
    const startTime = Date.now();
    
    try {
      const [stockRows, recentShipments, recentStockOut, notifications] = await Promise.all([
        // 1. Stock summary (total, inbound, outbound)
        prisma.$queryRaw<any[]>`
          SELECT
            COALESCE(SUM(s.Jumlah), 0) AS totalStock,
            COALESCE((
              SELECT SUM(r.JumlahAkhir - r.JumlahAwal)
              FROM trans.RIWAYAT_STOK r
              WHERE r.UserId = ${userId}
                AND r.TipePerubahan = 'Stok Masuk'
            ), 0) AS totalInbound,
            COALESCE((
              SELECT SUM(r.JumlahAwal - r.JumlahAkhir)
              FROM trans.RIWAYAT_STOK r
              WHERE r.UserId = ${userId}
                AND r.TipePerubahan = 'Stok Keluar'
            ), 0) AS totalOutgoing
          FROM trans.STOK s
          WHERE s.UserId = ${userId}
        `,
        // 2. Recent shipments (TOP 3)
        prisma.$queryRaw<any[]>`EXEC dbo.usp_GetRecentKiriman @UserIdDistributor = ${userId}`,
        // 3. Recent stock activity (TOP 4 - union of incoming & outgoing)
        prisma.$queryRaw<any[]>`
          SELECT TOP 4 * FROM (
            SELECT
              CONVERT(NVARCHAR, r.RiwayatId) AS id,
              p.JenisPupuk AS jenisPupuk,
              (r.JumlahAkhir - r.JumlahAwal) AS jumlah,
              FORMAT(r.Timestamp, 'dd/MM/yyyy | HH:mm') AS timestamp,
              'Masuk' AS status
            FROM trans.RIWAYAT_STOK r
            JOIN master.PUPUK p ON r.PupukId = p.PupukId
            WHERE r.UserId = ${userId}
              AND r.TipePerubahan = 'Stok Masuk'

            UNION ALL

            SELECT
              CONVERT(NVARCHAR, k.KirimanId) AS id,
              p.JenisPupuk AS jenisPupuk,
              k.JumlahDikirim AS jumlah,
              FORMAT(k.TimestampDikirim, 'dd/MM/yyyy | HH:mm') AS timestamp,
              'Keluar' AS status
            FROM trans.KIRIMAN_PUPUK k
            JOIN master.PUPUK p ON k.PupukId = p.PupukId
            WHERE k.UserIdDistributor = ${userId}
          ) stok
          ORDER BY timestamp DESC
        `,
        // 4. Notifications (TOP 5, unread only)
        prisma.notifikasi.findMany({
          where: { UserId: userId, StatusDibaca: false },
          orderBy: { Timestamp: 'desc' },
          take: 5,
        }),
      ]);

      logger.info('Dashboard retrieved', {
        userId,
        duration: Date.now() - startTime
      });

      // Fetch status from KIRIMAN_PUPUK for SP results (SP doesn't return status)
      const shipmentIds = (recentShipments || []).map(r => Number(r.KirimanId)).filter(Boolean);
      let statusMap: Record<number, string> = {};
      if (shipmentIds.length > 0) {
        const statusRows = await prisma.kirimanPupuk.findMany({
          where: { KirimanId: { in: shipmentIds } },
          select: { KirimanId: true, Status: true },
        });
        for (const row of statusRows) {
          statusMap[Number(row.KirimanId)] = row.Status || '';
        }
      }

      return {
        stockSummary: stockRows[0] || { totalStock: 0, totalInbound: 0, totalOutgoing: 0 },
        recentShipments: (recentShipments || []).map(r => ({
          kirimanId: String(r.KirimanId ?? ''),
          jenisPupuk: r.NamaPupuk || r.JenisPupuk || '',
          jumlahDikirim: Number(r.JumlahDikirimKg ?? 0),
          timestampDikirim: r.TanggalPengiriman || null,
          status: statusMap[Number(r.KirimanId)] || '',
        })),
        recentStockOut: (recentStockOut || []).map(r => ({
          id: r.id || '',
          jenisPupuk: r.jenisPupuk || '',
          jumlah: Number(r.jumlah ?? 0),
          timestamp: r.timestamp || null,
          status: r.status || '',
        })),
        notifications: (notifications || []).map(r => ({
          notifikasiId: String(r.NotifikasiId),
          judul: r.Judul,
          pesan: r.Pesan || '',
          timestamp: r.Timestamp,
          statusDibaca: Boolean(r.StatusDibaca),
          jenis: r.Jenis,
        })),
      };
    } catch (error: any) {
      logger.error('Failed to get dashboard', { userId, error: error.message });
      throw new AppError('Gagal mengambil data dashboard', 500);
    }
  }

  /**
   * Get recent shipments
   * SP: dbo.usp_GetRecentKiriman
   */
  async getRecentShipments(userId: number) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        EXEC dbo.usp_GetRecentKiriman @UserIdDistributor = ${userId}
      `;
      return result;
    } catch (error: any) {
      logger.error('Failed to get recent shipments', { userId, error: error.message });
      throw new AppError('Gagal mengambil data pengiriman', 500);
    }
  }

  /**
   * GET /api/distributor/pengecer/search
   * Search pengecer by name (partial match)
   */
  async searchPengecer(query: string) {
    try {
      const users = await prisma.user.findMany({
        where: {
          Role: { RoleName: 'PENGECER' },
          ...(query
            ? {
                OR: [
                  { FirstName: { contains: query } },
                  { MiddleName: { contains: query } },
                  { LastName: { contains: query } },
                  ...(isNaN(Number(query)) ? [] : [{ UserId: Number(query) }]),
                ],
              }
            : {}),
        },
        select: {
          UserId: true,
          FirstName: true,
          MiddleName: true,
          LastName: true,
        },
        take: 20,
      });

      return users.map(u => ({
        userId: u.UserId,
        nama: [u.FirstName, u.MiddleName, u.LastName].filter(Boolean).join(' '),
      }));
    } catch (error: any) {
      logger.error('Failed to search pengecer', { query, error: error.message });
      throw new AppError('Gagal mencari pengecer', 500);
    }
  }

  /**
   * Validate pengecer (retailer) before creating shipment
   * SP: dbo.usp_ValidatePengecer
   */
  async validatePengecer(pengecerId: number) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        EXEC dbo.usp_ValidatePengecer @UserIdPengecer = ${pengecerId}
      `;

      const validation = result[0];
      
      if (!validation.IsValid) {
        throw new AppError(validation.Message, 400);
      }

      const user = await prisma.user.findUnique({
        where: { UserId: pengecerId },
        select: { FirstName: true, MiddleName: true, LastName: true },
      });

      const nama = user
        ? [user.FirstName, user.MiddleName, user.LastName].filter(Boolean).join(' ')
        : String(pengecerId);

      return { ...validation, nama };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to validate pengecer', { pengecerId, error: error.message });
      throw new AppError('Gagal validasi pengecer', 500);
    }
  }

  /**
   * Create new shipment to pengecer
   * SP: dbo.usp_CreateKiriman
   */
  async createShipment(data: {
    distributorId: number;
    pengecerId: number;
    pupukId: number;
    jumlah: number;
    timestamp?: Date;
  }) {
    const startTime = Date.now();
    
    try {
      const result = await prisma.$queryRaw<any[]>`
        EXEC dbo.usp_CreateKiriman
          @UserIdDistributor = ${data.distributorId},
          @UserIdPengecer = ${data.pengecerId},
          @PupukId = ${data.pupukId},
          @Jumlah = ${data.jumlah},
          @TimestampKirim = ${data.timestamp || null}
      `;

      logger.info('Shipment created', {
        distributorId: data.distributorId,
        shipmentId: result[0]?.KirimanId,
        duration: Date.now() - startTime
      });

      return result[0];
    } catch (error: any) {
      const msg = extractSqlError(error.message);
      if (msg.includes('Stok tidak mencukupi')) {
        logger.warn('Insufficient stock', { 
          distributorId: data.distributorId, 
          pupukId: data.pupukId 
        });
        throw new AppError(msg, 400);
      }
      
      logger.error('Failed to create shipment', { 
        data, 
        error: error.message 
      });
      throw new AppError('Gagal membuat pengiriman', 500);
    }
  }

  /**
   * Get stock dashboard with pagination
   * Composed from individual queries (avoiding multi-result-set SP limitation)
   */
  async getStockDashboard(userId: number, pageNumber: number = 1) {
    try {
      const [totalRows, stockItems] = await Promise.all([
        prisma.$queryRaw<any[]>`
          SELECT COALESCE(SUM(Jumlah), 0) AS totalStockTon
          FROM trans.STOK
          WHERE UserId = ${userId}
        `,
        prisma.$queryRaw<any[]>`
          SELECT
            s.PupukId AS pupukId,
            p.JenisPupuk AS jenisPupuk,
            s.Jumlah AS jumlah,
            s.Timestamp AS lastUpdated
          FROM trans.STOK s
          JOIN master.PUPUK p ON s.PupukId = p.PupukId
          WHERE s.UserId = ${userId}
          ORDER BY p.JenisPupuk
        `,
      ]);

      return {
        totalStockTon: totalRows[0]?.totalStockTon ?? 0,
        stockItems: stockItems || [],
      };
    } catch (error: any) {
      logger.error('Failed to get stock dashboard', { userId, error: error.message });
      throw new AppError('Gagal mengambil data stok', 500);
    }
  }

  /**
   * Get current stock for specific fertilizer
   * SP: dbo.usp_GetStokPupukSaatIni
   */
  async getCurrentStock(userId: number, pupukId: number) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        EXEC dbo.usp_GetStokPupukSaatIni
          @UserId = ${userId},
          @PupukId = ${pupukId}
      `;

      return result[0];
    } catch (error: any) {
      logger.error('Failed to get current stock', { userId, pupukId, error: error.message });
      throw new AppError('Gagal mengambil data stok', 500);
    }
  }

  /**
   * Adjust stock (add or reduce)
   * SP: dbo.usp_AdjustStokDistributor
   */
  async adjustStock(data: {
    userId: number;
    pupukId: number;
    jumlahPenyesuaian: number;
    waktu?: Date;
  }) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        EXEC dbo.usp_AdjustStokDistributor
          @UserId = ${data.userId},
          @PupukId = ${data.pupukId},
          @JumlahPenyesuaian = ${data.jumlahPenyesuaian},
          @Waktu = ${data.waktu || null}
      `;

      logger.info('Stock adjusted', { 
        userId: data.userId, 
        pupukId: data.pupukId,
        adjustment: data.jumlahPenyesuaian 
      });

      return result[0];
    } catch (error: any) {
      const msg = extractSqlError(error.message);
      if (msg.includes('Stok tidak mencukupi')) {
        throw new AppError(msg, 400);
      }
      logger.error('Failed to adjust stock', { data, error: error.message });
      throw new AppError(msg, 400);
    }
  }

  /**
   * Add incoming stock
   * SP: dbo.usp_TambahStokDistributor
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

      const result = await prisma.$queryRaw<any[]>`
        EXEC dbo.usp_TambahStokDistributor
          @UserId = ${data.userId},
          @PupukId = ${data.pupukId},
          @JumlahMasuk = ${data.jumlahMasuk},
          @Waktu = ${data.waktu || null}
      `;

      logger.info('Stock added', { 
        userId: data.userId, 
        pupukId: data.pupukId,
        amount: data.jumlahMasuk 
      });

      return result[0];
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(extractSqlError(error.message), 400);
    }
  }

  /**
   * Get shipment history with pagination
   * Composed from individual queries (avoiding multi-result-set SP limitation)
   */
  async getShipmentHistory(userId: number, pageNumber: number = 1) {
    try {
      const [summary, shipments] = await Promise.all([
        prisma.$queryRaw<any[]>`
          SELECT
            COUNT(*) AS totalDistributed,
            SUM(CASE WHEN Status IN ('Tidak Sesuai','Ditolak') THEN 1 ELSE 0 END) AS totalMismatch
          FROM trans.KIRIMAN_PUPUK
          WHERE UserIdDistributor = ${userId}
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
            u.FirstName AS pengecerNamaDepan,
            u.MiddleName AS pengecerNamaTengah,
            u.LastName AS pengecerNamaBelakang,
            u.Email AS pengecerEmail
          FROM trans.KIRIMAN_PUPUK k
          JOIN master.PUPUK p ON k.PupukId = p.PupukId
          JOIN [master].[USER] u ON k.UserIdPengecer = u.UserId
          WHERE k.UserIdDistributor = ${userId}
          ORDER BY k.TimestampDikirim DESC
        `,
      ]);

      return {
        summary: {
          totalDistributed: Number(summary[0]?.totalDistributed ?? 0),
          totalMismatch: Number(summary[0]?.totalMismatch ?? 0),
        },
        shipments: (shipments || []).map(r => ({
          kirimanId: String(r.kirimanId ?? ''),
          jenisPupuk: r.jenisPupuk || '',
          jumlahDikirim: Number(r.jumlahDikirim ?? 0),
          jumlahDiterima: r.jumlahDiterima != null ? Number(r.jumlahDiterima) : null,
          timestampDikirim: r.timestampDikirim || null,
          timestampDiterima: r.timestampDiterima || null,
          status: r.status || '',
          pengecer: {
            nama: [r.pengecerNamaDepan, r.pengecerNamaTengah, r.pengecerNamaBelakang].filter(Boolean).join(' '),
            email: r.pengecerEmail || '',
          },
        })),
      };
    } catch (error: any) {
      logger.error('Failed to get shipment history', { userId, error: error.message });
      throw new AppError('Gagal mengambil riwayat pengiriman', 500);
    }
  }

  /**
   * Get incoming stock history with pagination
   */
  async getIncomingStockHistory(userId: number, pageNumber: number = 1) {
    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT
          r.RiwayatId AS riwayatId,
          p.JenisPupuk AS jenisPupuk,
          r.JumlahAwal AS jumlahAwal,
          r.JumlahAkhir AS jumlahAkhir,
          r.TipePerubahan AS tipePerubahan,
          r.Timestamp AS timestamp
        FROM trans.RIWAYAT_STOK r
        JOIN master.PUPUK p ON r.PupukId = p.PupukId
        WHERE r.UserId = ${userId} AND r.TipePerubahan = 'Stok Masuk'
        ORDER BY r.Timestamp DESC
      `;

      return (rows || []).map(r => ({
        riwayatId: String(r.riwayatId ?? ''),
        jenisPupuk: r.jenisPupuk || '',
        jumlahAwal: Number(r.jumlahAwal ?? 0),
        jumlahAkhir: Number(r.jumlahAkhir ?? 0),
        tipePerubahan: r.tipePerubahan || '',
        timestamp: r.timestamp || null,
      }));
    } catch (error: any) {
      logger.error('Failed to get incoming stock history', { userId, error: error.message });
      throw new AppError('Gagal mengambil riwayat stok masuk', 500);
    }
  }

  /**
   * Get outgoing stock history with pagination
   */
  async getOutgoingStockHistory(userId: number, pageNumber: number = 1) {
    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT
          r.RiwayatId AS riwayatId,
          p.JenisPupuk AS jenisPupuk,
          r.JumlahAwal AS jumlahAwal,
          r.JumlahAkhir AS jumlahAkhir,
          r.TipePerubahan AS tipePerubahan,
          r.Timestamp AS timestamp
        FROM trans.RIWAYAT_STOK r
        JOIN master.PUPUK p ON r.PupukId = p.PupukId
        WHERE r.UserId = ${userId} AND r.TipePerubahan = 'Stok Keluar'
        ORDER BY r.Timestamp DESC
      `;

      return (rows || []).map(r => ({
        riwayatId: String(r.riwayatId ?? ''),
        jenisPupuk: r.jenisPupuk || '',
        jumlahAwal: Number(r.jumlahAwal ?? 0),
        jumlahAkhir: Number(r.jumlahAkhir ?? 0),
        tipePerubahan: r.tipePerubahan || '',
        timestamp: r.timestamp || null,
      }));
    } catch (error: any) {
      logger.error('Failed to get outgoing stock history', { userId, error: error.message });
      throw new AppError('Gagal mengambil riwayat stok keluar', 500);
    }
  }

  /**
   * Get notifications with pagination
   * SP: dbo.usp_GetDistributorNotifikasi
   */
  async getNotifications(userId: number, pageNumber: number = 1) {
    try {
      const pageSize = 8;
      const notifications = await prisma.notifikasi.findMany({
        where: { UserId: userId },
        orderBy: { Timestamp: 'desc' },
        take: pageSize,
        skip: (pageNumber - 1) * pageSize,
      });
      return notifications.map(r => ({
        notifikasiId: String(r.NotifikasiId),
        id: r.NotifikasiId,
        judul: r.Judul,
        pesan: r.Pesan || '',
        timestamp: r.Timestamp,
        statusDibaca: Boolean(r.StatusDibaca),
        jenis: r.Jenis,
      }));
    } catch (error: any) {
      logger.error('Failed to get notifications', { userId, error: error.message });
      throw new AppError('Gagal mengambil notifikasi', 500);
    }
  }

  /**
   * Mark notification as read
   * SP: dbo.usp_MarkNotifikasiDibaca
   */
  async markNotificationRead(notifikasiId: number, userId: number) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        EXEC dbo.usp_MarkNotifikasiDibaca
          @NotifikasiId = ${notifikasiId},
          @UserId = ${userId}
      `;

      return result[0];
    } catch (error: any) {
      logger.error('Failed to mark notification as read', { 
        notifikasiId, 
        userId, 
        error: error.message 
      });
      throw new AppError('Gagal menandai notifikasi', 500);
    }
  }
}
