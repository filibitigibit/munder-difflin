# Mission Control — Faz 1B: Git Evidence Sözleşmesi

**Durum:** kapandı
**Bağlandığı SHA:** `4634762417f75f5bff181eedc84187c6ca8f442c`
**Dal:** `mission-control/phase-1a-run-event-store`

Bu dosya sözleşme maddelerinin kanonik metnidir. Maddeler kalıcı kimlik taşır
(M1, M2, M3, M4, M5, M6, M7, M9). Kimlikler bir kez verildikten sonra
değişmez ve yeniden kullanılmaz.

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

`<sebep>` serbest string DEĞİLDİR; sabit listedir.

Durum alanı tek başına güncellenemez; değer alanı tek başına
güncellenemez.

---

## M5 — BAŞARISIZLIK SINIFLARI

`failed` yalnız şunlar için: `git-missing`, `command-nonzero`, `timeout`,
`not-a-repo`.

`measured_detached` kendi sınıfıdır, `failed` değildir.

`not_applicable`: `no-isolation`, `bare-repo`, `submodule`.

Hiçbir sınıf yanlış aileye yazılamaz.

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

Bu ayrım tabloya yazılır, çıkarımla üretilmez.

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

## FAZ 1B ÇIKIŞ KRİTERİ

Faz 1B provenance'i olcer ve kaydeder. Provenance'a dayali hukumleri
KISITLAMAZ. Faz 1B, provenance_complete=false tasiyan run'larin
olusabilmesini ve bayragin tasinabilmesini saglar; hicbir mekanizma
boyle bir run'dan PROVEN hukum kurulmasini engellemez. Bayragin
varligi koruma degil beyandir. "Bayrak var, demek ki korunuyoruz"
cumlesi bu fazin ciktisindan KURULAMAZ. Bu kisitlamayi mekanik
uygulamak Measurement Layer fazinin isidir.

TEST EDILEBILIRLIK GEREKSINIMI: R grubu ve C-04, C-05, P-07, S-03
pozitif kontrolleri uretim kodunda gozlem noktasi (gecikme
enjeksiyonu, git alt surec sayaci) acmayi zorunlu kilar. Bu, test
yazmanin yan etkisi degil, ayri bir uretim kodu kalemidir ve
implementation planina adiyla girer.
