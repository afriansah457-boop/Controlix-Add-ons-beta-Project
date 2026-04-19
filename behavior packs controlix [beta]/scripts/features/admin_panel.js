import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const ADMIN_ITEM_ID = "controlix:admin_panel"; // Ganti ke ID item 3D kamu jika ada

// --- LOGIKA TICKING (Freeze System) ---
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (player.hasTag("frozen")) {
            player.teleport(player.location, { checkForBlocks: false });
        }
    }
}, 1);

// --- LOGIKA CHAT (Mute System) ---
world.beforeEvents.chatSend.subscribe((event) => {
    if (event.sender.hasTag("muted")) {
        event.cancel = true;
        system.run(() => {
            event.sender.sendMessage("§cKamu sedang dimute oleh admin!");
        });
    }
});

// --- TRIGGER ITEM DENGAN NOTIFIKASI ---
world.beforeEvents.itemUse.subscribe((data) => {
    const player = data.source;
    if (data.itemStack.typeId === ADMIN_ITEM_ID) {
        if (player.hasTag("admin")) {
            system.run(() => openAdminPanel(player));
        } else {
            system.run(() => {
                player.sendMessage("§canda belum mempunyai tag admin!");
                player.playSound("note.bass");
            });
        }
    }
});

// --- MENU UTAMA (Sesuai Gambar) ---
function openAdminPanel(player) {
    const mainForm = new ActionFormData()
        .title("§l§ADMIN PANEL")
        .button("- Chat Filter Settings\n§8Konfigurasi Anti-Spam", "textures/ui/settings_glyph_color")
        .button("- Chat Format Settings\n§8Atur tampilan chat", "textures/ui/comment")
        .button("§c- Mute/Unmute\n§8Bisukan pemain", "textures/ui/mute_off")
        .button("§b- Freeze/Unfreeze\n§8Bekukan pemain", "textures/items/snowball")
        .button("§d- Clear Ender Chest\n§8Hapus isi EC", "textures/blocks/ender_chest")
        .button("- Inventory See\n§8Lihat tas pemain", "textures/blocks/chest")
        .button("§4- Clear Chat\n§8Bersihkan global chat", "textures/ui/trash");

    mainForm.show(player).then((res) => {
        if (res.canceled) return;
        switch (res.selection) {
            case 0: openFilterSettings(player); break;
            case 1: openChatFormatSettings(player); break;
            case 2: openPlayerSelector(player, "Mute", toggleMute); break;
            case 3: openPlayerSelector(player, "Freeze", toggleFreeze); break;
            case 4: openPlayerSelector(player, "Clear EC", clearEnderChest); break;
            case 5: openInventorySee(player); break;
            case 6: 
                world.sendMessage("\n".repeat(20) + "§aChat telah dibersihkan oleh Admin.");
                break;
        }
    });
}

// --- FUNGSI-FUNGSI SETTINGS ---
function openFilterSettings(player) {
    new ModalFormData().title("Filter Settings")
        .label("§e=== Filter Settings ===")
        .toggle("Master Disable", false)
        .toggle("Enable Anti-Spam", true)
        .textField("Max Messages", "5", "5")
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            player.sendMessage("§aFilter diperbarui!");
        });
}

function openChatFormatSettings(player) {
    new ModalFormData().title("Chat Format Settings")
        .label("§e=== Chat Format Settings ===")
        .textField("Global Format", "[{player}] >> {message}", "[{player}] >> {message}")
        .textField("Clan Format", "§e[C] §f[{player}] >> {message}")
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            player.sendMessage("§aFormat Chat diperbarui!");
        });
}

// --- PEMILIH PEMAIN (SELECTOR) ---
function openPlayerSelector(player, title, actionFunction) {
    const players = world.getAllPlayers();
    const names = players.map(p => p.name);
    
    new ModalFormData().title(title)
        .dropdown("Pilih Target Player:", names)
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            actionFunction(player, players[res.formValues[0]]);
        });
}

// --- LOGIKA EKSEKUSI ---
function toggleMute(admin, target) {
    if (target.hasTag("muted")) {
        target.removeTag("muted");
        admin.sendMessage(`§a${target.name} telah di-unmute.`);
    } else {
        target.addTag("muted");
        admin.sendMessage(`§c${target.name} telah di-mute.`);
    }
}

function toggleFreeze(admin, target) {
    if (target.hasTag("frozen")) {
        target.removeTag("frozen");
        admin.sendMessage(`§a${target.name} telah dicairkan.`);
    } else {
        target.addTag("frozen");
        admin.sendMessage(`§b${target.name} telah dibekukan.`);
    }
}

function clearEnderChest(admin, target) {
    // Menghapus item di slot enderchest menggunakan command
    admin.runCommandAsync(`replaceitem entity "${target.name}" slot.enderchest 0 air 64`);
    admin.sendMessage(`§dMembersihkan Ender Chest ${target.name}...`);
}

function openInventorySee(player) {
    const players = world.getAllPlayers();
    const names = players.map(p => p.name);

    new ModalFormData().title("Inventory Viewer")
        .dropdown("Pilih player untuk dilihat inventorynya:", names)
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            
            const target = players[res.formValues[0]];
            const inv = target.getComponent("inventory").container;
            let itemList = `§eInventory §b${target.name}§f:\n\n`;

            for (let i = 0; i < inv.size; i++) {
                const item = inv.getItem(i);
                if (item) {
                    itemList += `§7[Slot ${i}] §f${item.typeId.split(":")[1]} §7(x${item.amount})\n`;
                }
            }

            new ActionFormData()
                .title(`Inv: ${target.name}`)
                .body(itemList === "" ? "Inventory Kosong" : itemList)
                .button("Kembali")
                .show(player).then(() => openAdminPanel(player));
        });
}