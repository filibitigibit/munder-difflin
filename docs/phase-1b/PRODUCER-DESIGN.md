# Mission Control — Faz 1B: ÜRETİCİ TASARIM ÖLÇÜMLERİ

## 🔴 BU DOSYA ÖLÇÜM VE SEÇENEK KAYDIDIR, KARAR KAYDI DEĞİLDİR

Hiçbir satır bir tasarım seçimini **SÖYLEMEZ**. Seçim **CTO'nundur** ve ayrı
bir turda yapılır.

🔴 **Tasarıma bağlı hiçbir sayı bu dosyada ÖLÇÜM olarak yazılmaz** —
`ÖLÇÜLMEDİ (tasarıma bağlı)` olarak işaretlenir.

---

# M9 YARIŞ PENCERESİ

## 🔴 BU BÖLÜM OLGU KAYDIDIR

Hiçbir satır bir **ölçüm noktası SEÇİMİNİ** söylemez. Seçim CTO'nundur.

## TEMEL OLGULAR (bu turda doğrulandı)

**M13 ÜRETİCİSİ YOKTUR.** Beş alanın değeri bugün hiçbir yerde üretilmiyor
(T-13). Bu bölüm "alanın mevcut olduğu noktayı" aramaz; **o alanı ÖLÇEBİLMEK
için gereken girdilerin ve üretim önkoşullarının** mevcut olduğu noktayı arar.

**ÖLÇÜM ATOMİK DEĞİLDİR.** "Aday ölçüm noktası" bir **handoff** noktasıdır,
tek bir ölçüm anı değildir.

## 🔴 ÖLÇÜLEN SIRA, GÖREVİN VARSAYDIĞI SIRANIN TERSİDİR

| satır | olay |
|---|---|
| 2795 | `await isRepo(opts.cwd)` — izolasyon bloğu başı (**S1**) |
| 2808 | `await getBranch(origCwd)` (**S5**) |
| 2810 | `await addWorktree(...)` (**S6**) |
| 2812 | **`opts.cwd = wtPath`** — ölçülecek cwd BURADA değişir |
| 2813 | `worktreePaths.set(...)` — `git_worktree_path` KABUL (**S7**) |
| 2822 | izolasyon bloğu sonu |
| 2843 | `await hive.ensureAgent(...)` |
| 3083 | `await enableCodexRemoteForSpawn(...)` (koşullu) |
| **3085** | **`ptyManager.spawn(opts, owner)` — PTY SÜRECİ OLUŞUR** |
| 3086-3087 | `analytics.track(...)` (senkron, `void`) |
| **3089** | **`openRunForPty(...)` — görevin tarif ettiği ADAY HANDOFF** |

🔴 **`openRunForPty` (3089), `ptyManager.spawn` (3085)'ten SONRADIR — fark
+4 satır.** Dolayısıyla "handoff → PTY spawn" biçimindeki **PENCERE (i)
İLERİ YÖNDE MEVCUT DEĞİLDİR**. Aday handoff noktasında PTY süreci **ZATEN
OLUŞMUŞTUR** (`pty.spawn(file, spawnArgs, …)`, `src/main/pty.ts:644`).

**TERS PENCERE (3085 → 3089):** iki `analytics.track` çağrısı. `track()`
imzası `void` döner (`analytics.ts:243`), `ptyManager.spawn` çağrısında
`await` **yoktur** (ölçüldü). Yani bu pencere **senkron ve sıfır `await`**
taşır — ama ajan süreci bu süre boyunca **canlıdır**.

## BEŞ ALANIN ÖLÇÜM ÖNKOŞULLARI (aday noktada, 3088)

| alan | önkoşul | 3088'de mevcut mu | kanıt |
|---|---|---|---|
| `git_base_sha` | ölçülecek cwd sabit | **EVET** | `opts.cwd` son kez 2812'de atanır |
| `git_branch` | ölçülecek cwd sabit | **EVET** | aynı |
| `git_toplevel` | ölçülecek cwd sabit | **EVET** | aynı |
| `git_pty_cwd` | PTY'ye VERİLEN cwd | **EVET** | `opts.cwd`, 3085'te PTY'ye geçti |
| `git_worktree_path` | **üretim zinciri TAMAMLANMIŞ** olmalı (T-18: `join()` tek başına üretmez, `addWorktree` başarılı olmalı) | **EVET** | zincir 2813'te kapanır; okuma `worktreePaths.get` |

**Beş alanın beşinin de önkoşulu aday noktada karşılanıyor.** Sorun
önkoşullarda değil, **noktanın PTY spawn'dan SONRA olmasındadır**.

## İKİ EKSEN — DEĞER ve HEDEF KİMLİĞİ

🔴 **EKSEN A** (kaydedilecek string değeri değişir mi) ile **EKSEN B**
(değer aynı kalsa bile işaret ettiği repo/worktree kimliği veya git state'i
değişir mi) **AYRI SORULARDIR**. *"Path aynı → yarış yok"* sonucuna izin
yoktur.

Pencere: **2822 (izolasyon bloğu sonu) → 3085 (PTY spawn)** — bir
pre-spawn handoff'un oturabileceği en geç aralık.

| alan | EKSEN A (değer) | EKSEN B (hedef kimliği / state) |
|---|---|---|
| `git_base_sha` | **DEĞİŞMEZ** — `opts.cwd` 2812'den sonra yeniden atanmıyor (ölçüldü: `opts.cwd =` yalnız 2701 ve 2812) | 🔴 **ELENEMEDİ** — HEAD'in değişmesini engelleyen bir mekanizma bulunamadı |
| `git_branch` | **DEĞİŞMEZ** (aynı gerekçe) | 🔴 **ELENEMEDİ** — dal hedefi için aynı |
| `git_toplevel` | **DEĞİŞMEZ** | 🔴 **ELENEMEDİ** — worktree kaldırılıp yeniden oluşturulursa aynı yol farklı repo kimliğine işaret edebilir |
| `git_pty_cwd` | **DEĞİŞMEZ** | 🔴 **ELENEMEDİ** — dizinin işaret ettiği hedef için aynı |
| `git_worktree_path` | **DEĞİŞMEZ** — `worktreePaths`'e yazan tek yer 2813, silen tek yer 619 (teardown) | 🔴 **ELENEMEDİ** — aynı yolda farklı bir worktree oluşabilir |

**EKSEN A için elemeler ham kodla gösterildi. EKSEN B için hiçbir alan
elenemedi.**

## ARAYA GİREBİLECEK YOLLAR — SAYIM VE ELEME

| # | yol | eleme durumu | gerekçe (ham kod) |
|---|---|---|---|
| 1 | GC süpürgesi (`gcPreservedWorktrees`, 4910) bu ajanın worktree'sini kaldırır | **ELENDİ** | Yalnız `preservedWorktrees` üzerinde çalışır (4914); o map'e yazan tek yerler **677 ve 699**, ikisi de **teardown** yollarıdır. Yeni oluşturulmuş, canlı bir ajanın worktree'si orada **YOKTUR**. |
| 2 | GC, **aynı yola ait ESKİ** bir `preservedWorktrees` kaydını kaldırır | 🔴 **ELENEMEDİ** | GC'nin koruma şartı `liveWorkers.has(e.workerId)` (4917) — **worker kimliğine** bakar. Genel (worker olmayan) bir spawn'ın `liveWorkers`'ta bulunacağı **gösterilemedi**. `wtPath` id'den türetildiği için aynı yol aynı id demektir; eski bir kayıt bu pencerede silinebilir. Kodun kendi yorumu da bu boşluğu adıyla anıyor (2790-2794: *"reuse-existing-worktree handling here is the follow-up"*). |
| 3 | Eşzamanlı başka bir `spawnAgentCore` aynı repoda `git worktree add` çalıştırır | 🔴 **ELENEMEDİ** | `spawnAgentCore` `async`; 6 `await` noktasında (2746, 2795, 2808, 2810, 2843, 3083) araya girilebilir. Farklı id → farklı `wtPath`, ama **aynı `origCwd`** üzerinde git mutasyonu yapılır. Bunun bizim hedefimizi değiştirmediği **gösterilemedi**. |
| 4 | `teardownPty` (619/630) bu ajanın worktree'sini kaldırır | **ELENDİ** | Teardown yalnız PTY **çıkışında** tetiklenir; PTY 3085'ten önce mevcut değildir. 2822→3085 penceresinde bu ajan için çağrılamaz. |
| 5 | Kullanıcı/başka bir süreç repoda `git checkout` yapar | 🔴 **ELENEMEDİ** | Süreç dışı bir aktör; kod tarafından engellenmiyor. |

**SAYIM: 5 yol · 2 ELENDİ · 3 ELENEMEDİ.**

## VARILAN KANIT SEVİYESİ

**YARIŞ İMKANSIZLIĞI KANITLANAMADI.**

🔴 Bu, **"yarış mümkün" DEMEK DEĞİLDİR.** Hiçbir yol için değişikliğin
fiilen gerçekleştiği **gösterilmedi**; davranışsal bir ölçüm **yapılmadı**.
Ama üç yol da **elenemedi**.

**YÖNTEMİN SINIRI:** eleme yalnız `src/main/index.ts`, `pty.ts`, `git.ts`
üzerinde **kaynak okumasıyla** yapıldı. Hiçbir davranış koşturulmadı.
*"Bulunamadı"* ile *"yok"* ayrı şeylerdir; bu tablo birincisini kaydeder.

## M9 BU SEVİYE İÇİN NE DİYOR

M9'un tam metni (`CONTRACT.md:486-499`) **iki uç durumu** tarif eder:

> Yarış mümkün çıkarsa: run-start provenance o run'ın çalıştığı durumun
> provenance'ı olarak OKUNAMAZ; … run `provenance_complete=false` taşır …
>
> Yarış mümkün değilse: kanıtı, araya girebilecek yolların SAYILMASI ve
> her birinin ADIYLA elenmesidir. "Kod öyle görünüyor" bu kanıtı vermez.

🔴 **M9 BU ARA DURUMU AYRICA TANIMLAMIYOR / NORMATİF SONUÇ ÖLÇÜLMEDİ.**
"Yarış imkansızlığı kanıtlanamadı" hâli için M9'da açıkça yazılı bir
gereklilik **YOKTUR**. Hüküm icat edilmedi; bu bir **CTO tasarım
girdisi** olarak kaydedilir.

## ALTERNATİF NOKTALAR

🔴 **HİÇBİR NOKTA SEÇİLMEDİ.** Karar CTO'nundur.

| aday nokta | beş alanın önkoşulu | PTY spawn'a kadar `await` sayısı | not |
|---|---|---|---|
| **3088** (görevin tarifi) | **5/5 karşılanıyor** | — | 🔴 PTY **ZATEN AÇIK** (3085). Pencere ileri yönde yok. |
| **2822** (izolasyon bloğu sonu) | **5/5 karşılanıyor** — `opts.cwd` son hâlini 2812'de aldı, `worktreePaths` 2813'te doldu | **2** (`2843` hive.ensureAgent, `3083` enableCodexRemoteForSpawn — ikincisi koşullu) | PTY spawn'a **en yakın**, önkoşulların tamamının karşılandığı ölçülen nokta |
| **2795 öncesi** | ❌ — `opts.cwd` henüz worktree'ye çevrilmedi (2812), `git_worktree_path` üretilmedi (2813) | 6 | Ölçüm **orijinal repoyu** ölçerdi, worktree'yi değil |

**2822'den ERKEN, beş alanın önkoşulunun birlikte karşılandığı bir nokta
BULUNAMADI.** Eksik olan alanlar: `git_worktree_path` (2813'ten önce
üretilmemiş) ve diğer dördü için ölçülecek cwd (2812'den önce farklı).

## PENCERE (ii) — ALANLAR ARASI ZAMAN KAYMASI

🔴 **ÖLÇÜLMEDİ (producer tasarımına bağlı).**

Beş alanın **hangi sırayla**, kaç alt süreç ve kaç `await` ile ölçüleceği
bugün **TANIMSIZDIR** (üretici yok). Dolayısıyla ilk alan ölçümü ile son
alan ölçümü arasındaki pencere bu turda **ölçülemez**.

**YARATABİLECEĞİ SONUÇ:** kaydedilen provenance satırı **KENDİ İÇİNDE
farklı anlardan bilgi taşıyabilir** — örnek: `git_base_sha` t1'deki HEAD'i,
`git_branch` t2'deki dalı gösterir; ikisi arasında HEAD değişmişse satır
hiçbir tek ana karşılık gelmez.

🔴 **M9 ALANLAR ARASI KAYMAYI TANIMLAMIYOR — SÖZLEŞME SESSİZLİĞİ.**
M9'un metni tek bir "ölçüm anı"ndan söz eder (`CONTRACT.md:488-491`);
birden çok alanın farklı anlarda ölçülmesinden **hiç bahsetmez**. Bu
sessizlik bu turda **doldurulmadı**; hüküm icat edilmedi.
