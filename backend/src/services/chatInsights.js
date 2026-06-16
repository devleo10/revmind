function formatUsd(value) {
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPeriod(analysis) {
  if (analysis.quarter) {
    return ` in ${analysis.quarter.replace('-', ' ')}`;
  }

  if (analysis.year) {
    return ` in ${analysis.year}`;
  }

  return '';
}

function tryDirectAnswer(analysis, hints) {
  if (!hints.length) {
    return null;
  }

  const productHint = hints.find((hint) => hint.type === 'top_product_in_region');
  if (
    productHint &&
    analysis.asksAboutProducts &&
    analysis.regions.length === 1
  ) {
    const { product_name, sku, net_revenue } = productHint.result;
    return `The best performing product in ${productHint.region} is ${product_name} (${sku}), with $${formatUsd(net_revenue)} net revenue.`;
  }

  const topRegionHint = hints.find((hint) => hint.type === 'top_region_by_net_revenue');
  if (
    topRegionHint &&
    (analysis.asksAboutRegions || analysis.quarter || analysis.regions.length > 0)
  ) {
    const { region, net_revenue } = topRegionHint.result;
    return `${region} had the highest net revenue${formatPeriod(analysis)}, with $${formatUsd(net_revenue)}.`;
  }

  const marginHint = hints.find(
    (hint) => hint.type === 'category_gross_profit_margin_pct',
  );
  if (marginHint && analysis.asksAboutMargin) {
    return `The gross profit margin for ${marginHint.category} is ${marginHint.result.toFixed(2)}%.`;
  }

  const repHint = hints.find((hint) => hint.type === 'top_sales_rep_by_units');
  if (repHint && analysis.asksAboutReps) {
    const { sales_rep, units } = repHint.result;
    return `${sales_rep} closed the most units${formatPeriod(analysis)}, with ${units.toLocaleString('en-US')} units.`;
  }

  const channelHint = hints.find(
    (hint) => hint.type === 'channel_net_revenue_comparison',
  );
  if (channelHint && analysis.asksChannelComparison && channelHint.channels.length >= 2) {
    const sorted = [...channelHint.channels].sort(
      (a, b) => b.net_revenue - a.net_revenue,
    );
    const [leader, runnerUp] = sorted;
    return `${leader.channel} leads with $${formatUsd(leader.net_revenue)} net revenue, compared with $${formatUsd(runnerUp.net_revenue)} for ${runnerUp.channel}.`;
  }

  return null;
}

module.exports = {
  tryDirectAnswer,
};
