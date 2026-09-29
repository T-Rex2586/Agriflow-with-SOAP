import prisma from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';

interface MonitoringFilters {
  province?: string;
  dateStart?: string;
  dateEnd?: string;
  fertilizer?: string;
}

export class MonitoringService {
  async getMonitoringData(filters: MonitoringFilters) {
    // Build where clause for redemptions
    const where: any = {};

    if (filters.dateStart || filters.dateEnd) {
      where.TimestampPenebusan = {};
      if (filters.dateStart) {
        where.TimestampPenebusan.gte = new Date(filters.dateStart);
      }
      if (filters.dateEnd) {
        where.TimestampPenebusan.lte = new Date(filters.dateEnd);
      }
    }

    if (filters.fertilizer) {
      where.Pupuk = {
        JenisPupuk: {
          contains: filters.fertilizer,
        },
      };
    }

    // Get redemptions with location data
    const redemptions = await prisma.penebusanPupuk.findMany({
      where,
      include: {
        Pupuk: true,
        Petani: {
          include: {
            KodePos: true,
          },
        },
      },
    });

    // Filter by province if specified
    let filteredRedemptions = redemptions;
    if (filters.province) {
      filteredRedemptions = redemptions.filter(
        (r) => r.Petani.KodePos.Provinsi === filters.province
      );
    }

    // Calculate absorbed fertilizer
    const totalAbsorbed = filteredRedemptions.reduce(
      (sum, r) => sum.plus(r.Jumlah),
      new Decimal(0)
    );

    // Group by province
    const byProvince = new Map<string, Decimal>();
    filteredRedemptions.forEach((r) => {
      const province = r.Petani.KodePos.Provinsi;
      const current = byProvince.get(province) || new Decimal(0);
      byProvince.set(province, current.plus(r.Jumlah));
    });

    const provinceData = Array.from(byProvince.entries())
      .map(([province, amount]) => ({
        province,
        amount: amount.toNumber(),
      }))
      .sort((a, b) => b.amount - a.amount);

    const topProvince = provinceData[0] || { province: 'N/A', amount: 0 };

    // Group by fertilizer type
    const byFertilizer = new Map<string, Decimal>();
    filteredRedemptions.forEach((r) => {
      const fertilizer = r.Pupuk.JenisPupuk;
      const current = byFertilizer.get(fertilizer) || new Decimal(0);
      byFertilizer.set(fertilizer, current.plus(r.Jumlah));
    });

    const fertilizerData = Array.from(byFertilizer.entries()).map(
      ([fertilizer, amount]) => ({
        fertilizer,
        amount: amount.toNumber(),
      })
    );

    // Group by month
    const byMonth = new Map<string, Decimal>();
    filteredRedemptions.forEach((r) => {
      const month = r.TimestampPenebusan.toISOString().substring(0, 7); // YYYY-MM
      const current = byMonth.get(month) || new Decimal(0);
      byMonth.set(month, current.plus(r.Jumlah));
    });

    const monthlyTrend = Array.from(byMonth.entries())
      .map(([month, amount]) => ({
        month,
        amount: amount.toNumber(),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Get farmer statistics
    const totalFarmers = await prisma.petani.count();
    const now = new Date();
    const activeFarmers = await prisma.petani.count({
      where: {
        AwalTerdaftar: { lte: now },
        AkhirTerdaftar: { gte: now },
        Status: 'Active',
      },
    });

    return {
      summary: {
        totalAbsorbed: totalAbsorbed.toNumber(),
        topProvince,
        totalFarmers,
        activeFarmers,
        redemptionCount: filteredRedemptions.length,
      },
      byProvince: provinceData,
      byFertilizer: fertilizerData,
      monthlyTrend,
    };
  }

  async detectAnomalies() {
    // Anomaly detection logic
    const anomalies: any[] = [];

    // 1. Detect shipment mismatches
    const mismatches = await prisma.kirimanPupuk.findMany({
      where: {
        Status: 'Tidak Sesuai',
      },
      include: {
        Distributor: {
          select: {
            Email: true,
            FirstName: true,
            LastName: true,
          },
        },
        Pengecer: {
          select: {
            Email: true,
            FirstName: true,
            LastName: true,
          },
        },
        Pupuk: true,
      },
      orderBy: {
        TimestampDiterima: 'desc',
      },
      take: 50,
    });

    mismatches.forEach((m) => {
      const difference = m.JumlahDiterima
        ? m.JumlahDikirim.minus(m.JumlahDiterima).abs()
        : m.JumlahDikirim;

      anomalies.push({
        type: 'SHIPMENT_MISMATCH',
        severity: difference.greaterThan(100) ? 'HIGH' : 'MEDIUM',
        description: `Ketidaksesuaian kiriman: Dikirim ${m.JumlahDikirim}, Diterima ${m.JumlahDiterima || 0}`,
        details: {
          kirimanId: m.KirimanId,
          distributor: `${m.Distributor.FirstName} ${m.Distributor.LastName}`,
          pengecer: `${m.Pengecer.FirstName} ${m.Pengecer.LastName}`,
          pupuk: m.Pupuk.JenisPupuk,
          jumlahDikirim: m.JumlahDikirim.toNumber(),
          jumlahDiterima: m.JumlahDiterima?.toNumber() || 0,
          difference: difference.toNumber(),
        },
        timestamp: m.TimestampDiterima,
      });
    });

    // 2. Detect unusual redemption patterns (large single redemptions)
    const largeRedemptions = await prisma.penebusanPupuk.findMany({
      where: {
        Jumlah: {
          gte: 500, // Threshold for large redemption
        },
      },
      include: {
        Pengecer: {
          select: {
            Email: true,
            FirstName: true,
            LastName: true,
          },
        },
        Petani: {
          select: {
            FirstName: true,
            LastName: true,
            PetaniId: true,
          },
        },
        Pupuk: true,
      },
      orderBy: {
        TimestampPenebusan: 'desc',
      },
      take: 50,
    });

    largeRedemptions.forEach((r) => {
      anomalies.push({
        type: 'LARGE_REDEMPTION',
        severity: r.Jumlah.greaterThan(1000) ? 'HIGH' : 'MEDIUM',
        description: `Penebusan besar: ${r.Jumlah} kg ${r.Pupuk.JenisPupuk}`,
        details: {
          tebusanId: r.TebusanId,
          pengecer: `${r.Pengecer.FirstName} ${r.Pengecer.LastName}`,
          petani: `${r.Petani.FirstName} ${r.Petani.LastName} (${r.Petani.PetaniId})`,
          pupuk: r.Pupuk.JenisPupuk,
          jumlah: r.Jumlah.toNumber(),
        },
        timestamp: r.TimestampPenebusan,
      });
    });

    // 3. Detect low stock levels
    const lowStocks = await prisma.stok.findMany({
      where: {
        Jumlah: {
          lte: 50, // Threshold for low stock
        },
      },
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
        Pupuk: true,
      },
    });

    lowStocks.forEach((s) => {
      anomalies.push({
        type: 'LOW_STOCK',
        severity: s.Jumlah.lessThanOrEqualTo(10) ? 'HIGH' : 'LOW',
        description: `Stok rendah: ${s.Jumlah} kg ${s.Pupuk.JenisPupuk}`,
        details: {
          user: `${s.User.FirstName} ${s.User.LastName}`,
          email: s.User.Email,
          role: s.User.Role.RoleName,
          pupuk: s.Pupuk.JenisPupuk,
          jumlah: s.Jumlah.toNumber(),
        },
        timestamp: s.Timestamp,
      });
    });

    // 4. Detect quota near exhaustion
    const lowQuotas = await prisma.kuotaPetani.findMany({
      where: {
        SisaKuota: {
          lte: 10,
          gt: 0,
        },
      },
      include: {
        Petani: {
          select: {
            FirstName: true,
            LastName: true,
            PetaniId: true,
            Pengecer: {
              select: {
                Email: true,
                FirstName: true,
                LastName: true,
              },
            },
          },
        },
        Pupuk: true,
      },
      take: 100,
    });

    lowQuotas.forEach((q) => {
      anomalies.push({
        type: 'LOW_QUOTA',
        severity: 'LOW',
        description: `Kuota hampir habis: ${q.SisaKuota} kg ${q.Pupuk.JenisPupuk}`,
        details: {
          petani: `${q.Petani.FirstName} ${q.Petani.LastName} (${q.Petani.PetaniId})`,
          pengecer: `${q.Petani.Pengecer.FirstName} ${q.Petani.Pengecer.LastName}`,
          pupuk: q.Pupuk.JenisPupuk,
          sisaKuota: q.SisaKuota.toNumber(),
        },
        timestamp: new Date(),
      });
    });

    // Sort by severity and timestamp
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    anomalies.sort((a, b) => {
      const severityDiff = severityOrder[a.severity as keyof typeof severityOrder] - 
                          severityOrder[b.severity as keyof typeof severityOrder];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return {
      total: anomalies.length,
      bySeverity: {
        high: anomalies.filter((a) => a.severity === 'HIGH').length,
        medium: anomalies.filter((a) => a.severity === 'MEDIUM').length,
        low: anomalies.filter((a) => a.severity === 'LOW').length,
      },
      anomalies: anomalies.slice(0, 100), // Return top 100
    };
  }

  async getProvinces() {
    const provinces = await prisma.kodePos.findMany({
      select: {
        Provinsi: true,
      },
      distinct: ['Provinsi'],
      orderBy: {
        Provinsi: 'asc',
      },
    });

    return provinces.map((p) => p.Provinsi);
  }

  async getDistributionTrends(months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const redemptions = await prisma.penebusanPupuk.findMany({
      where: {
        TimestampPenebusan: {
          gte: startDate,
        },
      },
      include: {
        Pupuk: true,
      },
    });

    // Group by month and fertilizer type
    const trendMap = new Map<string, Map<string, Decimal>>();

    redemptions.forEach((r) => {
      const month = r.TimestampPenebusan.toISOString().substring(0, 7);
      const fertilizer = r.Pupuk.JenisPupuk;

      if (!trendMap.has(month)) {
        trendMap.set(month, new Map());
      }

      const monthData = trendMap.get(month)!;
      const current = monthData.get(fertilizer) || new Decimal(0);
      monthData.set(fertilizer, current.plus(r.Jumlah));
    });

    // Convert to array format
    const trends = Array.from(trendMap.entries())
      .map(([month, fertilizerMap]) => ({
        month,
        data: Array.from(fertilizerMap.entries()).map(([fertilizer, amount]) => ({
          fertilizer,
          amount: amount.toNumber(),
        })),
        total: Array.from(fertilizerMap.values()).reduce(
          (sum, val) => sum.plus(val),
          new Decimal(0)
        ).toNumber(),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return trends;
  }
}
