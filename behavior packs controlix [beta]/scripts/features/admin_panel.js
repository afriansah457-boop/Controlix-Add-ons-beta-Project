import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const ADMIN_ITEM_ID = "controlix:admin_console";

// --- 1. LOGIKA TICKING (Freeze System) ---
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (player.hasTag("frozen")) {
            // Memaksa posisi pemain tetap agar tidak bisa bergerak [cite: 12, 63]
            player.teleport(player.location, { checkForBlocks: false });
        }
    }
}, 1);

// --- 2. LOGIKA CHAT (Mute System) ---
world.beforeEvents.chatSend.subscribe((event) => {
    if (event.sender.hasTag("muted")) {
        event.cancel = true; // Batalkan pesan agar tidak terkirim [cite: 13, 64]
        system.run(() => {
            event.sender.sendMessage("§cKamu sedang dimute oleh admin!");
        });
    }
});

// --- 3. TRIGGER ITEM (Optimasi afterEvents) ---
world.afterEvents.itemUse.subscribe((data) => {
    const player = data.source;
    const itemStack = data.itemStack;

    // Validasi tangan kosong untuk mencegah error log 
    if (!itemStack) return;

    if (itemStack.typeId === ADMIN_ITEM_ID) {
        const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";
        
        if (isAdmin) {
            // Gunakan system.run agar UI muncul stabil 
            system.run(() => openAdminPanel(player));
        } else {
            player.sendMessage("§c[ERROR] Anda tidak memiliki akses admin!");
            player.playSound("note.bass"); // Feedback audio penolakan [cite: 48, 55, 134]
        }
    }
});

// --- 4. MENU UTAMA ---
export function openAdminPanel(player) {
    const mainForm = new ActionFormData()
        .title("§lADMIN PANEL") // Perbaikan typo title bold [cite: 27, 59]
        .button("- Chat Filter Settings\n§8Konfigurasi Anti-Spam", "textures/ui/settings_glyph_color")
        .button("- Chat Format Settings\n§8Atur tampilan chat", "textures/ui/comment")
        .button("§c- Mute/Unmute\n§8Bisukan pemain", "textures/ui/mute_off")
        .button("§b- Freeze/Unfreeze\n§8Bekukan pemain", "textures/items/snowball")
        .button("§d- Clear Ender Chest\n§8Hapus isi EC", "textures/blocks/ender_chest")
        .button("- Inventory See\n§8Lihat tas pemain", "textures/blocks/chest")
        .button("§4- Clear Chat\n§8Bersihkan global chat", "textures/ui/trash");

    mainForm.show(player).then((res) => {
        if (res.canceled) return;
        
        // Eksekusi berdasarkan selection index [cite: 66, 135]
        switch (res.selection) {
            case 0: openFilterSettings(player); break;
            case 1: openChatFormatSettings(player); break;
            case 2: openPlayerSelector(player, "Mute Control", toggleMute); break;
            case 3: openPlayerSelector(player, "Freeze Control", toggleFreeze); break;
            case 4: openPlayerSelector(player, "Clear Ender Chest", clearEnderChest); break;
            case 5: openInventorySee(player); break;
case 6: 
                world.sendMessage("\n".repeat(25) + "§aChat telah dibersihkan oleh Admin.");
                break;
        }
    }).catch((err) => {
        console.error("Error UI Admin Panel: ", err);
    }); // <--- PENUTUP .catch HARUS SEPERTI INI
} // <--- KURUNG INI PENTING UNTUK MENUTUP FUNGSI openAdminPanel

// --- 5. FUNGSI PENDUKUNG ---
function openPlayerSelector(player, title, actionFunction) {
    const players = world.getAllPlayers();
    if (players.length === 0) return player.sendMessage("§cTidak ada pemain online.");
    const names = players.map(p => p.name); // <--- Baris ini biasanya yang memicu error ']' jika tidak lengkap
    const names = players.map(p => p.name);
    
    new ModalFormData().title(title)
        .dropdown("Pilih Target Player:", names)
        .show(player).then((res) => {
            if (res.canceled) return openAdminPanel(player);
            
            // Penggunaan optional chaining (?.) untuk keamanan 
            const selectionIndex = res.formValues?.[0];
            const target = players[selectionIndex];
            
            if (target) {
                actionFunction(player, target);
            } else {
                player.sendMessage("§cPemain sudah tidak ada di server.");
            }
        });
}

function clearEnderChest(admin, target) {
    // Loop 27 slot untuk membersihkan total 
    for (let i = 0; i < 27; i++) {
        admin.runCommandAsync(`replaceitem entity "${target.name}" slot.enderchest ${i} air`);
    }
    admin.sendMessage(`§dEnder Chest ${target.name} telah dikosongkan.`);
    admin.playSound("random.orb");
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
                    // Pembersihan teks identifier item [cite: 33]
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

// Logika String Dinamis dengan Backticks [cite: 163]
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