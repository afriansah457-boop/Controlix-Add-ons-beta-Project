import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const ADMIN_ITEM_ID = "controlix:admin_console";

// --- 1. INITIALIZATION ---
if (world.getDynamicProperty("private_world") === undefined) {
    world.setDynamicProperty("private_world", false);
}

// --- 2. LOGIKA DATABASE LAHAN (Helper) ---
function getDaftarLahan() {
    const data = world.getDynamicProperty("data_lahan_server");
    if (typeof data === "string") {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return [];
}

// Cek apakah koordinat berada di dalam area lahan
function isInside(pos, t1, t2) {
    return (
        pos.x >= Math.min(t1.x, t2.x) && pos.x <= Math.max(t1.x, t2.x) &&
        pos.y >= Math.min(t1.y, t2.y) && pos.y <= Math.max(t1.y, t2.y) &&
        pos.z >= Math.min(t1.z, t2.z) && pos.z <= Math.max(t1.z, t2.z)
    );
}

// Cek hak akses build
function canPlayerBuild(player, blockLocation) {
    if (player.hasTag("admin")) return true;
    
    const isPrivate = world.getDynamicProperty("private_world");
    if (!isPrivate) return true;

    const daftarLahan = getDaftarLahan();
    // Cari apakah blok ini ada di dalam salah satu lahan milik pemain
    const lahanMilik = daftarLahan.find(lahan => 
        lahan.pemilik === player.name && isInside(blockLocation, lahan.koordinat.t1, lahan.koordinat.t2)
    );

    return !!lahanMilik; // True jika ditemukan lahan milik player tersebut
}

// --- 3. PROTEKSI WORLD ---
world.beforeEvents.playerPlaceBlock.subscribe((event) => {
    if (!canPlayerBuild(event.player, event.block.location)) {
        event.cancel = true;
        system.run(() => {
            event.player.sendMessage("§c§l[!]§r §cPrivate World Aktif. Anda hanya bisa build di lahan milik sendiri!");
            event.player.playSound("note.bass");
        });
    }
});

world.beforeEvents.playerBreakBlock.subscribe((event) => {
    if (!canPlayerBuild(event.player, event.block.location)) {
        event.cancel = true;
        system.run(() => {
            event.player.sendMessage("§c§l[!]§r §cAnda tidak memiliki izin merusak blok di area ini!");
        });
    }
});

// --- 4. SISTEM FREEZE & MUTE ---
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (player.hasTag("frozen")) {
            player.teleport(player.location, { checkForBlocks: false });
        }
    }
}, 1);

world.beforeEvents.chatSend.subscribe((event) => {
    if (event.sender.hasTag("muted")) {
        event.cancel = true;
        system.run(() => event.sender.sendMessage("§cKamu sedang dimute oleh admin!"));
    }
});

// --- 5. TRIGGER ADMIN CONSOLE ---
world.afterEvents.itemUse.subscribe((data) => {
    const { source: player, itemStack } = data;
    if (itemStack?.typeId === ADMIN_ITEM_ID) {
        if (player.hasTag("admin") || player.getDynamicProperty("role") === "admin") {
            system.run(() => openAdminPanel(player));
        } else {
            player.sendMessage("§cAkses Ditolak!");
        }
    }
});

// --- 6. MENU ADMIN PANEL ---
export function openAdminPanel(player) {
    const isPrivate = world.getDynamicProperty("private_world");
    const statusTxt = isPrivate ? "§aON" : "§7OFF";

    new ActionFormData()
        .title("§lADMIN PANEL")
        .button(`§6- Private World [${statusTxt}]\n§8Keamanan Build Lahan`, "textures/ui/world_glyph_color")
        .button("- Chat Settings\n§8Format & Filter", "textures/ui/settings_glyph_color")
        .button("§c- Mute Control\n§8Bisukan pemain", "textures/ui/mute_off")
        .button("§b- Freeze Control\n§8Bekukan pemain", "textures/items/snowball")
        .button("§d- Clear Ender Chest\n§8Hapus isi EC", "textures/blocks/ender_chest")
        .button("- Inventory See\n§8Lihat tas pemain", "textures/blocks/chest")
        .button("§4- Clear Chat\n§8Bersihkan global chat", "textures/ui/trash")
        .show(player).then((res) => {
            if (res.canceled) return;
            switch (res.selection) {
                case 0: openPrivateWorldAuth(player); break;
                case 1: openFilterSettings(player); break; 
                case 2: openPlayerSelector(player, "Mute", toggleMute); break;
                case 3: openPlayerSelector(player, "Freeze", toggleFreeze); break;
                case 4: openPlayerSelector(player, "Clear EC", clearEnderChest); break;
                case 5: openInventorySee(player); break;
                case 6: world.sendMessage("\n".repeat(25) + "§aChat dibersihkan admin."); break;
            }
        });
}

// --- 7. SECURITY AUTH (PIN & CODE) ---
function openPrivateWorldAuth(player) {
    new ModalFormData()
        .title("§lSECURITY CHECK")
        .textField("Masukkan PIN:", "admin4*")
        .textField("Masukkan Kode:", "10752")
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            const [pin, code] = res.formValues;

            if (pin === "admin4*" && code === "10752") {
                const newState = !world.getDynamicProperty("private_world");
                world.setDynamicProperty("private_world", newState);
                player.sendMessage(`§eSistem diubah ke: ${newState ? "§aON" : "§cOFF"}`);
                world.sendMessage(`§6§lNOTIF: §rPrivate World is now ${newState ? "§aENABLED" : "§7DISABLED"}`);
            } else {
                player.sendMessage("§4PIN/CODE SALAH!");
            }
        });
}

// --- 8. INTEGRASI MENU LAHAN (Fungsi yang kamu berikan) ---
export function bukaMenuLahan(player, playerNames, titik1, titik2) {
    if (!titik1 || !titik2) return player.sendMessage("§cKoordinat tidak lengkap!");

    let listPemain = playerNames?.filter(n => n !== undefined) || ["Tidak ada pemain"];

    new ModalFormData()
        .title("§lREGISTRASI LAHAN")
        .textField("Nama Lahan:", "Contoh: Toko Baju")
        .dropdown("Status Lahan:", ["Private", "Dijual"])
        .textField("Harga (Isi 0 jika Private):", "0")
        .dropdown("Pilih Pemilik Awal:", listPemain)
        .show(player).then((result) => {
            if (result.canceled) return;

            const [nama, statusIdx, harga, pIdx] = result.formValues;
            const pemilik = listPemain[pIdx];

            if (!nama) return system.run(() => bukaMenuLahan(player, playerNames, titik1, titik2));

            const dataLahanBaru = {
                nama,
                status: statusIdx === 0 ? "Private" : "Dijual",
                harga: Number(harga) || 0,
                pemilik,
                koordinat: { t1: titik1, t2: titik2 },
                timestamp: Date.now()
            };

            simpanDataLahan(dataLahanBaru, player);
        });
}

function simpanDataLahan(dataBaru, player) {
    let semuaLahan = getDaftarLahan();
    semuaLahan.push(dataBaru);
    
    const stringData = JSON.stringify(semuaLahan);
    if (stringData.length > 32700) return player.sendMessage("§cDatabase Penuh!");

    try {
        world.setDynamicProperty("data_lahan_server", stringData);
        player.sendMessage(`§aLahan '§f${dataBaru.nama}§a' Tersimpan!`);
    } catch (e) { player.sendMessage("§cError Simpan Database."); }
}

// --- FUNGSI PENDUKUNG LAINNYA ---
function openPlayerSelector(player, title, action) {
    const players = world.getAllPlayers();
    const names = players.map(p => p.name);
    new ModalFormData().title(title).dropdown("Pemain:", names).show(player).then(res => {
        if (!res.canceled) action(player, players[res.formValues[0]]);
    });
}

function toggleMute(admin, target) {
    target.hasTag("muted") ? target.removeTag("muted") : target.addTag("muted");
    admin.sendMessage(`§7Status Mute §b${target.name} §7diperbarui.`);
}

function toggleFreeze(admin, target) {
    target.hasTag("frozen") ? target.removeTag("frozen") : target.addTag("frozen");
    admin.sendMessage(`§7Status Freeze §b${target.name} §7diperbarui.`);
}

function clearEnderChest(admin, target) {
    for (let i = 0; i < 27; i++) admin.runCommandAsync(`replaceitem entity "${target.name}" slot.enderchest ${i} air`);
    admin.sendMessage(`§dEnder Chest ${target.name} dibersihkan.`);
}

function openInventorySee(player) {
    const players = world.getAllPlayers();
    new ModalFormData().title("Inv Viewer").dropdown("Player:", players.map(p => p.name)).show(player).then(res => {
        if (res.canceled) return;
        const target = players[res.formValues[0]];
        const inv = target.getComponent("inventory").container;
        let list = "";
        for(let i=0; i<inv.size; i++) {
            const item = inv.getItem(i);
            if(item) list += `§7[${i}] §f${item.typeId.split(":")[1]} x${item.amount}\n`;
        }
        new ActionFormData().title(target.name).body(list || "Kosong").button("Kembali").show(player);
    });
}

function openFilterSettings(player) {
    player.sendMessage("§eFitur Filter Chat sedang dikembangkan.");
}