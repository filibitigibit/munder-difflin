# Mission Control — Faz 1B: DEFTER (LEDGER)

## OTORİTE SINIRI

**Bu defter KARAR OTORİTESİ DEĞİLDİR.**

`CONTRACT.md` normatif sözleşmedir. `TEST-PLAN.md` doğrulama planıdır.
LEDGER yalnız şunu kaydeder: ne oldu, hangi hüküm verildi, hangi borç
açık, ne zaman yeniden bakılacak.

**Bir çelişki çıkarsa SÖZLEŞME KAZANIR, LEDGER kayıt tutar.**

Bu defter Faz 10'daki ilgili saklama biriminin yerine GEÇMEZ ve o adı
KULLANMAZ.

## TARİHÇE SINIRI

**Bu defterin ilk kaydı GERİYE DÖNÜK YENİDEN İNŞADIR.**

Kanıtlanabilen geçmiş kaydedilir. Doğrulanamayan her bileşen
`ÖLÇÜLEMEDİ / reconstruction` damgası taşır ve **bu turda üretilmiş bir
ölçüm SAYILMAZ.**

Kaynak etiketleri:
- **git** — bu depodan (veya hive deposundan) komutla doğrulandı.
- **repo** — çalışma ağacındaki belgelerden komutla doğrulandı.
- **reconstruction** — yalnız sohbet kaydından; bu turda ölçülmedi.

---

# BÖLÜM 1 — DENETİM SAYACI

## 1.1 Sayaç bileşenleri

| bileşen | değer | KAYNAK |
|---|---|---|
| GPT KIRMIZI toplam | **ÖLÇÜLEMEDİ** | — |
| kabul edilen | **ÖLÇÜLEMEDİ** | — |
| indirilen | **≥ 1** (M6 enforcement — bkz. BÖLÜM 2) | reconstruction |
| CTO'nun yükselttiği SARI | **ÖLÇÜLEMEDİ** | — |
| borca alınan SARI | **ÖLÇÜLEMEDİ** | — |
| rol-yetki ihlali *(ayrı kova)* | **≥ 1** (canlı hive yazımı) | git + reconstruction |
| implementer'ın kendi kusurunu bildirdiği olay *(ayrı kova)* | v3.9 turunda **6**; turlar arası toplam **ÖLÇÜLEMEDİ** | reconstruction |

**Hiçbir toplam git'ten doğrulanamadı.** Denetim olayları yirmi tur
boyunca yalnız sohbette yaşadı; depoda iz bırakmadılar. Bu defterin
kuruluş sebebi budur.

## 1.2 Git'ten DOĞRULANAN geçmiş

| olgu | değer | KAYNAK |
|---|---|---|
| `docs/phase-1b/` commit sayısı | **11** | git |
| sözleşme madde sayısı seyri | 8 → 12 (v2) → **14** (v3.5) | git |
| vaka sayısı seyri | 80 → 99 (v2) → **107** (v3) | git |
| `GATE BAGIMLILIGI` taşıyan vaka | 0 (v3.8'e dek) → 3 (v3.9) → 4 (LEDGER turu) → **5** | git |
| commit üretmeyen sürüm | **v3.7 yok** (v3.6 → v3.8) | git |

**TUR SAYISI GİT'TEN ÖLÇÜLEMEZ.** Commit üretmeyen turlar depoda iz
bırakmaz; "kaç tur" sorusu commit sayısıyla CEVAPLANAMAZ.

## 1.3 Bilinen rol-yetki ihlali

**RY-1 · Canlı hive'a yazma.** Bir ölçüm turunda Electron
`--user-data-dir` ile başlatıldı ama `config.json` tohumlanmadı;
`harnessHome` varsayılana düştü ve uygulama **canlı**
`C:\Users\EMRAH\HarnessAgents\hive` içine yazdı.

- Ağaçta bugün duran iz: `log.jsonl` **+5 / −0 satır** — KAYNAK: git
  (`git -C <hive> diff --numstat`).
- `agents/god/identity.md` ve `registry.json` turlar arasında başka
  biri tarafından geri alındı — KAYNAK: reconstruction.
- Hiçbir commit hive'a düşmedi — KAYNAK: reconstruction.
- **Geri alınmadı.** `log.jsonl`'ın +5 satırı bugünkü hive TABANIDIR.

## 🔴 SAYAÇ HÜKÜM SINIRI

**Kabul oranı PRECISION DEĞİLDİR.**

"Denetim kaç hatayı önledi" **KARŞIT-OLGUSAL** bir metriktir ve
**GÖZLEMLENEMEZ** — bir kusur koşumdan önce düzeltildiyse,
düzeltilmemiş hâlinin ne yapacağı ölçülemez.

Bu defter yalnız **GÖZLEMLENEBİLEN** olayları sayar. Yeterli
örneklemeye ulaşmadan **"GPT %X hata önlüyor"** gibi bir hüküm
**KURULMAZ.**

---

# BÖLÜM 2 — İNDİRİLEN KIRMIZI KAYDI

Anayasa madde 12 gereği tutulur.

## IK-1 · M6 enforcement

| alan | içerik |
|---|---|
| kusur kimliği | M6 enforcement — `provenance_complete=false` taşıyan run'dan PROVEN hüküm kurulmasının engellenmemesi |
| GPT'nin sınıfı | **KIRMIZI** |
| GPT'nin gerekçesi | "judgment sınırı tanımlı ama enforce edilmiyor" |
| CTO'nun indirme sebebi | "faz sınırı, ölçüm kusuru değil; bayrak okunabilir, sessizlik yok" |
| yeni sınıf | **SARI** |
| sayaca etkisi | `indirilen` +1; `KIRMIZI kabul edilen` sayısına GİRMEZ |
| tetikleyici | Measurement Layer fazının ilk promptu |
| KAYNAK | reconstruction |

Sözleşmedeki karşılığı repo'dan doğrulandı: `CONTRACT.md` MEASUREMENT
LAYER GEREKSİNİMİ bölümü ve "Measurement Layer ... HENÜZ YOKTUR"
ifadesi (KAYNAK: repo).

## 🔴 KARŞIT-OLGUSAL SINIR

Bu indirmenin **doğru olup olmadığı GÖZLEMLENMEDİ.**

Tetiklenmediyse kurulabilecek tek hüküm **"bu koşumda tarif edilen
hata GERÇEKLEŞMEDİ"**dir — **"indirme doğruydu" DEĞİL.**

---

# BÖLÜM 3 — TETİKLEYİCİ VE VADE DEFTERİ

Her kalemin bugünkü durumu bu turda repo kanıtından doğrulandı.
Değerler: `AÇIK` · `KAPALI` · `ÖLÇÜLEMEDİ-RECONSTRUCTION`.

| # | kalem | kapatma şartı | gate | vadesi geldiği olay | BUGÜNKÜ DURUM | KAYNAK |
|---|---|---|---|---|---|---|
| T-1 | 37 hücre sebep-alan eşlemesi | 55 hücrenin tanımlanması | GATE 2 | fixture/producer dilimine geçiş | **AÇIK** (`TANIMSIZ — 37 hücre`; 12 + 25) | repo |
| T-2 | Measurement Layer enforcement | okuma tarafının mekanik kısıtlanması | Faz sonrası | Measurement Layer fazının ilk promptu | **AÇIK** ("HENÜZ YOKTUR" ×3) | repo |
| T-3 | okuma semantiği (legacy vs M13) | tüketicinin hangi sütunu hangi hükümde kullanacağı | Faz sonrası | Measurement Layer | **AÇIK** (`AÇIK BORÇ — OKUMA SEMANTİĞİ`) | repo |
| T-4 | `checkpoint_dirty_state` kopyalaması | kopyalanıp kopyalanmayacağının kararı | GATE 3 | checkpoint yazma yolu kodlanırken | **AÇIK** (`KARARA BAĞLANMAMIŞ`) | repo |
| T-5 | "tüketim" tanımı | hangi olayın kaydedileceğinin tanımı | Faz sonrası | Measurement Layer | **AÇIK** (`TANIMLI DEĞİLDİR`) | repo |
| T-6 | C-08 enforcement katmanı | reddi uygulayacak yüzeyin adıyla belirlenmesi | **GATE 3** | C-08 koşulmadan önce | **AÇIK** — tetikleyici bu turda vakaya YAZILDI | repo |
| T-7 | U-05 boş çıktı eşlemesi | "boş çıktı = meşru yok / unusable" kararı | GATE 2 | fixture dilimi | **AÇIK** (`bu eşleme TANIMSIZDIR`) | repo |
| T-8 | denetlenmemiş bağ | madde çiftlerinin denetlenmesi | hiçbiri (görünürlük metriği) | her tur raporlanır | **AÇIK — 80/91** (11 denetlenmiş) | repo |
| T-9 | hive `log.jsonl` +5 satırı | sahibin kararı (geri al / kabul et) | hiçbiri | sahip karar verdiğinde | **AÇIK** (+5 / −0) | git |
| T-10 | C-03 enforcement katmanı — `checkpoint_sha_source` reddi | reddi uygulayacak yüzeyin adıyla belirlenmesi | **GATE 3** | C-03 koşulmadan önce | **AÇIK** — tetikleyici bu turda vakaya YAZILDI | repo |
| T-11 | `provenance_complete` sürdürme mekanizması — generated column mu, trigger mı, uygulama katmanı mı | mekanizmanın ADIYLA seçilmesi | **GATE 1 (yeni engel)** | DİLİM 1 göçü yazılmadan ÖNCE | **AÇIK** — bu turda ölçüldü; 17 vakanın hiçbiri mekanizma adı taşımıyor | repo |

**T-8 İKİYE AYRILIR:** bağ borcunun kendisi **AÇIK** (80/91); bu borcu
YANLIŞ ÖLÇEN aracın kusuru **KAPALI** (bkz. BÖLÜM 4, A-1).

**Hiçbir kalem KAPALI çıkmadı.** ON BİR kalemin on biri de repo
kanıtıyla açık doğrulandı; hiçbiri "otomatik açık" sayılmadı.

🔴 **T-11 DİĞERLERİNDEN FARKLIDIR:** bir DİLİM 1 YAPISINI (şema göçü,
12 sütun) belirsiz bırakır. Diğer on kalem DİLİM 1 kodunu yazmayı
engellemez; T-11 ENGELLER.

**KAPSAYICI ŞARTA DAYANAN KALEMLER (TEST-PLAN kayıt disiplini gereği
ADIYLA):** T-4 (`checkpoint_dirty_state`), T-6 (C-08), T-10 (C-03) —
üçü de GATE 3'ün "tüm belirsizlikler kapalı" kapsayıcı şartına
bağlıdır ve bu defterde ADIYLA sayılır.

---

## SAHİP GEREKSİNİMLERİ (owner requirement — roadmap kaydı)

**Bunlar BUGÜN KODLANMAYACAK.** Kaydedilme sebebi: sohbette kalmasın ve
ilgili faz geldiğinde unutulmasın. Durum: **NOT IMPLEMENTED.**

Bu kalemler Faz 1B'nin gate'lerine DAHİL DEĞİLDİR ve hiçbir Faz 1B
gate'ini etkilemez.

### OR-1 · KARAR KAYDI VE ONAY POLİTİKASI

**Durum: NOT IMPLEMENTED. Vade: Mobile Control Plane + Risk Router.**

Sahip her ajan için ayrı karar VERMEYECEK. Bir karar **BİR KEZ** verilir
ve ortak karar kaydına bağlanır; sistem onu ilgili tüm ajanlara uygular.

**İşin kalbi telefon DEĞİLDİR**: karar kaydı (decision registry), onay
politikası (approval policy) ve yeniden açma tetikleyicisi.

Seçilebilir özerklik seviyeleri:
`MANUAL` · `GUARDED AUTO` · `AUTO WITH LIMITS` · `FREEZE/STOP`

Karar sınıfı bazında politika:

| karar sınıfı | politika |
|---|---|
| yerel ve geri alınabilir iş | auto seçilebilir |
| docs / test | auto seçilebilir |
| mimari veya sözleşme değişikliği | sahip onayı |
| production deploy | politikaya bağlı onay |
| yıkıcı / veri kaybı / güvenlik / secret işlemleri | **sahip onayı ZORUNLU** |
| daha önce verilmiş karar | yeni karşı kanıt yoksa **TEKRAR SORULMAZ** |

### OR-2 · VPS DEPLOY VE KANIT KONTROLÜ

**Durum: NOT IMPLEMENTED. Vade: CI/VPS Evidence + Mobile Control Plane
entegrasyonu.**

**Telefon PRODUCTION SHELL DEĞİLDİR**; onay/kontrol düzlemidir.

Deploy, Execution Plane tarafından çalıştırılır ve **en az** şu kanıtı
üretir:

- commit SHA
- build/image kimliği
- hedef VPS
- migration durumu
- health check
- smoke test
- rollback noktası
- onay/politika kimliği
- nihai deploy durumu

**Telefondan VPS'e doğrudan SSH YOK.**

### OR-3 · PROJE BAĞIMSIZLIĞI

**Durum: NOT IMPLEMENTED. Faz 1B gate'lerine DAHİL DEĞİLDİR.**
**Vade: Project Context sınırının fiilen ihtiyaç duyulduğu ilk faz —
en geç Context Compiler.**

Mission Control **HİÇBİR ZAMAN** Komşu'ya özel tasarlanmayacaktır.
Komşu **ilk production proje ve ilk doğrulama sahasıdır** — ürünün
kendisi DEĞİLDİR.

| katman | içerik |
|---|---|
| **CORE** (proje bağımsız) | orchestration · telemetry · evidence modeli · audit · decision registry · approval policy · memory sınıfları · deployment runner · Control Plane |
| **PROJECT CONTEXT** (projeye özel, core'a **GÖMÜLMEZ**) | anayasa · hafıza · policy · repo yolları · CI/CD · deploy hedefleri · teknoloji seçimleri · test politikaları · secret referansları |

Her proje **KENDİ** hafızasına sahiptir. Bir projenin mimari kararı
başka projeye **SIZMAZ**. Mission Control'ün kendi sistem hafızası
proje hafızalarından **AYRIDIR**. Yeni projeler aynı Mission Control
örneğine eklenebilmelidir.

🔴 **GEREKÇE — NEDEN ŞİMDİ:** bu sınır geç fark edilirse Komşu'ya özel
yollar, kurallar ve varsayımlar core'a kök salar ve sökülmesi ayrı bir
proje hâline gelir. **Karar bugün bedava, yarın pahalı.**

🔴 **BUGÜNKÜ KAPSAM SINIRI:** Faz 1B'nin şema, göç ve ölçüm yolu
Munder'in mevcut `runs` tablosu üzerinde çalışıyor ve o tablo proje
bağımsızdır. Bu gereksinim, Faz 1B'de yazılacak hiçbir şeyi **BUGÜN
DEĞİŞTİRMEZ**. Ama ilerideki her katman için bir kabul ölçütüdür:
**"bu kod proje adını biliyor mu?"**

---

# BÖLÜM 4 — DÜZELTİLEN ÖLÇÜM ARAÇLARI

Aracın KENDİSİ yanlış çıktığı olaylar.

| # | araç kusuru | bugünkü durum | KAYNAK |
|---|---|---|---|
| A-1 | metrik paydası **66**'da donmuş — 12 madde varken hesaplandı, madde 14 oldu; doğrusu **80/91** | **DÜZELTİLDİ** (v3.9, `389ec677`) | git |
| A-2 | `namescan2.cjs` paydası **12**'de donmuş (madde 14) | **AÇIK** — bu turda bulundu | repo |
| A-3 | `count.sh` CRLF/regex kusuru | **KUSUR YOK** — 0 adet son-çapalı desen; 107 sayımı bağımsız araçla doğrulandı | repo |
| A-4 | sınıflandırıcı desen eksiği — başlık atfı bir satır kayıyor (G-16 yanlış pozitifi) | **AÇIK** | repo |
| A-5 | EXIT kodu ölçümünde araya giren `echo` | **DÜZELTİLDİ** — duran kural | reconstruction |
| A-6 | DURUM satırının ölçümden ÖNCE yazılması | **DÜZELTİLDİ** (v3.9'da satır ölçülen tabloyla değiştirildi); kural depoda YAZILI DEĞİL | git + repo |
| A-7 | Git Bash `grep` ile CR sayımı — CR satır sonu sayılıp yutuluyor, CRLF dosyada 0 veriyor | **AÇIK** — bu turda bulundu | repo |

**A-1 KAPSAMI (git ile ölçüldü):** `66` paydası **v3.3**'te girdi ve o
gün DOĞRUYDU (madde 12). **v3.5**'te madde 14 oldu ve payda bayatladı.
Bayat paydayı taşıyan commit sayısı: **3** (`4c2d1267` v3.5,
`69a857f8` v3.6, `ed31d6e3` v3.8).

> **DÜZELTME — "altı tur yanlış raporlandı" ifadesi git'ten
> DOĞRULANMADI.** Git yalnız **3 commit** gösterir. Commit üretmeyen
> turlar depoda görünmediği için TUR sayısı **ÖLÇÜLEMEZ**. Bu satır
> tur sayısını değil commit sayısını kaydeder.

## 🔴 BU BÖLÜMÜN DERSİ

**GÖRÜNÜR bir metrik, DOĞRU bir metrik DEĞİLDİR.**

A-1 üç commit boyunca her turda raporlandı ve görünürdü. Görünür
olması onu doğru yapmadı; payda donmuştu ve borcu **küçük gösteriyordu**.
A-2 aynı sınıfın ikinci örneğidir ve bugün hâlâ açıktır.

**Donmuş bir payda, kapanmayan bir borcu kapanıyormuş gibi gösterir.**
