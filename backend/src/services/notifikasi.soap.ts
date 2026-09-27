import prisma from '../database/prisma';

export interface GetNotifikasiArgs {
  UserId: number;
  UnreadOnly?: boolean;
}

export interface MarkNotifikasiDibacaArgs {
  NotifikasiId?: number;
  UserId: number;
}

export interface GetUnreadCountArgs {
  UserId: number;
}

export async function getNotifikasiSoap(args: GetNotifikasiArgs) {
  try {
    const { UserId, UnreadOnly } = args;
    const userIdNum = Number(UserId);

    if (!userIdNum) {
      return {
        Total: 0,
        ListNotifikasi: [],
      };
    }

    const where: any = { UserId: userIdNum };
    if (UnreadOnly === true || String(UnreadOnly) === 'true') {
      where.StatusDibaca = false;
    }

    const notifications = await prisma.notifikasi.findMany({
      where,
      orderBy: { Timestamp: 'desc' },
      take: 50,
    });

    const listNotifikasi = notifications.map((n) => ({
      NotifikasiId: n.NotifikasiId,
      Jenis: n.Jenis,
      Judul: n.Judul,
      Pesan: n.Pesan || '',
      StatusDibaca: Boolean(n.StatusDibaca),
      Timestamp: n.Timestamp.toISOString(),
    }));

    return {
      Total: listNotifikasi.length,
      ListNotifikasi: listNotifikasi,
    };
  } catch (error: any) {
    return {
      Total: 0,
      ListNotifikasi: [],
    };
  }
}

export async function markNotifikasiDibacaSoap(args: MarkNotifikasiDibacaArgs) {
  try {
    const { NotifikasiId, UserId } = args;
    const notifIdNum = NotifikasiId ? Number(NotifikasiId) : null;
    const userIdNum = Number(UserId);

    if (!userIdNum) {
      return {
        Success: false,
        Message: 'UserId wajib disertakan',
      };
    }

    if (notifIdNum && notifIdNum > 0) {
      await prisma.notifikasi.updateMany({
        where: {
          NotifikasiId: notifIdNum,
          UserId: userIdNum,
        },
        data: {
          StatusDibaca: true,
        },
      });
      return {
        Success: true,
        Message: `Notifikasi #${notifIdNum} berhasil ditandai telah dibaca`,
      };
    } else {
      const result = await prisma.notifikasi.updateMany({
        where: {
          UserId: userIdNum,
          StatusDibaca: false,
        },
        data: {
          StatusDibaca: true,
        },
      });
      return {
        Success: true,
        Message: `${result.count} notifikasi berhasil ditandai telah dibaca`,
      };
    }
  } catch (error: any) {
    return {
      Success: false,
      Message: `Gagal menandai notifikasi: ${error.message}`,
    };
  }
}

export async function getUnreadCountSoap(args: GetUnreadCountArgs) {
  try {
    const { UserId } = args;
    const userIdNum = Number(UserId);

    if (!userIdNum) {
      return { UnreadCount: 0 };
    }

    const count = await prisma.notifikasi.count({
      where: {
        UserId: userIdNum,
        StatusDibaca: false,
      },
    });

    return { UnreadCount: count };
  } catch (error: any) {
    return { UnreadCount: 0 };
  }
}
