import { ActionFormData } from "@minecraft/server-ui";

export function openPublicMenu(player) {
  const menu = new ActionFormData()
    .title("LAYANAN PUBLIK")
    .body("Akses layanan kota:")
    .button("GPS / Map")
    .button("Taxi / Transport")
    .button("Emergency Call")
    .button("Hospital")
    .button("Government Services")
    .button("Announcements")
    .button("Kembali");

  menu.show(player).then((result) => {
    if (result.canceled) return;

    // Tombol nomor 6 adalah "Kembali"
    if (result.selection === 6) {
      import("../smartphone.js").then(module => module.openSmartphoneUI(player));
    } else {
      player.sendMessage("Layanan ini akan segera tersedia.");
    }
  });
}
