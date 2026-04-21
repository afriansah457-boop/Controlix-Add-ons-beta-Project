import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";

const LAND_ITEM_ID = "controlix:land_claim";
const ECONOMY_SCORE = "Credix_v1";

// --- DATABASE HELPER ---
function getDaftarLahan() {
    const data = world.getDynamicProperty("data_lahan_server");
    if (typeof data === "string") {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return [];
}

function simpanDatabase(data) {
    const stringData = JSON.stringify(data);
    if (stringData.length > 32700) return "full";
    world.setDynamicProperty("data_lahan_server", stringData);
    return "ok";
}

// Check jika posisi di dalam koordinat lahan
function isInside(pos, t1, t2) {
    return (
        pos.x >= Math.min(t1.x, t2.x) && pos.x <= Math.max(t1.x, t2.x) &&
        pos.z >= Math.min(t1.z, t2.z) && pos.z <= Math.max(t1.z, t2.z)
    );
}

// --- 1. FITUR BELI LAHAN (Untuk Member) ---
function menuBeliLahan(player) {
    const semuaLahan = getDaftarLahan();
    const lahanTersedia = semuaLahan.filter(l => l.status === "Dijual");

    if (lahanTersedia.length === 0) {
        return player.sendMessage("§c[INFO] Saat ini tidak ada lahan yang dijual oleh admin.");
    }

    const form = new ActionFormData()
        .title("§lMARKET LAHAN")
        .body("Pilih lahan yang ingin kamu beli dengan Credix:");

    lahanTersedia.forEach(l => {
        form.button(`§l§1${l.nama}§r\n§2Harga: ${l.harga} Credix`);
    });

    form.show(player).then((res) => {
        if (res.canceled) return;

        const terpilih = lahanTersedia[res.selection];
        const skorObj = world.scoreboard.getObjective(ECONOMY_SCORE);
        const uangPlayer = skorObj ? skorObj.getScore(player) : 0;

        if (uangPlayer >= terpilih.harga) {
            const confirm = new MessageFormData()
                .title("Konfirmasi Pembelian")
                .body(`Beli lahan '${terpilih.nama}' seharga ${terpilih.harga} Credix?\n\n§8Lokasi: ${terpilih.koordinat.t1.x}, ${terpilih.koordinat.t1.z}`)
                .button1("§aBELI SEKARANG")
                .button2("BATAL");

            confirm.show(player).then((cRes) => {
                if (cRes.selection === 1) { // Tombol 1 adalah button1 (Beli)
                    // Potong Saldo
                    player.runCommandAsync(`scoreboard players remove @s ${ECONOMY_SCORE} ${terpilih.harga}`);
                    
                    // Update Database
                    const db = getDaftarLahan();
                    const idx = db.findIndex(l => l.timestamp === terpilih.timestamp);
                    if (idx !== -1) {
                        db[idx].pemilik = player.name;
                        db[idx].status = "Private";
                        simpanDatabase(db);
                    }

                    player.sendMessage(`§a§l[SUKSES]§r §fLahan '${terpilih.nama}' sekarang menjadi milikmu!`);
                    player.playSound("random.levelup");
                }
            });
        } else {
            player.sendMessage("§c[ERROR] Saldo Credix kamu tidak cukup!");
            player.playSound("note.bass");
        }
    });
}

// --- 2. LOGIKA PROTEKSI BUILD ---
world.beforeEvents.playerPlaceBlock.subscribe((event) => {
    handleBuildProtect(event);
});

world.beforeEvents.playerBreakBlock.subscribe((event) => {
    handleBuildProtect(event);
});

function handleBuildProtect(event) {
    const { player, block } = event;
    if (player.hasTag("admin")) return;

    const isPrivateWorld = world.getDynamicProperty("private_world");
    if (!isPrivateWorld) return;

    const db = getDaftarLahan();
    // Cari apakah player ini pemilik area di koordinat blok tersebut
    const punyaAkses = db.some(l => 
        l.pemilik === player.name && isInside(block.location, l.koordinat.t1, l.koordinat.t2)
    );

    if (!punyaAkses) {
        event.cancel = true;
        system.run(() => {
            player.sendMessage("§c§l[!]§r §cPrivate World Aktif. Hanya pemilik lahan yang bisa build di sini!");
        });
    }
}

// --- 3. MENU UTAMA ITEM (controlix:land_claim) ---
world.afterEvents.itemUse.subscribe((data) => {
    const { source: player, itemStack } = data;
    if (itemStack?.typeId !== LAND_ITEM_ID) return;

    const isAdmin = player.hasTag("admin");
    const menu = new ActionFormData()
        .title("§lLAND CLAIM SYSTEM")
        .button("§lBELI LAHAN\n§8Daftar lahan dari Admin", "textures/ui/cart_checked")
        .button("§lLAHAN SAYA\n§8Lihat koordinat lahanmu", "textures/ui/icon_recipe_nature");

    if (isAdmin) {
        menu.button("§lADMIN: BUAT LAHAN\n§8Daftarkan lahan baru", "textures/ui/color_plus");
    }

    menu.show(player).then((res) => {
        if (res.canceled) return;
        
        if (res.selection === 0) menuBeliLahan(player);
        if (res.selection === 1) {
            const milik = getDaftarLahan().filter(l => l.pemilik === player.name);
            if (milik.length === 0) return player.sendMessage("§cKamu belum memiliki lahan apapun.");
            let teks = "§eDaftar Lahanmu:\n";
            milik.forEach(l => teks += `§f- ${l.nama} (Private)\n`);
            player.sendMessage(teks);
        }
        if (res.selection === 2 && isAdmin) {
            // Logika Registrasi Lahan (panggil fungsi bukaMenuLahan kamu)
            player.sendMessage("§eSilahkan jalankan sistem koordinat titik 1 & 2 lalu panggil registrasi.");
        }
    });
});

// --- 4. FUNGSI REGISTRASI (Untuk dipanggil script koordinat kamu) ---
export function bukaMenuLahan(player, playerNames, titik1, titik2) {
    if (!titik1 || !titik2) return player.sendMessage("§cKoordinat belum di-set!");

    new ModalFormData()
        .title("§lADMIN: REGISTRASI LAHAN")
        .textField("Nama Lahan:", "Contoh: Mall Kota")
        .dropdown("Status:", ["Private", "Dijual"])
        .textField("Harga (Isi jika Dijual):", "1000")
        .show(player).then((res) => {
            if (res.canceled) return;
            const [nama, statusIdx, harga] = res.formValues;

            const data = {
                nama: nama || "Tanpa Nama",
                status: statusIdx === 0 ? "Private" : "Dijual",
                harga: Number(harga) || 0,
                pemilik: statusIdx === 0 ? player.name : "Admin",
                koordinat: { t1: titik1, t2: titik2 },
                timestamp: Date.now()
            };

            const db = getDaftarLahan();
            db.push(data);
            const status = simpanDatabase(db);

            if (status === "ok") {
                player.sendMessage(`§aBerhasil mendaftarkan lahan: §f${data.nama}`);
            } else {
                player.sendMessage("§cDatabase Penuh!");
            }
        });
}