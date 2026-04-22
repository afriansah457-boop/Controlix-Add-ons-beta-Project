import { world, system } from "@minecraft/server";
import { ModalFormData, ActionFormData } from "@minecraft/server-ui";

/**
 * Membuka menu pembuatan rank (Khusus Admin)
 */
export function openCreateRankMenu(player) {
    const form = new ModalFormData()
        .title("§lBUAT RANK BARU")
        .textField("Nama Rank:", "Contoh: Citizen")
        .textField("Warna Rank (Kode Warna):", "Contoh: §a, §c, §e")
        .textField("Harga (Credix):", "Masukkan harga...", "100");

    form.show(player).then((res) => {
        if (res.canceled || !res.formValues) return;
        
        const [name, color, priceStr] = res.formValues;
        const price = parseInt(priceStr);

        if (!name || isNaN(price)) {
            player.sendMessage("§cInput tidak valid!");
            player.playSound("note.bass");
            return;
        }

        // Simpan ke database DynamicProperty
        let ranks = [];
        try {
            ranks = JSON.parse(world.getDynamicProperty("server_ranks") || "[]");
        } catch (e) { ranks = []; }

        ranks.push({ name, color, price });
        world.setDynamicProperty("server_ranks", JSON.stringify(ranks));

        player.sendMessage(`§aRank §l${color}${name}§r §aberhasil dibuat!`);
        player.playSound("random.levelup");
    }).catch(err => console.error(err));
}

/**
 * Membuka Toko Rank untuk pemain di Smartphone
 */
export function openBuyRankMenu(player) {
    let ranks = [];
    try {
        ranks = JSON.parse(world.getDynamicProperty("server_ranks") || "[]");
    } catch (e) { ranks = []; }

    if (ranks.length === 0) {
        return player.sendMessage("§cBelum ada rank yang dijual.");
    }

    const menu = new ActionFormData()
        .title("§l§eTOKO RANK")
        .body(`Saldo Anda: §e${player.getDynamicProperty("credix") || 0} Credix`);

    ranks.forEach(rank => {
        menu.button(`${rank.color}${rank.name}\n§8Harga: ${rank.price} Credix`);
    });

    menu.show(player).then((res) => {
        if (res.canceled) return;
        
        const selectedRank = ranks[res.selection];
        const balance = player.getDynamicProperty("credix") || 0;

        if (balance >= selectedRank.price) {
            player.setDynamicProperty("credix", balance - selectedRank.price);
            player.setDynamicProperty("player_rank", `${selectedRank.color}[${selectedRank.name}]`);
            player.sendMessage(`§aBerhasil membeli rank ${selectedRank.color}${selectedRank.name}!`);
            player.playSound("random.levelup");
        } else {
            player.sendMessage("§cSaldo Credix tidak cukup!");
            player.playSound("note.bass");
        }
    });
}