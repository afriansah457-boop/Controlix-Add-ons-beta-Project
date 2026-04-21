import { world, system } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";
import { openAdminLogin } from "./features/admin.js";
import { openAdminPanel } from "./features/admin_panel.js"; 
import { bukaMenuLahan } from "./features/land_claim.js";
import { openRegistrationMenu } from "./features/registration.js";

// --- 1. SENSOR PEMAIN MASUK (REGISTRASI) ---
world.afterEvents.playerSpawn.subscribe((event) => {
    const { player, initialSpawn } = event;
    const isRegistered = player.getDynamicProperty("is_registered");
    
    if (!isRegistered) {
        // Efek buta dan lambat agar fokus isi form
        player.addEffect("blindness", 200, { showParticles: false });
        player.addEffect("slowness", 200, { amplifier: 10, showParticles: false });
        
        system.runTimeout(() => {
            openRegistrationMenu(player);
        }, 60); // Delay 3 detik agar loading dunia selesai
    } else {
        // Update nametag saat login ulang
        const rpName = player.getDynamicProperty("rp_name");
        const rpAge = player.getDynamicProperty("rp_age");
        if (rpName) player.nameTag = `§f${rpName} §7[${rpAge}]`;
    }
});

// --- 2. CHAT SENSOR (!admin, !resetregis, & RP Chat) ---
world.beforeEvents.chatSend.subscribe((event) => {
    const { sender: player, message } = event;
    const msg = message.toLowerCase();

    // Perintah Admin Login
    if (msg === "!admin") {
        event.cancel = true;
        system.run(() => openAdminLogin(player));
        return;
    }

    // Perintah Reset Registrasi (Hanya Admin)
    if (msg.startsWith("!resetregis")) {
        event.cancel = true;
        if (player.hasTag("admin")) {
            player.setDynamicProperty("is_registered", undefined);
            player.sendMessage("§e[SYSTEM] Data registrasi direset. Silakan re-join!");
        }
        return;
    }

    // Format Chat Berdasarkan Nama Registrasi
    const rpName = player.getDynamicProperty("rp_name");
    if (rpName) {
        event.cancel = true;
        world.sendMessage(`§7[WARGA] §f${rpName}: ${message}`);
    } else {
        // Cegah chat jika belum daftar
        event.cancel = true;
        system.run(() => player.sendMessage("§cSelesaikan registrasi dulu!"));
    }
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
        else if (typeId === "controlix:admin_console") { 
            const isUserAdmin = player.getDynamicProperty("role") === "admin" || player.hasTag("admin");
            if (isUserAdmin) {
                openAdminPanel(player);
            } else {
                player.sendMessage("§c[ERROR] Kamu tidak memiliki akses admin!");
                player.playSound("note.bass");
            }
        }
    });
});

// --- 4. CLICK ON BLOCK SENSOR (Land Claim) ---
world.afterEvents.itemUseOn.subscribe((event) => {
    const { source: player, itemStack, block } = event;
    if (!itemStack || itemStack.typeId !== "controlix:land_claim") return;

    const isUserAdmin = player.getDynamicProperty("role") === "admin" || player.hasTag("admin");
    if (!isUserAdmin) return player.sendMessage("§c[ERROR] Khusus Admin!");

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