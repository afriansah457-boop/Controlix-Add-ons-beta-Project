import { ActionFormData } from "@minecraft/server-ui";

export function openProgressMenu(player) {
  const menu = new ActionFormData()
    .title("KARIR & PROGRES")
    .body("Pantau perkembangan karakter kamu:")
    .button("Jobs")
    .button("Tasks / Missions")
    .button("Daily Rewards")
    .button("License (SIM/KTP)")
    .button("Settings")
    .button("Kembali");

  menu.show(player).then((result) => {
    if (result.canceled) return;

    // Tombol nomor 5 adalah "Kembali"
    if (result.selection === 5) {
      import("../smartphone.js").then(module => module.openSmartphoneUI(player));
    } else {
      player.sendMessage("Fitur progres ini akan segera tersedia.");
    }
  });
}
