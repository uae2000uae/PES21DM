# Game test run of 26 November 2026

One sheet for everything still to test: the new tests on player IDs (question 25) and competition file fields
(question 32), and the cells of **Game codes → What can change** that still show the hourglass.

Write what the game shows in the **Result** column, or tell it in chat with the test number.

## Before you start

- The game has your option file installed, as now.
- Copy `D:\PES21-local-test\final-exports\game-tests-2026-11-26\WEPES` to the USB drive (the folder itself, at the top).
  For part C, copy the older test folders named there as well; the game does not mind extra folders.
- Import **one file at a time**: untick everything, tick the one file named in the row.
- Import Team: **Apply player and squad data** on.
- A test file changes Sparta Rotterdam, Persita Tangerang or the competition on code 52 (BRI Super League). The
  `zz_restore_…` files put them back; import them when you finish (they are last in the list).
- Nothing here goes into the studio. Do not confirm any export as installed because of these files.

## A. New players on new IDs (question 25)

All five files are Sparta Rotterdam with players added at the end of the squad. Look in **Edit → Teams → Sparta
Rotterdam → squad**, and for 25e also Persita Tangerang.

| Test | Import (Import Team) | Look at | I expect | If not | Result |
|---|---|---|---|---|---|
| 25b | `t25b_351_sparta_two_new_ids.ted` | Sparta's squad: TEST NEWID A and TEST NEWID B | Both show by name (27 players) | A "---" row, or the file is refused: write which player and the message | |
| 25c | `t25c_351_sparta_four_id_ranges.ted` | T25C BIT30, T25C BIT31, T25C RANGE01, T25C PLAIN | Each shows by name (29 players) | Write which of the four show and which are "---": that tells which ID ranges work | |
| 25d | `t25d_351_sparta_ten_new.ted` | T25D NEW 01 to T25D NEW 10 | All ten show (35 players) | Write how many show | |
| 25e | `t25e_351_sparta_taken_id.ted` | Sparta: T25E TAKEN ID. Then Persita Tangerang: its player KARTIKA AJIE | Sparta shows T25E TAKEN ID; write what Persita shows in his place (his own name, the test name, or a missing row) | Write what both teams show | |
| 25f | `t25f_351_sparta_haaland_look.ted` | T25F LOOK KEPT and T25F LOOK OWN: open each player and look at his face and body. Then check E. HAALAND at Manchester City is unchanged | Write whether each looks like Haaland or like a generic player | Write what you see | |

What each answer decides:
- **25b and 25c:** whether the studio may give a new player a new ID, and from which range. 25c's four IDs are: bit 30
  (1073882919), bit 31 (2147487903), the range the downloaded league used (16969984) and a plain unused number (1004986).
- **25d:** whether many can come at once.
- **25e:** what happens to the player who had the ID. Today the studio assumes he is lost at his team.
- **25f:** whether a new player keeps the look of the record he was copied from. KEPT still carries Haaland's
  appearance entry; OWN has it pointed at the new ID.

Restore: `zz_restore_351_sparta.ted`, and `zz_restore_2401_persita.ted` if Persita changed.

## B. The other fields of a competition file (question 32)

Six files for the competition on code 52 (BRI Super League in your option file). Each also puts a tag in front of
the name (T32A …), so you can see the file was taken. Import with **Import Competition**.

| Test | Import | What the file changes | Look at | Result |
|---|---|---|---|---|
| 32-0 | `t32_0_52_name_only.ced` | The name only (the control) | The league's name shows "T32-0 BRI SUPER LEAGUE". Note how the league looks and plays now: logo, match presentation (entrance, boards, ball), number of teams and matches, and which cups play during a Master League season with one of its clubs | |
| 32a | `t32a_52_bytes108_to_952.ced` | Bytes 108-109 from 140 to 952 (the Champions League's value) | The same things as 32-0: what is different? | |
| 32b | `t32b_52_bytes110_to_321.ced` | Bytes 110-111 from 4417 to 321 (MLS's value) | The same: above all the league's format and number of teams | |
| 32c | `t32c_52_bytes106_to_61.ced` | Bytes 106-107 from 50 to 61 (a number no file uses) | The same: above all the logo | |
| 32d | `t32d_52_byte840_to_1.ced` | Byte 840 from 7 to 1 | The same | |
| 32e | `t32e_52_all_four.ced` | All four together | The same | |

If a file is refused, write the message: that is an answer too.

Restore: `zz_restore_52_competition.ced`.

## C. What can change: the cells still not tested

These files were built earlier and are still waiting. Nothing new was needed for them.

| Cell (hourglass in What can change) | Tests | Folder under `D:\PES21-local-test\final-exports` | Results page |
|---|---|---|---|
| Team emblems: leagues with a file, MLS, the game's own leagues, pools, a national team | 81 to 85 | `game-tests-what-can-change` | `docs/game-test-run-what-can-change.html` |
| Classic Teams: which teams, names, players, emblems | 86, 87 | `game-tests-what-can-change` | the same page |
| Number of teams, every kind of competition | 88 to 115 | `game-tests-31-teams` | `docs/game-test-run-31-teams.html` |
| The game's own leagues: name and logo | 13c (test 24) | `game-tests` (`test24_slot10.ced`) | `docs/GAME_TESTS.md`, question 13 |
| A team's country | 24b | `game-test-24` | `docs/GAME_TESTS.md`, question 24 |
| Cups: which teams and how many | 19, 27 | no file: looked at in the game (the steps are in `docs/GAME_TESTS.md`, questions 19 and 27) | |
| FIFA World Cup: number of teams, emblems | 85 (emblem); the number is question 23 | `game-tests-what-can-change`; question 23 is looked at in the game | |

## Anything else you noticed

Write it here or in chat.
