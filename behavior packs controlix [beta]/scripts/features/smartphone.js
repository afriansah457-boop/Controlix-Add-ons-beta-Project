import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { openPersonalMenu } from "./menus/personal.js";
import { openEconomyMenu } from "./menus/economy.js";
import { openPublicMenu } from "./menus/public.js";
import { openProgressMenu } from "./menus/progress.js";

// --- INIT DATA ---
system.run(() => {
    try {
        if (world.getDynamicProperty("server_ranks") === undefined) {
            world.setDynamicProperty("server_ranks", "[]");
        }
    } catch (e) {
        console.warn("Init Error:", e);
    }
});

// --- SMARTPHONE UI ---
export function openSmartphoneUI(player) {
    const credixBalance = player.getDynamicProperty("credix") ?? 0;

    system.runTimeout(() => {
        try {
            const mainMenu = new ActionFormData()
                .title("§l§9SMARTPHONE")
                .body(`Selamat datang, §b${player.name}§f!\nSaldo: §e${credixBalance} Credix`)
                .button("Personal & Sosial\n§8Hubungan & Pesan")
                .button("Ekonomi & Aset\n§8Keuangan & Properti")
                .button("§eToko Rank\n§8Beli Rank Eksklusif")
                .button("Layanan Publik\n§8Lapor & Informasi")
                .button("Karir & Progres\n§8Level & Statistik");

            mainMenu.show(player).then((result) => {
                if (!result || result.canceled) return;

                switch (result.selection) {
                    case 0: openPersonalMenu(player); break;
                    case 1: openEconomyMenu(player); break;
                    case 2: openBuyRankMenu(player); break;
                    case 3: openPublicMenu(player); break;
                    case 4: openProgressMenu(player); break;
                }
            });

        } catch (e) {
            console.warn("Smartphone UI Error:", e);
        }
    }, 2);
}

// --- TOKO RANK ---
function openBuyRankMenu(player) {
    let ranks = [];

    try {
        const savedData = world.getDynamicProperty("server_ranks");
        ranks = savedData ? JSON.parse(savedData) : [];
    } catch {
        ranks = [];
    }

    if (!Array.isArray(ranks) || ranks.length === 0) {
        return player.sendMessage("§cBelum ada rank tersedia.");
    }

    const credixBalance = player.getDynamicProperty("credix") ?? 0;

    system.runTimeout(() => {
        try {
            const form = new ActionFormData()
                .title("§l§eTOKO RANK")
                .body(`Saldo: §e${credixBalance} Credix`);

            ranks.forEach(r => {
                form.button(`${r.warna}${r.nama}\n§8${r.harga} Credix`);
            });

            form.button("§7Kembali");

            form.show(player).then(res => {
                if (!res || res.canceled) return;

                if (res.selection === ranks.length) {
                    return openSmartphoneUI(player);
                }

                const selected = ranks[res.selection];
                const money = player.getDynamicProperty("credix") ?? 0;

                if (!selected) return;

                if (money >= selected.harga) {
                    player.setDynamicProperty("credix", money - selected.harga);
                    player.setDynamicProperty("current_rank", `${selected.warna}${selected.nama}`);

                    player.sendMessage(`§aBerhasil beli rank ${selected.nama}`);
                    player.playSound("random.levelup");
                } else {
                    player.sendMessage("§cUang tidak cukup!");
                    player.playSound("note.bass");
                }
            });

        } catch (e) {
            console.warn("Buy Rank Error:", e);
        }
    }, 2);
}