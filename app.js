// The Money Calculator: UI. Each calculator declares its inputs and a render()
// that turns input values into an answer line, stat tiles and a chart or table.
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const money = x => !isFinite(x) ? "never" : (x < 0 ? "-$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US");
  const num = x => Math.round(x).toLocaleString("en-US");
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
    // ---- Week 3 ----
    {
      id: "emergency", label: "Emergency fund",
      title: "How big should your emergency fund be?",
      question: "Months of essential spending, how long it takes to build, what holding it in cash costs, and what an emergency costs without one.",
      inputs: [
        ["spend", "Essential spending ($/month)", 2000], ["months", "Months to cover", 6], ["saved", "Already saved ($)", 0],
        ["monthly", "Saving per month ($)", 400], ["cash", "Interest on the cash (%)", 4], ["ret", "Return if invested instead (%)", 7],
        ["shock", "Example emergency ($)", 3000], ["apr", "Card rate if no fund (%)", 24], ["pay", "Card payment ($/month)", 150],
      ],
      render(v) {
        const e = MC.emergencyFund({ spend: v.spend, months: v.months, saved: v.saved, monthly: v.monthly, cashRate: pct(v.cash),
          investReturn: pct(v.ret), shock: v.shock, apr: pct(v.apr), pay: v.pay });
        return {
          answer: `${v.months} months of ${money(v.spend)} is ${money(e.target)}. Saving ${money(v.monthly)} a month gets you there in ${isFinite(e.months) ? e.months + " months" : "never"}.`,
          stats: [
            { k: "Emergency fund target", v: money(e.target), cls: "grow" },
            { k: "Months to build it", v: isFinite(e.months) ? e.months : "never" },
            { k: "Yearly cost of holding cash", v: money(e.holdYear), cls: "cost" },
            { k: `${money(v.shock)} on a card instead: interest`, v: isFinite(e.cardInterest) ? money(e.cardInterest) : "never paid off", cls: "cost" },
          ],
          chart: { type: "bar", labels: e.sizes.map(s => s.months + " months"), xTitle: "Months of essential spending",
            sets: [["Fund size", e.sizes.map(s => s.target), "--grow"], ["Yearly cost of holding it in cash", e.sizes.map(s => s.holdYear), "--cost"]] },
          note: `"Cost of holding cash" = the fund x (investment return minus cash interest), a yearly estimate; over 10 years the gap compounds to ${money(e.tenYear)}. Returns are assumptions. The card example is paid off at ${money(v.pay)} a month (${isFinite(e.cardMonths) ? e.cardMonths + " months" : "never"}).`,
        };
      },
    },
    {
      id: "side-hustle", label: "Side hustle $500",
      title: "Extra income: spend it, pay debt, or invest?",
      question: "The same extra money every month, three ways. Net worth = investments minus any debt left.",
      inputs: [
        ["side", "Extra income after tax and costs ($/month)", 500], ["years", "Years", 5], ["ret", "Investment return (%)", 7],
        ["debt", "Debt balance ($)", 6000], ["apr", "Debt interest rate (%)", 24], ["payment", "Regular debt payment ($/month)", 200],
      ],
      render(v) {
        const s = MC.sideHustle({ side: v.side, years: Math.round(v.years), ret: pct(v.ret), debt: v.debt, apr: pct(v.apr), payment: v.payment });
        const best = s.debt.net >= s.invest.net ? "Debt first, then invest" : "Investing straight away";
        return {
          answer: Math.abs(s.debt.net - s.invest.net) < 1 ? `With no debt, every dollar is invested: ${money(s.invest.net)} after ${Math.round(v.years)} years.`
            : `${best} ends ahead by ${money(Math.abs(s.debt.net - s.invest.net))} after ${Math.round(v.years)} years.`,
          stats: [
            { k: "Spend it: net worth", v: money(s.spend.net), cls: "cost" },
            { k: "Debt first, then invest", v: money(s.debt.net), cls: s.debt.net >= s.invest.net ? "grow" : "" },
            { k: "Invest it, debt paid slowly", v: money(s.invest.net), cls: s.invest.net > s.debt.net ? "grow" : "" },
            { k: "Interest paid, debt first", v: money(s.debt.interest), cls: "grow" },
          ],
          chart: { labels: s.debt.points.map(p => p.year), xTitle: "Years",
            sets: [["Debt first, then invest", s.debt.points.map(p => p.net), "--grow"], ["Invest it", s.invest.points.map(p => p.net), "--accent"], ["Spend it", s.spend.points.map(p => p.net), "--cost"]] },
          note: `You earn ${money(s.earned)} extra in total. Interest paid: ${money(s.debt.interest)} debt first, ${money(s.invest.interest)} with the regular payment only. Debt-free in month ${s.debt.free ?? "never"} (debt first) vs ${s.invest.free ?? "never"} (regular payment only). Once the debt is gone, its regular payment is invested in every path. Returns are assumptions.`,
        };
      },
    },
    {
      id: "instalments", label: "Pay later vs cash",
      title: "Pay in instalments or pay cash?",
      question: "The true cost of a phone or laptop on an instalment plan, and how long saving up first would take.",
      inputs: [
        ["price", "Price ($)", 1200], ["months", "Months to pay", 24], ["apr", "Interest rate (%)", 25],
        ["fee", "Setup or account fees ($)", 0], ["late", "Missed payments", 0], ["lateFee", "Late fee each ($)", 0], ["save", "Interest if you save up first (%)", 0],
      ],
      render(v) {
        const i = MC.instalment({ price: v.price, months: Math.max(1, Math.round(v.months)), apr: pct(v.apr), fee: v.fee, late: v.late, lateFee: v.lateFee, saveRate: pct(v.save) });
        const aprs = [0, 10, 15, 20, 25, 30, 36];
        return {
          answer: `On the plan, the ${money(v.price)} item costs ${money(i.total)}: ${money(i.extra)} more than cash (${(i.extraPct * 100).toFixed(1)}%).`,
          stats: [
            { k: "Monthly payment", v: money(i.payment) }, { k: "Total you pay", v: money(i.total), cls: "cost" },
            { k: "Extra over the cash price", v: money(i.extra), cls: "cost" }, { k: "Months to save it up first", v: i.saveMonths, cls: "grow" },
          ],
          chart: { type: "bar", labels: aprs.map(a => a + "%"), xTitle: `Interest rate, ${Math.round(v.months)} months`,
            sets: [["Total paid on the plan", aprs.map(a => i.byApr(pct(a))), "--cost"], ["Cash price", aprs.map(() => v.price), "--grow"]] },
          note: "Example terms, not any provider's. 0% plans cost nothing extra only if every payment is on time; check each plan's own fees and what a missed payment costs. 'Save up first' puts the same monthly payment aside until you have the price.",
        };
      },
    },
    {
      id: "creep", label: "Lifestyle creep",
      title: "Spend every raise, or save half?",
      question: "Take-home pay rises every year. One person spends each raise; the other saves half of every increase.",
      inputs: [
        ["pay", "Take-home pay now ($/month)", 3000], ["raise", "Yearly raise (%)", 5], ["years", "Years", 10],
        ["save", "Saving now ($/month)", 300], ["share", "Share of each raise saved (%)", 50], ["ret", "Investment return (%)", 7],
      ],
      render(v) {
        const c = MC.lifestyleCreep({ pay: v.pay, raise: pct(v.raise), years: Math.max(1, Math.round(v.years)), save: v.save, share: pct(v.share), ret: pct(v.ret) });
        return {
          answer: `Saving ${v.share}% of every raise ends ${money(c.gap)} ahead after ${Math.round(v.years)} years.`,
          stats: [
            { k: "Spend every raise", v: money(c.a) }, { k: `Save ${v.share}% of each raise`, v: money(c.b), cls: "grow" },
            { k: "Final-year spending, spend every raise", v: money(c.spendA) + "/mo" },
            { k: `Final-year spending, save ${v.share}%`, v: money(c.spendB) + "/mo" },
          ],
          chart: { labels: c.points.map(p => p.year), xTitle: "Years", sets: [[`Save ${v.share}% of each raise`, c.points.map(p => p.b), "--grow"], ["Spend every raise", c.points.map(p => p.a), "--accent"]] },
          note: `Final year: take-home ${money(c.lastPay)} a month; saving ${money(v.save)} (spend every raise) vs ${money(c.saveB)} (save ${v.share}%). Raises arrive once a year; savings invested monthly. Returns and raises are examples.`,
        };
      },
    },
    {
      id: "buffer", label: "Irregular income",
      title: "Pay yourself a steady salary",
      question: "Irregular income goes into a buffer account (after setting tax aside); you pay yourself the same amount every month.",
      inputs: [
        ["avg", "Average monthly income ($)", 3000], ["swing", "How much months swing (%)", 100], ["tax", "Set aside for tax (%)", 20],
        ["salary", "Salary you pay yourself ($/month)", 2200], ["start", "Buffer at the start ($)", 0], ["months", "Months shown", 12],
      ],
      render(v) {
        const b = MC.incomeBuffer({ avg: v.avg, swing: pct(v.swing), tax: pct(v.tax), salary: v.salary, start: v.start, months: Math.max(1, Math.round(v.months)) });
        return {
          answer: b.short ? `The buffer runs short in ${b.short} of ${Math.round(v.months)} months. Start with ${money(b.need)} to never run short.`
            : `The buffer never runs short. It ends at ${money(b.end)}.`,
          stats: [
            { k: "Most you can pay yourself on average", v: money(b.steady), cls: "grow" },
            { k: "Starting buffer needed", v: money(b.need) },
            { k: "Lowest buffer balance", v: money(b.low), cls: b.low < 0 ? "cost" : "grow" },
            { k: "Months income is below salary", v: b.below },
          ],
          chart: { labels: b.points.map(p => p.month), xTitle: "Month",
            sets: [["Income after tax set-aside", b.points.map(p => p.net), "--accent"], ["Buffer balance", b.points.map(p => p.balance), "--grow"], ["Your salary", b.points.map(() => v.salary), "--cost"]] },
          note: "Example income pattern: 12 months that average exactly your average income, repeated each year. Tax set-aside is an example rate; real tax depends on your country.",
        };
      },
    },
    {
      id: "currency", label: "Weak vs steady currency",
      title: "Saving in a currency that keeps losing value",
      question: "Keep savings in Currency A, which loses value against Currency B each year, or convert and keep them in B. Values in units of B.",
      inputs: [
        ["amount", "Savings today (units of B)", 10000], ["years", "Years", 5], ["dep", "A loses vs B each year (%)", 20],
        ["arate", "Interest earned in A (%)", 10], ["brate", "Interest earned in B (%)", 3], ["cost", "Cost to convert, each way (%)", 2],
      ],
      render(v) {
        const c = MC.currencySavings({ amount: v.amount, years: Math.max(0, Math.round(v.years)), dep: pct(v.dep), aRate: pct(v.arate), bRate: pct(v.brate), cost: pct(v.cost) });
        return {
          answer: `After ${Math.round(v.years)} years: ${num(c.a)} units of B kept in A, ${num(c.b)} kept in B. A needs ${(c.breakEven * 100).toFixed(1)}% interest to keep up.`,
          stats: [
            { k: "Kept in A (in units of B)", v: num(c.a), cls: c.a < c.b ? "cost" : "grow" },
            { k: "Converted to B and back", v: num(c.b), cls: c.b <= c.a ? "cost" : "grow" },
            { k: "A's real change per year", v: (c.real * 100).toFixed(1) + "%", cls: c.real < 0 ? "cost" : "grow" },
            { k: "Interest A needs to keep up with B", v: (c.breakEven * 100).toFixed(1) + "%" },
          ],
          chart: { fmt: "num", labels: c.points.map(p => p.year), xTitle: "Years", sets: [["Kept in A", c.points.map(p => p.a), "--cost"], ["Kept in B", c.points.map(p => p.b), "--grow"]] },
          note: "Example rates only, not real currencies or forecasts. Exchange rates can move either way and are not predictable. Rules on holding foreign currency differ by country. What your savings buy also depends on local prices, not just exchange rates.",
        };
      },
    },
    {
      id: "wedding", label: "Wedding cost",
      title: "A big wedding vs investing the difference",
      question: "A bigger and a smaller wedding: what the difference could grow to, and what borrowing part of it adds.",
      inputs: [
        ["big", "Bigger wedding ($)", 34000], ["small", "Smaller wedding ($)", 8000], ["years", "Years invested", 10], ["ret", "Investment return (%)", 7],
        ["borrowed", "Part of the bigger one borrowed ($)", 0], ["apr", "Loan rate (%)", 15], ["loanMonths", "Loan length (months)", 36],
      ],
      render(v) {
        const w = MC.weddingCost({ big: v.big, small: v.small, years: Math.max(0, Math.round(v.years)), ret: pct(v.ret), borrowed: v.borrowed, apr: pct(v.apr), loanMonths: Math.max(1, Math.round(v.loanMonths)) });
        return {
          answer: `The ${money(w.diff)} difference, invested, could grow to about ${money(w.invested)} in ${Math.round(v.years)} years.`,
          stats: [
            { k: "Difference", v: money(w.diff) }, { k: `Invested for ${Math.round(v.years)} years`, v: money(w.invested), cls: "grow" },
            { k: "Interest on the borrowed part", v: money(w.interest), cls: "cost" }, { k: "Bigger wedding incl. interest", v: money(w.trueCost), cls: "cost" },
          ],
          chart: { labels: w.points.map(p => p.year), xTitle: "Years", sets: [["The difference, invested", w.points.map(p => p.value), "--grow"]] },
          note: (v.borrowed > 0 ? `Loan payment: ${money(w.loanPay)} a month for ${Math.round(v.loanMonths)} months. ` : "") + "Default bigger wedding: $34,000, the average US wedding cost in 2025 (The Knot 2026 Real Weddings Study, 10,474 US couples, published Feb 2026). The smaller one is an example. Costs vary hugely by country. Loan payments the smaller wedding avoids are invested too. Returns are assumptions.",
        };
      },
    },
    {
      id: "rent", label: "Rent on your pay",
      title: "How much rent can you afford?",
      question: "Rent as a share of take-home pay, and what's left to save after everything else you spend.",
      inputs: [
        ["pay", "Take-home pay ($/month)", 3000], ["share", "Rent as a share of pay (%)", 30], ["other", "Everything else you spend ($/month)", 1500],
        ["target", "Saving goal (% of pay)", 20], ["years", "Years the saving is invested", 5], ["ret", "Investment return (%)", 7],
      ],
      render(v) {
        const a = MC.rentAfford({ pay: v.pay, share: pct(v.share), other: v.other, target: pct(v.target), years: Math.max(0, Math.round(v.years)), ret: pct(v.ret) });
        return {
          answer: a.left >= 0 ? `Rent of ${money(a.rent)} leaves ${money(a.left)} a month to save: ${Math.round(a.rate * 100)}% of your pay.`
            : `Rent of ${money(a.rent)} plus your other spending is ${money(-a.left)} a month more than you take home.`,
          stats: [
            { k: `Rent at ${v.share}% of pay`, v: money(a.rent) + "/mo" },
            { k: "Left to save each month", v: money(a.left), cls: a.left > 0 ? "grow" : "cost" },
            { k: `Most rent that saves ${v.target}%`, v: money(Math.max(0, a.maxRent)) + "/mo" },
            { k: `That saving, invested ${Math.round(v.years)} years`, v: money(a.invested), cls: "grow" },
          ],
          chart: { type: "bar", labels: a.shares.map(s => Math.round(s.share * 100) + "% of pay"), xTitle: "Rent as a share of take-home pay",
            sets: [["Rent", a.shares.map(s => s.rent), "--cost"], ["Left to save", a.shares.map(s => Math.max(0, s.left)), "--grow"]] },
          note: "The 30% figure is a common rule of thumb, often quoted on pay before tax; this calculator uses take-home pay. 'Everything else' is all your other spending: food, transport, bills, fun. Returns are assumptions.",
        };
      },
    },
    {
      id: "fire", label: "FIRE number",
      title: "Your FIRE number: how much to stop working?",
      question: "Yearly spending divided by a withdrawal rate, and how long it takes at different saving rates. In today's money.",
      inputs: [
        ["pay", "Take-home pay ($/month)", 4000], ["rate", "Saving rate (% of pay)", 25], ["saved", "Already invested ($)", 0],
        ["ret", "Return after inflation (%)", 5], ["wr", "Withdrawal rate (%)", 4],
      ],
      render(v) {
        const f = MC.fireNumber({ pay: v.pay, rate: pct(v.rate), saved: v.saved, ret: pct(v.ret), wr: pct(v.wr) });
        const ym = m => !isFinite(m) ? "100+ yrs" : `${Math.floor(m / 12)} yrs ${m % 12} mo`;
        return {
          answer: `Spending ${money(f.spend)} a month, your FIRE number is ${money(f.target)}. Saving ${v.rate}%, you reach it in ${ym(f.months)}.`,
          stats: [
            { k: "FIRE number", v: money(f.target), cls: "grow" }, { k: "You save each month", v: money(f.save) },
            { k: "You spend each month", v: money(f.spend) }, { k: "Time to reach it", v: ym(f.months), cls: "grow" },
          ],
          chart: { type: "bar", fmt: "num", labels: f.byRate.map(x => Math.round(x.rate * 100) + "%"), xTitle: "Saving rate (share of take-home pay)",
            sets: [["Years to reach your FIRE number", f.byRate.map(x => isFinite(x.years) ? Math.round(x.years * 10) / 10 : null), "--accent"]] },
          note: `FIRE number = yearly spending x ${Math.round(f.multiple * 10) / 10} (a ${v.wr}% withdrawal rate, a common rule of thumb, not a guarantee). Return is after inflation, so all amounts are in today's money. Saving more means both more saved and less to replace. Returns are assumptions.`,
        };
      },
    },
    {
      id: "habit", label: "Daily habit cost",
      title: "What does a small daily habit cost over the years?",
      question: "The same daily amount, spent vs invested every month.",
      inputs: [
        ["daily", "Daily cost ($)", 8], ["days", "Days a week", 7], ["years", "Years", 20], ["ret", "Investment return (%)", 7], ["rise", "Price rise per year (%)", 0],
      ],
      render(v) {
        const h = MC.dailyHabit({ daily: v.daily, days: v.days, years: Math.max(0, Math.round(v.years)), ret: pct(v.ret), rise: pct(v.rise) });
        return {
          answer: `${money(v.daily)} a day for ${Math.round(v.years)} years: ${money(h.spent)} spent, or about ${money(h.invested)} if invested.`,
          stats: [
            { k: "Cost in the first year", v: money(h.perYear) }, { k: `Spent over ${Math.round(v.years)} years`, v: money(h.spent), cls: "cost" },
            { k: "Same money, invested", v: money(h.invested), cls: "grow" }, { k: "Growth on top", v: money(h.growth), cls: "grow" },
          ],
          chart: { labels: h.points.map(p => p.year), xTitle: "Years", sets: [["Invested", h.points.map(p => p.invested), "--grow"], ["Spent", h.points.map(p => p.spent), "--cost"]] },
          note: "Invested monthly (the daily amount x days a week x 365 / 7, split into 12 months). Returns are assumptions; prices and returns are examples.",
        };
      },
    },
    {
      id: "education", label: "Child's education",
      title: "Saving for a child's education",
      question: "The monthly saving needed to reach the same goal, starting at birth vs starting later.",
      inputs: [
        ["target", "Goal at the age needed ($)", 50000], ["startA", "Start saving at age (early)", 0], ["startB", "Start saving at age (later)", 8],
        ["end", "Age the money is needed", 18], ["ret", "Investment return (%)", 6],
      ],
      render(v) {
        const e = MC.educationFund({ target: v.target, startA: Math.round(v.startA), startB: Math.round(v.startB), endAge: Math.round(v.end), ret: pct(v.ret) });
        return {
          answer: `Starting at age ${Math.round(v.startA)} takes ${money(e.a.monthly)} a month; waiting until ${Math.round(v.startB)} takes ${money(e.b.monthly)}.`,
          stats: [
            { k: `Monthly from age ${Math.round(v.startA)}`, v: money(e.a.monthly), cls: "grow" }, { k: `Monthly from age ${Math.round(v.startB)}`, v: money(e.b.monthly), cls: "cost" },
            { k: `You put in, from age ${Math.round(v.startA)}`, v: money(e.a.put) }, { k: `You put in, from age ${Math.round(v.startB)}`, v: money(e.b.put) },
          ],
          chart: { labels: e.a.points.map(p => p.age), xTitle: "Child's age", sets: [[`Start at ${Math.round(v.startA)}`, e.a.points.map(p => p.balance), "--grow"], [`Start at ${Math.round(v.startB)}`, e.b.points.map(p => p.balance), "--accent"]] },
          note: `Growth does the rest: ${money(e.a.growth)} starting at ${Math.round(v.startA)} vs ${money(e.b.growth)} at ${Math.round(v.startB)}. Starting at ${Math.round(v.startB)} with only ${money(e.a.monthly)} a month reaches ${money(e.lateWithEarly)}. The goal is an example in future money; real costs depend on the country and the course. Returns are assumptions.`,
        };
      },
    },
    {
      id: "break-even", label: "Business break-even",
      title: "Starting a small business: when do you break even?",
      question: "Each sale earns its price minus its cost. How many sales a month cover your fixed costs?",
      inputs: [
        ["fixed", "Fixed costs ($/month)", 2000], ["price", "Price per sale ($)", 25], ["unit", "Cost per sale ($)", 10],
        ["sales", "Expected sales a month", 200], ["startup", "One-off start-up cost ($)", 5000],
      ],
      render(v) {
        const b = MC.breakEven({ fixed: v.fixed, price: v.price, unit: v.unit, sales: Math.round(v.sales), startup: v.startup });
        const top = Math.max(Math.round(v.sales), isFinite(b.units) ? b.units : 0) * 1.5 || 10, step = Math.max(1, Math.round(top / 10));
        const ns = [...Array(11).keys()].map(i => i * step);
        return {
          answer: isFinite(b.units) ? `You break even at ${b.units} sales a month. At ${Math.round(v.sales)} sales, you ${b.profit >= 0 ? "make" : "lose"} ${money(Math.abs(b.profit))} a month.`
            : "Each sale costs more than its price, so more sales never break even. Raise the price or cut the cost per sale.",
          stats: [
            { k: "Earned per sale", v: money(b.margin) }, { k: "Sales a month to break even", v: isFinite(b.units) ? num(b.units) : "never", cls: "grow" },
            { k: `Profit at ${Math.round(v.sales)} sales`, v: money(b.profit), cls: b.profit >= 0 ? "grow" : "cost" },
            { k: "Months to earn back start-up", v: isFinite(b.payback) ? b.payback : "never" },
          ],
          chart: { labels: ns, xTitle: "Sales a month", sets: [["Money in (sales)", ns.map(n => b.line(n).revenue), "--grow"], ["Costs (fixed + per sale)", ns.map(n => b.line(n).cost), "--cost"]] },
          note: "Fixed costs: rent, subscriptions, your own pay, anything you pay whether you sell or not. Cost per sale: materials, packaging, delivery, payment fees. Profit before tax. All numbers are examples.",
        };
      },
    },
    {
      id: "holiday", label: "Holiday on a card",
      title: "Holiday shopping on a credit card",
      question: "December spending on a card: pay the minimum, a fixed amount, or clear it in a few months?",
      inputs: [
        ["spend", "Holiday spending on the card ($)", 1500], ["apr", "Card interest rate APR (%)", 24], ["fixed", "Fixed payment ($/month)", 150], ["clear", "Or clear it in (months)", 3],
      ],
      render(v) {
        const h = MC.holidayCard({ spend: v.spend, apr: pct(v.apr), fixed: v.fixed, clearMonths: Math.max(1, Math.round(v.clear)) });
        const yrs = m => !isFinite(m) ? "never" : `${m} months (${(m / 12).toFixed(1)} yrs)`;
        const n = Math.max(h.min.balances.length, h.fixed.balances.length);
        return {
          answer: `Paying the minimum, ${money(v.spend)} takes ${yrs(h.min.months)} and costs ${money(h.min.interest)} in interest.`,
          stats: [
            { k: "First minimum payment", v: money(h.firstMin) }, { k: "Minimum only: interest", v: money(h.min.interest), cls: "cost" },
            { k: `${money(v.fixed)}/mo: interest`, v: isFinite(h.fixed.interest) ? money(h.fixed.interest) : "never", cls: "grow" },
            { k: `Clear in ${Math.round(v.clear)} months: interest`, v: money(h.clearInterest), cls: "grow" },
          ],
          chart: { labels: [...Array(n).keys()], xTitle: "Month", sets: [["Minimum payment (interest + 1%)", h.min.balances, "--cost"], [`Fixed ${money(v.fixed)}`, h.fixed.balances, "--grow"]] },
          note: `Minimum = interest + 1% of the balance, at least $25, a common formula; check your card's own. Total paid on the minimum: ${money(h.minTotal)}. ${isFinite(h.fixed.months) ? `${money(v.fixed)} a month clears it in ${h.fixed.months} months. ` : ""}Clearing it in ${Math.round(v.clear)} months takes ${money(h.clearPay)} a month. Saving ${money(h.saveMonthly)} a month from January covers it next year with no interest. For scale: US shoppers planned to spend $890.49 each on average on the 2025 winter holidays (NRF holiday survey by Prosper Insights & Analytics, published Oct 16, 2025). The $1,500 default is an example.`,
        };
      },
    },
    {
      id: "real-wage", label: "Real hourly wage",
      title: "Your real hourly wage",
      question: "Pay per hour on paper vs after work costs, counting your commute and other unpaid work time.",
      inputs: [
        ["pay", "Take-home pay ($/month)", 3000], ["hours", "Paid hours a week", 40], ["weeks", "Weeks worked a year", 48],
        ["commute", "Commute, there and back (hours/day)", 1.5], ["days", "Days you commute a week", 5], ["extra", "Other unpaid work time (hours/week)", 2.5],
        ["costs", "Work costs: travel, lunches, clothes ($/month)", 300],
      ],
      render(v) {
        const w = MC.realWage({ pay: v.pay, hours: v.hours, weeks: v.weeks, commute: v.commute, days: v.days, extra: v.extra, costs: v.costs });
        const dp = x => (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2);
        return {
          answer: `On paper you earn ${dp(w.paper)} an hour. Counting work time and costs, it's ${dp(w.real)}: ${Math.round(w.drop * 100)}% less.`,
          stats: [
            { k: "Hourly pay on paper", v: dp(w.paper) }, { k: "Real hourly wage", v: dp(w.real), cls: "cost" },
            { k: "Commute hours a year", v: num(w.commuteHours) }, { k: "Work costs a year", v: money(w.costsYear), cls: "cost" },
          ],
          chart: { type: "bar", labels: ["Hours a year"], xTitle: "", fmt: "num",
            sets: [["Paid hours", [w.paidHours], "--grow"], ["Commute", [w.commuteHours], "--cost"], ["Other unpaid work time", [w.extraHours - w.commuteHours], "--accent"]] },
          note: `A $5 purchase costs ${Math.round(w.minutes(5))} minutes of real work. Uses take-home pay. Commute = hours there and back x days a week x weeks worked. All inputs are examples.`,
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
    const fmt = r.chart.fmt === "num" ? num : money;
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
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y ?? ctx.parsed)}` } } },
        scales: type === "doughnut" ? {} : {
          x: { title: { display: !!r.chart.xTitle, text: r.chart.xTitle || "", color: css("--muted") }, ticks: { color: css("--muted"), maxTicksLimit: 10 }, grid: { display: false } },
          y: { ticks: { color: css("--muted"), callback: x => fmt(x) }, grid: { color: css("--line") } },
        },
      },
    });
  }

  $("#tabs").innerHTML = CALCS.map(c => `<button data-id="${c.id}">${c.label}</button>`).join("");
  $("#tabs").addEventListener("click", e => { if (e.target.dataset.id) show(e.target.dataset.id); });
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  show(location.hash.slice(1));
})();
