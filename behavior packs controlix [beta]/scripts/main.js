import { world, system } from "@minecraft/server";
import { openSmartphone } from "./smartphone.js";

world.beforeEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;

    // Item untuk membuka smartphone
    if (itemStack.typeId === "chiki:smartphone") {
        system.run(() => openSmartphone(player));
    }
});