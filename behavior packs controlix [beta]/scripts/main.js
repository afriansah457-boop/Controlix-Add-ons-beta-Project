import { world, system } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";
import { openAdminLogin } from "./features/admin.js";
import { openAdminPanel } from "./features/admin_panel.js"; // Import menu buatan temanmu
import { bukaMenuLahan } from "./features/land_claim.js";

// 1. Sensor obrolan sebelum terkirim (Untuk login admin rahasia)
world.beforeEvents.chatSend.subscribe((event) => {
  const { sender: player, message } = event;

  if (message === "!admin") {
    event.cancel = true;
    system.run(() => {
      openAdminLogin(player);
    });
  }
});

// 2. Sensor untuk item yang diklik di udara (Smartphone & Admin Panel)
world.afterEvents.itemUse.subscribe((event) => {
  const { source: player, itemStack } = event;
  
  if (itemStack.typeId === "controlix:smartphone_1") {
    openSmartphoneUI(player);
  } 
  // Bagian ini memanggil UI admin panel buatan temanmu
  else if (itemStack.typeId === "controlix:admin_console") { 
    const isUserAdmin = player.getDynamicProperty("role") === "admin";
    if (isUserAdmin) {
      openAdminPanel(player);
    } else {
      player.sendMessage("[ERROR] Kamu tidak memiliki akses admin.");
    }
  }
});

// 3. Sensor khusus untuk klik pada blok (Land Claim)
world.afterEvents.itemUseOn.subscribe((event) => {
  const { source: player, itemStack, block } = event;
  
  if (itemStack.typeId === "controlix:land_claim") {
    const isUserAdmin = player.getDynamicProperty("role") === "admin";
    
    if (!isUserAdmin) {
      player.sendMessage("[ERROR] Hanya Admin yang dapat menggunakan alat ini.");
      return;
    }

    const { x, y, z } = block.location;
    const titik1 = player.getDynamicProperty("titik_1");

    if (!titik1) {
      player.setDynamicProperty("titik_1", `${x},${y},${z}`);
      player.sendMessage(`[LAND CLAIM] Titik 1 disetel pada: ${x}, ${y}, ${z}`);
    } else {
      player.sendMessage(`[LAND CLAIM] Titik 2 disetel pada: ${x}, ${y}, ${z}`);
      
      const playerNames = world.getPlayers().map(p => p.name);
      if (playerNames.length === 0) playerNames.push(player.name);

      system.run(() => {
        bukaMenuLahan(player, playerNames, titik1, `${x},${y},${z}`);
      });
      
      player.setDynamicProperty("titik_1", undefined);
    }
  }
});
