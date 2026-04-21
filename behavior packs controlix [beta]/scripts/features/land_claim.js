import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string[]} playerNames
 */
export function bukaMenuLahan(player, playerNames, titik1, titik2) {
  // PROTEKSI: Jika koordinat hilang
  if (!titik1 || !titik2) {
    return player.sendMessage("§c[ERROR] Koordinat belum lengkap! Pastikan set Titik 1 dan Titik 2.");
  }

  // PROTEKSI: Pastikan playerNames valid & filter jika ada null/undefined
  let listPemain = ["Tidak ada pemain"];
  if (Array.isArray(playerNames) && playerNames.length > 0) {
    listPemain = playerNames.filter(name => name !== undefined);
  }

  const landMenu = new ModalFormData()
    .title("§lREGISTRASI LAHAN")
    .textField("Nama Lahan:", "Contoh: Toko Baju")
    .dropdown("Status Lahan:", ["Private", "Dijual"])
    .textField("Harga (Isi 0 jika Private):", "0")
    .dropdown("Pilih Pemilik Awal:", listPemain);

  // Gunakan system.run untuk memastikan UI terbuka di frame yang aman
  system.run(() => {
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
        // Rekursif aman dengan system.run
        return system.run(() => bukaMenuLahan(player, playerNames, titik1, titik2)); 
      }

      // Validasi Harga
      const hargaFinal = Number(inputHarga);
      if (inputStatusIndex === 1 && (isNaN(hargaFinal) || inputHarga.trim() === "")) {
        player.sendMessage("§c[ERROR] Harga harus berupa angka jika status 'Dijual'!");
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

      simpanDataLahan(dataLahanBaru, player);
    }).catch((err) => {
      console.error("Gagal membuka menu lahan: " + err);
    });
  });
}

function simpanDataLahan(dataBaru, player) {
  let semuaLahan = [];
  // Perbaikan: world.getDynamicProperty harus dipastikan tipenya string
  const dataLama = world.getDynamicProperty("data_lahan_server");
  
  if (typeof dataLama === "string") {
    try {
      semuaLahan = JSON.parse(dataLama);
    } catch (e) {
      semuaLahan = [];
    }
  }

  semuaLahan.push(dataBaru);
  
  const stringData = JSON.stringify(semuaLahan);

  // Batas Limitasi Minecraft: 32,767 byte per property
  if (stringData.length > 32700) {
    player.sendMessage("§c[FATAL] Database lahan penuh! Tidak bisa menyimpan lahan baru.");
    return;
  }
  
  try {
    world.setDynamicProperty("data_lahan_server", stringData);
    player.sendMessage(`§a[SUKSES] Lahan '§f${dataBaru.nama}§a' berhasil disimpan!`);
    player.playSound("random.levelup");
  } catch (err) {
    player.sendMessage("§c[ERROR] Gagal menulis ke database server.");
    console.error(err);
  }
}