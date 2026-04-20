import { system } from "@minecraft/server"; // Tambahkan import system
import { ActionFormData } from "@minecraft/server-ui";
import { openPersonalMenu } from "./menus/personal.js";
import { openEconomyMenu } from "./menus/economy.js";
import { openPublicMenu } from "./menus/public.js";
import { openProgressMenu } from "./menus/progress.js";

export function openSmartphoneUI(player) {
  const mainMenu = new ActionFormData()
    .title("§l§9SMARTPHONE") // Menambah warna biru dan tebal pada judul
    .body("Selamat datang! Pilih kategori aplikasi:")
    .button("Personal & Sosial\n§8Hubungan & Pesan")
    .button("Ekonomi & Aset\n§8Keuangan & Properti")
    .button("Layanan Publik\n§8Lapor & Informasi")
    .button("Karir & Progres\n§8Level & Statistik");

  mainMenu.show(player).then((result) => {
    if (result.canceled) return;

    // KUNCI UTAMA: Gunakan system.run saat membuka menu berikutnya
    // agar UI tidak menumpuk atau gagal terbuka.
    system.run(() => {
      switch (result.selection) {
        case 0:
          openPersonalMenu(player);
          break;
        case 1:
          openEconomyMenu(player);
          break;
        case 2:
          openPublicMenu(player);
          break;
        case 3:
          openProgressMenu(player);
          break;
      }
    });
  }).catch((err) => {
    console.error("Gagal membuka Smartphone UI: " + err);
  });
}