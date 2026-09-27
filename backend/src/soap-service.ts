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
import { verifyWsSecurityHeader, extractWsSecurityHeader } from './services/ws-security';

/**
 * Helper: Verifikasi WS-Security pada args SOAP.
 * node-soap meneruskan args dari body, sedangkan header Security ada di args._headers atau
 * diteruskan melalui raw XML yang sudah diparse.
 *
 * Karena node-soap versi lama meneruskan Security header sebagai args['Security'] atau
 * args['wsse:Security'], kita periksa beberapa kemungkinan path.
 */
function extractSecurityFromArgs(args: any): string | null {
  // node-soap biasanya meletakkan Security header di args['Security']
  if (args?.Security) {
    if (typeof args.Security === 'string') return args.Security;
    // Bisa berupa objek yang sudah diparse — serialize ulang ke string sederhana
    return JSON.stringify(args.Security);
  }

  // Alternatif: lewat custom header yang dikirim frontend
  if (args?.['wsse:Security']) {
    return typeof args['wsse:Security'] === 'string'
      ? args['wsse:Security']
      : JSON.stringify(args['wsse:Security']);
  }

  // Coba dari _rawXml jika tersedia
  if (args?._rawXml) {
    return extractWsSecurityHeader(args._rawXml);
  }

  // Coba dari field WsSecurityHeader yang dikirim sebagai custom field oleh frontend
  if (args?.WsSecurityHeader) {
    return args.WsSecurityHeader;
  }

  return null;
}

/**
 * Guard untuk operasi admin: verifikasi WS-Security Signed SOAP header.
 * Mengembalikan { blocked: true, response } jika autentikasi gagal,
 * atau { blocked: false } jika berhasil.
 */
function requireSignedSoap(
  args: any,
  operationName: string
): { blocked: boolean; response?: any } {
  const securityXml = extractSecurityFromArgs(args);
  const result = verifyWsSecurityHeader(securityXml);

  if (!result.valid) {
    console.warn(`[WS-SECURITY] ⛔ Akses ditolak pada operasi admin '${operationName}': ${result.error}`);
    return {
      blocked: true,
      response: {
        Success: false,
        Message: `[WS-Security] Akses Ditolak: ${result.error}`,
        SecurityError: true,
      },
    };
  }

  console.log(
    `[WS-SECURITY] ✅ Signature valid — UserId: ${result.claims?.userId}, Role: ${result.claims?.role}, Op: ${operationName}`
  );
  return { blocked: false };
}

/**
 * Peta Implementasi Lengkap Layanan SOAP AgriFlow 2
 * Struktur objek mencocokkan wsdl:service "AgriFlowSoapService" dan wsdl:port "AgriFlowSoapPort"
 */
export const agriflowSoapService = {
  AgriFlowSoapService: {
    AgriFlowSoapPort: {
      // 1. Auth Operations
      LoginUser: async (args: any) => {
        console.log('[SOAP-REQ] LoginUser:', args?.Email);
        return await loginUserSoap(args);
      },

      RegisterUser: async (args: any) => {
        console.log('[SOAP-REQ] RegisterUser:', args?.Email, args?.Role);
        return await registerUserSoap(args);
      },

      // 2. Petani Operations
      GetPetaniByNIK: async (args: any) => {
        console.log('[SOAP-REQ] GetPetaniByNIK:', args?.NIK);
        return await getPetaniByNIKSoap(args);
      },

      CekKuotaPetani: async (args: any) => {
        console.log('[SOAP-REQ] CekKuotaPetani:', args?.PetaniId);
        return await cekKuotaPetaniSoap(args);
      },

      GetPetaniList: async (args: any) => {
        console.log('[SOAP-REQ] GetPetaniList for Pengecer:', args?.UserIdPengecer);
        return await getPetaniListSoap(args);
      },

      // 3. Penebusan Operations
      PenebusanPupuk: async (args: any) => {
        console.log('[SOAP-REQ] PenebusanPupuk:', args?.PetaniId, 'Jumlah:', args?.Jumlah);
        return await penebusanPupukSoap(args);
      },

      GetRiwayatPenebusan: async (args: any) => {
        console.log('[SOAP-REQ] GetRiwayatPenebusan:', args?.UserIdPengecer);
        return await getRiwayatPenebusanSoap(args);
      },

      // 4. Stok Operations
      CekStok: async (args: any) => {
        console.log('[SOAP-REQ] CekStok:', args?.UserId);
        return await cekStokSoap(args);
      },

      CekStokPengecer: async (args: any) => {
        console.log('[SOAP-REQ] CekStokPengecer:', args?.UserIdPengecer);
        const res = await cekStokSoap({ UserId: args?.UserIdPengecer });
        return {
          UserIdPengecer: res.UserId,
          NamaPengecer: res.NamaUser,
          ListStok: res.ListStok,
        };
      },

      GetRiwayatStok: async (args: any) => {
        console.log('[SOAP-REQ] GetRiwayatStok:', args?.UserId);
        return await getRiwayatStokSoap(args);
      },

      AdjustStok: async (args: any) => {
        console.log('[SOAP-REQ] AdjustStok:', args?.UserId, 'Pupuk:', args?.PupukId);
        return await adjustStokSoap(args);
      },

      // 5. Shipment Operations
      CreateKirimanPupuk: async (args: any) => {
        console.log('[SOAP-REQ] CreateKirimanPupuk from Dist:', args?.UserIdDistributor, 'to Retailer:', args?.UserIdPengecer);
        return await createKirimanPupukSoap(args);
      },

      TerimaKirimanPupuk: async (args: any) => {
        console.log('[SOAP-REQ] TerimaKirimanPupuk KirimanId:', args?.KirimanId);
        return await terimaKirimanPupukSoap(args);
      },

      GetKirimanList: async (args: any) => {
        console.log('[SOAP-REQ] GetKirimanList for User:', args?.UserId, 'Role:', args?.Role);
        return await getKirimanListSoap(args);
      },

      // 6. Notification Operations
      GetNotifikasi: async (args: any) => {
        console.log('[SOAP-REQ] GetNotifikasi for User:', args?.UserId);
        return await getNotifikasiSoap(args);
      },

      MarkNotifikasiDibaca: async (args: any) => {
        console.log('[SOAP-REQ] MarkNotifikasiDibaca:', args?.NotifikasiId, 'User:', args?.UserId);
        return await markNotifikasiDibacaSoap(args);
      },

      GetUnreadCount: async (args: any) => {
        console.log('[SOAP-REQ] GetUnreadCount for User:', args?.UserId);
        return await getUnreadCountSoap(args);
      },

      // 7. Pemerintah & Monitoring Operations (🔐 SIGNED SOAP — Wajib WS-Security)
      GetDashboardPemerintah: async (args: any) => {
        console.log('[SOAP-REQ] GetDashboardPemerintah [SIGNED SOAP]');
        const guard = requireSignedSoap(args, 'GetDashboardPemerintah');
        if (guard.blocked) return guard.response;
        return await getDashboardPemerintahSoap(args);
      },

      GetPendingUsers: async (args: any) => {
        console.log('[SOAP-REQ] GetPendingUsers [SIGNED SOAP]');
        const guard = requireSignedSoap(args, 'GetPendingUsers');
        if (guard.blocked) return guard.response;
        return await getPendingUsersSoap(args);
      },

      ApproveUser: async (args: any) => {
        console.log('[SOAP-REQ] ApproveUser Target:', args?.UserId, 'Approver:', args?.ApproverId, '[SIGNED SOAP]');
        const guard = requireSignedSoap(args, 'ApproveUser');
        if (guard.blocked) return guard.response;
        return await approveUserSoap(args);
      },

      RejectUser: async (args: any) => {
        console.log('[SOAP-REQ] RejectUser Target:', args?.UserId, 'Approver:', args?.ApproverId, '[SIGNED SOAP]');
        const guard = requireSignedSoap(args, 'RejectUser');
        if (guard.blocked) return guard.response;
        return await rejectUserSoap(args);
      },

      GetDeteksiAnomali: async (args: any) => {
        console.log('[SOAP-REQ] GetDeteksiAnomali Threshold:', args?.BatasKg, '[SIGNED SOAP]');
        const guard = requireSignedSoap(args, 'GetDeteksiAnomali');
        if (guard.blocked) return guard.response;
        return await getDeteksiAnomaliSoap(args);
      },

      // 8. Helpdesk / Bantuan Operations
      CreateBantuan: async (args: any) => {
        console.log('[SOAP-REQ] CreateBantuan from:', args?.Email);
        return await createBantuanSoap(args);
      },

      GetBantuanList: async (args: any) => {
        console.log('[SOAP-REQ] GetBantuanList');
        return await getBantuanListSoap(args);
      },
    },
  },
};
