import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { NotificationService } from './notification.service';

const notificationService = new NotificationService();

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user!.userId);
      if (isNaN(userId)) {
        res.status(401).json({ error: 'Token tidak valid, silakan login ulang' });
        return;
      }
      const unreadOnly = req.query.unreadOnly === 'true';

      const notifications = await notificationService.getNotifications(
        userId,
        unreadOnly
      );

      res.json({
        message: 'Berhasil mengambil notifikasi',
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user!.userId);
      if (isNaN(userId)) {
        res.status(401).json({ error: 'Token tidak valid, silakan login ulang' });
        return;
      }

      const result = await notificationService.getUnreadCount(userId);

      res.json({
        message: 'Berhasil mengambil jumlah notifikasi belum dibaca',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user!.userId);
      const notificationId = Number(req.params.id);
      if (isNaN(userId) || isNaN(notificationId)) {
        res.status(400).json({ error: 'ID tidak valid' });
        return;
      }

      const notification = await notificationService.markAsRead(notificationId, userId);

      res.json({
        message: 'Notifikasi ditandai sebagai dibaca',
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user!.userId);
      if (isNaN(userId)) {
        res.status(401).json({ error: 'Token tidak valid, silakan login ulang' });
        return;
      }

      const result = await notificationService.markAllAsRead(userId);

      res.json({
        message: 'Semua notifikasi ditandai sebagai dibaca',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user!.userId);
      const notificationId = Number(req.params.id);
      if (isNaN(userId) || isNaN(notificationId)) {
        res.status(400).json({ error: 'ID tidak valid' });
        return;
      }

      const result = await notificationService.deleteNotification(notificationId, userId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async submitComplaint(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId != null ? Number(req.user.userId) : undefined;
      const { firstName, middleName, lastName, email, topik, ringkasan } = req.body;

      const complaint = await notificationService.submitComplaint({
        firstName,
        middleName,
        lastName,
        email,
        topik,
        ringkasan,
        userId,
      });

      res.status(201).json({
        message: 'Bantuan berhasil diajukan',
        data: complaint,
      });
    } catch (error) {
      next(error);
    }
  }

  async getComplaints(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const complaints = await notificationService.getComplaints();

      res.json({
        message: 'Berhasil mengambil daftar bantuan',
        data: complaints,
      });
    } catch (error) {
      next(error);
    }
  }

  async getComplaintById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'ID tidak valid' });
        return;
      }

      const complaint = await notificationService.getComplaintById(id);

      res.json({
        message: 'Berhasil mengambil detail bantuan',
        data: complaint,
      });
    } catch (error) {
      next(error);
    }
  }
}
