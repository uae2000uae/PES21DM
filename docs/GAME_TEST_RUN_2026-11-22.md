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
