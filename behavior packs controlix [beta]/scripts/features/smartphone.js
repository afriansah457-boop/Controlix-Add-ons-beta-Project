    .catch(err => console.error("Error Buy Rank UI: " + err));
import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { openPersonalMenu } from "./menus/personal.js";
import { openEconomyMenu } from "./menus/economy.js";
import { openPublicMenu } from "./menus/public.js";
import { openProgressMenu } from "./menus/progress.js";

// --- 1. LOGIKA CHAT & COMMAND !createrank ---
world.beforeEvents.chatSend.subscribe((event) => {
    const { sender: player, message } = event;
    const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";

    // Command !createrank (Admin Only)
    if (message.startsWith("!createrank")) {
        event.cancel = true; // Batalkan pesan asli
        
        if (!isAdmin) {
            return system.run(() => player.sendMessage("§cHanya Admin yang bisa membuat rank!"));
        }

        system.run(() => {
            new ModalFormData()
                .title("§lBuat Rank Baru")
                .textField("Nama Rank:", "Contoh: Citizen")
                .dropdown("Warna Rank:", ["§fPutih", "§cMerah", "§eKuning", "§aHijau", "§bBiru", "§dPink"])
                .textField("Harga (Credix):", "Masukkan harga...", "100") 
                .show(player)
                .then((res) => {
                    // Cek jika pemain menutup UI (ESC/Silang)
                    if (!res || res.canceled || !res.formValues) return; 

                    // Mengambil data berdasarkan urutan index input
                    const [nama, warnaIdx, hargaRaw] = res.formValues;
                    const warnaKodes = ["§f", "§c", "§e", "§a", "§b", "§d"];
                    
                    // Validasi: Pastikan nama tidak kosong
                    if (!nama || nama.trim() === "") {
                        return player.sendMessage("§cNama rank tidak boleh kosong!");
                    }

                    // Konversi input harga string menjadi angka (Integer)
                    const hargaFinal = parseInt(hargaRaw) || 0;
                    const rankData = { 
                        nama: nama, 
                        warna: warnaKodes[warnaIdx], 
                        harga: hargaFinal 
                    };
                    
                    // Database Rank menggunakan Dynamic Property
                    let existingRanks = [];
                    try {
                        const savedData = world.getDynamicProperty("server_ranks");
                        existingRanks = savedData ? JSON.parse(savedData) : [];
                    } catch (e) { 
                        existingRanks = []; 
                    }
                    
                    existingRanks.push(rankData);
                    world.setDynamicProperty("server_ranks", JSON.stringify(existingRanks));
                    
                    player.sendMessage(`§aRank ${warnaKodes[warnaIdx]}${nama} §aberhasil dibuat!`);
                    player.playSound("random.levelup");
                })
                .catch(err => console.error("Error Create Rank UI: " + err));
        });
        return;
    }

    // Format Chat Otomatis
    event.cancel = true;
    system.run(() => {
        let rankDisplay = player.getDynamicProperty("current_rank") || "§7Member";

        if (player.hasTag("owner")) rankDisplay = "§l§eOWNER";
        else if (player.hasTag("admin")) rankDisplay = "§eADMIN";
        else if (player.hasTag("worker")) rankDisplay = "§aWORKER";

        world.sendMessage(`[${rankDisplay}§r] ${player.name}: ${message}`);
    });
});

// --- 2. MENU UTAMA SMARTPHONE ---
export function openSmartphoneUI(player) {
    const credixBalance = player.getDynamicProperty("credix") || 0;
    
    const mainMenu = new ActionFormData()
        .title("§l§9SMARTPHONE")
        .body(`Selamat datang, §b${player.name}§f!\nSaldo: §e${credixBalance} Credix`)
        .button("Personal & Sosial\n§8Hubungan & Pesan")
        .button("Ekonomi & Aset\n§8Keuangan & Properti")
        .button("§eToko Rank\n§8Beli Rank Eksklusif")
        .button("Layanan Publik\n§8Lapor & Informasi")
        .button("Karir & Progres\n§8Level & Statistik");

    mainMenu.show(player).then((result) => {
        if (result.canceled) return;

        system.run(() => {
            switch (result.selection) {
                case 0: openPersonalMenu(player); break;
                case 1: openEconomyMenu(player); break;
                case 2: openBuyRankMenu(player); break;
                case 3: openPublicMenu(player); break;
                case 4: openProgressMenu(player); break;
            }
        });
    }).catch((err) => console.error("Gagal membuka Smartphone UI: " + err));
}

// --- 3. MENU TOKO RANK ---
function openBuyRankMenu(player) {
    let ranks = [];
    try {
        const savedData = world.getDynamicProperty("server_ranks");
        ranks = savedData ? JSON.parse(savedData) : [];
    } catch (e) { 
        ranks = []; 
    }
    
    if (ranks.length === 0) {
        return player.sendMessage("§cMaaf, saat ini belum ada rank yang tersedia di toko.");
    }

    const credixBalance = player.getDynamicProperty("credix") || 0;
    const buyForm = new ActionFormData()
        .title("§l§eTOKO RANK")
        .body(`Pilih rank eksklusif kamu.\nSaldo Anda: §e${credixBalance} Credix`);

    ranks.forEach(r => {
        buyForm.button(`${r.warna}${r.nama}\n§8Harga: ${r.harga} Credix`);
    });

    buyForm.button("§7Kembali");

    buyForm.show(player).then(res => {
        if (res.canceled) return;
        
        if (res.selection === ranks.length) {
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
            player.sendMessage("§cSaldo Credix kamu tidak cukup!");
            player.playSound("note.bass");
        }
    }).catch(err => console.error("Error Buy Rank UI: " + err));
}