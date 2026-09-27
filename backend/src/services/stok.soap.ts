import prisma from '../database/prisma';

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

export interface CekStokArgs {
  UserId: number;
}

export interface GetRiwayatStokArgs {
  UserId: number;
}

export interface AdjustStokArgs {
  UserId: number;
  PupukId: number;
  JumlahPenyesuaian: number; // positif (tambah) atau negatif (kurang)
  Keterangan?: string;
}

export async function cekStokSoap(args: CekStokArgs) {
  try {
    const { UserId } = args;
    const userIdNum = Number(UserId);

    if (!userIdNum) {
      return {
        UserId: 0,
        NamaUser: 'User Tidak Valid',
        ListStok: [],
      };
    }

    const [user, stokList] = await Promise.all([
      prisma.user.findUnique({
        where: { UserId: userIdNum },
        include: { Role: true },
      }),
      prisma.stok.findMany({
        where: { UserId: userIdNum },
        include: { Pupuk: true },
      }),
    ]);

    const namaUser = user
      ? [user.FirstName, user.MiddleName, user.LastName].filter(Boolean).join(' ')
      : `User #${userIdNum}`;

    const listStok = stokList.map((s) => ({
      PupukId: s.PupukId,
      NamaPupuk: s.Pupuk?.JenisPupuk || `Pupuk #${s.PupukId}`,
      JumlahStok: Number(s.Jumlah),
      TerakhirUpdate: s.Timestamp.toISOString(),
    }));

    return {
      UserId: userIdNum,
      NamaUser: namaUser,
      Role: user?.Role?.RoleName || '',
      ListStok: listStok,
    };
  } catch (error: any) {
    return {
      UserId: Number(args.UserId || 0),
      NamaUser: 'Error',
      Role: '',
      ListStok: [],
    };
  }
}

export async function getRiwayatStokSoap(args: GetRiwayatStokArgs) {
  try {
    const { UserId } = args;
    const userIdNum = Number(UserId);

    const records = await prisma.riwayatStok.findMany({
      where: { UserId: userIdNum },
      include: { Pupuk: true },
      orderBy: { Timestamp: 'desc' },
      take: 50,
    });

    const listRiwayat = records.map((r) => ({
      RiwayatId: r.RiwayatId,
      PupukId: r.PupukId,
      NamaPupuk: r.Pupuk?.JenisPupuk || `Pupuk #${r.PupukId}`,
      JumlahAwal: Number(r.JumlahAwal),
      JumlahAkhir: Number(r.JumlahAkhir),
      TipePerubahan: r.TipePerubahan,
      Timestamp: r.Timestamp.toISOString(),
    }));

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

export async function adjustStokSoap(args: AdjustStokArgs) {
  try {
    const { UserId, PupukId, JumlahPenyesuaian, Keterangan } = args;
    const userIdNum = Number(UserId);
    const pupukIdNum = Number(PupukId);
    const delta = Number(JumlahPenyesuaian);

    if (!userIdNum || !pupukIdNum || delta === 0) {
      return {
        Success: false,
        Message: 'Parameter UserId, PupukId, dan JumlahPenyesuaian tidak valid',
      };
    }

    const current = await prisma.stok.findUnique({
      where: {
        UserId_PupukId: {
          UserId: userIdNum,
          PupukId: pupukIdNum,
        },
      },
      include: { Pupuk: true },
    });

    const jumlahAwal = current ? Number(current.Jumlah) : 0;
    const jumlahAkhir = jumlahAwal + delta;

    if (jumlahAkhir < 0) {
      return {
        Success: false,
        Message: `Pengurangan stok melebihi stok yang tersedia (Tersedia: ${jumlahAwal} kg, Pengurangan: ${Math.abs(delta)} kg)`,
      };
    }

    const namaPupuk = current?.Pupuk?.JenisPupuk || `Pupuk #${pupukIdNum}`;

    await prisma.$transaction(async (tx) => {
      if (current) {
        await tx.stok.update({
          where: {
            UserId_PupukId: {
              UserId: userIdNum,
              PupukId: pupukIdNum,
            },
          },
          data: {
            Jumlah: jumlahAkhir,
            Timestamp: new Date(),
          },
        });
      } else {
        await tx.stok.create({
          data: {
            UserId: userIdNum,
            PupukId: pupukIdNum,
            Jumlah: jumlahAkhir,
            Timestamp: new Date(),
          },
        });
      }

      await tx.$executeRawUnsafe(`
        INSERT INTO trans.RIWAYAT_STOK (RiwayatId, UserId, PupukId, JumlahAwal, JumlahAkhir, TipePerubahan, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(RiwayatId), 0) + 1 FROM trans.RIWAYAT_STOK WITH (TABLOCKX)),
          ${userIdNum},
          ${pupukIdNum},
          ${jumlahAwal},
          ${jumlahAkhir},
          ${esc(Keterangan || (delta > 0 ? 'Penambahan Stok Manual' : 'Pengurangan Stok Manual'))},
          GETDATE()
        )
      `);

      await tx.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          ${esc('STOCK_ADJUSTMENT')},
          ${esc(`Penyesuaian stok ${namaPupuk}: ${jumlahAwal} -> ${jumlahAkhir} kg. Alasan: ${Keterangan || '-'}`)},
          ${userIdNum},
          GETDATE()
        )
      `);
    });

    return {
      Success: true,
      Message: 'Penyesuaian stok berhasil disimpan via SOAP',
      PupukId: pupukIdNum,
      JumlahAwal: jumlahAwal,
      JumlahAkhir: jumlahAkhir,
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: `Gagal menyesuaikan stok: ${error.message}`,
    };
  }
}
