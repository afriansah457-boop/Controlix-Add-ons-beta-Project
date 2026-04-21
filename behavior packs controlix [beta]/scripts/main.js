import { world, system } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";
import { openAdminLogin } from "./features/admin.js";
import { openAdminPanel } from "./features/admin_panel.js"; 
import { bukaMenuLahan } from "./features/land_claim.js";
import { openRegistrationMenu } from "./features/registration.js";

// --- 1. SENSOR PEMAIN MASUK & REGISTRASI ---
world.afterEvents.playerSpawn.subscribe((event) => {
    const { player } = event;
    const isRegistered = player.getDynamicProperty("is_registered");
    
    if (!isRegistered) {
        player.addEffect("blindness", 200, { showParticles: false });
        player.addEffect("slowness", 200, { amplifier: 10, showParticles: false });
        
        system.runTimeout(() => {
            openRegistrationMenu(player);
        }, 60); 
    } else {
        const rpName = player.getDynamicProperty("rp_name");
        const rpAge = player.getDynamicProperty("rp_age");
        if (rpName) player.nameTag = `§f${rpName} §7[${rpAge}]`;
    }
});

// --- 2. SISTEM CHAT TERPADU (Command & Format Chat RP) ---
world.beforeEvents.chatSend.subscribe((event) => {
    const { sender: player, message } = event;
    const msg = message.toLowerCase();
    
    // Batalkan pesan asli segera agar tidak muncul dobel
    event.cancel = true;

    system.run(() => {
        // Perintah Admin Login
        if (msg === "!admin") {
            return openAdminLogin(player);
        }

        // Perintah Reset Registrasi (Hanya Admin)
        if (msg.startsWith("!resetregis")) {
            const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";
            if (isAdmin) {
                player.setDynamicProperty("is_registered", undefined);
                return player.sendMessage("§e[SYSTEM] Data registrasi direset. Silakan re-join!");
            }
            return player.sendMessage("§c[ERROR] Anda tidak memiliki izin!");
        }

        // Filter Mute
        if (player.hasTag("muted")) {
            return player.sendMessage("§cKamu sedang dimute oleh admin!");
        }

        // Format Chat RP
        const rpName = player.getDynamicProperty("rp_name");
        if (rpName) {
            let prefix = "§7[WARGA]";
            if (player.hasTag("owner")) prefix = "§l§e[OWNER]";
            else if (player.hasTag("admin")) prefix = "§e[ADMIN]";
            else if (player.hasTag("worker")) prefix = "§a[WORKER]";

            world.sendMessage(`${prefix} §f${rpName}: ${message}`);
        } else {
            player.sendMessage("§c[!] Selesaikan registrasi dulu untuk bicara!");
        }
    });
});

// --- 3. ITEM USE SENSOR (Smartphone & Admin Panel) ---
world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (!itemStack) return; 

    const typeId = itemStack.typeId;

    system.run(() => {
        if (typeId === "controlix:smartphone_1") {
            openSmartphoneUI(player);
        } 
        else if (typeId === "controlix:admin_console" || typeId === "controlix:admin_panel") { 
            const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";
            if (isAdmin) {
                openAdminPanel(player);
            } else {
                player.sendMessage("§c[ERROR] Kamu tidak memiliki akses admin!");
                player.playSound("note.bass"); 
            }
        }
    });
});

// --- 4. CLICK ON BLOCK SENSOR (Sistem Land Claim) ---
world.afterEvents.itemUseOn.subscribe((event) => {
    const { source: player, itemStack, block } = event;
    if (!itemStack || itemStack.typeId !== "controlix:land_claim") return;

    const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";
    if (!isAdmin) return player.sendMessage("§c[ERROR] Khusus Admin!");

    const { x, y, z } = block.location;
    const titik1Raw = player.getDynamicProperty("titik_1");

    if (titik1Raw === undefined) {
        player.setDynamicProperty("titik_1", `${x},${y},${z}`);
        player.sendMessage(`§b[LAND CLAIM]§f Titik 1: §a${x}, ${y}, ${z}`);
        player.playSound("random.levelup");
    } else {
        const koordinat2 = `${x},${y},${z}`;
        player.sendMessage(`§b[LAND CLAIM]§f Titik 2: §a${x}, ${y}, ${z}`);

        const playerNames = world.getAllPlayers().map(p => p.name); 
        system.run(() => {
            bukaMenuLahan(player, playerNames, titik1Raw, koordinat2);
        });

        player.setDynamicProperty("titik_1", undefined);
    }
});