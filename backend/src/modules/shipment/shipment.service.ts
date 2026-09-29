import prisma from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';
import { Decimal } from '@prisma/client/runtime/library';
import { isBeforeDate } from '../../utils/date.util';

function esc(val: string | null | undefined): string {
  if (val == null) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

export class ShipmentService {
  async createShipment(
    distributorId: number,
    retailerId: number,
    pupukId: number,
    jumlah: number
  ) {
    if (jumlah <= 0) {
      throw new AppError('Jumlah harus lebih dari 0', 400);
    }

    const retailer = await prisma.user.findUnique({
      where: { UserId: retailerId },
      include: { Role: true },
    });

    if (!retailer) {
      throw new AppError('Pengecer tidak ditemukan', 404);
    }

    if (retailer.Role.RoleName !== 'PENGECER') {
      throw new AppError('User bukan pengecer', 400);
    }

    if (retailer.Status !== 'Active') {
      throw new AppError('Pengecer tidak aktif', 400);
    }

    const distributorStock = await prisma.stok.findUnique({
      where: {
        UserId_PupukId: {
          UserId: distributorId,
          PupukId: pupukId,
        },
      },
      include: {
        Pupuk: true,
      },
    });

    if (!distributorStock) {
      throw new AppError('Stok tidak ditemukan', 404);
    }

    if (distributorStock.Jumlah.lessThan(jumlah)) {
      throw new AppError('Stok tidak mencukupi', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const newDistributorStock = distributorStock.Jumlah.minus(jumlah);
      await tx.stok.update({
        where: {
          UserId_PupukId: {
            UserId: distributorId,
            PupukId: pupukId,
          },
        },
        data: {
          Jumlah: newDistributorStock,
          Timestamp: new Date(),
        },
      });

      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${distributorId},
          ${pupukId},
          ${distributorStock.Jumlah},
          ${newDistributorStock},
          ${esc('Stok Keluar')},
          GETDATE()
        )
      `);

      const rows: any = await tx.$queryRaw<any[]>`
        DECLARE @NewId INT = (SELECT ISNULL(MAX(KirimanId), 0) + 1 FROM trans.KIRIMAN_PUPUK WITH (TABLOCKX));
        INSERT INTO trans.KIRIMAN_PUPUK (KirimanId, UserIdDistributor, UserIdPengecer, PupukId, JumlahDikirim, Status, TimestampDikirim)
        VALUES (@NewId, ${distributorId}, ${retailerId}, ${pupukId}, ${jumlah}, 'Dikirim', GETDATE());
        SELECT @NewId AS KirimanId;
      `;
      const newKirimanId = Number(rows[0].KirimanId);

      await tx.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          ${esc('CREATE_SHIPMENT')},
          ${esc(`Mengirim ${jumlah} ${distributorStock.Pupuk.JenisPupuk} ke ${retailer.Email}`)},
          ${distributorId},
          GETDATE()
        )
      `);

      await tx.$executeRawUnsafe(`
        INSERT INTO evt.NOTIFIKASI (NotifikasiId, Jenis, Judul, Pesan, StatusDibaca, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(NotifikasiId), 0) + 1 FROM evt.NOTIFIKASI WITH (TABLOCKX)),
          ${esc('SHIPMENT')},
          ${esc('Kiriman Baru')},
          ${esc(`Anda menerima kiriman ${jumlah} ${distributorStock.Pupuk.JenisPupuk}`)},
          0,
          ${retailerId},
          GETDATE()
        )
      `);

      const shipment = await tx.kirimanPupuk.findUnique({
        where: { KirimanId: newKirimanId },
        include: {
          Pupuk: true,
          Pengecer: {
            select: {
              FirstName: true,
              MiddleName: true,
              LastName: true,
              Email: true,
            },
          },
        },
      });

      return shipment;
    });

    return result;
  }

  async getShipmentHistory(userId: number, role: string) {
    const where: any = {};

    if (role === 'DISTRIBUTOR') {
      where.UserIdDistributor = userId;
    } else if (role === 'PENGECER') {
      where.UserIdPengecer = userId;
    }

    const shipments = await prisma.kirimanPupuk.findMany({
      where,
      include: {
        Pupuk: {
          select: {
            JenisPupuk: true,
          },
        },
        Distributor: {
          select: {
            FirstName: true,
            MiddleName: true,
            LastName: true,
            Email: true,
          },
        },
        Pengecer: {
          select: {
            FirstName: true,
            MiddleName: true,
            LastName: true,
            Email: true,
          },
        },
      },
      orderBy: {
        TimestampDikirim: 'desc',
      },
    });

    return shipments;
  }

  async receiveShipment(
    kirimanId: number,
    retailerId: number,
    jumlahDiterima: number,
    timestampDiterima?: Date
  ) {
    if (jumlahDiterima <= 0) {
      throw new AppError('Jumlah diterima harus lebih dari 0', 400);
    }

    const shipment = await prisma.kirimanPupuk.findUnique({
      where: { KirimanId: kirimanId },
      include: {
        Pupuk: true,
      },
    });

    if (!shipment) {
      throw new AppError('Kiriman tidak ditemukan', 404);
    }

    if (shipment.UserIdPengecer !== retailerId) {
      throw new AppError('Kiriman bukan untuk Anda', 403);
    }

    if (shipment.Status !== 'Dikirim') {
      throw new AppError('Kiriman sudah diproses', 400);
    }

    const finalTimestampDiterima = timestampDiterima || new Date();
    if (shipment.TimestampDikirim && isBeforeDate(finalTimestampDiterima, shipment.TimestampDikirim)) {
      throw new AppError('Tanggal diterima tidak boleh lebih awal dari tanggal pengiriman', 400);
    }

    const status = shipment.JumlahDikirim.equals(jumlahDiterima)
      ? 'Diterima'
      : 'Tidak Sesuai';

    const result = await prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.kirimanPupuk.update({
        where: { KirimanId: kirimanId },
        data: {
          JumlahDiterima: jumlahDiterima,
          Status: status,
          TimestampDiterima: timestampDiterima || new Date(),
        },
        include: {
          Pupuk: true,
        },
      });

      const existingStock = await tx.stok.findUnique({
        where: {
          UserId_PupukId: {
            UserId: retailerId,
            PupukId: shipment.PupukId,
          },
        },
      });

      const jumlahAwal = existingStock ? existingStock.Jumlah : new Decimal(0);
      const jumlahAkhir = jumlahAwal.plus(jumlahDiterima);

      if (existingStock) {
        await tx.stok.update({
          where: {
            UserId_PupukId: {
              UserId: retailerId,
              PupukId: shipment.PupukId,
            },
          },
          data: {
            Jumlah: jumlahAkhir,
            Timestamp: new Date(),
          },
        });
      } else {
        await tx.$executeRawUnsafe(`
          INSERT INTO trans.STOK (UserId, PupukId, Jumlah, Timestamp)
          VALUES (${retailerId}, ${shipment.PupukId}, ${jumlahDiterima}, GETDATE())
        `);
      }

      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${retailerId},
          ${shipment.PupukId},
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
          ${esc('RECEIVE_SHIPMENT')},
          ${esc(`Menerima kiriman ${jumlahDiterima} ${shipment.Pupuk.JenisPupuk} (Status: ${status})`)},
          ${retailerId},
          GETDATE()
        )
      `);

      if (status === 'Tidak Sesuai') {
        await tx.$executeRawUnsafe(`
          INSERT INTO evt.NOTIFIKASI (NotifikasiId, Jenis, Judul, Pesan, StatusDibaca, UserId, Timestamp)
          VALUES (
            (SELECT ISNULL(MAX(NotifikasiId), 0) + 1 FROM evt.NOTIFIKASI WITH (TABLOCKX)),
            ${esc('MISMATCH')},
            ${esc('Ketidaksesuaian Kiriman')},
            ${esc(`Kiriman ${shipment.Pupuk.JenisPupuk} tidak sesuai. Dikirim: ${shipment.JumlahDikirim}, Diterima: ${jumlahDiterima}`)},
            0,
            ${shipment.UserIdDistributor},
            GETDATE()
          )
        `);
      }

      return updatedShipment;
    });

    return result;
  }
}
