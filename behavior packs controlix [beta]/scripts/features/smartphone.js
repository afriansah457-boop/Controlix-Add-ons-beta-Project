import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { openPersonalMenu } from "./menus/personal.js";
import { openEconomyMenu } from "./menus/economy.js";
import { openPublicMenu } from "./menus/public.js";
import { openProgressMenu } from "./menus/progress.js";

// --- 1. LOGIKA CHAT & COMMAND !createrank ---
world.beforeEvents.chatSend.subscribe((event) => {
    const { sender: player, message } = event;

    if (message.startsWith("!createrank")) {
        event.cancel = true;
        const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";
        
        if (!isAdmin) {
            return system.run(() => player.sendMessage("§cHanya Admin yang bisa membuat rank!"));
        }

        system.run(() => {
            new ModalFormData()
                .title("§lBuat Rank Baru")
                .textField("Nama Rank:", "Contoh: Citizen")
                .dropdown("Warna Rank:", ["§fPutih", "§cMerah", "§eKuning", "§aHijau", "§bBiru", "§dPink"])
                .textField("Harga (Credix):", "100", "100")
                .show(player).then(res => {
                    if (res.canceled) return;
                    const [nama, warnaIdx, harga] = res.formValues;
                    const warnaKodes = ["§f", "§c", "§e", "§a", "§b", "§d"];
                    
                    const rankData = { nama, warna: warnaKodes[warnaIdx], harga: parseInt(harga) };
                    const existingRanks = JSON.parse(world.getDynamicProperty("server_ranks") || "[]");
                    existingRanks.push(rankData);
                    
                    world.setDynamicProperty("server_ranks", JSON.stringify(existingRanks));
                    player.sendMessage(`§aRank ${warnaKodes[warnaIdx]}${nama} §aberhasil dibuat!`);
                });
        });
        return;
    }

    // Format Chat Otomatis
    event.cancel = true;
    let rankDisplay = player.getDynamicProperty("current_rank") || "§7Member";

    if (player.hasTag("owner")) rankDisplay = "§l§eOWNER";
    else if (player.hasTag("admin")) rankDisplay = "§eADMIN";
    else if (player.hasTag("worker")) rankDisplay = "§aWORKER";

    world.sendMessage(`[${rankDisplay}§r] ${player.name}: ${message}`);
});

// --- 2. MENU UTAMA SMARTPHONE ---
export function openSmartphoneUI(player) {
  const mainMenu = new ActionFormData()
    .title("§l§9SMARTPHONE")
    .body(`Selamat datang, §b${player.name}§f!\nSaldo: §e${player.getDynamicProperty("credix") || 0} Credix`)
    .button("Personal & Sosial\n§8Hubungan & Pesan")
    .button("Ekonomi & Aset\n§8Keuangan & Properti")
    .button("§eToko Rank\n§8Beli Rank Eksklusif") // Menu baru, terpisah dari ekonomi
    .button("Layanan Publik\n§8Lapor & Informasi")
    .button("Karir & Progres\n§8Level & Statistik");

  mainMenu.show(player).then((result) => {
    if (result.canceled) return;

    system.run(() => {
      switch (result.selection) {
        case 0: openPersonalMenu(player); break;
        case 1: openEconomyMenu(player); break;
        case 2: openBuyRankMenu(player); break; // Menuju menu beli rank
        case 3: openPublicMenu(player); break;
        case 4: openProgressMenu(player); break;
      }
    });
  });
}

// --- 3. MENU TOKO RANK ---
function openBuyRankMenu(player) {
    const ranks = JSON.parse(world.getDynamicProperty("server_ranks") || "[]");
    
    if (ranks.length === 0) {
        player.sendMessage("§cMaaf, saat ini belum ada rank yang tersedia di toko.");
        return;
    }

    const buyForm = new ActionFormData()
        .title("§l§eTOKO RANK")
        .body(`Pilih rank yang ingin kamu beli menggunakan Credix.\nSaldo Anda: §e${player.getDynamicProperty("credix") || 0} Credix`);

    ranks.forEach(r => {
        buyForm.button(`${r.warna}${r.nama}\n§8Harga: ${r.harga} Credix`);
    });

    buyForm.button("§7Kembali");

    buyForm.show(player).then(res => {
        if (res.canceled || res.selection === ranks.length) {
            return system.run(() => openSmartphoneUI(player));
        }
        
        const selected = ranks[res.selection];
        const playerMoney = player.getDynamicProperty("credix") || 0;

        if (playerMoney >= selected.harga) {
            player.setDynamicProperty("credix", playerMoney - selected.harga);
            player.setDynamicProperty("current_rank", `${selected.warna}${selected.nama}`);
            
            player.sendMessage(`§aSelamat! Kamu sekarang memiliki rank ${selected.warna}${selected.nama}§a.`);
            player.playSound("random.levelup");
        } else {
            player.sendMessage("§cSaldo Credix kamu tidak cukup untuk membeli rank ini!");
            player.playSound("note.bass");
        }
    });
}