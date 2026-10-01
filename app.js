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
