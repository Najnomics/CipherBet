import type { InEuint32Input } from "./types";

const DIGIT_COUNT_V1 = 4;
const EUINT32_UTYPE = 4;

export function encodeDigitsToPackedUint32(digits: readonly number[]): number {
  if (digits.length !== DIGIT_COUNT_V1) {
    throw new Error(`CipherBet requires exactly ${DIGIT_COUNT_V1} digits in v1`);
  }

  let packed = 0;
  for (let i = 0; i < digits.length; i += 1) {
    const d = digits[i];
    if (!Number.isInteger(d) || d < 0 || d > 9) {
      throw new Error(`Invalid digit at index ${i}: ${d}. Expected integer between 0 and 9.`);
    }
    packed += d * 10 ** i;
  }

  return packed;
}

export function decodePackedUint32ToDigits(packed: number): [number, number, number, number] {
  if (!Number.isInteger(packed) || packed < 0 || packed > 9999) {
    throw new Error("Packed value must be an integer in [0, 9999] for v1");
  }

  const d0 = packed % 10;
  const d1 = Math.floor(packed / 10) % 10;
  const d2 = Math.floor(packed / 100) % 10;
  const d3 = Math.floor(packed / 1000) % 10;

  return [d0, d1, d2, d3];
}

export function encodePackedUint32ForContract(
  packed: number | bigint,
  securityZone = 0,
): InEuint32Input {
  return {
    ctHash: BigInt(packed),
    securityZone,
    utype: EUINT32_UTYPE,
    signature: "0x",
  };
}

export function decodePackedUint32FromContractInput(input: InEuint32Input): bigint {
  return input.ctHash;
}
