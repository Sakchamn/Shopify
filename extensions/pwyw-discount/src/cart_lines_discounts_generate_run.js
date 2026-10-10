// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @param {RunInput} input
 * @returns {import("../generated/api").CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const candidates = [];

  input.cart.lines.forEach((line) => {
    // 1. Check for custom price
    const customPriceAttribute = line.attribute?.value;
    if (!customPriceAttribute) return;

    const customPrice = parseFloat(customPriceAttribute);
    const originalPrice = parseFloat(line.cost.amountPerQuantity.amount);

    // 2. Calculate discount per item
    const discountPerItem = originalPrice - customPrice;

    // 3. Apply total discount if valid
    if (discountPerItem > 0) {
      const totalDiscountAmount = discountPerItem * line.quantity;

      candidates.push({
        targets: [
          {
            cartLine: {
              id: line.id,
            },
          },
        ],
        value: {
          fixedAmount: {
            amount: totalDiscountAmount.toFixed(2),
          },
        },
        message: "Pay What You Want",
      });
    }
  });

  if (candidates.length === 0) {
    return {
      operations: [],
    };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          selectionStrategy: "ALL",
          candidates: candidates,
        },
      },
    ],
  };
}