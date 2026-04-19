import { ActionFormData } from "@minecraft/server-ui";

export function openSmartphoneUI(player) {
  const mainMenu = new ActionFormData()
    .title("📱 SMARTPHONE")
    .body("Selamat datang! Pilih kategori aplikasi:")
    .button("👤 Personal & Sosial")
    .button("💰 Ekonomi & Aset")
    .button("🏢 Layanan Publik")
    .button("📈 Karir & Progres");

  mainMenu.show(player).then((result) => {
    if (result.canceled) return;

    switch (result.selection) {
      case 0:
        // Nantinya memanggil fungsi dari menus/personal.js
        break;
      case 1:
        // Nantinya memanggil fungsi dari menus/economy.js
        break;
      case 2:
        // Nantinya memanggil fungsi dari menus/public.js
        break;
      case 3:
        // Nantinya memanggil fungsi dari menus/progress.js
        break;
    }
  });
}
