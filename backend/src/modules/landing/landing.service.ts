import prisma from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';

export class LandingService {
  async getStats() {
    const [farmerCount, distributedAmount, fertilizerCount, distribusi] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS total FROM master.PETANI
      `,
      prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(Jumlah), 0) AS total FROM trans.PENEBUSAN_PUPUK
      `,
      prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS total FROM master.PUPUK
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          p.JenisPupuk AS namaPupuk,
          COALESCE(SUM(pb.Jumlah), 0) AS jumlahTersalurkan
        FROM master.PUPUK p
        LEFT JOIN trans.PENEBUSAN_PUPUK pb ON p.PupukId = pb.PupukId
        GROUP BY p.JenisPupuk
        ORDER BY SUM(pb.Jumlah) DESC
      `,
    ]);

    const totalFarmers = Number(farmerCount[0]?.total ?? 0);
    const distributedKg = Number(distributedAmount[0]?.total ?? 0);
    const fertilizerCountVal = Number(fertilizerCount[0]?.total ?? 0);

    return {
      totalFarmers,
      distributedTon: Math.round((distributedKg / 1000) * 100) / 100,
      fertilizerCount: fertilizerCountVal,
      mostPopularFertilizer: distribusi[0]?.namaPupuk || 'N/A',
      fertilizerDistribution: distribusi.map(d => ({
        name: d.namaPupuk,
        amount: Number(d.jumlahTersalurkan ?? 0),
      })),
    };
  }

  async getAbout() {
    return {
      name: 'AgriFlow',
      description:
        'Sistem Manajemen Distribusi Subsidi Pupuk untuk mengelola alur stok dan penebusan subsidi dari Pemerintah → Distributor → Pengecer → Petani.',
      version: '1.0.0',
      features: [
        'Manajemen stok pupuk bersubsidi',
        'Pelacakan pengiriman distributor ke pengecer',
        'Validasi dan penebusan kuota petani',
        'Monitoring dan analitik distribusi',
        'Deteksi anomali otomatis',
        'Sistem notifikasi real-time',
      ],
      roles: [
        {
          name: 'Pemerintah',
          description:
            'Menyetujui registrasi pengguna, monitoring distribusi, dan melihat laporan anomali',
        },
        {
          name: 'Distributor',
          description:
            'Mengelola stok pupuk dan membuat pengiriman ke pengecer',
        },
        {
          name: 'Pengecer',
          description:
            'Menerima pengiriman, memvalidasi petani, dan memproses penebusan pupuk',
        },
      ],
      contact: {
        email: 'support@agriflow.com',
        phone: '+62-xxx-xxxx-xxxx',
      },
    };
  }

  async getFertilizers() {
    const fertilizers = await prisma.pupuk.findMany({
      orderBy: {
        JenisPupuk: 'asc',
      },
    });

    // Get distribution stats for each fertilizer
    const fertilizerStats = await Promise.all(
      fertilizers.map(async (f) => {
        const redemptions = await prisma.penebusanPupuk.findMany({
          where: { PupukId: f.PupukId },
        });

        const totalDistributed = redemptions.reduce(
          (sum, r) => sum.plus(r.Jumlah),
          new Decimal(0)
        );

        const totalStock = await prisma.stok.findMany({
          where: { PupukId: f.PupukId },
        });

        const availableStock = totalStock.reduce(
          (sum, s) => sum.plus(s.Jumlah),
          new Decimal(0)
        );

        return {
          pupukId: f.PupukId,
          jenisPupuk: f.JenisPupuk,
          totalDistributed: totalDistributed.toNumber(),
          availableStock: availableStock.toNumber(),
          redemptionCount: redemptions.length,
        };
      })
    );

    return fertilizerStats;
  }
}
