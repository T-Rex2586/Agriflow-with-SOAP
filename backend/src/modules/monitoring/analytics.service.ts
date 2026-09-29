import prisma from '../../config/database';

/**
 * Advanced Analytics Service with ML-inspired algorithms
 * Implements statistical methods for anomaly detection and forecasting
 */
export class AnalyticsService {
  /**
   * Calculate Z-Score for anomaly detection
   * Z-Score = (x - mean) / stdDev
   * Values with |Z-Score| > 3 are considered anomalies
   */
  private calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return Math.abs((value - mean) / stdDev);
  }

  /**
   * Calculate mean of array
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate Interquartile Range (IQR) for outlier detection
   */
  private calculateIQR(values: number[]): { q1: number; q3: number; iqr: number } {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    return { q1, q3, iqr };
  }

  /**
   * Detect anomalies using Z-Score method
   */
  async detectRedemptionAnomalies(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get redemption data
    const redemptions = await prisma.penebusanPupuk.findMany({
      where: {
        TimestampPenebusan: { gte: startDate },
      },
      include: {
        Pupuk: true,
        Petani: {
          include: {
            Pengecer: {
              select: {
                UserId: true,
                FirstName: true,
                LastName: true,
                Email: true,
              },
            },
          },
        },
      },
    });

    // Group by retailer and fertilizer
    const groupedData = new Map<string, { amounts: number[]; redemptions: any[] }>();

    redemptions.forEach((r) => {
      const key = `${r.UserIdPengecer}-${r.PupukId}`;
      if (!groupedData.has(key)) {
        groupedData.set(key, { amounts: [], redemptions: [] });
      }
      const group = groupedData.get(key)!;
      group.amounts.push(r.Jumlah.toNumber());
      group.redemptions.push(r);
    });

    const anomalies: any[] = [];

    // Analyze each group
    groupedData.forEach((group) => {
      const amounts = group.amounts;
      if (amounts.length < 3) return; // Need minimum data points

      const mean = this.calculateMean(amounts);
      const stdDev = this.calculateStdDev(amounts, mean);
      const { q1, q3, iqr } = this.calculateIQR(amounts);

      // IQR method: outliers are below Q1 - 1.5*IQR or above Q3 + 1.5*IQR
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      group.redemptions.forEach((r) => {
        const amount = r.Jumlah.toNumber();
        const zScore = this.calculateZScore(amount, mean, stdDev);
        const isOutlier = amount < lowerBound || amount > upperBound;

        // Anomaly if Z-Score > 3 OR is IQR outlier
        if (zScore > 3 || isOutlier) {
          anomalies.push({
            type: 'STATISTICAL_ANOMALY',
            subType: 'REDEMPTION',
            severity: zScore > 4 || amount > upperBound * 1.5 ? 'HIGH' : 'MEDIUM',
            description: `Penebusan tidak normal: ${amount} kg (rata-rata: ${mean.toFixed(2)} kg)`,
            details: {
              tebusanId: r.TebusanId,
              pengecer: `${r.Petani.Pengecer.FirstName} ${r.Petani.Pengecer.LastName}`,
              petani: `${r.Petani.FirstName} ${r.Petani.LastName}`,
              pupuk: r.Pupuk.JenisPupuk,
              jumlah: amount,
              statistics: {
                mean: parseFloat(mean.toFixed(2)),
                stdDev: parseFloat(stdDev.toFixed(2)),
                zScore: parseFloat(zScore.toFixed(2)),
                lowerBound: parseFloat(lowerBound.toFixed(2)),
                upperBound: parseFloat(upperBound.toFixed(2)),
              },
            },
            timestamp: r.TimestampPenebusan,
            confidence: Math.min(zScore / 5, 1), // Confidence score 0-1
          });
        }
      });
    });

    return anomalies;
  }

  /**
   * Detect shipment pattern anomalies
   */
  async detectShipmentAnomalies(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const shipments = await prisma.kirimanPupuk.findMany({
      where: {
        TimestampDikirim: { gte: startDate },
      },
      include: {
        Distributor: {
          select: {
            UserId: true,
            FirstName: true,
            LastName: true,
            Email: true,
          },
        },
        Pengecer: {
          select: {
            UserId: true,
            FirstName: true,
            LastName: true,
            Email: true,
          },
        },
        Pupuk: true,
      },
    });

    // Group by distributor
    const distributorData = new Map<string, number[]>();
    shipments.forEach((s) => {
      if (!distributorData.has(s.UserIdDistributor)) {
        distributorData.set(s.UserIdDistributor, []);
      }
      distributorData.get(s.UserIdDistributor)!.push(s.JumlahDikirim.toNumber());
    });

    const anomalies: any[] = [];

    // Analyze shipment patterns
    shipments.forEach((s) => {
      const amounts = distributorData.get(s.UserIdDistributor) || [];
      if (amounts.length < 3) return;

      const mean = this.calculateMean(amounts);
      const stdDev = this.calculateStdDev(amounts, mean);
      const amount = s.JumlahDikirim.toNumber();
      const zScore = this.calculateZScore(amount, mean, stdDev);

      // Check for mismatch
      if (s.Status === 'Tidak Sesuai' && s.JumlahDiterima) {
        const difference = s.JumlahDikirim.minus(s.JumlahDiterima).abs().toNumber();
        const discrepancyRate = (difference / amount) * 100;

        anomalies.push({
          type: 'SHIPMENT_ANOMALY',
          subType: 'MISMATCH',
          severity: discrepancyRate > 20 ? 'HIGH' : discrepancyRate > 10 ? 'MEDIUM' : 'LOW',
          description: `Ketidaksesuaian kiriman ${discrepancyRate.toFixed(1)}%`,
          details: {
            kirimanId: s.KirimanId,
            distributor: `${s.Distributor.FirstName} ${s.Distributor.LastName}`,
            pengecer: `${s.Pengecer.FirstName} ${s.Pengecer.LastName}`,
            pupuk: s.Pupuk.JenisPupuk,
            jumlahDikirim: amount,
            jumlahDiterima: s.JumlahDiterima.toNumber(),
            difference,
            discrepancyRate: parseFloat(discrepancyRate.toFixed(2)),
          },
          timestamp: s.TimestampDiterima,
          confidence: Math.min(discrepancyRate / 50, 1),
        });
      }

      // Check for unusual shipment size
      if (zScore > 3) {
        anomalies.push({
          type: 'SHIPMENT_ANOMALY',
          subType: 'UNUSUAL_SIZE',
          severity: zScore > 4 ? 'HIGH' : 'MEDIUM',
          description: `Ukuran kiriman tidak biasa: ${amount} kg`,
          details: {
            kirimanId: s.KirimanId,
            distributor: `${s.Distributor.FirstName} ${s.Distributor.LastName}`,
            pengecer: `${s.Pengecer.FirstName} ${s.Pengecer.LastName}`,
            pupuk: s.Pupuk.JenisPupuk,
            jumlah: amount,
            statistics: {
              mean: parseFloat(mean.toFixed(2)),
              stdDev: parseFloat(stdDev.toFixed(2)),
              zScore: parseFloat(zScore.toFixed(2)),
            },
          },
          timestamp: s.TimestampDikirim,
          confidence: Math.min(zScore / 5, 1),
        });
      }
    });

    return anomalies;
  }

  /**
   * Time series forecasting using Simple Moving Average
   */
  async forecastDemand(months: number = 3) {
    const historicalMonths = 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - historicalMonths);

    const redemptions = await prisma.penebusanPupuk.findMany({
      where: {
        TimestampPenebusan: { gte: startDate },
      },
      include: {
        Pupuk: true,
      },
    });

    // Group by month and fertilizer
    const monthlyData = new Map<string, Map<string, number>>();

    redemptions.forEach((r) => {
      const month = r.TimestampPenebusan.toISOString().substring(0, 7);
      const fertilizer = r.Pupuk.JenisPupuk;

      if (!monthlyData.has(month)) {
        monthlyData.set(month, new Map());
      }

      const monthMap = monthlyData.get(month)!;
      const current = monthMap.get(fertilizer) || 0;
      monthMap.set(fertilizer, current + r.Jumlah.toNumber());
    });

    // Get all fertilizer types
    const fertilizers = await prisma.pupuk.findMany();

    const forecasts: any[] = [];

    fertilizers.forEach((fertilizer) => {
      // Extract time series for this fertilizer
      const timeSeries: number[] = [];
      const sortedMonths = Array.from(monthlyData.keys()).sort();

      sortedMonths.forEach((month) => {
        const amount = monthlyData.get(month)?.get(fertilizer.JenisPupuk) || 0;
        timeSeries.push(amount);
      });

      if (timeSeries.length < 3) return;

      // Simple Moving Average (SMA) with window of 3
      const window = 3;
      const sma = timeSeries.slice(-window).reduce((sum, val) => sum + val, 0) / window;

      // Calculate trend
      const recentValues = timeSeries.slice(-6);
      const trend = recentValues.length > 1
        ? (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues.length
        : 0;

      // Forecast next months
      const predictions: any[] = [];
      let lastValue = sma;

      for (let i = 1; i <= months; i++) {
        const forecastDate = new Date();
        forecastDate.setMonth(forecastDate.getMonth() + i);
        const forecastMonth = forecastDate.toISOString().substring(0, 7);

        // Apply trend
        const forecast = Math.max(0, lastValue + trend);
        predictions.push({
          month: forecastMonth,
          predicted: parseFloat(forecast.toFixed(2)),
        });

        lastValue = forecast;
      }

      forecasts.push({
        fertilizer: fertilizer.JenisPupuk,
        historical: {
          months: sortedMonths.slice(-6),
          values: timeSeries.slice(-6).map((v) => parseFloat(v.toFixed(2))),
        },
        forecast: predictions,
        statistics: {
          mean: parseFloat(this.calculateMean(timeSeries).toFixed(2)),
          trend: parseFloat(trend.toFixed(2)),
          sma: parseFloat(sma.toFixed(2)),
        },
      });
    });

    return forecasts;
  }

  /**
   * Correlation analysis between provinces and fertilizer types
   */
  async analyzeCorrelations() {
    const redemptions = await prisma.penebusanPupuk.findMany({
      include: {
        Pupuk: true,
        Petani: {
          include: {
            KodePos: true,
          },
        },
      },
    });

    // Build correlation matrix
    const provinceMap = new Map<string, Map<string, number>>();

    redemptions.forEach((r) => {
      const province = r.Petani.KodePos.Provinsi;
      const fertilizer = r.Pupuk.JenisPupuk;

      if (!provinceMap.has(province)) {
        provinceMap.set(province, new Map());
      }

      const fertMap = provinceMap.get(province)!;
      const current = fertMap.get(fertilizer) || 0;
      fertMap.set(fertilizer, current + r.Jumlah.toNumber());
    });

    // Calculate preferences
    const correlations: any[] = [];

    provinceMap.forEach((fertMap, province) => {
      const total = Array.from(fertMap.values()).reduce((sum, val) => sum + val, 0);
      const preferences = Array.from(fertMap.entries())
        .map(([fertilizer, amount]) => ({
          fertilizer,
          amount: parseFloat(amount.toFixed(2)),
          percentage: parseFloat(((amount / total) * 100).toFixed(2)),
        }))
        .sort((a, b) => b.amount - a.amount);

      correlations.push({
        province,
        totalDemand: parseFloat(total.toFixed(2)),
        preferences,
        topFertilizer: preferences[0]?.fertilizer || 'N/A',
      });
    });

    return correlations.sort((a, b) => b.totalDemand - a.totalDemand);
  }

  /**
   * Performance metrics and optimization recommendations
   */
  async generatePerformanceMetrics() {
    // Distribution efficiency
    const shipments = await prisma.kirimanPupuk.findMany({
      include: {
        Distributor: true,
        Pengecer: true,
      },
    });

    const totalShipments = shipments.length;
    const successfulShipments = shipments.filter((s) => s.Status === 'Diterima').length;
    const mismatchShipments = shipments.filter((s) => s.Status === 'Tidak Sesuai').length;

    const successRate = totalShipments > 0 ? (successfulShipments / totalShipments) * 100 : 0;

    // Calculate average delivery accuracy
    const accuracies = shipments
      .filter((s) => s.JumlahDiterima)
      .map((s) => {
        const sent = s.JumlahDikirim.toNumber();
        const received = s.JumlahDiterima!.toNumber();
        return (Math.min(sent, received) / Math.max(sent, received)) * 100;
      });

    const avgAccuracy = accuracies.length > 0 ? this.calculateMean(accuracies) : 0;

    // Quota utilization
    const quotas = await prisma.kuotaPetani.findMany();
    const totalQuota = quotas.reduce((sum, q) => sum + q.SisaKuota.toNumber(), 0);

    const redemptions = await prisma.penebusanPupuk.findMany();
    const totalRedeemed = redemptions.reduce((sum, r) => sum + r.Jumlah.toNumber(), 0);

    // Stock turnover
    const stocks = await prisma.stok.findMany();
    const totalStock = stocks.reduce((sum, s) => sum + s.Jumlah.toNumber(), 0);

    const recommendations: string[] = [];

    if (successRate < 95) {
      recommendations.push('Tingkatkan akurasi pengiriman untuk mengurangi ketidaksesuaian');
    }

    if (avgAccuracy < 98) {
      recommendations.push('Perbaiki proses verifikasi jumlah kiriman');
    }

    if (totalStock > totalRedeemed * 2) {
      recommendations.push('Stok berlebih terdeteksi, pertimbangkan optimasi distribusi');
    }

    if (totalQuota < totalRedeemed * 0.1) {
      recommendations.push('Kuota petani hampir habis, perlu penambahan kuota');
    }

    return {
      distribution: {
        totalShipments,
        successfulShipments,
        mismatchShipments,
        successRate: parseFloat(successRate.toFixed(2)),
        avgAccuracy: parseFloat(avgAccuracy.toFixed(2)),
      },
      quota: {
        totalQuota: parseFloat(totalQuota.toFixed(2)),
        totalRedeemed: parseFloat(totalRedeemed.toFixed(2)),
        utilizationRate: totalQuota > 0 ? parseFloat(((totalRedeemed / (totalRedeemed + totalQuota)) * 100).toFixed(2)) : 0,
      },
      stock: {
        totalStock: parseFloat(totalStock.toFixed(2)),
        turnoverRatio: totalStock > 0 ? parseFloat((totalRedeemed / totalStock).toFixed(2)) : 0,
      },
      recommendations,
    };
  }
}
