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

Last brought up to date on 21 November 2026. Examples are from the 2026-27 option file.

| # | Question | Status |
|---|---|---|
| 1 | Can a player who is only in a national team's file be added to a club on the same ID? | Open |
| 2 | One player ID in two club files: what does the game end with? | Open |
| 3 | Does a player who takes over another player's ID keep that player's face and look? | Open |
| 4 | Is a team slot's second file really imported, and in which order? | Open |
| 5 | Does Import Team accept a player ID the game has but no team file lists? | Open |
| 6 | What is the smallest squad Import Team accepts? | Open |
| 7 | Do the studio's "PES default image" markers work in the game, both ways? | Open |
| 8 | What does a team-info file do when *Apply player and squad data* is on? | Open |
| 9 | Two images with one file name: which one does the game keep? | Open |

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

**Result:**

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
