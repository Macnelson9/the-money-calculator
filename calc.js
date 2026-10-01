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

  const api = { fv, pmt, pv, growth, catchUp, cardPayoff, rentVsBuy, debtVsInvest, payoffPlan, firstTenK, carCost, maxCar, budget, loanPayoff, feeDrag, bracketTax };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MC = api;
})(this);
