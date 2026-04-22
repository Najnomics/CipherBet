import { BigInt } from "@graphprotocol/graph-ts";

import {
  CreatorRemainderWithdrawn,
  GameCancelled,
  GameExpired,
  GameSolved,
  GuessResolved,
  GuessSubmitted,
} from "../../generated/ChallengeGame/ChallengeGame";
import { Challenge, Guess, ProtocolStats, User } from "../../generated/schema";

const STATS_ID = "global";

function getOrCreateUser(id: string): User {
  let user = User.load(id);
  if (!user) {
    user = new User(id);
    user.createdChallenges = BigInt.zero();
    user.guessesSubmitted = BigInt.zero();
    user.guessesWon = BigInt.zero();
    user.totalPayoutWon = BigInt.zero();
    user.totalSlashed = BigInt.zero();
  }
  return user as User;
}

function getOrCreateStats(): ProtocolStats {
  let stats = ProtocolStats.load(STATS_ID);
  if (!stats) {
    stats = new ProtocolStats(STATS_ID);
    stats.totalChallenges = BigInt.zero();
    stats.activeChallenges = BigInt.zero();
    stats.solvedChallenges = BigInt.zero();
    stats.expiredChallenges = BigInt.zero();
    stats.cancelledChallenges = BigInt.zero();
    stats.totalGuesses = BigInt.zero();
    stats.totalProtocolFees = BigInt.zero();
  }
  return stats as ProtocolStats;
}

export function handleGuessSubmitted(event: GuessSubmitted): void {
  const guessId = event.params.guessId.toString();
  const challengeId = event.params.gameId.toString();

  let challenge = Challenge.load(challengeId);
  if (!challenge) {
    return;
  }

  const player = getOrCreateUser(event.params.player.toHexString());
  player.guessesSubmitted = player.guessesSubmitted.plus(BigInt.fromI32(1));
  player.save();

  const guess = new Guess(guessId);
  guess.challenge = challengeId;
  guess.player = player.id;
  guess.stake = event.params.stake;
  guess.exactMatchesDecryptId = event.params.exactMatchesDecryptId;
  guess.partialMatchesDecryptId = event.params.partialMatchesDecryptId;
  guess.timestamp = event.block.timestamp;
  guess.state = "EVALUATING";
  guess.submittedAtBlock = event.block.number;
  guess.save();

  challenge.totalPlayerStaked = challenge.totalPlayerStaked.plus(event.params.stake);
  challenge.attemptCount = challenge.attemptCount.plus(BigInt.fromI32(1));
  challenge.unresolvedGuesses = challenge.unresolvedGuesses.plus(BigInt.fromI32(1));
  challenge.save();

  const stats = getOrCreateStats();
  stats.totalGuesses = stats.totalGuesses.plus(BigInt.fromI32(1));
  stats.save();
}

export function handleGuessResolved(event: GuessResolved): void {
  const guessId = event.params.guessId.toString();
  const challengeId = event.params.gameId.toString();

  const guess = Guess.load(guessId);
  const challenge = Challenge.load(challengeId);
  if (!guess || !challenge) {
    return;
  }

  guess.state = "FINALIZED";
  guess.won = event.params.won;
  guess.exactMatches = event.params.exactMatches;
  guess.partialMatches = event.params.partialMatches;
  guess.payout = event.params.payout;
  guess.slash = event.params.slash;
  guess.protocolFee = event.params.protocolFee;
  guess.playerRefund = event.params.playerRefund;
  guess.resolvedAfterGameSolved = event.params.resolvedAfterGameSolved;
  guess.resolvedAtBlock = event.block.number;
  guess.save();

  if (challenge.unresolvedGuesses.gt(BigInt.zero())) {
    challenge.unresolvedGuesses = challenge.unresolvedGuesses.minus(BigInt.fromI32(1));
  }
  challenge.protocolFeesAccrued = challenge.protocolFeesAccrued.plus(event.params.protocolFee);
  challenge.save();

  const stats = getOrCreateStats();
  stats.totalProtocolFees = stats.totalProtocolFees.plus(event.params.protocolFee);
  stats.save();

  const player = getOrCreateUser(event.params.player.toHexString());
  if (event.params.won) {
    player.guessesWon = player.guessesWon.plus(BigInt.fromI32(1));
    player.totalPayoutWon = player.totalPayoutWon.plus(event.params.payout);
  } else {
    player.totalSlashed = player.totalSlashed.plus(event.params.slash);
  }
  player.save();
}

export function handleGameSolved(event: GameSolved): void {
  const challenge = Challenge.load(event.params.gameId.toString());
  if (!challenge) {
    return;
  }

  challenge.active = false;
  challenge.solved = true;
  challenge.winner = event.params.winner.toHexString();
  challenge.winningGuess = event.params.guessId.toString();
  challenge.creatorStakeEscrowed = challenge.creatorStakeEscrowed.minus(event.params.payout);
  challenge.save();

  const stats = getOrCreateStats();
  if (stats.activeChallenges.gt(BigInt.zero())) {
    stats.activeChallenges = stats.activeChallenges.minus(BigInt.fromI32(1));
  }
  stats.solvedChallenges = stats.solvedChallenges.plus(BigInt.fromI32(1));
  stats.save();
}

export function handleGameExpired(event: GameExpired): void {
  const challenge = Challenge.load(event.params.gameId.toString());
  if (!challenge) {
    return;
  }

  challenge.active = false;
  challenge.expired = true;
  challenge.creatorStakeEscrowed = BigInt.zero();
  challenge.save();

  const stats = getOrCreateStats();
  if (stats.activeChallenges.gt(BigInt.zero())) {
    stats.activeChallenges = stats.activeChallenges.minus(BigInt.fromI32(1));
  }
  stats.expiredChallenges = stats.expiredChallenges.plus(BigInt.fromI32(1));
  stats.save();
}

export function handleGameCancelled(event: GameCancelled): void {
  const challenge = Challenge.load(event.params.gameId.toString());
  if (!challenge) {
    return;
  }

  challenge.active = false;
  challenge.cancelled = true;
  challenge.creatorStakeEscrowed = BigInt.zero();
  challenge.save();

  const stats = getOrCreateStats();
  if (stats.activeChallenges.gt(BigInt.zero())) {
    stats.activeChallenges = stats.activeChallenges.minus(BigInt.fromI32(1));
  }
  stats.cancelledChallenges = stats.cancelledChallenges.plus(BigInt.fromI32(1));
  stats.save();
}

export function handleCreatorRemainderWithdrawn(event: CreatorRemainderWithdrawn): void {
  const challenge = Challenge.load(event.params.gameId.toString());
  if (!challenge) {
    return;
  }

  challenge.creatorStakeEscrowed = BigInt.zero();
  challenge.save();
}
