import { ModalFormData } from "@minecraft/server-ui";

export function openAdminLogin(player) {
  const form = new ModalFormData()
    .title("Login Sistem Admin")
    .textField("Masukkan Kode Akses:", "Ketik sandi di sini...");

  form.show(player).then((result) => {
    if (result.canceled) return;

    // Mengambil teks yang diketik oleh pemain pada kolom pertama (index 0)
    const inputPassword = result.formValues[0];

    if (inputPassword === "AdminWork123") {
      // Menyimpan data "role" dengan nilai "admin" secara permanen ke karakter pemain
      player.setDynamicProperty("role", "admin");
      player.sendMessage("§a[SYSTEM] Akses Admin berhasil diberikan.");
    } else {
      player.sendMessage("§c[SYSTEM] Kode akses salah!");
    }
  });
}
