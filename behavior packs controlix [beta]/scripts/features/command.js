import { world, system } from "@minecraft/server";

world.beforeEvents.chatSend.subscribe((event) => {
    const { sender: player, message } = event;
    
    // Check Status Admin/Owner
    const isStaff = player.hasTag("admin") || player.hasTag("owner");

    // 1. COMMAND: !addcredix <jumlah> <nama_pemain?>
    if (message.startsWith("!addcredix")) {
        event.cancel = true; // Sembunyikan pesan chat command

        if (!isStaff) {
            return system.run(() => player.sendMessage("§cMaaf, kamu tidak punya izin menggunakan command ini!"));
        }

        const args = message.split(" ");
        const amount = parseInt(args[1]);
        
        // Target adalah pemain yang disebut, atau diri sendiri jika tidak ada nama
        const targetName = args.slice(2).join(" ");
        let target = player;

        if (targetName) {
            target = world.getAllPlayers().find(p => p.name === targetName);
        }

        if (isNaN(amount)) {
            return system.run(() => player.sendMessage("§eFormat: §f!addcredix <jumlah> <nama_pemain?>"));
        }

        if (!target) {
            return system.run(() => player.sendMessage(`§cPemain dengan nama "${targetName}" tidak ditemukan.`));
        }

        system.run(() => {
            const objective = world.scoreboard.getObjective("Credix_v1");
            if (!objective) return player.sendMessage("§cScoreboard 'Credix_v1' tidak ditemukan!");
            
            const currentScore = objective.getScore(target) || 0;
            objective.setScore(target, currentScore + amount);
            
            player.sendMessage(`§aBerhasil menambahkan §e${amount} Credix §ake §b${target.name}`);
            target.sendMessage(`§aKamu menerima §e${amount} Credix §adari Admin.`);
        });
    }

    // 2. COMMAND: !tp <nama_target>
    if (message.startsWith("!tp")) {
        event.cancel = true;

        const args = message.split(" ");
        const targetName = args.slice(1).join(" ");

        if (!targetName) {
            return system.run(() => player.sendMessage("§eFormat: §f!tp <nama_pemain>"));
        }

        const target = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());

        if (!target) {
            return system.run(() => player.sendMessage(`§cPemain "${targetName}" tidak sedang online.`));
        }

        system.run(() => {
            // Logika Teleportasi
            player.teleport(target.location, {
                dimension: target.dimension,
                rotation: target.getRotation()
            });
            
            player.sendMessage(`§aTeleportasi ke §b${target.name} §aberhasil!`);
            player.playSound("mob.endermen.portal");
        });
    }
});