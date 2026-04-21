import { world, system } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";
import { openAdminLogin } from "./features/admin.js";
import { openAdminPanel } from "./features/admin_panel.js"; 
import { bukaMenuLahan } from "./features/land_claim.js";
import { openRegistrationMenu } from "./features/registration.js";

// --- 1. SENSOR PEMAIN MASUK & REGISTRASI ---
// Mendeteksi pemain baru untuk memulai proses registrasi [cite: 185]
world.afterEvents.playerSpawn.subscribe((event) => {
    const { player } = event;
    const isRegistered = player.getDynamicProperty("is_registered");
    
    if (!isRegistered) {
        // Efek visual agar pemain fokus mengisi form registrasi
        player.addEffect("blindness", 200, { showParticles: false });
        player.addEffect("slowness", 200, { amplifier: 10, showParticles: false });
        
        system.runTimeout(() => {
            openRegistrationMenu(player);
        }, 60); // Delay singkat agar loading dunia selesai
    } else {
        // Memastikan nametag tetap sinkron saat login ulang
        const rpName = player.getDynamicProperty("rp_name");
        const rpAge = player.getDynamicProperty("rp_age");
        if (rpName) player.nameTag = `§f${rpName} §7[${rpAge}]`;
    }
});

// --- 2. SISTEM CHAT TERPADU (Command & Format Chat RP) ---
// Menangani perintah admin dan memformat chat agar sesuai identitas RP [cite: 185]
world.beforeEvents.chatSend.subscribe((event) => {
    const { sender: player, message } = event;
    const msg = message.toLowerCase();
    
    // Batalkan pesan asli segera agar tidak muncul dobel di chat 
    event.cancel = true;

    system.run(() => {
        // Perintah Admin Login
        if (msg === "!admin") {
            return openAdminLogin(player);
        }

        // Perintah Reset Registrasi (Hanya Admin) [cite: 66]
        if (msg.startsWith("!resetregis")) {
            if (player.hasTag("admin") || player.getDynamicProperty("role") === "admin") {
                player.setDynamicProperty("is_registered", undefined);
                return player.sendMessage("§e[SYSTEM] Data registrasi direset. Silakan re-join!");
            }
            return player.sendMessage("§c[ERROR] Anda tidak memiliki izin!");
        }

        // Logic Chat Berdasarkan Status Registrasi [cite: 65, 68]
        if (player.hasTag("muted")) {
            return player.sendMessage("§cKamu sedang dimute oleh admin!");
        }

        const rpName = player.getDynamicProperty("rp_name");
        if (rpName) {
            // Deteksi Rank atau Tag Khusus untuk Prefix Chat [cite: 65, 74]
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
// Membuka UI berdasarkan item yang digunakan oleh pemain [cite: 14, 134]
world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (!itemStack) return; // Validasi tangan kosong untuk mencegah error log [cite: 20, 136]

    const typeId = itemStack.typeId;

    system.run(() => {
        // Pemicu Smartphone UI [cite: 186]
        if (typeId === "controlix:smartphone_1") {
            openSmartphoneUI(player);
        } 
        // Pemicu Admin Panel dengan validasi akses [cite: 41, 109]
        else if (typeId === "controlix:admin_console" || typeId === "controlix:admin_panel") { 
            const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";
            if (isAdmin) {
                openAdminPanel(player);
            } else {
                player.sendMessage("§c[ERROR] Kamu tidak memiliki akses admin!");
                player.playSound("note.bass"); // Feedback audio penolakan [cite: 24, 31]
            }
        }
    });
});

// --- 4. CLICK ON BLOCK SENSOR (Sistem Land Claim) ---
// Digunakan oleh admin untuk menentukan area lahan [cite: 15, 21]
world.afterEvents.itemUseOn.subscribe((event) => {
    const { source: player, itemStack, block } = event;
    if (!itemStack || itemStack.typeId !== "controlix:land_claim") return;

    const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";
    if (!isAdmin) return player.sendMessage("§c[ERROR] Khusus Admin!");

    const { x, y, z } = block.location;
    const titik1Raw = player.getDynamicProperty("titik_1");

    if (titik1Raw === undefined) {
        // Tahap 1: Menentukan koordinat awal [cite: 21]
        player.setDynamicProperty("titik_1", `${x},${y},${z}`);
        player.sendMessage(`§b[LAND CLAIM]§f Titik 1: §a${x}, ${y}, ${z}`);
        player.playSound("random.levelup");
    } else {
        // Tahap 2: Menentukan koordinat akhir dan membuka menu registrasi lahan [cite: 21, 22]
        const koordinat2 = `${x},${y},${z}`;
        player.sendMessage(`§b[LAND CLAIM]§f Titik 2: §a${x}, ${y}, ${z}`);

        const playerNames = world.getAllPlayers().map(p => p.name); 
        system.run(() => {
            bukaMenuLahan(player, playerNames, titik1Raw, koordinat2);
        });

        // Reset properti agar admin bisa membuat klaim baru tanpa re-login [cite: 22, 23]
        player.setDynamicProperty("titik_1", undefined);
    }
});