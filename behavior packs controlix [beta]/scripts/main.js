import { world, system } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";
import { openAdminLogin } from "./features/admin.js";
import { openAdminPanel } from "./features/admin_panel.js"; 
import { bukaMenuLahan } from "./features/land_claim.js";

// --- 1. CHAT SENSOR (!admin) ---
world.beforeEvents.chatSend.subscribe((event) => {
    const { sender: player, message } = event;

    if (message.toLowerCase() === "!admin") {
        event.cancel = true; // Batalkan pesan agar tidak muncul di chat [cite: 3]
        
        // Menjalankan UI di tick berikutnya agar sinkron
        system.run(() => {
            openAdminLogin(player);
        });
    }
});

// --- 2. ITEM USE SENSOR (Smartphone & Admin Panel) ---
world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (!itemStack) return; // Mencegah error tangan kosong [cite: 10, 150]

    const typeId = itemStack.typeId;

    system.run(() => {
        // Cek Smartphone
        if (typeId === "controlix:smartphone_1") {
            openSmartphoneUI(player);
        } 
        // Cek Admin Panel
        else if (typeId === "controlix:admin_console") { 
            const isUserAdmin = player.getDynamicProperty("role") === "admin" || player.hasTag("admin");
            if (isUserAdmin) {
                openAdminPanel(player);
            } else {
                player.sendMessage("§c[ERROR] Kamu tidak memiliki akses admin!");
                player.playSound("note.bass"); // Feedback suara gagal [cite: 14, 21]
            }
        }
    });
});

// --- 3. CLICK ON BLOCK SENSOR (Land Claim) ---
world.afterEvents.itemUseOn.subscribe((event) => {
    const { source: player, itemStack, block } = event;
    if (!itemStack || itemStack.typeId !== "controlix:land_claim") return;

    const isUserAdmin = player.getDynamicProperty("role") === "admin" || player.hasTag("admin");
    
    if (!isUserAdmin) {
        player.sendMessage("§c[ERROR] Hanya Admin yang dapat menggunakan alat ini.");
        player.playSound("note.bass");
        return;
    }

    const { x, y, z } = block.location;
    const titik1Raw = player.getDynamicProperty("titik_1");

    if (titik1Raw === undefined) {
        // SET TITIK 1
        player.setDynamicProperty("titik_1", `${x},${y},${z}`);
        player.sendMessage(`§b[LAND CLAIM]§f Titik 1 disetel pada: §a${x}, ${y}, ${z}`);
        player.playSound("random.levelup");
    } else {
        // SET TITIK 2 & BUKA MENU
        const koordinat2 = `${x},${y},${z}`;
        player.sendMessage(`§b[LAND CLAIM]§f Titik 2 disetel pada: §a${x}, ${y}, ${z}`);

        // Ambil list nama pemain untuk dropdown UI [cite: 9, 36, 127]
        const playerNames = world.getAllPlayers().map(p => p.name); 
        
        system.run(() => {
            bukaMenuLahan(player, playerNames, titik1Raw, koordinat2);
        });

        // Reset properti agar bisa klaim area baru [cite: 12, 13]
        player.setDynamicProperty("titik_1", undefined);
    }
});