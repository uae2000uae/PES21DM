# Game test run of 22 November 2026

Files: `D:\PES21-local-test\final-exports\game-tests\WEPES`. Copy that one `WEPES` folder to the USB drive. Every file
name starts with its test number (`test01_…` to `test13_…`), so the import screen lists them in test order: tick the
file or files of one test, import, look, then the next. Import with *Apply player and squad data* **on**. Run the tests
in order: several depend on the one before.

They were built from the project as it is now (the export of 21 November, 21:54, which is installed in the game).
Tests 1 to 9 use six teams of *Others America* that nothing else has changed. The six `zz_restore_…` files put those six back when
you are finished. Tests 10 to 13 are about West Bromwich Albion's five placeholders.

The questions behind the tests are in `docs/GAME_TESTS.md` (the number in brackets).

## A. A player who changes club: does the order matter? (question 10, and 2)

| Test | Import | Look at | I expect | If not |
|---|---|---|---|---|
| **1** | `test01_ame_alianza.ted`: ALIANZA LIMA with one extra player, **JOÃO VICTOR** (DMF, ID 138132, number 99, last in the squad). He is BOTAFOGO SP's player; Botafogo's file is not imported. | ALIANZA LIMA: is he there, with his name and data? BOTAFOGO SP: is he still there too, gone, or a placeholder? | He shows correctly at ALIANZA LIMA. At BOTAFOGO SP he is gone, or still listed. | A placeholder at ALIANZA LIMA means the game never takes a player who is at another club. |
| **2** | `test02_ame_bsp.ted`: BOTAFOGO SP without him (25 players). | Both teams again. | Nothing changes at ALIANZA LIMA; BOTAFOGO SP has 25 players without him. | If he now turns into a placeholder at ALIANZA LIMA, the old club's file breaks him even when it is read second. |
| **3** | `test03_ame_bin.ted`: DEPORTIVO BINACIONAL without **A. ZELA** (CB, ID 41257). 28 players. | DEPORTIVO BINACIONAL: is he gone? Can the game still find A. ZELA anywhere (player search)? | He is gone from the team. | |
| **4** | `test04_ame_coq.ted`: COQUIMBO UNIDO with A. ZELA added (number 99, last in the squad). | COQUIMBO UNIDO: A. ZELA with his name and data, or a placeholder? | A **placeholder**, like the five at West Bromwich Albion: his old club's file dropped him first. | If he shows correctly, the order is not the cause and I look elsewhere. |
| **5** | `test05_ame_bin.ted`: DEPORTIVO BINACIONAL as the option file has it (with A. ZELA, 29 players). | DEPORTIVO BINACIONAL and COQUIMBO UNIDO. | Not known. It tells whether a dropped player comes back. | |

Tests 1 and 2 are "new club first". Tests 3 and 4 are "old club first". Together they answer the question whatever
happens at West Bromwich Albion.

## B. Which file does the game read last? (question 4)

| Test | Import | Look at | I expect | If not |
|---|---|---|---|---|
| **6** | Both files ticked together: `test06_aaa.ted` and `test06_zzz.ted`. They are the same team, ESTUDIANTES DE MÉRIDA (code 4032), written twice with two names: **ORDER AAA** and **ORDER ZZZ**. | The team's name in the game. Also note the order the import screen lists the two files in. | **ORDER ZZZ**: files are read in name order and the last one wins. | ORDER AAA means the order is reversed or not by name. Either answer is useful: it is how the export can make sure a new club's file is read before the old club's. |

## C. The smallest squad (question 6)

All three are FIGUEIRENSE with one goalkeeper. Import one, look, then the next.

| Test | Import | I expect |
|---|---|---|
| **7** | `test07_ame_fig.ted` with **17** players | Not known. Refused means the floor is 18. |
| **8** | `test08_ame_fig.ted` with **15** players | Accepted if 17 was. |
| **9** | `test09_ame_fig.ted` with **11** players | Refused, or accepted but the team cannot be picked for a match. |

Note for each: accepted or refused, the exact message, and whether the team can be picked for a match.

## D. West Bromwich Albion's five placeholders (question 10)

The five: Max O'Leary, Matt Ingram, Nathaniel Phillips, Conor Townsend, Mikey Johnston.

| Test | Import | Look at | I expect | If not |
|---|---|---|---|---|
| **10** | `test10_eng2_wba.ted`: the same West Bromwich Albion file you imported yesterday, alone. | The five at West Bromwich Albion. | Still placeholders. | If they show correctly now, importing the new club's file a second time is the whole fix. |
| **11** | The five `test11_…` files: Bristol City, Oxford United, Derby County, Ipswich Town and Celtic **as the option file has them** (each with its player back). | Each old club: is its player back (M. O'LEARY, M. INGRAM, N. PHILLIPS, C. TOWNSEND, M. JOHNSTON)? West Bromwich Albion: what do the five places show now? | The five are back at their old clubs. | If they do not come back, a dropped player is gone until the option file is installed again. |
| **12** | `test12_eng2_wba.ted`: the same file again, alone. | The five at West Bromwich Albion, and at the old clubs. | They show correctly at West Bromwich Albion (same case as test 1). | |
| **13** | The five `test13_…` files: the old clubs' files from yesterday's export (without the five). | Both sides. | Nothing changes at West Bromwich Albion (same case as test 2). | |

If tests 1 to 4 already show the order is not the cause, skip 11 to 13.

## E. Team codes, competition codes, and teams within competitions (questions 12, 13, 14)

Files `test17_…` to `test24_…` in the same `WEPES` folder; `zz_restore2_…` puts everything back except test 24.

### Team codes

One squad, PARANÁ's 34 players (Other Teams (Latin America), code 2464; first in the list: ALISSON, L. SALAZAR,
FABRÍCIO), written under four other teams' codes. Each file keeps the target team's crest and kits and is named after
its test. Import one at a time, in order: each takes the players from the one before.

| Test | File | Written under the code of | Its place in the game |
|---|---|---|---|
| **17** | `test17_ame_udeconception.ted` | U. DE CONCEPCIÓN (2551) | Other Teams (Latin America), the same group as Paraná |
| **18** | `test18_chile_cobrezal.ted` | COBRESAL (2553) | the Chilean league |
| **19** | `test19_mls_montreal.ted` | CF MONTRÉAL (2491) | MLS (the game's PLA League codes) |
| **20** | `test20_afrika_bfaso.ted` | BURKINA FASO (1044) | national teams, Africa |

Look at, after each: accepted or refused and the exact message; the team at that code (is it named T17 PARANA … with
Paraná's players?); **which league or group lists it** (question 14); and Paraná itself and the team of the test
before (did they lose the players?).

I expect: 17 and 18 accepted, the team shows Paraná's players and stays listed in the target's own league; each time
the previous holder is left without those players. 19 is the MLS case you reported as refused, so it may be refused.
20 I expect to be refused or to behave oddly: a club's players under a national team's code.

### Competition codes

One competition file (BRI SUPER LEAGUE's, code 52, slot 41), written four times with the code and the slot varied.
PIALA INDONESIA is code 55, slot 44. Import one at a time.

| Test | File | Code | Slot | Title in the file | I expect |
|---|---|---|---|---|---|
| **21** | `test21_bri.ced` | 52 | 41 | T21 CODE 52 SLOT 41 | BRI SUPER LEAGUE is renamed T21. |
| **22** | `test22_bri.ced` | 55 | 41 | T22 CODE 55 SLOT 41 | The same league is renamed T22 (the slot decides); PIALA INDONESIA does not change. |
| **23** | `test23_bri.ced` | 52 | 44 | T23 CODE 52 SLOT 44 | PIALA INDONESIA is renamed T23 and takes the league's emblem; the league keeps T22. |
| **24** | `test24_slot10.ced` | 18 | 10 | T24 SLOT 10 | One of the game's own competitions (one the option file has no file for) is renamed T24. Which one is the finding. |

**Test 24 cannot be undone by a file**: there is no original file for that competition, and its emblem name is blank
in the test file. Run it last, or skip it, and rename the competition back in the game's Edit if needed.

For each: accepted or refused; which competition shows the new title, and whether its emblem changed.

### Results of tests 17 to 24 (22 November)

| Test | What the game showed |
|---|---|
| 17 | Accepted. The team at U. de Concepción's code is named T17 PARANA, has Paraná's players, and is still in Other Teams (Latin America). The user's note: "Parana is replace with the new name", explained as "Parana's name was replaced with T17's name": the team that has Paraná's players now carries the T17 name. Where U. de Concepción's old players went was not noted (test 18 suggests the two squads swap). |
| 18 | Accepted. The team at Cobresal's code has Paraná's players but **kept its own name**. The note: "the teams kept their names and swapped players". |
| 19 | Accepted. The team at CF Montréal's code is named T19 PARANA, has Paraná's players, and is listed in MLS. |
| 20 | Accepted. Burkina Faso has Paraná's players, **kept its name**, and is still a national team. |
| 21 | Accepted. BRI SUPER LEAGUE is titled T21 CODE 52 SLOT 41. |
| 22 | Accepted, and **nothing changed**: not the league (slot 41), not PIALA INDONESIA (code 55). |
| 23 | Accepted, and **nothing changed**: the league still shows T21, PIALA INDONESIA is untouched. |
| 24 | **Refused**: "Data cannot be imported. either competition data doesn't exist or editing is prohibited." |

What they show:
- **A team code takes any squad**, in every kind of place tried: the same group, another league, MLS, a national team.
  The team stays listed where its code belongs. So the league a team is in is its code and nothing else.
- **MLS codes accept a replacement** (test 19). The earlier MLS rejection therefore had another cause.
- **Some teams cannot be renamed by a file**: the Chilean league's team and the national team took the players and kept
  their names; the Other Teams (Latin America) and MLS teams took the name. This fits the game's licensed teams being
  locked, but two cases are not a rule yet: part F's "Name changed" tick maps it league by league.
- **The game swaps squads** (test 18's note): when a team takes players that another team has, that team is given the
  taker's former players. Seen once and described in the user's words; tests 53 and 54 look at it directly.
- **A competition file changes a competition only when its code and its slot are that competition's own pair** (test
  21). With a code and a slot from two different competitions (22, 23) the file is accepted and does nothing. The 19
  November result (a code the game doesn't have, on the Premier League's slot, changed the Premier League) is the other
  case: an unknown code falls back to the slot.
- **Test 24 says nothing sure**: the pair (code 18, slot 10) was a guess, and the message covers both "no such
  competition" and "editing prohibited".

## F. Replacing, swapping, doubling and emptying a team, in every competition (questions 12 and 14)

**What a file can and cannot do.** Checked in the files: a competition file holds its code, slot, title and emblem and
**no list of teams**; a team file holds its own code and squad and **no competition**. So the only thing that ties a
team to a league is its **team code**. That means:
- *Replacing* a team in a league = writing another club under that team's code. Tests 17 to 19, 25 to 48, 56 and 57.
- *Swapping* two teams between leagues = each club written under the other's code. Test 53.
- *The same team in two competitions* = one squad written under two codes. Test 54.
- *Removing* a team = a file for its code with no players. Test 55.
- *Adding* a team to a league without taking a code away from another team is not something a file can express: a
  league has a fixed set of codes, and a code the game doesn't have is refused (tested 19 November).

**One file per league or group of the game, all importable in one go** (rebuilt 22 November at the user's request:
"use other random teams for the tests so nothing gets reversed by the following import"). Folder:
`D:\PES21-local-test\final-exports\game-tests-all-at-once\WEPES`, 35 files. Every test writes a **different club's
squad** under a **different team code**: no player and no code is used twice (923 players, 35 codes, checked), so no
import can undo another. The source clubs are unchanged teams picked in a shuffled order, never from the target's own
league. Each target is renamed "T-number + the club whose squad it gets", and **every player in a test file is renamed
with the test number in front** ("T25 GERARD BARRI", shirt name "T25 PAYTUVI"; test 53 uses T53A and T53B), so one look
at the squad list tells whether the players changed. The player names in the last column are the originals.

| Test | File | Team written (code) | Its league or group in the game | Should be named | First players it should show |
|---|---|---|---|---|---|
| **25** | `test25_den_vejle.ted` | VEJLE (5235) | 3F Superliga | T25 SD HUESCA | GERARD BARRI, JORGE PULIDO, ISIDRO PITTA |
| **26** | `test26_afc_vkobe.ted` | VISSEL KOBE (65694) | AFC Champions League | T26 CD CASTELLÓN | BELMAN, RUBÉN PULIDO, ADRIÁN DIÉGUEZ |
| **27** | `test27_bra1_srecife.ted` | SPORT RECIFE (1936) | Brasileirão Série A | T27 QINGDAO HUANGHAI | LIU ZHENLI, J. VUKOVIĆ, WANG HAO |
| **28** | `test28_bra2_vdagama.ted` | VASCO DA GAMA (136) | Brasileirão Série B | T28 DEPORTES ANTOFAGASTA | I. GONZÁLEZ, A. ROBLES, P. MAGALHAES |
| **29** | `test29_china_wzall.ted` | WUHAN ZALL (4095) | Chinese Super League | T29 DEPORTES LA SERENA | Z. LÓPEZ, F. AGUERO, LUCAS FASSON |
| **30** | `test30_col_santafe.ted` | SANTA FE (2657) | Colombian league | T30 BALI UNITED | T. GOPPEL, RIZKY DWI FEBRIANTO, FITRUL DWI RUSTAPA |
| **31** | `test31_fra1_troyes.ted` | TROYES (420) | Ligue 2 | T31 RANDERS | P. CARLGREN, S. GRAVES, M. ENGGÅRD |
| **32** | `test32_eng2_wrexham.ted` | WREXHAM AFC (4193) | English 2nd Division | T32 SEATTLE SOUNDERS | S. FREI, J. ATENCIO, A. RUSNÁK |
| **33** | `test33_eng2_wolves.ted` | WOLVERHAMPTON WANDERERS (208) | English League | T33 ÑUBLENSE | N. PÉREZ, E. GUERRERO, N. VARGAS |
| **34** | `test34_net_willem.ted` | WILLEM II (255) | Eredivisie | T34 WAASLAND-BEVEREN | N. JACKERS, D. WUYTENS, F. BASTIANS |
| **35** | `test35_bel_zulte.ted` | ZULTE-WAREGEM (2019) | Jupiler Pro League | T35 SD EIBAR | ÓSCAR SIELVA, ROBERTO OLABE, ARBILLA |
| **36** | `test36_sco_stmirren.ted` | ST. MIRREN (1987) | Scottish Premiership | T36 CITTADELLA | E. KASTRATI, D. FRARE, D. ADORNI |
| **37** | `test37_por_vguimaraes.ted` | VITÓRIA GUIMARÃES (1804) | Liga NOS | T37 DEPORTIVO CALI | G. DE AMORES, J. MARSIGLIA, J. ARIAS |
| **38** | `test38_fra1_strasbourg.ted` | STRASBOURG (4213) | Ligue 1 | T38 SOCHAUX | M. PRÉVÔT, C. DIEDHIOU, F. POGBA |
| **39** | `test39_oeu_strumgraz.ted` | STURM GRAZ (368) | Other European Teams | T39 CROTONE | M. FESTA, A. D'ERRICO, B. ADEKANYE |
| **40** | `test40_ind_pss.ted` | PSS SLEMAN (2404) | PAS League (BRI Super League) | T40 HAMILTON ACADEMICAL | R. FULTON, A. MARTIN, J. HAMILTON |
| **41** | `test41_oeu_wolfsburg.ted` | VFL WOLFSBURG (2355) | PEU League (Bundesliga) | T41 CHARLTON ATHLETIC | T. TAYLOR, K. DIXON, T. CAMPBELL |
| **42** | `test42_swi_zurich.ted` | ZÜRICH (1957) | Swiss Super League | T42 SC PADERBORN 07 | NIKLAS MOHR, K. OKPALA, F.GÖTZE |
| **43** | `test43_ita1_udinese.ted` | UDINESE (190) | Serie A | T43 PORTSMOUTH FC | T. STEWARD, J. WILLIAMS, O. MOXON |
| **44** | `test44_ita2_ventella.ted` | VIRTUS ENTELLA (4230) | Serie B | T44 GOIÁS | TADEU, DAVID DUARTE, FÁBIO SANCHES |
| **45** | `test45_spa2_laspalmas.ted` | UD LAS PALMAS (364) | Spanish 2nd Division | T45 JUVENTUDE | MARCELO CARNÉ, WELLINGTON, AUGUSTO SILVA |
| **46** | `test46_spa1_villarreal.ted` | VILLARREAL CF (267) | Spanish League | T46 RIONEGRO | C. BEJARANO, J. QUIÑÓNES, C. RAMÍREZ |
| **47** | `test47_tur_yeni.ted` | YENİ MALATYASPOR (5206) | Süper Lig | T47 UNIÓN | S. MOYANO, M. NANI, B. BLASI |
| **48** | `test48_arg_velez.ted` | VÉLEZ SARSFIELD (1244) | Argentine league | T48 LA EQUIDAD | C. BONILLA, J. PESTAÑA, J. GARCÍA |
| **49** | `test49_asia_uzbekistan.ted` | UZBEKISTAN (1184) | National teams, Asia | T49 CEARÁ | FERNANDO PRASS, GABRIEL LACERDA, LUIZ OTÁVIO |
| **50** | `test50_eropa_wales.ted` | WALES (4) | National teams, Europe | T50 GUARANI | JEFFERSON, ROMÉRCIO, LEANDRO ALMEIDA |
| **51** | `test51_name_usa.ted` | USA (39) | National teams, North and Central America | T51 CORITIBA | WILSON, NATHAN RIBEIRO, SABINO |
| **52** | `test52_same_venezuela.ted` | VENEZUELA (1129) | National teams, South America | T52 CONFIANÇA | JEAN, NIRLEY, LUAN |
| **56** | `test56_rus_zenit_jackliee.ted` | ZENIT (1218) | Russian Premier Liga | T56 BHAYANGKARA LAMPUNG FC | R. HANDIKA, DAVID MAULANA, GINANJAR |
| **57** | `test57_afc_alittihad.ted` | AL ITTIHAD (289) | Other Teams (Asia) | T57 PERTH GLORY | L. REDDY, M. TATAFU, J. GERIA |

With tests 17 to 20 that is every league and group the game's team list has.

For each: accepted or refused and the exact message; **name changed**; **players changed**; and whether the team is
still listed in its own league. Each source club should end up with the target's former players (the swap seen in test
18): worth a look at two or three of them.

**The three special cases** (in the same folder, imported with the rest)

| Test | Files | What it does | I expect |
|---|---|---|---|
| **53** | `test53_a_…` and `test53_b_…` | A swap written out in full: SHAHR KHODROU's squad (AFC Champions League; M. SAFAEIAN, O. MANSOURI, A. NEMATI) under NANCY's code (Ligue 2), and NANCY's (B. VALETTE, E. SEKA, A. EL KAOUTARI) under SHAHR KHODROU's. Named T53 SHAHR KHODROU and T53 NANCY. | Both accepted; the two squads have changed leagues. |
| **54** | `test54_aaa_…` and `test54_zzz_…` | One squad twice: UTRECHT's 34 players (Eredivisie; E. OELSCHLÄGEL, T. ST. JAGO, W. JANSSEN) under REGGIANA's code (Serie B, T54 COPY ONE) and under LIVINGSTON's code (Scottish Premiership, T54 COPY TWO). | Both accepted. The players end at T54 COPY TWO (read last by name); T54 COPY ONE has none or another team's. UTRECHT loses them. |
| **55** | `test55_col_…` | A team with **no players**: PATRIOTAS BOYACÁ's code (Colombian league), named T55 EMPTY TEAM. | Not known: refused, or accepted with an empty squad. |

### Results of tests 25 to 57 (22 November, imported in one go)

- **Every file was accepted**, in every league and group, national teams included.
- **Every team stayed in its own league** (all 30 ticked "same league").
- **The players changed in 29 of 30.** The exception is test 37 (VITÓRIA GUIMARÃES, Liga NOS): the players were not
  seen to change. To be looked at again before it is called a rule.
- **The name changed in 8 of 30**: WREXHAM AFC, WOLVERHAMPTON WANDERERS, STURM GRAZ, PSS SLEMAN, VFL WOLFSBURG, UD LAS
  PALMAS, VILLARREAL CF, AL ITTIHAD. With tests 17 to 20: U. DE CONCEPCIÓN and CF MONTRÉAL changed, COBRESAL and
  BURKINA FASO did not.
- **Test 53 (swap):** both accepted, each squad now at the other's code, in the other's league; neither name changed.
- **Test 54 (one squad under two codes):** both accepted. T54 COPY TWO (LIVINGSTON's code, read last) has UTRECHT's
  players. REGGIANA (COPY ONE) and UTRECHT have **11 players each**.
- **Test 55 (no players):** accepted. No team is named T55; what PATRIOTAS BOYACÁ's squad looks like was not noted.

**The name follows the crest setting in the file, in all 36 teams tested** (tests 17 to 20, 25 to 52, 56, 57 and
both halves of 53). Checked against the files afterwards: every team whose file names a crest of its own (a crest
number and a crest image name) took the new name, and every team whose file says "the game's own crest" (crest number
0xFFFF, no image name) kept its old name. No exception either way.

That is also where the game's licensed teams are, so two explanations fit: the game locks licensed teams' names, or
the game shows its own name whenever the file keeps the game's own crest. The option file itself has two teams that
bear on it: COMO 1907 at Brescia's code (Serie B) and ATLÉTICO HUILA at Cúcuta Deportivo's code (Colombian league),
both with a crest of their own. If the game shows them under those names, a name can change in a licensed league.

Three files settle it (same folder, own squads, only the name and the crest setting touched):

| Test | File | Team | What is in the file | If the crest setting decides | If the league's licence decides |
|---|---|---|---|---|---|
| **58** | `test58_den_agf.ted` | AGF (3F Superliga) | new name T58 NAME ONLY, the game's own crest | name stays AGF | name stays AGF |
| **59** | `test59_den_brondby.ted` | BRØNDBY (3F Superliga) | new name T59 NAME AND CREST, a crest of its own (Arsenal FC's image, already in the game) | **name changes** | name stays BRØNDBY |
| **60** | `test60_ita1_fiorentina.ted` | ACF FIORENTINA (Other European Teams) | new name T60 NAME NO CREST, set back to the game's own crest | **name does not change** | name changes |

**Results of tests 58 to 60 and the two option-file teams (22 November):**

| Check | What the game showed |
|---|---|
| 58, AGF: new name, game's own crest | No change: still AGF. |
| 59, BRØNDBY: new name and a crest of its own | **No change**: still BRØNDBY. |
| 60, ACF FIORENTINA: new name, set back to the game's own crest | **Name changed** to T60 NAME NO CREST; the crest is the game's original one for that place ("DW Blue Red"). |
| COMO 1907 (Serie B, Brescia's place) | Brescia is still there: the option file's name does not show. |
| ATLÉTICO HUILA (Colombian league, Cúcuta Deportivo's place) | The name ATLÉTICO HUILA shows, with Cúcuta Deportivo's crest. |

So **the crest setting does not decide the name: the team does.** A licensed team keeps the game's name whatever the
file says (59, and Brescia); an unlicensed team takes the file's name whatever its crest setting (60). The match with
the crest setting in the 36 earlier cases was the option file's makers leaving the game's own crest on exactly the
teams they could not rename.

It is by team, not by league: Cúcuta Deportivo's place in the Colombian league took a new name while SANTA FE's
(test 30) did not. And a name and a crest are separate: Atlético Huila has the new name with the old crest.

**For the studio:** a club put on a licensed team's code will play with its own squad under the **old team's name**
(and probably its crest) in the game. The studio does not say so today.

**What a team is left with when its players are taken** (test 54, and the "swap" of test 18): not its old squad and not
nothing. REGGIANA and UTRECHT each ended with 11 players. Which 11 was not noted. The likely reading is that the game
keeps every team at 11 by giving it players the taker no longer uses, but that is a guess.

### The four leagues not tested yet (tests 61 to 64)

The game's team list has four more leagues and groups. The option file has no team file for any of their teams, so the
project has none of them and the earlier run could not reach them. Each test file is another club's squad written under
one of their codes (built from that club's own file with the code replaced), with the players tagged as before. Same
folder, `game-tests-all-at-once\\WEPES`.

| Test | File | Code written | League or group in the game | Should be named | Players |
|---|---|---|---|---|---|
| **61** | `test61_thai_league.ted` | Buriram United (1493) | Thai League | T61 ATLÉTICO TUCUMÁN | T61 C. LUCCHETTI … (32) |
| **62** | `test62_j1_league.ted` | Consadole Sapporo (144) | J1 League | T62 BRUSQUE | T62 RUAN CARNEIRO … (23) |
| **63** | `test63_j2_league.ted` | Jef United Chiba (148) | J2 League | T63 COLUMBUS SC | T63 P. KITCHEN … (26) |
| **64** | `test64_other_teams_africa.ted` | Pleasure Horn (1386) | Other Teams (Africa) | T64 DALIAN PRO | T64 ZHANG CHONG … (30) |

Not known for any of them. A refusal with "…the team to import data to does not exist…" would mean the game does not
have that league at all (the list of codes comes from PES Master, not from the game). If accepted: name changed or
not, players changed or not, and where the team is listed.

**Results (22 November):**

| Test | What the game showed |
|---|---|
| 61, Thai League | Accepted. The players changed; the team's name did not. |
| 62, J1 League | **Refused.** |
| 63, J2 League | **Refused.** |
| 64, Other Teams (Africa) | **Refused.** |

The user: "i don't have those competitions in the game". So the J1 League, the J2 League and Other Teams (Africa) are
in PES Master's list but not in the console game, and their codes are not codes of the game. The studio no longer
offers them (`PES21_NOT_IN_GAME`). The Thai League behaves like the other licensed leagues: a squad goes in, the name
stays.

With that, every league and group the game has was tried: 35 accept another club's squad on one of their codes.

## Not in this run

- **Question 1** is answered: Molumby showed in both West Bromwich Albion and Ireland.
- **Question 3** (the look of a player on a taken-over ID) needs no file. West Bromwich Albion already has 19 such
  players in the game: look at their faces and builds, for example Ben Cisse, who took K. BARTLEY's ID.
- **Question 4a** needs no file: look at the teams at codes 4240 and 4040 in the game.
- **Question 5a** (a real ID no team file lists): I could not find an ID that is certain to be in PES 2021 and in no
  file, so a test file would prove nothing. **5b** starts in the game (make a player in Edit, export the team).
- **Questions 7 and 9** need images imported with the team files, and free image space; they are better done one at a
  time from the studio.
- **Question 8**: a team-info file is the option file's own file with only the name changed, so on these teams it
  would show nothing new.

## Results

| Test | What the game showed |
|---|---|
| 1 | Accepted. JOÃO VICTOR shows correctly at Alianza Lima and is gone from Botafogo SP. |
| 2 | Accepted. Botafogo SP has 25 players; he is still correct at Alianza Lima. |
| 3 | Accepted. A. ZELA is gone from Deportivo Binacional. He still exists in the game. |
| 4 | Accepted. Coquimbo Unido shows an empty place for him; his own player record can still be opened, with all details correct. |
| 5 | Accepted. A. ZELA is back at Deportivo Binacional and the empty place at Coquimbo Unido is gone. |
| 6 | Both accepted. The team is named ORDER ZZZ. The import screen listed `test06_aaa` before `test06_zzz`. |
| 7 | 17 players: accepted, and the team can be picked for a match. |
| 8 | 15 players: accepted, and the team can be picked for a match. |
| 9 | 11 players: accepted, and "it worked fine". |
| 10 | Accepted. **All 26 players show now**, the five included. |
| 11 | All accepted. Each of the five is back at his old club and gone from West Bromwich Albion, with no empty places left there. |
| 12 | Accepted. The five are empty places again at West Bromwich Albion. |
| 13 | All accepted. Each old club lost its player; the five are still empty places at West Bromwich Albion. |

## Cause found (test 14, 22 November)

Test 14 put the five JUNIOR-ID players at places 3 to 7 and five others last. The photo afterwards shows Morgan, Bany,
Tunde, Stewart and Parmar by name, and the five now at the end (Ben Cisse, Nathaniel Phillips, Chris Mepham, Brayann
Pereira, Nolan Galves) empty. So it is **the place, not the player or his ID**.

The reason is in the team file. It holds a **squad order table**: 40 bytes that list the squad's places in the order
the game's squad list shows them. The first photo matches West Bromwich Albion's table place for place. The game draws
a place only if the table lists it. In the option file, 460 team files list all 40 places; **185 list only the places
their squad had** and pad the rest. West Bromwich Albion's lists 21, so places 22 to 26 were drawn as "---" whoever sat
there. The studio copied the table from the option file's file and never extended it.

This also explains the earlier results that looked like rules about players:
- **Test 1 worked** because ALIANZA LIMA's table lists all 40 places, so the added 32nd place showed.
- **Test 4 failed** because COQUIMBO UNIDO's table lists exactly its 30 places, so the added 31st was empty. It had
  nothing to do with A. ZELA being in no team.
- **Importing twice** could not help: the file was the same each time.
- Test 10's "all 26" stays unexplained and was most likely a miscount.

**Fixed in the studio** (`TED.build`): the table is written again with every filled place. Players keep their turn in
the order, and new places follow.

**To confirm in the game**, both in the same `WEPES` folder:

| Test | Import | Expect |
|---|---|---|
| **15** | `test15_eng2_wba.ted`: West Bromwich Albion, the 26 players in the export's own order, with the table listing all 26. | All 26 names, no "---" rows. |
| **16** | `test16_ame_coq.ted`: Coquimbo Unido with A. ZELA added as the 31st, with the table listing all 31. | A. ZELA shows by name. |

**Confirmed in the game (22 November):** test 15 showed all 26 players at West Bromwich Albion, and test 16 showed
A. ZELA at Coquimbo Unido. The fix holds.

## Correction after the squad-list photo (22 November)

The photo of West Bromwich Albion's squad list shows 21 names and five empty places, and **the five moved players are
all there by name** (Max O'Leary, Matt Ingram, Nathaniel Phillips, Conor Townsend, Mikey Johnston). The empty places are
five other players of the file: **Jimmy-Jay Morgan, Tammer Bany, Kareem Tunde, Barney Stewart and Rio Parmar**. So
wherever tests 10 to 13 and the notes below say "the five", they were read as the wrong five, and the points marked
*(withdrawn)* no longer stand.

What those five have in common:
- Each is on an ID taken over from a player of **JUNIOR** (E. CETRÉ 118884, J. PAJOY 43936, DANIEL MORENO 126278,
  C. VALENCIA 120021, L. SANDOVAL 123902). JUNIOR was deleted in the studio, so its file is not exported, but the game
  still has JUNIOR with those players.
- They are the last five places of the file (22 to 26). The option file's West Bromwich Albion had 21 players.

One player does not fit the first point: Aune Heggebø is also on a JUNIOR player's ID (M. BORJA 60855), sits at place 21,
and shows by name. So either the place decides (anything past the 21 the team had is empty), or the ID does and
Heggebø is an exception.

**Importing the file again did not help** (the user, 22 November, after the photo): West Bromwich Albion's file was
imported twice more and the five places stayed empty. So the one time all 26 showed (test 10) is not explained. The
sequence that led to it: the full export of 21 November (26 places, five empty), then tests 1 to 9 on six teams of
Other Teams (Latin America), then West Bromwich Albion's file alone. Since then the old clubs' files were imported
twice (tests 11 and 13) between the West Bromwich Albion imports.

To look at in the game, no import needed: JUNIOR's squad (are E. CETRÉ, J. PAJOY, DANIEL MORENO, C. VALENCIA,
L. SANDOVAL and M. BORJA still listed, and how many players does it have?), and the three other players on JUNIOR IDs:
R. LÓPEZ at Vitória, M. KELLER and M. DEME at Young Boys (shown by name, or empty places?).

**Test 14** separates the two: `test14_eng2_wba.ted` is the same 26 players, with the five JUNIOR-ID players moved up to
places 3 to 7 and Ben Cisse, Nathaniel Phillips, Chris Mepham, Brayann Pereira and Nolan Galves moved to the last five.

| The game shows | Meaning |
|---|---|
| Morgan, Bany, Tunde, Stewart and Parmar are still empty | The IDs are the cause: a player on an ID that still belongs to another team in the game is not shown. The studio must not offer IDs of a team that is deleted in the studio but still in the game. |
| Those five show, and Cisse, Phillips, Mepham, Pereira and Galves are empty | The place is the cause: the game does not fill places beyond the squad size it had. |
| All 26 show | Neither alone; note it and I look at what else changed. |

## What the results show

- **An empty place is not a lost player.** His record is in the game with all his details (test 4); only the team's
  squad place is empty.
- *(withdrawn)* "Importing the new club's file a second time fills the places." Test 10 reported all 26 showing, but
  the photo shows which players were empty was misread, so this is not established.
- *(withdrawn)* "New club first failed for the five in test 12." The five moved players show by name; moving a player
  between clubs works (tests 1 and 2, and the photo).
- *(withdrawn)* "A player who is in no team when the file is read gets an empty place." The empty place in test 4 came
  from Coquimbo Unido's squad order table (see "Cause found").
- **A club that takes a player removes him from his old club** (tests 1, 5 and 11): one player is never in two clubs.
- **Files in one import are read in name order, and the last one wins** (test 6).
- **Squads of 17, 15 and 11 are accepted and playable** (tests 7 to 9). There is no floor at 18.

## Still to confirm

| Step | Import | Expect |
|---|---|---|
| 14 | `test14_eng2_wba.ted` (see the correction above) | Decides between "the IDs" and "the place". |
| B | `test03_ame_bin.ted`, then `test04_ame_coq.ted`, then `test04_ame_coq.ted` **again** | An empty place after the first import of test 4, A. ZELA correct after the second. |
