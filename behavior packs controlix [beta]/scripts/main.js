import { world } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";
import { openAdminPanel } from "./features/admin_panel.js";

// 1. Sensor untuk klik di mana saja (Smartphone)
world.afterEvents.itemUse.subscribe((event) => {
  const { source: player, itemStack } = event;
  
  if (itemStack.typeId === "controlix:smartphone_1") {
    openSmartphoneUI(player);
  }
});

// 2. Sensor khusus untuk klik pada blok (Land Claim)
world.afterEvents.itemUseOn.subscribe((event) => {
  const { source: player, itemStack, block } = event;
  
  if (itemStack.typeId === "controlix:land_claim") {
    // Mengambil koordinat X, Y, Z dari blok yang diklik
    const { x, y, z } = block.location;
    
    player.sendMessage(`Kamu menargetkan blok di koordinat: ${x}, ${y}, ${z}`);
    
    // Logika klaim tanah akan kita taruh di sini nantinya
  }
});
