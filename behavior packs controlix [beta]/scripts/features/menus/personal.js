import { ActionFormData } from "@minecraft/server-ui";

export function openPersonalMenu(player) {
  const menu = new ActionFormData()
    .title("👤 PERSONAL & SOSIAL")
    .body("Pilih aplikasi sosial:")
    .button("👤 Profile")
    .button("💬 Messages")
    .button("📞 Contacts")
    .button("☎️ Call System")
    .button("📸 Camera")
    .button("🎵 Music")
    .button("⬅️ Kembali");

  menu.show(player).then((result) => {
    if (result.canceled) return;

    if (result.selection === 6) {
      // Kembali ke menu utama
      import("../smartphone.js").then(module => module.openSmartphoneUI(player));
    } else {
      // Logika untuk aplikasi lainnya (Profile, Chat, dll)
      player.sendMessage(`Kamu membuka aplikasi ke-${result.selection + 1}`);
    }
  });
}
