# Mission Control — Faz 1B: Git Evidence Sözleşmesi

**Durum:** kapandı
**Bağlandığı SHA:** `4634762417f75f5bff181eedc84187c6ca8f442c`
**Dal:** `mission-control/phase-1a-run-event-store`

Bu dosya sözleşme maddelerinin kanonik metnidir. Maddeler kalıcı kimlik taşır
(M1, M2, M3, M4, M5, M6, M7, M9, M10, M11, M12, M13). Kimlikler bir kez
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

---

## M2 — ÖLÇÜLEN EVREN

Ölçüm, run'ın çalışacağı cwd'dir — izolasyon başarılıysa worktree,
değilse kullanıcının cwd'si. İkisi farklı evrendir; hüküm hangisinde
ölçüldüyse onun adıyla yazılır.

---

## M3 — ÜÇ AYRI YOL DEĞERİ, ÜÇ AYRI SÜTUN

`pty_cwd` = PTY'ye fiilen verilen dizin.
`git_toplevel` = o cwd'de git ile ÖLÇÜLEN repo kökü.
`worktree_path` = yalnız izolasyon yöneticisi worktree oluşturduysa
onun ürettiği yol; aksi halde `not_applicable`.
Üçü eşit olduğunda bile ayrı yazılır.

---

## M4 — DURUM VE DEĞER AYRILAMAZ

Her git alanı için durum ve değer AYNI kayıtta, AYNI transaction'da
yazılır. İzinli kombinasyonlar BEYAZ LİSTE olarak sayılır ve listede
olmayan her kombinasyon YAZMA ANINDA DB CHECK ile reddedilir:

| durum | değer kısıtı |
|---|---|
| `measured` | değer DOLU olmak ZORUNDA |
| `measured_detached` | yalnız `branch` için; değer NULL ZORUNDA |
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

**AÇIK BORÇ — OKUMA SEMANTİĞİ:** bir tüketicinin aynı kavram için hem
legacy sütunu hem M13 sütununu gördüğünde hangisini hangi hükümde
kullanacağı BU FAZIN KONUSU DEĞİLDİR. Faz 1B yalnız kaydeder,
hükümleri kısıtlamaz. Okuma semantiği Measurement Layer fazına
aittir ve borç olarak kaydedilmiştir.

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
