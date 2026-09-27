import * as soap from 'soap';

const WSDL_URL = 'http://localhost:8002/soap/agriflow?wsdl';

async function runSoapTests() {
  console.log('========================================================');
  console.log('🧪 Memulai Pengujian Otomatis SOAP Client - AgriFlow 2');
  console.log(`📡 Menghubungkan ke WSDL: ${WSDL_URL}`);
  console.log('========================================================\n');

  try {
    const client = await soap.createClientAsync(WSDL_URL);
    console.log('✅ Berhasil mengunduh dan mem-parsing WSDL Contract!\n');

    // 1. Test LoginUser
    console.log('----------------------------------------------------');
    console.log('Test 1: Operasi LoginUser (SOAP)');
    const loginArgs = {
      Email: 'pemerintah@agriflow.id',
      Password: 'PasswordAman123!',
    };
    const [loginRes] = await client.LoginUserAsync(loginArgs);
    console.log('📤 SOAP Request  : Email =', loginArgs.Email);
    console.log('📥 SOAP Response :', JSON.stringify(loginRes, null, 2));

    // 2. Test GetPetaniByNIK
    console.log('\n----------------------------------------------------');
    console.log('Test 2: Operasi GetPetaniByNIK (SOAP)');
    const petaniArgs = { NIK: '0004505371541538' };
    const [petaniRes] = await client.GetPetaniByNIKAsync(petaniArgs);
    console.log('📤 SOAP Request  : NIK =', petaniArgs.NIK);
    console.log('📥 SOAP Response :', JSON.stringify(petaniRes, null, 2));

    // 3. Test CekKuotaPetani
    console.log('\n----------------------------------------------------');
    console.log('Test 3: Operasi CekKuotaPetani (SOAP)');
    const kuotaArgs = { PetaniId: '0004505371541538' };
    const [kuotaRes] = await client.CekKuotaPetaniAsync(kuotaArgs);
    console.log('📤 SOAP Request  : PetaniId =', kuotaArgs.PetaniId);
    console.log('📥 SOAP Response :', JSON.stringify(kuotaRes, null, 2));

    // 4. Test GetPetaniList
    console.log('\n----------------------------------------------------');
    console.log('Test 4: Operasi GetPetaniList (SOAP)');
    const [listPetaniRes] = await client.GetPetaniListAsync({ UserIdPengecer: 43027 });
    console.log('📥 SOAP Response Total Petani untuk Pengecer 43027:', listPetaniRes?.Total);
    if (listPetaniRes?.ListPetani?.length > 0) {
      console.log('   Petani Pertama:', listPetaniRes.ListPetani[0].NamaLengkap, '| Lahan:', listPetaniRes.ListPetani[0].LuasLahan, 'Ha');
    }

    // 4b. Test RegisterUser
    console.log('\n----------------------------------------------------');
    console.log('Test 4b: Operasi RegisterUser (SOAP)');
    const regArgs = {
      Fullname: 'Budi Tester SOAP',
      Email: `tester_soap_${Date.now()}@agriflow.id`,
      Password: 'PasswordAman123!',
      Role: 'PENGECER',
    };
    const [regRes] = await client.RegisterUserAsync(regArgs);
    console.log('📤 SOAP Request  : Email =', regArgs.Email);
    console.log('📥 SOAP Response :', JSON.stringify(regRes, null, 2));

    // 5. Test CekStok
    console.log('\n----------------------------------------------------');
    console.log('Test 5: Operasi CekStok (SOAP)');
    const [stokRes] = await client.CekStokAsync({ UserId: 2 });
    console.log('📥 SOAP Response Stok User 2:', JSON.stringify(stokRes, null, 2));

    // 6. Test GetRiwayatStok
    console.log('\n----------------------------------------------------');
    console.log('Test 6: Operasi GetRiwayatStok (SOAP)');
    const [riwayatStokRes] = await client.GetRiwayatStokAsync({ UserId: 2 });
    console.log('📥 SOAP Response Riwayat Stok:', riwayatStokRes?.Total, 'catatan mutasi');

    // 7. Test GetKirimanList
    console.log('\n----------------------------------------------------');
    console.log('Test 7: Operasi GetKirimanList (SOAP)');
    const [kirimanRes] = await client.GetKirimanListAsync({ UserId: 2, Role: 'PENGECER' });
    console.log('📥 SOAP Response Total Kiriman:', kirimanRes?.Total);

    // 8. Test GetNotifikasi & GetUnreadCount
    console.log('\n----------------------------------------------------');
    console.log('Test 8: Operasi GetNotifikasi & GetUnreadCount (SOAP)');
    const [notifRes] = await client.GetNotifikasiAsync({ UserId: 2, UnreadOnly: false });
    const [unreadRes] = await client.GetUnreadCountAsync({ UserId: 2 });
    console.log('📥 SOAP Response Total Notifikasi:', notifRes?.Total, '| Belum dibaca:', unreadRes?.UnreadCount);

    // 9. Test GetDashboardPemerintah
    console.log('\n----------------------------------------------------');
    console.log('Test 9: Operasi GetDashboardPemerintah (SOAP)');
    const [dashRes] = await client.GetDashboardPemerintahAsync({ TahunAwal: 2024, TahunAkhir: 2026 });
    console.log('📥 SOAP Response Dashboard:', JSON.stringify(dashRes, null, 2));

    // 10. Test GetPendingUsers
    console.log('\n----------------------------------------------------');
    console.log('Test 10: Operasi GetPendingUsers (SOAP)');
    const [pendingRes] = await client.GetPendingUsersAsync({});
    console.log('📥 SOAP Response Total User Pending:', pendingRes?.Total);

    // 11. Test GetDeteksiAnomali
    console.log('\n----------------------------------------------------');
    console.log('Test 11: Operasi GetDeteksiAnomali (SOAP)');
    const [anomaliRes] = await client.GetDeteksiAnomaliAsync({ BatasKg: 100 });
    console.log('📥 SOAP Response Total Anomali (>100 kg):', anomaliRes?.TotalAnomali);

    // 12. Test GetBantuanList
    console.log('\n----------------------------------------------------');
    console.log('Test 12: Operasi GetBantuanList (SOAP)');
    const [bantuanRes] = await client.GetBantuanListAsync({});
    console.log('📥 SOAP Response Total Tiket Bantuan:', bantuanRes?.Total);

    console.log('\n========================================================');
    console.log('🎉 SELURUH PENGUJIAN SOAP WEB SERVICE BERHASIL!');
    console.log('========================================================');
  } catch (error: any) {
    console.error('❌ Terjadi kesalahan saat pengujian SOAP:', error.message);
  }
}

runSoapTests();
