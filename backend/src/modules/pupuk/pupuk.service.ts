import prisma from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';

export class PupukService {
  async getAllPupuk() {
    const rows = await prisma.pupuk.findMany({
      select: {
        PupukId: true,
        JenisPupuk: true,
      },
      orderBy: {
        JenisPupuk: 'asc',
      },
    });
    return rows.map(r => ({ pupukId: r.PupukId, jenisPupuk: r.JenisPupuk }));
  }

  async createPupuk(jenisPupuk: string) {
    const name = jenisPupuk.trim()
    if (!name) throw new AppError('Nama pupuk tidak boleh kosong', 400);
    if (name.length > 50) throw new AppError('Nama pupuk maksimal 50 karakter', 400);

    const existing = await prisma.pupuk.findUnique({
      where: { JenisPupuk: name },
    });
    if (existing) {
      throw new AppError('Jenis pupuk sudah terdaftar', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const maxRow = await tx.$queryRaw<{ maxId: number | null }[]>`
        SELECT MAX(PupukId) AS maxId FROM master.PUPUK
      `;
      const newId = (maxRow[0]?.maxId ?? 0) + 1;

      const pupuk = await tx.pupuk.create({
        data: {
          PupukId: newId,
          JenisPupuk: name,
        },
      });

      return pupuk;
    });

    return {
      pupukId: result.PupukId,
      jenisPupuk: result.JenisPupuk,
    };
  }
}
