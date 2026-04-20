import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";

// --- KONFIGURASI ---
const SALARY_SCOREBOARD = "Credix_v1";

/**
 * MENU UTAMA KARIR
 */
export function openProgressMenu(player) {
  const menu = new ActionFormData()
    .title("§l§6KARIR & PROGRES")
    .body("Pantau perkembangan karakter kamu:")
    .button("§hJobs\n§8Pilih Pekerjaan", "textures/ui/icon_recipe_nature")
    .button("§hTasks\n§8Misi Aktif", "textures/ui/book_edit_default")
    .button("§hDaily Rewards\n§8Klaim Hadiah Harian", "textures/ui/gold_eye_prefix_clear")
    .button("§hLicenses\n§8Cek SIM & KTP", "textures/ui/pdp_vibration_glyph")
    .button("§hSettings\n§8Pengaturan HP", "textures/ui/settings_glyph_color")
    .button("§cKembali", "textures/ui/cancel");

  menu.show(player).then((result) => {
    if (result.canceled) return;

    system.run(() => {
      switch (result.selection) {
        case 0: openJobsMenu(player); break;
        case 1: openMissionsMenu(player); break;
        case 2: claimDailyReward(player); break;
        case 3: openLicenseMenu(player); break;
        case 4: openSettingsMenu(player); break;
        case 5:
          import("../smartphone.js").then(m => m.openSmartphoneUI(player));
          break;
      }
    });
  });
}

// --- 1. FITUR JOBS (GABUNGAN OFFICE & KURIR) ---
function openJobsMenu(player) {
  const currentJob = player.getDynamicProperty("job") || "Pengangguran";
  const isAdmin = player.hasTag("admin") || player.getDynamicProperty("role") === "admin";
  
  const jobMenu = new ActionFormData()
    .title("§l§ePUSAT PEKERJAAN")
    .body(`Pekerjaan saat ini: §e${currentJob}§f\n\nPilih tugas:`)
    .button("§9Kerja Kantor\n§8Matematika Campuran", "textures/ui/book_edit_default")
    .button("§6Kurir Paket\n§8Antar Barang (GPS)", "textures/ui/realms_slot_check")
    .button("Penambang (Miner)")
    .button("Penebang (Lumberjack)")
    .button("Petani (Farmer)");

  if (isAdmin) {
    jobMenu.button("§4[Admin] Tambah Lokasi Kurir");
  }

  jobMenu.button("§cBerhenti Bekerja");

  jobMenu.show(player).then((res) => {
    if (res.canceled) return openProgressMenu(player);
    
    const s = res.selection;
    if (s === 0) return openOfficeJob(player);
    if (s === 1) return startCourierMission(player);
    
    const standardJobs = ["Miner", "Lumberjack", "Farmer"];
    if (s >= 2 && s <= 4) {
        player.setDynamicProperty("job", standardJobs[s - 2]);
        player.sendMessage(`§aSukses! Kamu bekerja sebagai §e${standardJobs[s - 2]}§a.`);
        return;
    }

    // Jika admin tombol 5 adalah menu admin, tombol 6 berhenti.
    // Jika bukan admin tombol 5 adalah berhenti.
    if (isAdmin && s === 5) return openAdminCourierMenu(player);
    
    if (s === (isAdmin ? 6 : 5)) {
        player.setDynamicProperty("job", "Pengangguran");
        player.setDynamicProperty("target_kurir", undefined);
        player.sendMessage("§cKamu sekarang berhenti bekerja.");
    }
  });
}

// --- LOGIKA OFFICE (MATEMATIKA CAMPURAN) ---
function openOfficeJob(player) {
    const ops = ["+", "-", "×", "÷"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let n1, n2, result;
    const r = (max) => Math.floor(Math.random() * max);

    switch (op) {
        case "+": n1 = r(50); n2 = r(50); result = n1 + n2; break;
        case "-": n1 = r(100); n2 = r(n1); result = n1 - n2; break;
        case "×": n1 = r(12); n2 = r(10); result = n1 * n2; break;
        case "÷": n2 = r(10) + 1; result = r(10); n1 = n2 * result; break;
    }

    new ModalFormData()
        .title("§l§9OFFICE WORKER")
        .label(`§fSelesaikan laporan:\n\n§eBerapakah hasil dari §l${n1} ${op} ${n2}§r?`)
        .textField("Jawaban:", "Ketik angka...")
        .show(player).then((res) => {
            if (res.canceled) return openJobsMenu(player);
            if (parseInt(res.formValues[0]) === result) {
                player.sendMessage("§a[Office] Benar! §g+100 Credix.");
                pay(player, 100);
                system.runTimeout(() => openOfficeJob(player), 15);
            } else {
                player.sendMessage("§c[Office] Jawabanmu salah!, gagal mendapatkan gaji.");
                player.playSound("note.bass");
            }
        });
}

// --- LOGIKA KURIR & GPS ---
function getCourierDB() {
    const data = world.getDynamicProperty("db_kurir_lokasi");
    return data ? JSON.parse(data) : [{ nama: "Kantor Pusat", x: 0, y: 64, z: 0 }];
}

function startCourierMission(player) {
    const db = getCourierDB();
    const target = db[Math.floor(Math.random() * db.length)];
    player.setDynamicProperty("target_kurir", JSON.stringify(target));
    player.setDynamicProperty("job", "Kurir");
    player.sendMessage(`§6[Kurir]§f Paket diambil! Antarkan ke: §e${target.nama}§f.`);
}

function openAdminCourierMenu(player) {
    new ActionFormData()
        .title("§l§4COURIER ADMIN")
        .button("Tambah Lokasi (Posisi Kamu)")
        .button("Reset Database Lokasi")
        .show(player).then((res) => {
            if (res.canceled) return;
            if (res.selection === 0) {
                new ModalFormData().title("TAMBAH LOKASI").textField("Nama Lokasi:", "Contoh: Mall").show(player).then((f) => {
                    if (f.canceled) return;
                    const db = getCourierDB();
                    const p = player.location;
                    db.push({ nama: f.formValues[0], x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z) });
                    world.setDynamicProperty("db_kurir_lokasi", JSON.stringify(db));
                    player.sendMessage("§a[Sukses] Lokasi baru disimpan!");
                });
            } else if (res.selection === 1) {
                world.setDynamicProperty("db_kurir_lokasi", undefined);
                player.sendMessage("§cDatabase lokasi direset.");
            }
        });
}

// --- TICK SYSTEM UNTUK GPS KURIR ---
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const data = player.getDynamicProperty("target_kurir");
        if (!data) continue;
        
        const t = JSON.parse(data);
        const p = player.location;
        const dist = Math.sqrt((t.x - p.x)**2 + (t.z - p.z)**2);

        if (dist < 4) {
            player.setDynamicProperty("target_kurir", undefined);
            player.sendMessage(`§6[Kurir]§a Sampai di §e${t.nama}§a! §g+100 Credix.`);
            pay(player, 100);
            player.onScreenDisplay.setTitle("§aMISI SELESAI");
        } else {
            player.onScreenDisplay.setActionBar(`§eGPS: ${t.nama} §7| §fJarak: §b${Math.round(dist)}m`);
        }
    }
}, 10);

// --- FUNGSI PEMBAYARAN SCOREBOARD ---
function pay(player, amount) {
    player.runCommandAsync(`scoreboard players add @s ${SALARY_SCOREBOARD} ${amount}`);
    player.playSound("random.levelup");
}

// --- 2. FITUR MISSIONS ---
function openMissionsMenu(player) {
  new MessageFormData()
    .title("MISI AKTIF")
    .body("§e[!] Misi Utama:§f\nKumpulkan 64 Diamond untuk mendapatkan bonus $5000.\n\n§7Progres: Belum Selesai")
    .button1("Terima Hadiah")
    .button2("Kembali")
    .show(player).then(() => openProgressMenu(player));
}

// --- 3. FITUR DAILY REWARDS ---
function claimDailyReward(player) {
  const lastClaim = player.getDynamicProperty("last_claim") || 0;
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (now - lastClaim < oneDay) {
    const remaining = Math.ceil((oneDay - (now - lastClaim)) / (60 * 60 * 1000));
    player.sendMessage(`§cKamu sudah klaim hari ini! Tunggu §e${remaining} jam §clagi.`);
    return;
  }

  player.setDynamicProperty("last_claim", now);
  player.runCommandAsync("give @s iron_ingot 5");
  player.sendMessage("§a[Daily Reward] Kamu mendapatkan 5 Iron Ingot!");
  player.playSound("random.levelup");
}

// --- 4. FITUR LICENSES ---
function openLicenseMenu(player) {
  const job = player.getDynamicProperty("job") || "Warga Sipil";
  const level = player.level;
  
  new ActionFormData()
    .title("KARTU IDENTITAS (ID CARD)")
    .body(`§fNama: §b${player.name}\n§fPekerjaan: §e${job}\n§fLevel Karakter: §a${level}\n§fStatus SIM: §7AKTIF (Class A)`)
    .button("Tutup")
    .show(player).then(() => openProgressMenu(player));
}

// --- 5. FITUR SETTINGS ---
function openSettingsMenu(player) {
  new ModalFormData()
    .title("HP SETTINGS")
    .toggle("Notifikasi Pesan", true)
    .toggle("Mode Pesawat", false)
    .slider("Volume Ringtone", 0, 100, 10, 50)
    .show(player).then((res) => {
      if (res.canceled) return openProgressMenu(player);
      player.sendMessage("§aPengaturan HP disimpan!");
    });
}