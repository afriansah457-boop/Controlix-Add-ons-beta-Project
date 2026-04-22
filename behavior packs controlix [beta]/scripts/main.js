import { world, system } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";
import { openAdminLogin } from "./features/admin.js";
import { openAdminPanel } from "./features/admin_panel.js"; 
import { bukaMenuLahan } from "./features/land_claim.js";
import { openRegistrationMenu } from "./features/registration.js";
import "./features/command.js";

// --- 1. PLAYER SPAWN (SAFE) ---
if (world.afterEvents?.playerSpawn) {
    world.afterEvents.playerSpawn.subscribe((event) => {
        const player = event.player;
        if (!player) return;

        const isRegistered = player.getDynamicProperty("is_registered");

        if (!isRegistered) {
            player.addEffect("blindness", 200, { showParticles: false });
            player.addEffect("slowness", 200, { amplifier: 10, showParticles: false });

            system.runTimeout(() => {
                try {
                    openRegistrationMenu(player);
                } catch (e) {
                    console.warn("UI register error:", e);
                }
            }, 60);
        } else {
            const rpName = player.getDynamicProperty("rp_name");
            const rpAge = player.getDynamicProperty("rp_age");
            if (rpName) player.nameTag = `§f${rpName} §7[${rpAge ?? "?"}]`;
        }
    });
} else {
    console.warn("playerSpawn event tidak tersedia");
}

// --- 2. CHAT SYSTEM ---
if (world.beforeEvents?.chatSend) {
    world.beforeEvents.chatSend.subscribe((event) => {
        const player = event.sender;
        const message = event.message;
        const msg = message.toLowerCase();

        event.cancel = true;

        system.run(() => {
            if (msg === "!admin") {
                return openAdminLogin(player);
            }

            if (msg.startsWith("!resetregis")) {
                const isAdmin = player.hasTag("admin") || (player.getDynamicProperty("role") ?? "") === "admin";
                if (isAdmin) {
                    player.setDynamicProperty("is_registered", undefined);
                    return player.sendMessage("§eData registrasi direset.");
                }
                return player.sendMessage("§cTidak ada izin!");
            }

            if (player.hasTag("muted")) {
                return player.sendMessage("§cKamu sedang dimute!");
            }

            const rpName = player.getDynamicProperty("rp_name");

            if (rpName) {
                let prefix = "§7[WARGA]";
                if (player.hasTag("owner")) prefix = "§l§e[OWNER]";
                else if (player.hasTag("admin")) prefix = "§e[ADMIN]";
                else if (player.hasTag("worker")) prefix = "§a[WORKER]";

                world.sendMessage(`${prefix} ${rpName}: ${message}`);
            } else {
                player.sendMessage("§cSelesaikan registrasi dulu!");
            }
        });
    });
}

// --- 3. ITEM USE ---
world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    const itemStack = event.itemStack;
    const block = event.block;

    if (!player || !itemStack) return;

    const typeId = itemStack.typeId;
    const isAdmin = player.hasTag("admin") || (player.getDynamicProperty("role") ?? "") === "admin";

    console.warn("Item dipakai:", typeId);

    system.runTimeout(() => {
        try {

            // 📱 SMARTPHONE
            if (typeId === "controlix:smartphone_1") {
                return openSmartphoneUI(player);
            }

            // 🛠 ADMIN PANEL
            if (typeId === "controlix:admin_console" || typeId === "controlix:admin_panel") {
                if (isAdmin) {
                    return openAdminPanel(player);
                } else {
                    player.sendMessage("§cTidak ada akses admin!");
                    player.playSound("note.bass");
                    return;
                }
            }

            // 🧱 LAND CLAIM
            if (typeId === "controlix:land_claim" && block) {
                if (!isAdmin) return player.sendMessage("§cAdmin only!");

                const { x, y, z } = block.location;
                const titik1Raw = player.getDynamicProperty("titik_1");

                if (!titik1Raw) {
                    player.setDynamicProperty("titik_1", `${x},${y},${z}`);
                    player.sendMessage(`§bTitik 1: §a${x}, ${y}, ${z}`);
                    player.playSound("random.levelup");
                } else {
                    const koordinat2 = `${x},${y},${z}`;
                    player.sendMessage(`§bTitik 2: §a${x}, ${y}, ${z}`);

                    const playerNames = world.getAllPlayers().map(p => p.name);

                    bukaMenuLahan(player, playerNames, titik1Raw, koordinat2);
                    player.setDynamicProperty("titik_1", undefined);
                }
            }

        } catch (e) {
            console.warn("ItemUse Error:", e);
        }
    }, 2);
});