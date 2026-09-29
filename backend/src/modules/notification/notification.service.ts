import prisma from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';

function esc(val: string | null | undefined): string {
  if (val == null) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

export class NotificationService {
  async getNotifications(userId: number, unreadOnly: boolean = false) {
    const where: any = {
      UserId: userId,
    };

    if (unreadOnly) {
      where.StatusDibaca = false;
    }

    const notifications = await prisma.notifikasi.findMany({
      where,
      orderBy: {
        Timestamp: 'desc',
      },
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
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await prisma.notifikasi.findUnique({
      where: { NotifikasiId: notificationId },
    });

    if (!notification) {
      throw new AppError('Notifikasi tidak ditemukan', 404);
    }

    if (notification.UserId !== userId) {
      throw new AppError('Notifikasi bukan milik Anda', 403);
    }

    const updated = await prisma.notifikasi.update({
      where: { NotifikasiId: notificationId },
      data: { StatusDibaca: true },
    });

    return updated;
  }

  async markAllAsRead(userId: number) {
    const result = await prisma.notifikasi.updateMany({
      where: {
        UserId: userId,
        StatusDibaca: false,
      },
      data: {
        StatusDibaca: true,
      },
    });

    return { count: result.count };
  }

  async getUnreadCount(userId: number) {
    const count = await prisma.notifikasi.count({
      where: {
        UserId: userId,
        StatusDibaca: false,
      },
    });

    return { count };
  }

  async deleteNotification(notificationId: number, userId: number) {
    const notification = await prisma.notifikasi.findUnique({
      where: { NotifikasiId: notificationId },
    });

    if (!notification) {
      throw new AppError('Notifikasi tidak ditemukan', 404);
    }

    if (notification.UserId !== userId) {
      throw new AppError('Notifikasi bukan milik Anda', 403);
    }

    await prisma.notifikasi.delete({
      where: { NotifikasiId: notificationId },
    });

    return { message: 'Notifikasi berhasil dihapus' };
  }

  async createNotification(data: {
    userId: number;
    jenis: string;
    judul: string;
    pesan: string;
  }) {
    const result = await prisma.$queryRaw<any[]>`
      INSERT INTO evt.NOTIFIKASI (NotifikasiId, Jenis, Judul, Pesan, StatusDibaca, UserId, Timestamp)
      OUTPUT INSERTED.*
      VALUES (
        (SELECT ISNULL(MAX(NotifikasiId), 0) + 1 FROM evt.NOTIFIKASI WITH (TABLOCKX)),
        ${data.jenis},
        ${data.judul},
        ${data.pesan},
        0,
        ${data.userId},
        GETDATE()
      )
    `;

    return result[0];
  }

  async submitComplaint(data: {
    firstName: string;
    middleName?: string;
    lastName?: string;
    email: string;
    topik: string;
    ringkasan: string;
    userId?: number;
  }) {
    if (data.ringkasan.length > 100) {
      throw new AppError('Ringkasan maksimal 100 karakter', 400);
    }

    const result = await prisma.$queryRaw<any[]>`
      INSERT INTO evt.BANTUAN (BantuanId, FirstName, MiddleName, LastName, Email, Topik, Ringkasan, UserId, Timestamp)
      OUTPUT INSERTED.*
      VALUES (
        (SELECT ISNULL(MAX(BantuanId), 0) + 1 FROM evt.BANTUAN WITH (TABLOCKX)),
        ${data.firstName},
        ${data.middleName || null},
        ${data.lastName || null},
        ${data.email},
        ${data.topik},
        ${data.ringkasan},
        ${data.userId ?? null},
        GETDATE()
      )
    `;

    const complaint = result[0];

    if (data.userId != null) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          'SUBMIT_COMPLAINT',
          ${esc(`Mengajukan bantuan: ${data.topik}`)},
          ${data.userId},
          GETDATE()
        )
      `);
    }

    return complaint;
  }

  async getComplaints() {
    const complaints = await prisma.bantuan.findMany({
      orderBy: {
        Timestamp: 'desc',
      },
      include: {
        User: {
          select: {
            Email: true,
            Role: {
              select: {
                RoleName: true,
              },
            },
          },
        },
      },
    });

    return complaints;
  }

  async getComplaintById(complaintId: number) {
    const complaint = await prisma.bantuan.findUnique({
      where: { BantuanId: complaintId },
      include: {
        User: {
          select: {
            Email: true,
            FirstName: true,
            LastName: true,
            Role: {
              select: {
                RoleName: true,
              },
            },
          },
        },
      },
    });

    if (!complaint) {
      throw new AppError('Bantuan tidak ditemukan', 404);
    }

    return complaint;
  }
}
