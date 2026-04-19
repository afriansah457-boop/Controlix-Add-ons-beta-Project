import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

// Fungsi utama untuk memunculkan menu
export function bukaMenuLahan(player, playerNames, titik1, titik2) {
  const landMenu = new ModalFormData()
    .title("Registrasi Lahan Baru")
    .textField("Nama Lahan:", "Contoh: Toko Baju")
    .dropdown("Status Lahan:", ["Private", "Dijual"])
    .textField("Harga (Isi 0 jika Private):", "0")
    .dropdown("Pilih Pemilik Awal:", playerNames);

  landMenu.show(player).then((result) => {
    if (result.canceled) {
      player.sendMessage("[INFO] Pendaftaran lahan dibatalkan.");
      return; 
    }

    const inputNamaLahan = result.formValues[0];
    const inputStatusIndex = result.formValues[1]; // 0: Private, 1: Dijual
    const inputHarga = result.formValues[2];
    const inputPemilik = playerNames[result.formValues[3]];

    if (inputNamaLahan.trim() === "") {
      player.sendMessage("[ERROR] Nama Lahan tidak boleh kosong!");
      return system.run(() => bukaMenuLahan(player, playerNames, titik1, titik2)); 
    }

    if (inputStatusIndex === 1 && (isNaN(inputHarga) || inputHarga.trim() === "")) {
      player.sendMessage("[ERROR] Harga harus berupa angka valid!");
      return system.run(() => bukaMenuLahan(player, playerNames, titik1, titik2));
    }

    // 1. Membungkus semua data lahan menjadi satu objek
    const dataLahanBaru = {
      nama: inputNamaLahan,
      status: inputStatusIndex === 0 ? "Private" : "Dijual",
      harga: Number(inputHarga),
      pemilik: inputPemilik,
      koordinat: { titik1: titik1, titik2: titik2 }
    };

    // 2. Memanggil fungsi simpan
    simpanDataLahan(dataLahanBaru);
    player.sendMessage(`[SUKSES] Lahan '${inputNamaLahan}' berhasil disimpan ke sistem server!`);
  });
}

// Fungsi untuk menyimpan data ke world
function simpanDataLahan(dataBaru) {
  let semuaLahan = [];
  
  // Mengambil data lahan yang sudah ada di server sebelumnya
  const dataLama = world.getDynamicProperty("data_lahan_server");
  if (dataLama) {
    semuaLahan = JSON.parse(dataLama); // Mengubah teks JSON kembali menjadi daftar
  }

  // Memasukkan lahan baru ke dalam daftar
  semuaLahan.push(dataBaru);

  // Menyimpan seluruh daftar kembali ke world sebagai teks JSON
  world.setDynamicProperty("data_lahan_server", JSON.stringify(semuaLahan));
}
