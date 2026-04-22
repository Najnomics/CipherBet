# CipherBet Mastermind Guide

## What You Are Trying To Do

Each CipherBet challenge hides a secret `4-digit` code.

Your goal is to break that code before the room closes by submitting guesses and reading the feedback after each one.

You win when your guess scores:

- `4 exact`
- `0 partial`

That means every digit is correct and every digit is in the correct position.

## What The Feedback Means

After each guess, the game returns two values:

- `exact`: how many digits are correct and in the correct position
- `partial`: how many digits are in the secret but currently placed in the wrong position

This is the same logic used in classic Mastermind and Bulls-and-Cows style games.

## Examples

Secret code:

```text
3715
```

Guess:

```text
3017
```

Result:

- `1 exact`
- `2 partial`

Why:

- `3` is correct and already in the correct place
- `1` exists in the secret but is in the wrong place in your guess
- `7` exists in the secret but is in the wrong place in your guess
- `0` does not exist in the secret

Another example:

Secret:

```text
5173
```

Guess:

```text
4321
```

Result:

- `0 exact`
- `2 partial`

That tells you two digits from your guess are somewhere in the code, but both are misplaced.

## How To Approach A Challenge

### 1. Start With Information, Not Hope

Your first guess should help you learn as much as possible.

Good first-guess habits:

- use four different digits
- avoid repeating digits too early
- spread across the number range

Example openers:

```text
1234
5678
9081
```

These guesses help you test presence before you start optimizing positions.

### 2. Separate Two Questions

Every guess should help answer one of these:

- Which digits are in the code?
- Where do those digits belong?

If a guess gives:

- high `partial`, you found useful digits but placed them poorly
- high `exact`, your placement is improving
- `0 exact / 0 partial`, eliminate all four digits immediately

### 3. Use Elimination Aggressively

If a guess returns:

```text
0 exact / 0 partial
```

none of those digits belong in the code.

That is one of the strongest clues in the game. Remove them from future guesses.

### 4. Reposition Known Digits Carefully

Once you know some digits are present, rotate them through new positions instead of swapping everything at once.

That way you can isolate which position changes improved the score.

### 5. Change Fewer Variables Per Guess

If you already know two digits are likely correct, keep them stable and test the unknowns.

Good deduction comes from controlled experiments, not random reshuffles.

## Practical Solving Strategy

A simple strong approach:

1. First guess: use four unique digits.
2. Second guess: test four mostly new digits.
3. From the first two results, list:
   - digits definitely absent
   - digits likely present
   - positions that may already be correct
4. Use later guesses to:
   - confirm which digits are truly in the code
   - rotate only the promising digits
   - lock positions one by one

## Reading Common Patterns

### `0 exact / 0 partial`

All guessed digits are wrong. Eliminate them completely.

### `0 exact / 4 partial`

You found all four digits, but every one is misplaced. Focus only on reordering.

### `2 exact / 0 partial`

Two digits are correct and fixed. The other two guessed digits are not contributing at all.

### `1 exact / 2 partial`

Three digits are valuable. One is already placed correctly, and two need repositioning.

## Economic Side Of The Game

Each challenge is also a live onchain market.

Before you play, check:

- entry fee
- slash rate
- payout rate
- deadline
- max attempts

That tells you whether the room is worth attacking and how much room you have for exploration.

## Creator Tips

If you are creating a room:

- avoid trivially obvious codes like `1234` or `0000`
- set entry fee and slash so brute force is expensive
- keep attempts limited enough that deduction matters

## Player Tips

- prefer deduction over random guessing
- track eliminated digits outside the app if needed
- do not waste guesses changing every slot at once
- use the exact/partial split as your main source of truth

## Win Condition Summary

You solve the challenge when your feedback is:

```text
4 exact / 0 partial
```

Until then, every resolved guess is a clue.

The game is no longer about getting lucky. It is about extracting information faster than everyone else.
