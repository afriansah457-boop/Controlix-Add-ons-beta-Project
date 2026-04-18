import { world } from "@minecraft/server";

export function getCredix(player) {
    try {
        const obj = world.scoreboard.getObjective("credix");
        return obj.getScore(player) ?? 0;
    } catch { return 0; }
}

export function removeCredix(player, amount) {
    const obj = world.scoreboard.getObjective("credix");
    const current = getCredix(player);
    if (current >= amount) {
        obj.setScore(player, current - amount);
        return true;
    }
    return false;
}