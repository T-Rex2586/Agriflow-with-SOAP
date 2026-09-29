import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { MonitoringService } from './monitoring.service';
import { AnalyticsService } from './analytics.service';

const monitoringService = new MonitoringService();
const analyticsService = new AnalyticsService();

export class MonitoringController {
  async getMonitoring(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { province, dateStart, dateEnd, fertilizer } = req.query;

      const data = await monitoringService.getMonitoringData({
        province: province as string,
        dateStart: dateStart as string,
        dateEnd: dateEnd as string,
        fertilizer: fertilizer as string,
      });

      res.json({
        message: 'Berhasil mengambil data monitoring',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnomalies(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const anomalies = await monitoringService.detectAnomalies();

      res.json({
        message: 'Berhasil mengambil data anomali',
        data: anomalies,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProvinces(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const provinces = await monitoringService.getProvinces();

      res.json({
        message: 'Berhasil mengambil daftar provinsi',
        data: provinces,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrends(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { months } = req.query;
      const monthCount = months ? parseInt(months as string) : 12;

      const trends = await monitoringService.getDistributionTrends(monthCount);

      res.json({
        message: 'Berhasil mengambil data tren distribusi',
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdvancedAnomalies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days } = req.query;
      const dayCount = days ? parseInt(days as string) : 30;

      const [redemptionAnomalies, shipmentAnomalies, basicAnomalies] = await Promise.all([
        analyticsService.detectRedemptionAnomalies(dayCount),
        analyticsService.detectShipmentAnomalies(dayCount),
        monitoringService.detectAnomalies(),
      ]);

      // Combine all anomalies
      const allAnomalies = [
        ...redemptionAnomalies,
        ...shipmentAnomalies,
        ...basicAnomalies.anomalies,
      ];

      // Sort by confidence and severity
      const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      allAnomalies.sort((a, b) => {
        const confDiff = (b.confidence || 0.5) - (a.confidence || 0.5);
        if (Math.abs(confDiff) > 0.1) return confDiff;
        
        const severityDiff = severityOrder[a.severity as keyof typeof severityOrder] - 
                            severityOrder[b.severity as keyof typeof severityOrder];
        if (severityDiff !== 0) return severityDiff;
        
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      res.json({
        message: 'Berhasil mengambil data anomali lanjutan',
        data: {
          total: allAnomalies.length,
          bySeverity: {
            high: allAnomalies.filter((a) => a.severity === 'HIGH').length,
            medium: allAnomalies.filter((a) => a.severity === 'MEDIUM').length,
            low: allAnomalies.filter((a) => a.severity === 'LOW').length,
          },
          byType: {
            statistical: allAnomalies.filter((a) => a.type === 'STATISTICAL_ANOMALY').length,
            shipment: allAnomalies.filter((a) => a.type === 'SHIPMENT_ANOMALY' || a.type === 'SHIPMENT_MISMATCH').length,
            stock: allAnomalies.filter((a) => a.type === 'LOW_STOCK').length,
            quota: allAnomalies.filter((a) => a.type === 'LOW_QUOTA').length,
            redemption: allAnomalies.filter((a) => a.type === 'LARGE_REDEMPTION').length,
          },
          anomalies: allAnomalies.slice(0, 100),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getForecast(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { months } = req.query;
      const monthCount = months ? parseInt(months as string) : 3;

      const forecast = await analyticsService.forecastDemand(monthCount);

      res.json({
        message: 'Berhasil mengambil prediksi permintaan',
        data: forecast,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCorrelations(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const correlations = await analyticsService.analyzeCorrelations();

      res.json({
        message: 'Berhasil mengambil analisis korelasi',
        data: correlations,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPerformanceMetrics(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await analyticsService.generatePerformanceMetrics();

      res.json({
        message: 'Berhasil mengambil metrik performa',
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
}
