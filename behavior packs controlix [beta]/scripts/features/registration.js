import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

export function openRegistrationMenu(player) {
    const form = new ModalFormData()
        .title("§lREGISTRASI WARGA BARU")
        .textField("Nama Karakter:", "Masukkan nama RP kamu")
        .textField("Umur:", "Contoh: 18")
        .dropdown("Gender:", ["Laki-laki", "Perempuan"])
        .submitButton("Daftar Sekarang");

    form.show(player).then((result) => {
        if (result.canceled) {
            // Jika di-close, paksa buka lagi sampai daftar
            player.sendMessage("§c[!] Kamu harus mendaftar sebelum bisa bermain!");
            return system.run(() => openRegistrationMenu(player));
        }

        const [name, age, genderIndex] = result.formValues;
        const gender = genderIndex === 0 ? "Laki-laki" : "Perempuan";

        // Validasi Input
        if (!name || name.trim().length < 3) {
            player.sendMessage("§cNama minimal 3 karakter!");
            return system.run(() => openRegistrationMenu(player));
        }

        // Simpan Data
        player.setDynamicProperty("rp_name", name);
        player.setDynamicProperty("rp_age", age);
        player.setDynamicProperty("rp_gender", gender);
        player.setDynamicProperty("is_registered", true);

        // Update Nametag di atas kepala
        player.nameTag = `§f${name} §7[${age}] §b[${gender === "Laki-laki" ? "♂" : "♀"}]`;

        player.sendMessage(`§aSelamat datang, §f${name}§a! Kamu telah terdaftar.`);
        player.playSound("random.levelup");
        // Contoh command: !resetregis @p
if (message.startsWith("!resetregis")) {
    player.setDynamicProperty("is_registered", undefined);
    player.sendMessage("§eData registrasi telah direset.");
}
    });
}