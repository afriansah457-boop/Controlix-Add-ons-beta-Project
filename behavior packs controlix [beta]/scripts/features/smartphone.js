import { ActionFormData } from "@minecraft/server-ui";
import { openPersonalMenu } from "./menus/personal.js";
import { openEconomyMenu } from "./menus/economy.js";
import { openPublicMenu } from "./menus/public.js";


export function openSmartphoneUI(player) {
  const mainMenu = new ActionFormData()
    .title("SMARTPHONE")
    .body("Selamat datang! Pilih kategori aplikasi:")
    .button("Personal & Sosial")
    .button("Ekonomi & Aset")
    .button("Layanan Publik")
    .button("Karir & Progres");

  mainMenu.show(player).then((result) => {
    if (result.canceled) return;

    switch (result.selection) {
      case 0:
        openPersonalMenu(player);
        break;
      case 1:
        openEconomyMenu
        break;
      case 2:
        openPublicMenu
        break;
      case 3:
        // Area untuk kategori Karir
        break;
    }
  });
}
