export function isFulfilled<T>(
  result: PromiseSettledResult<T>,
): result is PromiseFulfilledResult<T> {
  return result.status === "fulfilled";
}

export function isRejected<T>(
  result: PromiseSettledResult<T>,
): result is PromiseRejectedResult {
  return result.status === "rejected";
}
