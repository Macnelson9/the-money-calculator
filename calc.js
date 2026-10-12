// The Money Calculator: the math behind every calculator on the site.
// Pure functions, no DOM, so `node test.js` can check them against the scripts.
// All rates are annual decimals (0.07 = 7%), compounded monthly.
(function (root) {
  "use strict";

  function fv(monthly, rate, years) {
    const i = rate / 12, n = years * 12;
    return i === 0 ? monthly * n : monthly * ((1 + i) ** n - 1) / i;
  }

  function pmt(principal, rate, months) {
    const i = rate / 12;
    return i === 0 ? principal / months : principal * i / (1 - (1 + i) ** -months);
  }

  function pv(payment, rate, months) {
    const i = rate / 12;
    return i === 0 ? payment * months : payment * (1 - (1 + i) ** -months) / i;
  }

  // Monthly investing from startAge to endAge; yearly balances for charting.
  function growth(monthly, rate, startAge, endAge) {
    const points = [];
    let bal = 0;
    for (let age = startAge; age < endAge; age++) {
      for (let m = 0; m < 12; m++) bal = bal * (1 + rate / 12) + monthly;
      points.push({ age: age + 1, balance: bal });
    }
    return { final: bal, contributed: monthly * 12 * (endAge - startAge), points };
  }

  // Monthly amount someone starting later needs to match an earlier starter.
  function catchUp(monthly, rate, earlyStart, lateStart, endAge) {
    return fv(monthly, rate, endAge - earlyStart) / fv(1, rate, endAge - lateStart);
  }

  // Credit card payoff. mode "min" = interest + 1% of balance (floor $25),
  // a common minimum formula; otherwise a fixed monthly payment.
  function cardPayoff(balance, apr, mode, fixed) {
    let b = balance, months = 0, paid = 0;
    const balances = [b];
    while (b > 0.005 && months < 1200) {
      const interest = b * apr / 12;
      let p = mode === "min" ? Math.max(25, interest + b * 0.01) : fixed;
      if (p <= interest) return { months: Infinity, interest: Infinity, balances };
      b += interest;
      p = Math.min(p, b);
      b -= p; paid += p; months++;
      balances.push(b);
    }
    return { months, interest: paid - balance, balances };
  }

  // Rent vs buy. Buyer: equity after selling costs. Renter: invests the
  // upfront cash (down payment + buying costs) and each month's difference.
  function rentVsBuy(o) {
    const loan = o.price * (1 - o.downPct);
    const mortgage = pmt(loan, o.mortgageRate, o.years * 12);
    let bal = loan, home = o.price, rent = o.rent;
    let renter = o.price * o.downPct + o.price * o.buyCostPct;
    let breakeven = null;
    const points = [];
    for (let m = 1; m <= o.years * 12; m++) {
      bal -= mortgage - bal * o.mortgageRate / 12;
      if (m % 12 === 1 && m > 1) rent *= 1 + o.rentGrowth;
      home *= (1 + o.homeGrowth) ** (1 / 12);
      const yearIdx = Math.floor((m - 1) / 12);
      const ownCost = mortgage +
        (o.taxPct * home + o.maintPct * home + o.insurance * (1 + o.insuranceGrowth) ** yearIdx) / 12;
      renter = renter * (1 + o.investReturn / 12) + ownCost - rent;
      if (m % 12 === 0) {
        const year = m / 12;
        const buyer = home * (1 - o.sellCostPct) - bal;
        points.push({ year, buyer, renter });
        if (breakeven === null && buyer > renter) breakeven = year;
      }
    }
    const firstInterest = loan * o.mortgageRate / 12;
    return {
      mortgage, breakeven, points,
      firstInterest, firstPrincipal: mortgage - firstInterest,
      monthlyOwnYear1: mortgage + (o.taxPct * o.price + o.maintPct * o.price + o.insurance) / 12,
    };
  }

  // Value of putting `monthly` toward a debt at each APR vs investing it.
  function debtVsInvest(monthly, years, aprs, investReturn) {
    return {
      invest: fv(monthly, investReturn, years),
      contributed: monthly * 12 * years,
      debts: aprs.map(apr => ({ apr, value: fv(monthly, apr, years) })),
    };
  }

  // Avalanche (highest rate first) or snowball (smallest balance first).
  function payoffPlan(debts, budget, method) {
    const ds = debts.map(d => ({ ...d }));
    ds.sort(method === "avalanche" ? (a, b) => b.rate - a.rate : (a, b) => a.balance - b.balance);
    let months = 0, interest = 0;
    while (ds.some(d => d.balance > 0.005) && months < 1200) {
      months++;
      for (const d of ds) if (d.balance > 0) { const it = d.balance * d.rate / 12; d.balance += it; interest += it; }
      let left = budget;
      for (const d of ds) if (d.balance > 0) { const p = Math.min(d.min, d.balance); d.balance -= p; left -= p; }
      for (const d of ds) if (d.balance > 0 && left > 0) { const p = Math.min(left, d.balance); d.balance -= p; left -= p; }
    }
    return { months, interest };
  }

  // First $10,000, in order: starter fund, expensive debt, full emergency
  // fund, then invest. (Employer match comes from pay, not the lump sum.)
  function firstTenK(o) {
    let left = o.amount;
    const take = want => { const x = Math.max(0, Math.min(left, want)); left -= x; return x; };
    const starter = take(o.starter);
    const debt = take(o.expensiveDebt);
    const emergency = take(o.monthlySpend * o.months - starter);
    const invest = left;
    return {
      steps: [
        { name: "Starter emergency fund", amount: starter },
        { name: "Pay off expensive debt", amount: debt },
        { name: "Top up emergency fund", amount: emergency },
        { name: "Invest long term", amount: invest },
      ],
      investIn30: invest * (1 + o.investReturn / 12) ** 360,
      matchPerYear: o.salary * o.matchUpTo * o.matchRate,
      matchIn30: fv(o.salary * o.matchUpTo * o.matchRate / 12, o.investReturn, 30),
    };
  }

  function carCost(o) {
    const loan = o.price - o.down;
    const payment = pmt(loan, o.rate, o.months);
    const totalInterest = payment * o.months - loan;
    const running = o.insurance + o.fuel + o.maintenance;
    const lostValue = o.price * (1 - o.valueKept);
    return {
      payment, totalInterest, running,
      cashMonthly: payment + running,
      depreciationMonthly: lostValue / o.months,
      trueMonthly: totalInterest / o.months + lostValue / o.months + running,
    };
  }

  // 20/4/10: 20% down, max 4-year loan, payment + insurance <= 10% of gross.
  function maxCar(salary, rate, insurance) {
    const payment = salary * 0.10 / 12 - insurance;
    if (payment <= 0) return { payment: 0, price: 0 };
    return { payment, price: pv(payment, rate, 48) / 0.8 };
  }

  function budget(takeHome, needs, wants, save, rate) {
    return {
      needs: takeHome * needs, wants: takeHome * wants, save: takeHome * save,
      in10: fv(takeHome * save, rate, 10), in30: fv(takeHome * save, rate, 30),
    };
  }

  // Loan with an optional extra monthly payment on top of the normal one.
  function loanPayoff(balance, rate, years, extra) {
    const base = pmt(balance, rate, years * 12);
    const run = pay => {
      let b = balance, months = 0, paid = 0;
      const balances = [b];
      while (b > 0.005 && months < 1200) {
        b += b * rate / 12;
        const p = Math.min(pay, b);
        b -= p; paid += p; months++;
        balances.push(b);
      }
      return { months, interest: paid - balance, balances };
    };
    return { payment: base, plain: run(base), faster: run(base + extra) };
  }

  // What a yearly fee costs: same contributions at return vs return - fee.
  function feeDrag(monthly, years, rate, fee) {
    const points = [];
    for (let y = 1; y <= years; y++) points.push({ year: y, noFee: fv(monthly, rate, y), withFee: fv(monthly, rate - fee, y) });
    return { noFee: fv(monthly, rate, years), withFee: fv(monthly, rate - fee, years), contributed: monthly * 12 * years, points };
  }

  // Two-bracket income tax: lowRate up to `line`, highRate on the part above.
  function bracketTax(income, line, lowRate, highRate) {
    const tax = Math.min(income, line) * lowRate + Math.max(0, income - line) * highRate;
    return { tax, takeHome: income - tax };
  }

  // ---- Week 2 ----

  // Tax now vs tax later on the same pre-tax monthly amount. "Now": pay tax
  // today, growth is tax-free later. "Later": invest it all, pay tax on
  // everything when you take it out. "No break": tax now AND tax on the gains.
  function taxTiming(monthly, rate, years, taxNow, taxLater) {
    const gross = fv(monthly, rate, years), put = monthly * 12 * years;
    return {
      gross, contributed: put,
      now: gross * (1 - taxNow), later: gross * (1 - taxLater),
      noBreak: put * (1 - taxNow) + (gross - put) * (1 - taxNow) * (1 - taxLater),
    };
  }

  // S&P 500 total return incl. dividends, calendar years. Source: Aswath
  // Damodaran, NYU Stern, "Historical Returns on Stocks, Bonds and Bills",
  // histretSP, data updated 2026-01-05. US index, US dollars, before fees.
  const SP500 = { 2000: -.0903, 2001: -.1185, 2002: -.2197, 2003: .2836, 2004: .1074, 2005: .0483, 2006: .1561,
    2007: .0548, 2008: -.3655, 2009: .2594, 2010: .1482, 2011: .0210, 2012: .1589, 2013: .3215, 2014: .1352,
    2015: .0138, 2016: .1177, 2017: .2161, 2018: -.0423, 2019: .3121, 2020: .1802, 2021: .2847, 2022: -.1804,
    2023: .2606, 2024: .2488, 2025: .1778 };

  // Invest `monthly` at the start of every month from Jan `from` to Dec `to`.
  // Each year's return is spread evenly over its 12 months (annual data only).
  function backtest(monthly, from, to, fee = 0, returns = SP500) {
    let bal = 0, put = 0, lossYears = 0;
    const points = [];
    for (let y = from; y <= to; y++) {
      if (!(y in returns)) break;
      const f = (1 + returns[y] - fee) ** (1 / 12);
      const startBal = bal;
      for (let m = 0; m < 12; m++) { bal = (bal + monthly) * f; put += monthly; }
      if (bal < startBal + monthly * 12) lossYears++;
      points.push({ year: y, balance: bal, contributed: put });
    }
    return { final: bal, contributed: put, lossYears, points };
  }

  // Withdraw rate x start in year 1, raised by inflation every year, taken at
  // the start of each year; the rest grows at `ret`. Yearly steps.
  function withdrawal(start, rate, ret, inflation, maxYears = 60) {
    let bal = start, w = start * rate, years = maxYears, taken = 0;
    const balances = [start];
    for (let y = 1; y <= maxYears; y++) {
      if (bal < w) { years = y - 1; taken += bal; bal = 0; balances.push(0); break; }
      bal = (bal - w) * (1 + ret); taken += w; w *= 1 + inflation;
      balances.push(bal);
    }
    return { years, lasts: balances[balances.length - 1] > 0, firstYear: start * rate, taken, balances };
  }

  // Degree ROI vs not studying. Study years: tuition plus the after-tax pay
  // you give up. After: the after-tax extra pay from a salary `bump`.
  // Both salaries grow at `growth`. Cash flows at year end.
  function degreeROI(o) {
    let cum = 0, npv = 0, payback = null, cost = 0;
    const points = [];
    for (let t = 1; t <= o.studyYears + o.careerYears; t++) {
      const base = o.salary * (1 + o.growth) ** (t - 1);
      let flow;
      if (t <= o.studyYears) { flow = -o.tuition / o.studyYears - base * (1 - o.kept) * (1 - o.tax); cost -= flow; }
      else flow = base * o.bump * (1 - o.tax);
      cum += flow; npv += flow / (1 + o.discount) ** t;
      points.push({ year: t, cum });
      if (payback === null && t > o.studyYears && cum >= 0) payback = t - o.studyYears;
    }
    return { cost, extraYear1: o.salary * (1 + o.growth) ** o.studyYears * o.bump * (1 - o.tax), payback, net: cum, npv, points };
  }

  // What savings can buy after `years` of inflation, earning `interest`.
  function purchasingPower(amount, inflation, years, interest = 0) {
    const real = (1 + interest) / (1 + inflation) - 1;
    const points = [];
    for (let y = 0; y <= years; y++) points.push({ year: y, value: amount * (1 + real) ** y });
    return { value: amount * (1 + real) ** years, nominal: amount * (1 + interest) ** years, real,
      halfLife: real < 0 ? Math.log(0.5) / Math.log(1 + real) : Infinity, points };
  }

  // Monthly saving needed to reach `target` in `years`, counting what you have.
  function savingsGoal(target, years, rate, saved = 0) {
    const grownSaved = saved * (1 + rate / 12) ** (years * 12);
    const monthly = Math.max(0, (target - grownSaved) / fv(1, rate, years));
    return { monthly, put: monthly * 12 * years + saved, interest: target - monthly * 12 * years - saved,
      doubling: rate > 0 ? Math.log(2) / (12 * Math.log(1 + rate / 12)) : Infinity, rule72: rate > 0 ? 72 / (rate * 100) : Infinity };
  }

  // Lifetime pet cost: one-time costs, then yearly costs rising by `rise`.
  // "Invested instead": the same money invested monthly at `ret`.
  function petCost(o) {
    let total = o.upfront, inv = o.upfront, yearly = o.yearly;
    const points = [{ year: 0, cost: total, invested: inv }];
    for (let y = 1; y <= o.years; y++) {
      for (let m = 0; m < 12; m++) inv = inv * (1 + o.ret / 12) + yearly / 12;
      total += yearly; yearly *= 1 + o.rise;
      points.push({ year: y, cost: total, invested: inv });
    }
    return { lifetime: total, perMonth: total / (o.years * 12), invested: inv, points };
  }

  // ---- Week 3 ----

  // Emergency fund: the target, months to build it while the cash earns
  // `cashRate`, what holding it in cash costs vs investing it, and what the
  // same emergency costs if it goes on a credit card instead.
  function emergencyFund(o) {
    const target = o.spend * o.months;
    let bal = o.saved, months = 0;
    while (bal < target - 0.005 && months < 1200) { bal = bal * (1 + o.cashRate / 12) + o.monthly; months++; }
    if (bal < target - 0.005) months = Infinity;
    const card = cardPayoff(o.shock, o.apr, "fixed", o.pay);
    const hold = t => t * (o.investReturn - o.cashRate);
    return {
      target, gap: Math.max(0, target - o.saved), months,
      holdYear: hold(target),
      tenYear: target * ((1 + o.investReturn / 12) ** 120 - (1 + o.cashRate / 12) ** 120),
      cardInterest: card.interest, cardMonths: card.months,
      sizes: [3, 6, 9, 12].map(m => ({ months: m, target: o.spend * m, holdYear: hold(o.spend * m) })),
    };
  }

  // Extra monthly income for `years`: spend it, throw it at a debt first
  // (then invest), or invest it while the debt gets only its regular payment.
  // In every path, once the debt is gone its regular payment is invested too.
  // Net worth = investments minus any debt left.
  function sideHustle(o) {
    const run = mode => {
      let d = o.debt, inv = 0, interest = 0, free = d <= 0 ? 0 : null;
      const points = [{ year: 0, net: -d }];
      for (let m = 1; m <= o.years * 12; m++) {
        const it = d * o.apr / 12; d += it; interest += it;
        let cash = o.payment + (mode === "debt" ? o.side : 0);
        const p = Math.min(cash, d); d -= p; cash -= p;
        if (free === null && d <= 0.005) { d = 0; free = m; }
        if (mode === "invest") cash += o.side;
        inv = inv * (1 + o.ret / 12) + cash;
        if (m % 12 === 0) points.push({ year: m / 12, net: inv - d });
      }
      return { net: inv - d, invested: inv, debtLeft: d, interest, free, points };
    };
    return { spend: run("spend"), debt: run("debt"), invest: run("invest"), earned: o.side * 12 * o.years };
  }

  // Buy now, pay over `months` at `apr`, plus any fee and late fees, vs
  // paying cash. Also: months to save the price by putting the same monthly
  // payment aside at `saveRate` first.
  function instalment(o) {
    const fees = o.fee + o.late * o.lateFee;
    const total = apr => pmt(o.price, apr, o.months) * o.months + fees;
    const payment = pmt(o.price, o.apr, o.months);
    let bal = 0, saveMonths = 0;
    while (bal < o.price - 0.005 && saveMonths < 1200) { bal = bal * (1 + o.saveRate / 12) + payment; saveMonths++; }
    return {
      payment, total: total(o.apr), extra: total(o.apr) - o.price, extraPct: (total(o.apr) - o.price) / o.price,
      zeroTotal: o.price + fees, saveMonths, byApr: total,
    };
  }

  // Lifestyle creep: take-home pay rises by `raise` a year. Path A keeps
  // saving the same amount and spends every raise. Path B also saves `share`
  // of every increase. Both invested monthly at `ret`.
  function lifestyleCreep(o) {
    let a = 0, b = 0;
    const points = [];
    for (let y = 0; y < o.years; y++) {
      const extra = o.pay * (1 + o.raise) ** y - o.pay;
      for (let m = 0; m < 12; m++) { a = a * (1 + o.ret / 12) + o.save; b = b * (1 + o.ret / 12) + o.save + extra * o.share; }
      points.push({ year: y + 1, a, b });
    }
    const last = o.pay * (1 + o.raise) ** (o.years - 1), saveB = o.save + (last - o.pay) * o.share;
    return { a, b, gap: b - a, lastPay: last, spendA: last - o.save, spendB: last - saveB, saveB,
      putA: o.save * 12 * o.years, points };
  }

  // Irregular income, steady salary. An example 12-month income pattern that
  // averages exactly 1 (repeats each year). `swing` scales how far months move
  // from the average (1 = the pattern as is). Tax share is set aside first;
  // the rest goes into a buffer account that pays you `salary` every month.
  const INCOME_PATTERN = [0.6, 0.4, 1.5, 0.3, 1.2, 0.9, 1.6, 0.5, 1.1, 1.4, 0.8, 1.7];
  function incomeBuffer(o) {
    let bal = o.start, cum = 0, worst = 0, low = o.start, short = 0, below = 0;
    const points = [];
    for (let m = 1; m <= o.months; m++) {
      const income = Math.max(0, o.avg * (1 + o.swing * (INCOME_PATTERN[(m - 1) % 12] - 1)));
      const net = income * (1 - o.tax);
      if (net < o.salary) below++;
      bal += net - o.salary; cum += net - o.salary;
      worst = Math.min(worst, cum); low = Math.min(low, bal);
      if (bal < -0.005) short++;
      points.push({ month: m, income, net, balance: bal });
    }
    return { steady: o.avg * (1 - o.tax), need: -worst, low, short, below, end: bal, taxPot: o.avg * o.tax * o.months, points };
  }

  // Savings kept in a currency that loses `dep` of its value a year against
  // a steadier one, earning `aRate`, vs converted (cost `cost` each way) and
  // kept in the steadier one earning `bRate`. Values in the steadier
  // currency's units, the steady path converted back at the end.
  function currencySavings(o) {
    const keepA = y => o.amount * ((1 + o.aRate) * (1 - o.dep)) ** y;
    const moveB = y => o.amount * (1 - o.cost) ** 2 * (1 + o.bRate) ** y;
    const points = [];
    for (let y = 0; y <= o.years; y++) points.push({ year: y, a: keepA(y), b: moveB(y) });
    return { a: keepA(o.years), b: moveB(o.years), real: (1 + o.aRate) * (1 - o.dep) - 1,
      breakEven: (1 + o.bRate) / (1 - o.dep) - 1, points };
  }

  // Big wedding vs smaller one: invest the difference for `years`. If part of
  // the big one is borrowed, its loan payments are money the smaller wedding
  // would also free up, so they are invested too.
  function weddingCost(o) {
    const loanPay = o.borrowed > 0 ? pmt(o.borrowed, o.apr, o.loanMonths) : 0;
    const interest = loanPay * o.loanMonths - o.borrowed;
    let inv = o.big - o.borrowed - o.small;
    const points = [{ year: 0, value: inv }];
    for (let m = 1; m <= o.years * 12; m++) {
      inv = inv * (1 + o.ret / 12) + (m <= o.loanMonths ? loanPay : 0);
      if (m % 12 === 0) points.push({ year: m / 12, value: inv });
    }
    return { diff: o.big - o.small, loanPay, interest, trueCost: o.big + interest, invested: inv, points };
  }

  // ---- Week 4 ----

  // Rent on take-home pay: rent at a share of pay, what's left after other
  // spending (saved), that saving invested for `years`, and the most rent
  // that still leaves `target` of pay to save.
  function rentAfford(o) {
    const at = share => { const rent = o.pay * share, left = o.pay - rent - o.other; return { share, rent, left, rate: left / o.pay }; };
    const now = at(o.share);
    return { ...now, invested: Math.max(0, now.left) > 0 ? fv(now.left, o.ret, o.years) : 0, put: Math.max(0, now.left) * 12 * o.years,
      maxRent: o.pay * (1 - o.target) - o.other, shares: [0.25, 0.3, 0.35, 0.4, 0.5].map(at) };
  }

  // FIRE number = yearly spending / withdrawal rate. Saving `rate` of take-home
  // pay, spending the rest; months to reach it at a real (after-inflation)
  // return, so every figure is in today's money.
  function fireNumber(o) {
    const at = rate => {
      const save = o.pay * rate, spend = o.pay - save, target = spend * 12 / o.wr;
      let bal = o.saved, m = 0;
      while (bal < target - 0.005 && m < 1200) { bal = bal * (1 + o.ret / 12) + save; m++; }
      return { rate, save, spend, target, months: bal >= target - 0.005 ? m : Infinity, years: bal >= target - 0.005 ? m / 12 : Infinity };
    };
    return { ...at(o.rate), multiple: 1 / o.wr, byRate: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map(at) };
  }

  // A daily habit: what it costs over `years` if spent, vs the same money
  // invested monthly at `ret`. `days` = days a week (365-day year). The price
  // can rise each year by `rise`.
  function dailyHabit(o) {
    let spent = 0, inv = 0, price = o.daily;
    const points = [{ year: 0, spent: 0, invested: 0 }];
    for (let y = 1; y <= o.years; y++) {
      const month = price * o.days / 7 * 365 / 12;
      for (let m = 0; m < 12; m++) { inv = inv * (1 + o.ret / 12) + month; spent += month; }
      points.push({ year: y, spent, invested: inv });
      price *= 1 + o.rise;
    }
    return { perYear: o.daily * o.days / 7 * 365, spent, invested: inv, growth: inv - spent, points };
  }

  // Education fund: monthly saving needed to reach `target` by `endAge`,
  // starting at age `startA` vs `startB`, invested at `ret`.
  function educationFund(o) {
    const path = start => {
      const years = o.endAge - start, monthly = years > 0 ? o.target / fv(1, o.ret, years) : Infinity;
      const points = [];
      let bal = 0;
      for (let age = 0; age <= o.endAge; age++) {
        if (age > start) for (let m = 0; m < 12; m++) bal = bal * (1 + o.ret / 12) + monthly;
        points.push({ age, balance: age >= start ? bal : null });
      }
      return { start, years, monthly, put: monthly * 12 * years, growth: o.target - monthly * 12 * years, points };
    };
    const a = path(o.startA), b = path(o.startB);
    return { a, b, extra: b.monthly - a.monthly, lateWithEarly: fv(a.monthly, o.ret, o.endAge - o.startB) };
  }

  // Small business break-even: each sale earns price minus cost per sale;
  // sales needed a month to cover fixed costs; profit at expected sales and
  // months to earn back the one-off start-up cost.
  function breakEven(o) {
    const margin = o.price - o.unit;
    const units = margin > 0 ? Math.ceil(o.fixed / margin - 1e-9) : Infinity;
    const profit = o.sales * margin - o.fixed;
    return { margin, marginPct: o.price > 0 ? margin / o.price : 0, units, revenue: units * o.price, profit,
      payback: profit > 0 ? Math.ceil(o.startup / profit - 1e-9) : Infinity,
      line: n => ({ revenue: n * o.price, cost: o.fixed + n * o.unit }) };
  }

  // Holiday spending on a card: minimum payments (cardPayoff "min") vs a
  // fixed payment vs clearing it in `clearMonths`. Also the monthly saving
  // that would cover it next year.
  function holidayCard(o) {
    const min = cardPayoff(o.spend, o.apr, "min"), fixed = cardPayoff(o.spend, o.apr, "fixed", o.fixed);
    const clearPay = pmt(o.spend, o.apr, o.clearMonths);
    return { min, fixed, firstMin: Math.max(25, o.spend * o.apr / 12 + o.spend * 0.01), clearPay,
      clearInterest: clearPay * o.clearMonths - o.spend, minTotal: o.spend + min.interest, saveMonthly: o.spend / 12 };
  }

  // Real hourly wage: pay per hour on paper vs after work costs, counting
  // commute and other unpaid work time. Monthly take-home, weeks worked a year.
  function realWage(o) {
    const paidHours = o.hours * o.weeks, extraHours = (o.commute * o.days + o.extra) * o.weeks;
    const paper = o.pay * 12 / paidHours, net = (o.pay - o.costs) * 12, real = net / (paidHours + extraHours);
    return { paper, real, drop: 1 - real / paper, paidHours, extraHours, commuteHours: o.commute * o.days * o.weeks,
      costsYear: o.costs * 12, minutes: price => price / real * 60 };
  }

  const api = { fv, pmt, pv, growth, catchUp, cardPayoff, rentVsBuy, debtVsInvest, payoffPlan, firstTenK, carCost, maxCar, budget, loanPayoff, feeDrag, bracketTax,
    taxTiming, SP500, backtest, withdrawal, degreeROI, purchasingPower, savingsGoal, petCost,
    emergencyFund, sideHustle, instalment, lifestyleCreep, INCOME_PATTERN, incomeBuffer, currencySavings, weddingCost,
    rentAfford, fireNumber, dailyHabit, educationFund, breakEven, holidayCard, realWage };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MC = api;
})(this);
