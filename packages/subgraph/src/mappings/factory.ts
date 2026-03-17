import { BigInt } from "@graphprotocol/graph-ts";

import { GameCreated } from "../../generated/ChallengeFactory/ChallengeFactory";
import { Challenge, ProtocolStats, User } from "../../generated/schema";

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

export function handleFactoryGameCreated(event: GameCreated): void {
  const gameId = event.params.gameId.toString();

  let challenge = Challenge.load(gameId);
  if (!challenge) {
    challenge = new Challenge(gameId);
  }

  const creator = getOrCreateUser(event.params.creator.toHexString());
  creator.createdChallenges = creator.createdChallenges.plus(BigInt.fromI32(1));
  creator.save();

  challenge.creator = creator.id;
  challenge.creatorStake = event.params.creatorStake;
  challenge.creatorStakeEscrowed = event.params.creatorStake;
  challenge.playerStakeFixed = event.params.playerStakeFixed;
  challenge.slashBps = event.params.slashBps;
  challenge.payoutBps = 0;
  challenge.deadline = event.params.deadline;
  challenge.active = true;
  challenge.solved = false;
  challenge.cancelled = false;
  challenge.expired = false;
  challenge.createdAt = event.block.timestamp;
  challenge.totalPlayerStaked = BigInt.zero();
  challenge.protocolFeesAccrued = BigInt.zero();
  challenge.attemptCount = BigInt.zero();
  challenge.unresolvedGuesses = BigInt.zero();
  challenge.save();

  const stats = getOrCreateStats();
  stats.totalChallenges = stats.totalChallenges.plus(BigInt.fromI32(1));
  stats.activeChallenges = stats.activeChallenges.plus(BigInt.fromI32(1));
  stats.save();
}
