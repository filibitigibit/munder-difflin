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
| implementer'ın bildirdiği GEÇERSİZ ÇAKMA denemesi *(ayrı kova)* | **2** (dilim 1 turu: dosyaya yazılmayan mutasyon · syntax error üreten mutasyon) | bu turda üretildi |

**GENİŞ SUİT SAYIM FARKI — GÖZLEM, SEBEP DEĞİL.** Kapanış kaydının
**745**'i ile bu turun yöntemiyle ölçülen **743**'ü (730 ✔ + 13 tekil ✖)
arasında bir fark **GÖZLENDİ**. **Kaynağı ÖLÇÜLMEDİ** ve bu satır ona
hiçbir sebep ATAMAZ; ileride kaynağı ölçülürse ilgili kovaya o zaman
yazılır. Karşılaştırmanın kendisi GEÇERLİDİR: taban ve sonrası **aynı
yöntemle** sayıldı ve SET karşılaştırması iki yönlü yapıldı.

## 🔴 DENETÇİ KÖRLÜĞÜ

**Denetçinin daha az KIRMIZI bulması TEK BAŞINA iyileşme DEĞİLDİR.**
Körleşme de aynı sayıyı üretir. İkisini ayırmak için denetçinin hâlâ
görebildiğini gösteren **KONTROLLÜ BİR KUSUR** gerekir.

Bu, testler için geçerli olan kuralın denetim tarafındaki karşılığıdır:
**mekanizma kaldırıldığında düşmeyen test kanıt değildir; kusur enjekte
edildiğinde yakalamayan denetçi de kanıt değildir.**

🔴 **BUGÜNKÜ DURUM: denetçiye enjekte edilmiş KONTROLLÜ TEK BİR KUSUR
YOKTUR.** Denetimin körlüğü hakkında hiçbir şey **BİLİNMİYOR**. Bu bir
**ÖLÇÜLMEDİ** kalemidir.

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
| T-1 | sebep-alan eşlemesi | 55 hücrenin tanımlanması | GATE 2 | fixture/producer dilimine geçiş | **AÇIK — 32 hücre KARARA BAĞLANDI, 5 kaldı** (`git_worktree_path` × 5 `failed`); kalan beşi T-18 besler | repo |
| T-2 | Measurement Layer enforcement | okuma tarafının mekanik kısıtlanması | Faz sonrası | Measurement Layer fazının ilk promptu | **AÇIK** ("HENÜZ YOKTUR" ×3) | repo |
| T-3 | okuma semantiği (legacy vs M13) | tüketicinin hangi sütunu hangi hükümde kullanacağı | Faz sonrası | Measurement Layer | **AÇIK** (`AÇIK BORÇ — OKUMA SEMANTİĞİ`) | repo |
| T-4 | `checkpoint_dirty_state` kopyalaması | kopyalanıp kopyalanmayacağının kararı | GATE 3 | checkpoint yazma yolu kodlanırken | **AÇIK** (`KARARA BAĞLANMAMIŞ`) | repo |
| T-5 | "tüketim" tanımı | hangi olayın kaydedileceğinin tanımı | Faz sonrası | Measurement Layer | **AÇIK** (`TANIMLI DEĞİLDİR`) | repo |
| T-6 | C-08 enforcement katmanı | reddi uygulayacak yüzeyin adıyla belirlenmesi | **GATE 3** | C-08 koşulmadan önce | **AÇIK** — tetikleyici bu turda vakaya YAZILDI | repo |
| T-7 | U-05 boş çıktı eşlemesi | "boş çıktı = meşru yok / unusable" kararı | GATE 2 | fixture dilimi | **AÇIK** (`bu eşleme TANIMSIZDIR`) | repo |
| T-8 | denetlenmemiş bağ | madde çiftlerinin denetlenmesi | hiçbiri (görünürlük metriği) | her tur raporlanır | **AÇIK — 80/91** (11 denetlenmiş) | repo |
| T-9 | hive `log.jsonl` +5 satırı | sahibin kararı (geri al / kabul et) | hiçbiri | sahip karar verdiğinde | **AÇIK** (+5 / −0) | git |
| T-10 | C-03 enforcement katmanı — `checkpoint_sha_source` reddi | reddi uygulayacak yüzeyin adıyla belirlenmesi | **GATE 3** | C-03 koşulmadan önce | **AÇIK** — tetikleyici bu turda vakaya YAZILDI | repo |
| T-11 | `provenance_complete` sürdürme mekanizması — aday seçimi | mekanizmanın ADIYLA seçilmesi | GATE 1 | DİLİM 1 göçü yazılmadan ÖNCE | 🟢 **KAPALI** — CTO A-VIRTUAL'ı seçti; M13 PROVENANCE_COMPLETE MEKANİZMASI'nda kilitlendi | repo + ölçüm |
| T-12 | A-VIRTUAL performansı | üretim boyutlu tabloda okuma süresinin ölçülmesi | hiçbiri (borç) | performans şüphesi doğduğunda | **AÇIK** — VIRTUAL her okumada hesaplanır; **ÖLÇÜLMEDİ** | ölçüm sınırı |
| T-13 | ÜRETİCİ YOK — şema M13 sütunlarını taşıyor ama hiçbir yazma yolu doldurmuyor (`createRun` 20 sütun yazıyor) | fixture/producer diliminin yazılması | **GATE 2** | fixture dilimi açıldığında | **AÇIK** — bu turda ölçüldü | repo + ölçüm |
| T-14 | GENİŞ SUİT SAYIM FARKI — 745 (kapanış kaydı) vs 743 (bu turun yöntemi) | farkın KAYNAĞININ ölçülmesi | hiçbiri | sayım yöntemi tartışıldığında | **AÇIK** — fark GÖZLENDİ, kaynağı **ÖLÇÜLMEDİ**, sebep ATANMADI | gözlem |
| T-15 | KORUMA VAKALARININ AYIRT EDİCİLİĞİ | hedefli çakma ile ölçülmesi | hiçbiri | — | 🟢 **KAPALI** — dokuz vakanın dokuzu da kendi hedefli mutasyonunda DÜŞTÜ (MUT-A/B2/C/D/E/F/G); hiçbiri KANIT DEĞİL çıkmadı | ölçüm |
| T-16 | DENETÇİ KÖRLÜĞÜ — denetime enjekte edilmiş kontrollü kusur YOK | denetçiye kontrollü bir kusur enjekte edilmesi | hiçbiri | denetim kalitesi hakkında hüküm kurulmadan ÖNCE | **AÇIK** — hiç ölçülmedi | ÖLÇÜLMEDİ |
| T-17 | SEBEP AYIRT EDİLEMEZLİĞİ — farklı sebepler aynı gözlemi üretiyor (`git-missing` ≡ var-olmayan cwd; `timeout` ≡ `command-nonzero`) | üreticinin beş sebebi birbirinden ayırabilecek bir ölçüm yolu tanımlaması | **GATE 2 SONRASI implementation kalemi — Gate 2'nin AÇILMA şartı DEĞİL** | üretici yazılırken | **AÇIK** | ölçüm (PROBE-RESULTS BLOK 4) |
| T-18 | İZOLASYON YÖNETİCİSİ FAILED-SINIFI ÖLÇÜMÜ | `git_worktree_path` ÜRETİM OPERASYONUNUN beş `failed` sınıfı açısından ölçülmesi | **BESLEYİCİ (GATE 2) — Gate 2'ye BAĞIMLI DEĞİL** | GATE 2'den ÖNCE, yalnız ölçüm amaçlı ayrı tur | **AÇIK** | — |
| T-21 | ALANLAR ARASI ZAMAN KAYMASI (intra-measurement skew) — beş alan farklı anlarda ölçülürse kaydedilen satır kendi içinde farklı anlardan bilgi taşır | producer'ın ölçüm zinciri tasarlandığında kayma ÖLÇÜLÜR ve M9 genişletilir VEYA genişletilmemesi gerekçelendirilir | GATE 2 SONRASI (producer tasarımı) | producer ölçüm sırası tanımlandığında | **AÇIK** — **ÖLÇÜLMEDİ (tasarıma bağlı)**; M9 bu pencereden HİÇ bahsetmiyor (sözleşme sessizliği) | kaynak okuması |

### T-11 SONDA SONUCU (scratch DB, davranış ölçümü)

Ortam: SQLite **3.49.2** · better-sqlite3 **11.10.0** · Electron **32.3.3**
/ Node **20.18.1** / ABI **128** — üretimde koşanla **AYNI** (aynı
`node_modules`, `ELECTRON_RUN_AS_NODE`).

| aday | ölçüm seviyesi | sonuç |
|---|---|---|
| **A-VIRTUAL** generated column | **DAVRANIŞ ÖLÇÜLDÜ** | M6 türetmesi 52/52 doğru; satırlı tabloya `ADD COLUMN` ile eklenir; F-12 **yapısal olarak geçer** (`cannot UPDATE generated column`) |
| **A-STORED** generated column | **DAVRANIŞ ÖLÇÜLDÜ** | 🔴 **FİİLEN KURULAMAZ** — satırı olan tabloda `cannot add a STORED column`. Boş tabloda kabul edilir; bu yüzden ilk sonda YANILTICIYDI. |
| **B** trigger (2 trigger) | **DAVRANIŞ ÖLÇÜLDÜ** | M6 türetmesi 52/52 doğru; ama F-12 **BAŞARISIZ** — `provenance_complete` elle yazılabiliyor |
| **B-guard** trigger (3 trigger) | **DAVRANIŞ ÖLÇÜLDÜ** | M6 doğru; F-12 **geçer** (hem ABORT hem OVERWRITE varyantı) |
| **C** uygulama katmanı | 🔴 **DAVRANIŞ ÖLÇÜLMEDİ — yalnız KAYNAK OKUNDU** | `runs` tablosuna yazan **3** SQL noktası, hepsi `runs.ts` içinde, dışarıda yazıcı YOK |

**A ve B aynı fiziksel sütunu PAYLAŞMIYOR** (ölçüldü): A `hidden=2`
(virtual generated), B `hidden=0, notnull=1, default 0`. Açılış
varsayımının "üç farklı sütun tipi" kısmı A/B için DOĞRULANDI.

**M4 bağlaşım trigger'ıyla çakışma:** `recursive_triggers` 0 ve 1'de
ayrı ayrı ölçüldü; A ve B'de M4 trigger'ı doğru abort ediyor, B'nin
iç UPDATE'i M4'ü tetiklemiyor. **Çakışma GÖZLENMEDİ.**

🔴 **ADAY C İÇİN KURULABİLECEK TEK HÜKÜM:** mimari bunu taşımaya
elverişli görünüyor (tek yazıcı dosya). **"Uygulama katmanı bunu doğru
üretir ve güncel tutar" hükmü KURULAMAZ** — davranış ölçülmedi, `src/`
kilitliydi. Ayrıca F-12 bir **DİLİM 1** (DB-only) vakasıdır; uygulama
katmanı o dilimde hiç çalışmaz, dolayısıyla ADAY C altında F-12
tanım gereği geçemez — bu bir BELGE ÇIKARIMIDIR, davranış ölçümü değil.

**KARAR VERİLMEDİ.** Aday seçimi CTO'nundur.

**T-8 İKİYE AYRILIR:** bağ borcunun kendisi **AÇIK** (80/91); bu borcu
YANLIŞ ÖLÇEN aracın kusuru **KAPALI** (bkz. BÖLÜM 4, A-1).

**KAPANAN KALEMLER: T-11, T-15.** ON SEKİZ kalemin **ikisi KAPALI**, on altısı
AÇIK

### RB-1 — REDDEDİLEN BULGU: "iki gerekçe ölçülmemiş davranışa dayanıyor"

**BULGU (implementer, sebep-alan eşlemesi turu):** `bare-repo` ve
`submodule` × `git_worktree_path` GEÇERSİZ kararlarının gerekçesi
izolasyon yöneticisinin ÖLÇÜLMEMİŞ davranışına dayanıyor; T-18
beklenenden farklı çıkarsa bu iki hücre yeniden açılabilir.

**HÜKÜM: REDDEDİLDİ.** Denetim sonucu — T-19 **İHDAS EDİLMEDİ**.

**RED GEREKÇESİ — İKİ BAĞIMSIZ AYAK:**

**(1) Gerekçeler NORMATİF, davranışsal değil.** Üç gerekçe cümlesi ayrı
ayrı sınıflandırıldı:

| # | cümle | sınıf |
|---|---|---|
| C1 | "bare repo olması worktree_path kavramını TANIM GEREĞİ uygulanamaz KILMAZ" | NORMATİF AYRIM |
| C2 | "izolasyon mevcutsa kavram uygulanabilir kabul edilir" | NORMATİF AYRIM — "izolasyon mevcutsa" bir ÖN KOŞULDUR, davranış tahmini DEĞİL |
| C3 | "kavram uygulanır" (submodule) | NORMATİF AYRIM |

**Davranış varsayımı taşıyan cümle: 0.** Hiçbiri "yönetici bare repoda
path ÜRETİR" demiyor.

**(2) T-18 bu kararları ÇÜRÜTEMEZ — farklı AİLE, farklı EKSEN.**
T-18'in ekseni beş `failed` sınıfıdır; kararlar `not_applicable`
ailesindedir. Sözleşmenin kendi tanımlarıyla bir ÜRETİM BAŞARISIZLIĞI
"denendi ve başarısız oldu"dur → **`failed`**. Üstelik **denemek,
kavramın UYGULANDIĞINI ÖN VARSAYAR** — uygulanmayan bir şeyde denenip
başarısız olunamaz. Böyle bir bulgu kararı çürütmez, **ön varsayar**.

**KORUNAN AYRIM:** `not_applicable` ("kavram uygulanmaz") ile `failed`
("ölçüm denendi, başarısız oldu") **AYRI AİLELERDİR** (M5:310 — "Hiçbir
sınıf yanlış aileye yazılamaz"). Bulguyu kabul etmek, M5'in en başından
beri ayırdığı iki sınıfı geri birleştirirdi.

**KAYIT DİSİPLİNİ:** bulguyu üreten annotation (CONTRACT M5) bu turda
düzeltildi — yanlış çıkarım kaldırıldı, **doğru olan olgu boşluğu
korundu**: izolasyon yöneticisinin bare/submodule davranışı gerçekten
ölçülmedi; sadece kararlar ona **dayanmıyor**.

🔴 **BU RED, İZOLASYON YÖNETİCİSİNİN DAVRANIŞININ ÖNEMSİZ OLDUĞUNU
SÖYLEMEZ.** O davranış T-18'de ölçülecektir ve `failed` hücrelerini
kapatacaktır. Red yalnız şunu söyler: o ölçüm bu iki `not_applicable`
kararını **açmaz**.

---

### T-18 — ÖLÇÜM EKSENİ (kapattığı hücrelerle BİREBİR)

🔴 **ÖLÇÜM EKSENİ: BEŞ `failed` SINIFI — repo bağlamı DEĞİL.**
`git_worktree_path`'in **GERÇEK ÜRETİM YÜZEYİNDE** her sebep için sorulan:
bu kusur sınıfı üretilebiliyor mu. Çıktı: **ÜRETİLDİ** + ham çıktı, veya
**BU TURDA ÜRETİLEMEDİ** + neden.

| sebep | kapattığı hücre |
|---|---|
| `git-missing` | `git_worktree_path` × `git-missing` |
| `command-nonzero` | `git_worktree_path` × `command-nonzero` |
| `timeout` | `git_worktree_path` × `timeout` |
| `not-a-repo` | `git_worktree_path` × `not-a-repo` |
| `unusable-output` | `git_worktree_path` × `unusable-output` |

**EKSEN EŞLEŞMESİ: 5/5 BİREBİR.**

🔴 **bare / submodule / normal repo bağlamları ÖLÇÜM EKSENİ DEĞİLDİR.**
Bunlar yalnızca belirli bir failure senaryosunu kurmak için gerekiyorsa
**YARDIMCI FIXTURE BAĞLAMIDIR**. Başka bir ekseni ölçen bir tur bu
hücreleri **KAPATMAZ**.

🔴 **T-18 FIXTURE/PRODUCER IMPLEMENTATION DEĞİLDİR.** Producer ve fixture
kodu ancak Gate 2 açıldıktan SONRA yazılır. — her biri repo kanıtından doğrulandı, hiçbiri "otomatik açık"
sayılmadı.

🔴 **T-11 KAPANDI AMA BORÇ TAM ERİMEDİ:** yerine T-12 (performans)
açıldı. Bir kararın verilmesi, o kararın BEDELİNİN ölçüldüğü anlamına
GELMEZ.

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
