import { world } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";

world.afterEvents.itemUse.subscribe((event) => {
  const { source: player, itemStack } = event;
  
  // Memastikan item yang digunakan adalah smartphone kita
  if (itemStack.typeId === "controlix:smartphone_1") {
    openSmartphoneUI(player);
  }
});
