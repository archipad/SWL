(function exposeAttackEngine() {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  function rangeBounds(range) {
    if (range === 'melee') return { melee: true };
    if (range === 'melee-1') return { melee: true, min: 1, max: 1 };
    if (range === 'grenade') return { min: 1, max: 1 };
    const match = String(range || '').match(/^(\d+)-(\d+|#)$/);
    if (match) return { min: Number(match[1]), max: match[2] === '#' ? Infinity : Number(match[2]) };
    const single = Number(range);
    return Number.isFinite(single) && single > 0 ? { min: single, max: single } : null;
  }

  function weaponEligible(range, selectedRange, maximumRangeBonus = 0) {
    const bounds = rangeBounds(range);
    if (!bounds || selectedRange == null) return true;
    if (selectedRange === 'melee') return bounds.melee === true;
    return Number.isFinite(bounds.min) && selectedRange >= bounds.min && selectedRange <= bounds.max + Math.max(0, Number(maximumRangeBonus) || 0);
  }

  function weaponBlockedByImmunity(weapon, options = {}, selectedRange = null) {
    if (!weapon) return false;
    const bounds = rangeBounds(weapon.range);
    if (options.immuneMelee && bounds?.melee && (selectedRange === null || selectedRange === 'melee')) return true;
    return Boolean(options.immuneRange1 && bounds && bounds.max === 1 && (selectedRange === null || selectedRange === 1));
  }

  function rangeOptions(weapons) {
    const options = new Set();
    weapons.forEach((weapon) => {
      const bounds = rangeBounds(weapon.range);
      if (bounds?.melee) options.add('melee');
      if (Number.isFinite(bounds?.min)) {
        const maximum = bounds.max === Infinity ? 4 : bounds.max + Math.max(0, Number(weapon.rangeBonus) || 0);
        for (let range = bounds.min; range <= maximum; range += 1) options.add(range);
      }
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

  function defenseRerollCapacity(luckyX) {
    return Math.max(0, Number(luckyX) || 0);
  }

  function suppressionTokens(options = {}) {
    if (options.vehicle || !options.ranged || !options.hadAttackResult) return 0;
    return 1 + (options.suppressive ? 1 : 0) + (options.overwhelm && options.aimSpent ? 1 : 0);
  }

  function moraleState(options = {}) {
    const current = Math.max(0, Number(options.currentSuppression) || 0);
    const gained = Math.max(0, Number(options.gainedSuppression) || 0);
    if (options.nullCourage || options.vehicle) return { current: 0, gained: 0, total: 0, courage: null, suppressed: false, panicThreshold: null, panicRisk: false };
    const own = Math.max(1, Number(options.courage) || 1);
    const commander = Math.max(0, Number(options.commanderCourage) || 0);
    const courage = Math.max(own, commander);
    const total = current + gained;
    return { current, gained, total, courage, suppressed: total >= own, panicThreshold: courage * 2, panicRisk: total >= courage * 2 };
  }

  function allocateWounds(models = [], wounds = 0) {
    let remaining = Math.max(0, Number(wounds) || 0);
    const resolved = models.map((model) => {
      const maximum = Math.max(1, Number(model.maxWounds) || 1);
      const existing = clamp(model.wounds, 0, maximum);
      const applied = Math.min(remaining, maximum - existing);
      remaining -= applied;
      return { ...model, maxWounds: maximum, wounds: existing + applied, defeated: existing + applied >= maximum };
    });
    return { models: resolved, applied: Math.max(0, Number(wounds) || 0) - remaining, overflow: remaining, defeated: resolved.filter(model => model.defeated).length, remaining: resolved.filter(model => !model.defeated).length };
  }

  function rallyState(options = {}) {
    const before = Math.max(0, Number(options.suppression) || 0);
    if (options.nullCourage || options.vehicle) return { before: 0, dice: 0, removed: 0, remaining: 0, courage: null, suppressed: false, panicked: false };
    const successes = Math.max(0, Number(options.block) || 0) + Math.max(0, Number(options.surge) || 0);
    const removed = Math.min(before, successes);
    const remaining = before - removed;
    const courage = Math.max(1, Number(options.commanderCourage) || 0, Number(options.courage) || 1);
    return { before, dice: before, removed, remaining, courage, suppressed: remaining >= courage, panicked: remaining >= courage * 2 };
  }

  function applyLethal(basePierce, lethalX, aimTokens) {
    const lethalUsed = clamp(aimTokens, 0, Math.max(0, Number(lethalX) || 0));
    return {
      lethalUsed,
      pierce: Math.max(0, Number(basePierce) || 0) + lethalUsed,
    };
  }

  function effectivePierce(pierceX, impervious) {
    return Math.max(0, (Number(pierceX) || 0) - (impervious ? 1 : 0));
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
    const primitiveConverted = hasArmor && options.primitive ? results.crit + impactUsed : 0;
    const hitsAfterImpact = results.hit - impactUsed + primitiveConverted;
    const critAfterPrimitive = results.crit + impactUsed - primitiveConverted;
    const armorLimit = options.armorUnlimited ? hitsAfterImpact : Math.max(0, Number(options.armorX) || 0);
    const armorCancelled = hasArmor ? clamp(options.armorCancelled, 0, Math.min(hitsAfterImpact, armorLimit)) : 0;
    return { hit: hitsAfterImpact - armorCancelled, crit: critAfterPrimitive, impactUsed, ...(primitiveConverted ? { primitiveConverted } : {}), armorCancelled };
  }

  function applyRam(results, ramX, eligible) {
    const availableSurges = Math.max(0, Number(results.unusedSurge) || 0);
    const availableHits = Math.max(0, Number(results.hit) || 0);
    const converted = eligible ? clamp(ramX, 0, availableSurges + availableHits) : 0;
    const surgeConverted = Math.min(converted, availableSurges);
    const hitConverted = converted - surgeConverted;
    return { ...results, hit: availableHits - hitConverted, crit: Math.max(0, Number(results.crit) || 0) + converted, unusedSurge: availableSurges - surgeConverted, ramUsed: converted };
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
        Math.max(0, Number(options.automaticBlock) || 0) +
        (options.cover === 'heavy' ? Math.max(0, Number(options.coverSurge) || 0) : 0),
    );
    const critDodgesUsed = options.dodgeCritsAllowed ? clamp(options.dodgeCrits, 0, results.crit) : 0;
    const hitDodgesUsed = clamp(options.dodges, 0, Math.max(0, results.hit - coverCancelled));
    const resolved = { hit: Math.max(0, results.hit - coverCancelled - hitDodgesUsed), crit: results.crit - critDodgesUsed, coverCancelled, dodgesUsed: hitDodgesUsed + critDodgesUsed };
    return options.dodgeCritsAllowed ? { ...resolved, hitDodgesUsed, critDodgesUsed } : resolved;
  }

  function resolveStatusEffects(options = {}) {
    const wounded = Math.max(0, Number(options.wounds) || 0) > 0;
    return {
      immobilize: wounded ? Math.max(0, Number(options.immobilizeX) || 0) + (options.towCable && options.targetVehicle ? 1 : 0) : 0,
      poison: wounded && options.targetNonDroidTrooper ? Math.max(0, Number(options.poisonX) || 0) : 0,
      towCablePivot: Boolean(wounded && options.towCable && options.targetVehicle),
      scatter: Boolean(options.scatter && options.targetSmallTrooper),
    };
  }

  function applyDefense(results, defense, options) {
    const converted = Math.max(0, Number(defense.block) || 0) +
      (options.defenseSurge === 'block' ? Math.max(0, Number(defense.surge) || 0) : 0);
    const pierceUsed = options.pierceImmune ? 0 : Math.min(converted, Math.max(0, Number(options.pierceX) || 0));
    const blocks = Math.max(0, converted - pierceUsed);
    return { converted, pierceUsed, blocks, wounds: Math.max(0, results.hit + results.crit - blocks) };
  }

  function effectiveDefenseSurge(printedSurge, hasBlockKeyword, dodgesUsed) {
    return hasBlockKeyword && Math.max(0, Number(dodgesUsed) || 0) > 0 ? 'block' : printedSurge;
  }

  function weaponKeywordActive(profile, weapon, cardKeywordIds, keywordId) {
    if (Array.isArray(weapon?.keywordIds)) return weapon.keywordIds.includes(keywordId);
    return (profile?.weapons?.length || 0) === 1 && (cardKeywordIds || []).includes(keywordId);
  }

  window.SWL_ATTACK_ENGINE = {
    rangeBounds, weaponEligible, weaponBlockedByImmunity, rangeOptions, downgradeColor, buildPool, effectiveCover, rerollCapacity, defenseRerollCapacity, suppressionTokens, moraleState, allocateWounds, rallyState, applyLethal, effectivePierce,
    convertAttack, applyRam, applyShields, applyGuardian, applyImpactArmor, applyCover, resolveStatusEffects, applyDefense, effectiveDefenseSurge, weaponKeywordActive,
  };
})();
