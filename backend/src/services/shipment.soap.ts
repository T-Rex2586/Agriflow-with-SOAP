import prisma from '../database/prisma';

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

export interface CreateKirimanPupukArgs {
  UserIdDistributor: number;
  UserIdPengecer: number;
  PupukId: number;
  Jumlah: number;
}

export interface TerimaKirimanPupukArgs {
  KirimanId: number;
  UserIdPengecer: number;
  JumlahDiterima?: number;
}

export interface GetKirimanListArgs {
  UserId: number;
  Role: string; // DISTRIBUTOR | PENGECER
}

export async function createKirimanPupukSoap(args: CreateKirimanPupukArgs) {
  try {
    const { UserIdDistributor, UserIdPengecer, PupukId, Jumlah } = args;

    const distributorIdNum = Number(UserIdDistributor);
    const retailerIdNum = Number(UserIdPengecer);
    const pupukIdNum = Number(PupukId);
    const jumlahNum = Number(Jumlah);

    if (!distributorIdNum || !retailerIdNum || !pupukIdNum || !jumlahNum || jumlahNum <= 0) {
      return {
        Success: false,
        Message: 'Parameter pengiriman pupuk tidak valid atau jumlah <= 0',
      };
    }

    const retailer = await prisma.user.findUnique({
      where: { UserId: retailerIdNum },
      include: { Role: true },
    });

    if (!retailer) {
      return {
        Success: false,
        Message: 'Pengecer tujuan tidak ditemukan',
      };
    }

    if (retailer.Role.RoleName.toUpperCase() !== 'PENGECER') {
      return {
        Success: false,
        Message: 'Penerima kiriman harus berstatus PENGECER',
      };
    }

    const distributorStock = await prisma.stok.findUnique({
      where: {
        UserId_PupukId: {
          UserId: distributorIdNum,
          PupukId: pupukIdNum,
        },
      },
      include: { Pupuk: true },
    });

    if (!distributorStock) {
      return {
        Success: false,
        Message: 'Stok pupuk tidak ditemukan di gudang distributor',
      };
    }

    if (Number(distributorStock.Jumlah) < jumlahNum) {
      return {
        Success: false,
        Message: `Stok distributor tidak mencukupi (Tersedia: ${distributorStock.Jumlah} kg, Permintaan: ${jumlahNum} kg)`,
      };
    }

    const namaPupuk = distributorStock.Pupuk?.JenisPupuk || `Pupuk #${pupukIdNum}`;

    const result = await prisma.$transaction(async (tx) => {
      // Potong stok distributor
      const newDistStock = Number(distributorStock.Jumlah) - jumlahNum;
      await tx.stok.update({
        where: {
          UserId_PupukId: {
            UserId: distributorIdNum,
            PupukId: pupukIdNum,
          },
        },
        data: {
          Jumlah: newDistStock,
          Timestamp: new Date(),
        },
      });

      // Catat mutasi stok keluar
      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${distributorIdNum},
          ${pupukIdNum},
          ${distributorStock.Jumlah},
          ${newDistStock},
          ${esc('Stok Keluar')},
          GETDATE()
        )
      `);

      // Buat pengiriman baru
      const rows: any = await tx.$queryRaw<any[]>`
        DECLARE @NewId INT = (SELECT ISNULL(MAX(KirimanId), 0) + 1 FROM trans.KIRIMAN_PUPUK WITH (TABLOCKX));
        INSERT INTO trans.KIRIMAN_PUPUK (KirimanId, UserIdDistributor, UserIdPengecer, PupukId, JumlahDikirim, Status, TimestampDikirim)
        VALUES (@NewId, ${distributorIdNum}, ${retailerIdNum}, ${pupukIdNum}, ${jumlahNum}, 'Dikirim', GETDATE());
        SELECT @NewId AS KirimanId;
      `;
      const newKirimanId = Number(rows[0]?.KirimanId);

      // Catat log aktivitas
      await tx.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          ${esc('CREATE_SHIPMENT')},
          ${esc(`Mengirim ${jumlahNum} kg ${namaPupuk} ke pengecer ID ${retailerIdNum}`)},
          ${distributorIdNum},
          GETDATE()
        )
      `);

      // Kirim notifikasi ke pengecer
      await tx.$executeRawUnsafe(`
        INSERT INTO evt.NOTIFIKASI (NotifikasiId, Jenis, Judul, Pesan, StatusDibaca, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(NotifikasiId), 0) + 1 FROM evt.NOTIFIKASI WITH (TABLOCKX)),
          ${esc('INFO')},
          ${esc('Pengiriman Pupuk Baru')},
          ${esc(`Distributor mengirimkan ${jumlahNum} kg ${namaPupuk}. Silakan konfirmasi saat barang tiba.`)},
          0,
          ${retailerIdNum},
          GETDATE()
        )
      `);

      return newKirimanId;
    });

    return {
      Success: true,
      Message: 'Pengiriman pupuk berhasil dibuat via SOAP',
      KirimanId: result,
      Status: 'Dikirim',
      JumlahDikirim: jumlahNum,
      NamaPupuk: namaPupuk,
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: `Gagal membuat kiriman pupuk: ${error.message}`,
    };
  }
}

export async function terimaKirimanPupukSoap(args: TerimaKirimanPupukArgs) {
  try {
    const { KirimanId, UserIdPengecer, JumlahDiterima } = args;

    const kirimanIdNum = Number(KirimanId);
    const retailerIdNum = Number(UserIdPengecer);

    if (!kirimanIdNum || !retailerIdNum) {
      return {
        Success: false,
        Message: 'KirimanId dan UserIdPengecer wajib diisi',
      };
    }

    const kiriman = await prisma.kirimanPupuk.findUnique({
      where: { KirimanId: kirimanIdNum },
      include: {
        Pupuk: true,
        Distributor: true,
      },
    });

    if (!kiriman) {
      return {
        Success: false,
        Message: 'Data pengiriman pupuk tidak ditemukan',
      };
    }

    if (kiriman.UserIdPengecer !== retailerIdNum) {
      return {
        Success: false,
        Message: 'Akses ditolak: Anda bukan penerima pengiriman ini',
      };
    }

    if (kiriman.Status !== 'Dikirim') {
      return {
        Success: false,
        Message: `Pengiriman sudah berstatus '${kiriman.Status}', tidak dapat dikonfirmasi lagi`,
      };
    }

    const acceptedQty = Number(JumlahDiterima || kiriman.JumlahDikirim);

    await prisma.$transaction(async (tx) => {
      // Update status kiriman menjadi 'Diterima'
      await tx.kirimanPupuk.update({
        where: { KirimanId: kirimanIdNum },
        data: {
          Status: 'Diterima',
          JumlahDiterima: acceptedQty,
          TimestampDiterima: new Date(),
        },
      });

      // Tambah stok ke pengecer
      const existingStock = await tx.stok.findUnique({
        where: {
          UserId_PupukId: {
            UserId: retailerIdNum,
            PupukId: kiriman.PupukId,
          },
        },
      });

      const currentStock = existingStock ? Number(existingStock.Jumlah) : 0;
      const finalStock = currentStock + acceptedQty;

      if (existingStock) {
        await tx.stok.update({
          where: {
            UserId_PupukId: {
              UserId: retailerIdNum,
              PupukId: kiriman.PupukId,
            },
          },
          data: {
            Jumlah: finalStock,
            Timestamp: new Date(),
          },
        });
      } else {
        await tx.stok.create({
          data: {
            UserId: retailerIdNum,
            PupukId: kiriman.PupukId,
            Jumlah: finalStock,
            Timestamp: new Date(),
          },
        });
      }

      // Catat mutasi stok masuk
      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${retailerIdNum},
          ${kiriman.PupukId},
          ${currentStock},
          ${finalStock},
          ${esc('Stok Masuk')},
          GETDATE()
        )
      `);

      // Catat log aktivitas
      await tx.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          ${esc('RECEIVE_SHIPMENT')},
          ${esc(`Pengecer mengonfirmasi penerimaan ${acceptedQty} kg ${kiriman.Pupuk.JenisPupuk}`)},
          ${retailerIdNum},
          GETDATE()
        )
      `);

      // Kirim notifikasi ke distributor
      await tx.$executeRawUnsafe(`
        INSERT INTO evt.NOTIFIKASI (NotifikasiId, Jenis, Judul, Pesan, StatusDibaca, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(NotifikasiId), 0) + 1 FROM evt.NOTIFIKASI WITH (TABLOCKX)),
          ${esc('SUCCESS')},
          ${esc('Kiriman Pupuk Diterima')},
          ${esc(`Pengecer ID ${retailerIdNum} telah mengonfirmasi penerimaan kiriman #${kirimanIdNum} (${acceptedQty} kg ${kiriman.Pupuk.JenisPupuk}).`)},
          0,
          ${kiriman.UserIdDistributor},
          GETDATE()
        )
      `);
    });

    return {
      Success: true,
      Message: 'Konfirmasi penerimaan pupuk berhasil diproses via SOAP',
      KirimanId: kirimanIdNum,
      Status: 'Diterima',
      JumlahDiterima: acceptedQty,
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: `Gagal menerima kiriman: ${error.message}`,
    };
  }
}

export async function getKirimanListSoap(args: GetKirimanListArgs) {
  try {
    const { UserId, Role } = args;
    const userIdNum = Number(UserId);
    const roleUpper = (Role || '').toUpperCase();

    const where: any = {};
    if (roleUpper === 'DISTRIBUTOR') {
      where.UserIdDistributor = userIdNum;
    } else if (roleUpper === 'PENGECER') {
      where.UserIdPengecer = userIdNum;
    } else {
      where.OR = [
        { UserIdDistributor: userIdNum },
        { UserIdPengecer: userIdNum },
      ];
    }

    const list = await prisma.kirimanPupuk.findMany({
      where,
      include: {
        Pupuk: true,
        Distributor: true,
        Pengecer: true,
      },
      orderBy: {
        TimestampDikirim: 'desc',
      },
      take: 50,
    });

    const listKiriman = list.map((k) => {
      const namaDistributor = [k.Distributor?.FirstName, k.Distributor?.MiddleName, k.Distributor?.LastName]
        .filter(Boolean).join(' ');
      const namaPengecer = [k.Pengecer?.FirstName, k.Pengecer?.MiddleName, k.Pengecer?.LastName]
        .filter(Boolean).join(' ');

      return {
        KirimanId: k.KirimanId,
        UserIdDistributor: k.UserIdDistributor,
        NamaDistributor: namaDistributor,
        UserIdPengecer: k.UserIdPengecer,
        NamaPengecer: namaPengecer,
        PupukId: k.PupukId,
        NamaPupuk: k.Pupuk?.JenisPupuk || `Pupuk #${k.PupukId}`,
        JumlahDikirim: Number(k.JumlahDikirim),
        JumlahDiterima: k.JumlahDiterima ? Number(k.JumlahDiterima) : 0,
        Status: k.Status,
        TimestampDikirim: k.TimestampDikirim.toISOString(),
        TimestampDiterima: k.TimestampDiterima ? k.TimestampDiterima.toISOString() : '',
      };
    });

    return {
      Total: listKiriman.length,
      ListKiriman: listKiriman,
    };
  } catch (error: any) {
    return {
      Total: 0,
      ListKiriman: [],
    };
  }
}
