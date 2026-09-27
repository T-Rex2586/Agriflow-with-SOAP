import prisma from '../database/prisma';

export interface CreateBantuanArgs {
  FirstName: string;
  MiddleName?: string;
  LastName?: string;
  Email: string;
  Topik: string;
  Ringkasan: string;
  UserId?: number;
}

export interface GetBantuanListArgs {
  Topik?: string;
}

export async function createBantuanSoap(args: CreateBantuanArgs) {
  try {
    const { FirstName, MiddleName, LastName, Email, Topik, Ringkasan, UserId } = args;

    if (!FirstName || !Email || !Topik || !Ringkasan) {
      return {
        Success: false,
        Message: 'Nama depan, email, topik, dan ringkasan kendala wajib diisi',
      };
    }

    const maxBantuan = await prisma.bantuan.aggregate({
      _max: { BantuanId: true },
    });
    const nextBantuanId = (maxBantuan._max.BantuanId || 0) + 1;

    const bantuan = await prisma.bantuan.create({
      data: {
        BantuanId: nextBantuanId,
        FirstName,
        MiddleName: MiddleName || null,
        LastName: LastName || null,
        Email,
        Topik,
        Ringkasan,
        UserId: UserId ? Number(UserId) : null,
        Timestamp: new Date(),
      },
    });

    return {
      Success: true,
      Message: 'Tiket pengaduan/bantuan berhasil dikirimkan via SOAP',
      BantuanId: bantuan.BantuanId,
      Topik: bantuan.Topik,
      Email: bantuan.Email,
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: `Gagal membuat tiket bantuan: ${error.message}`,
    };
  }
}

export async function getBantuanListSoap(args: GetBantuanListArgs) {
  try {
    const where: any = {};
    if (args.Topik) {
      where.Topik = { contains: args.Topik };
    }

    const tickets = await prisma.bantuan.findMany({
      where,
      orderBy: { Timestamp: 'desc' },
      take: 50,
    });

    const listTiket = tickets.map((t) => {
      const nama = [t.FirstName, t.MiddleName, t.LastName].filter(Boolean).join(' ');
      return {
        BantuanId: t.BantuanId,
        NamaPengirim: nama,
        Email: t.Email,
        Topik: t.Topik,
        Ringkasan: t.Ringkasan,
        Timestamp: t.Timestamp.toISOString(),
      };
    });

    return {
      Total: listTiket.length,
      ListTiket: listTiket,
    };
  } catch (error: any) {
    return {
      Total: 0,
      ListTiket: [],
    };
  }
}
