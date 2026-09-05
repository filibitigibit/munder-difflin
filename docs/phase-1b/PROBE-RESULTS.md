# Mission Control — Faz 1B: SONDA SONUÇLARI (OLGU KAYDI)

## 🔴 BU DOSYA OLGU KAYDIDIR, KARAR KAYDI DEĞİLDİR

Buradaki **hiçbir satır** bir hücrenin GEÇERLİ veya GEÇERSİZ olduğunu
**SÖYLEMEZ**.

> "Şu operasyon şu çıktıyı verdi" ile "bu sebep bu alan için
> uygulanabilir" **AYRI HÜKÜMLERDİR.**

İkincisi **CTO kararı gerektirir ve bu dosyada YOKTUR.**

`not_applicable` "teknik olarak ölçülemez" demek DEĞİL, "bu kavram bu
bağlamda **UYGULANMAZ**" demektir — bu **NORMATİF** bir yargıdır. Örnek:
bare reponun HEAD'i **vardır** ama **çalışma ağacı yoktur**. Sonda olguyu
verir, hücreyi **sözleşme** doldurur.

🔴 **Bir olgunun bir hücreyi BESLEMESİ**, o alanın **GERÇEK ÖLÇÜM
OPERASYONU** üzerinde üretilmiş olmasına bağlıdır. Başka bir komutta aynı
hata sınıfını üretmek o hücreyi **BESLEMEZ**.

🔴 **"BU TURDA ÜRETİLEMEDİ" bir imkânsızlık hükmü DEĞİLDİR.** Yalnız bu
turda, bu yöntemle üretilemediğini gösterir.

🔴 **`git_worktree_path` için bu turda ALAN ÜRETİMİ ÖLÇÜLMEDİ.** Git'in
worktree kabiliyeti **ayrı bir olgudur** ve alan ölçümü **SAYILMAZ**.

---

## ALAN ÖLÇÜM OPERASYONLARI

| alan | gerçek ölçüm operasyonu |
|---|---|
| `git_base_sha` | `git rev-parse HEAD` |
| `git_branch` | `git rev-parse --abbrev-ref HEAD` |
| `git_toplevel` | `git rev-parse --show-toplevel` |
| `git_pty_cwd` | **cwd'nin kendisi — git ÇAĞRISI DEĞİLDİR** |
| `git_worktree_path` | **izolasyon yöneticisinin ürettiği yol — git ÇAĞRISI DEĞİLDİR** |

**Son ikisi git komutu DEĞİLDİR.** Git'in PATH'ten kaybolması veya bir git
komutunun timeout olması bu iki alanın ölçümünü **OTOMATİK OLARAK
BAŞARISIZ YAPMAZ.**

## YÜRÜTME YÜZEYİ

GRUP 4 ölçümleri, üretimin gözlenen yürütme yüzeyini birebir taklit eden
bir koşucuyla alındı (`src/main/git.ts:6-28`):

```
spawn('git', args, { cwd })      shell YOK
setTimeout(8000) -> proc.kill('SIGKILL')
```

## M11 KAPSAMI

Tüm fixture'lar `D:/mc-scratch/probe/` altındadır.

**SİSTEM ÇALIŞTIRILABİLİRİ BU KAPSAMIN İSTİSNASIDIR** ve bu kasıtlıdır:

```
where git   ->  C:\Program Files\Git\mingw64\bin\git.exe
                C:\Program Files\Git\cmd\git.exe
PATH'te çözümlenen  ->  /mingw64/bin/git
git version 2.52.0.windows.1
```

Config ve HOME izolasyonu (ortak `env.sh`):

```
HOME=USERPROFILE=D:/mc-scratch/probe/home   HOMEDRIVE=D:  HOMEPATH=/mc-scratch/probe/home
GIT_CONFIG_NOSYSTEM=1
GIT_CONFIG_GLOBAL=D:/mc-scratch/probe/home/.gitconfig
GIT_CONFIG_SYSTEM=D:/mc-scratch/probe/home/.gitconfig-system
GIT_ATTR_NOSYSTEM=1   GIT_TERMINAL_PROMPT=0   GIT_CEILING_DIRECTORIES=D:/mc-scratch
```

**HERMETİKLİK KANITI (yalnız yol değil, ÖRTÜK GİRDİ de):** boş bir dizinde
`git config --show-origin --list` **hiçbir satır** üretmedi; fixture'larda
tek kaynak reponun **kendi** `config`/`.git/config` dosyasıdır. Scratch
dışından (`file:C:/...`) **hiçbir** config kaynağı okunmadı — ölçüldü,
`grep -c '^file:[A-Z]:'` = **0**.

---

# BLOK 1 — BARE REPO

Fixture: `git init src` → boş commit → `git clone --bare` →
`D:/mc-scratch/probe/repos/bare.git`.
**En az bir commit taşır** (`git rev-list --count --all` = `1`,
`core.bare` = `true`). *Boş bare repo AYRI bir sınıftır ve bu blokta
ölçülmedi.*

| alan | operasyon | exit | stdout | stderr |
|---|---|---|---|---|
| `git_base_sha` | `rev-parse HEAD` | **0** | `cde01358d00acc10d22b9edfc309e71656dfae5b` | *(boş)* |
| `git_branch` | `rev-parse --abbrev-ref HEAD` | **0** | `main` | *(boş)* |
| `git_toplevel` | `rev-parse --show-toplevel` | **128** | *(boş)* | `fatal: this operation must be run in a work tree` |
| `git_pty_cwd` | cwd'nin kendisi | — | `D:/mc-scratch/probe/repos/bare.git` (dizin olarak VAR) | — |
| `git_worktree_path` | izolasyon yöneticisi | — | **ALAN ÜRETİMİ ÖLÇÜLMEDİ** | — |

**EK KABİLİYET OLGUSU** *(git'in kabiliyetidir; Mission Control'ün
`git_worktree_path` üretip üretmediğinin kanıtı DEĞİLDİR)*:
`git worktree add … main` → exit **0**, `HEAD is now at cde0135 probe seed`,
dizin oluştu.

**POZİTİF KONTROL** (normal, bare olmayan repo): üç operasyon da exit **0**;
`--show-toplevel` → `D:/mc-scratch/probe/repos/src`.
**FARK:** yalnız `git_toplevel` ayrışıyor (128 ↔ 0).

---

# BLOK 2 — SUBMODULE

Fixture: `super` (boş commit) + `submodule add ../src sub` + commit.
cwd = `D:/mc-scratch/probe/repos/super/sub`.

**`.git` DOSYA mı DİZİN mi:** **DOSYA** — içeriği `gitdir: ../.git/modules/sub`.

| alan | operasyon | exit | stdout | stderr |
|---|---|---|---|---|
| `git_base_sha` | `rev-parse HEAD` | **0** | `cde01358d00acc10d22b9edfc309e71656dfae5b` | *(boş)* |
| `git_branch` | `rev-parse --abbrev-ref HEAD` | **0** | `main` | *(boş)* |
| `git_toplevel` | `rev-parse --show-toplevel` | **0** | `D:/mc-scratch/probe/repos/super/sub` | *(boş)* |
| `git_pty_cwd` | cwd'nin kendisi | — | `D:/mc-scratch/probe/repos/super/sub` (dizin VAR) | — |
| `git_worktree_path` | izolasyon yöneticisi | — | **ALAN ÜRETİMİ ÖLÇÜLMEDİ** | — |

**EK KABİLİYET OLGUSU:** `git worktree add … HEAD` → exit **0**
(`Preparing worktree (detached HEAD cde0135)`).

**POZİTİF KONTROL** (superproject kökü): üç operasyon da exit **0**;
SHA `d462fdc2a34f5b61e53511850032af8d476bfd43`,
toplevel `D:/mc-scratch/probe/repos/super`.
**FARK:** submodule ile superproject **farklı SHA ve farklı toplevel**
veriyor; ikisinde de teknik bir başarısızlık **gözlenmedi**.

---

# BLOK 3 — İZOLASYONSUZ NORMAL REPO

Fixture: `D:/mc-scratch/probe/repos/noiso`, bir commit, **temiz ağaç**
(`git status --porcelain` = 0 satır). İzolasyon **YOK**.

| alan | operasyon | exit | stdout |
|---|---|---|---|
| `git_base_sha` | `rev-parse HEAD` | **0** | `8ade693f9e3a1dedd2aa2f59e24968bc63d02912` |
| `git_branch` | `rev-parse --abbrev-ref HEAD` | **0** | `main` |
| `git_toplevel` | `rev-parse --show-toplevel` | **0** | `D:/mc-scratch/probe/repos/noiso` |
| `git_pty_cwd` | cwd'nin kendisi | — | `D:/mc-scratch/probe/repos/noiso` (dizin VAR) |
| `git_worktree_path` | izolasyon yöneticisi | — | **İZOLASYON YAPILMADI** |

🔴 **"İZOLASYON YAPILMADI" ile "ALAN ÜRETİLMEDİ" AYRI ŞEYLERDİR.** Bu
blokta izolasyon yöneticisi hiç **ÇAĞRILMADI**, dolayısıyla üretecek bir
yol da yoktu. Bu satır birincisini kaydeder.

## 3c — BAĞIMSIZ ORACLE (`D:/munder-test-repo`, YALNIZ OKUMA)

Yazma yapılmadı: `git status --porcelain` öncesi **0**, sonrası **0** satır.

| alan | exit | stdout |
|---|---|---|
| `git_base_sha` | **0** | `4ca0f799487cadbb4f1043118f79a2816acecc5b` |
| `git_branch` | **0** | `master` |
| `git_toplevel` | **0** | `D:/munder-test-repo` |

**KARŞILAŞTIRMA:** iki ölçüm **aynı exit sınıfını** (0/0/0) ve **aynı çıktı
biçimini** (40-hex SHA · dal adı · mutlak yol) verdi. **Değerler farklıdır
ve farklı olmaları beklenir** — ayrı repolardır; karşılaştırılan şey
değerler değil, **operasyonların davranışıdır**.

---

# BLOK 4 — FAILED AİLESİ

## 4a — git_pty_cwd (BEŞ SEBEP)

Operasyon **git çağrısı DEĞİLDİR**; PTY katmanı bu turda
**ÇALIŞTIRILMADI** (fixture/producer kodu yasak).

| sebep | sonuç | denenen yöntem / gerekçe |
|---|---|---|
| `git-missing` | **BU TURDA ÜRETİLEMEDİ** | PATH yalnız node dizinine daraltıldı; aynı koşulda cwd okundu (`/d/mc-scratch/probe/repos/noiso`) — git'in yokluğu bu operasyonu etkilemedi |
| `command-nonzero` | **BU TURDA ÜRETİLEMEDİ** | bu operasyonda çalışan bir KOMUT yok |
| `timeout` | **BU TURDA ÜRETİLEMEDİ** | bu operasyonda alt süreç yok |
| `not-a-repo` | **BU TURDA ÜRETİLEMEDİ** | git deposu olmayan dizinde de cwd okundu |
| `unusable-output` | **BU TURDA ÜRETİLEMEDİ** | boş/ayrıştırılamaz bir cwd ancak PTY katmanınca üretilebilir; o katman çalıştırılmadı |

**KOMŞU OLGU — ALAN ÖLÇÜMÜ DEĞİLDİR:** `spawn`'a var olmayan bir `cwd`
verilince `ENOENT` / `spawn git ENOENT` / close `-4058`. Bu, **spawn'ın cwd
davranışıdır**, `git_pty_cwd` alanının ölçümü değildir.

## 4a — git_worktree_path (BEŞ SEBEP)

**Beş sebebin beşi için de: ALAN ÜRETİMİ ÖLÇÜLMEDİ.**
Gerekçe: izolasyon yöneticisi bu turda **ÇALIŞTIRILMADI** (DOKUNMA listesi).

## 4b — ÜÇ GİT OPERASYONU × BEŞ SEBEP (hepsi ÜRETİLDİ)

### not-a-repo — cwd `plaindir` (`.git` YOK)

| alan | exit | stdout | stderr |
|---|---|---|---|
| `git_base_sha` | **128** | *(boş)* | `fatal: not a git repository (or any of the parent directories): .git` |
| `git_branch` | **128** | *(boş)* | *(aynı)* |
| `git_toplevel` | **128** | *(boş)* | *(aynı)* |

### command-nonzero — commit'siz repo (`emptyrepo`)

| alan | exit | stdout | stderr |
|---|---|---|---|
| `git_base_sha` | **128** | `HEAD` | `fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.` |
| `git_branch` | **128** | `HEAD` | *(aynı)* |
| `git_toplevel` | **0** | `D:/mc-scratch/probe/repos/emptyrepo` | *(boş)* |

**OLGU:** `git_toplevel` bu koşulda **sıfır DIŞI dönmedi**. Aynı sınıf için
`git_toplevel`'da gözlenen sıfır-dışı çıkış **BLOK 1**'dedir (bare repo,
exit **128**).
**OLGU:** `rev-parse HEAD` bu koşulda **exit 128 ile birlikte boş OLMAYAN
stdout** (`HEAD`) üretti.

### git-missing — PATH'te git YOK

PATH yalnız `/c/Program Files/nodejs`; `command -v git` → exit **1**.
🔴 `.cmd` ile gölgeleme **DENENMEDİ** (ölçüldü: spawn `shell:true`
olmadan `.cmd` çözmez).

| alan | sonuç |
|---|---|
| `git_base_sha` | `error` olayı: `ENOENT` / `spawn git ENOENT` · `close`: exit **-4058**, stdout/stderr boş |
| `git_branch` | *(aynı)* |
| `git_toplevel` | *(aynı)* |

**OLGU:** bu koşulda `error` **VE** `close` olaylarının **İKİSİ DE** ateşlendi.

### timeout — 8000 ms → SIGKILL

Yöntem: `node.exe` → `git.exe` kopyası; cwd içinde `rev-parse` adlı bir
script sonsuza dek bloke oluyor (`Atomics.wait`). `NODE_OPTIONS`
**KULLANILMADI** — ilk denemede ebeveyn süreci de askıya aldığı için
yöntem değiştirildi.

| alan | exit | signal | süre |
|---|---|---|---|
| `git_base_sha` | **null** | **SIGKILL** | 9018 ms |
| `git_branch` | **null** | **SIGKILL** | 8028 ms |
| `git_toplevel` | **null** | **SIGKILL** | 8025 ms |

### unusable-output — exit 0 + boş çıktı

Yöntem: aynı `git.exe` shim; `rev-parse` scripti `process.exit(0)`.

| alan | exit | stdout | stderr |
|---|---|---|---|
| `git_base_sha` | **0** | *(boş)* | *(boş)* |
| `git_branch` | **0** | *(boş)* | *(boş)* |
| `git_toplevel` | **0** | *(boş)* | *(boş)* |

**EK OLGU (ayrıştırılamaz, boş OLMAYAN çıktı):** `rev-parse HEAD` →
exit **0**, stdout `not-a-sha`.

---

# ÖNCEDEN SINIFLANDIRILMIŞ ÜÇ HÜCRE — OLGU EKİ

Kararlar **DEĞİŞTİRİLMEDİ**; yalnız bu turda ölçülen olgu eklenmiştir.

| hücre | önceki karar (kaynak) | bu turda ölçülen olgu |
|---|---|---|
| `git_worktree_path` × `no-isolation` | GEÇERLİ (M3:103) | BLOK 3: izolasyon **YAPILMADI**; alan üretimi ölçülmedi |
| `git_toplevel` × `no-isolation` | GEÇERSİZ (P-03) | BLOK 3: `--show-toplevel` exit **0**, `D:/mc-scratch/probe/repos/noiso` |
| `git_pty_cwd` × `no-isolation` | GEÇERSİZ (P-03) | BLOK 3: cwd okundu, dizin olarak **VAR** |

---

# SAYIM (mekanik)

40 hücre = `not_applicable` 15 (3 sebep × 5 alan) + `failed` 25 (5 sebep × 5 alan).

| sonuç | hücre | dağılım |
|---|---|---|
| **BESLEYİCİ OLGU ÜRETİLDİ** | **27** | `not_applicable` 3 sebep × 4 alan = 12 · `failed` 5 sebep × 3 git alanı = 15 |
| **BU TURDA ÜRETİLEMEDİ** | **5** | `git_pty_cwd` × 5 `failed` sebebi |
| **ALAN ÜRETİMİ ÖLÇÜLMEDİ** | **8** | `git_worktree_path` × (3 `not_applicable` + 5 `failed`) |

**27 + 5 + 8 = 40.**

## GEREKÇE GRUPLARI

- **BU TURDA ÜRETİLEMEDİ (5):** hepsi tek sebepten — `git_pty_cwd`'nin
  operasyonu bir git çağrısı değildir, dolayısıyla git'e ait kusur
  sınıfları bu operasyonda kendiliğinden oluşmaz; boş/ayrıştırılamaz bir
  cwd ise PTY katmanını gerektirir.
- **ALAN ÜRETİMİ ÖLÇÜLMEDİ (8):** hepsi tek sebepten — izolasyon
  yöneticisi bu turda çalıştırılmadı.

🔴 **GATE 2'nin durumu bu turda DEĞİŞMEZ.** Hiçbir hücre dolduruldu,
hiçbir karar verildi. Bu dosya yalnız **olgu** üretir.

---

# T-18 — İZOLASYON YÖNETİCİSİ: `git_worktree_path` ÜRETİM ZİNCİRİ

## 🔴 BU BÖLÜM OLGU KAYDIDIR

Hiçbir satır bir hücrenin **GEÇERLİ** veya **GEÇERSİZ** olduğunu
**SÖYLEMEZ**. Normatif karar **AYRI bir turda CTO tarafından** verilir.

**ÖLÇÜM EKSENİ: BEŞ `failed` SINIFI.** Repo bağlamı (bare / submodule /
normal) eksen **DEĞİLDİR**; yalnız bir failure senaryosunu kurmak için
kullanıldığında **yardımcı fixture bağlamıdır**.

## ÜRETİM ZİNCİRİ (kod okunarak çıkarıldı, `src/main/index.ts:2795-2818`)

| adım | ne yapar | ZORUNLU? | git kusuruna açık? | üretim yüzeyinde? |
|---|---|---|---|---|
| **S1** `isRepo(opts.cwd)` — 2795 | `rev-parse --is-inside-work-tree`; `false` → izolasyon bloğu **hiç çalışmaz** | **EVET** | **EVET** | **EVET** |
| S2 `readConfig().harnessHome` + `join(…,'worktrees')` — 2798 | saf string | EVET | hayır | hayır |
| S3 slugify + `join(wtRoot, seg)` — 2803-04 | **alanın DEĞERİNİ hesaplayan adım** | EVET | hayır | hayır |
| S4 kaçış guard'ı — 2805 | escape → `else`'e girilmez | EVET | hayır | hayır |
| S5 `getBranch(origCwd)` — 2808 | başarısızlıkta `baseBranch='main'`e düşer | **HAYIR** (fallback) | evet | hayır (bloke etmez; S6'yı besler) |
| **S6** `addWorktree(origCwd, wtPath, baseBranch)` — 2810 | iki `runGit`; **ikisi de düşerse `wt.ok=false`** | **EVET** | **EVET** | **EVET** |
| S7 `worktreePaths.set(opts.id, wtPath)` — 2813 | değeri **KABUL/KAYIT** adımı | EVET | hayır | hayır |

**ÜRETİM YÜZEYİ (zorunlu ∩ git'e açık) = S1 + S6.**

🔴 **TEK ADIM MODELİ REDDEDİLDİ — koddan doğrulandı.** Yol string'i S3'te
hesaplanır, ama alan ancak **`wt.ok` doğruysa** kabul edilir: `opts.cwd` ve
`worktreePaths.set` **`if (wt.ok)` bloğunun İÇİNDEDİR** (2811-2813). Alanın
değeri dışarıya yalnız `worktreePaths.get(opts.id)` üzerinden verilir
(3092, 3101). Dolayısıyla **S6 zorunlu bir üretim adımıdır** ve git
kusurları alan üretimini **engeller**.

## ÖLÇÜM YÖNTEMİ VE SINIRI

`src/main/git.ts`'ten **GERÇEK** `isRepo` / `getBranch` / `addWorktree`
fonksiyonları `loadTs` ile yüklendi ve **değiştirilmeden** çağrıldı.

🔴 **KAPSAM SINIRI:** `src/main/index.ts`'in kapılama mantığı (2795-2818)
**OKUNDU, KOŞULMADI** — Electron uygulaması başlatılmadı. "ALAN ÜRETİLDİ
Mİ" satırı bu nedenle **KOD OKUMASINDAN TÜRETİLMİŞ** bir hükümdür
(`S1 && S6`), yürütülmüş bir gözlem **DEĞİLDİR**. `readConfig()` hiç
çağrılmadı; `wtPath` doğrudan scratch altından verildi.

## TABAN (POZİTİF KONTROL) — sağlıklı repo

```
S1 isRepo(cwd)      -> true    (36ms)
S5 getBranch(cwd)   -> {"current":"main","detached":false}  -> baseBranch=main
S6 addWorktree(...) -> {"ok":true}   (144ms)
ALAN URETILDI MI    -> true
```
Her failure koşumu bu tabandan **YALNIZ enjekte edilen kusur kadar**
farklıdır.

## BEŞ SINIF

### 1 · not-a-repo — **ÜRETİLDİ** (etkilenen adım: **S1**)
Yöntem: `cwd` = git deposu **olmayan** dizin (`…/repos/plaindir`).
```
S1 isRepo(cwd)      -> false   (31ms)
S5 getBranch(cwd)   -> {"error":"fatal: not a git repository (or any of the parent directories): .git"}
S6 addWorktree(...) -> {"ok":false,"error":"fatal: not a git repository (or any of the parent directories): .git"}
ALAN URETILDI MI    -> false
```
**NOT:** üretimde S1 `false` olduğunda blok hiç girilmez, yani S6 hiç
çağrılmaz. Sonda S6'yı yine de gözlem amaçlı çağırdı.

### 2 · command-nonzero — **ÜRETİLDİ** (etkilenen adım: **S6**)
Yöntem: hedef `wtPath` **zaten var** → her iki `git worktree add` de sıfır dışı.
```
S1 isRepo(cwd)      -> true    (28ms)
S5 getBranch(cwd)   -> {"current":"main","detached":false}  -> baseBranch=main
S6 addWorktree(...) -> {"ok":false,"error":"Preparing worktree (checking out 'main')\nfatal: 'D:/mc-scratch/t18/home/worktrees/agent-ok' already exists"}   (92ms)
ALAN URETILDI MI    -> false
```
**TEMİZ ATIF:** S1 geçti, yalnız S6 düştü.

### 3 · git-missing — **ÜRETİLDİ** (etkilenen adım: **S1 + S6**)
Yöntem: PATH yalnız node dizinine daraltıldı (`command -v git` → exit 1).
🔴 `.cmd` ile gölgeleme **DENENMEDİ** (ölçüldü: `spawn` `shell:true`
olmadan `.cmd` çözmez).
```
S1 isRepo(cwd)      -> false   (5ms)
S5 getBranch(cwd)   -> {"error":"spawn git ENOENT"}
S6 addWorktree(...) -> {"ok":false,"error":"spawn git ENOENT"}   (4ms)
ALAN URETILDI MI    -> false
```

### 4 · timeout — **ÜRETİLDİ** (etkilenen adım: **S1 + S6**)
Yöntem: `git.exe` = `node.exe` kopyası; cwd içinde `rev-parse` ve
`worktree` adlı scriptler `Atomics.wait` ile sonsuza dek bloke oluyor.
`runGit`'in kendi **8000 ms → SIGKILL**'i devreye giriyor (`git.ts:13-15`).
```
S1 isRepo(cwd)      -> false   (8022ms)
S5 getBranch(cwd)   -> {"error":"git exited null"}
S6 addWorktree(...) -> {"ok":false,"error":"git exited null"}   (16054ms — iki çağrı × 8s)
ALAN URETILDI MI    -> false     TOPLAM 32111ms
```
**OLGU:** hata metni `git exited null` — `command-nonzero` ile
**ayırt edilemez** (bkz. AYIRT EDİLEMEZLİK SINIRI).

### 5 · unusable-output — **ÜRETİLDİ** (etkilenen adım: **S1**)
Yöntem: aynı shim; `rev-parse` ve `worktree` scriptleri `process.exit(0)`
— exit 0, stdout **boş**.
```
S1 isRepo(cwd)      -> false   (1064ms)   ← stdout boş; isRepo `stdout.trim()==='true'` ister
S5 getBranch(cwd)   -> {"current":"","detached":false}   ← BOŞ STRING dal adı
S6 addWorktree(...) -> {"ok":true}    (77ms)   ← S6 stdout TÜKETMİYOR, exit 0 yeter
ALAN URETILDI MI    -> false
```
**OLGU — İKİ ADIM AYRIŞIYOR:** `unusable-output` **S1'i düşürür ama S6'yı
düşürmez**. Hücreyi besleyen şey S1'in zorunlu bir üretim adımı olmasıdır.
**KOMŞU OLGU:** `getBranch` exit 0 + boş çıktıyı **başarı** sayıp
`current: ""` döndürdü — boş string bir dal adı olarak dışarı sızdı. Bu
`git_branch` alanına aittir, `git_worktree_path`'e değil; alan ölçümü
**SAYILMAZ**.

## M11 ÖN KOŞULU

Tüm fixture'lar ve `wtRoot` **`D:/mc-scratch/t18/`** altındadır. Üretilen
tek worktree: `D:/mc-scratch/t18/home/worktrees/agent-ok` (taban koşumu).

**SİSTEM ÇALIŞTIRILABİLİRİ İSTİSNADIR** ve kasıtlıdır:
```
where git -> C:\Program Files\Git\mingw64\bin\git.exe
             C:\Program Files\Git\cmd\git.exe
PATH'te çözümlenen: /mingw64/bin/git   ·   git version 2.52.0.windows.1
```
Config/HOME izolasyonu: scratch dışı config kaynağı sayısı **0**
(`grep -c '^file:[A-Z]:'`). `HOME`/`USERPROFILE` scratch'e sabitlendi.

🔴 **CANLI HIVE'A YAZILMADI — doğrulandı:** ölçüm sonrası
`C:\Users\EMRAH\HarnessAgents\hive` durumu ` M log.jsonl` (+5/−0),
IS 0 tabanıyla **AYNI**; hive altında `worktrees` dizini
**OLUŞMADI** (`No such file or directory`).

## SAYIM

| sonuç | hücre |
|---|---|
| **BESLEYİCİ OLGU ÜRETİLDİ** | **5** |
| **BU TURDA ÜRETİLEMEDİ** | **0** |

Beş hücrenin beşi de: `git_worktree_path` × (`git-missing` ·
`command-nonzero` · `timeout` · `not-a-repo` · `unusable-output`).

🔴 **GATE 2 BU TURDA DEĞİŞMEZ** — hücreler doldurulmadı, karar verilmedi.
Bu bölüm yalnız **olgu** üretir.
