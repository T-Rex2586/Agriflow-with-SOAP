# AgriFlow 2 - SOAP Web Service

Sistem Layanan Manajemen Distribusi Subsidi Pupuk Terintegrasi berbasis protokol **SOAP 1.1 / 1.2** dan kontrak **WSDL 1.1 (Web Services Description Language)** dengan pertukaran data format XML.

---

## 🚀 Fitur Utama

- **100% SOAP Web Service**: Menggantikan arsitektur REST API dengan paradigma SOAP Message Envelope berbasis XML.
- **Formal WSDL Contract**: Menggunakan berkas definisi formal `agriflow.wsdl` dengan standar namespace `http://agriflow.id/soap`.
- **Database Terintegrasi**: Menggunakan Prisma ORM yang terhubung langsung ke basis data `AgriFlowDB` (SQL Server).
- **Interactive SOAP Console**: Tersedia Web Console interaktif di `http://localhost:8001/` untuk mencoba mengirimkan SOAP Envelope XML secara langsung melalui browser.
- **Automated SOAP Client**: Disediakan skrip klien otomatis untuk memvalidasi pemanggilan operasi SOAP.

---

## 📋 Daftar Operasi SOAP

| Nama Operasi | Input (Parameter) | Output (Respon) | Deskripsi |
| :--- | :--- | :--- | :--- |
| **`LoginUser`** | `Email`, `Password` | `UserId`, `Role`, `AccessToken`, `Status` | Autentikasi akun pengguna sistem |
| **`RegisterUser`** | `Fullname`, `Email`, `Password`, `Role` | `UserId`, `Email`, `Role`, `Status: 'Pending'` | Pendaftaran user baru distributor/pengecer |
| **`GetPetaniByNIK`** | `NIK` | Data Petani, Desa, Kecamatan, Luas Lahan, Status | Pencarian profil petani terdaftar |
| **`CekKuotaPetani`** | `PetaniId` | Array `ListKuota` (Pupuk, Sisa Kuota) | Pengecekan sisa alokasi kuota subsidi |
| **`GetPetaniList`** | `UserIdPengecer` | Array `ListPetani` (Profil, Lahan, Status) | Daftar seluruh petani binaan pengecer |
| **`PenebusanPupuk`** | `UserIdPengecer`, `PetaniId`, `PupukId`, `Jumlah` | `TebusanId`, `Status`, `SisaKuotaBaru` | Transaksi penebusan pupuk bersubsidi (ACID) |
| **`GetRiwayatPenebusan`**| `UserIdPengecer` | Array `ListRiwayat` (Petani, Pupuk, Jumlah, Waktu) | Riwayat mutasi penebusan pupuk |
| **`CekStok`** / **`CekStokPengecer`** | `UserId` | Array `ListStok` (Pupuk, Jumlah Stok, TerakhirUpdate) | Pengecekan stok kios pengecer atau distributor |
| **`GetRiwayatStok`** | `UserId` | Array `ListRiwayat` (Awal, Akhir, Tipe, Waktu) | Mutasi kartu stok fisik pupuk |
| **`AdjustStok`** | `UserId`, `PupukId`, `JumlahPenyesuaian`, `Keterangan` | Status, JumlahAwal, JumlahAkhir | Penyesuaian/koreksi stok gudang |
| **`CreateKirimanPupuk`** | `UserIdDistributor`, `UserIdPengecer`, `PupukId`, `Jumlah` | `KirimanId`, `Status: 'Dikirim'` | Pengiriman alokasi pupuk ke kios |
| **`TerimaKirimanPupuk`** | `KirimanId`, `UserIdPengecer`, `JumlahDiterima` | `KirimanId`, `Status: 'Diterima'` | Konfirmasi penerimaan dan penambahan stok |
| **`GetKirimanList`** | `UserId`, `Role` | Array `ListKiriman` (Distributor, Pengecer, Qty) | Pemantauan alur distribusi pengiriman pupuk |
| **`GetNotifikasi`** | `UserId`, `UnreadOnly` | Array `ListNotifikasi` (Jenis, Judul, Pesan, Dibaca) | Pengambilan notifikasi sistem pengguna |
| **`MarkNotifikasiDibaca`** | `UserId`, `NotifikasiId` | `Success`, `Message` | Penandaan notifikasi telah dibaca |
| **`GetUnreadCount`** | `UserId` | `UnreadCount` | Jumlah notifikasi belum dibaca |
| **`GetDashboardPemerintah`**| `TahunAwal`, `TahunAkhir` | `TotalTerserapTon`, `RealisasiPersen` | Statistik serapan kuota subsidi nasional |
| **`GetPendingUsers`** | `Page` | Array `ListUsers` (Nama, Email, Role, Tanggal) | Daftar user baru menunggu verifikasi pemerintah |
| **`ApproveUser`** | `UserId`, `ApproverId` | `Success`, `Status: 'Active'` | Persetujuan akun pengecer/distributor baru |
| **`RejectUser`** | `UserId`, `ApproverId`, `Alasan` | `Success`, `Status: 'Rejected'` | Penolakan permohonan akun pengguna |
| **`GetDeteksiAnomali`** | `BatasKg` | Array `ListAnomali` (Petani, Pengecer, Qty, Alasan) | Deteksi kecurangan/transaksi di luar batas wajar |
| **`CreateBantuan`** | `FirstName`, `Email`, `Topik`, `Ringkasan`, `UserId` | `BantuanId`, `Topik`, `Status` | Pembuatan tiket bantuan & pengaduan |
| **`GetBantuanList`** | `Topik` | Array `ListTiket` (Nama, Email, Topik, Waktu) | Daftar tiket pengaduan masuk |

---

## 🛠️ Cara Menjalankan

### 1. Instalasi Dependensi
```bash
cd c:/DAB/Tugas2/agrflow2/backend
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Jalankan Server SOAP
```bash
npm run dev
```

Server akan aktif pada:
- **SOAP Service Endpoint**: `http://localhost:8002/soap/agriflow`
- **WSDL Contract**: `http://localhost:8002/soap/agriflow?wsdl`
- **Raw WSDL**: `http://localhost:8002/soap/agriflow.wsdl`
- **Interactive Web Console**: `http://localhost:8002/`

---

## 🧪 Cara Pengujian

### A. Melalui Automated Client Script
```bash
npm run test:soap
```

### B. Melalui cURL / Postman
Kirim request HTTP POST dengan `Content-Type: text/xml; charset=utf-8` dan header `SOAPAction`:
```bash
curl -X POST http://localhost:8002/soap/agriflow \
  -H "Content-Type: text/xml; charset=utf-8" \
  -H "SOAPAction: http://agriflow.id/soap/LoginUser" \
  -d '<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:agr="http://agriflow.id/soap">
   <soapenv:Header/>
   <soapenv:Body>
      <agr:LoginUserRequest>
         <agr:Email>pemerintah@agriflow.id</agr:Email>
         <agr:Password>PasswordAman123!</agr:Password>
      </agr:LoginUserRequest>
   </soapenv:Body>
</soapenv:Envelope>'
```
