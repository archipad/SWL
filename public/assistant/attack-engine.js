(function exposeAttackEngine() {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  function rangeBounds(range) {
    if (range === 'melee') return { melee: true };
    if (range === 'grenade') return { min: 1, max: 1 };
    const match = String(range || '').match(/^(\d+)?-(\d+)$/);
    if (match) return { min: Number(match[1] || 1), max: Number(match[2]) };
    const single = Number(range);
    return Number.isFinite(single) && single > 0 ? { min: single, max: single } : null;
  }

  function weaponEligible(range, selectedRange) {
    const bounds = rangeBounds(range);
    if (!bounds || selectedRange == null) return true;
    if (selectedRange === 'melee') return bounds.melee === true;
    return !bounds.melee && selectedRange >= bounds.min && selectedRange <= bounds.max;
  }

  function rangeOptions(weapons) {
    const options = new Set();
    weapons.forEach((weapon) => {
      const bounds = rangeBounds(weapon.range);
      if (bounds?.melee) options.add('melee');
      else if (bounds) for (let range = bounds.min; range <= bounds.max; range += 1) options.add(range);
    });
    return [...options].sort((a, b) => a === 'melee' ? -1 : b === 'melee' ? 1 : a - b);
  }

  function downgradeColor(color) {
    return color === 'rouge' ? 'noir' : color === 'noir' ? 'blanc' : 'blanc';
  }

  function buildPool(rows, counts, downgradedKeys = new Set()) {
    const pool = { rouge: 0, noir: 0, blanc: 0, variable: false };
    rows.forEach((row) => {
      const multiplier = Math.max(1, Number(counts[row.key]) || 1);
      if (row.weapon.dice === 'variable') pool.variable = true;
      else row.weapon.dice.forEach((die) => {
        const color = downgradedKeys.has(row.key) ? downgradeColor(die.color) : die.color;
        pool[color] += die.count * multiplier;
      });
    });
    return pool;
  }

  function effectiveCover(cover, sharpshooterX, hasBlast, immuneBlast) {
    if (hasBlast && !immuneBlast) return 'none';
    const value = cover === 'heavy' ? 2 : cover === 'light' ? 1 : 0;
    const reduced = Math.max(0, value - Math.max(0, Number(sharpshooterX) || 0));
    return reduced >= 2 ? 'heavy' : reduced === 1 ? 'light' : 'none';
  }

  function rerollCapacity(aimTokens, preciseX) {
    return Math.max(0, Number(aimTokens) || 0) * (2 + Math.max(0, Number(preciseX) || 0));
  }

  function applyLethal(basePierce, lethalX, aimTokens) {
    const lethalUsed = clamp(aimTokens, 0, Math.max(0, Number(lethalX) || 0));
    return {
      lethalUsed,
      pierce: Math.max(0, Number(basePierce) || 0) + lethalUsed,
    };
  }

  function convertAttack(roll, attackSurge, criticalX) {
    const surge = Math.max(0, Number(roll.surge) || 0);
    const critical = Math.min(surge, Math.max(0, Number(criticalX) || 0));
    const remaining = surge - critical;
    const printedToHit = attackSurge === 'hit' ? remaining : 0;
    const printedToCrit = attackSurge === 'crit' ? remaining : 0;
    return {
      hit: Math.max(0, Number(roll.hit) || 0) + printedToHit,
      crit: Math.max(0, Number(roll.crit) || 0) + critical + printedToCrit,
      unusedSurge: remaining - printedToHit - printedToCrit,
      criticalUsed: critical,
      printedToHit,
      printedToCrit,
    };
  }

  function applyImpactArmor(results, options) {
    const hasArmor = Boolean(options.hasArmor);
    const impactUsed = hasArmor ? clamp(options.impactUsed, 0, Math.min(results.hit, options.impactX || 0)) : 0;
    const hitsAfterImpact = results.hit - impactUsed;
    const armorLimit = options.armorUnlimited ? hitsAfterImpact : Math.max(0, Number(options.armorX) || 0);
    const armorCancelled = hasArmor ? clamp(options.armorCancelled, 0, Math.min(hitsAfterImpact, armorLimit)) : 0;
    return { hit: hitsAfterImpact - armorCancelled, crit: results.crit + impactUsed, impactUsed, armorCancelled };
  }

  function applyShields(results, options) {
    const active = Math.max(0, Number(options.activeShields) || 0);
    const ionFlipped = options.ionEligible
      ? clamp(options.ionX, 0, Math.min(active, results.hit + results.crit))
      : 0;
    const available = options.ranged ? Math.max(0, active - ionFlipped) : 0;
    const critCancelled = clamp(options.shieldCrit, 0, Math.min(results.crit, available));
    const hitCancelled = clamp(options.shieldHit, 0, Math.min(results.hit, available - critCancelled));
    return {
      hit: results.hit - hitCancelled,
      crit: results.crit - critCancelled,
      ionFlipped,
      hitCancelled,
      critCancelled,
      shieldsSpent: hitCancelled + critCancelled,
      shieldsRemaining: available - hitCancelled - critCancelled,
    };
  }

  function applyGuardian(results, defense, options) {
    const hitsCancelled = options.eligible
      ? clamp(options.hitsCancelled, 0, Math.min(results.hit, options.guardianX || 0))
      : 0;
    const converted = Math.max(0, Number(defense.block) || 0) +
      (options.defenseSurge === 'block' ? Math.max(0, Number(defense.surge) || 0) : 0);
    const pierceUsed = options.pierceImmune ? 0 : Math.min(converted, Math.max(0, Number(options.pierceAvailable) || 0));
    const blocks = Math.max(0, converted - pierceUsed);
    return {
      hit: results.hit - hitsCancelled,
      crit: results.crit,
      hitsCancelled,
      converted,
      pierceUsed,
      blocks,
      wounds: Math.max(0, hitsCancelled - blocks),
      pierceRemaining: Math.max(0, (Number(options.pierceAvailable) || 0) - pierceUsed),
    };
  }

  function applyCover(results, options) {
    const coverCancelled = options.melee || options.cover === 'none' ? 0 : Math.min(
      results.hit,
      Math.max(0, Number(options.coverBlock) || 0) +
        (options.cover === 'heavy' ? Math.max(0, Number(options.coverSurge) || 0) : 0),
    );
    const dodgesUsed = clamp(options.dodges, 0, Math.max(0, results.hit - coverCancelled));
    return { hit: Math.max(0, results.hit - coverCancelled - dodgesUsed), crit: results.crit, coverCancelled, dodgesUsed };
  }

  function applyDefense(results, defense, options) {
    const converted = Math.max(0, Number(defense.block) || 0) +
      (options.defenseSurge === 'block' ? Math.max(0, Number(defense.surge) || 0) : 0);
    const pierceUsed = options.pierceImmune ? 0 : Math.min(converted, Math.max(0, Number(options.pierceX) || 0));
    const blocks = Math.max(0, converted - pierceUsed);
    return { converted, pierceUsed, blocks, wounds: Math.max(0, results.hit + results.crit - blocks) };
  }

  window.SWL_ATTACK_ENGINE = {
    rangeBounds, weaponEligible, rangeOptions, downgradeColor, buildPool, effectiveCover, rerollCapacity, applyLethal,
    convertAttack, applyShields, applyGuardian, applyImpactArmor, applyCover, applyDefense,
  };
})();
