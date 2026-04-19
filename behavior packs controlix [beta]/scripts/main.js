import { world } from "@minecraft/server";
import { openSmartphoneUI } from "./features/smartphone.js";

world.afterEvents.itemUse.subscribe((event) => {
  const { source: player, itemStack } = event;
  
  // Deteksi jika item adalah Smartphone
  if (itemStack.typeId === "controlix:smartphone_1") {
    openSmartphoneUI(player);
  } 
  // Deteksi jika item adalah Land Claim Tool
  else if (itemStack.typeId === "controlix:land_claim") {
    // Untuk sementara, kita berikan pesan percobaan
    player.sendMessage("Memulai proses klaim lahan...");
    
    // Nanti kita bisa memanggil fungsi khusus land claim di sini
  }
});
