import { world, system } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";
import { openAdminLogin } from "./features/admin.js";
import { openAdminPanel } from "./features/admin_panel.js"; 
import { bukaMenuLahan } from "./features/land_claim.js";

// --- 1. CHAT SENSOR (!admin) ---
world.beforeEvents.chatSend.subscribe((event) => {
    const { sender: player, message } = event;

    if (message.toLowerCase() === "!admin") {
        event.cancel = true;
        // Gunakan system.run agar UI muncul setelah chat dibatalkan
        system.run(() => {
            openAdminLogin(player);
        });
    }
});

// --- 2. ITEM USE SENSOR (Smartphone & Admin Panel) ---
world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    const typeId = itemStack.typeId;

    // Gunakan system.run untuk semua pembukaan UI agar stabil
    system.run(() => {
        if (typeId === "controlix:smartphone_1") {
            openSmartphoneUI(player);
        } 
        else if (typeId === "controlix:admin_console") { 
            // Cek role atau tag admin
            const isUserAdmin = player.getDynamicProperty("role") === "admin" || player.hasTag("admin");
            if (isUserAdmin) {
                openAdminPanel(player);
            } else {
                player.sendMessage("§c[ERROR] Kamu tidak memiliki akses admin.");
            }
        }
    });
});

// --- 3. CLICK ON BLOCK SENSOR (Land Claim) ---
world.afterEvents.itemUseOn.subscribe((event) => {
    const { source: player, itemStack, block } = event;
    
    if (itemStack.typeId === "controlix:land_claim") {
        const isUserAdmin = player.getDynamicProperty("role") === "admin" || player.hasTag("admin");
        
        if (!isUserAdmin) {
            player.sendMessage("§c[ERROR] Hanya Admin yang dapat menggunakan alat ini.");
            return;
        }

        const { x, y, z } = block.location;
        const titik1 = player.getDynamicProperty("titik_1");

        if (!titik1) {
            // SET TITIK 1
            player.setDynamicProperty("titik_1", `${x},${y},${z}`);
            player.sendMessage(`§b[LAND CLAIM]§f Titik 1 disetel pada: §a${x}, ${y}, ${z}`);
            player.playSound("random.orb");
        } else {
            // SET TITIK 2 & BUKA MENU
            const koordinat2 = `${x},${y},${z}`;
            player.sendMessage(`§b[LAND CLAIM]§f Titik 2 disetel pada: §a${x}, ${y}, ${z}`);

            // Perbaikan: Gunakan getAllPlayers()
            const playerNames = world.getAllPlayers().map(p => p.name);
            
            system.run(() => {
                bukaMenuLahan(player, playerNames, titik1, koordinat2);
            });

            // Reset koordinat setelah menu terbuka
            player.setDynamicProperty("titik_1", undefined);
        }
    }
});