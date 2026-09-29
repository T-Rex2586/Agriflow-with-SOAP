import prisma from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';
import { Decimal } from '@prisma/client/runtime/library';

function esc(val: string | null | undefined): string {
  if (val == null) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

export class StockService {
  async getStock(userId: number, pupukId?: number, search?: string) {
    const where: any = {
      UserId: userId,
    };

    if (pupukId) {
      where.PupukId = pupukId;
    }

    if (search) {
      where.Pupuk = {
        JenisPupuk: {
          contains: search,
        },
      };
    }

    const stock = await prisma.stok.findMany({
      where,
      include: {
        Pupuk: {
          select: {
            PupukId: true,
            JenisPupuk: true,
          },
        },
      },
      orderBy: {
        Timestamp: 'desc',
      },
    });

    return stock;
  }

  async addStock(userId: number, pupukId: number, jumlah: number) {
    if (jumlah <= 0) {
      throw new AppError('Jumlah harus lebih dari 0', 400);
    }

    const pupuk = await prisma.pupuk.findUnique({
      where: { PupukId: pupukId },
    });

    if (!pupuk) {
      throw new AppError('Jenis pupuk tidak ditemukan', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingStock = await tx.stok.findUnique({
        where: {
          UserId_PupukId: {
            UserId: userId,
            PupukId: pupukId,
          },
        },
      });

      let stock;
      const jumlahAwal = existingStock ? existingStock.Jumlah : new Decimal(0);
      const jumlahAkhir = jumlahAwal.plus(jumlah);

      if (existingStock) {
        stock = await tx.stok.update({
          where: {
            UserId_PupukId: {
              UserId: userId,
              PupukId: pupukId,
            },
          },
          data: {
            Jumlah: jumlahAkhir,
            Timestamp: new Date(),
          },
          include: {
            Pupuk: true,
          },
        });
      } else {
        await tx.$executeRawUnsafe(`
          INSERT INTO trans.STOK (UserId, PupukId, Jumlah, Timestamp)
          VALUES (${userId}, ${pupukId}, ${jumlah}, GETDATE())
        `);
        stock = await tx.stok.findUnique({
          where: {
            UserId_PupukId: { UserId: userId, PupukId: pupukId },
          },
          include: { Pupuk: true },
        });
      }

      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${userId},
          ${pupukId},
          ${jumlahAwal},
          ${jumlahAkhir},
          ${esc('Stok Masuk')},
          GETDATE()
        )
      `);

      await tx.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          ${esc('ADD_STOCK')},
          ${esc(`Menambah stok ${pupuk.JenisPupuk} sebanyak ${jumlah}`)},
          ${userId},
          GETDATE()
        )
      `);

      return stock;
    });

    return result;
  }

  async updateStock(
    userId: number,
    pupukId: number,
    jumlah: number,
    requesterId: number
  ) {
    if (jumlah < 0) {
      throw new AppError('Jumlah tidak boleh negatif', 400);
    }

    const existingStock = await prisma.stok.findUnique({
      where: {
        UserId_PupukId: {
          UserId: userId,
          PupukId: pupukId,
        },
      },
      include: {
        Pupuk: true,
      },
    });

    if (!existingStock) {
      throw new AppError('Stok tidak ditemukan', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      const jumlahAwal = existingStock.Jumlah;
      const jumlahAkhir = new Decimal(jumlah);

      const stock = await tx.stok.update({
        where: {
          UserId_PupukId: {
            UserId: userId,
            PupukId: pupukId,
          },
        },
        data: {
          Jumlah: jumlahAkhir,
          Timestamp: new Date(),
        },
        include: {
          Pupuk: true,
        },
      });

      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${userId},
          ${pupukId},
          ${jumlahAwal},
          ${jumlahAkhir},
          ${esc('Penyesuaian')},
          GETDATE()
        )
      `);

      await tx.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          ${esc('UPDATE_STOCK')},
          ${esc(`Menyesuaikan stok ${existingStock.Pupuk.JenisPupuk} dari ${jumlahAwal} menjadi ${jumlahAkhir}`)},
          ${requesterId},
          GETDATE()
        )
      `);

      return stock;
    });

    return result;
  }

  async getStockHistory(
    userId: number,
    startDate?: string,
    endDate?: string,
    pupukId?: number
  ) {
    const where: any = {
      UserId: userId,
    };

    if (pupukId) {
      where.PupukId = pupukId;
    }

    if (startDate || endDate) {
      where.Timestamp = {};
      if (startDate) {
        where.Timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.Timestamp.lte = new Date(endDate);
      }
    }

    const history = await prisma.riwayatStok.findMany({
      where,
      include: {
        Pupuk: {
          select: {
            JenisPupuk: true,
          },
        },
      },
      orderBy: {
        Timestamp: 'desc',
      },
    });

    return history;
  }
}
