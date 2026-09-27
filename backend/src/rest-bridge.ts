import { Router, Request, Response } from 'express';
import { loginUserSoap, registerUserSoap } from './services/auth.soap';
import { getPetaniByNIKSoap, cekKuotaPetaniSoap, getPetaniListSoap } from './services/petani.soap';
import { penebusanPupukSoap, getRiwayatPenebusanSoap } from './services/penebusan.soap';
import { cekStokSoap, getRiwayatStokSoap, adjustStokSoap } from './services/stok.soap';
import { createKirimanPupukSoap, terimaKirimanPupukSoap, getKirimanListSoap } from './services/shipment.soap';
import { getNotifikasiSoap, markNotifikasiDibacaSoap, getUnreadCountSoap } from './services/notifikasi.soap';
import {
  getDashboardPemerintahSoap,
  getPendingUsersSoap,
  approveUserSoap,
  rejectUserSoap,
  getDeteksiAnomaliSoap,
} from './services/pemerintah.soap';
import { createBantuanSoap, getBantuanListSoap } from './services/bantuan.soap';
import jwt from 'jsonwebtoken';
import { config } from './config/env';
import prisma from './database/prisma';

export const restBridgeRouter = Router();

// Middleware helper untuk ekstrak user dari JWT token
function getUserFromReq(req: Request): any {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return jwt.verify(token, config.jwt.secret);
    }
  } catch {
    // Ignore invalid token
  }
  return null;
}

// 1. Auth Routes
restBridgeRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await loginUserSoap({ Email: email, Password: password });
  if (!result.Success) {
    return res.status(401).json({ success: false, error: result.Message, message: result.Message });
  }

  return res.json({
    success: true,
    message: result.Message,
    data: {
      accessToken: result.AccessToken,
      refreshToken: result.AccessToken,
      user: {
        userId: result.UserId,
        email: result.Email,
        name: result.Name,
        role: result.Role,
        status: result.Status,
      },
    },
  });
});

restBridgeRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { fullname, email, password, role } = req.body;
  const result = await registerUserSoap({ Fullname: fullname, Email: email, Password: password, Role: role });
  if (!result.Success) {
    return res.status(400).json({ success: false, error: result.Message, message: result.Message });
  }
  return res.json({ success: true, message: result.Message, data: result });
});

restBridgeRouter.get('/auth/me', async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  return res.json({ success: true, data: { user } });
});

// 2. Petani Routes
restBridgeRouter.get('/petani/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '');
  const result = await getPetaniByNIKSoap({ NIK: q });
  if (result.Found) {
    return res.json({
      success: true,
      data: [{
        petaniId: result.PetaniId,
        nik: result.NIK,
        nama: result.NamaLengkap,
        alamat: result.Alamat,
        status: result.Status,
      }],
    });
  }
  return res.json({ success: true, data: [] });
});

restBridgeRouter.get('/petani/:nik', async (req: Request, res: Response) => {
  const result = await getPetaniByNIKSoap({ NIK: req.params.nik });
  if (!result.Found) return res.status(404).json({ success: false, message: 'Petani tidak ditemukan' });
  return res.json({ success: true, data: result });
});

restBridgeRouter.get('/pengecer/validasi-petani/:nik', async (req: Request, res: Response) => {
  const [petaniRes, kuotaRes] = await Promise.all([
    getPetaniByNIKSoap({ NIK: req.params.nik }),
    cekKuotaPetaniSoap({ PetaniId: req.params.nik }),
  ]);

  if (!petaniRes.Found) {
    return res.status(404).json({ success: false, message: 'Petani tidak ditemukan' });
  }

  return res.json({
    success: true,
    data: {
      petaniDetails: {
        petaniId: petaniRes.PetaniId,
        nama: petaniRes.NamaLengkap,
        alamat: petaniRes.Alamat,
        nomorHp: petaniRes.NomorHp,
        desaKelurahan: petaniRes.DesaKelurahan,
        kecamatan: petaniRes.Kecamatan,
        kabupatenKota: petaniRes.KabupatenKota,
        provinsi: petaniRes.Provinsi,
        luasLahan: petaniRes.LuasLahan,
        sektor: petaniRes.Sektor,
        status: petaniRes.Status,
      },
      quotas: kuotaRes.ListKuota.map((k) => ({
        pupukId: k.PupukId,
        jenisPupuk: k.NamaPupuk,
        sisaKuota: k.SisaKuota,
      })),
    },
  });
});

// 3. Penebusan Routes
restBridgeRouter.post('/pengecer/penebusan', async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const userIdPengecer = user?.userId || req.body.userIdPengecer;
  const { petaniId, pupukId, jumlah } = req.body;

  const result = await penebusanPupukSoap({
    UserIdPengecer: Number(userIdPengecer),
    PetaniId: String(petaniId),
    PupukId: Number(pupukId),
    Jumlah: Number(jumlah),
  });

  if (!result.Success) {
    return res.status(400).json({ success: false, message: result.Message, error: result.Message });
  }

  return res.json({ success: true, message: result.Message, data: result });
});

restBridgeRouter.get('/pengecer/penebusan/history', async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const result = await getRiwayatPenebusanSoap({ UserIdPengecer: Number(user?.userId || 2) });
  return res.json({ success: true, data: result.ListRiwayat });
});

// 4. Stok Routes
restBridgeRouter.get(['/pengecer/stok', '/distributor/stok'], async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const result = await cekStokSoap({ UserId: Number(user?.userId || 2) });
  const totalStockKg = result.ListStok.reduce((acc, curr) => acc + curr.JumlahStok, 0);

  return res.json({
    success: true,
    data: {
      totalStockTon: totalStockKg / 1000,
      stockItems: result.ListStok.map((s) => ({
        pupukId: s.PupukId,
        jenisPupuk: s.NamaPupuk,
        jumlah: s.JumlahStok,
        timestamp: s.TerakhirUpdate,
      })),
    },
  });
});

restBridgeRouter.get(['/pengecer/riwayat-stok', '/distributor/stok/history/masuk'], async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const result = await getRiwayatStokSoap({ UserId: Number(user?.userId || 2) });
  return res.json({ success: true, data: result.ListRiwayat });
});

restBridgeRouter.post('/stock', async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const { pupukId, jumlah, keterangan } = req.body;
  const result = await adjustStokSoap({
    UserId: Number(user?.userId || 2),
    PupukId: Number(pupukId),
    JumlahPenyesuaian: Number(jumlah),
    Keterangan: keterangan,
  });
  if (!result.Success) return res.status(400).json({ success: false, message: result.Message });
  return res.json({ success: true, data: result });
});

// 5. Dashboard Routes
restBridgeRouter.get('/pemerintah/dashboard', async (req: Request, res: Response) => {
  const result = await getDashboardPemerintahSoap({
    TahunAwal: req.query.tahunAwal ? Number(req.query.tahunAwal) : undefined,
    TahunAkhir: req.query.tahunAkhir ? Number(req.query.tahunAkhir) : undefined,
  });

  return res.json({
    success: true,
    data: {
      totalAbsorbedTon: result.TotalTerserapTon,
      totalAlokasiKg: result.TotalAlokasiKg,
      totalSisaKuotaKg: result.TotalSisaKuotaKg,
      realisasiPersen: result.RealisasiPersen,
      provinsiDistribution: [],
      monthlyTrends: [],
      sectorDistribution: [],
    },
  });
});

restBridgeRouter.get('/pemerintah/stock-time-series', async (_req: Request, res: Response) => {
  return res.json({ success: true, data: [] });
});

restBridgeRouter.get(['/pengecer/dashboard', '/distributor/dashboard'], async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const stokRes = await cekStokSoap({ UserId: Number(user?.userId || 2) });
  const totalStockKg = stokRes.ListStok.reduce((acc, curr) => acc + curr.JumlahStok, 0);

  return res.json({
    success: true,
    data: {
      totalStokKg: totalStockKg,
      totalStokTon: totalStockKg / 1000,
      stockItems: stokRes.ListStok,
      recentTransactions: [],
      recentKiriman: [],
    },
  });
});

// 6. User Verification & Pending Users
restBridgeRouter.get('/pemerintah/users/pending', async (_req: Request, res: Response) => {
  const result = await getPendingUsersSoap({});
  return res.json({
    success: true,
    data: {
      users: result.ListUsers.map((u) => ({
        userId: u.UserId,
        fullname: u.NamaLengkap,
        email: u.Email,
        role: u.Role,
        status: u.Status,
        createdAt: u.TanggalDaftar,
      })),
      total: result.Total,
    },
  });
});

restBridgeRouter.post('/pemerintah/users/:userId/approve', async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const approverId = Number(user?.userId || 2);
  const targetId = Number(req.params.userId);

  const result = await approveUserSoap({ UserId: targetId, ApproverId: approverId });
  if (!result.Success) return res.status(400).json({ success: false, message: result.Message });
  return res.json({ success: true, message: result.Message, data: result });
});

restBridgeRouter.post('/pemerintah/users/:userId/reject', async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const approverId = Number(user?.userId || 2);
  const targetId = Number(req.params.userId);

  const result = await rejectUserSoap({ UserId: targetId, ApproverId: approverId });
  if (!result.Success) return res.status(400).json({ success: false, message: result.Message });
  return res.json({ success: true, message: result.Message, data: result });
});

// 7. Anomalies
restBridgeRouter.get('/pemerintah/anomalies', async (req: Request, res: Response) => {
  const result = await getDeteksiAnomaliSoap({ BatasKg: 100 });
  return res.json({
    success: true,
    data: {
      anomalies: result.ListAnomali,
      total: result.TotalAnomali,
    },
  });
});

// 8. Notifications
restBridgeRouter.get(['/notifications', '/pemerintah/notifications/top', '/distributor/notifikasi'], async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const result = await getNotifikasiSoap({ UserId: Number(user?.userId || 2) });
  return res.json({
    success: true,
    data: result.ListNotifikasi.map((n) => ({
      notifikasiId: String(n.NotifikasiId),
      id: n.NotifikasiId,
      judul: n.Judul,
      pesan: n.Pesan,
      statusDibaca: n.StatusDibaca,
      timestamp: n.Timestamp,
      jenis: n.Jenis,
    })),
  });
});

restBridgeRouter.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  const result = await markNotifikasiDibacaSoap({
    NotifikasiId: Number(req.params.id),
    UserId: Number(user?.userId || 2),
  });
  return res.json({ success: true, message: result.Message });
});

// 9. Bantuan
restBridgeRouter.post('/bantuan', async (req: Request, res: Response) => {
  const { firstName, middleName, lastName, email, topik, ringkasan } = req.body;
  const user = getUserFromReq(req);
  const result = await createBantuanSoap({
    FirstName: firstName,
    MiddleName: middleName,
    LastName: lastName,
    Email: email,
    Topik: topik,
    Ringkasan: ringkasan,
    UserId: user?.userId,
  });
  if (!result.Success) return res.status(400).json({ success: false, message: result.Message });
  return res.json({ success: true, data: result });
});

restBridgeRouter.get('/pemerintah/help-requests', async (_req: Request, res: Response) => {
  const result = await getBantuanListSoap({});
  return res.json({ success: true, data: { requests: result.ListTiket, total: result.Total } });
});

// 10. Pupuk Master
restBridgeRouter.get('/pupuk', async (_req: Request, res: Response) => {
  const pupuk = await prisma.pupuk.findMany({ orderBy: { PupukId: 'asc' } });
  return res.json({
    success: true,
    data: pupuk.map((p) => ({
      pupukId: p.PupukId,
      jenisPupuk: p.JenisPupuk,
    })),
  });
});
