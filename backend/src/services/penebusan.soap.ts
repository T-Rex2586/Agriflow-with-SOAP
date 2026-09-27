import prisma from '../database/prisma';

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

export interface PenebusanPupukArgs {
  UserIdPengecer: number;
  PetaniId: string;
  PupukId: number;
  Jumlah: number;
}

export interface GetRiwayatPenebusanArgs {
  UserIdPengecer: number;
}

export async function penebusanPupukSoap(args: PenebusanPupukArgs) {
  try {
    const { UserIdPengecer, PetaniId, PupukId, Jumlah } = args;

    if (!UserIdPengecer || !PetaniId || !PupukId || !Jumlah || Jumlah <= 0) {
      return {
        Success: false,
        Message: 'Parameter transaksi penebusan tidak valid atau jumlah <= 0',
      };
    }

    const pengecerIdNum = Number(UserIdPengecer);
    const pupukIdNum = Number(PupukId);
    const jumlahNum = Number(Jumlah);

    // 1. Validasi Format NIK Petani (Harus 16 Digit persis aturan AgriFlow)
    if (!/^\d{16}$/.test(PetaniId)) {
      return {
        Success: false,
        Message: 'ID Petani / NIK harus berupa 16 digit angka',
      };
    }

    // 2. Validasi Data Petani & Kepemilikan Pengecer
    const farmer = await prisma.petani.findUnique({
      where: { PetaniId },
    });

    if (!farmer) {
      return {
        Success: false,
        Message: 'Petani tidak ditemukan dalam basis data',
      };
    }

    if (farmer.UserIdPengecer !== pengecerIdNum) {
      return {
        Success: false,
        Message: 'Akses ditolak: Petani bukan binaan dari kios pengecer ini',
      };
    }

    // 3. Validasi Masa Aktif Registrasi Petani
    const now = new Date();
    if (now < farmer.AwalTerdaftar || (farmer.AkhirTerdaftar && now > farmer.AkhirTerdaftar)) {
      return {
        Success: false,
        Message: 'Periode registrasi/keanggotaan petani tidak valid atau sudah kadaluarsa',
      };
    }

    // 4. Validasi Kuota Subsidi Petani
    const kuota = await prisma.kuotaPetani.findUnique({
      where: {
        PetaniId_PupukId: {
          PetaniId,
          PupukId: pupukIdNum,
        },
      },
      include: {
        Pupuk: true,
      },
    });

    if (!kuota) {
      return {
        Success: false,
        Message: 'Alokasi kuota subsidi untuk jenis pupuk ini tidak ditemukan pada petani',
      };
    }

    if (Number(kuota.SisaKuota) < jumlahNum) {
      return {
        Success: false,
        Message: `Alokasi kuota petani tidak mencukupi (Sisa: ${kuota.SisaKuota} kg, Permintaan: ${jumlahNum} kg)`,
        SisaKuota: Number(kuota.SisaKuota),
      };
    }

    // 5. Validasi Stok Fisik Pengecer
    const stokPengecer = await prisma.stok.findUnique({
      where: {
        UserId_PupukId: {
          UserId: pengecerIdNum,
          PupukId: pupukIdNum,
        },
      },
      include: {
        Pupuk: true,
      },
    });

    if (!stokPengecer || Number(stokPengecer.Jumlah) < jumlahNum) {
      return {
        Success: false,
        Message: `Stok pupuk di kios pengecer tidak mencukupi (Tersedia: ${stokPengecer ? stokPengecer.Jumlah : 0} kg)`,
      };
    }

    const namaPupuk = stokPengecer.Pupuk?.JenisPupuk || kuota.Pupuk?.JenisPupuk || `Pupuk #${pupukIdNum}`;

    // 6. Transaksi Database Terisolasi Atomik (Prisma $transaction)
    const result = await prisma.$transaction(async (tx) => {
      // Potong Kuota Petani
      const newQuotaVal = Number(kuota.SisaKuota) - jumlahNum;
      await tx.kuotaPetani.update({
        where: {
          PetaniId_PupukId: {
            PetaniId,
            PupukId: pupukIdNum,
          },
        },
        data: {
          SisaKuota: newQuotaVal,
        },
      });

      // Potong Stok Kios Pengecer
      const newStockVal = Number(stokPengecer.Jumlah) - jumlahNum;
      await tx.stok.update({
        where: {
          UserId_PupukId: {
            UserId: pengecerIdNum,
            PupukId: pupukIdNum,
          },
        },
        data: {
          Jumlah: newStockVal,
          Timestamp: new Date(),
        },
      });

      // Catat Mutasi ke trans.RIWAYAT_STOK
      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${pengecerIdNum},
          ${pupukIdNum},
          ${stokPengecer.Jumlah},
          ${newStockVal},
          ${esc('Stok Keluar')},
          GETDATE()
        )
      `);

      // Catat Transaksi Penebusan ke trans.PENEBUSAN_PUPUK
      const rows: any = await tx.$queryRaw<any[]>`
        DECLARE @NewId INT = (SELECT ISNULL(MAX(TebusanId), 0) + 1 FROM trans.PENEBUSAN_PUPUK WITH (TABLOCKX));
        INSERT INTO trans.PENEBUSAN_PUPUK (TebusanId, UserIdPengecer, PetaniId, PupukId, Jumlah, Status, TimestampPenebusan)
        VALUES (@NewId, ${pengecerIdNum}, ${PetaniId}, ${pupukIdNum}, ${jumlahNum}, 'Selesai', GETDATE());
        SELECT @NewId AS TebusanId;
      `;
      const newTebusanId = Number(rows[0]?.TebusanId);

      // Catat Audit Trail ke evt.LOG_AKTIVITAS
      await tx.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          ${esc('REDEMPTION')},
          ${esc(`Penebusan ${jumlahNum} kg ${namaPupuk} oleh petani NIK ${PetaniId}`)},
          ${pengecerIdNum},
          GETDATE()
        )
      `);

      return {
        tebusanId: newTebusanId,
        sisaKuotaBaru: newQuotaVal,
        timestamp: new Date().toISOString(),
      };
    });

    return {
      Success: true,
      Message: 'Transaksi penebusan pupuk bersubsidi berhasil diproses via SOAP',
      TebusanId: result.tebusanId,
      Status: 'Selesai',
      JumlahDitebus: jumlahNum,
      SisaKuota: result.sisaKuotaBaru,
      Timestamp: result.timestamp,
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: `Gagal memproses penebusan: ${error.message}`,
    };
  }
}

export async function getRiwayatPenebusanSoap(args: GetRiwayatPenebusanArgs) {
  try {
    const { UserIdPengecer } = args;
    const pengecerIdNum = Number(UserIdPengecer);

    const redemptions = await prisma.penebusanPupuk.findMany({
      where: {
        UserIdPengecer: pengecerIdNum,
      },
      include: {
        Pupuk: true,
        Petani: true,
      },
      orderBy: {
        TimestampPenebusan: 'desc',
      },
      take: 50,
    });

    const listRiwayat = redemptions.map((r) => {
      const namaPetani = [r.Petani?.FirstName, r.Petani?.MiddleName, r.Petani?.LastName]
        .filter(Boolean)
        .join(' ');
      return {
        TebusanId: r.TebusanId,
        PetaniId: r.PetaniId,
        NamaPetani: namaPetani,
        PupukId: r.PupukId,
        NamaPupuk: r.Pupuk?.JenisPupuk || `Pupuk #${r.PupukId}`,
        Jumlah: Number(r.Jumlah),
        Status: r.Status,
        Timestamp: r.TimestampPenebusan.toISOString(),
      };
    });

    return {
      Total: listRiwayat.length,
      ListRiwayat: listRiwayat,
    };
  } catch (error: any) {
    return {
      Total: 0,
      ListRiwayat: [],
    };
  }
}
