import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string[]} playerNames
 */
export function bukaMenuLahan(player, playerNames, titik1, titik2) {
  // PROTEKSI: Jika koordinat hilang, jangan buka UI
  if (!titik1 || !titik2) {
    return player.sendMessage("§c[ERROR] Koordinat belum lengkap! Pastikan set Titik 1 dan Titik 2.");
  }

  // PROTEKSI: Pastikan playerNames adalah array dan tidak kosong
  let listPemain = ["Tidak ada pemain"];
  if (Array.isArray(playerNames) && playerNames.length > 0) {
    listPemain = playerNames;
  }

  const landMenu = new ModalFormData()
    .title("§lREGISTRASI LAHAN")
    .textField("Nama Lahan:", "Contoh: Toko Baju")
    .dropdown("Status Lahan:", ["Private", "Dijual"])
    .textField("Harga (Isi 0 jika Private):", "0")
    .dropdown("Pilih Pemilik Awal:", listPemain);

  landMenu.show(player).then((result) => {
    if (result.canceled) {
      player.sendMessage("§e[INFO] Pendaftaran lahan dibatalkan.");
      return; 
    }

    const [inputNamaLahan, inputStatusIndex, inputHarga, selectPemainIndex] = result.formValues;
    const inputPemilik = listPemain[selectPemainIndex];

    // Validasi Nama Lahan
    if (!inputNamaLahan || inputNamaLahan.trim() === "") {
      player.sendMessage("§c[ERROR] Nama Lahan tidak boleh kosong!");
      return system.run(() => bukaMenuLahan(player, playerNames, titik1, titik2)); 
    }

    // Validasi Harga
    const hargaFinal = Number(inputHarga);
    if (inputStatusIndex === 1 && (isNaN(hargaFinal) || inputHarga.trim() === "")) {
      player.sendMessage("§c[ERROR] Harga harus berupa angka!");
      return system.run(() => bukaMenuLahan(player, playerNames, titik1, titik2));
    }

    const dataLahanBaru = {
      nama: inputNamaLahan,
      status: inputStatusIndex === 0 ? "Private" : "Dijual",
      harga: hargaFinal,
      pemilik: inputPemilik,
      koordinat: { t1: titik1, t2: titik2 },
      timestamp: Date.now()
    };

    simpanDataLahan(dataLahanBaru);
    player.sendMessage(`§a[SUKSES] Lahan '§f${inputNamaLahan}§a' berhasil disimpan!`);
  }).catch((err) => {
    console.error("Gagal membuka menu lahan: " + err);
  });
}

function simpanDataLahan(dataBaru) {
  let semuaLahan = [];
  const dataLama = world.getDynamicProperty("data_lahan_server");
  
  if (dataLama) {
    try {
      semuaLahan = JSON.parse(dataLama);
    } catch (e) {
      semuaLahan = [];
    }
  }

  semuaLahan.push(dataBaru);
  
  // Batas DynamicProperty adalah 32,767 karakter. 
  // Jika terlalu banyak, JSON.stringify akan gagal disimpan.
  const stringData = JSON.stringify(semuaLahan);
  if (stringData.length > 32000) {
    world.sendMessage("§c[WARNING] Database lahan hampir penuh! Segera backup data.");
  }
  
  world.setDynamicProperty("data_lahan_server", stringData);
}