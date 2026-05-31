/** Annual pricing card display — monthly hero, strikethrough list price, yearly subline. */
export type AnnualPriceDisplay = {
  monthlyDisplay: number;
  monthlyStrikethrough: number | null;
  annualTotal: number | null;
  suffix: "/mo" | "/yr";
};

export function resolveAnnualPriceDisplay(
  monthlyListUsd: number,
  annualTotalUsd: number | null | undefined,
  annual: boolean,
): AnnualPriceDisplay {
  if (!annual || annualTotalUsd == null || monthlyListUsd <= 0) {
    return {
      monthlyDisplay: monthlyListUsd,
      monthlyStrikethrough: null,
      annualTotal: null,
      suffix: "/mo",
    };
  }

  const monthlyDisplay = Math.round(annualTotalUsd / 12);
  const monthlyStrikethrough = monthlyListUsd !== monthlyDisplay ? monthlyListUsd : null;

  return {
    monthlyDisplay,
    monthlyStrikethrough,
    annualTotal: annualTotalUsd,
    suffix: "/mo",
  };
}
