# Mission Control — Faz 1B: Test Planı

**Bağlandığı SHA:** `4634762417f75f5bff181eedc84187c6ca8f442c`
**Sözleşme:** [CONTRACT.md](CONTRACT.md) — maddeler M1, M2, M3, M4, M5, M6, M7, M9

Bu dosya **plandır**. Bu turda hiçbir test koşulmadı, hiçbir üretim kodu
yazılmadı, şema değiştirilmedi.

## Okuma kuralı

Her vaka kalıcı bir kimlik taşır ve altı alan hâlinde yazılır:

| alan | anlamı |
|---|---|
| `ID` | kalıcı vaka kimliği; bir kez verilir, yeniden kullanılmaz |
| `MADDE` | test ettiği sözleşme maddesi/maddeleri, adıyla |
| `SINIF` | `REDDETME` \| `KABUL` \| `POZITIF_KONTROL` |
| `GIRDI` | vakanın kurduğu durum |
| `BEKLENEN GOZLEM` | ölçülecek olan; hükmün değil, gözlemin ifadesi |
| `IZIN VERILEN HUKUM` | bu gözlemin desteklediği EN GENİŞ hüküm |
| `DILIM` | `DILIM 1` \| `FIXTURE DILIMI` \| `ATANAMADI` — hangi uygulama diliminde koşulur |

## DILIM alanının ölçütü ve anlamı

**Ölçüt (mekanik):**

- `DILIM 1` = yalnız DB gerektiren vaka. Electron YOK, PTY YOK, git alt
  süreci YOK, sahte çalıştırılabilir YOK.
- `FIXTURE DILIMI` = gerçek git ortamı, sahte git `.exe`'si, gecikme
  enjeksiyonu, üretim ölçüm yolunun çağrılması veya Electron gerektiren vaka.
- `ATANAMADI` = vaka SINIFLANDIRILAMADI — GIRDI'si hangi dilime ait
  olduğunu belirlemeye yetmiyor. **Bu bir kusur değil, bir ölçüm
  sonucudur**, ama kapatılması gereken bir boşluktur.

**ÜÇÜNCÜ DİLİM DEĞERİ — `YOK`:** bazı kalemler koşulabilir test değil,
implementation sırasında yapılması gereken kaynak-inceleme veya eleme
yükümlülüğüdür. Bunlar plandan silinmez ama bir dilimde KOŞMAZLAR.
`DILIM: YOK` taşıyan kalem, implementation handoff'unda AYRI BİR İŞ
KALEMİ olarak görünür — **"gate'i etkilemiyor" ifadesi zamanla
"yapılmasına gerek yok"a DÖNÜŞEMEZ.**

### GATE ÖLÇÜTÜ

Implementation kapısı **İKİ ŞARTA** bağlıdır:

| şart | ölçüm |
|---|---|
| `ATANAMADI` (sınıflandırılamadı vaka) | **= 0** olmalı |
| `AÇIK ÇELİŞKİ` (ölçülmüş ve çözülmemiş) | **= 0** olmalı |

**Kapı AÇIK ancak ve ancak İKİSİ DE sıfırsa.**

`DILIM: YOK` (bilinerek koşulmayan yükümlülük) kapıyı ETKİLEMEZ.
Bir kalemi `YOK` yapmak, sınıflandıramamanın örtüsü olarak
KULLANILAMAZ; gerekçesi vakanın metninde yazılır.

Bunların yanında **BİR GÖRÜNÜRLÜK METRİĞİ** raporlanır:

> **DENETLENMEMİŞ BAĞ sayısı** (denetlenen / 66)

Bu metrik **GATE ŞARTI DEĞİLDİR** ve kapıyı TEK BAŞINA KAPATMAZ.
Sıfıra inmesi BEKLENMEZ. Ama her turda YAZILIR; görünmez kalması
YASAKTIR.

**"Kapı açık" ifadesi "sözleşme hazır" ANLAMINA GELMEZ.** Gate
planlanabilirliği ve BİLİNEN çelişkilerin yokluğunu ölçer;
denetlenmemiş bağın içinde ne olduğunu ÖLÇMEZ.

**DILIM ETİKETİNİN ANLAMI — YÜRÜTME BİLGİSİDİR, EVREN DEĞİLDİR.**
Dilim ataması vakanın NEREDE koşacağını söyler. Vakanın kanıtladığı
hükmün EVRENİ DEĞİLDİR. Bir vaka fixture diliminde koşup, kanıtladığı
hüküm yalnız sahte git davranışı, belirli bir SQLite sürümü ya da tek
bir platform için geçerli olabilir. Hükmün evreni her vakanın
`IZIN VERILEN HUKUM` alanında ayrıca yazılır; `DILIM` onu daraltmaz ve
genişletmez.

**Kapsam:** 107 vakanın hepsi `DILIM` alanı taşır. Özgün 80 vakanın
ataması v3.1'de GIRDI metinleri okunarak yapıldı.

**Sınıf, BEKLENEN GÖZLEMDEN türetilir.** Başarılı olması beklenen bir vaka
`REDDETME` kovasına yazılmaz. Exit 0 vermesi gereken ama başka özelliği
ölçülen vaka negatif sayılmaz.

- `REDDETME` = sistemin bir yazmayı/durumu **reddetmesi** gözlenir.
- `KABUL` = sistemin bir davranışı **üretmesi** gözlenir.
- `POZITIF_KONTROL` = ölçüm aracının/fixture'ın kendisinin çalıştığı
  gözlenir. Bu vaka düşerse komşu vakaların sıfır sonucu yokluk kanıtı
  sayılmaz.

## Alan adları (plan boyunca sabit)

Git alanları: `base_sha`, `branch`, `pty_cwd`, `git_toplevel`, `worktree_path`.
Her birinin bir değer sütunu ve bir durum sütunu vardır (M4).
Checkpoint alanları: `checkpoint_sha`, `checkpoint_sha_source`.
Türetilmiş bayrak: `provenance_complete`.

---

# GRUP G — Migration (user_version 2 -> 3)

#### G-01 · göç uygulanır ve user_version 3 olur
- ID: G-01
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: user_version 2 olan, Faz 1A şemasına sahip bir DB dosyası.
- BEKLENEN GOZLEM: `migrate()` sonrası `pragma user_version` = 3; `runs` tablosunda M3/M4/M6 sütunları mevcut.
- IZIN VERILEN HUKUM: Göç bu DB dosyası üzerinde uygulanabilir ve sürüm numarasını ilerletir.

#### G-02 · göç öncesi ve sonrası tüm satırların tüm alanları birebir aynı
- ID: G-02
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: `runs`, `events`, `kv`, `command_history` tablolarında dolu satırlar bulunan user_version 2 DB. Göçten önce her tablonun her satırının her sütunu tam olarak dökülür.
- BEKLENEN GOZLEM: Göç sonrası aynı döküm alınır; eski sütun kümesi üzerinde iki döküm karakter karakter aynıdır. Satır sayısı karşılaştırması veya seçili alan karşılaştırması bu vakayı geçirmez.
- IZIN VERILEN HUKUM: Göç mevcut veriyi bu tablolarda değiştirmez. Yeni sütunların eklenmesi eski veriyi bozmaz.

#### G-03 · events UPDATE trigger'ı göç sonrası hâlâ çalışır
- ID: G-03
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Göç uygulanmış DB. `events` tablosundaki bir satıra doğrudan `UPDATE` denenir.
- BEKLENEN GOZLEM: Yazma `RAISE(ABORT, 'events is append-only')` ile reddedilir. Trigger'ın `sqlite_master`'da var olması bu vakayı geçirmez; reddin fiilen gerçekleşmesi gerekir.
- IZIN VERILEN HUKUM: Göç, Faz 1A'nın append-only UPDATE korumasını çalışır hâlde bırakır.

#### G-04 · events DELETE trigger'ı göç sonrası hâlâ çalışır
- ID: G-04
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Göç uygulanmış DB. `events` tablosundaki bir satıra doğrudan `DELETE` denenir.
- BEKLENEN GOZLEM: Yazma `RAISE(ABORT, 'events is append-only')` ile reddedilir.
- IZIN VERILEN HUKUM: Göç, Faz 1A'nın append-only DELETE korumasını çalışır hâlde bırakır.

#### G-05 · indeksler göç sonrası mevcut
- ID: G-05
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Göç uygulanmış DB. Göç öncesi indeks adları listelenir.
- BEKLENEN GOZLEM: `idx_runs_agent`, `idx_runs_status`, `idx_runs_parent`, `idx_events_run`, `idx_events_type` göç sonrası `sqlite_master`'da mevcuttur; göç öncesi listeden eksilen indeks yoktur.
- IZIN VERILEN HUKUM: Göç mevcut indeksleri düşürmez.

#### G-06 · göç ikinci kez çalıştırılırsa no-op
- ID: G-06
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Zaten user_version 3 olan bir DB üzerinde `migrate()` yeniden çağrılır.
- BEKLENEN GOZLEM: Hata fırlatılmaz; user_version 3 kalır; şema dökümü ve veri dökümü ikinci çağrıdan önce/sonra birebir aynıdır.
- IZIN VERILEN HUKUM: Göç idempotenttir; tekrar açılan bir uygulama şemayı tekrar değiştirmez.

#### G-07 · CHECK'i ihlal eden doğrudan INSERT reddedilir
- ID: G-07
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Göç uygulanmış DB. Persistence API'si atlanarak, `runs` tablosuna beyaz listede olmayan bir (durum, değer) kombinasyonu taşıyan doğrudan `INSERT` denenir.
- BEKLENEN GOZLEM: SQLite CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: Beyaz liste uygulaması API katmanında değil, DB katmanındadır; API'yi atlayan bir yazıcı da reddedilir.

#### G-08 · izinli kombinasyon INSERT'i geçer
- ID: G-08
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Göç uygulanmış DB. `runs` tablosuna beyaz listedeki bir (durum, değer) kombinasyonu taşıyan doğrudan `INSERT` denenir.
- BEKLENEN GOZLEM: Yazma başarılı olur ve satır geri okunduğunda yazılan değerleri taşır.
- IZIN VERILEN HUKUM: CHECK kısıtı yalnız ihlalleri reddeder; geçerli yazmayı engellemez. G-07'nin reddi kısıtın aşırı geniş olmasından kaynaklanmıyordur.

#### G-09 · göç öncesi var olan runs satırları geçerli bir sınıfla doldurulur
- ID: G-09
- MADDE: M4, M5
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Göç öncesinde `runs` tablosunda git alanları hiç ölçülmemiş (Faz 1A) satırlar bulunur.
- BEKLENEN GOZLEM: Göç sonrası bu satırların her git alanı beyaz listeye uyan bir durum taşır; hiçbiri CHECK'i ihlal eden bir ara durumda kalmaz. Atanan sınıf sabit listedendir, uydurma değildir.
- IZIN VERILEN HUKUM: Göç, geçmiş satırları yeni kısıtla uyumlu hâle getirir. Bu satırların git değerleri hiçbir zaman ölçülmemiştir; bu vaka yalnız kısıt uyumunu kanıtlar.

#### G-10 · POZİTİF KONTROL: göç öncesi fixture gerçekten göç edilmemiş
- ID: G-10
- MADDE: M4
- SINIF: POZITIF_KONTROL
- DILIM: DILIM 1
- GIRDI: G-01..G-09'un kullandığı göç-öncesi fixture DB.
- BEKLENEN GOZLEM: `migrate()` çağrılmadan önce `pragma user_version` = 2 VE M3/M4/M6 sütunları `pragma table_info(runs)` çıktısında YOKTUR.
- IZIN VERILEN HUKUM: G grubunun "göç sonrası şu oldu" gözlemleri, zaten göç edilmiş bir fixture'ı yeniden ölçmüyordur.

#### G-11 · göç edilmiş legacy satırlar provenance_complete=false taşır
- ID: G-11
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: G-09'un ürettiği, git alanları hiç ölçülmemiş legacy satırlar.
- BEKLENEN GOZLEM: Bu satırların `provenance_complete` değeri false'tur.
- IZIN VERILEN HUKUM: Faz 1A döneminde açılmış run'lardan provenance gerektiren PROVEN hüküm kurulamaz ve bayrak bunu beyan eder.

## GRUP G ek bölümü — legacy göç semantiği (M10, M13)

> **FIXTURE GEREKSİNİMİ (G-12..G-20 için bağlayıcı):** göç fixture'ı EN AZ ÜÇ
> v2 satırı içerir ve bunlar birbirinden FARKLI provenance profilleri taşır:
> (a) `worktree_path` DOLU olan bir satır, (b) tüm eski provenance sütunları
> NULL olan bir satır, (c) farklı bir status/lifecycle aşamasındaki bir satır.
> **Tek satırlık fixture ile koruma vakaları YAZILAMAZ.**

#### G-12 · v2 satırları M13'ün beş alanının hepsinde never_measured alır
- ID: G-12
- MADDE: M10, M13
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Üç profilli v2 fixture'ı üzerinde göç uygulanır.
- BEKLENEN GOZLEM: Her üç satırın da `git_base_sha_status`, `git_branch_status`, `git_toplevel_status`, `git_pty_cwd_status`, `git_worktree_path_status` alanlarının BEŞİ de `never_measured`; karşılık gelen beş değer alanı NULL. Beş alandan biri bile başka bir durum taşırsa vaka düşer.
- IZIN VERILEN HUKUM: Göç, geçmiş satırlara ölçüm uydurmaz; ölçüm penceresinin geçtiğini alan düzeyinde beyan eder.

#### G-13 · v2 satırları göç sonrası provenance_complete=false taşır
- ID: G-13
- MADDE: M10, M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: G-12 ile aynı fixture, göç sonrası.
- BEKLENEN GOZLEM: Üç satırın da `provenance_complete` değeri false.
- IZIN VERILEN HUKUM: `never_measured` tamamlığı bozar; Faz 1A döneminde açılmış run'lardan provenance gerektiren PROVEN hüküm kurulamaz.

#### G-14 · SATIR KÜMESİ KORUMASI — tüm satırların tüm eski sütunları birebir
- ID: G-14
- MADDE: M10
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Göçten önce fixture'daki HER satırın HER eski sütunu tam olarak dökülür (üç satırın üçü de).
- BEKLENEN GOZLEM: Göç sonrası aynı döküm alınır; eski sütun kümesi üzerinde iki döküm KÜMENİN TAMAMI için karakter karakter aynıdır. Tek bir satır üzerinde yapılan karşılaştırma bu vakayı GEÇİRMEZ.
- IZIN VERILEN HUKUM: Göç hiçbir v2 satırının hiçbir eski sütun değerini değiştirmez. Hüküm kümenin tamamı için kurulur, seçilmiş bir satır için değil.

#### G-15 · SATIR SAYISI KORUMASI
- ID: G-15
- MADDE: M10
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Göç öncesi `runs` satır sayısı sayılır.
- BEKLENEN GOZLEM: Göç sonrası satır sayısı aynıdır; hiçbir satır kaybolmaz, hiçbir satır çoğalmaz.
- IZIN VERILEN HUKUM: Göç satır kümesinin kardinalitesini korur.

#### G-16 · SATIR KİMLİĞİ KORUMASI
- ID: G-16
- MADDE: M10
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Göç öncesi `run_id` kümesi toplanır.
- BEKLENEN GOZLEM: Göç sonrası `run_id` kümesi öncekiyle birebir aynıdır — eksik, fazla veya değişmiş kimlik yoktur.
- IZIN VERILEN HUKUM: Göç satır kimliklerini korur. Sayı korunmuş olsa bile kimlik değişmişse bu vaka düşer; G-15 tek başına bunu kapsamaz.

#### G-17 · SENTINEL: worktree_path'i dolu olan satırın değeri aynen durur
- ID: G-17
- MADDE: M10
- SINIF: POZITIF_KONTROL
- DILIM: DILIM 1
- GIRDI: Fixture'ın (a) profilli satırı — `worktree_path` dolu (ölçülmüş olgu: discovery'de `probe-iso` run'ında bu sütun `D:\mc-scratch\hive\worktrees\probe-iso` değeriyle görülmüştür).
- BEKLENEN GOZLEM: Göç sonrası o satırın `worktree_path` değeri karakter karakter aynıdır.
- IZIN VERILEN HUKUM: **Bu bir POZİTİF KONTROLDÜR.** Göç fixture'ında gerçekten dolu bir legacy sütun bulunduğunu ve korumanın en az bu satırda çalıştığını gösterir. **Tek başına evrensel koruma hükmünü KURMAZ** — o hüküm G-14, G-15, G-16'nın birlikte geçmesine bağlıdır.

#### G-18 · AYRIM: legacy değer M13 sütununa kopyalanmaz
- ID: G-18
- MADDE: M10, M13
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Fixture'ın (a) profilli satırı, göç sonrası.
- BEKLENEN GOZLEM: `worktree_path` eski değerini taşır; `git_worktree_path` NULL ve `git_worktree_path_status` = `never_measured`. İki sütun ayrıdır ve legacy değer yeni sütuna KOPYALANMAMIŞTIR. Aynı denetim `base_sha`/`git_base_sha` ve `branch`/`git_branch` için de yapılır.
- IZIN VERILEN HUKUM: Tarihsel metadata ile ölçülmüş provenance ayrı sütunlarda kalır; göç bir tarihsel değeri ölçülmüş gibi göstermez.

#### G-19 · göç işlemi M13 alanlarına measured/failed/not_applicable yazamaz
- ID: G-19
- MADDE: M10
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Göç işlemi çalıştırılır ve ürettiği v2 satırlarının M13 durum alanları okunur.
- BEKLENEN GOZLEM: Hiçbir v2 satırının hiçbir M13 durum alanında `measured`, `measured_detached`, `failed(*)` veya `not_applicable(*)` yoktur; hepsi `never_measured`tir.
- IZIN VERILEN HUKUM: **Bu vaka GÖÇ İŞLEMİNİN ÇIKTISINI ölçer.** "Bu satıra gelecekte hiçbir zaman yazılamaz" biçiminde daha güçlü bir DB hükmü İDDİA EDİLMEZ; M10 yalnız göç işlemini sınırlar, satırın geleceğini değil.

#### G-20 · POZİTİF KONTROL: üç profilli fixture gerçekten v2 ve gerçekten üç profilli
- ID: G-20
- MADDE: M10
- SINIF: POZITIF_KONTROL
- DILIM: DILIM 1
- GIRDI: G-12..G-19'un kullandığı göç-öncesi fixture.
- BEKLENEN GOZLEM: Göç çağrılmadan önce `pragma user_version` = 2; M13 sütunları `pragma table_info(runs)` çıktısında YOKTUR; ve fixture gerçekten üç ayrı profil taşır — bir satırda `worktree_path` dolu, bir satırda tüm eski provenance sütunları NULL, bir satır farklı bir `status` değerinde.
- IZIN VERILEN HUKUM: G grubunun ek vakalarının "göç sonrası şu oldu" gözlemleri, zaten göç edilmiş ya da tek profilli bir fixture'ı ölçmüyordur.

#### G-21 · göç sonrası rowid kümesi göç öncesiyle birebir aynı
- ID: G-21
- MADDE: M10
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Üç profilli v2 fixture'ında göç öncesi `SELECT rowid FROM runs ORDER BY rowid` toplanır; göç `ALTER TABLE ADD COLUMN` yoluyla uygulanır (M10 GÖÇ ŞEKLİ).
- BEKLENEN GOZLEM: Göç sonrası rowid kümesi öncekiyle birebir aynıdır — hiçbir satır yeniden oluşturulmamıştır.
- IZIN VERILEN HUKUM: Satırlar kopyalanmamıştır; M10'un satır kümesi koruması bu göç şeklinde şemanın yapısal sonucudur. **Bu vaka koruma iddiasının YERİNE GEÇMEZ:** G-14, G-15, G-16 yine de koşulur — rowid sabitliği, satır içeriğinin ve kimliğinin korunduğunu tek başına kanıtlamaz.

---

# GRUP W — M4 beyaz listesi

#### W-01 · measured + dolu değer kabul edilir
- ID: W-01
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Bir git alanına `measured` durumu ve boş olmayan bir değer yazılır.
- BEKLENEN GOZLEM: Yazma geçer; satır geri okunduğunda durum `measured`, değer yazılan string'tir.
- IZIN VERILEN HUKUM: Beyaz listenin `measured` satırı yazılabilir.

#### W-02 · measured + NULL reddedilir
- ID: W-02
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Bir git alanına `measured` durumu ve NULL değer yazılır.
- BEKLENEN GOZLEM: CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: "Ölçüldü" beyanı değersiz kaydedilemez.

#### W-03 · measured_detached + NULL (branch) kabul edilir
- ID: W-03
- MADDE: M4, M5
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: `branch` alanına `measured_detached` durumu ve NULL değer yazılır.
- BEKLENEN GOZLEM: Yazma geçer.
- IZIN VERILEN HUKUM: Detached HEAD, `branch` için kendi sınıfıyla kaydedilebilir.

#### W-04 · measured_detached + dolu değer reddedilir
- ID: W-04
- MADDE: M4, M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `branch` alanına `measured_detached` durumu ve boş olmayan bir değer yazılır.
- BEKLENEN GOZLEM: CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: Detached durumda bir dal adı uydurulup kaydedilemez.

#### W-05 · failed(sabit sebep) + NULL kabul edilir
- ID: W-05
- MADDE: M4, M5
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Bir git alanına `failed(git-missing)` durumu ve NULL değer yazılır. Vaka dört sabit sebep üzerinde parametrelenir: `git-missing`, `command-nonzero`, `timeout`, `not-a-repo`.
- BEKLENEN GOZLEM: Dört parametrenin her birinde yazma geçer.
- IZIN VERILEN HUKUM: Sabit listedeki dört başarısızlık sebebi kaydedilebilir.

#### W-06 · failed(sabit sebep) + dolu değer reddedilir
- ID: W-06
- MADDE: M4, M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Bir git alanına `failed(timeout)` durumu ve boş olmayan bir değer yazılır.
- BEKLENEN GOZLEM: CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: Başarısız bir ölçüm değer taşıyamaz; yarım okunan çıktı değer olarak kaydedilemez.

#### W-07 · not_applicable(sabit sebep) + NULL kabul edilir
- ID: W-07
- MADDE: M4, M5
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Bir git alanına `not_applicable(no-isolation)` durumu ve NULL değer yazılır. Vaka üç sabit sebep üzerinde parametrelenir: `no-isolation`, `bare-repo`, `submodule`.
- BEKLENEN GOZLEM: Üç parametrenin her birinde yazma geçer.
- IZIN VERILEN HUKUM: Sabit listedeki üç uygulanamazlık sebebi kaydedilebilir.

#### W-08 · not_applicable(sabit sebep) + dolu değer reddedilir
- ID: W-08
- MADDE: M4, M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `worktree_path` alanına `not_applicable(no-isolation)` durumu ve boş olmayan bir yol yazılır.
- BEKLENEN GOZLEM: CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: "Uygulanamaz" beyanı bir değerle birlikte kaydedilemez; izolasyonsuz bir run'a worktree yolu iliştirilemez.

#### W-09 · durumu değiştirip değeri değiştirmeyen UPDATE reddedilir
- ID: W-09
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `measured` + dolu değer taşıyan bir satırda yalnız durum sütunu `failed(timeout)` yapılır; değer sütununa dokunulmaz.
- BEKLENEN GOZLEM: Yazma reddedilir.
- IZIN VERILEN HUKUM: Durum tek başına güncellenemez; durum ve değer ayrılamaz.

#### W-10 · değeri değiştirip durumu değiştirmeyen UPDATE reddedilir
- ID: W-10
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `failed(timeout)` + NULL taşıyan bir satırda yalnız değer sütununa bir SHA yazılır; durum sütununa dokunulmaz.
- BEKLENEN GOZLEM: Yazma reddedilir.
- IZIN VERILEN HUKUM: Değer tek başına güncellenemez; bir başarısızlık kaydına sonradan değer iliştirilemez.

#### W-11 · beyaz listede olmayan durum string'i reddedilir
- ID: W-11
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Bir git alanına `unknown`, `pending`, `partial` gibi beyaz listede olmayan durum string'leri yazılır.
- BEKLENEN GOZLEM: Her denemede CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: Durum alanı kapalı bir kümedir; yeni bir durum sınıfı şema değişikliği olmadan sisteme giremez.

#### W-12 · measured + boş string reddedilir
- ID: W-12
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Bir git alanına `measured` durumu ve `''` (uzunluk 0 string) yazılır.
- BEKLENEN GOZLEM: CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: Boş string dolu değer sayılmaz. Faz 1A'da `orNull`'un `''`'i geçirmesiyle açık kalan boşluk DB katmanında kapanır.

#### W-13 · uydurma failed sebebi reddedilir
- ID: W-13
- MADDE: M4, M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Bir git alanına `failed(uydurma-sebep)` yazılır.
- BEKLENEN GOZLEM: CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: `<sebep>` serbest string değildir; sabit listedir ve DB bunu uygular.

#### W-14 · uydurma not_applicable sebebi reddedilir
- ID: W-14
- MADDE: M4, M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Bir git alanına `not_applicable(uydurma-sebep)` yazılır.
- BEKLENEN GOZLEM: CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: `not_applicable` sebep listesi de kapalıdır; sabit liste uygulaması yalnız `failed` ailesi için değildir.

#### W-15 · legacy sütunlar M4 beyaz listesinin dışındadır — durum sütunları yoktur
- ID: W-15
- MADDE: M4, M13
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Göç uygulanmış DB'de legacy sütunlara bir M4 durum değeri yazılmaya çalışılır: `base_sha_status`, `branch_status`, `worktree_path_status` sütunlarına sırayla `measured_detached` yazılır. Vaka bu üç sütun adı üzerinde parametrelenir. Ayrıca `pragma table_info(runs)` ile bu üç sütunun VAR OLMADIĞI doğrulanır.
- BEKLENEN GOZLEM: Üç denemenin her birinde yazma reddedilir ve `pragma table_info(runs)` çıktısında `base_sha_status`, `branch_status`, `worktree_path_status` sütunları BULUNMAZ.
- IZIN VERILEN HUKUM: M4 beyaz listesi YALNIZ M13 alan ailesine uygulanır; legacy `base_sha`, `branch`, `worktree_path` sütunlarının bir ölçüm durumu sütunu YOKTUR ve bunlara M4 durum değeri yazılamaz. **ENFORCEMENT SINIRI: bu ret bir CHECK kısıtından GELMEZ** — legacy sütunlarda CHECK yoktur (M4 KAPSAM); ret, hedef sütunun şemada var olmamasından gelir (SQLite `no such column`). **"DB'nin CHECK'i bu yazıyı reddetti" hükmü KURULAMAZ.** **W-21'den FARKLIDIR:** W-21 M13 ailesinde `measured_detached`'ın yalnız `git_branch_status`'a özgü olduğunu CHECK ile test eder; bu vaka legacy tarafın beyaz listenin DIŞINDA olduğunu şema ile test eder.

#### W-16 · POZİTİF KONTROL: W grubunun yazma yolu gerçekten satır yazabiliyor
- ID: W-16
- MADDE: M4
- SINIF: POZITIF_KONTROL
- DILIM: DILIM 1
- GIRDI: W grubunun reddetme vakalarının kullandığı aynı yazma çağrısı, izinli bir kombinasyonla çalıştırılır ve yazılan satır geri okunur.
- BEKLENEN GOZLEM: Satır yazılır ve geri okunduğunda beklenen değerleri taşır.
- IZIN VERILEN HUKUM: W grubundaki reddetmeler, yazma yolunun tümüyle bozuk olmasından kaynaklanmıyordur; kısıt seçicidir.

## GRUP W ek bölümü — yeni durumlar beyaz listede (M4, M13)

> **KAPSAM UYARISI (W-17..W-21 için bağlayıcı):** bu vakalar YALNIZ DB yapısal
> geçerliliğini test eder. **ÜRETİM KANITI DEĞİLDİR** — bir durumun beyaz
> listede bulunması, onu üreten bir kod yolunun var olduğunu kanıtlamaz.
> `failed(unusable-output)`'u ÜRETEN katman producer'dır (GRUP U).

#### W-17 · failed(unusable-output) + NULL kabul edilir
- ID: W-17
- MADDE: M4, M5
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Bir M13 alanına `failed(unusable-output)` durumu ve NULL değer yazılır.
- BEKLENEN GOZLEM: Yazma geçer.
- IZIN VERILEN HUKUM: Beyaz liste bu sebebi tanır ve kaydedilebilir. Bu, sebebin üretildiğini KANITLAMAZ; yalnız DB'nin onu reddetmediğini gösterir.

#### W-18 · failed(unusable-output) + dolu değer reddedilir
- ID: W-18
- MADDE: M4, M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Bir M13 alanına `failed(unusable-output)` durumu ve boş olmayan bir değer yazılır.
- BEKLENEN GOZLEM: CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: Kullanılamaz çıktıdan bir değer damıtılıp kaydedilemez. DB yapısal geçerliliği; üretim kanıtı değildir.

#### W-19 · never_measured + NULL kabul edilir
- ID: W-19
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Bir M13 alanına `never_measured` durumu ve NULL değer yazılır.
- BEKLENEN GOZLEM: Yazma geçer.
- IZIN VERILEN HUKUM: `never_measured` beyaz listededir ve kaydedilebilir. DB yapısal geçerliliği; üretim kanıtı değildir.

#### W-20 · never_measured + dolu değer reddedilir
- ID: W-20
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Bir M13 alanına `never_measured` durumu ve boş olmayan bir değer yazılır.
- BEKLENEN GOZLEM: CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: "Hiç ölçülmedi" beyanı bir değerle birlikte kaydedilemez. DB yapısal geçerliliği; üretim kanıtı değildir.

#### W-21 · measured_detached, git_branch_status dışındaki dört M13 alanında reddedilir
- ID: W-21
- MADDE: M4, M13
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `measured_detached` durumu `git_base_sha_status`, `git_toplevel_status`, `git_pty_cwd_status`, `git_worktree_path_status` alanlarına sırayla yazılır. Vaka bu dört alan üzerinde parametrelenir.
- BEKLENEN GOZLEM: Dört parametrenin her birinde CHECK kısıtı yazmayı reddeder.
- IZIN VERILEN HUKUM: `measured_detached` M13 ailesinde yalnız `git_branch_status`'a özgüdür. **W-15'ten FARKLIDIR:** W-15 legacy sütun adları üzerinde aynı kısıtı test eder; bu vaka M13 alan ailesini test eder. İkisi ayrı sütun kümesidir. DB yapısal geçerliliği; üretim kanıtı değildir.

## GRUP W ek bölümü 2 — enforcement bölünmesi (M4)

> **KATMAN AYRIMI (W-22..W-28 için bağlayıcı):** M4'ün ENFORCEMENT BÖLÜNMESİ
> bölümü uyarınca Invaryant A (durum geçerliliği) CHECK katmanında, Invaryant B
> (güncelleme bağlaşımı) BEFORE UPDATE trigger katmanında uygulanır. W-22
> CHECK katmanının SINIRINI kaydeder; W-23..W-28 trigger katmanını ölçer.
> İki katmanın sonuçları ayrı vakalarda tutulur ve birleştirilmez.

#### W-22 · SINIR: geçerli son hale düşen değer-tek UPDATE CHECK tarafından yakalanmaz
- ID: W-22
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Yalnız CHECK kısıtı olan (trigger KURULMAMIŞ) bir tabloda `measured` + `'abc123'` taşıyan satır; `UPDATE ... SET git_base_sha='def456'` — durum sütununa dokunulmaz.
- BEKLENEN GOZLEM: UPDATE GEÇER; satır `measured` + `'def456'` olur. Reddedilmesi BEKLENMEZ.
- IZIN VERILEN HUKUM: CHECK yalnız NEW satırı görür; sonuç satırı geçerli olduğu için reddedemez. **Bu bir SINIR KAYDIDIR, CHECK'in kusuru değildir** — Invaryant B'nin CHECK kapsamı dışında olduğunun testtir. Bu vakanın geçmesi, W-24'ün trigger katmanında gerekli olduğunun gerekçesidir.

#### W-23 · trigger: durumu değiştirip değeri değiştirmeyen UPDATE reddedilir
- ID: W-23
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: CHECK + BEFORE UPDATE trigger kurulu tabloda `measured` + `'abc123'` satırı; yalnız `git_base_sha_status` değiştirilir.
- BEKLENEN GOZLEM: Yazma `RAISE(ABORT)` ile reddedilir.
- IZIN VERILEN HUKUM: Durum tek başına güncellenemez. **Not:** bu girdide sonuç satırı Invaryant A'yı da ihlal edebilir; o durumda CHECK de reddeder. Trigger'ın kanıtı W-24'tür, çünkü orada sonuç satırı geçerli kalır.

#### W-24 · trigger: değeri değiştirip durumu değiştirmeyen UPDATE reddedilir
- ID: W-24
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: CHECK + trigger kurulu tabloda `measured` + `'abc123'` satırı; yalnız `git_base_sha` değeri `'def456'` yapılır. Sonuç satırı Invaryant A'ya göre GEÇERLİDİR.
- BEKLENEN GOZLEM: Yazma `RAISE(ABORT)` ile reddedilir.
- IZIN VERILEN HUKUM: Değer tek başına güncellenemez. **Bu vaka trigger katmanının BELİRLEYİCİ kanıtıdır** — W-22 aynı UPDATE'in CHECK tarafından geçirildiğini gösterir, dolayısıyla buradaki ret yalnız trigger'dan gelebilir.

#### W-25 · trigger: ikisini birlikte değiştiren meşru UPDATE geçer
- ID: W-25
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: W-23/W-24 ile AYNI koşumda, aynı trigger'lı tabloda: `measured`/`'abc123'` → `failed(timeout)`/NULL, iki sütun tek UPDATE'te birlikte değiştirilir. Ters yön (`failed(timeout)`/NULL → `measured`/`'abc123'`) de koşulur.
- BEKLENEN GOZLEM: İki yön de GEÇER.
- IZIN VERILEN HUKUM: **W-23 ve W-24'ün reddetmeleri "her şeyi reddeden kapı"dan gelmiyordur.** Bu vaka aynı koşumda geçmezse W-23 ve W-24'ün sonuçları kullanılamaz.

#### W-26 · trigger: ilgisiz bir sütunun güncellenmesi geçer
- ID: W-26
- MADDE: M4
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Trigger'lı tabloda provenance sütunlarına hiç dokunmadan `UPDATE ... SET status='paused'`.
- BEKLENEN GOZLEM: UPDATE GEÇER.
- IZIN VERILEN HUKUM: Bağlaşım trigger'ı provenance dışındaki satır güncellemelerini engellemez; run yaşam döngüsü (transition, pause) bozulmaz.

#### W-27 · YENİDEN SINIFLANDIRMA: failed(timeout) → failed(not-a-repo) reddedilir
- ID: W-27
- MADDE: M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Trigger'lı tabloda `failed(timeout)` + NULL taşıyan satır; yalnız durum `failed(not-a-repo)` yapılır. Değer iki tarafta da NULL'dur.
- BEKLENEN GOZLEM: Yazma `RAISE(ABORT)` ile reddedilir.
- IZIN VERILEN HUKUM: M4 YENİDEN SINIFLANDIRMA YASAĞI uyarınca bu ret SÖZLEŞMEYE UYGUNDUR. Bir başarısızlık sınıfı sonradan yeniden etiketlenemez; yeni ölçüm yeni run'dır. **Bu vaka, kuralın istenmeyen bir yan etki değil, kasıtlı bir kısıt olduğunu kaydeder.**

#### W-28 · POZİTİF KONTROL: trigger'sız tabloda aynı ayrık UPDATE geçer
- ID: W-28
- MADDE: M4
- SINIF: POZITIF_KONTROL
- DILIM: DILIM 1
- GIRDI: W-24 ile aynı ayrık UPDATE, trigger'ı KURULMAMIŞ ama CHECK'i aynı olan bir tabloda çalıştırılır.
- BEKLENEN GOZLEM: UPDATE GEÇER.
- IZIN VERILEN HUKUM: W-23, W-24 ve W-27'deki reddin kaynağı TRIGGER'dır — CHECK'in, NOT NULL'un ya da başka bir kısıtın yan etkisi değildir.

---

# GRUP P — M3 / M2, üretim ölçüm yolu

**Bu grup persistence API'sini değil ÜRETİM ÖLÇÜM YOLUNU çağırır.** Gerçek
git deposu kullanılır ve her sonuç, Munder'dan bağımsız doğrudan git
komutlarıyla alınan BAĞIMSIZ ORACLE ile karşılaştırılır.

#### P-01 · üç yol değeri farklıyken üçü de ayrı yazılır
- ID: P-01
- MADDE: M3, M2
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: İzolasyonlu bir run; PTY cwd'si worktree dizininin bir altdizinidir. Böylece `pty_cwd`, `git_toplevel` ve `worktree_path` üç farklı string olur.
- BEKLENEN GOZLEM: Üç sütun üç farklı değer taşır ve her biri bağımsız oracle'ın karşılık gelen ölçümüyle birebir eşittir.
- IZIN VERILEN HUKUM: Üç yol kavramı ayrı sütunlarda tutulur ve üretim yolu her birini doğru ölçer. Hüküm izolasyonlu evren için geçerlidir.

#### P-02 · üç yol değeri eşitken yine üçü ayrı yazılır
- ID: P-02
- MADDE: M3
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: İzolasyonlu bir run; PTY cwd'si tam olarak worktree kökündedir, dolayısıyla üç değer aynı string'tir.
- BEKLENEN GOZLEM: Üç sütun da doludur ve aynı değeri taşır. Hiçbiri NULL değildir, hiçbiri "diğerine eşit olduğu için" atlanmamıştır.
- IZIN VERILEN HUKUM: Eşitlik birleştirme gerekçesi değildir; üç kavram şemada ayrı kalır.

#### P-03 · izolasyon yokken worktree_path not_applicable, diğer ikisi dolu
- ID: P-03
- MADDE: M3, M2
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: `isolate:false` ile açılan bir run (UI varsayılanı), gerçek bir git deposunun kökünde.
- BEKLENEN GOZLEM: `worktree_path` durumu `not_applicable(no-isolation)` ve değeri NULL; `pty_cwd` ve `git_toplevel` `measured` ve dolu, ikisi de oracle ile eşit.
- IZIN VERILEN HUKUM: İzolasyonsuz evrende worktree kavramı yoktur ve bu, ölçüm başarısızlığından ayrı bir sınıfla kaydedilir.

#### P-04 · pty_cwd altdizin iken git_toplevel repo kökünü gösterir
- ID: P-04
- MADDE: M3
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: `isolate:false`, PTY cwd'si repo kökünün birkaç seviye altındaki bir dizin.
- BEKLENEN GOZLEM: `pty_cwd` verilen altdizini, `git_toplevel` repo kökünü taşır; ikisi farklıdır ve `git_toplevel` oracle'ın `git rev-parse --show-toplevel` çıktısıyla eşittir.
- IZIN VERILEN HUKUM: `git_toplevel` cwd'nin kopyası değil, git ile ölçülen bir değerdir.

#### P-05 · POZİTİF KONTROL: bağımsız oracle'ın kendisi çalışıyor
- ID: P-05
- MADDE: M3
- SINIF: POZITIF_KONTROL
- DILIM: FIXTURE DILIMI
- GIRDI: P grubunun kullandığı fixture repolarında, oracle git komutları (`rev-parse HEAD`, `rev-parse --abbrev-ref HEAD`, `rev-parse --show-toplevel`, `status --porcelain`) doğrudan çalıştırılır.
- BEKLENEN GOZLEM: Her komut exit 0 döner ve boş olmayan, beklenen biçimde (40 haneli hex SHA, dal adı, mutlak yol) çıktı üretir.
- IZIN VERILEN HUKUM: P grubundaki "üretim değeri oracle ile eşit" gözlemleri, iki tarafın da boş olmasından kaynaklanmıyordur.

#### P-06 · izolasyonlu evrende git_toplevel worktree dizinini gösterir
- ID: P-06
- MADDE: M3, M2
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: `isolate:true` ile açılan bir run; ana repo ile worktree farklı dizinlerde.
- BEKLENEN GOZLEM: `git_toplevel` worktree dizinini gösterir, ana repo kökünü DEĞİL; oracle'ın worktree içinde çalıştırdığı `rev-parse --show-toplevel` ile eşittir.
- IZIN VERILEN HUKUM: `git_toplevel`, `mainRepoRoot` (`--git-common-dir`) ile aynı şey değildir; ölçülen evren worktree'dir ve hüküm o adla yazılır.

#### P-07 · POZİTİF KONTROL: üretim ölçüm yolu gerçekten çağrıldı
- ID: P-07
- MADDE: M3
- SINIF: POZITIF_KONTROL
- DILIM: FIXTURE DILIMI
- GIRDI: P grubunun vakaları, git alt süreç sayacı takılıyken çalıştırılır.
- BEKLENEN GOZLEM: Run başlangıcı sırasında git alt süreç sayacı sıfırdan büyüktür.
- IZIN VERILEN HUKUM: P grubu persistence API'sine önceden hazırlanmış değerler yazıp geri okumuyordur; ölçüm fiilen yapılmıştır.

#### P-08 · izolasyonlu ve izolasyonsuz iki run farklı evren adıyla kaydedilir
- ID: P-08
- MADDE: M2
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Aynı ajan kimliği için biri `isolate:false`, diğeri `isolate:true` iki ayrı run açılır.
- BEKLENEN GOZLEM: İki run'ın `worktree_path` durumları farklıdır (`not_applicable(no-isolation)` ve `measured`) ve `git_toplevel` değerleri farklı dizinleri gösterir. İki kayıt karıştırılmaz.
- IZIN VERILEN HUKUM: Ölçülen evren run başına kaydedilir; iki run'ın provenance'ı birbirinin yerine okunamaz.

---

# GRUP D — M5 sınıflandırma

#### D-01 · detached HEAD
- ID: D-01
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Bir commit'e detached olarak checkout edilmiş gerçek repo.
- BEKLENEN GOZLEM: `base_sha` durumu `measured` ve değeri oracle'ın `rev-parse HEAD` çıktısına eşit; `branch` durumu `measured_detached` ve değeri NULL.
- IZIN VERILEN HUKUM: Detached HEAD'de SHA ölçülebilir, dal ölçülemez; ikisi ayrı sınıflarla kaydedilir.

#### D-02 · git binary yok
- ID: D-02
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Ölçüm, git'in PATH'te bulunamayacağı bir ortamda çalıştırılır (spawn `ENOENT` üretir).
- BEKLENEN GOZLEM: Her git alanı `failed(git-missing)` durumu ve NULL değer taşır.
- IZIN VERILEN HUKUM: Git'in yokluğu kendi sınıfıyla kaydedilir, sessiz bir NULL'a dönüşmez.

#### D-03 · komut sıfır dışı döndü (repo geçerli, git var)
- ID: D-03
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Git mevcut ve cwd geçerli bir repo, ancak çalıştırılan git komutu sıfır dışı çıkış kodu döndürür (örn. bozuk `.git` referansı).
- BEKLENEN GOZLEM: İlgili alan `failed(command-nonzero)` durumu ve NULL değer taşır.
- IZIN VERILEN HUKUM: Sıfır dışı çıkış, git yokluğundan ve repo olmamaktan ayrı bir sınıftır.

#### D-04 · timeout
- ID: D-04
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Git komutu, ölçümün zaman aşımı eşiğini aşacak şekilde geciktirilir.
- BEKLENEN GOZLEM: İlgili alan `failed(timeout)` durumu ve NULL değer taşır.
- IZIN VERILEN HUKUM: Zaman aşımı kendi sınıfıyla kaydedilir.

#### D-05 · cwd git reposu değil
- ID: D-05
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Git mevcut, ancak cwd hiçbir git deposunun içinde olmayan boş bir dizin.
- BEKLENEN GOZLEM: Her git alanı `failed(not-a-repo)` durumu ve NULL değer taşır.
- IZIN VERILEN HUKUM: Repo olmayan bir cwd kendi sınıfıyla kaydedilir.

#### D-06 · bare repo
- ID: D-06
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: cwd bir bare git deposudur (çalışma ağacı yoktur).
- BEKLENEN GOZLEM: İlgili alanlar `not_applicable(bare-repo)` durumu ve NULL değer taşır; `failed` ailesinden hiçbir değer yazılmaz.
- IZIN VERILEN HUKUM: Bare repo bir başarısızlık değil, kavramın uygulanamadığı bir haldir; ancak M6 uyarınca tamamlığı bozar.

#### D-07 · submodule
- ID: D-07
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: cwd bir submodule çalışma dizinidir.
- BEKLENEN GOZLEM: İlgili alanlar `not_applicable(submodule)` durumu ve NULL değer taşır.
- IZIN VERILEN HUKUM: Submodule kendi uygulanamazlık sınıfıyla kaydedilir.

#### D-08 · negatif: no-isolation failed ailesine yazılamaz
- ID: D-08
- MADDE: M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `failed(no-isolation)` yazılmaya çalışılır.
- BEKLENEN GOZLEM: Yazma reddedilir.
- IZIN VERILEN HUKUM: `no-isolation` yalnız `not_applicable` ailesine aittir ve DB bunu uygular.

#### D-09 · negatif: bare-repo failed ailesine yazılamaz
- ID: D-09
- MADDE: M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `failed(bare-repo)` yazılmaya çalışılır.
- BEKLENEN GOZLEM: Yazma reddedilir.
- IZIN VERILEN HUKUM: `bare-repo` yalnız `not_applicable` ailesine aittir.

#### D-10 · negatif: submodule failed ailesine yazılamaz
- ID: D-10
- MADDE: M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `failed(submodule)` yazılmaya çalışılır.
- BEKLENEN GOZLEM: Yazma reddedilir.
- IZIN VERILEN HUKUM: `submodule` yalnız `not_applicable` ailesine aittir.

#### D-11 · negatif: measured_detached failed ailesine yazılamaz
- ID: D-11
- MADDE: M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `failed(measured_detached)` ve `failed(detached)` yazılmaya çalışılır.
- BEKLENEN GOZLEM: İkisi de reddedilir.
- IZIN VERILEN HUKUM: `measured_detached` kendi sınıfıdır, bir başarısızlık sebebi değildir.

#### D-12 · negatif: failed sebepleri not_applicable ailesine yazılamaz
- ID: D-12
- MADDE: M5
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `not_applicable(git-missing)`, `not_applicable(command-nonzero)`, `not_applicable(timeout)`, `not_applicable(not-a-repo)` sırayla yazılmaya çalışılır. Vaka bu dört sebep üzerinde parametrelenir.
- BEKLENEN GOZLEM: Dördü de reddedilir.
- IZIN VERILEN HUKUM: Aile ayrımı çift yönlüdür; bir başarısızlık uygulanamazlık gibi kaydedilerek tamamlık bayrağı beyazlatılamaz.

#### D-13 · POZİTİF KONTROL: git-missing dışındaki D fixture'larında git gerçekten bulunur
- ID: D-13
- MADDE: M5
- SINIF: POZITIF_KONTROL
- DILIM: FIXTURE DILIMI
- GIRDI: D-01, D-03, D-04, D-05, D-06, D-07 fixture ortamlarında git ikilisi doğrudan çağrılır.
- BEKLENEN GOZLEM: `git --version` her fixture'da exit 0 ve sürüm string'i döndürür.
- IZIN VERILEN HUKUM: D grubunun sınıflandırma gözlemleri, tüm fixture'ların aslında `git-missing` olmasından kaynaklanmıyordur.

#### D-14 · timeout ile command-nonzero ayırt edilir
- ID: D-14
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Zaman aşımına uğrayan bir git komutu; öldürülen süreç ayrıca sıfır dışı bir çıkış kodu da üretir.
- BEKLENEN GOZLEM: Kaydedilen sınıf `failed(timeout)`tır, `failed(command-nonzero)` DEĞİLDİR.
- IZIN VERILEN HUKUM: İki başarısızlık sınıfı çakıştığında kayıt kök sebebi taşır; sıfır dışı çıkış kodu zaman aşımını maskelemez.

---

# GRUP U — producer semantiği (M5)

> **BU GRUP FIXTURE DİLİMİNE AİTTİR — dilim 1'de koşulmaz.** GRUP W'nin DB
> vakaları `failed(unusable-output)`'un beyaz listede olduğunu gösterir; bu grup
> onu ÜRETEN katmanı (`runGit` ve onu çağıran ölçüm yolu) ölçer. İkisi ayrı
> iddialardır ve biri diğerinin yerine geçmez.
>
> Fixture'ları M11'e tabidir: sahte git bir `.exe` OLMAK ZORUNDADIR (`.cmd`
> gölgelemez, ÖLÇÜLDÜ) ve her fixture yazdığı/tükettiği yolların scratch altında
> olduğunu fail-closed doğrular.

#### U-01 · exit 0 + boş stdout → failed(unusable-output)
- ID: U-01
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Sahte git `.exe`, sıfır çıkış kodu ve tamamen boş stdout döndürür. Üretim ölçüm yolu bir M13 alanı için çağrılır.
- BEKLENEN GOZLEM: İlgili alan `failed(unusable-output)` durumu ve NULL değer taşır. `measured` + boş string ÜRETİLMEZ.
- IZIN VERILEN HUKUM: Producer, süreç başarısını ölçüm başarısı saymaz. Ölçülmüş olgu: bugünkü kod bu girdide `current:''` üretiyordu; bu vaka o davranışın değiştiğini gösterir.

#### U-02 · exit 0 + ayrıştırılamaz stdout → failed(unusable-output)
- ID: U-02
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Sahte git `.exe`, sıfır çıkış kodu ve beklenen biçime uymayan bir stdout döndürür (örnek: SHA beklenen alanda 40-hex olmayan bir metin).
- BEKLENEN GOZLEM: İlgili alan `failed(unusable-output)` durumu ve NULL değer taşır.
- IZIN VERILEN HUKUM: Kullanılamazlık boşluktan ibaret değildir; biçim ihlali de aynı sınıfa düşer.

#### U-03 · exit 0 + geçerli çıktı → measured (AYNI KOŞUMDA)
- ID: U-03
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: U-01 ve U-02 ile AYNI koşumda, aynı sahte git `.exe` bu kez geçerli bir çıktı döndürür.
- BEKLENEN GOZLEM: İlgili alan `measured` durumu ve dolu, beklenen değeri taşır.
- IZIN VERILEN HUKUM: **U-01/U-02'nin reddetmeleri "her şeyi reddeden kapı"dan gelmiyordur.** Bu vaka aynı koşumda geçmezse U-01 ve U-02'nin sonuçları kullanılamaz.

#### U-04 · POZİTİF KONTROL: sahte git gerçekten çağrıldı
- ID: U-04
- MADDE: M5, M11
- SINIF: POZITIF_KONTROL
- DILIM: FIXTURE DILIMI
- GIRDI: U-01..U-03 koşarken sahte git her çağrıda kendi dump dosyasına argv, cwd ve ortamını yazar; ayrıca git alt süreç sayacı okunur.
- BEKLENEN GOZLEM: Beklenen sayıda dump dosyası oluşur, `execPath` scratch altındaki sahte `.exe`yi gösterir ve sayaç sıfırdan büyüktür.
- IZIN VERILEN HUKUM: U grubunun gözlemleri gerçek git'in cevapladığı bir koşumdan gelmiyordur. Ölçülmüş olgu: `.cmd` shim'i PATH'te ilk sırada olmasına rağmen hiç çağrılmamış ve gerçek git cevaplamıştı; bu kontrol o sessiz başarısızlığı yakalar.

#### U-05 · ALAN BAZINDA boş çıktı semantiği tablosu üretilir
- ID: U-05
- MADDE: M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: M13'ün beş alanının her biri için, boş çıktının meşru "yok" mu yoksa `unusable` mı olduğu producer ölçülerek belirlenir (örnek: upstream sorgusu upstream yokken meşru olarak boş döner).
- BEKLENEN GOZLEM: Beş alanın her biri için "boş çıktı = meşru yok" veya "boş çıktı = unusable" kararı ölçümle üretilir ve tabloya yazılır. Karar verilemeyen alan ÖLÇÜLMEDİ olarak işaretlenir, varsayılan bir sınıfa atanmaz.
- IZIN VERILEN HUKUM: M5'in KAPSAM SINIRI bu dilimde kapanır. **Bugün bu eşleme TANIMSIZDIR ve ÖLÇÜLMEDİ olarak taşınır**; bu vaka onu tanımlamayı zorunlu kılar, tanımı önceden VERMEZ.

---

# GRUP C — M1 checkpoint

#### C-01 · checkpoint_sha run-start ölçümüyle birebir eşit
- ID: C-01
- MADDE: M1
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: `base_sha` ölçülmüş bir run açılır, sonra safe quit yapılır.
- BEKLENEN GOZLEM: `checkpoint_sha` değeri run'ın `base_sha` değerine karakter karakter eşittir. Eşit değilse vaka düşer.
- IZIN VERILEN HUKUM: Checkpoint SHA'sı run-start değerinin kopyasıdır.

#### C-02 · checkpoint_sha_source run-start-copy'dir
- ID: C-02
- MADDE: M1
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: C-01 ile aynı run.
- BEKLENEN GOZLEM: `checkpoint_sha_source` = `'run-start-copy'`.
- IZIN VERILEN HUKUM: Checkpoint kendi kaynağını beyan eder; okuyucu bunun bir kopya olduğunu kayıttan öğrenir, koddan çıkarmak zorunda kalmaz.

#### C-03 · measured-at-checkpoint yazma girişimi v1'de reddedilir
- ID: C-03
- MADDE: M1
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `checkpoint_sha_source` alanına `'measured-at-checkpoint'` yazılmaya çalışılır.
- BEKLENEN GOZLEM: Yazma reddedilir.
- IZIN VERILEN HUKUM: v1'de checkpoint anında ölçüm yoktur ve bu kayıt düzeyinde uygulanır; şema değeri tanır ama v1 yazmasına izin vermez.

#### C-04 · quit yolunda git süreci başlatılmaz
- ID: C-04
- MADDE: M1
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Açık run'ları olan bir uygulama, git alt süreç sayacı takılıyken safe quit yapar. Sayaç quit'ten hemen önce sıfırlanır.
- BEKLENEN GOZLEM: Quit tamamlandığında sayaç sıfırdır.
- IZIN VERILEN HUKUM: Safe quit senkron ve gözlem-yapmayan kalır; quit bir git sondasında bloke olamaz.

#### C-05 · POZİTİF KONTROL: aynı sayaç run-start yolunda sıfır değil
- ID: C-05
- MADDE: M1
- SINIF: POZITIF_KONTROL
- DILIM: FIXTURE DILIMI
- GIRDI: C-04'ün kullandığı aynı git alt süreç sayacı, run başlangıcı sırasında okunur.
- BEKLENEN GOZLEM: Sayaç sıfırdan büyüktür.
- IZIN VERILEN HUKUM: C-04'ün sıfır sonucu, sayacın hiç çalışmamasından kaynaklanmıyordur.

#### C-06 · run-start failed ise checkpoint da failed kopyalar
- ID: C-06
- MADDE: M1, M5
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: `base_sha` alanı `failed(not-a-repo)` ile kaydedilmiş bir run, sonra safe quit.
- BEKLENEN GOZLEM: `checkpoint_sha` durumu `failed(not-a-repo)` ve değeri NULL; `checkpoint_sha_source` = `'run-start-copy'`.
- IZIN VERILEN HUKUM: Kopya, başarısızlığı da kopyalar; checkpoint bir başarısızlığı boşluğa çevirmez.

#### C-07 · run-start not_applicable ise checkpoint aynı sınıfı kopyalar
- ID: C-07
- MADDE: M1, M5
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: `worktree_path` alanı `not_applicable(no-isolation)` olan bir run, sonra safe quit.
- BEKLENEN GOZLEM: Checkpoint tarafındaki karşılık gelen alan aynı sınıfı taşır; `failed` ailesine dönüşmez, `measured` olmaz.
- IZIN VERILEN HUKUM: Kopyalama sınıf koruyucudur; aile değişimi kopyalama sırasında da yasaktır.

#### C-08 · checkpoint_sha M4'e tabi değildir; kopyalanmamış bir değer reddedilir
- ID: C-08
- MADDE: M1, M4
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `git_base_sha` alanı `measured` + `'abc123'` olan bir run safe quit ile duraklatılır; sonra `checkpoint_sha` alanına run-start değerinden FARKLI, bağımsız bir değer (`'zzz999'`) yazılmaya çalışılır. `checkpoint_sha` için bir durum sütunu YOKTUR ve aranmaz.
- BEKLENEN GOZLEM: Yazma reddedilir; `checkpoint_sha` run-start değerine (`'abc123'`) eşit kalır ve `checkpoint_sha_source` = `'run-start-copy'` olarak durur.
- IZIN VERILEN HUKUM: M4 beyaz listesi YALNIZ M13 alan ailesine uygulanır; `checkpoint_sha` M4'e TABİ DEĞİLDİR, M1'in kopyalama kuralına tabidir ve kendi ölçüm durumu alanı taşımaz. **ENFORCEMENT SINIRI: bu reddi hangi katmanın uygulayacağı BU BELGEDE TANIMLI DEĞİLDİR.** Bu alanda DB CHECK YOKTUR (ölçüldü: `checkpoint_sha_status` sütunu hiçbir yerde tanımlı değil), dolayısıyla **"DB bu yazıyı reddeder" hükmü KURULAMAZ**. Reddi uygulayacak yüzey (persistence API'si mi, trigger mı, başka bir katman mı) ÖLÇÜLMEDİ ve bu vaka onu ÖLÇÜLMEDİ olarak taşır. Bu vaka `checkpoint_dirty_state`'i KAPSAMAZ.

#### C-09 · checkpoint_sha_source beyaz listesi kapalıdır
- ID: C-09
- MADDE: M1
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: `checkpoint_sha_source` alanına iki tanımlı değerin dışında bir string (`'copied'`, `''`, `'unknown'`) yazılmaya çalışılır.
- BEKLENEN GOZLEM: Her denemede yazma reddedilir.
- IZIN VERILEN HUKUM: Kaynak beyanı kapalı bir kümedir; okuyucu iki değerden birini görmeyi garanti edebilir.

---

# GRUP F — M6 provenance_complete

#### F-01 · base_sha failed olduğunda bayrak false
- ID: F-01
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Yalnız `base_sha` alanı `failed(command-nonzero)`, diğer tüm git alanları `measured` olan bir run.
- BEKLENEN GOZLEM: `provenance_complete` = false.
- IZIN VERILEN HUKUM: Tek bir alanın başarısızlığı tamamlığı bozar.

#### F-02 · branch failed olduğunda bayrak false
- ID: F-02
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Yalnız `branch` alanı `failed(command-nonzero)`, diğerleri `measured`.
- BEKLENEN GOZLEM: `provenance_complete` = false.
- IZIN VERILEN HUKUM: Kural alan bağımsızdır; `branch` de tamamlığa dahildir.

#### F-03 · pty_cwd failed olduğunda bayrak false
- ID: F-03
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Yalnız `pty_cwd` alanı `failed(not-a-repo)`, diğerleri `measured`.
- BEKLENEN GOZLEM: `provenance_complete` = false.
- IZIN VERILEN HUKUM: `pty_cwd` de tamamlığa dahildir.

#### F-04 · git_toplevel failed olduğunda bayrak false
- ID: F-04
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Yalnız `git_toplevel` alanı `failed(timeout)`, diğerleri `measured`.
- BEKLENEN GOZLEM: `provenance_complete` = false.
- IZIN VERILEN HUKUM: `git_toplevel` de tamamlığa dahildir.

#### F-05 · worktree_path failed olduğunda bayrak false
- ID: F-05
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Yalnız `worktree_path` alanı `failed(git-missing)`, diğerleri `measured`.
- BEKLENEN GOZLEM: `provenance_complete` = false.
- IZIN VERILEN HUKUM: `worktree_path` de tamamlığa dahildir; `not_applicable(no-isolation)` ile `failed` aynı sonucu vermez.

#### F-06 · tüm alanlar measured ise bayrak true
- ID: F-06
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Beş git alanının hepsi `measured` ve dolu olan bir run.
- BEKLENEN GOZLEM: `provenance_complete` = true.
- IZIN VERILEN HUKUM: Tam ölçülmüş bir run provenance gerektiren hüküm için kullanılabilir.

#### F-07 · detached bayrağı bozmaz
- ID: F-07
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: `branch` alanı `measured_detached` + NULL, diğerleri `measured`.
- BEKLENEN GOZLEM: `provenance_complete` = true.
- IZIN VERILEN HUKUM: Detached HEAD tam ölçülmüş bir haldir; dal yokluğu ölçüm eksikliği değildir.

#### F-08 · not_applicable(no-isolation) bayrağı bozmaz
- ID: F-08
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: `worktree_path` alanı `not_applicable(no-isolation)` + NULL, diğerleri `measured`.
- BEKLENEN GOZLEM: `provenance_complete` = true.
- IZIN VERILEN HUKUM: İzolasyonsuz run beklenen bir haldir ve tam sayılır.

#### F-09 · not_applicable(bare-repo) bayrağı bozar
- ID: F-09
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Bir alan `not_applicable(bare-repo)` + NULL, diğerleri `measured`.
- BEKLENEN GOZLEM: `provenance_complete` = false.
- IZIN VERILEN HUKUM: Bare repo "ölçülemedi" halidir; aynı `not_applicable` ailesinde olması onu `no-isolation` ile aynı sonuca götürmez.

#### F-10 · not_applicable(submodule) bayrağı bozar
- ID: F-10
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: Bir alan `not_applicable(submodule)` + NULL, diğerleri `measured`.
- BEKLENEN GOZLEM: `provenance_complete` = false.
- IZIN VERILEN HUKUM: Submodule "ölçülemedi" halidir.

#### F-11 · POZİTİF KONTROL: bayrak false iken run gerçekten başlar ve PTY açılır
- ID: F-11
- MADDE: M6
- SINIF: POZITIF_KONTROL
- DILIM: FIXTURE DILIMI
- GIRDI: Git ölçümünün başarısız olacağı bir ortamda (D-02 fixture'ı) gerçek bir agent spawn edilir.
- BEKLENEN GOZLEM: Spawn `ok:true` döner, PTY listesinde canlı bir kayıt vardır ve run satırı `provenance_complete=false` taşır.
- IZIN VERILEN HUKUM: Execution fail-open gerçekten fail-open'dır; ölçüm başarısızlığı çalışmayı engellemez. F grubunun false gözlemleri, run'ın hiç başlamamasından kaynaklanmıyordur.

#### F-12 · provenance_complete elle yazılamaz
- ID: F-12
- MADDE: M6
- SINIF: REDDETME
- DILIM: DILIM 1
- GIRDI: Alan durumları false gerektirirken `provenance_complete` doğrudan true yazılmaya çalışılır.
- BEKLENEN GOZLEM: Yazma reddedilir veya türetilmiş değer kazanır; geri okunan değer false'tur.
- IZIN VERILEN HUKUM: Bayrak mekanik türetilir; bir yazıcı onu alan durumlarından bağımsız olarak beyazlatamaz.

#### F-13 · bayrak okuma yüzeyinden erişilebilir
- ID: F-13
- MADDE: M6
- SINIF: KABUL
- DILIM: DILIM 1
- GIRDI: `provenance_complete` değeri false ve true olan iki run.
- BEKLENEN GOZLEM: Run okuma yüzeyi (`getRun` benzeri) her iki run için bayrağı doğru değeriyle döndürür.
- IZIN VERILEN HUKUM: Faz 1B'nin taahhüdü — bayrağı TAŞINABİLİR kılmak — karşılanmıştır. Bu, bayrağın UYGULANDIĞI anlamına GELMEZ; bkz. AÇIK BORÇ.

---

# GRUP S — M7 resume sınırı

> Bu grubun tamamı asgari listede yoktu; M7'nin sıfır vakalı kalmaması için eklendi.

#### S-01 · devam eden run kendi ölçümünü yapar
- ID: S-01
- MADDE: M7
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: `base_sha = X` ile duraklatılmış bir run. Aynı cwd'de repo HEAD'i `Y`ye ilerletilir, sonra run resume edilir.
- BEKLENEN GOZLEM: Çocuk run'ın `base_sha` değeri `Y`dir, `X` DEĞİLDİR; ve oracle'ın o andaki `rev-parse HEAD` çıktısına eşittir.
- IZIN VERILEN HUKUM: Devam eden run ebeveyninin git değerlerini devralmaz; kendi ölçümünü yapar. Faz 1A'daki `baseSha: overrides.baseSha ?? null` boşluğu kapanmıştır.

#### S-02 · ebeveyn measured, çocuk failed ise çocuk failed taşır
- ID: S-02
- MADDE: M7, M5
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: `base_sha` `measured` olan duraklatılmış bir run; resume anında ölçüm başarısız olacak şekilde ortam bozulur (repo dizini kaldırılır).
- BEKLENEN GOZLEM: Çocuk run `failed(not-a-repo)` + NULL taşır; ebeveynin dolu değeri KOPYALANMAZ.
- IZIN VERILEN HUKUM: Devralmama kuralı başarısızlık durumunda da geçerlidir; ebeveynin başarısı çocuğun başarısızlığını örtmez.

#### S-03 · POZİTİF KONTROL: çocuk için git ölçüm sayacı artar
- ID: S-03
- MADDE: M7
- SINIF: POZITIF_KONTROL
- DILIM: FIXTURE DILIMI
- GIRDI: Ebeveyn ve çocuk aynı cwd'de, repo hiç değişmemiş. Git alt süreç sayacı resume'dan hemen önce sıfırlanır.
- BEKLENEN GOZLEM: Değerler ebeveynle aynı çıkar (repo değişmediği için) ANCAK sayaç sıfırdan büyüktür.
- IZIN VERILEN HUKUM: Değer eşitliği kopyalamanın kanıtı değildir; ölçüm gerçekten yeniden yapılmıştır.

#### S-04 · çocuğun provenance_complete'i kendi ölçümünden türetilir
- ID: S-04
- MADDE: M7, M6
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: `provenance_complete = true` olan bir ebeveyn; resume anında ölçümün başarısız olacağı bir ortam.
- BEKLENEN GOZLEM: Çocuk run `provenance_complete = false` taşır; ebeveynin true'su devralınmaz.
- IZIN VERILEN HUKUM: Tamamlık bayrağı run başınadır ve zincir boyunca miras alınmaz.

---

# GRUP R — M9 yarış sınırı

> **Bu bir analiz notu değil, koşulabilir testtir.**

#### R-01 · ölçüm ile spawn arasındaki pencerede HEAD değişir
- ID: R-01
- MADDE: M9
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: Ölçüm ile PTY spawn arasına kontrollü bir gecikme enjekte edilir. O pencerede, ölçülen cwd'nin işaret ettiği worktree'nin HEAD'i harici bir git komutuyla başka bir commit'e taşınır.
- BEKLENEN GOZLEM: Kaydedilen provenance YA PTY'nin fiilen açıldığı andaki gerçek HEAD'i gösterir, YA DA `provenance_complete = false` taşır ve ölçüm penceresi kaydedilir. Eski değeri sessizce doğru gibi sunarsa vaka DÜŞER.
- IZIN VERILEN HUKUM: Yarış penceresinde sistem ya doğru değeri verir ya bilmediğini beyan eder; hiçbir durumda bayat bir değeri PROVEN gibi sunmaz.

#### R-02 · araya girebilecek yollar sayılır ve her biri adıyla elenir
- ID: R-02
- MADDE: M9
- SINIF: KABUL
- DILIM: YOK (kaynak-inceleme yükümlülüğü)
- GIRDI: Ölçüm anı ile PTY'nin açıldığı an arasındaki kod yolu okunur ve o pencerede cwd'nin işaret ettiği hedefi (worktree kimliği, HEAD, dal) değiştirebilecek TÜM yollar sayılır: aynı süreçteki eşzamanlı spawn'lar, worktree GC/teardown süpürmesi, ephemeral worker watcher, hive router, kullanıcının harici git işlemleri, ajanın kendi git komutları.
- BEKLENEN GOZLEM: Sayılan her yol için ya adıyla elenmiş bir gerekçe (o yolun bu pencereye giremeyeceğinin kanıtı) ya da R-01 sınıfında koşulabilir bir vaka üretilir. Sayım listesi boş bırakılamaz; "kod öyle görünüyor" gerekçe sayılmaz.
- IZIN VERILEN HUKUM: Yarışın mümkün OLMADIĞI hükmü ancak bu sayım tamamlanıp her üye elendiğinde kurulabilir. Sayım eksikse hüküm kurulmaz.

#### R-03 · ölçüm ile spawn arasındaki pencerede dal değişir
- ID: R-03
- MADDE: M9
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: R-01 ile aynı gecikme penceresi; bu kez HEAD sabit kalır ve `git switch` ile dal değiştirilir.
- BEKLENEN GOZLEM: R-01 ile aynı kabul kriteri, `branch` alanı için.
- IZIN VERILEN HUKUM: Yarış koruması SHA'ya özgü değildir; dal alanı için de geçerlidir.

#### R-04 · ölçüm ile spawn arasındaki pencerede worktree silinip yeniden oluşturulur
- ID: R-04
- MADDE: M9
- SINIF: KABUL
- DILIM: FIXTURE DILIMI
- GIRDI: R-01 ile aynı gecikme penceresi; bu kez ölçülen worktree `git worktree remove --force` ile kaldırılıp aynı yola yeniden eklenir, böylece yol aynı kalırken worktree KİMLİĞİ değişir.
- BEKLENEN GOZLEM: R-01 ile aynı kabul kriteri. Yolun değişmemiş olması, kaydın geçerli sayılması için yeterli DEĞİLDİR.
- IZIN VERILEN HUKUM: Değişmez olan cwd string'idir, işaret ettiği hedef değildir; sistem bu ayrımı gözetir.

#### R-05 · POZİTİF KONTROL: gecikme enjeksiyonu gerçekten çalışıyor
- ID: R-05
- MADDE: M9
- SINIF: POZITIF_KONTROL
- DILIM: FIXTURE DILIMI
- GIRDI: R-01, R-03, R-04'ün kullandığı gecikme enjeksiyonu açık ve kapalıyken ölçüm-spawn penceresi süresi ölçülür.
- BEKLENEN GOZLEM: Enjeksiyon açıkken pencere, kapalı hâline göre enjekte edilen süre kadar uzundur; ve pencere sırasında harici git komutunun fiilen çalıştığı bağımsız olarak doğrulanır.
- IZIN VERILEN HUKUM: R grubunun "yarış gözlenmedi" sonuçları, enjeksiyonun hiç ateşlememesinden kaynaklanmıyordur.

---

# AÇIK BORÇ (vaka değildir, sayıma dahil edilmez)

**Measurement Layer YOKTUR.**

M6, `provenance_complete = false` olan bir run'dan provenance gerektiren
PROVEN hüküm KURULAMAZ der. Bu planda bu reddi mekanik uygulayan hiçbir
vaka yoktur, çünkü uygulayacak katman henüz yazılmamıştır.

Faz 1B'nin bu konudaki taahhüdü F-13 ile sınırlıdır: bayrak taşınabilir
ve okunabilirdir. **"Kural var" != "kural uygulanıyor".**

Bu borç kapanana kadar, `provenance_complete` bayrağına dayanan her
hüküm insan disiplinine bağlıdır, mekanik korumaya değil.
