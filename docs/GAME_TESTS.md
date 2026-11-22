# Game tests: questions only PES 2021 itself can answer

The studio's rules rest on how the game behaves. Some of that was measured in the game (the PS5 tests of 19 November
2026); the rest was worked out from the option file's files or assumed. This is the list of the points that are still
assumed. Each one names the rule that depends on it, the steps to test it, and what each result would mean for the app.

How to use it:
- Fill in the **Result** line after testing (date, console, what the game showed, the exact message if it refused).
- When a result settles a question, move the fact into the rule book (`.claude/skills/pes21-rules/SKILL.md`) with its
  **Why** (the test and date), change the code if the assumption was wrong, and mark the question *Answered* here.
- Add a new question whenever a rule is written from an assumption about the game instead of a test.

Before every test:
- Take a snapshot in the studio first (Compare & versions), so the set-up can be undone.
- Export with *Changes only* and *Save on this computer*, and import only the files the test names
  (Edit → Data Management → Import/Export → Import Team, tick just those files).
- Do **not** press *PES imported it: make it the baseline* for a test export. Afterwards, restore the snapshot in the
  studio and import the option file's own files for the teams you touched, so the game is back to the installed state.

Last brought up to date on 22 November 2026. Examples are from the 2026-27 option file.

| # | Question | Status |
|---|---|---|
| 1 | Can a player who is only in a national team's file be added to a club on the same ID? | Answered: yes (test 1a) |
| 2 | One player ID in two club files: what does the game end with? | Partly answered: the club imported last takes him, the other loses him |
| 3 | Does a player who takes over another player's ID keep that player's face and look? | Open |
| 4 | Is a team slot's second file really imported, and in which order? Does the game need it at all (4c)? | Order answered: name order, the last file wins. The rest is open, and 4c (can the 29 second files go) |
| 5 | Does Import Team accept a player ID the game has but no team file lists? | Open |
| 6 | What is the smallest squad Import Team accepts? | Answered: 17, 15 and 11 are accepted and playable |
| 7 | Do the studio's "PES default image" markers work in the game, both ways? | Open |
| 8 | What does a team-info file do when *Apply player and squad data* is on? | Open |
| 9 | Two images with one file name: which one does the game keep? | Open |
| 10 | A player moved from one club to another: which files must be imported, and in which order? | Answered: a move works. The empty places came from the team file's squad order table, which listed only the places the squad had before it grew (test 14); fixed in `TED.build` and confirmed in the game by tests 15 and 16 (22 November 2026) |
| 11 | Why were the teams put in place of MLS teams all rejected? | Open: not the code (an MLS code accepted another squad, test 19) |
| 12 | Team IDs: can any team file go onto any team code the game has? | Answered: yes, in every league and group (tests 17 to 20, 25 to 57). A licensed team keeps the game's name whatever the file says, an unlicensed one takes the file's (tests 58 to 60). Open: test 37, where the players did not change |
| 13 | Competition IDs: which number does the game go by, and which competitions can a file change? | Mostly answered: code and slot must be the competition's own pair (tests 21 to 23); the game's own competitions: not settled (test 24 refused) |
| 14 | Teams within competitions: what decides which league or cup a team is in? | Answered for leagues: the team's code, in all 34 leagues and groups tried (no file holds a team list). Cups: open |
| 15 | Can a competition take more teams than it has, and how many? | Open |
| 16 | Can the game's "unregistered players" be used as new players from a team file, and how many are there? | Open |
| 17 | What else of a licensed team can a file change, and are the "name may be fixed" teams fixed? | Open (the name is answered: tests 58 to 60) |
| 18 | What does the game keep of a team the studio deletes? | Open |

---

## 1. Can a player who is only in a national team's file be added to a club on the same ID?

**Why it matters.** The rule book says club and country share one ID in the game, so a national-team player added to a
club keeps his ID and the health check's first button is *Keep in both teams* ("Never give the club entry a new ID for
this: that makes two players of one man"). That was checked in the files only: 1,264 player IDs are in both a national
team's file and a club's (S. COLEMAN 40283: IRELAND + EVERTON FC). Another 1,174 are in a national team's file only. For
those, nobody has seen the game accept the same ID in a club file. If it does not, every such player a Live Update adds to
a club would make the game refuse that club's file.
*Depends on it:* rule book §4 "The row's commands" (*Keep in both teams*), `pcMay` (a national team's suggested code is
the record he has at his club), database rules §2 link rule 3.

**Example.** Jayson Molumby, game ID 118411: in IRELAND's team file, in no club file. A Live Update added him to WEST
BROMWICH ALBION with the same ID.

**Test 1a: same ID in both teams**
1. In the studio, Health check → Game IDs → *Players the game has in another team's file*: on Molumby's row at West
   Bromwich Albion press **Keep in both teams**. Leave every other West Bromwich Albion player the game doesn't have
   out of the test (remove them, or leave *Also write players no game file has* unticked so the export leaves them out).
2. Change one visible thing on his West Bromwich Albion entry only, for example his shirt name or one rating, so you can
   tell later whose data the game shows.
3. Import / Export → Summary: check the notes do not list him as "left out, no game file has him". Export *Changes
   only*. It should contain West Bromwich Albion's team file and not IRELAND's.
4. In the game, Import Team: only West Bromwich Albion's file, with *Apply player and squad data* on.
5. Look at: whether the import is accepted; West Bromwich Albion's player list (is he there, with the changed detail?);
   IRELAND's player list (is he still there, and does it show the changed detail too?).

| The game shows | What it means for the app |
|---|---|
| Import accepted; he is in both teams; the change shows in both | The rule holds for national-only players too. *Keep in both teams* is right; nothing to change. Record it as tested. |
| Import accepted; he is at the club but gone from IRELAND | The game moved him. *Keep in both teams* must not be offered for a national-only player: the national team's file has to be written again after the club's, or the row needs another fix. Test importing IRELAND's file afterwards. |
| Import accepted; he is in both, but the change shows at the club only | Club and country are separate records after all. The rule "two records with the same game ID" needs rewording and test 1b decides how to add such players. |
| Import refused ("This data includes players who cannot be imported") | A national-only ID cannot be written into a club file. The row must stop offering *Keep in both teams* when no club file holds the ID, and the club entry needs a free ID (test 1b). Note the exact message. |

**Test 1b: the club entry on an ID of its own** (run it later, or at once if 1a is refused)
1. Restore the snapshot. On Molumby's West Bromwich Albion entry take the ID off and give him a free one: Game codes →
   Players → *Players with no Codes* → *Give him a code* → Apply.
2. Export *Changes only*, import West Bromwich Albion's file.
3. Look at: West Bromwich Albion and IRELAND both list a J. MOLUMBY; are they two different players (edit one in the
   game: does the other change)? Does the club one carry the replaced player's face (question 3)?

| The game shows | What it means for the app |
|---|---|
| Two separate players, one per team | A copy on its own ID works but doubles the man, as the rule book says. Use it only if 1a fails; say so on the row. |
| Import refused | Neither way works for a national-only player; he can only join a club by being made in the game's Edit first (question 5). |

**Result:** 21 November 2026, the user, First install export of 21:54 (`WEPES_full_2026-11-21_1754`): Jayson Molumby
appeared in both WEST BROMWICH ALBION and IRELAND on the same ID, 118411. Test 1a holds: a national-only player can join
a club on his own ID. Not noted: whether a change made at the club shows in IRELAND too. Test 1b was not run.

---

## 2. One player ID in two club files: what does the game end with?

**Why it matters.** A player record is one record in the game, but two team files can list its ID: two different men (M.
Samuelsen at AAB and Marc Guiu at Chelsea, both 109047; 28 such IDs in the option file), or the same man after a
transfer when his old team's file still lists him. The health check says which player "the game ends with": the one in
the part imported last (WEPES/1 … 7), and for two files in the same part the rule book says "not known". The studio has
never seen what the game does with the other team: whether he is listed in both, whether the first team loses him and is
left a player short, or whether the second file is refused.
*Depends on it:* rule book §7 "Two different players on one game ID" (`sharedIds`, *Keep it with …*), "The same player in
two clubs", and the level of both health-check groups (a must-fix only if the game breaks something).

**Test 2a: the installed option file, nothing to export**
1. In the studio, Health check → Game IDs → *Different players on one game ID*: note three or four rows, with the part
   (WEPES/1 … 7) of each team's file. Include 109047 (AAB / Chelsea) and at least one pair whose files are in the
   **same** part.
2. In the game, with the option file installed as it is, open both teams of each pair (Edit → Teams → the team →
   Players).
3. Look at: which team lists a player on that record and under which name; whether the other team has one player fewer
   than its file; whether both teams list the same player.

**Test 2b: the order within one part**
1. For a same-part pair from 2a, import the two team files one at a time, first team A then team B, and look; then B
   then A, and look again.
2. Then import both ticked together in one go, and look.

| The game shows | What it means for the app |
|---|---|
| The player is at the team imported last, under that file's name; the other team is one player short | "The file imported last wins" holds. Keep the rule; the other team's place in the squad may then break the "no gaps in places 1–18" rule at the next export from the game, so the group stays a must-fix. |
| Both teams list him, with the last file's name and details | One record shared by two clubs is possible. *Same player in two teams* could become a suggestion instead of a problem; *Different players on one game ID* stays (one of the two men is lost). |
| The second file is refused | An ID in two club files blocks an import. Both groups are must-fix and the export should refuse to write the pair. |
| Same part, both ticked together: the result follows the file names or folder order | Write that order into the rule book in place of "same part: not known" and show it in the health check. |
| Same part: no fixed order | Keep "not known", and say on the row that the result depends on the import order. |

**Result:**

---

## 3. Does a player who takes over another player's ID keep that player's face and look?

**Why it matters.** Import Team never creates a player, so a new player gets into the game by taking over the ID of a
player the game has and no squad uses (Game codes → Players). The rule book states that the export writes his name, age,
height, position, ratings and nationality over that record and that "the look stays the replaced player's until edited in
the game". That is how the file is written; nobody has looked at the result in the game. The README still says something
else ("their appearance is copied from a template player").
*Depends on it:* rule book §4 "Player codes" (`pcGive`, `pcPlanMake`: the order of suggested codes, same position first),
and what the studio should tell the user to do in the game after an import.

**Test**
1. In the studio, pick a team with a player under *Players with no game ID* and give him a free code two ways, on two
   different players: (a) a free player of the team the game has at the same code; (b) a free player of a team deleted
   from the studio (*Free codes* → Players). Note each replaced player's name, team and what he looks like in the game
   before importing.
2. Export *Changes only*, import that team's file.
3. Look at, for each new player: name, shirt name, age, height, position, ratings, nationality (the new player's?); face,
   hair, skin, build, boots (the replaced player's?); the name the commentary and the line-up screen use.
4. For (b): open the deleted team in the game (the game still has it). Is the replaced player still listed there too?

| The game shows | What it means for the app |
|---|---|
| New details, old look | As the rule book says. Add a note to the export's notes and CHANGES.txt: "edit the look of these players in the game", with the list. Correct the README line. |
| New details and a neutral or default look | Better than assumed; drop "the look stays the replaced player's" and the same-position preference matters less. |
| Some details stay the old player's (name, nationality, age) | The team file does not carry everything. List which fields the game ignores; the studio must say they are set in the game's Edit. |
| (b): he is now listed in both the new team and the deleted team | A free code from a team the game still has behaves like question 2. Codes of deleted teams are then free only after that team's slot is overwritten; `pcPlanMake` should prefer the other sources. |
| Import refused | Taking over a code does not work for that kind of code; note which of (a) or (b). |

**Result:**

---

## 4. Is a team slot's second file really imported, and in which order?

**Why it matters.** The option file has two files for 29 team slots, 9 of them with different squads and some for a
different club (Sheriff / Le Mans at 4240, Jobazavar / Charlotte at 4040). The studio assumes the numbered parts
(WEPES/1 … 7) are imported in order, so the later part's file is what the game ends with: it builds the team from that
file, writes both files with the same data, and counts the 33 player IDs that only the other file lists as "in the game"
(free codes to take over), because "the game imported both files".
*Depends on it:* database rules §5.4 (`ofPart`, last one wins) and §6.2, rule book §4 "A team slot's second file gets the
same squad as its first" and "Player codes" (`t.of.copies`, 16,775 IDs against 16,742).

**Test 4a: the installed option file, nothing to export**
1. In the game, open the teams at slots 4240 and 4040. Which club is there: Le Mans or Sheriff, Charlotte or Jobazavar?
2. In the studio, Game codes → Players → *All player codes*: find two or three players that only the earlier file lists
   (Sheriff's or Jobazavar's). In the game, search for them by name (Edit → Players, or the transfer search).
3. Look at: whether a player of that name exists, and which team he is listed in or whether he is a free agent.

**Test 4b: the order**
1. Import the two files of one slot ticked together in one go, from a USB that keeps the option file's folders. Which
   club does the game show? Repeat with the two files copied into one folder.

| The game shows | What it means for the app |
|---|---|
| The later part's club at both slots; the earlier file's players exist under their names | As assumed. Both files were imported, the later one last. Record it as tested. |
| The later part's club; the earlier file's players do not exist under those names | The earlier file was skipped or refused. Its 33 player IDs are not known to be in the game: stop counting second-file-only players as free codes (`pcFileList`). |
| The earlier part's club | The order is not 1 … 7. The build takes the wrong file for these slots; `ofPart` must follow the order found in 4b. |
| 4b: the result changes with the folder layout | Import order follows the folders or file names; write the order into the rules. |

**Test 4c: does the game need the second file at all?** (asked 2026-11-22)

Why: the studio writes both files of a slot with the same data, so the export carries 29 team files more than there are
teams, and *Don't write a team's second team file* (`settings.ofNoSecond`, off) stays off until this is known. The 29
second files come from the option file itself, in three kinds:
- **A second Russian league (16):** `11. Tinkoff Russian Super/Ted/rus_*.ted` and a later set
  `15. Swiss League/11. Tinkoff Russian Super Liga JL/Ted/rus_*_jackliee.ted` (Akhmat Grozny, Arsenal Tula, CSKA Moskva,
  Dinamo Moskva, Khimki, Krasnodar, Lokomotiv Moskva, Rostov, Rotor Volgograd, Rubin Kazan, Sochi, Spartak Moskva, Tambov,
  Ufa, Ural, Zenit).
- **A file left in another league's folder (5):** Charlotte (`ame_jobazavar` / `mls_charlotte`), Inter Miami
  (`ame_imiami` / `mls_miami`), Schalke 04 (`oeu_schalke` / `ger_schalke`), Atlético Huila (`col_ahuila` /
  `ame_huila`), Le Mans (`oeu_sheriff` / `fra1_lemans`).
- **An old and a new file in one folder (8):** Atlético Mineiro, Vila Nova, Caracas, Nacional, Jeonbuk, Melbourne
  Victory, Suwon Samsung Bluewings, Republic of Korea.

Steps (one team of each kind, for example Zenit, Schalke 04 and Vila Nova):
1. Edit the three teams in the studio (one player's rating is enough). Tick *Don't write a team's second team file*,
   export *Changes only* and check the export has one team file for each of them and CHANGES.txt lists their second files
   to delete.
2. Import only those three team files. In the game, look at the three teams: the edit, the squad, the name, the emblem
   and kit, and whether they are still in their league and cup.
3. Then, on a copy of the installed USB folder, delete the three second files and import the whole folder again (or the
   files of those three leagues). Look again: same teams, same squads, no import errors.
4. Repeat 2 and 3 for Charlotte (the second file is another club, Jobazavar): do the players only `ame_jobazavar.ted`
   lists still exist in the game (search them by name)?

| The game shows | What it means for the app |
|---|---|
| All three teams right with only the main file, and nothing lost after deleting the second files | The second file isn't needed. Turn *Don't write a team's second team file* on by default, and say so in the rule book. |
| Right with only the main file, but Charlotte's Jobazavar-only players are gone after deleting `ame_jobazavar.ted` | Only a second file for the same club can go. Keep writing a second file that is another club's, or stop counting its players as in the game (`pcFileList`). |
| A team comes out wrong (old squad, old name, out of its league) with only the main file | The game still reads the second file. Keep writing both files with the same data (as now), and keep the option off. |

**Result:**

---

## 5. Does Import Team accept a player ID the game has but no team file lists?

**Why it matters.** PS5 tests 2 and 6 showed the game refuses a team file that lists a player it does not have, and the
refused player in test 6 had an edit ID the studio made up. So both exports leave out every player no game file has. The
option *Also write players no game file has* exists for "IDs the game already has, such as unregistered players", and
the rule book says "new players are made in the game first (Edit), then written by their IDs". Neither has been tried:
whether the game accepts a real ID it has outside every team file, and which ID it gives a player made in Edit.
*Depends on it:* rule book §4 "Import Team only changes players the game has" (`settings.ofNewPlayers`,
`E.parts.newPlayers`), the health check's level for "Players no game file has", and the 25 players a Live Update of
West Bromwich Albion brought in with eFootball's IDs.

**Test 5a: a real ID outside every team file**
1. In the studio, find a player under *Players the game has in another team's file* / "no game file has him" whose ID
   came from eFootball and who was already in PES 2021 in 2020 (an older player, now at a team whose option-file file
   does not list him). Make him the only such player in his team: the squad otherwise as the option file has it, 18 or
   more players.
2. Tick *Also write players no game file has* (Import / Export → Export Option File → Options). Export *Changes only*,
   import that one team file.
3. Look at: accepted or refused; if accepted, is he the right man (name, look) and where was he before?

**Test 5b: a player made in the game**
1. In the game, Edit → make a new player and register him at a team. Export that team (Export Team) to the USB.
2. In the studio, Import / Export → Import files: add that team file to Review and read the new player's game ID.
3. Change his name in the studio, export the team, import it, and look at whether the game accepts it and shows the
   change.

| The game shows | What it means for the app |
|---|---|
| 5a accepted, right player | The option does what it says. A player whose own record the game has outside the files can be written by his ID; the health check can offer "Use his own ID" for him. |
| 5a refused | A real ID no file lists is no better than a made-up one. Remove the option, or say on it that it only works for players made in the game's Edit. |
| 5a accepted, but a different man is under that ID | eFootball's IDs and the game's are not the same list for him; never write a source's ID without a game file confirming it (as the rule book already does by default). |
| 5b: the game's ID is in the edit range (bit 30 or 31) and the re-import is accepted | "Make him in the game first, then write by ID" works. Write the range the game used into the rule book; the studio could list "players to create in the game" in its notes. |
| 5b: the re-import is refused, or the ID changes between exports | Players made in Edit cannot be addressed from a file; drop that advice from the rule book. |

**Result:**

---

## 6. What is the smallest squad Import Team accepts?

**Why it matters.** Two rules meet here. "A playable squad needs 15 or more" (under 15 is the health check's "too few"),
and "a squad has no gaps: places 1–18 are the matchday squad, and a gap there makes Import Team refuse the file". A squad
of 15, 16 or 17 has empty places inside 1–18. The tested files (PS5 tests 5 and 6) all had 18 or more. It is not known
whether a squad under 18 is refused, and "one goalkeeper is acceptable in the game" has no test behind it either.
*Depends on it:* rule book §4 "Squads" (the "too few" level and number in `healthIssues`), and the export, which drops
players no game file has and closes the squad around them, so a squad can fall under 18 without the user removing anyone.

**Test**
1. Pick a team you do not use (a fictional league's). Take a snapshot. Remove players so it has exactly 17, with one
   goalkeeper. Export *Changes only*, import the one file.
2. If accepted, repeat with 15, then with 11.
3. Look at: accepted or refused and the exact message; whether the team can be picked for a match.

| The game shows | What it means for the app |
|---|---|
| 17 refused | The floor is 18. "Too few" becomes under 18 and a must-fix; the export must warn when dropping players takes a squad under 18. |
| 17 and 15 accepted, 11 refused | The rule holds as written. Record it as tested. |
| All accepted, but the team cannot be picked for a match under some number | Import and playing have different floors; show both in the health check. |
| One goalkeeper accepted and playable | As the rule book says; record it as tested. |

**Result:**

---

## 7. Do the studio's "PES default image" markers work in the game, both ways?

**Why it matters.** How a team file says "use the game's own image" was measured on the option file's 679 team files,
not seen in the game: crest number 0xFFFF, stadium number 0xFFFF, an all-zero kit header. The studio writes these itself
in two directions. *Remove reference* blanks a dead image name and sets the marker "so it shows the game's image". Giving
a default slot an image sets a small crest number, or copies the kit header of a working kit of the same family.
*Depends on it:* rule book §4 "PES default images" (`TED.build` wrapper), "A dead image name can be removed from its team
file" (`msRemove`, `clearImgs`), *Fix: link it* (`orApply`), and every "PES default" tag in the app.

**Test 7a: back to the game's own image**
1. Health check → Images → *Images the team files name but the option file doesn't include*: on one team press *Remove
   reference* for a kit, and on another for a sponsor board. Export *Changes only*, import the two team files with
   *Overwrite image files of the same name* on.
2. Look at: that team's kit in the game (the game's own kit for that team, a plain white or blank kit, or the old
   image?); the sponsor board in the stadium.

**Test 7b: from the game's own image to yours**
1. Pick a team whose crest is tagged "PES default" and one with a "PES default" kit. Give each an image (check the image
   space table shows a free space of that type first). Export *Changes only*, import the two team files and their images.
2. Look at: the crest on the team select screen and in a match; the kit on the players, and its number and name colours.

| The game shows | What it means for the app |
|---|---|
| 7a: the game's own kit and board | The markers are right. Record it as tested. |
| 7a: a blank or white kit, or a broken image | The marker is not enough or not right. *Remove reference* must be withdrawn for that kind until the right bytes are found (export the team from the game and compare the files). |
| 7b: both images show correctly | Writing into a default slot works. Record it as tested. |
| 7b: the crest or kit does not show, or the kit shows with wrong collar, numbers or colours | The crest number or the borrowed kit header is wrong. *Fix: link it* and the kit slots must not treat a default slot as free until fixed. |

**Result:**

---

## 8. What does a team-info file do when *Apply player and squad data* is on?

**Why it matters.** A team with no players in the studio gets a team-info file, "imported with *Apply player and squad
data* off so the game keeps its own squad". But the game applies that setting to a whole import, and a full install
imports every team file in one go with it on. What the game then does with a file that carries no squad is not known.
*Depends on it:* rule book §4 "A team with no squad in the studio gets a team-info file", database rules §6.4, the README
("name starts with `I`"), and the import steps the export's notes should give.

**Test**
1. In the studio, pick a team that has players in the game and remove its squad in the studio (or use a team that has
   none), and change its name slightly. Export; find its team-info file.
2. In the game, note the team's players. Import the file with *Apply player and squad data* **off**. Look at the name
   and the players.
3. Import it again with the setting **on**. Look again.

| The game shows | What it means for the app |
|---|---|
| Off: name changed, players kept. On: the same | The setting does not matter for these files; they can go in the same import as everything else. |
| On: refused | Team-info files must be imported separately. The export should put them in a folder of their own and say so in its notes. |
| On: the team's players are emptied or replaced | The same, and more urgent: mark it a must-fix to import them separately. |
| Off: the name does not change either | Team-info files do nothing; give such a team the game's own squad in its file instead. |

**Result:**

---

## 9. Two images with one file name: which one does the game keep?

**Why it matters.** The game keeps imported images by name. The rule book says that when two images of the option file
share a file name the game "would take whichever it imported last", so an image put in a slot gets a new name if its own
name is shared. The order is assumed, and so is whether the two folders matter at all.
*Depends on it:* rule book §4 "An option-file image put in a slot keeps its own file name and place" (`useOwn`,
`imgBase` in `ofPlan`), and the import rule "when two files share a name, the copy nearest the team file is used".

**Test**
1. Make two different pictures of the same size with the same file name (two crests, 256 × 256), in two team folders of
   a test export, each named by its own team's file. The simplest way: export two teams, then replace one team's crest
   file with a different picture renamed to the other team's crest name, and point both team files at that name in the
   studio.
2. Import both team files and the images in one go. Look at both teams' crests.
3. Look at Import Images' free space for Team Emblems before and after: did the two files take one space or two?

| The game shows | What it means for the app |
|---|---|
| Both teams show the same picture; one space used | One image per name, whatever the folder: the rule holds. Note which of the two won (folder order, or the last listed). |
| Each team shows its own picture | The game keeps the folder with the name. Shared names are safe, the renaming in `ofPlan` is not needed, and the image space count must count paths, not names. |
| The second image is refused | Shared names block an import; the connection check should stop the export. |

**Result:**

---

## 10. A player moved from one club to another: which files must be imported, and in which order?

**Why it matters.** *Move to this team* (Health check → *Players the game has in another team's file*) takes a player
out of his old club's squad and writes him into the new club's file on his own ID. The export then has two changed
files: the old club's without him, the new club's with him. The studio assumes the game transfers him when it reads the
new club's file. The first test says otherwise.
*Depends on it:* rule book §4 "The row's commands" (*Move to this team*), `ACT.pfReplace`, the export notes.

**First result (21 November 2026, the user, export `WEPES_full_2026-11-21_1754`).** Five players moved to WEST BROMWICH
ALBION with *Move to this team* showed in the game as placeholders with no name and no data: Max O'Leary 109547 (from
BRISTOL CITY), Matt Ingram 111117 (OXFORD UNITED), Nathaniel Phillips 126078 (DERBY COUNTY), Conor Townsend 59780
(IPSWICH TOWN), Mikey Johnston 121421 (CELTIC). The files were checked afterwards and are right: West Bromwich Albion's
exported file holds all five with full records (name, age, height, position), and none of the other 677 exported team
files lists any of the five IDs. In the same file, the players on IDs West Bromwich Albion already had, and Molumby (in
IRELAND's file only), came out fine. So the five differ in one thing only: before the import the game had each of them
registered at **another club**.
The whole export was imported (the user, the same day), so the old clubs' files went in as well as West Bromwich
Albion's. That rules out "only the new club's file was imported". What it points to: at least Celtic's file is in an
earlier part (WEPES/2) than West Bromwich Albion's (WEPES/5), so where the parts were imported in order, the game read
the old club's file **without** the player first and the new club's file **with** him afterwards, and still showed a
placeholder. The likely rule is that a player dropped from his club by an import is no longer there for another club's
file to list, which fits the tested fact that the game never creates a player from a team file. If so, the new club's
file has to be read **before** the old club's. Not recorded: the order the game read the files within one part.

**Test 10a: the new club first** (the one that decides)
1. Put the game back: import the option file's own files for the six teams (West Bromwich Albion, Bristol City, Oxford
   United, Derby County, Ipswich Town, Celtic), so the five are at their old clubs again.
2. From the export, import West Bromwich Albion's file **alone**. Look at the five there, and at their old clubs.
3. Then import the five old clubs' files from the export. Look at both sides again.

**Test 10b: the old clubs first** (repeats the first result on purpose)
1. Put the game back as in 10a.
2. Import the five old clubs' files from the export first; look: are the five gone from those teams?
3. Then West Bromwich Albion's file alone. Look at the five.

**Test 10c: all together**
1. Put the game back. Tick all six files in one Import Team and import. Look at the five, and note the order the game
   lists the files in.

| The game shows | What it means for the app |
|---|---|
| 10a: the five show correctly at West Bromwich Albion, and stay correct after the old clubs' files | The new club's file must be read before the old club's. The export has to arrange that: name the files to import first in the notes and CHANGES.txt, and for a First install put a moved player's new team in an earlier part than his old one, or write the move in two steps. |
| 10a: placeholders even with the new club first | Import Team never moves a player between clubs. See the last row. |
| 10b: placeholders again | Confirms the first result: once the old club's file has dropped him, the new club's file cannot bring him back. |
| 10c: correct when all are ticked together | The game sorts it out in one run: only a partial import breaks it. Say so in the notes: "import these files together". |
| Placeholders in every order | Import Team never moves a player between clubs. *Move to this team* must not keep his ID: he needs a free ID at the new club (a copy), and his old record stays where it was. |

**Result:**

---

## 11. Why were the teams put in place of MLS teams all rejected?

**Why it matters.** Game codes lets a team take the code of any team the game has, so a league's teams can be replaced
by others. The user tried it on MLS (reported 22 November 2026): every team file was rejected. The user's guess is that
not every team can replace any team of a league, and doubts that the players' taken-over IDs are the cause.
*Depends on it:* rule book §4 "Game codes" (which codes are offered as available), `pcPlanMake` (which player IDs are
offered), and whether *Allocate free IDs* may use IDs that only a slot's second file lists.

**What is not known yet.** The exact message, which teams replaced which, and the files themselves: they are not in the
test project or in the exports on this computer. The message decides between the two known causes:

| Message | Known cause (PS5 tests, 19 November) |
|---|---|
| "…the team to import data to does not exist…" | The file's team code is one the game doesn't have. |
| "This data includes players who cannot be imported" | A gap in squad places 1 to 18, or a player ID the game doesn't have. |

Things that make MLS a special case in the 2026-27 option file, to check against the files: MLS is not in PES 2021, so
its teams sit on other teams' codes; CHARLOTTE's code 4040 has a second file for another club (Jobazavar), and
*Allocate free IDs* may hand out IDs that only such a second file lists (question 4: are those players in the game at
all?).

**Test**
1. Repeat it with **one** MLS team. Before exporting, note in the studio: the team's code, and for each player whether
   his ID is his own, taken over from the same team, or taken over from another team (Game codes → Players).
2. Export with *Save on this computer*, import the one file, and write down the exact message.
3. If it is the players message: give every player an ID taken over from the **same** team's own players only, export
   and import again.

| The game shows | What it means for the app |
|---|---|
| Team message | The code offered is not one the game has for that league: Game codes must stop offering it. |
| Players message; accepted once all IDs come from the team's own players | Some taken-over IDs are not in the game (second-file players, or players of teams no longer installed). `pcPlanMake` must not offer them. |
| Players message even then | Something else in the squad: compare the file with the option file's own file for that code. |

**Result:**

---

## 12. Team IDs: can any team file go onto any team code the game has?

**Why it matters.** Game codes lets a team of the project take the code of any team the game has, and the export then
writes that team's file with the new code. Known so far: a code the game doesn't have is refused ("…the team to import
data to does not exist…", 19 November). Not known: whether every code the game has takes any team, or whether a code is
tied to something (its league, its kind: club or national, licensed or not). The MLS report (question 11) suggests
some replacements are refused.
*Depends on it:* rule book §4 "Game codes" (which codes are offered as available, *Allocate a slot*), `codePlaced`.

**Tests** (one team file each; ask for the files to be built, as for the run of 22 November)
- **12a** A club's squad written under the code of another club **in the same league**.
- **12b** The same squad under the code of a club in **another league**.
- **12c** The same squad under the code of a team in **Other Teams**, and one under an **MLS** team's code.
- **12d** A club's squad under a **national team's** code.
For each: accepted or refused and the exact message; which name, crest and players the team at that code shows; and
whether the club still exists at its own code too (one squad in two places?).

| The game shows | What it means for the app |
|---|---|
| All accepted; the team at that code becomes the new club | Any code the game has can be taken. Game codes is right as it is. |
| 12a accepted, 12b or 12c refused | A code is tied to its league or group. Game codes must offer only codes of the team's own league, or say which are safe. |
| 12d refused | Club and national codes are separate; never offer one for the other. |
| Accepted, but the players are also still at the old code | The same player IDs in two team files: the last file read takes them (tests 1 and 6), so the old code must be given another squad in the same export. |

**Result:**

---

## 13. Competition IDs: which number does the game go by, and which competitions can a file change?

**Why it matters.** A competition file carries two numbers: a code (at byte 80) and a slot (2 bytes at 104). On 19
November a file was placed by its slot, not its code (competition 188 landed on the Premier League). On 22 November a
league's title and emblem changed without trouble. Still assumed: that the code does nothing; that a file can target
any slot, including the 22 competitions the option file has no file for; and what two files on one slot do.
*Depends on it:* rule book §4 "Game codes → Competitions" (`compSlots`, `shownNo`, *Allocate a slot*), `CED.build`
(`compId`), and "Competitions with no competition file" in the health check.

**Tests** (competition files only; ask for the files)
- **13a** One league's file written twice for the **same slot** with **two different codes** and two titles, imported
  one at a time: does the second replace the first, whatever its code?
- **13b** The same title on **two different slots** with the **same code**: do both competitions change?
- **13c** A file on the slot of one of the game's **own competitions** (one with no file in the option file), with a new
  title and emblem.
- **13d** A file on a **cup's** slot and one on a **league's**, titles swapped: does a league become "a cup" in name
  only, or does anything about its format change?
For each: accepted or refused, and the title and emblem shown in the competition list and in a match.

| The game shows | What it means for the app |
|---|---|
| 13a: the second replaces the first; 13b: both change | Only the slot counts. Show the slot everywhere and stop treating the code as an ID. |
| 13a: both titles exist somewhere | The code matters too; the pair (code, slot) must stay as the option file has it. |
| 13c accepted | Every competition of the game can be retitled; the studio can write files for the 22 it has none for. |
| 13c refused | Those competitions are fixed; say so on the competition's page. |
| 13d: only names change | A competition file is title and emblem only; format and teams come from the game. |

**Result:**

---

## 14. Teams within competitions: what decides which league or cup a team is in?

**Why it matters.** The studio shows every team in a league and lets a team be moved to another league or added to a
cup. Nothing in a team file or a competition file is known to carry that: a team file has its own code, a competition
file its title, emblem, code and slot. If the game places a team by its **code** alone, a team can only change league
by taking a code that belongs to that league (question 12), and "move to another league" in the studio changes nothing
in the game. (Fixed 2026-11-22: the three pools the studio called "Others European", "Others America" and "Other Asian
teams" now carry the game's names, Other Teams (Europe), Other Teams (Latin America) and Other Teams (Asia); a project
still on an old name is renamed when it opens.)
*Depends on it:* rule book §5 "Teams, competitions and seasons", the health check's "Teams without a league" and "Put in
league…", `slotComp`, `inGameComp`, and what the Overview shows as a team's league.

**Tests**
- **14a** No file needed: pick three teams the studio shows in a league other than the game's (for example West Bromwich
  Albion, which the project has in the Premier League while its file sits with the Championship's). Where does the game
  list each?
- **14b** A team's file from league A imported unchanged apart from its name: is it still listed under the same league
  in the game? (It should be: this is the baseline.)
- **14c** With question 12's files: after a club takes a code in another league, which league lists it, and does the
  league's table and fixture list include it?
- **14d** A cup: do its participants change with anything imported, or are they always taken from the leagues by the
  game?

| The game shows | What it means for the app |
|---|---|
| A team is always listed where its code belongs | League membership is the code. The studio must show the game's league for each code and offer "move to a league" only as "take a free code of that league". |
| Something in a file moves a team between leagues | Find the field (compare the team's file before and after an in-game move) and write it. |
| Cups always follow the leagues | A cup's team list in the studio is information only; say so and never export it. |

**Result:**

---

## 15. Can a competition take more teams than it has, and how many?

**Why it matters.** The user wants to add teams to competitions (asked 2026-11-22). Question 14 found that a league is
the set of team codes the game gives it, and no team or competition file carries a team list. So a file alone can't add
a team to a league: either the game's own Edit (Competition Structure) can, or a league's size is fixed and a new club
can only take the code of a team that leaves. The studio lets a project put any number of teams in a competition and
does not check this against the game.
*Depends on it:* rule book §5 "Teams, competitions and seasons", the Summary's "moves to make in the game's Competition
Structure" (`slotGuideHTML`), Game codes → *Allocate a slot*, and question 14d (cups).

**Test 15a: what Edit allows** (no file needed)
1. Edit → Competition Structure (or the menu where teams are moved between leagues). Pick a league with 20 clubs (Premier
   League) and one with fewer (Swiss League, 10).
2. Try to add a team from Other Teams (Europe) without taking one out. Does the game offer an empty place, or only a swap?
3. Note for each league tried: the number of places, whether it changes, and the exact message if refused.

**Test 15b: a bigger league plays**
If 15a lets a league grow: add one or two teams, then start a League mode (or Master League) with that league. Do the
fixtures include the new teams, and is the number of rounds right?

**Test 15c: cups and continental competitions**
1. In Competition Structure, open a cup or the Champions League / AFC Champions League. Can a team be added or swapped in
   (for example a club from Other Teams (Asia) into the AFC Champions League)?
2. If it can: how many places does it have, and does the draw use the new team?

**Test 15d: does the change survive a team file import**
After 15a or 15c moved or added a team, import that team's file (Changes only, unchanged otherwise). Is it still in the
competition it was moved to, or back where its code belongs?

| The game shows | What it means for the app |
|---|---|
| A league or cup has a fixed number of places; only swaps are possible | A competition can only take a new team in place of another. The studio should warn when a competition has more teams than the game's places, and offer "swap with" instead of "add". Record each league's size in the rule book. |
| Edit lets a league grow, up to some number | Record the limit per league (and the overall limit); the health check counts teams per competition against it, and the Summary lists the moves to make in Competition Structure. |
| 15d: an import puts the team back under its code's league | Moves made in Edit are undone by importing that team's file: the Summary must say to redo them after each import, or to import before moving. |
| Cups take teams in Edit, leagues don't (or the other way round) | Write the two rules separately; 14d's answer follows. |

**Result:**

---

## 16. Can the game's "unregistered players" be used as new players from a team file, and how many are there?

**Why it matters.** A team file that lists a player the game doesn't have is refused (tests 2 and 6: a made-up ID), so
the studio leaves out every new player it makes. The game has more than 150 "unregistered players": records it has but
that no team lists, made to be filled in. If a team file can write a new player's name, ratings and position over one of
them by its ID, those are the codes new players (created in the studio, signed from a Live Update, youth players) can
take. Nobody knows their IDs yet, or what the game keeps of the record (face, look, nationality) when a file writes it.
*Depends on it:* the option *Also write players no game file has* (`settings.ofNewPlayers`, `E.parts.newPlayers`), the
created-player ID range in database rules (0x40080000–0x400EFFFF, never confirmed in the game), Game codes → Players
(*Allocate free IDs*, `pcFileList`) and the health check's "Players no game file has". Question 5b asks the same for a
player made in Edit; this is the game's own pool.

**Test 16a: find their IDs and how many there are** (no file needed to start)
1. In the game, Edit → Players: count the unregistered players (or note how many pages, and how many on one).
2. Register three of them at one club with free squad places (Edit → Transfers), for example the first, the 50th and the
   last in the list. Export that team (Edit → Data Management → Export Team) to the USB.
3. In the studio, Import / Export → Import files: add the exported team file and read the three players' game IDs in
   Review. Are they in a range (consecutive, or a fixed step), so the whole pool can be worked out from three?
4. Note the three players' names and looks as the game shows them, before anything is changed.

**Test 16b: write over one from a team file**
1. In the studio, give one of the three a new name, position, ratings and nationality (make him a new player on that ID:
   Game codes → Players, or the player editor). Tick *Also write players no game file has*.
2. Export *Changes only*, import that team file with *Apply player and squad data*.
3. Look at: accepted or refused; his name, ratings, position, nationality, and his face and build (the file's or the
   unregistered player's own).

**Test 16c: one that was never registered in the game**
1. From 16a's range, take an ID of an unregistered player that is still in no team. In the studio, make a new player on
   that ID at another club (squad of 18 or more otherwise unchanged), with *Also write players no game file has* ticked.
2. Export *Changes only*, import that one team file. Accepted? Is he gone from the unregistered list afterwards?

**Test 16d: many at once**
If 16c works: put ten new players on ten unregistered IDs across two teams, export and import together. All accepted,
all shown? Does removing one from his team later (a re-import without him) send him back to the unregistered list?

| The game shows | What it means for the app |
|---|---|
| 16a: the IDs form a range | Write the range (and the count) into the rule book and database rules; the studio keeps it as a pool and gives new players free IDs from it (*Allocate free IDs*), marking each as taken. |
| 16b/16c accepted, the file's name and ratings shown | Unregistered players can be filled from a team file. New players stop being left out: they are written on a free unregistered ID, and *Also write players no game file has* can be on for those IDs. |
| Accepted, but face and build stay the unregistered player's | The look can't come from the file; the notes say to set the face in Edit after importing. |
| 16c refused, 16b accepted | Only a player first registered at a team in the game can be written; the steps for each new player are "register him in Edit, export, then write by ID" (as 5b). |
| All refused | The pool can't be used from files; new players are made in Edit only, and the option's text must say so. |
| 16d: a player dropped from a team stays filled, in no team | Freed IDs are not empty again: the pool shrinks with every use, and the studio must count what's left. |

**Result:**

---

## 17. What else of a licensed team can a file change, and are the "name may be fixed" teams fixed?

**Why it matters.** Tests 58 to 60 settled the name: a licensed team keeps the game's name whatever its file says, and
its squad still changes (tests 25 to 57). So the studio locks *Team name* for the 436 teams it marks "name fixed by the
game" (level 2) and leaves everything else editable. Nobody has looked at the rest: the short name on the scoreboard, a
crest of its own (test 59 gave Brøndby one, but only the name was noted), the kits, the stadium name and the manager.
The 23 teams marked "name may be fixed" (level 1) are not locked, and only two are known: COMO 1907 on Brescia's code
kept Brescia's name, ATLÉTICO HUILA on Cúcuta Deportivo's code took its own.
*Depends on it:* rule book "Edit only what the game lets change" and "The studio marks those codes" (`teamFixed`,
`nameFixed`, `infoTab`), the export of crests and kits for licensed teams, and the health check's "Name in the game".

**Test 17a: one licensed team, everything but the name** (AAB, 3F Superliga, code 1818, or ANGERS, Ligue 1, code 403)
1. In the studio change its short name (3 letters), give it a crest of its own and a home kit image, change the stadium
   name and the manager's name. Leave the team name and the squad as they are.
2. Export *Changes only*, import that team file and its images (*Overwrite image files of the same name* on).
3. Look at: the short name on the scoreboard in a match, the crest on the team select screen, the home kit, the stadium
   name, the manager in Edit. Note each as changed or not.

**Test 17b: the "name may be fixed" teams** (AC MILAN, Serie A, code 121; SHAKHTAR DONETSK, Other Teams (Europe), code 1232)
1. Rename each to "T17B" plus its name, nothing else. Export *Changes only*, import the two team files.
2. Look at: which name the game shows for each.

| The game shows | What it means for the app |
|---|---|
| 17a: nothing but the squad changes | A licensed team is the game's in everything but its players: lock its short name, crest, kits, stadium and manager too, and leave them out of the export. |
| 17a: some change, some don't | Lock exactly the ones that don't, each with this test as the reason; the rest stay editable. |
| 17a: all change | Only the name is locked (as now). |
| 17b: both keep the game's name | Level 1 behaves like level 2 in licensed leagues: lock it too, or raise those teams to level 2. |
| 17b: both take the new name | Level 1 is not fixed; drop "may be" for those signs, or keep it as a hint only. |
| 17b: they differ | Level 1 stays a "may"; record the two results by name. |

**Result:**

---

## 18. What does the game keep of a team the studio deletes?

**Why it matters.** The studio lets you delete any team the game doesn't fix, and *Make room* recommends deleting
teams to free their players' IDs for players without one. The tests showed that a team code always exists in the game
(a file for a code the game doesn't have is refused), a player dropped from a file stays in the game with his data
(tests 3 and 4), a team whose players are all taken is left with 11 (test 54), and a team written with no players is
accepted (test 55, but what Patriotas Boyacá showed afterwards was not noted). So a deleted team is still in the game
with the squad it last had, and *Make room*'s promise ("the game keeps those players, and your players take them over")
has not been watched in the game end to end.
*Depends on it:* `docs/DATABASE_RULES.md` §7 (deleting frees codes), *Make room* (`pcRoomData`), the code book, and
whether the export should write an empty team file for a deleted team.

**Test 18a: look at test 55's team** (no file needed): open PATRIOTAS BOYACÁ (Colombian league) in the game. How many
players does it have, and whose?

**Test 18b: delete a team and reuse its IDs** (AREMA FC, BRI SUPER LEAGUE, code 200: any team that isn't fixed)
1. Take a snapshot. In the studio delete the team, then give two players without an ID two of its freed IDs (Game
   codes → Players, *Allocate free IDs*). Export *Changes only*, import the files of the two players' teams.
2. Look at: the two players at their teams (name, ratings, and the look: question 3); and AREMA FC in the game (still
   there? how many players, and are the two still listed with it?).
3. Restore the snapshot afterwards and import AREMA FC's own file again.

| The game shows | What it means for the app |
|---|---|
| 18a: 11 players, or the game's own | An empty file doesn't empty a team: the game always keeps a squad. "Delete" can never remove a team from the game; the button's text and the confirmation should say "left out of your export" rather than "deleted". |
| 18a: no players | A team can be emptied by a file; the studio could offer "empty it in the game" for a deleted team (an empty team file). |
| 18b: the two play for their new teams and AREMA FC no longer lists them | *Make room* works as promised. Record it as tested. |
| 18b: AREMA FC still lists them, or they appear twice | Freed IDs are not free in the game while the deleted team's last squad holds them: *Make room* must also write that team's file without them, or stop offering deletes. |

**Result:**

---

## Already answered in the game

For reference, so they are not tested again. All from the user's PS5 tests with the 2026-27 option file installed,
19 November 2026; the rule book has the details.

| Fact | Test |
|---|---|
| A team file with a code the game doesn't have is refused ("…the team to import data to does not exist…"). | Test 6, team 9101; 8 teams 9101–9108 never appeared |
| A competition is found by its slot index (104), not its code (80): a file on a template's slot overwrites that competition. | Competition 188 landed on the Premier League |
| A gap in places 1–18 of the squad makes Import Team refuse the file ("This data includes players who cannot be imported"). | 3 of 8 rewritten teams failed; all imported with gaps closed (test 5) |
| A team file listing a player the game doesn't have (a made-up edit ID) is refused with the same message. | Tests 2 and 6 |
| Each image type has its own store, measured in file size; Strip (L) holds about 70; once a store is full the rest is refused. | Image counts read from Import Images |
| A competition's title and emblem can be changed by its competition file with no trouble, so any league or cup can be given another title and emblem. | The user, reported 22 November 2026 (MLS's title and emblem changed) |
| A player the game has only in a national team's file can be added to a club on the same ID: he shows in both. | Question 1, Molumby 118411, 21 November 2026 |
| Squads of 17, 15 and 11 players (one goalkeeper) are accepted by Import Team and the team can be picked for a match. | Test run of 22 November 2026, tests 7 to 9 (Figueirense) |
| The console game has no J1 League, J2 League or Other Teams (Africa): Import Team refuses a file on one of their codes. The Thai League is in the game and takes a squad, keeping the team's name. | Tests 61 to 64, 22 November 2026 |
| Team files ticked together are read in file-name order and the last one wins. | Test 6: `test06_aaa` and `test06_zzz` for one team; the team ended as ORDER ZZZ |
| A club whose file lists a player takes him from his old club: he is never in two clubs. | Tests 1, 5 and 11 |
| A player dropped from his club's file stays in the game with his data; he is in no team. | Tests 3 and 4 (A. ZELA's record could still be opened) |
| The game draws a squad place only if the team file's squad order table (40 bytes at ASSIGN+768) lists it; a place it leaves out is an empty "---" row, whoever sits there. | Test 14, 22 November 2026: the five empty places at West Bromwich Albion followed the last five places of the file, not the players; the first photo matches the table place for place |
| A player moved from one club to another shows correctly at his new club. | Tests 1 and 2, and the photo of West Bromwich Albion's squad list (22 November): the five moved players are there by name |
