// The Money Calculator: UI. Each calculator declares its inputs and a render()
// that turns input values into an answer line, stat tiles and a chart or table.
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const money = x => !isFinite(x) ? "never" : (x < 0 ? "-$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US");
  const pct = x => x / 100;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  const CALCS = [
    {
      id: "start-early", label: "Start at 25 vs 35",
      title: "What does waiting to invest cost?",
      question: "Same monthly amount, two start ages. How far apart do they end up?",
      inputs: [
        ["monthly", "Invest per month ($)", 200], ["rate", "Average yearly return (%)", 7],
        ["early", "Early start age", 25], ["late", "Late start age", 35], ["end", "Stop at age", 65],
      ],
      render(v) {
        const r = pct(v.rate), a = MC.growth(v.monthly, r, v.early, v.end), b = MC.growth(v.monthly, r, v.late, v.end);
        const ages = a.points.map(p => p.age);
        const late = ages.map(age => (b.points.find(p => p.age === age) || { balance: null }).balance);
        return {
          answer: `Starting at ${v.early} instead of ${v.late} is worth ${money(a.final - b.final)} more by ${v.end}.`,
          stats: [
            { k: `Start at ${v.early}`, v: money(a.final), cls: "grow" },
            { k: `Start at ${v.late}`, v: money(b.final) },
            { k: `You put in (start ${v.early})`, v: money(a.contributed) },
            { k: `Monthly needed to catch up from ${v.late}`, v: money(MC.catchUp(v.monthly, r, v.early, v.late, v.end)) },
          ],
          chart: { labels: ages, sets: [[`Start at ${v.early}`, a.points.map(p => p.balance), "--grow"], [`Start at ${v.late}`, late, "--accent"]] },
        };
      },
    },
    {
      id: "card", label: "Credit card payoff",
      title: "How long will this card take to pay off?",
      question: "Minimum payments vs a fixed monthly amount.",
      inputs: [["balance", "Balance ($)", 3000], ["apr", "Interest rate APR (%)", 24], ["fixed", "Fixed payment ($/month)", 150]],
      render(v) {
        const m = MC.cardPayoff(v.balance, pct(v.apr), "min"), f = MC.cardPayoff(v.balance, pct(v.apr), "fixed", v.fixed);
        const n = Math.max(m.balances.length, f.balances.length);
        return {
          answer: isFinite(f.months)
            ? `Paying ${money(v.fixed)} a month saves ${money(m.interest - f.interest)} in interest and ${Math.round((m.months - f.months) / 12)} years.`
            : `${money(v.fixed)} a month doesn't cover the interest. Raise the payment.`,
          stats: [
            { k: "Minimum only: months", v: m.months }, { k: "Minimum only: interest", v: money(m.interest), cls: "cost" },
            { k: `${money(v.fixed)}/mo: months`, v: isFinite(f.months) ? f.months : "never" },
            { k: `${money(v.fixed)}/mo: interest`, v: money(f.interest), cls: "grow" },
          ],
          chart: { labels: [...Array(n).keys()], xTitle: "Month", sets: [["Minimum payment (interest + 1%)", m.balances, "--cost"], [`Fixed ${money(v.fixed)}`, f.balances, "--grow"]] },
          note: "Minimum = interest + 1% of the balance, at least $25. Check your card's own formula.",
        };
      },
    },
    {
      id: "rent-buy", label: "Rent vs buy",
      title: "Rent or buy?",
      question: "Buyer's home equity (after selling costs) vs a renter who invests the difference.",
      inputs: [
        ["price", "Home price ($)", 350000], ["down", "Down payment (%)", 20], ["mrate", "Mortgage rate (%)", 6.5],
        ["rent", "Rent for a similar home ($/month)", 2100], ["homeg", "Home value growth (%/yr)", 3],
        ["rentg", "Rent growth (%/yr)", 3], ["ret", "Renter's investment return (%)", 7],
        ["tax", "Property tax (%/yr)", 1.1], ["maint", "Maintenance (%/yr)", 1], ["ins", "Insurance ($/yr)", 1800],
      ],
      render(v) {
        const o = MC.rentVsBuy({ price: v.price, downPct: pct(v.down), mortgageRate: pct(v.mrate), years: 30,
          buyCostPct: .03, sellCostPct: .06, taxPct: pct(v.tax), maintPct: pct(v.maint), insurance: v.ins,
          insuranceGrowth: .03, homeGrowth: pct(v.homeg), rentGrowth: pct(v.rentg), investReturn: pct(v.ret), rent: v.rent });
        return {
          answer: o.breakeven ? `Buying pulls ahead in year ${o.breakeven}.` : "Renting stays ahead for all 30 years with these numbers.",
          stats: [
            { k: "Mortgage payment", v: money(o.mortgage) }, { k: "All-in owning cost, year 1", v: money(o.monthlyOwnYear1), cls: "cost" },
            { k: "Rent, year 1", v: money(v.rent) }, { k: "Breakeven year", v: o.breakeven || "never", cls: "grow" },
          ],
          chart: { labels: o.points.map(p => p.year), xTitle: "Year", sets: [["Buyer (equity)", o.points.map(p => p.buyer), "--grow"], ["Renter (investments)", o.points.map(p => p.renter), "--accent"]] },
          note: "Assumes 3% buying costs, 6% selling costs, a 30-year fixed loan, and that the renter really invests the difference every month.",
        };
      },
    },
    {
      id: "debt-invest", label: "Debt or invest",
      title: "Pay off debt or invest?",
      question: "What an extra monthly amount is worth if it goes to debt at different rates, vs investing it.",
      inputs: [["monthly", "Extra per month ($)", 300], ["years", "Years", 5], ["ret", "Expected investment return (%)", 7], ["apr", "Your debt's interest rate (%)", 24]],
      render(v) {
        const aprs = [3, 5, 7, 10, 15, 20, 24, 30];
        const d = MC.debtVsInvest(v.monthly, v.years, aprs.map(pct), pct(v.ret));
        const mine = MC.fv(v.monthly, pct(v.apr), v.years);
        return {
          answer: v.apr > v.ret ? `At ${v.apr}%, paying the debt wins by ${money(mine - d.invest)}, guaranteed.`
            : `At ${v.apr}%, investing may win by ${money(d.invest - mine)}, but it isn't guaranteed.`,
          stats: [
            { k: "Paying your debt is worth", v: money(mine), cls: "grow" },
            { k: `Investing at ${v.ret}% is worth`, v: money(d.invest) }, { k: "You put in", v: money(d.contributed) },
          ],
          chart: { type: "bar", labels: aprs.map(a => a + "%"), xTitle: "Debt interest rate",
            sets: [["Paying off debt", d.debts.map(x => x.value), "--grow"], [`Investing at ${v.ret}%`, aprs.map(() => d.invest), "--accent"]] },
        };
      },
    },
    {
      id: "ten-k", label: "First $10,000",
      title: "Where should your first $10,000 go?",
      question: "Starter fund, expensive debt, full emergency fund, then invest.",
      inputs: [
        ["amount", "Savings to place ($)", 10000], ["spend", "Monthly spending ($)", 1500], ["months", "Emergency fund (months)", 3],
        ["debt", "High-interest debt ($)", 2000], ["salary", "Salary ($/yr)", 50000], ["match", "Employer match (% of your contribution)", 50],
        ["upto", "Match up to (% of salary)", 6], ["ret", "Investment return (%)", 7],
      ],
      render(v) {
        const t = MC.firstTenK({ amount: v.amount, starter: Math.min(1000, v.spend * v.months), expensiveDebt: v.debt, monthlySpend: v.spend,
          months: v.months, investReturn: pct(v.ret), salary: v.salary, matchUpTo: pct(v.upto), matchRate: pct(v.match) });
        return {
          answer: `${money(t.steps[3].amount)} left to invest, which could grow to about ${money(t.investIn30)} in 30 years.`,
          stats: [
            { k: "Free employer money / year", v: money(t.matchPerYear), cls: "grow" },
            { k: "That match after 30 years", v: money(t.matchIn30), cls: "grow" },
          ],
          table: [["Step", "Amount"], ...t.steps.map((s, i) => [`${i + 1}. ${s.name}`, money(s.amount)])],
          note: "The employer match comes from your paycheck, not this lump sum, so take it alongside every step.",
        };
      },
    },
    {
      id: "car", label: "Car affordability",
      title: "How much car can you afford?",
      question: "The real monthly cost of a car, and the 20/4/10 rule for your salary.",
      inputs: [
        ["salary", "Your gross salary ($/yr)", 60000], ["price", "Car price ($)", 40000], ["down", "Down payment ($)", 4000],
        ["rate", "Loan rate (%)", 7.5], ["months", "Loan length (months)", 60], ["ins", "Insurance ($/month)", 150],
        ["fuel", "Fuel ($/month)", 150], ["maint", "Maintenance ($/month)", 80], ["kept", "Value kept at end of loan (%)", 55],
      ],
      render(v) {
        const c = MC.carCost({ price: v.price, down: v.down, rate: pct(v.rate), months: v.months, insurance: v.ins, fuel: v.fuel, maintenance: v.maint, valueKept: pct(v.kept) });
        const max = MC.maxCar(v.salary, pct(v.rate), v.ins);
        return {
          answer: `The 20/4/10 rule suggests a car around ${money(max.price)} on your salary.`,
          stats: [
            { k: "Loan payment", v: money(c.payment) }, { k: "Cash out each month", v: money(c.cashMonthly), cls: "cost" },
            { k: "True cost incl. lost value", v: money(c.trueMonthly), cls: "cost" }, { k: "20/4/10 max car price", v: money(max.price), cls: "grow" },
          ],
          chart: { type: "bar", labels: ["Payment", "Insurance", "Fuel", "Maintenance", "Lost value"], xTitle: "Per month",
            sets: [["$ per month", [c.payment, v.ins, v.fuel, v.maint, c.depreciationMonthly], "--cost"]] },
          note: "20/4/10 = 20% down, loan of 4 years or less, payment + insurance under 10% of gross pay.",
        };
      },
    },
    {
      id: "loan", label: "Loan payoff",
      title: "Pay off a loan early?",
      question: "Your normal payment vs adding a little extra every month.",
      inputs: [["balance", "Loan balance ($)", 25000], ["rate", "Interest rate (%)", 5.5], ["years", "Loan term (years)", 10], ["extra", "Extra per month ($)", 200]],
      render(v) {
        const l = MC.loanPayoff(v.balance, pct(v.rate), v.years, v.extra);
        const n = Math.max(l.plain.balances.length, l.faster.balances.length);
        return {
          answer: `Adding ${money(v.extra)} a month clears it ${l.plain.months - l.faster.months} months sooner and saves ${money(l.plain.interest - l.faster.interest)} in interest.`,
          stats: [
            { k: "Normal payment", v: money(l.payment) }, { k: "Interest, normal plan", v: money(l.plain.interest), cls: "cost" },
            { k: `Months with +${money(v.extra)}`, v: l.faster.months }, { k: `Interest with +${money(v.extra)}`, v: money(l.faster.interest), cls: "grow" },
          ],
          chart: { labels: [...Array(n).keys()], xTitle: "Month", sets: [["Normal plan", l.plain.balances, "--cost"], [`+${money(v.extra)}/month`, l.faster.balances, "--grow"]] },
        };
      },
    },
    {
      id: "fees", label: "Fund fees",
      title: "What does a 1% fee really cost?",
      question: "The same monthly investing, with and without a yearly fee.",
      inputs: [["monthly", "Invest per month ($)", 500], ["years", "Years", 30], ["rate", "Return before fees (%)", 7], ["fee", "Yearly fee (%)", 1]],
      render(v) {
        const f = MC.feeDrag(v.monthly, v.years, pct(v.rate), pct(v.fee));
        return {
          answer: `A ${v.fee}% fee costs you ${money(f.noFee - f.withFee)} over ${v.years} years.`,
          stats: [
            { k: "Without the fee", v: money(f.noFee), cls: "grow" }, { k: `With a ${v.fee}% fee`, v: money(f.withFee), cls: "cost" },
            { k: "You put in", v: money(f.contributed) },
          ],
          chart: { labels: f.points.map(p => p.year), xTitle: "Year", sets: [["No fee", f.points.map(p => p.noFee), "--grow"], [`${v.fee}% fee`, f.points.map(p => p.withFee), "--cost"]] },
        };
      },
    },
    {
      id: "raise", label: "Raise & tax brackets",
      title: "Can a raise lower your take-home pay?",
      question: "Example brackets: a lower rate up to a line, a higher rate only on income above it.",
      inputs: [["before", "Income before raise ($)", 39000], ["after", "Income after raise ($)", 41000], ["line", "Bracket line ($)", 40000], ["low", "Rate below the line (%)", 10], ["high", "Rate above the line (%)", 20]],
      render(v) {
        const a = MC.bracketTax(v.before, v.line, pct(v.low), pct(v.high)), b = MC.bracketTax(v.after, v.line, pct(v.low), pct(v.high));
        return {
          answer: `After the raise you keep ${money(b.takeHome - a.takeHome)} more. Only income above ${money(v.line)} pays ${v.high}%.`,
          stats: [
            { k: "Take-home before", v: money(a.takeHome) }, { k: "Take-home after", v: money(b.takeHome), cls: "grow" },
            { k: "Tax before", v: money(a.tax) }, { k: "Tax after", v: money(b.tax), cls: "cost" },
          ],
          chart: { type: "bar", labels: ["Before raise", "After raise"], sets: [["Take-home", [a.takeHome, b.takeHome], "--grow"], ["Tax", [a.tax, b.tax], "--cost"]] },
          note: "Illustrative brackets, not any country's real rates. Some benefits do stop at certain incomes, so check those separately.",
        };
      },
    },
    {
      id: "budget", label: "50/30/20 budget",
      title: "Split your take-home pay",
      question: "Needs, wants, and savings, and what the savings grow into.",
      inputs: [["take", "Take-home pay ($/month)", 4000], ["needs", "Needs (%)", 50], ["wants", "Wants (%)", 30], ["save", "Savings & debt (%)", 20], ["ret", "Investment return (%)", 7]],
      render(v) {
        const b = MC.budget(v.take, pct(v.needs), pct(v.wants), pct(v.save), pct(v.ret));
        const total = v.needs + v.wants + v.save;
        return {
          answer: total === 100 ? `Saving ${money(b.save)} a month could grow to about ${money(b.in10)} in 10 years.` : `Your split adds up to ${total}%, not 100%.`,
          stats: [
            { k: "Needs", v: money(b.needs) }, { k: "Wants (guilt-free)", v: money(b.wants) },
            { k: "Savings & debt", v: money(b.save), cls: "grow" }, { k: "Savings after 30 years", v: money(b.in30), cls: "grow" },
          ],
          chart: { type: "doughnut", labels: ["Needs", "Wants", "Savings"], sets: [["$", [b.needs, b.wants, b.save], ["--accent", "--muted", "--grow"]]] },
        };
      },
    },
    {
      id: "tax-timing", label: "Tax now or later",
      title: "Pay tax now or later?",
      question: "The same pre-tax money: pay tax today and grow it tax-free, or grow it all and pay tax when you take it out.",
      inputs: [
        ["monthly", "Pre-tax money per month ($)", 300], ["years", "Years invested", 30], ["rate", "Average yearly return (%)", 7],
        ["now", "Your tax rate today (%)", 25], ["later", "Your tax rate when you withdraw (%)", 15],
      ],
      render(v) {
        const t = MC.taxTiming(v.monthly, pct(v.rate), v.years, pct(v.now), pct(v.later));
        const rates = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45];
        const gap = t.later - t.now;
        return {
          answer: Math.abs(gap) < 0.5 ? `Same tax rate now and later: both end at ${money(t.now)}. That's the break-even.`
            : gap > 0 ? `Paying tax later wins by ${money(gap)}, because your rate later (${v.later}%) is lower than today (${v.now}%).`
            : `Paying tax now wins by ${money(-gap)}, because your rate later (${v.later}%) is higher than today (${v.now}%).`,
          stats: [
            { k: "Tax now, take out tax-free", v: money(t.now), cls: v.now <= v.later ? "grow" : "" },
            { k: "Tax later, on everything", v: money(t.later), cls: v.later < v.now ? "grow" : "" },
            { k: "No tax break at all", v: money(t.noBreak), cls: "cost" },
            { k: "Break-even rate later", v: v.now + "%" },
          ],
          chart: { type: "bar", labels: rates.map(r => r + "%"), xTitle: "Tax rate when you withdraw",
            sets: [["Tax later", rates.map(r => t.gross * (1 - r / 100)), "--grow"], [`Tax now at ${v.now}%`, rates.map(() => t.now), "--accent"]] },
          note: "Both options start from the same pre-tax money. Names and rules for these accounts differ by country; this is the math only. 'No tax break' = taxed today and the gains taxed again later at your later rate.",
        };
      },
    },
    {
      id: "backtest", label: "$100/month since 2000",
      title: "What if you invested every month since 2000?",
      question: "A fixed amount each month into the S&P 500 index, using its real yearly returns (dividends included).",
      inputs: [["monthly", "Invest per month ($)", 100], ["from", "Start year (2000–2025)", 2000], ["to", "End year (2000–2025)", 2025], ["fee", "Yearly fee (%)", 0]],
      render(v) {
        const from = Math.min(2025, Math.max(2000, Math.round(v.from))), to = Math.min(2025, Math.max(from, Math.round(v.to)));
        const b = MC.backtest(v.monthly, from, to, pct(v.fee));
        return {
          answer: `${money(v.monthly)} a month from January ${from} to December ${to}: ${money(b.contributed)} put in, ${money(b.final)} at the end.`,
          stats: [
            { k: `Value at end of ${to}`, v: money(b.final), cls: "grow" }, { k: "You put in", v: money(b.contributed) },
            { k: "Growth", v: money(b.final - b.contributed), cls: b.final >= b.contributed ? "grow" : "cost" },
            { k: "Years that ended in a loss", v: b.lossYears, cls: "cost" },
          ],
          chart: { labels: b.points.map(p => p.year), xTitle: "End of year", sets: [["Account value", b.points.map(p => p.balance), "--grow"], ["Money put in", b.points.map(p => p.contributed), "--muted"]] },
          note: "Data: S&P 500 total return incl. dividends, from Aswath Damodaran (NYU Stern), updated Jan 2026. US index in US dollars, before taxes. Each year's return is spread evenly over its months, so the real month-to-month path was bumpier. Past returns don't predict future ones.",
        };
      },
    },
    {
      id: "withdraw", label: "How long $1M lasts",
      title: "How long will your savings last?",
      question: "Take a percentage of the starting amount in year one, raise it with inflation every year, and see when it runs out.",
      inputs: [["start", "Savings at retirement ($)", 1000000], ["rate", "Year-one withdrawal (% of savings)", 4], ["ret", "Average yearly return (%)", 6], ["infl", "Inflation (%/yr)", 3]],
      render(v) {
        const mine = MC.withdrawal(v.start, pct(v.rate), pct(v.ret), pct(v.infl));
        const runs = [3, 4, 5].map(r => [r, MC.withdrawal(v.start, pct(r), pct(v.ret), pct(v.infl))]);
        const len = 61;
        return {
          answer: mine.lasts ? `Taking ${v.rate}% (${money(mine.firstYear)} in year one), the money lasts 60+ years.`
            : `Taking ${v.rate}% (${money(mine.firstYear)} in year one), the money runs out after ${mine.years} years.`,
          stats: runs.map(([r, x]) => ({ k: `${r}% (${money(x.firstYear)}/yr) lasts`, v: x.lasts ? "60+ yrs" : `${x.years} yrs`, cls: r === 3 ? "grow" : r === 5 ? "cost" : "" })),
          chart: { labels: [...Array(len).keys()], xTitle: "Years into retirement",
            sets: runs.map(([r, x], i) => [`${r}% withdrawal`, [...Array(len).keys()].map(y => (y < x.balances.length ? x.balances[y] : 0) / (1 + pct(v.infl)) ** y), ["--grow", "--accent", "--cost"][i]]) },
          note: "Chart in today's money (after inflation). Yearly steps: each year's withdrawal comes out first, the rest earns the average return. Real markets don't return the average every year, and a bad first few years shortens every line.",
        };
      },
    },
    {
      id: "degree", label: "Master's degree ROI",
      title: "Is a master's degree worth it?",
      question: "Tuition and lost pay up front, then the extra after-tax pay for the rest of your career.",
      inputs: [
        ["tuition", "Total tuition ($)", 40000], ["study", "Years of study", 2], ["salary", "Salary without the degree ($/yr)", 50000],
        ["kept", "Salary you keep while studying (%)", 0], ["bump", "Pay rise from the degree (%)", 20], ["growth", "Yearly pay growth (%)", 3],
        ["tax", "Tax on the extra pay (%)", 25], ["career", "Working years after the degree", 30], ["disc", "What the money could earn instead (%)", 5],
      ],
      render(v) {
        const d = MC.degreeROI({ tuition: v.tuition, studyYears: Math.max(0, Math.round(v.study)), salary: v.salary, kept: pct(v.kept), bump: pct(v.bump),
          growth: pct(v.growth), tax: pct(v.tax), careerYears: Math.round(v.career), discount: pct(v.disc) });
        return {
          answer: d.payback ? `It pays for itself ${d.payback} years after you graduate. Worth ${money(d.npv)} in today's money over your career.`
            : "With these numbers the degree never pays for itself.",
          stats: [
            { k: "Total cost (tuition + lost after-tax pay)", v: money(d.cost), cls: "cost" }, { k: "Extra after-tax pay, first year", v: money(d.extraYear1), cls: "grow" },
            { k: "Years after graduating to pay back", v: d.payback || "never" }, { k: "Value in today's money", v: money(d.npv), cls: d.npv >= 0 ? "grow" : "cost" },
          ],
          chart: { labels: d.points.map(p => p.year), xTitle: "Years from starting the degree", sets: [["Running total: extra pay minus costs", d.points.map(p => p.cum), "--grow"]] },
          note: "Salaries and the pay rise are examples; look up real figures for your field and country. 'Today's money' discounts future pay at the rate the money could earn instead.",
        };
      },
    },
    {
      id: "inflation", label: "Inflation & savings",
      title: "What will your savings really buy?",
      question: "The same money, years from now, after prices rise.",
      inputs: [["amount", "Savings today ($)", 10000], ["infl", "Inflation (%/yr)", 8], ["years", "Years", 10], ["interest", "Interest your savings earn (%/yr)", 0]],
      render(v) {
        const p = MC.purchasingPower(v.amount, pct(v.infl), v.years, pct(v.interest));
        const lines = [3, 8, 20].map(r => MC.purchasingPower(v.amount, pct(r), v.years, pct(v.interest)));
        return {
          answer: p.real < 0 ? `After ${v.years} years, ${money(v.amount)} buys what ${money(p.value)} buys today.`
            : `Earning ${v.interest}% beats ${v.infl}% inflation: ${money(v.amount)} buys what ${money(p.value)} buys today.`,
          stats: [
            { k: `Buying power after ${v.years} years`, v: money(p.value), cls: p.real < 0 ? "cost" : "grow" },
            { k: "Balance you'd see", v: money(p.nominal) },
            { k: "Real return per year", v: (p.real * 100).toFixed(1) + "%", cls: p.real < 0 ? "cost" : "grow" },
            { k: "Years until it buys half", v: isFinite(p.halfLife) ? p.halfLife.toFixed(1) : "never" },
          ],
          chart: { labels: lines[0].points.map(x => x.year), xTitle: "Years", sets: [3, 8, 20].map((r, i) => [`${r}% inflation`, lines[i].points.map(x => x.value), ["--grow", "--accent", "--cost"][i]]) },
          note: "Inflation rates here are examples. Your own country's rate, and your own basket of spending, can be very different.",
        };
      },
    },
    {
      id: "goal", label: "Savings goal",
      title: "How much to save each month?",
      question: "A target, a deadline, and what your savings earn. Plus how long money takes to double.",
      inputs: [["target", "Savings goal ($)", 20000], ["years", "Years to get there", 3], ["rate", "Yearly interest or return (%)", 5], ["saved", "Already saved ($)", 0]],
      render(v) {
        const g = MC.savingsGoal(v.target, v.years, pct(v.rate), v.saved);
        return {
          answer: `Save ${money(g.monthly)} a month to reach ${money(v.target)} in ${v.years} years.`,
          stats: [
            { k: "Save per month", v: money(g.monthly), cls: "grow" }, { k: "Interest does the rest", v: money(g.interest), cls: "grow" },
            { k: `Years to double at ${v.rate}%`, v: isFinite(g.doubling) ? g.doubling.toFixed(1) : "never" },
            { k: "Rule of 72 estimate", v: isFinite(g.rule72) ? g.rule72.toFixed(1) : "never" },
          ],
          chart: { type: "doughnut", labels: ["You put in", "Interest"], sets: [["$", [g.put, Math.max(0, g.interest)], ["--accent", "--grow"]]] },
          note: "Monthly deposits, interest compounded monthly. Rule of 72: divide 72 by the rate to estimate the years to double.",
        };
      },
    },
    {
      id: "pet", label: "Lifetime pet cost",
      title: "What does a pet really cost?",
      question: "One-time costs, then yearly costs over the pet's life, and what that money could have grown to.",
      inputs: [["upfront", "First-year one-time costs ($)", 1830], ["yearly", "Yearly costs ($)", 1391], ["years", "Lifespan (years)", 12], ["rise", "Costs rise each year (%)", 0], ["ret", "Return if invested instead (%)", 7]],
      render(v) {
        const p = MC.petCost({ upfront: v.upfront, yearly: v.yearly, years: Math.round(v.years), rise: pct(v.rise), ret: pct(v.ret) });
        return {
          answer: `Over ${Math.round(v.years)} years this pet costs about ${money(p.lifetime)}, or ${money(p.perMonth)} a month.`,
          stats: [
            { k: "Lifetime cost", v: money(p.lifetime), cls: "cost" }, { k: "Average per month", v: money(p.perMonth) },
            { k: "First year", v: money(v.upfront + v.yearly), cls: "cost" }, { k: `If invested at ${v.ret}% instead`, v: money(p.invested), cls: "grow" },
          ],
          chart: { labels: p.points.map(x => x.year), xTitle: "Years", sets: [["Total spent", p.points.map(x => x.cost), "--cost"], [`Same money invested at ${v.ret}%`, p.points.map(x => x.invested), "--grow"]] },
          note: "Defaults: ASPCA 2021 estimates for a medium dog (one-time $1,030 + grooming and dental $800; yearly $1,391), US dollars. A 2026 Money.com / Healthy Paws survey put the average at $4,272 a year. Costs vary a lot by country, breed and health.",
        };
      },
    },
  ];

  let chart = null;

  function show(id) {
    const c = CALCS.find(x => x.id === id) || CALCS[0];
    document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.id === c.id));
    $("#app").innerHTML = `
      <section class="calc">
        <h1>${c.title}</h1><p class="q">${c.question}</p>
        <div class="grid">
          <form class="inputs">${c.inputs.map(([k, label, val]) => `<label>${label}<input type="number" step="any" name="${k}" value="${val}"></label>`).join("")}</form>
          <div class="out"></div>
        </div>
      </section>`;
    const form = $("form.inputs");
    const update = () => {
      const v = {};
      for (const [k] of c.inputs) v[k] = parseFloat(form.elements[k].value) || 0;
      draw(c.render(v));
    };
    form.addEventListener("input", update);
    update();
    try { history.replaceState(null, "", "#" + c.id); } catch (e) { /* file:// or sandboxed */ }
  }

  function draw(r) {
    const out = $(".out");
    out.innerHTML = `
      <p class="answer">${r.answer}</p>
      <div class="stats">${r.stats.map(s => `<div class="stat"><div class="k">${s.k}</div><div class="v ${s.cls || ""}">${s.v}</div></div>`).join("")}</div>
      ${r.chart ? `<div class="chart"><canvas></canvas></div>` : ""}
      ${r.table ? `<table>${r.table.map((row, i) => `<tr>${row.map(c => i ? `<td>${c}</td>` : `<th>${c}</th>`).join("")}</tr>`).join("")}</table>` : ""}
      ${r.note ? `<p class="q" style="margin-top:12px">${r.note}</p>` : ""}`;
    if (chart) { chart.destroy(); chart = null; }
    if (!r.chart || typeof Chart === "undefined") return;
    const type = r.chart.type || "line";
    const color = c => Array.isArray(c) ? c.map(css) : css(c);
    chart = new Chart(out.querySelector("canvas"), {
      type,
      data: {
        labels: r.chart.labels,
        datasets: r.chart.sets.map(([label, data, c]) => ({
          label, data, borderColor: color(c), backgroundColor: color(c), pointRadius: 0, borderWidth: type === "line" ? 3 : 0, spanGaps: false,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
        plugins: { legend: { labels: { color: css("--text") } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${money(ctx.parsed.y ?? ctx.parsed)}` } } },
        scales: type === "doughnut" ? {} : {
          x: { title: { display: !!r.chart.xTitle, text: r.chart.xTitle || "", color: css("--muted") }, ticks: { color: css("--muted"), maxTicksLimit: 10 }, grid: { display: false } },
          y: { ticks: { color: css("--muted"), callback: x => money(x) }, grid: { color: css("--line") } },
        },
      },
    });
  }

  $("#tabs").innerHTML = CALCS.map(c => `<button data-id="${c.id}">${c.label}</button>`).join("");
  $("#tabs").addEventListener("click", e => { if (e.target.dataset.id) show(e.target.dataset.id); });
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  show(location.hash.slice(1));
})();
