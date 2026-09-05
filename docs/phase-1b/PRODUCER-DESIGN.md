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

---

# YENİDEN ÖLÇÜM VE M6 KODLAMA

## 🔴 BU BÖLÜM OLGU KAYDIDIR

Hiçbir satır bir **temsil SEÇİMİNİ** söylemez. Seçim **CTO'nundur**.
🔴 Tasarıma bağlı hiçbir sayı bu bölümde **ÖLÇÜM olarak** yazılmaz.

## SORU 1 — EŞİT İKİNCİ SNAPSHOT NEYİ KANITLAR

Beş alan için ABA senaryoları scratch'te **gerçek git** ile koşuldu
(`D:/mc-scratch/aba/`, izole `HOME`/config).

| # | alan / eksen | t1 | ara işlem | t2 | eşit mi | ABA körlüğü |
|---|---|---|---|---|---|---|
| 1 | `git_base_sha` | `54a0b244…` | yeni commit → `d65d3185…` → `reset --hard` | `54a0b244…` | **EVET** | **MÜMKÜN** |
| 2A | `git_branch` — **eksen A** | `main` | `feat`'e geç → `main`'e dön | `main` | **EVET** | **MÜMKÜN** |
| 2B | `git_branch` — **eksen B** | `main` (→ `54a0b244…`) | `main` yeni commit'e ilerledi | `main` (→ `3e01dd36…`) | **EVET** | 🔴 **MÜMKÜN — ve daha ağır**: operasyon yalnız ADI döndürür, hedefi HİÇ göstermez |
| 3 | `git_toplevel` | `D:/mc-scratch/aba/r1` | repo silindi, aynı yola yeniden kuruldu | aynı | **EVET** | **MÜMKÜN** |
| 4 | `git_pty_cwd` | `…/aba/d1` | dizin silindi, aynı adla yeniden oluşturuldu | aynı | **EVET** | **MÜMKÜN** |
| 5 | `git_worktree_path` | `D:/mc-scratch/aba/wt-agent` | worktree kaldırıldı, AYNI YOLA yenisi (`agent/two`) kuruldu | aynı | **EVET** | **MÜMKÜN** |

**BEŞ ALANIN BEŞİNDE DE ABA KÖRLÜĞÜ MÜMKÜN.**

**İki eşit snapshot'ın KANITLAYAMADIĞI şey (alan alan):**
`git_base_sha` HEAD'in pencerede başka bir commit'e gidip dönmediğini ·
`git_branch` (A) dalın değişip dönmediğini, **(B) dalın işaret ettiği
commit'in değişmediğini** · `git_toplevel` reponun aynı repo olduğunu ·
`git_pty_cwd` dizinin aynı dizin olduğunu · `git_worktree_path` aynı yolda
aynı worktree'nin durduğunu.

## HEDEF KİMLİĞİ AYIRT EDİCİ ADAYLARI (ölçüldü)

| aday | alan | bugün ulaşılabilir mi | ham |
|---|---|---|---|
| `.git` **inode** | `git_toplevel` | **EVET** | `1688849861180530` → `1970324837891185` (değer aynıyken **değişti**) |
| dizin **inode** | `git_pty_cwd` | **EVET** | `2814749768023186` → `3096224744733842` |
| `.git` dosyası **inode** | `git_worktree_path` | **EVET** | `1688849861180581` → `1970324837891239` |
| `worktree list --porcelain` **branch** | `git_worktree_path` | **EVET** | `refs/heads/agent/one` → `refs/heads/agent/two` |
| **gitdir işaretçisi** (`.git` içeriği) | `git_worktree_path` | **EVET ama AYIRT ETMİYOR** | iki uçta da `gitdir: …/worktrees/wt-agent` — yönetim dizini adı yol tabanından türediği için **DEĞİŞMEDİ** |
| `rev-parse HEAD` (dalın hedefi) | `git_branch` eksen B | **EVET** | `54a0b244…` → `3e01dd36…` |
| HEAD **reflog** | `git_base_sha` | **BULUNAMADI** (bu turda sorgulanmadı) | — |

🔴 **gitdir işaretçisi bir ayırt edici DEĞİLDİR** — ölçüldü, aynı kaldı.

## YENİDEN ÖLÇÜMÜN KANIT GÜCÜ

- **Fark bulunursa:** o alanda pencerede bir değişim olduğu **PROVEN** olur
  → M9'un "yarış mümkün" ucu.
- **Fark bulunmazsa:** yarışsızlık **PROVEN OLMAZ**. Beş alanın beşinde de
  ABA körlüğü ölçülerek gösterildi.
- **ARA DURUM:** fark yok **ve** hedef-kimliği ayırt edicisi de
  ölçülmemişse, sonuç **"değişim gözlenmedi"**dir — *"değişim olmadı"*
  değil.

## SORU 2 — RACE SONUCU MEVCUT GRAMERDE TEMSİL EDİLEBİLİR Mİ

**M9/M6 ÇELİŞKİSİ — HAM KANIT** (üretim şeması scratch in-memory DB'ye
uygulandı; üretim şemasına dokunulmadı):

```
bes durum alani : measured · measured · measured · measured · measured
provenance_complete -> 1
```

M9 bu durumda run'ın `provenance_complete=false` taşımasını ister; **M6
mekanik olarak 1 üretir.** Çelişki ölçüldü.

**11 DURUMUN provenance_complete ETKİSİ (ölçüldü):**
`measured_detached`→1 · `not_applicable(no-isolation)`→1 ·
`never_measured`→0 · beş `failed(*)`→0 · `not_applicable(bare-repo)`→0 ·
`not_applicable(submodule)`→0.
*(`measured`'ı tek başına yazma denemesi bağlaşım trigger'ınca reddedildi —
bu trigger'ın doğru çalışmasıdır, bir kusur değil.)*

**MEVCUT 11 DURUMDAN HANGİSİ UYGUN — HER BİRİ ADIYLA:**

| durum | uygun mu | neden |
|---|---|---|
| `measured` | **HAYIR** | ölçüm başarılı oldu der; yarışta operasyon **başarılıydı**, sorun penceredir. Ayrıca pc=1 üretir |
| `measured_detached` | **HAYIR** | detached HEAD'e özgü, dal alanına özel; yarışla ilgisiz |
| `never_measured` | **HAYIR** | "ölçüm penceresi geçmişti, hiç denenmedi" der; yarışta ölçüm **DENENDİ** |
| `failed(git-missing)` … `failed(unusable-output)` (5) | **HAYIR** | beşi de ölçüm operasyonunun **teknik başarısızlığını** adlandırır; yarışta operasyon **sıfır döndü** |
| `not_applicable(no-isolation|bare-repo|submodule)` (3) | **HAYIR** | kavramın uygulanamazlığını der; yarış kavramı uygulanamaz **KILMAZ** |

🔴 **ON BİR DURUMUN HİÇBİRİ UYGUN DEĞİLDİR.** Hiçbiri "yakın sayılır"
diye seçilmedi.

## TEMSİL SEÇENEKLERİ (🔴 SEÇİM YAPILMADI)

| # | seçenek | (i) **BUGÜNKÜ TEMAS** — mekanik sayım | (ii) **DEĞİŞECEK/YENİ TEST** |
|---|---|---|---|
| **S1** | M5'e yeni bir `failed` sebebi (ör. `race-detected`) | **27** test M4 alfabesine/CHECK ifadesine temas ediyor | 🔴 **ÖLÇÜLMEDİ (tasarıma bağlı)** |
| **S2** | M6 türetme kuralına yeni bir girdi alanı | **10** test `provenance_complete` türetmesine temas ediyor | 🔴 **ÖLÇÜLMEDİ (tasarıma bağlı)** — yeni girdi alanının ne olduğu TASARLANMADI |
| **S3** | Ayrı bir sütun (race durumu) | **7** test şema/sütun muhasebesine temas ediyor | 🔴 **ÖLÇÜLMEDİ (tasarıma bağlı)** — sütunun tipi/semantiği/enforcement'ı BİLİNMİYOR |
| **S4** | Olay defterine kayıt, şema değişmez | **14** test olay defterine temas ediyor | 🔴 **ÖLÇÜLMEDİ (tasarıma bağlı)** — olay şekli ve tüketici ilişkisi BİLİNMİYOR |

🔴 **"TEMAS EDEN" ile "DEĞİŞECEK" AYNI ŞEY DEĞİLDİR** ve bu tabloda
eşitlenmemiştir. Temas sayıları **bugünkü mekanizmaya dokunan** testlerdir.

*(Ölçüm notu: ilk sayımda `/CHECK/i` deseni `checkpoint` içindeki `check`'i
yakalayıp S1'i 47 gösterdi — substring tuzağı. Sınır-duyarlı desenle
yeniden ölçüldü: **27**.)*

**S5 — başka bir yol:** bu turda **BULUNAMADI**. (Aranan yer: mevcut 11
durum + M6 girdi kümesi + şema + olay defteri. "Yok" DENMEZ.)

## KAYIPSIZLIK

| seçenek | race olduğu bilinir mi | HANGİ ALANDA olduğu korunur mu |
|---|---|---|
| **S1** (alan başına durum) | evet | **KORUNUR** — durum alan başına yazılır; tasarımdan bağımsız çıkarılabilir |
| **S2** | 🔴 **ÖLÇÜLMEDİ** — yeni girdi alanının alan başına mı run başına mı olduğu tasarıma bağlı |
| **S3** | 🔴 **ÖLÇÜLMEDİ** — sütunun granülaritesi tasarıma bağlı |
| **S4** | 🔴 **ÖLÇÜLMEDİ** — olayın şekli tasarıma bağlı. **Ek sınır:** olay defteri `provenance_complete`'i **BESLEMEZ** (M6 yalnız beş durum alanından türetir, ölçüldü), yani şema değişmezse M6 yine 1 üretir |

## INTRA-MEASUREMENT SKEW İLE İLİŞKİ

🔴 **YENİ HÜKÜM KURULMADI — mevcut borcun (T-21) bu soruya etkisi
adlandırılıyor.**

İkinci ölçüm de **atomik olmayacaktır**: beş alan yine sırayla ölçülür.
Sonuç: `t1` ve `t2` birer **an** değil, birer **aralıktır**. Bir alanın t1
ölçümü ile t2 ölçümü arasındaki pencere, diğer alanınkiyle **aynı değildir**.

Bunun yeniden ölçümün kanıt gücüne etkisi: "beş alan da t1'de ve t2'de
aynı" ifadesi, **beş ayrı ve kısmen örtüşmeyen pencerede** ayrı ayrı
değişim gözlenmediği anlamına gelir — tek bir ortak pencerede değil.
**ÖLÇÜLMEDİ (producer tasarımına bağlı):** bu pencerelerin genişliği ve
örtüşmesi.
