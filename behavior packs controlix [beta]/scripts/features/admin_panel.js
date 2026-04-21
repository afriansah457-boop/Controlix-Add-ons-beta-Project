import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const ADMIN_ITEM_ID = "controlix:admin_console";

// --- INITIALIZATION ---
// Inisialisasi status world jika belum ada
if (world.getDynamicProperty("private_world") === undefined) {
    world.setDynamicProperty("private_world", false);
}

// --- 1. LOGIKA TICKING (Freeze System) ---
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (player.hasTag("frozen")) {
            player.teleport(player.location, { checkForBlocks: false });
        }
    }
}, 1);

// --- 2. LOGIKA CHAT (Mute System) ---
world.beforeEvents.chatSend.subscribe((event) => {
    if (event.sender.hasTag("muted")) {
        event.cancel = true;
        system.run(() => {
            event.sender.sendMessage("§cKamu sedang dimute oleh admin!");
        });
    }
});

// --- 3. LOGIKA PROTEKSI WORLD (Private World System) ---
// Proteksi Pasang Blok
world.beforeEvents.playerPlaceBlock.subscribe((event) => {
    const player = event.player;
    const isPrivate = world.getDynamicProperty("private_world");
    const isAdmin = player.hasTag("admin");

    if (isPrivate && !isAdmin) {
        // Cek apakah blok tempat menaruh ada tag "land_claim"
        // Catatan: Pada Bedrock API, pengecekan tag pada lokasi blok spesifik 
        // biasanya dilakukan via koordinat atau pengecekan tag entitas land.
        if (!player.hasTag("in_land_claim")) { 
            event.cancel = true;
            system.run(() => player.sendMessage("§cPrivate World AKTIF! Kamu hanya bisa build di area Land Claim."));
        }
    }
});

// Proteksi Hancurkan Blok
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const player = event.player;
    const isPrivate = world.getDynamicProperty("private_world");
    const isAdmin = player.hasTag("admin");

    if (isPrivate && !isAdmin) {
        if (!player.hasTag("in_land_claim")) {
            event.cancel = true;
            system.run(() => player.sendMessage("§cPrivate World AKTIF! Jangan merusak fasilitas umum."));
        }
    }
});

// --- 4. TRIGGER ITEM ---
world.afterEvents.itemUse.subscribe((data) => {
    const player = data.source;
    const itemStack = data.itemStack;

    if (!itemStack) return;

    if (itemStack.typeId === ADMIN_ITEM_ID) {
        const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";
        
        if (isAdmin) {
            system.run(() => openAdminPanel(player));
        } else {
            player.sendMessage("§c[ERROR] Anda tidak memiliki akses admin!");
            player.playSound("note.bass");
        }
    }
});

// --- 5. MENU UTAMA ---
export function openAdminPanel(player) {
    const isPrivate = world.getDynamicProperty("private_world");
    const statusText = isPrivate ? "§aON" : "§cOFF";

    const mainForm = new ActionFormData()
        .title("§lADMIN PANEL")
        .button(`§6- Private World [${statusText}]\n§8Status: ${isPrivate ? 'Admin Only' : 'Public'}`, "textures/ui/world_glyph_color")
        .button("- Chat Filter Settings\n§8Anti-Spam", "textures/ui/settings_glyph_color")
        .button("- Chat Format Settings\n§8Custom Chat", "textures/ui/comment")
        .button("§c- Mute/Unmute\n§8Bisukan pemain", "textures/ui/mute_off")
        .button("§b- Freeze/Unfreeze\n§8Bekukan pemain", "textures/items/snowball")
        .button("§d- Clear Ender Chest\n§8Hapus isi EC", "textures/blocks/ender_chest")
        .button("- Inventory See\n§8Lihat tas pemain", "textures/blocks/chest")
        .button("§4- Clear Chat\n§8Bersihkan global chat", "textures/ui/trash");

    mainForm.show(player).then((res) => {
        if (res.canceled) return;
        
        switch (res.selection) {
            case 0: openPrivateWorldAuth(player); break;
            case 1: openFilterSettings(player); break;
            case 2: openChatFormatSettings(player); break;
            case 3: openPlayerSelector(player, "Mute Control", toggleMute); break;
            case 4: openPlayerSelector(player, "Freeze Control", toggleFreeze); break;
            case 5: openPlayerSelector(player, "Clear Ender Chest", clearEnderChest); break;
            case 6: openInventorySee(player); break;
            case 7: world.sendMessage("\n".repeat(25) + "§aChat telah dibersihkan oleh Admin."); break;
        }
    });
}

// --- 6. LOGIKA PRIVATE WORLD AUTH (PIN & CODE) ---
function openPrivateWorldAuth(player) {
    new ModalFormData()
        .title("§k||§r §lSECURITY CHECK §k||")
        .textField("Masukkan PIN Admin:", "admin****")
        .textField("Masukkan Secret CODE:", "1XXXX")
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            
            const [inputPin, inputCode] = res.formValues;

            if (inputPin === "admin4*" && inputCode === "10752") {
                const currentState = world.getDynamicProperty("private_world");
                world.setDynamicProperty("private_world", !currentState);
                
                const newState = !currentState;
                player.sendMessage(`§e[SYSTEM] Private World berhasil diubah ke: ${newState ? "§aON" : "§cOFF"}`);
                world.sendMessage(`§l§6SERVER NOTIF: §rPrivate World status changed to ${newState ? "§aON" : "§cOFF"}`);
                player.playSound("random.levelup");
            } else {
                player.sendMessage("§4[ERROR] PIN atau CODE Salah! Akses Ditolak.");
                player.playSound("note.bass");
            }
        });
}

// --- 7. FUNGSI PENDUKUNG (Original) ---
function openPlayerSelector(player, title, actionFunction) {
    const players = world.getAllPlayers();
    if (players.length === 0) return player.sendMessage("§cTidak ada pemain online.");
    const names = players.map(p => p.name);
    
    new ModalFormData().title(title)
        .dropdown("Pilih Target Player:", names)
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            const target = players[res.formValues?.[0]];
            if (target) actionFunction(player, target);
        });
}

function clearEnderChest(admin, target) {
    for (let i = 0; i < 27; i++) {
        admin.runCommandAsync(`replaceitem entity "${target.name}" slot.enderchest ${i} air`);
    }
    admin.sendMessage(`§dEnder Chest ${target.name} telah dikosongkan.`);
}

function openInventorySee(player) {
    const players = world.getAllPlayers();
    const names = players.map(p => p.name);

    new ModalFormData().title("Inventory Viewer")
        .dropdown("Pilih player:", names)
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            const target = players[res.formValues?.[0]];
            if (!target) return;

            const inv = target.getComponent("inventory").container;
            let itemList = `§eInventory §b${target.name}§f:\n\n`;
            let isEmpty = true;

            for (let i = 0; i < inv.size; i++) {
                const item = inv.getItem(i);
                if (item) {
                    isEmpty = false;
                    const itemName = item.typeId.replace("minecraft:", "");
                    itemList += `§7[${i}] §f${itemName} §7(x${item.amount})\n`;
                }
            }

            new ActionFormData()
                .title(`Inv: ${target.name}`)
                .body(isEmpty ? "§cTas pemain ini kosong." : itemList)
                .button("Kembali")
                .show(player).then(() => openAdminPanel(player));
        });
}

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

function openFilterSettings(player) {
    new ModalFormData().title("Filter Settings")
        .toggle("Master Disable", false)
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            player.sendMessage("§aFilter diperbarui!");
        });
}

function openChatFormatSettings(player) {
    new ModalFormData().title("Chat Format Settings")
        .textField("Global Format", "[{player}] >> {message}")
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            player.sendMessage("§aFormat Chat diperbarui!");
        });
}