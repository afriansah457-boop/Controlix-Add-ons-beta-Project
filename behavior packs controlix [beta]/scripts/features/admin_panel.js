import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const ADMIN_ITEM_ID = "controlix:admin_console";

// --- INIT ---
world.afterEvents.worldInitialize.subscribe(() => {
    try {
        if (world.getDynamicProperty("private_world") === undefined) {
            world.setDynamicProperty("private_world", false);
        }
        if (world.getDynamicProperty("data_lahan_server") === undefined) {
            world.setDynamicProperty("data_lahan_server", "[]");
        }
    } catch (e) {
        console.error("Init Error:", e);
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

// --- PROTEKSI WORLD (SAFE) ---
if (world.beforeEvents?.playerPlaceBlock) {
    world.beforeEvents.playerPlaceBlock.subscribe((event) => {
        if (!canPlayerBuild(event.player, event.block.location)) {
            event.cancel = true;
            system.run(() => {
                event.player.sendMessage("§c§l[!]§r §cPrivate World Aktif!");
                event.player.playSound("note.bass");
            });
        }
    });
} else {
    console.warn("beforeEvents tidak tersedia - proteksi hanya warning");

    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        if (!canPlayerBuild(event.player, event.block.location)) {
            system.run(() => {
                event.player.sendMessage("§cArea ini bukan milikmu!");
            });
        }
    });
}

if (world.beforeEvents?.playerBreakBlock) {
    world.beforeEvents.playerBreakBlock.subscribe((event) => {
        if (!canPlayerBuild(event.player, event.block.location)) {
            event.cancel = true;
            system.run(() => {
                event.player.sendMessage("§cTidak bisa merusak di area ini!");
            });
        }
    });
}

// --- FREEZE & MUTE ---
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (player.hasTag("frozen")) {
            player.teleport(player.location, { checkForBlocks: false });
        }
    }
}, 1);

if (world.beforeEvents?.chatSend) {
    world.beforeEvents.chatSend.subscribe((event) => {
        if (event.sender.hasTag("muted")) {
            event.cancel = true;
            system.run(() => event.sender.sendMessage("§cKamu sedang dimute!"));
        }
    });
}

// --- ADMIN ITEM ---
world.afterEvents.itemUse.subscribe((data) => {
    const { source: player, itemStack } = data;
    if (itemStack?.typeId === ADMIN_ITEM_ID) {
        if (player.hasTag("admin") || player.getDynamicProperty("role") === "admin") {
            system.run(() => openAdminPanel(player));
        } else {
            player.sendMessage("§cAkses Ditolak!");
        }
    }
});

// --- ADMIN PANEL ---
export function openAdminPanel(player) {
    const isPrivate = world.getDynamicProperty("private_world") ?? false;

    new ActionFormData()
        .title("§lADMIN PANEL")
        .button(`§6Private World [${isPrivate ? "§aON" : "§7OFF"}]`)
        .button("Mute Player")
        .button("Freeze Player")
        .button("Clear Ender Chest")
        .button("Inventory See")
        .button("Clear Chat")
        .show(player)
        .then((res) => {
            if (res.canceled) return;

            switch (res.selection) {
                case 0: togglePrivate(player); break;
                case 1: openPlayerSelector(player, toggleMute); break;
                case 2: openPlayerSelector(player, toggleFreeze); break;
                case 3: openPlayerSelector(player, clearEnderChest); break;
                case 4: openInventorySee(player); break;
                case 5: world.sendMessage("\n".repeat(20)); break;
            }
        });
}

// --- PRIVATE TOGGLE ---
function togglePrivate(player) {
    const newState = !(world.getDynamicProperty("private_world") ?? false);
    world.setDynamicProperty("private_world", newState);
    player.sendMessage(`§ePrivate World: ${newState ? "§aON" : "§cOFF"}`);
}

// --- PLAYER SELECTOR ---
function openPlayerSelector(admin, action) {
    const players = world.getAllPlayers();
    if (players.length === 0) return admin.sendMessage("§cTidak ada player!");

    new ModalFormData()
        .title("Pilih Player")
        .dropdown("Player:", players.map(p => p.name))
        .show(admin)
        .then(res => {
            if (!res.canceled) action(admin, players[res.formValues[0]]);
        });
}

// --- ACTIONS ---
function toggleMute(admin, target) {
    target.hasTag("muted") ? target.removeTag("muted") : target.addTag("muted");
    admin.sendMessage(`Mute ${target.name}`);
}

function toggleFreeze(admin, target) {
    target.hasTag("frozen") ? target.removeTag("frozen") : target.addTag("frozen");
    admin.sendMessage(`Freeze ${target.name}`);
}

function clearEnderChest(admin, target) {
    for (let i = 0; i < 27; i++) {
        admin.runCommandAsync(`replaceitem entity "${target.name}" slot.enderchest ${i} air`);
    }
    admin.sendMessage(`EC ${target.name} dibersihkan`);
}

// --- INVENTORY SEE ---
function openInventorySee(player) {
    const players = world.getAllPlayers();

    new ModalFormData()
        .title("Inventory")
        .dropdown("Player:", players.map(p => p.name))
        .show(player)
        .then(res => {
            if (res.canceled) return;

            const target = players[res.formValues[0]];
            const inv = target.getComponent("inventory")?.container;

            if (!inv) return player.sendMessage("§cInventory error");

            let text = "";
            for (let i = 0; i < inv.size; i++) {
                const item = inv.getItem(i);
                if (item) text += `[${i}] ${item.typeId} x${item.amount}\n`;
            }

            new ActionFormData()
                .title(target.name)
                .body(text || "Kosong")
                .button("OK")
                .show(player);
        });
}