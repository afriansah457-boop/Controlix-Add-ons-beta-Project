import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string[]} playerNames
 */
export function bukaMenuLahan(player, playerNames, titik1, titik2) {
  // Pastikan playerNames tidak kosong agar dropdown tidak error
  const listPemain = playerNames.length > 0 ? playerNames : ["Tidak ada pemain"];

  const landMenu = new ModalFormData()
    .title("Registrasi Lahan Baru")
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

    // Validasi Nama
    if (!inputNamaLahan || inputNamaLahan.trim() === "") {
      player.sendMessage("§c[ERROR] Nama Lahan tidak boleh kosong!");
      // Gunakan system.run untuk memanggil ulang UI agar tidak crash
      return system.run(() => bukaMenuLahan(player, playerNames, titik1, titik2)); 
    }

    // Validasi Harga jika status "Dijual"
    if (inputStatusIndex === 1 && (isNaN(Number(inputHarga)) || inputHarga.trim() === "")) {
      player.sendMessage("§c[ERROR] Harga harus berupa angka valid!");
      return system.run(() => bukaMenuLahan(player, playerNames, titik1, titik2));
    }

    const dataLahanBaru = {
      nama: inputNamaLahan,
      status: inputStatusIndex === 0 ? "Private" : "Dijual",
      harga: Number(inputHarga),
      pemilik: inputPemilik,
      koordinat: { titik1, titik2 },
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
  
  // Ambil data lama
  const dataLama = world.getDynamicProperty("data_lahan_server");
  if (dataLama) {
    try {
      semuaLahan = JSON.parse(dataLama);
    } catch (e) {
      semuaLahan = [];
    }
  }

  semuaLahan.push(dataBaru);

  // Perbaikan typo: world.setDynamicProperty
  world.setDynamicProperty("data_lahan_server", JSON.stringify(semuaLahan));
}