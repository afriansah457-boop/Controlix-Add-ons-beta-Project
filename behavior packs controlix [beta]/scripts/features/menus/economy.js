import { ActionFormData } from "@minecraft/server-ui";

export function openEconomyMenu(player) {
  const menu = new ActionFormData()
    .title("EKONOMI & ASET")
    .body("Pilih aplikasi finansial:")
    .button("Bank / Wallet")
    .button("Transfer Credix")
    .button("Marketplace")
    .button("Shop Order")
    .button("Property / House")
    .button("Vehicle Garage")
    .button("Keys Management")
    .button("Kembali");

  menu.show(player).then((result) => {
    if (result.canceled) return;

    // Tombol nomor 7 adalah "Kembali"
    if (result.selection === 7) {
      import("../smartphone.js").then(module => module.openSmartphoneUI(player));
    } else {
      // Placeholder untuk aplikasi ekonomi
      player.sendMessage("Fitur ini akan segera tersedia.");
    }
  });
}
