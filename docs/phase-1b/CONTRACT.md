# Mission Control — Faz 1B: Git Evidence Sözleşmesi

**Durum:** kapandı
**Bağlandığı SHA:** `4634762417f75f5bff181eedc84187c6ca8f442c`
**Dal:** `mission-control/phase-1a-run-event-store`

Bu dosya sözleşme maddelerinin kanonik metnidir. Maddeler kalıcı kimlik taşır
(M1, M2, M3, M4, M5, M6, M7, M9, M10, M11, M12, M13, M14, M15). Kimlikler
verildikten sonra değişmez ve yeniden kullanılmaz.

**M8 numarası bu sözleşmede yoktur.** M2 ve M7 önceki sürümden korunmuştur;
atlanmış değildirler.

Her maddenin test kapsamı [TEST-PLAN.md](TEST-PLAN.md) dosyasındadır.

---

## M1 — İKİ AYRI ÖLÇÜM NOKTASI

run-start provenance: run başlarken, PTY'nin fiilen kullanacağı cwd
üzerinde bir kez ölçülür. checkpoint provenance: quit yolunda git
ÇALIŞTIRILMAZ; checkpoint run-start değerinin kopyasıdır ve
`checkpoint_sha_source` alanıyla bunu beyan eder
(`'run-start-copy'` | `'measured-at-checkpoint'`). v1'de değer her zaman
`'run-start-copy'`dir; `'measured-at-checkpoint'` yazma girişimi v1'de
REDDEDİLİR. Checkpoint değerinden "checkpoint anındaki durum" hükmü
kurulamaz.

### KOPYALAMA KÜMESİ

Faz 1B'de checkpoint tarafına kopyalanan alan kümesi TAM OLARAK
ŞUDUR:

```
git_base_sha  ->  checkpoint_sha
```

Başka hiçbir M13 alanının checkpoint karşılığı YOKTUR.
`git_branch`, `git_toplevel`, `git_pty_cwd` ve `git_worktree_path`
için checkpoint sütunu OLUŞTURULMAZ.

**GEREKÇE:** checkpoint, quit yolunda git ÇALIŞTIRMAMA kararının
sonucudur (M1 ÖLÇÜM ANI). Run-start'ta ölçülen değerler zaten aynı
satırda durur ve okunabilir. Beş alanı da kopyalamak veriyi İKİLER
ve "hangi kopya taze" sorusunu doğurur — bu soru M1'in çözmek için
kurulduğu sorunun kendisidir.

**KOPYANIN NEYİ TAŞIDIĞI:** checkpoint tarafında DURUM SÜTUNU YOKTUR
(M4 KAPSAM). Checkpoint, run-start DURUMUNU yeniden KODLAMAZ.
Kopyalanan şey yalnızca DEĞERDİR; sınıf her zaman run-start durum
sütununda (`git_base_sha_status`) kalır ve yalnız oradan okunur.

**"Sınıf koruyuculuk" ifadesi, checkpoint tarafında bir sınıf
saklandığı anlamına GELMEZ.** Böyle okunursa olmayan bir
`checkpoint_sha_status` fikri arka kapıdan geri gelir.

**M15 GEREĞİ: bu küme SAYILMIŞTIR.** "Checkpoint run-start'ın
kopyasıdır" ifadesi tek başına bir küme tanımlamaz.

**KAPSAM — İKİ SINIR.** (1) Bu karar Faz 1B içindir. İleride başka
bir alanın checkpoint karşılığı gerekirse M1 genişletilir ve küme
yeniden sayılır. (2) Bu küme M13 ALANLARININ checkpoint
karşılıklarını sayar; `checkpoint_dirty_state` bir M13 alanının
karşılığı DEĞİLDİR (v2 sütunudur) ve onun kopyalanıp
kopyalanmayacağı M4 KAPSAM'da AÇIKÇA KARARA BAĞLANMAMIŞTIR — bu
bölüm o soruyu KAPATMAZ.

---

### SÜTUN MUHASEBESİ

`checkpoint_sha_source` Faz 1B'nin eklediği YENİ bir sütundur ve v2
şemasında YOKTUR.

KAPSAM: bu, `src/main/runs.ts` üzerinde grep ile ölçüldü (`grep -c` = 0)
ve `runs.ts`'in `runs` şemasının DDL otoritesi olduğu discovery turunda
ayrıca ölçülmüştü (DDL yazan iki yer: `db.ts` MIGRATIONS ve
`runs.ts:applyRunSchema`). Üretim DB'sinin fiilî şema dökümü üzerinde
ÖLÇÜLMEDİ.

Bu sütun M13 alan ailesine dahil DEĞİLDİR ve M13'ün "11 yeni sütun"
muhasebesine girmez.

İzinli değerleri: `'run-start-copy'` | `'measured-at-checkpoint'`.
v1'de yalnız `'run-start-copy'` üretilir.

---

## M2 — ÖLÇÜLEN EVREN

Ölçüm, run'ın çalışacağı cwd'dir — izolasyon başarılıysa worktree,
değilse kullanıcının cwd'si. İkisi farklı evrendir; hüküm hangisinde
ölçüldüyse onun adıyla yazılır.

---

## M3 — ÜÇ AYRI YOL DEĞERİ, ÜÇ AYRI SÜTUN

`git_pty_cwd` = PTY'ye fiilen verilen dizin.
`git_toplevel` = o cwd'de git ile ÖLÇÜLEN repo kökü.
`git_worktree_path` = yalnız izolasyon yöneticisi worktree oluşturduysa
onun ürettiği yol; aksi halde `not_applicable` — izolasyon yoksa
`git_worktree_path_status` alanı `not_applicable(no-isolation)` alır.
Üçü eşit olduğunda bile ayrı yazılır.

**KAPSAM SINIRI:** yukarıdaki cümleden "`git_worktree_path` için tek
mümkün `not_applicable` sebebi `no-isolation`'dır" sonucu ÇIKMAZ.
M5'te tanımlı diğer `not_applicable` sebepleri (`bare-repo`,
`submodule`) bu alan için de geçerli olabilir. **ÖLÇÜLDÜ (bu belgenin
metni üzerinde):** M5 ve M6, `not_applicable` sebeplerini alan bazında
KISITLAMIYOR — hangi sebebin hangi alana yazılabileceğine dair bir
kural bu belgede YOKTUR ve o eşleme ÖLÇÜLMEDİ.

Bu adlar M13 alan ailesine aittir. Aynı kavramın legacy karşılıkları
(`base_sha`, `branch`, `worktree_path`) M13 LEGACY AYRIMI bölümünde
tanımlıdır ve M3'ün konusu DEĞİLDİR.

---

## M4 — DURUM VE DEĞER AYRILAMAZ

Her git alanı için durum ve değer AYNI kayıtta, AYNI transaction'da
yazılır. İzinli kombinasyonlar BEYAZ LİSTE olarak sayılır ve listede
olmayan her kombinasyon YAZMA ANINDA DB CHECK ile reddedilir:

| durum | değer kısıtı |
|---|---|
| `measured` | değer DOLU olmak ZORUNDA |
| `measured_detached` | yalnız `git_branch_status` için; değer NULL ZORUNDA |
| `failed(<sebep>)` | değer NULL ZORUNDA |
| `not_applicable(<sebep>)` | değer NULL ZORUNDA |
| `never_measured` | değer NULL ZORUNLU |

`<sebep>` serbest string DEĞİLDİR; sabit listedir.

Durum alanı tek başına güncellenemez; değer alanı tek başına
güncellenemez.

### `never_measured`

Bu bir `failed` sebebi DEĞİLDİR, ayrı bir durum ailesidir: Faz 1B'den
önce oluşmuş run'ların alanları için. Ölçüm penceresi geçmiştir.
`measured` değildir, `failed` değildir (başarısız olan bir ölçüm
yoktu), `not_applicable` değildir (uygulanamaz olan bir şey yoktu).

**SEVİYE:** `never_measured` ALAN DÜZEYİNDEDİR, run düzeyinde değil.

**KAPSAM:** `never_measured` YALNIZ M13'te tanımlanan YENİ provenance
alanlarına uygulanır. Mevcut `base_sha`, `branch`, `worktree_path`
sütunlarına UYGULANMAZ.

### KAPSAM

M4 beyaz listesi YALNIZ M13 alan ailesine uygulanır.

`checkpoint_sha` M4'e TABİ DEĞİLDİR; M1'in kopyalama kuralına
tabidir — değeri run-start ölçümünden KOPYALANIR ve kendi ölçüm
durumu alanı TAŞIMAZ.

`checkpoint_sha_source` kopyanın KAYNAĞINI beyan eder; bir ölçüm
durumu DEĞİLDİR.

`checkpoint_dirty_state` de M4'e TABİ DEĞİLDİR. Ancak bu alanın
run-start'tan KOPYALANDIĞI İDDİA EDİLMEZ — o iddia bu belgede
hiçbir yerde ölçülmedi. `checkpoint_dirty_state`'in semantiği
sözleşmede halihazırda nasıl tanımlıysa ÖYLE KALIR; bu bölüm
yalnız onun M4 beyaz listesine tabi OLMADIĞINI söyler.

**`checkpoint_dirty_state`'in kopyalanıp kopyalanmayacağı ÖLÇÜLMEDİ
ve bu turda KARARA BAĞLANMADI.**

**`checkpoint_` ÖNEKİ SEMANTİK AİLE DEĞİLDİR:** `checkpoint_sha`,
`checkpoint_sha_source` ve `checkpoint_dirty_state` ÜÇ AYRI
KAVRAMDIR. Sırf adlarında `checkpoint_` geçtiği için aynı kurala
sokulamaz — bu, bu belgenin ilk maddesinin ihlali olurdu (isim
davranış kanıtı değildir).

### ENFORCEMENT BÖLÜNMESİ

M4 İKİ AYRI INVARYANT içerir ve bunlar AYRI KATMANLARDA uygulanır.
"Aynı transaction'da yazılır" ifadesi tek başına yetersizdir;
hangi invaryantın hangi katmanda uygulandığı ADIYLA yazılır.

**INVARYANT A — DURUM GEÇERLİLİĞİ (state grammar)**
Bir satırın SON HALİNDEKİ durum/değer kombinasyonu izinli mi.
UYGULAYAN KATMAN: sütun-düzeyi CHECK kısıtı.
ÖLÇÜLDÜ: 23/23 vaka, iki tasarımda, 0 ifade edilemeyen vaka
(SQLite 3.49.2 / better-sqlite3 11.10.0).
KAPSAM: scratch in-memory DB; iki temsilci alan (`git_base_sha`
non-branch, `git_branch` branch) — beş M13 alanının HEPSİNDE
ÖLÇÜLMEDİ; üretim DB'sinde (`harness.db`) ÖLÇÜLMEDİ; performans
ÖLÇÜLMEDİ.

**INVARYANT B — GÜNCELLEME BAĞLAŞIMI (update coupling)**
Durum ve değer birbirinden BAĞIMSIZ değiştirilemez.
UYGULAYAN KATMAN: BEFORE UPDATE trigger (`RAISE(ABORT)`).
CHECK BU INVARYANTI UYGULAYAMAZ — ölçüldü: normal satır CHECK'i
OLD değeri GÖRMEZ; geçerli bir son hale düşen değer-tek UPDATE
geçer. Generated column da OLD'u göremez.
(SQLite 3.49.2 / better-sqlite3 11.10.0)
KAPSAM: scratch in-memory DB; TEK alan (`git_base_sha`); tek satırlık
senaryolar. Beş alanda ve çoklu-alan trigger'ında ÖLÇÜLMEDİ; üretim
DB'sinde ÖLÇÜLMEDİ; toplu (batch) UPDATE'te ÖLÇÜLMEDİ; `RAISE(ABORT)`'un
iç içe transaction geri alma davranışı ÖLÇÜLMEDİ.

BU BÖLÜNME BİR TASARIM TERCİHİ DEĞİL, ÖLÇÜLEN BİR SINIRDIR.
CHECK'in Invaryant B'yi uygulayamaması, Invaryant A'yı
uygulayamadığı anlamına GELMEZ.

### ENFORCEMENT KATMANI SINIRI

M4'ün DB katmanı YALNIZ YAPISAL DURUM GRAMERİNİ uygular:

- durum değeri izinli alfabede mi (CHECK)
- durum ile değer kombinasyonu izinli mi: `measured` → değer DOLU,
  diğerleri → değer NULL (CHECK)
- `measured_detached` yalnız `git_branch_status`'ta mı (CHECK)
- durum ve değer bağlaşımı: BEFORE UPDATE trigger, OLD → NEW geçişini
  görür ve EŞLEŞMEMİŞ alan değişimini reddeder (trigger)

**BAĞLAŞIMIN DOĞRU İFADESİ — ÖLÇÜLDÜ.** Bağlaşım "aynı transaction"
DEĞİLDİR. Trigger'ın uyguladığı şey şudur: aynı satırın TEK İZİNLİ
OLD→NEW güncelleme geçişinde durum ve değer BİRLİKTE değişir.
Bağımsız durum-tek veya değer-tek UPDATE REDDEDİLİR — iki ayrı UPDATE
aynı transaction içinde yapılsa bile İLK GEÇİŞ yasadışı olduğu için
düşer. **"Aynı transaction" ifadesi bu davranışı tarif etmez ve
enforcement kilidi içinde KULLANILMAZ.**
(Ölçüm: sonda turu, SQLite 3.49.2 / better-sqlite3 11.10.0, scratch
in-memory DB, tek alan `git_base_sha`; beş alanda ÖLÇÜLMEDİ.)

**SEBEP-ALAN UYGUNLUĞU DB'DE ZORLANMAZ.** `failed(<sebep>)` ve
`not_applicable(<sebep>)` ifadelerinin HANGİ ALANDA anlamlı olduğu
PRODUCER/UYGULAMA SEMANTİĞİDİR ve FIXTURE DİLİMİNDE tanımlanacaktır.
DB, `git_base_sha` alanına `not_applicable(no-isolation)` yazılmasını
YAPISAL olarak kabul eder; o yazmanın ANLAMLI olup olmadığını DB
DEĞİL producer belirler.

**SONUÇ:** sebep-alan eşlemesinin tanımsız olması, DİLİM 1'in
şemasını, CHECK ifadesini, trigger'ını veya göçünü DEĞİŞTİRMEZ.
Bu hüküm YALNIZ bu madde yürürlükteyken geçerlidir; eşlemenin ileride
DB'de zorlanmasına karar verilirse şema tasarımı YENİDEN AÇILIR.

**"AYNI TRANSACTION" İFADESİNİN OKUNMASI.** Bu ifade sözleşmede iki
yerde geçer: M4 madde girişinde ("durum ve değer AYNI kayıtta, AYNI
transaction'da yazılır") ve ENFORCEMENT BÖLÜNMESİ'nde ("tek başına
YETERSİZDİR"). Madde girişindeki ifade yasal yolu doğru tarif eder
(tek bağlaşık UPDATE tek transaction'dadır) ama YETERLİ KOŞUL
DEĞİLDİR — bunu ENFORCEMENT BÖLÜNMESİ zaten söylüyor. Tarihsel metin
DEĞİŞTİRİLMEDİ; enforcement kilidi bu bölümdür ve mekanizmayı OLD→NEW
geçişi olarak tarif eder. Çelişki YOKTUR: giriş cümlesi eksik bir
tarif, bu bölüm tam tarifidir.

### DURUM TEMSİLİ

Durum tek TEXT sütununda tutulur; sebep durum string'inin içinde
parantezle gömülüdür (örnek: `'failed(timeout)'`).
Ayrı bir `<alan>_reason` sütunu KULLANILMAZ.

**GEREKÇE (ölçüldü, SQLite 3.49.2 / better-sqlite3 11.10.0):** ayrı
sebep sütunu tasarımının naive hali iki vakada SESSİZCE izin verdi —
`reason IN (...)` ifadesi `reason` NULL iken NULL döner ve SQL CHECK
yalnız FALSE'ta ihlal sayar. Bu delik bir `IS NOT NULL` guard'ı ile
kapatılabilir, ama kapalı kalması o guard'ı hatırlamaya bağlıdır. Tek
sütunlu temsilde delik YAPISAL OLARAK yoktur.

KAPSAM: scratch in-memory DB; iki temsilci alan. Gözlenen iki
başarısız vakadır; ayrı-sebep tasarımında BAŞKA bir NULL-yayılım
deliği kalmadığı ÖLÇÜLMEDİ. Tek sütunlu temsilde deliğin yapısal
yokluğu, `<alan>_status` sütununun `NOT NULL` olmasına dayanır —
bu koşul kaldırılırsa iddia ÖLÇÜLMEMİŞ hale gelir.

İzinli durum alfabesi (tam liste, kapalı küme):

```
measured
measured_detached
never_measured
failed(git-missing)
failed(command-nonzero)
failed(timeout)
failed(not-a-repo)
failed(unusable-output)
not_applicable(no-isolation)
not_applicable(bare-repo)
not_applicable(submodule)
```

### YENİDEN SINIFLANDIRMA YASAĞI

Değeri iki tarafta da NULL olan iki durum arasında geçiş
YAPILAMAZ (örnek: `failed(timeout)` → `failed(not-a-repo)`).
Invaryant B'yi uygulayan trigger bunu reddeder ve bu RET
SÖZLEŞMEYE UYGUNDUR.

GEREKÇE: bir başarısızlık sınıfının sonradan yeniden
sınıflandırılması, ölçüm anı geçtikten sonra hükmü değiştirmektir.
Yeni ölçüm YENİ RUN'dır; eski run'ın etiketini düzeltmek değildir.

---

## M5 — BAŞARISIZLIK SINIFLARI

`failed` yalnız şunlar için: `git-missing`, `command-nonzero`, `timeout`,
`not-a-repo`, `unusable-output`.

`measured_detached` kendi sınıfıdır, `failed` değildir.

`not_applicable`: `no-isolation`, `bare-repo`, `submodule`.

Hiçbir sınıf yanlış aileye yazılamaz.

### `failed(unusable-output)`

Süreç sıfır döndü ama çıktı ölçüm için kullanılamaz: boş, eksik veya
ayrıştırılamaz. Bu `measured` DEĞİLDİR.
**SÜREÇ BAŞARISI ÖLÇÜM BAŞARISI DEĞİLDİR.**

**KAPSAM SINIRI:** "boş çıktı = unusable" kuralı EVRENSEL DEĞİLDİR.
Bazı git sorgularında boş çıktı meşru "yok" anlamı taşıyabilir
(örnek: upstream yoksa upstream sorgusu boş döner; bu unusable
değildir). Hangi alanda boş çıktının unusable, hangisinde meşru "yok"
olduğu ALAN BAZINDA tanımlanır ve bu tanım FIXTURE diliminde producer
ölçülürken yazılır. Bu dilimde tanımsızdır ve ÖLÇÜLMEDİ olarak
taşınır.

**ÜRETİM SINIRI:** bu sınıfı ÜRETEN katman producer'dır (`runGit` ve
onu çağıran ölçüm yolu), DB DEĞİLDİR. DB CHECK bu sebebi beyaz listede
tutar; bu sınıfın ÜRETİLDİĞİNİ kanıtlamaz. Bu ayrım her raporda
korunur.

---

## M6 — EXECUTION FAIL-OPEN / JUDGMENT FAIL-CLOSED

Git ölçümü başarısız olursa run BAŞLAR ve başarısızlık kaydedilir.

`provenance_complete` her git alanının durumundan MEKANİK türetilir:

| durum | provenance_complete etkisi |
|---|---|
| `measured` | tamamlığı BOZMAZ |
| `measured_detached` | tamamlığı BOZMAZ |
| `failed(*)` | BOZAR |
| `not_applicable(no-isolation)` | BOZMAZ (beklenen hal) |
| `not_applicable(bare-repo)` | BOZAR (ölçülemedi) |
| `not_applicable(submodule)` | BOZAR (ölçülemedi) |
| `never_measured` | BOZAR (hiç ölçülmedi) |

Bu ayrım tabloya yazılır, çıkarımla üretilmez.

Hiç ölçülmemiş bir run, tamamlanmış provenance taşıyamaz.

`provenance_complete` false olan bir run'dan provenance gerektiren
PROVEN hüküm KURULAMAZ.

**AÇIK BORÇ:** bu reddi mekanik uygulayacak katman (**Measurement Layer**)
HENÜZ YOKTUR. Faz 1B yalnız bayrağı taşınabilir kılar. "Kural var"
!= "kural uygulanıyor". Bu borç dosyada ADIYLA yazılır.

---

## M7 — RESUME SINIRI

Devam eden run kendi ölçümünü yapar; ebeveynin değerini devralmaz.

---

## M9 — YARIŞ SINIRI

Ölçüm ile spawn aynı değişmez cwd değerine bağlanır. Ölçüm anı ile
PTY'nin fiilen açıldığı an arasındaki pencerede cwd'nin işaret ettiği
hedefin (worktree kimliği, HEAD, dal) değişebileceği bir yol varsa
bu VARSAYILMAZ, ölçülür ve test edilir.

Yarış mümkün çıkarsa: run-start provenance o run'ın çalıştığı durumun
provenance'ı olarak OKUNAMAZ; yalnız "ölçüm anında şu değerler
görüldü" hükmünü destekler; run `provenance_complete=false` taşır ve
ölçüm penceresi kaydedilir.

Yarış mümkün değilse: kanıtı, araya girebilecek yolların SAYILMASI ve
her birinin ADIYLA elenmesidir. "Kod öyle görünüyor" bu kanıtı vermez.

---

## M10 — GÖÇ SINIRI

ÜÇ AYRI KAVRAM, BİRBİRİNE EZİLMEZ:

| kavram | tanım |
|---|---|
| tarihsel metadata | v2 döneminde yazılmış, gerçek değer |
| ölçülmüş provenance | Faz 1B ölçüm yolunun ürettiği değer |
| verinin yokluğu | hiçbir zaman değer olmaması |

Göç yeni veri YAPISI yaratabilir; geçmişte GERÇEKLEŞMEMİŞ bir ÖLÇÜM
yaratamaz VE geçmişte GERÇEKTEN VAR OLAN bir veriyi SİLEMEZ.
İkisi de tarih tahrifatıdır.

**AYRI SÜTUN AİLESİ KARARI:** Faz 1B'nin ölçtüğü provenance M13'te
adlarıyla tanımlanan YENİ sütunlara yazılır. Mevcut `base_sha`,
`branch`, `worktree_path` sütunları Faz 1B tarafından YENİDEN
KULLANILMAZ ve göç sırasında DEĞİŞTİRİLMEZ.

**GÖÇ DAVRANIŞI:** göç, tüm v2 satırlarının M13 alanlarının HEPSİNE
`never_measured` yazar ve `provenance_complete=false` üretir. Eski
sütunlara DOKUNMAZ — dolu olanlar dolu, NULL olanlar NULL kalır.

**KORUMANIN KAPSAMI:** koruma yalnız SÜTUN DEĞERLERİNİ değil, SATIR
KÜMESİNİN TAMAMINI kapsar — satır kimliği ve satır sayısı dahil.
Göç hiçbir legacy satırı kaybedemez, çoğaltamaz, kimliğini
değiştiremez. Tek bir satırın doğru korunması, tüm kümenin
korunduğunu KANITLAMAZ.

**KAPSAM:** bu madde GÖÇ İŞLEMİNİ sınırlar. Bir satırın GELECEKTE
güncellenip güncellenemeyeceği bu maddenin konusu DEĞİLDİR ve bugün
ÖLÇÜLMEDİ.

### GÖÇ ŞEKLİ

Göç, `ALTER TABLE ADD COLUMN` ile yapılır; sütun-düzeyi CHECK bu
ifadede birlikte tanımlanır. Tablo YENİDEN İNŞA EDİLMEZ.
SATIRLAR YENİDEN OLUŞTURULMAZ (*migration rows are not
reconstructed*).

**ÖLÇÜLDÜ (SQLite 3.49.2 / better-sqlite3 11.10.0):** SQLite'ta
`ALTER TABLE ... ADD CONSTRAINT` yoktur, ancak `ADD COLUMN`
sütun-düzeyi CHECK'i kabul eder ve bu CHECK başka bir sütuna
referans verebilir. Bu yolda satırlar hiç kopyalanmaz ve rowid'ler
sabit kalır.
KAPSAM: scratch in-memory DB; **3 satırlık** üç-profilli fixture. Beş
M13 alanının hepsi `ADD COLUMN` ile eklendi; kısıtın FİİLEN
UYGULANDIĞI iki temsilci alanda (`git_base_sha`, `git_branch`)
doğrulandı — kalan üç alanda ÖLÇÜLMEDİ. Üretim DB'sinde
(`harness.db`) ÖLÇÜLMEDİ; gerçek boyutlu bir tabloda süre ÖLÇÜLMEDİ;
WAL modunda açık okuyucu varken ÖLÇÜLMEDİ.

**SONUÇ:** M10'un satır kümesi koruması — satır kaybı, çoğaltma,
kimlik değişimi — artık yalnız TEST EDİLEN bir özellik değil,
seçilen göç şeklinin YAPISAL sonucudur. Testler bunu yine de
ölçer; ama korumanın kaynağı test değil, şemadır.

**BEDEL (ölçüldü ve kabul edildi):** `SELECT * FROM runs` 20 sütundan
31 sütuna çıkar. `ADD COLUMN` CHECK'i ADLANDIRILAMAZ, dolayısıyla
hata mesajı tam ifadeyi basar (~371 karakter) — tablo-düzeyi
adlandırılmış kısıtın vereceği kısa mesaj kaybedilir.
KAPSAM: sütun sayısı (20 → 31) scratch in-memory DB'de beş alanla
ölçüldü. ~371 karakterlik mesaj YALNIZ `git_base_sha` alanının
CHECK'i için ölçüldü; alan başına uzunluk değişir (`git_branch`
CHECK'i daha uzundur) ve diğer alanlarda ÖLÇÜLMEDİ.

---

## M11 — FIXTURE İZOLASYON ÖN KOŞULU

Her fixture, hem YAZDIĞI hem TÜKETTİĞİ her yolun scratch altında
olduğunu doğrular; fail-closed. Tüketim tarafı en az şunları kapsar:
çalıştırılabilirin fiilen çözüldüğü tam yol, git'in okuduğu config
kaynakları, home çözümü, alt sürecin gördüğü ortam.

`.exe` ZORUNLUDUR — `.cmd` gölgelemez (`spawn` `shell:true` olmadan
`.cmd` çözmez, ÖLÇÜLDÜ).

`command-nonzero` fixture'ı SIFIR DIŞI dönmek ZORUNDADIR (sıfır dönen
sahte git sahte `measured` üretir, ÖLÇÜLDÜ).

KAPSAM (yukarıdaki iki ÖLÇÜLDÜ için):
`.cmd` gölgelememesi — Windows 10; Node/Electron `child_process.spawn`,
`shell:true` YOK; PATH'te sahte dizin İLK sırada ve PATHEXT `.CMD`
içeriyorken ölçüldü. POSIX'te ÖLÇÜLMEDİ; `shell:true` ile ÖLÇÜLMEDİ.
Sıfır dönen sahte git — üretim IPC yolunda (`git:branch`, `git:status`,
`git:aheadBehind`) Electron ana sürecinde ölçüldü; `runGit`'in bu üç
tüketicisi `''` (boş string) üretti. Faz 1B'nin provenance ölçüm yolu
HENÜZ YOKTUR, dolayısıyla o yolda ÖLÇÜLMEDİ.

Yolun metinsel olarak scratch önekiyle başlaması YETERLİ DEĞİLDİR;
junction/symlink kaçışı ÖLÇÜLMEDİ olarak taşınır.

**ÖLÇÜLEMEYEN KISIM HÜKME DÖNÜŞTÜRÜLMEZ:** git'in hangi config
kaynağını seçtiği ÖLÇÜLMEDİ; bir fixture bunu ölçemiyorsa "izole"
demez, ÖLÇÜLEMEDİ der.

---

## M12 — CAUSE != ACCEPTABILITY

Bir testin yeni bir kısıt yüzünden düşmesi tek başına "beklenen"
demek DEĞİLDİR. Ayrım nedensellikten değil SÖZLEŞMEDEN çıkar:
sözleşmenin artık açıkça yasakladığı eski davranış düşüyorsa
BEKLENEN; sözleşmeye göre HÂLÂ geçerli olması gereken davranış
düşüyorsa REGRESYON. İkisi ayrı raporlanır.

---

## M13 — PROVENANCE ALAN AİLESİ

Faz 1B şu beş provenance kavramını kaydeder. Her kavramın BİR değer
alanı ve BİR durum alanı vardır. Adlar kanonik ve İNGİLİZCEDİR
(i18n kararı gereği makine kimlikleri çevrilmez):

| değer alanı | durum alanı |
|---|---|
| `git_base_sha` | `git_base_sha_status` |
| `git_branch` | `git_branch_status` |
| `git_toplevel` | `git_toplevel_status` |
| `git_pty_cwd` | `git_pty_cwd_status` |
| `git_worktree_path` | `git_worktree_path_status` |

Artı tek türetilmiş alan: `provenance_complete`
**Toplam 11 yeni sütun.**

Bu 11 sütun M13 alan ailesidir. Faz 1B'nin eklediği TOPLAM yeni sütun
sayısı **12**'dir: M13'ün 11 sütunu + M1'in `checkpoint_sha_source`
sütunu.

**M3 GEREĞİ AYRIM:** `git_pty_cwd` (PTY'ye fiilen verilen dizin),
`git_toplevel` (o cwd'de git ile ÖLÇÜLEN repo kökü) ve
`git_worktree_path` (izolasyon yöneticisinin ürettiği yol) ÜÇÜ AYRI
KAVRAMDIR ve değerleri eşit olduğunda bile ayrı yazılır.

**LEGACY AYRIMI:** `git_worktree_path`, mevcut `worktree_path`
sütunundan FARKLIDIR. Biri Faz 1B'nin ölçtüğü değer, diğeri v2
döneminde izolasyon yöneticisinin yazdığı tarihsel metadata. Aynı
kavramın iki farklı kaynağıdır ve ASLA tek sütunda birleştirilmez.
Aynı ayrım `git_base_sha` ile `base_sha`, `git_branch` ile `branch`
için de geçerlidir.

`measured_detached` YALNIZ `git_branch_status` için geçerlidir; diğer
dört alanda bu durum yazılamaz.

**YERLEŞİM:** 11 provenance sütunu `runs` tablosunda durur; ayrı bir
tablo KULLANILMAZ. Gerekçe M10 GÖÇ ŞEKLİ bölümünde yazılıdır.

**AÇIK BORÇ — OKUMA SEMANTİĞİ:** bir tüketicinin aynı kavram için hem
legacy sütunu hem M13 sütununu gördüğünde hangisini hangi hükümde
kullanacağı BU FAZIN KONUSU DEĞİLDİR. Faz 1B yalnız kaydeder,
hükümleri kısıtlamaz. Okuma semantiği Measurement Layer fazına
aittir ve borç olarak kaydedilmiştir.

---

## M14 — KOMŞU TARAMASI

Bir kalem (madde veya vaka) düzeltildiğinde, AYNI VARSAYIMI paylaşan
kalemler taranır. Düzeltilen kalemin komşuları, yalnız aynı adı
taşıyanlar DEĞİL, aynı varsayıma dayananlardır.

**ÖLÇÜLEN GEREKÇE:** M13 ihdas edildiğinde M3 ve M4 geride kaldı
(birinci tekrar). C-08 düzeltildiğinde C-06 ve C-07 geride kaldı
(ikinci tekrar). C-07 düzeltildiğinde C-08 geride kaldı, C-08
düzeltildiğinde C-03 geride kaldı (**üçüncü tekrar**). Aynı hata
sınıfı ÜÇ KEZ.

**SINIR:** ad-tabanlı tarama bu sınıfı TAM GÖREMEZ — C-07 hiçbir
`checkpoint_` adı taşımadan çelişiyordu. Komşu taraması ANLAM
üzerinden yapılır ve tamlık iddiası KURULAMAZ.

### ASGARİ YORDAM

Bir vaka düzeltildiğinde, AYNI GRUBUN tüm vakaları TAM METİN okunur.
Bir madde düzeltildiğinde, o maddeye ATIF YAPAN tüm maddeler TAM
METİN okunur.

Bu bir ASGARİDİR, tamlık değil. Kalıp araması bu yordamın YERİNE
GEÇMEZ; kalıp araması yalnız nereye BAKILACAĞINI daraltır.

### FİLTRE HATASI — ÖLÇÜLDÜ (üç uygulama)

Komşu taraması düzeltilen kalemin **KENDİ SEBEBİNE** göre
daraltılamaz. `"C-07 ile aynı bağımlılığı taşıyan vaka"` filtresi
**C-08'i kaçırdı**; aynı filtre **C-03'ü de kaçırırdı**.

**DOĞRU FİLTRE, alanın kodladığı GENEL ÖZELLİKTİR:**

> "çözülmemiş bir engel taşıyıp `GATE BAGIMLILIGI` kayıtlı olmayan
> kalem"

**Sebep farklı olabilir; EKSİK OLAN ŞEY AYNIDIR.**

🔴 **BU DÜZELTME M14'Ü TAM YAPMAZ.** Üç uygulamada üç örnek bulundu ve
üçüncüsü ilk ikisinin kaçırdığı bir sınıftı. M14 tamlık iddiası
KURMAZ ve bu filtre de KURMAZ.

**M14 TAMLIK İDDİASI KURMAZ.** Farklı sözcüklerle yazılmış aynı
varsayım bu yordamla da görülmeyebilir. Amaç hatayı imkânsız kılmak
değil, AYNI HATANIN BİR SONRAKİ tekrarının olasılığını düşürmektir.
**Sayı yazılmaz:** "üçüncü kez" gibi sabit bir sayı, o tekrar
gerçekleştiğinde maddeyi kendi ölçümüyle çelişir hâle getirir —
üçüncü tekrar ÖLÇÜLDÜ (bkz. ÖLÇÜLEN GEREKÇE).

---

## M15 — SAYIM ÇAPRAZ KONTROLÜ

Bu belgeye veya plana yazılan her YENİ LİSTE (alan sayımı, durum
alfabesi, sebep listesi, sözlük), YAZILDIĞI ANDA mevcut tanımlarla
çapraz kontrol edilir. Sonraki turda tarama ile yakalanması
BEKLENMEZ.

**ÖLÇÜLEN GEREKÇE:** bu belgeye yazılan bir sözlük, yazıldığı turda
M4 KAPSAM ile karşılaştırılmadığı için aynı turda çelişki üretti.

---

## AÇIK BORÇ — SEBEP-ALAN EŞLEMESİ

Alan başına 11 durum × 5 alan = **55 hücrelik** bir uzay vardır.

### TANIMLI — 18 hücre

| durum | hücre | kaynak |
|---|---|---|
| `measured` | 5 | her alan için geçerli (D-01, P-01..P-04, F-06) |
| `never_measured` | 5 | göç durumu, beş alanın hepsi (M10 GÖÇ DAVRANIŞI, G-12) |
| `measured_detached` | 5 | **HEPSİ TANIMLI:** `git_branch_status` için GEÇERLİ, diğer dört alan için GEÇERSİZ (M4 tablosu, M13, W-21) |
| `not_applicable` | 3 | `git_worktree_path` × `no-isolation` GEÇERLİ (M3); `git_toplevel` ve `git_pty_cwd` × `no-isolation` GEÇERSİZ (P-03) |

### TANIMSIZ — 37 hücre

| durum | hücre | not |
|---|---|---|
| `not_applicable` | 12 | 15'in 3'ü sınıflandırıldı |
| `failed` | 25 | hiç sorgulanmadı |

**55 − 18 = 37.** Bu muhasebe AÇIKÇA yazılır; "`measured_detached`
yalnız branch için" cümlesi tek başına okunursa yalnız BİR hücrenin
tanımlı olduğu izlenimi verir — oysa beş hücrenin beşi de tanımlıdır
(biri GEÇERLİ, dördü GEÇERSİZ).

### BU HÜCRELER ÖLÇÜLECEK ŞEY DEĞİL, KARAR VERİLECEK ŞEYDİR

Daha kesin ifade: hücrenin NORMATİF SONUCU ölçülmez; hücreyi BESLEYEN
OLGU ölçülür, sonra CTO kararı verilir.

Örnek: "bare repoda `git rev-parse HEAD` çalışır" ölçülebilir. Ama
bundan "`git_base_sha` × `bare-repo` `not_applicable` GEÇERSİZDİR"
hükmü ÇIKMAZ. `not_applicable` "teknik olarak ölçülemez" demek değil,
"bu kavram bu bağlamda uygulanmaz" demektir — bu NORMATİF bir
yargıdır.

**Her hücre İKİ ADIM gerektirir: ölçüm, sonra karar.**

### ÇALIŞAN BİR GÖÇ BU HÜCRELERİ ERİTMEZ

Göç mekanik davranış hakkında bilgi üretir; hücreler semantik
karardır. DİLİM 1'in kodu yazıldığında bu borç AYNEN durur.

**Kapatma şartı:** GATE 2'nin giriş koşuludur.

---

## FAZ 1B ÇIKIŞ KRİTERİ

Faz 1B provenance'i olcer ve kaydeder. Provenance'a dayali hukumleri
KISITLAMAZ. Faz 1B, provenance_complete=false tasiyan run'larin
olusabilmesini ve bayragin tasinabilmesini saglar; hicbir mekanizma
boyle bir run'dan PROVEN hukum kurulmasini engellemez. Bayragin
varligi koruma degil beyandir. "Bayrak var, demek ki korunuyoruz"
cumlesi bu fazin ciktisindan KURULAMAZ. Bu kisitlamayi mekanik
uygulamak Measurement Layer fazinin isidir.

TEST EDILEBILIRLIK GEREKSINIMI: R grubu ile C-04 ve C-05, P-07, S-03
vakalari uretim kodunda gozlem noktasi (gecikme
enjeksiyonu, git alt surec sayaci) acmayi zorunlu kilar. Bu, test
yazmanin yan etkisi degil, ayri bir uretim kodu kalemidir ve
implementation planina adiyla girer.

ÖLÇÜM YOLUNUN ORTAMI ENJEKTE EDİLEBİLİR OLMALIDIR. `runGit` bugün
`env` parametresi geçmiyor; bir fixture git alt sürecinin ortamını
ancak kendi `process.env`'ini değiştirerek etkileyebilir. Bu testleri
sıralı çalışmaya zorlar ve ölçülen "yanlış düğme" tuzağının kendisidir.
Bu bir ÜRETİM KODU değişikliğidir ve fixture dilimine aittir.

## FAIL-CLOSED YAZMA, GÜVENİLİR VERİ DEMEK DEĞİLDİR

Faz 1B sonunda DB katmanı geçersiz provenance yazılmasını
reddedecek. Bu, YAZMA tarafının fail-closed olmasıdır.

OKUMA tarafı SERBEST kalır: `provenance_complete=false` olan bir
run'dan PROVEN hüküm kurulmasını hiçbir mekanizma engellemez.
Yani sistem, veriyi YANLIŞ YAZMAYI imkânsız kılıp, doğru yazılmış
veriyi YANLIŞ OKUMAYI serbest bırakır.

Bu tutarsızlık değil, bilinçli faz ayrımıdır. ANCAK: enforcement
ne kadar sağlamlaşırsa, Measurement Layer'ın yokluğu o kadar
tehlikeli hale gelir — sağlam bir yazma kapısı "bu veri
güvenilir" hissi yaratır ve tam olarak bu belgenin yasakladığı
cümleyi davet eder.

DB yalnızca GRAMERİ ve YAZMA BAĞLAŞIMINI garanti eder. Verinin
bir hüküm için epistemik olarak YETERLİ olup olmadığını
Measurement Layer belirler ve o katman HENÜZ YOKTUR.

### MEASUREMENT LAYER GEREKSİNİMİ — BUGÜNDEN KAYITLI

Sistemin gürültülü olduğu yer yanlış YAZMA, sessiz olduğu yer
yanlış OKUMADIR. DB'nin reddettiği her yazma bir hata mesajı
üretir; `provenance_complete=false` taşıyan bir run'dan hüküm
kurulduğunda hiçbir şey görülmez.

Measurement Layer geldiğinde "bu bayrağa dayanarak kaç yanlış
hüküm kuruldu" sorusunu cevaplayacak bir kayıt OLMAYACAK.

**GEREKSİNİM:** `provenance_complete=false` olan bir run'ın
provenance'a DAYALI TÜKETİMİ event store'a bir OLAY olarak yazılır.
Faz 1A'nın append-only defteri tam olarak bunun içindir.

**TANIM SINIRI:** "tüketim" bugün TANIMLI DEĞİLDİR ve bu metin bir
implementation emri OLARAK OKUNAMAZ. Sıradan okuma (UI yenileme,
liste sorgusu, arka plan hidrasyonu) ile provenance'a dayalı hüküm
girişimi AYNI ŞEY DEĞİLDİR; aynı run'ın kırk kez okunması kırk
olay üretmemelidir. Hangi olayın kaydedileceği Measurement Layer
fazında AYRICA ölçülür ve tanımlanır.

**BU FAZDA UYGULANMAZ.**
