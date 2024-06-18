function getMean(numberList: number[]) {
  return numberList.reduce((a, b) => Number(a) + Number(b), 0) / numberList.length;
}

/**
 * Get standard deviation and mean from a list of numbers
 * @param data
 * @returns
 */
function getStandardDevitationAndMean(data: number[]) {
  if (data.length === 0) {
    return { std: 0, mean: 0 };
  }
  const m = getMean(data);
  const std = Math.sqrt(
    data.reduce((sq, n) => {
      return sq + Math.pow(n - m, 2);
    }, 0) /
      (data.length - 1)
  );
  return {
    std: Number(std.toFixed(3)),
    mean: m,
  };
}

export { getStandardDevitationAndMean, getMean };
