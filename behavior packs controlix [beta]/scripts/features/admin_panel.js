import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const ADMIN_ITEM_ID = "controlix:admin_console";

// --- INIT SAFE (ANTI ERROR SEMUA VERSI) ---
system.run(() => {
    try {
        if (world.getDynamicProperty("private_world") === undefined) {
            world.setDynamicProperty("private_world", false);
        }
        if (world.getDynamicProperty("data_lahan_server") === undefined) {
            world.setDynamicProperty("data_lahan_server", "[]");
        }
    } catch (e) {
        console.warn("Init error:", e);
    }
});

// --- DATABASE ---
function getDaftarLahan() {
    try {
        const data = world.getDynamicProperty("data_lahan_server");
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function isInside(pos, t1, t2) {
    return (
        pos.x >= Math.min(t1.x, t2.x) && pos.x <= Math.max(t1.x, t2.x) &&
        pos.y >= Math.min(t1.y, t2.y) && pos.y <= Math.max(t1.y, t2.y) &&
        pos.z >= Math.min(t1.z, t2.z) && pos.z <= Math.max(t1.z, t2.z)
    );
}

function canPlayerBuild(player, blockLocation) {
    if (player.hasTag("admin")) return true;

    const isPrivate = world.getDynamicProperty("private_world") ?? false;
    if (!isPrivate) return true;

    const daftarLahan = getDaftarLahan();
    return daftarLahan.some(lahan =>
        lahan.pemilik === player.name &&
        isInside(blockLocation, lahan.koordinat.t1, lahan.koordinat.t2)
    );
}

// --- PROTEKSI (ANTI ERROR VERSION) ---
if (world.beforeEvents?.playerPlaceBlock) {
    world.beforeEvents.playerPlaceBlock.subscribe((event) => {
        if (!canPlayerBuild(event.player, event.block.location)) {
            event.cancel = true;
            system.run(() => event.player.sendMessage("§cTidak bisa build disini!"));
        }
    });
}

if (world.beforeEvents?.playerBreakBlock) {
    world.beforeEvents.playerBreakBlock.subscribe((event) => {
        if (!canPlayerBuild(event.player, event.block.location)) {
            event.cancel = true;
            system.run(() => event.player.sendMessage("§cTidak bisa break disini!"));
        }
    });
}

// --- MUTE ---
if (world.beforeEvents?.chatSend) {
    world.beforeEvents.chatSend.subscribe((event) => {
        if (event.sender.hasTag("muted")) {
            event.cancel = true;
            system.run(() => event.sender.sendMessage("§cKamu sedang dimute!"));
        }
    });
}

// --- FREEZE ---
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (player.hasTag("frozen")) {
            player.teleport(player.location, { checkForBlocks: false });
        }
    }
}, 1);

// --- ADMIN ITEM (FIX UI) ---
world.afterEvents.itemUse.subscribe((data) => {
    const { source: player, itemStack } = data;

    if (itemStack?.typeId === ADMIN_ITEM_ID) {
        const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";

        if (!isAdmin) {
            player.sendMessage("§cAkses Ditolak!");
            return;
        }

        // 🔥 FIX: delay supaya UI kebuka
        system.runTimeout(() => {
            openAdminPanel(player);
        }, 2);
    }
});

// --- ADMIN PANEL ---
export function openAdminPanel(player) {
    const isPrivate = world.getDynamicProperty("private_world") ?? false;

    new ActionFormData()
        .title("§lADMIN PANEL")
        .button(`Private World: ${isPrivate ? "§aON" : "§cOFF"}`)
        .button("Mute Player")
        .button("Freeze Player")
        .button("Clear Chat")
        .show(player)
        .then(res => {
            if (!res || res.canceled) return;

            switch (res.selection) {
                case 0:
                    world.setDynamicProperty("private_world", !isPrivate);
                    player.sendMessage("§ePrivate world diubah!");
                    break;

                case 1:
                    openPlayerSelector(player, toggleMute);
                    break;

                case 2:
                    openPlayerSelector(player, toggleFreeze);
                    break;

                case 3:
                    world.sendMessage("\n".repeat(20));
                    break;
            }
        });
}

// --- PLAYER SELECT ---
function openPlayerSelector(admin, action) {
    const players = world.getAllPlayers();
    if (players.length === 0) return admin.sendMessage("§cTidak ada player");

    new ModalFormData()
        .title("Pilih Player")
        .dropdown("Player:", players.map(p => p.name))
        .show(admin)
        .then(res => {
            if (!res.canceled) action(admin, players[res.formValues[0]]);
        });
}

// --- ACTION ---
function toggleMute(admin, target) {
    target.hasTag("muted") ? target.removeTag("muted") : target.addTag("muted");
    admin.sendMessage(`Mute ${target.name}`);
}

function toggleFreeze(admin, target) {
    target.hasTag("frozen") ? target.removeTag("frozen") : target.addTag("frozen");
    admin.sendMessage(`Freeze ${target.name}`);
}