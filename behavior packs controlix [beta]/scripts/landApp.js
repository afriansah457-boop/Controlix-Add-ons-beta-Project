import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { getCredix, removeCredix } from "./economy.js";
import { world } from "@minecraft/server";

export function openLandClaimApp(player, backToHome) {
    const app = new ActionFormData()
        .title("§2Land Claim App")
        .body("Gunakan item khusus untuk menandai koordinat!")
        .button("Daily Rewards", "textures/items/key")
        .button("Info Koordinat Saat Ini", "textures/items/map_filled")
        .button("Claim Land", "textures/items/emerald")
        .button("My Lands", "textures/items/map_filled")
        .button("§cKembali", "");

    app.show(player).then((res) => {
        if (res.canceled || res.selection === 4) return backToHome(player);

        if (res.selection === 1) {
            const start = player.getDynamicProperty("claim_start");
            const end = player.getDynamicProperty("claim_end");
            player.sendMessage(`§7Start: ${start || "Belum diset"}\n§7End: ${end || "Belum diset"}`);
        }
        
        if (res.selection === 2) {
            handleClaim(player);
        }
    });
}

// Event untuk mendeteksi saat item khusus digunakan pada blok
world.beforeEvents.itemUseOn.subscribe((event) => {
    const { source: player, itemStack, block } = event;
    
    // Ganti ID ini dengan ID item buatan Anda di behavior pack
    if (itemStack.typeId === "chiki:land_tool") {
        const pos = block.location;
        const blockCoord = `${pos.x}, ${pos.y}, ${pos.z}`;
        
        // Gunakan sistem Sneak (Jongkok) untuk membedakan Start dan End
        if (player.isSneaking) {
            player.setDynamicProperty("claim_end", blockCoord);
            player.sendMessage(`§c[Land Tool] Titik AKHIR diset di: ${blockCoord}`);
        } else {
            player.setDynamicProperty("claim_start", blockCoord);
            player.sendMessage(`§a[Land Tool] Titik AWAL diset di: ${blockCoord}`);
        }
    }
});

function handleClaim(player) {
    const startStr = player.getDynamicProperty("claim_start");
    const endStr = player.getDynamicProperty("claim_end");

    if (!startStr || !endStr) {
        player.sendMessage("§cGunakan Land Tool untuk memilih 2 titik!");
        return;
    }

    const start = startStr.split(", ").map(Number);
    const end = endStr.split(", ").map(Number);

    const area = (Math.abs(start[0] - end[0]) + 1) * (Math.abs(start[2] - end[2]) + 1);
    const cost = area * 5;

    new MessageFormData()
        .title("Konfirmasi Klaim")
        .body(`Luas: ${area} blok\nBiaya: ${cost} Credix`)
        .button1("Konfirmasi Pembayaran")
        .button2("Batal")
        .show(player).then(res => {
            if (res.selection === 1) {
                if (removeCredix(player, cost)) {
                    player.sendMessage("§aSukses! Lahan ini sekarang milik Anda.");
                    // Di sini Anda bisa menambahkan logika penyimpanan koordinat permanen
                } else {
                    player.sendMessage("§cSaldo Credix tidak cukup!");
                }
            }
        });
}