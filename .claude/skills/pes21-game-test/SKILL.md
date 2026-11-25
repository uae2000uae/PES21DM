---
name: pes21-game-test
description: Turns a question about how PES 2021 itself behaves into a game test and its answer into a rule - writing the question in docs/GAME_TESTS.md (why it matters, steps, a "what it means for the app" table, a Result line), building the test files from the local studio, writing the run sheet or results page, recording what the user saw on the console, and moving the answer into the rule book and the code. Use it whenever a rule or a feature rests on an assumption about the game ("does the game accept…", "what happens in PES if…"), when the user reports what they saw in the game after an import, when the user asks for a test run or test files, and before offering any new kind of change in the studio that hasn't been seen working in the game.
---

# Game tests: let the game decide

The studio's top rule is that nothing is offered that doesn't work in PES 2021. Many of those facts can only be learnt
by importing files on the console and looking. Guessing has cost real time here (a competition file that landed on the
Premier League, teams on codes the game refused, squads showing "---"), so an assumption about the game is written down
as a question and tested, and the app follows the answer.

`docs/GAME_TESTS.md` holds the questions and its own instructions at the top: read them first. This skill is the working
loop around that file.

## 1. Notice the assumption

You are about to rely on the game behaving some way, and nothing in the rule book says it was tested (look for a test
number or "tested" in the rule's **Why**). Typical signs: "the game probably…", a limit nobody measured, a file field whose
meaning was inferred from the option file, a result that differs between licensed and unlicensed teams.

Then: don't build the feature on the guess. Either keep the current behaviour, or build it so it's off until the answer
is in, and add the question.

## 2. Write the question

Add it to `docs/GAME_TESTS.md`: a row in the table at the top (number, question, *Open*), and a section in the same shape
as the others:

```markdown
## <n>. <The question, as the user would ask it>

**Why it matters.** The rule or feature that depends on it, what we believe now and why it's only a belief.
*Depends on it:* the rule book section and the functions.

**Test**
1. The set-up in the studio (snapshot first), the export (*Changes only*, *Save on this computer*), the exact files to tick.
2. What to look at in the game, and what to write down (accepted or refused, the exact message, what shows where).

| The game shows | What it means for the app |
|---|---|
| <outcome A> | <what changes in the app> |
| <outcome B> | <...> |

**Result:**
```

Every outcome row says what the app will do, so the answer leads straight to a change. Use teams nothing else touches (a
fictional league's), so a test can't spoil the user's installed game.

## 3. Build the test files

- From the local studio (`studio-test`, port 8090, or `studio-final`, 8093), export with *Save on this computer*. Test
  packages so far live in `D:\PES21-local-test\final-exports\` (`game-tests`, `game-test-24`, `game-tests-31-teams`…).
- Name files so the import screen lists them in test order (`test01_…`, or the test number first), and add restore files
  (`zz_restore_…`) that put touched teams back.
- Run the pes21-export-check script on the package (with `--baseline`): a test file that is broken for a reason the test
  isn't about tells us nothing.
- Never press *PES imported it: make it the baseline* for a test export.

## 4. Give the user a run sheet

One page they can follow at the console: which folder to copy to the USB, the import settings (*Apply player and squad
data* on or off), and per test a row of **Import · Look at · I expect · If not**, in order, with tests that depend on
earlier ones said so. Earlier runs are `docs/GAME_TEST_RUN_2026-11-22.md` (markdown) and the HTML results pages in `docs/`
(`game-test-run-31-teams.html`, `game-test-run-what-can-change.html`) where the user fills in results per test; reuse that
format.

## 5. Record the answer

When the user reports what the game showed:
1. Fill the **Result** line: date, console, what the game showed, the exact message if it refused. Quote the user.
2. Mark the question *Answered* (or *Partly answered*, saying what's left) in the table.
3. Move the fact into the rule book (`pes21-rules`) under the right heading, with **Why** = the test number and date.
4. Change the code where it was built on the wrong assumption, everywhere the assumption was used (search the field and
   the functions named under *Depends on it*), and the export check script if it judged that case.
5. If the user withdraws a result, mark it withdrawn with the date and their words; don't delete it.

Only the user's report from the game counts as an answer. A result read off the option file's files, or inferred from
another test, is written as such and the question stays open.
