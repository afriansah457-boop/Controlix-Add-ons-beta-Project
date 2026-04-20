import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

export function openPersonalMenu(player) {
  const menu = new ActionFormData()
    .title("§l§9PERSONAL & SOSIAL")
    .body("Pilih aplikasi sosial:")
    .button("§hProfile\n§8Statistik Karakter", "textures/ui/identity_glyph")
    .button("§hMessages\n§8Pesan Masuk", "textures/ui/comment")
    .button("§hContacts\n§8Daftar Pemain", "textures/ui/multiplayer_glyph_color")
    .button("§hCall System\n§8Panggilan Suara", "textures/ui/icon_setting")
    .button("§hCamera\n§8Ambil Foto", "textures/ui/camera_config")
    .button("§hMusic\n§8Pemutar Musik", "textures/ui/pdp_music")
    .button("§cKembali", "textures/ui/cancel");

  menu.show(player).then((result) => {
    if (result.canceled) return;

    // Gunakan system.run agar transisi menu lancar
    system.run(() => {
        switch (result.selection) {
          case 0: openProfile(player); break;
          case 1: player.sendMessage("§e[Smartphone]§f Aplikasi Messages akan segera hadir!"); break;
          case 2: openContacts(player); break;
          case 3: player.sendMessage("§e[Smartphone]§f Fitur Call sedang dalam perbaikan."); break;
          case 4: takePhoto(player); break;
          case 5: openMusicPlayer(player); break;
          case 6: 
            import("../smartphone.js").then(m => m.openSmartphoneUI(player)); 
            break;
        }
    });
  });
}

// --- 1. APLIKASI PROFILE ---
function openProfile(player) {
    const health = player.getComponent("health");
    const pos = player.location;
    
    new ModalFormData()
        .title("MY PROFILE")
        .label(`§bNama: §f${player.name}`)
        .label(`§bHP: §f${Math.round(health.currentValue)}/${health.defaultValue}`)
        .label(`§bPosisi: §f${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}`)
        .label(`§bTag: §f${player.getTags().join(", ") || "Tidak ada"}`)
        .show(player).then(() => openPersonalMenu(player));
}

// --- 2. APLIKASI CONTACTS ---
function openContacts(player) {
    const players = world.getAllPlayers();
    const contactMenu = new ActionFormData()
        .title("CONTACTS")
        .body(`Ditemukan ${players.length} orang online:`);

    players.forEach(p => {
        contactMenu.button(`${p.name}\n§8Online`, "textures/ui/sidebar_icons/friend_ready_check");
    });
    contactMenu.button("§cKembali");

    contactMenu.show(player).then((res) => {
        if (res.canceled || res.selection === players.length) return openPersonalMenu(player);
        
        const target = players[res.selection];
        player.sendMessage(`§e[Smartphone]§f Kamu melihat profil §b${target.name}`);
        // Bisa dikembangkan untuk kirim pesan ke target
        openPersonalMenu(player);
    });
}

// --- 3. APLIKASI CAMERA ---
function takePhoto(player) {
    player.onScreenDisplay.setActionBar("§fMengambil foto dalam 3...");
    
    system.runTimeout(() => {
        // Efek Flash
        player.onScreenDisplay.setTitle("§f█", { fadeInDuration: 0, stayDuration: 2, fadeOutDuration: 10 });
        player.playSound("camera.take_picture");
        player.sendMessage("§a[Smartphone]§f Foto berhasil disimpan ke galeri (Memory Card)!");
    }, 40); // 2 detik delay
}

// --- 4. APLIKASI MUSIC ---
function openMusicPlayer(player) {
    const songs = [
        { name: "Pigstep", id: "record.pigstep" },
        { name: "Otherside", id: "record.otherside" },
        { name: "5", id: "record.5" },
        { name: "Creator", id: "record.creator" }
    ];

    const musicMenu = new ActionFormData()
        .title("MUSIC PLAYER")
        .body("Pilih lagu untuk diputar:");

    songs.forEach(s => musicMenu.button(s.name, "textures/ui/music_glyph_color"));
    musicMenu.button("§4Stop Music");
    musicMenu.button("§cKembali");

    musicMenu.show(player).then((res) => {
        if (res.canceled) return;
        if (res.selection === songs.length + 1) return openPersonalMenu(player);

        if (res.selection === songs.length) {
            player.runCommandAsync("stopsound @s");
            player.sendMessage("§cMusik dimatikan.");
        } else {
            const track = songs[res.selection];
            player.runCommandAsync("stopsound @s");
            player.playSound(track.id);
            player.sendMessage(`§aMemutar lagu: §f${track.name}`);
        }
        openMusicPlayer(player);
    });
}