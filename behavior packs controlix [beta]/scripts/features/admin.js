import { ModalFormData } from "@minecraft/server-ui";

export function openAdminLogin(player) {
  const form = new ModalFormData()
    .title("§lLogin Sistem Admin")
    .textField("Masukkan Kode Akses:", "Ketik sandi di sini...");

  form.show(player).then((result) => {
    // 1. Cek jika pemain menutup form
    if (result.canceled) return;

    // 2. Ambil input dan bersihkan spasi yang tidak sengaja terketik
    const inputPassword = result.formValues?.[0]?.toString().trim();

    // 3. Logika Verifikasi
    if (inputPassword === "AdminWork123") {
      // Menyimpan role admin secara permanen di data pemain
      player.setDynamicProperty("role", "admin");
      
      player.sendMessage("§a[SYSTEM] Akses Admin berhasil diberikan! Selamat bertugas.");
      player.playSound("random.levelup"); // Feedback suara sukses
    } else {
      player.sendMessage("§c[SYSTEM] Kode akses salah atau tidak terdaftar!");
      player.playSound("note.bass"); // Feedback suara gagal 
    }
  }).catch((error) => {
    console.error("Gagal membuka Admin Login: " + error);
  });
}