import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";

// Helper: Mengambil saldo dari Scoreboard Credix_v1
function getBalance(player) {
    try {
        const objective = world.scoreboard.getObjective("Credix_v1");
        return objective.getScore(player) || 0;
    } catch (e) {
        return 0;
    }
}

// Helper: Menambah/Mengurangi saldo
function updateBalance(player, amount) {
    const objective = world.scoreboard.getObjective("Credix_v1");
    const current = getBalance(player);
    objective.setScore(player, current + amount);
}

export function openEconomyMenu(player) {
    const balance = getBalance(player);
    
    const menu = new ActionFormData()
        .title("§l§eEKONOMI & ASET")
        .body(`§7Saldo Saat Ini: §6${balance} Credix\n§7Status Akun: §aTerverifikasi`)
        .button("§lBank & Wallet§r\n§8Cek detail kekayaan", "textures/ui/icon_book_writable")
        .button("§lTransfer Credix§r\n§8Kirim ke pemain lain", "textures/ui/currency_flat_fortune")
        .button("§lMarketplace§r\n§8Beli item dari pemain", "textures/ui/store_home_icon")
        .button("§lVehicle Garage§r\n§8Panggil kendaraan kamu", "textures/ui/minecart")
        .button("§lProperty / House§r\n§8Manajemen aset rumah", "textures/ui/icon_recipe_item")
        .button("§lKeys Management§r\n§8Akses kunci pintu/kendaraan", "textures/ui/iron_key")
        .button("§7Kembali", "textures/ui/cancel");

    menu.show(player).then((result) => {
        if (result.canceled) return;

        switch (result.selection) {
            case 0: // Bank
                showWallet(player);
                break;
            case 1: // Transfer
                showTransferUI(player);
                break;
            case 3: // Garage
                showGarageUI(player);
                break;
            case 6: // Kembali
                import("../smartphone.js").then(m => m.openSmartphoneUI(player));
                break;
            default:
                player.sendMessage("§e[Controlix] §fFitur ini sedang dalam tahap pengembangan.");
                break;
        }
    });
}

// --- FITUR 1: TRANSFER CREDIX ---
function showTransferUI(player) {
    const players = world.getAllPlayers().filter(p => p.name !== player.name);
    const playerNames = players.map(p => p.name);

    if (playerNames.length === 0) {
        return player.sendMessage("§cTidak ada pemain lain di server untuk ditransfer.");
    }

    new ModalFormData()
        .title("TRANSFER CREDIX")
        .dropdown("Pilih Penerima:", playerNames)
        .textField("Jumlah Transfer:", "Masukkan nominal...")
        .show(player).then(res => {
            if (res.canceled) return;

            const targetPlayer = players[res.formValues[0]];
            const amount = parseInt(res.formValues[1]);
            const myBalance = getBalance(player);

            if (isNaN(amount) || amount <= 0) {
                return player.sendMessage("§cNominal transfer tidak valid!");
            }

            if (myBalance < amount) {
                return player.sendMessage("§cSaldo Credix kamu tidak mencukupi!");
            }

            // Eksekusi Transfer
            updateBalance(player, -amount);
            updateBalance(targetPlayer, amount);

            player.sendMessage(`§aBerhasil mengirim §e${amount} Credix §ake §b${targetPlayer.name}`);
            targetPlayer.sendMessage(`§aKamu menerima §e${amount} Credix §adari §b${player.name}`);
            player.playSound("random.orb");
        });
}

// --- FITUR 2: VEHICLE GARAGE ---
function showGarageUI(player) {
    const garage = new ActionFormData()
        .title("VEHICLE GARAGE")
        .body("Pilih kendaraan yang ingin dimunculkan:")
        .button("Sepeda Gunung\n§8Gratis", "textures/items/apple") // Ganti texture nanti
        .button("Motor Matic\n§8Eksklusif", "textures/items/iron_ingot")
        .button("Mobil Sport\n§8VVIP Only", "textures/items/diamond");

    garage.show(player).then(res => {
        if (res.canceled) return;

        let entityId = "";
        let vehicleName = "";

        switch (res.selection) {
            case 0: entityId = "minecraft:pig"; vehicleName = "Sepeda"; break; // Ganti dengan ID model sepeda kamu
            case 1: entityId = "minecraft:horse"; vehicleName = "Motor"; break; 
            case 2: entityId = "minecraft:minecart"; vehicleName = "Mobil"; break;
        }

        system.run(() => {
            const pos = player.location;
            const vehicle = player.dimension.spawnEntity(entityId, {
                x: pos.x + 1,
                y: pos.y,
                z: pos.z + 1
            });
            vehicle.nameTag = `§e${vehicleName} §fmilik §b${player.name}`;
            player.sendMessage(`§a${vehicleName} berhasil dimunculkan di dekatmu!`);
            player.playSound("random.screenshot");
        });
    });
}

// --- FITUR 3: BANK / WALLET ---
function showWallet(player) {
    const balance = getBalance(player);
    new MessageFormData()
        .title("BANK / WALLET")
        .body(`Informasi Akun:\n\nNama: ${player.name}\nSaldo: §e${balance} Credix\n\nTips: Gunakan Transfer untuk berbagi dengan teman!`)
        .button1("Tutup")
        .button2("Kembali")
        .show(player).then(res => {
            if (res.selection === 1) openEconomyMenu(player);
        });
}