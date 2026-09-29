import prisma from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';

function esc(val: string | null | undefined): string {
  if (val == null) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

export class RedemptionService {
  async validateFarmer(petaniId: string, retailerId: number) {
    if (!/^\d{16}$/.test(petaniId)) {
      throw new AppError('ID Petani harus 16 digit', 400);
    }

    const farmer = await prisma.petani.findUnique({
      where: { PetaniId: petaniId },
      include: {
        KodePos: true,
        KuotaPetani: {
          include: {
            Pupuk: true,
          },
        },
      },
    });

    if (!farmer) {
      throw new AppError('Petani tidak ditemukan', 404);
    }

    if (farmer.UserIdPengecer !== retailerId) {
      throw new AppError('Petani bukan milik pengecer ini', 403);
    }

    const now = new Date();
    if (now < farmer.AwalTerdaftar || now > farmer.AkhirTerdaftar) {
      throw new AppError('Periode registrasi petani tidak valid', 400);
    }

    return {
      petani: {
        petaniId: farmer.PetaniId,
        nama: `${farmer.FirstName} ${farmer.MiddleName || ''} ${farmer.LastName || ''}`.trim(),
        nomorHp: farmer.NomorHp,
        alamat: `${farmer.Jalan}, RT ${farmer.Rt}/RW ${farmer.Rw}, ${farmer.KodePos.KelurahanDesa}, ${farmer.KodePos.Kecamatan}, ${farmer.KodePos.KabupatenKota}, ${farmer.KodePos.Provinsi}`,
        sektor: farmer.Sektor,
        luasLahan: farmer.LuasLahan,
        status: farmer.Status,
      },
      kuota: farmer.KuotaPetani.map((k) => ({
        pupukId: k.PupukId,
        jenisPupuk: k.Pupuk.JenisPupuk,
        sisaKuota: k.SisaKuota,
      })),
    };
  }

  async redeemFertilizer(
    retailerId: number,
    petaniId: string,
    pupukId: number,
    jumlah: number
  ) {
    if (jumlah <= 0) {
      throw new AppError('Jumlah harus lebih dari 0', 400);
    }

    if (!/^\d{16}$/.test(petaniId)) {
      throw new AppError('ID Petani harus 16 digit', 400);
    }

    const farmer = await prisma.petani.findUnique({
      where: { PetaniId: petaniId },
    });

    if (!farmer) {
      throw new AppError('Petani tidak ditemukan', 404);
    }

    if (farmer.UserIdPengecer !== retailerId) {
      throw new AppError('Petani bukan milik pengecer ini', 403);
    }

    const now = new Date();
    if (now < farmer.AwalTerdaftar || now > farmer.AkhirTerdaftar) {
      throw new AppError('Periode registrasi petani tidak valid', 400);
    }

    const retailerStock = await prisma.stok.findUnique({
      where: {
        UserId_PupukId: {
          UserId: retailerId,
          PupukId: pupukId,
        },
      },
      include: {
        Pupuk: true,
      },
    });

    if (!retailerStock) {
      throw new AppError('Stok pupuk tidak ditemukan', 404);
    }

    if (retailerStock.Jumlah.lessThan(jumlah)) {
      throw new AppError('Stok pengecer tidak mencukupi', 400);
    }

    const quota = await prisma.kuotaPetani.findUnique({
      where: {
        PetaniId_PupukId: {
          PetaniId: petaniId,
          PupukId: pupukId,
        },
      },
    });

    if (!quota) {
      throw new AppError('Kuota pupuk tidak ditemukan untuk petani ini', 404);
    }

    if (quota.SisaKuota.lessThan(jumlah)) {
      throw new AppError('Kuota petani tidak mencukupi', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const newQuota = quota.SisaKuota.minus(jumlah);
      await tx.kuotaPetani.update({
        where: {
          PetaniId_PupukId: {
            PetaniId: petaniId,
            PupukId: pupukId,
          },
        },
        data: {
          SisaKuota: newQuota,
        },
      });

      const newStock = retailerStock.Jumlah.minus(jumlah);
      await tx.stok.update({
        where: {
          UserId_PupukId: {
            UserId: retailerId,
            PupukId: pupukId,
          },
        },
        data: {
          Jumlah: newStock,
          Timestamp: new Date(),
        },
      });

      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${retailerId},
          ${pupukId},
          ${retailerStock.Jumlah},
          ${newStock},
          ${esc('Stok Keluar')},
          GETDATE()
        )
      `);

      const rows: any = await tx.$queryRaw<any[]>`
        DECLARE @NewId INT = (SELECT ISNULL(MAX(TebusanId), 0) + 1 FROM trans.PENEBUSAN_PUPUK WITH (TABLOCKX));
        INSERT INTO trans.PENEBUSAN_PUPUK (TebusanId, UserIdPengecer, PetaniId, PupukId, Jumlah, Status, TimestampPenebusan)
        VALUES (@NewId, ${retailerId}, ${petaniId}, ${pupukId}, ${jumlah}, 'Selesai', GETDATE());
        SELECT @NewId AS TebusanId;
      `;
      const newTebusanId = Number(rows[0].TebusanId);

      await tx.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          ${esc('REDEMPTION')},
          ${esc(`Penebusan ${jumlah} ${retailerStock.Pupuk.JenisPupuk} oleh petani ${petaniId}`)},
          ${retailerId},
          GETDATE()
        )
      `);

      const redemption = await tx.penebusanPupuk.findUnique({
        where: { TebusanId: newTebusanId },
        include: {
          Pupuk: true,
          Petani: {
            select: {
              FirstName: true,
              MiddleName: true,
              LastName: true,
            },
          },
        },
      });

      return redemption;
    });

    return result;
  }

  async getRedemptionHistory(retailerId: number) {
    const redemptions = await prisma.penebusanPupuk.findMany({
      where: {
        UserIdPengecer: retailerId,
      },
      include: {
        Pupuk: {
          select: {
            JenisPupuk: true,
          },
        },
        Petani: {
          select: {
            FirstName: true,
            MiddleName: true,
            LastName: true,
            NomorHp: true,
          },
        },
      },
      orderBy: {
        TimestampPenebusan: 'desc',
      },
    });

    return redemptions;
  }
}
