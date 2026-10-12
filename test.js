// Checks the calculators reproduce the numbers used in the week 1, 2, 3 and 4 scripts.
// Run: node test.js
const MC = require("./calc.js");
const r = Math.round;
let failed = 0;
function check(name, got, want, tol = 1) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${r(got)} (want ${want})`);
}
// Monday
check("$200/mo 25-65", MC.growth(200, .07, 25, 65).final, 524963);
check("$200/mo 35-65", MC.growth(200, .07, 35, 65).final, 243994);
check("catch-up", MC.catchUp(200, .07, 25, 35, 65), 430);
check("$5/day 40y", MC.fv(152, .07, 40), 398972);
const minPay = MC.cardPayoff(3000, .24, "min");
check("card min months", minPay.months, 183); check("card min interest", minPay.interest, 4887);
const fixed = MC.cardPayoff(3000, .24, "fixed", 150);
check("card $150 months", fixed.months, 26); check("card $150 interest", fixed.interest, 870);
// Tuesday
const base = { price: 350000, downPct: .2, mortgageRate: .065, years: 30, buyCostPct: .03, sellCostPct: .06,
  taxPct: .011, maintPct: .01, insurance: 1800, insuranceGrowth: .03, homeGrowth: .03, rentGrowth: .03, investReturn: .07 };
const rvb = o => MC.rentVsBuy({ ...base, ...o });
check("mortgage", rvb({ rent: 2100 }).mortgage, 1770);
check("first interest", rvb({ rent: 2100 }).firstInterest, 1517);
check("own cost y1", rvb({ rent: 2100 }).monthlyOwnYear1, 2532);
check("breakeven rent 2100", rvb({ rent: 2100 }).breakeven, 11, 0);
check("breakeven rent 2300", rvb({ rent: 2300 }).breakeven, 6, 0);
check("breakeven 2100 @5%", rvb({ rent: 2100, investReturn: .05 }).breakeven, 7, 0);
console.log(`${rvb({ rent: 1900 }).breakeven === null ? "ok  " : "FAIL"} rent 1900 never breaks even`);
if (rvb({ rent: 1900 }).breakeven !== null) failed++;
// Wednesday
const dvi = MC.debtVsInvest(300, 5, [.03, .24], .07);
check("invest 7%", dvi.invest, 21478); check("debt 3%", dvi.debts[0].value, 19394); check("debt 24%", dvi.debts[1].value, 34215);
const debts = [{ name: "card", balance: 2500, rate: .24, min: 75 }, { name: "loan", balance: 1000, rate: .12, min: 50 }, { name: "car", balance: 8000, rate: .07, min: 250 }];
check("avalanche interest", MC.payoffPlan(debts, 600, "avalanche").interest, 976);
check("snowball interest", MC.payoffPlan(debts, 600, "snowball").interest, 1047);
check("months", MC.payoffPlan(debts, 600, "snowball").months, 21, 0);
// Thursday
const tk = MC.firstTenK({ amount: 10000, starter: 1000, expensiveDebt: 2000, monthlySpend: 1500, months: 3, investReturn: .07, salary: 50000, matchUpTo: .06, matchRate: .5 });
check("invest leftover", tk.steps[3].amount, 3500, 0); check("leftover in 30y", tk.investIn30, 28408); check("match in 30y", tk.matchIn30, 152496);
check("$50/mo 30y", MC.fv(50, .07, 30), 60999);
// Friday
const car = MC.carCost({ price: 40000, down: 4000, rate: .075, months: 60, insurance: 150, fuel: 150, maintenance: 80, valueKept: .55 });
check("car payment", car.payment, 721); check("car cash", car.cashMonthly, 1101); check("car true", car.trueMonthly, 801);
check("max car 60k", MC.maxCar(60000, .075, 150).price, 18094);
check("max car 40k", MC.maxCar(40000, .075, 150).price, 9478);
// Saturday
check("1% fee gap", MC.fv(500, .07, 30) - MC.fv(500, .06, 30), 107728);
const loan = MC.loanPayoff(25000, .055, 10, 200);
check("loan payment", loan.payment, 271); check("loan interest", loan.plain.interest, 7558);
check("loan +200 months", loan.faster.months, 61, 0); check("loan +200 interest", loan.faster.interest, 3709);
const fee = MC.feeDrag(500, 30, .07, .01);
check("fee no-fee", fee.noFee, 609985); check("fee with", fee.withFee, 502258);
check("raise take-home", MC.bracketTax(41000, 40000, .1, .2).takeHome - MC.bracketTax(39000, 40000, .1, .2).takeHome, 1700);
// Sunday
const b = MC.budget(4000, .5, .3, .2, .07);
check("save 10y", b.in10, 138468); check("save 30y", b.in30, 975977);
// ---- Week 2 ----
// Mon: tax now vs later
const tt = MC.taxTiming(300, .07, 30, .25, .15);
check("tax gross", tt.gross, 365991); check("tax now", tt.now, 274493); check("tax later 15%", tt.later, 311093);
check("no tax break", tt.noBreak, 245469); check("tax later 35%", MC.taxTiming(300, .07, 30, .25, .35).later, 237894);
check("break-even equal", MC.taxTiming(300, .07, 30, .25, .25).later - tt.now, 0);
check("tax gap @5%", MC.taxTiming(300, .05, 30, .25, .15).later - MC.taxTiming(300, .05, 30, .25, .15).now, 24968);
// Tue: backtest (S&P 500 total return, Damodaran Jan 2026)
const bt = MC.backtest(100, 2000, 2025);
check("bt final", bt.final, 170971); check("bt put in", bt.contributed, 31200, 0); check("bt loss years", bt.lossYears, 6, 0);
check("bt end 2008", bt.points[8].balance, 8944); check("bt 2000-2009", MC.backtest(100, 2000, 2009).final, 12627);
check("bt 2009-2025", MC.backtest(100, 2009, 2025).final, 79374); check("bt 1% fee", MC.backtest(100, 2000, 2025, .01).final, 146756);
// Wed: withdrawals, 6% return, 3% inflation
check("wd 3% lasts 60+", MC.withdrawal(1e6, .03, .06, .03).lasts ? 1 : 0, 1, 0);
check("wd 4% years", MC.withdrawal(1e6, .04, .06, .03).years, 42, 0); check("wd 5% years", MC.withdrawal(1e6, .05, .06, .03).years, 29, 0);
check("wd 4% @5% ret", MC.withdrawal(1e6, .04, .05, .03).years, 33, 0); check("wd 5% @5% ret", MC.withdrawal(1e6, .05, .05, .03).years, 24, 0);
check("wd 3% @5% ret", MC.withdrawal(1e6, .03, .05, .03).years, 52, 0);
// Thu: degree ROI
const deg = o => MC.degreeROI({ tuition: 40000, studyYears: 2, salary: 50000, kept: 0, bump: .2, growth: .03, tax: .25, careerYears: 30, discount: .05, ...o });
check("deg cost", deg({}).cost, 116125); check("deg extra y1", deg({}).extraYear1, 7957); check("deg payback", deg({}).payback, 13, 0);
check("deg npv", deg({}).npv, 50255); check("deg 10% payback", deg({ bump: .1 }).payback, 22, 0); check("deg 10% npv", deg({ bump: .1 }).npv, -28841);
check("deg 40% payback", deg({ bump: .4 }).payback, 7, 0); check("deg part-time payback", deg({ kept: 1 }).payback, 5, 0);
check("deg part-time npv", deg({ kept: 1 }).npv, 121004);
// Fri: inflation
check("inf 3%", MC.purchasingPower(10000, .03, 10).value, 7441); check("inf 8%", MC.purchasingPower(10000, .08, 10).value, 4632);
check("inf 20%", MC.purchasingPower(10000, .2, 10).value, 1615); check("half 20%", MC.purchasingPower(1, .2, 1).halfLife * 10, 38);
check("half 8%", MC.purchasingPower(1, .08, 1).halfLife * 10, 90); check("half 3%", MC.purchasingPower(1, .03, 1).halfLife * 10, 234);
check("inf 8% w/5%", MC.purchasingPower(10000, .08, 10, .05).value, 7545);
// Sat: savings goal, doubling, card
check("goal monthly", MC.savingsGoal(20000, 3, .05).monthly, 516); check("goal 0%", MC.savingsGoal(20000, 3, 0).monthly, 556);
check("goal interest", MC.savingsGoal(20000, 3, .05).interest, 1421); check("goal w/5k", MC.savingsGoal(20000, 3, .05, 5000).monthly, 366);
check("double 7% x10", MC.savingsGoal(1, 1, .07).doubling * 10, 99); check("rule72 7% x10", MC.savingsGoal(1, 1, .07).rule72 * 10, 103);
const c200 = MC.cardPayoff(5000, .2, "fixed", 200), c300 = MC.cardPayoff(5000, .2, "fixed", 300);
check("card 200 months", c200.months, 33, 0); check("card 200 interest", c200.interest, 1522);
check("card 300 months", c300.months, 20, 0); check("card 300 interest", c300.interest, 907);
const cmin = MC.cardPayoff(5000, .2, "min"); check("card 5k min months", cmin.months, 226, 0); check("card 5k min interest", cmin.interest, 7317);
// Sun: pet (ASPCA 2021 dog; Money.com/Healthy Paws 2026 average)
const pet = o => MC.petCost({ upfront: 1830, yearly: 1391, years: 12, rise: 0, ret: .07, ...o });
check("pet lifetime", pet({}).lifetime, 18522); check("pet per month", pet({}).perMonth, 129); check("pet invested", pet({}).invested, 30275);
check("pet 3% rise", pet({ rise: .03 }).lifetime, 21571); check("pet 4272", pet({ yearly: 4272 }).lifetime, 53094);
check("pet 4272 invested", pet({ yearly: 4272 }).invested, 84220); check("pet 4272 /mo", pet({ yearly: 4272 }).perMonth, 369);
check("cat lifetime", pet({ upfront: 755, yearly: 1149 }).lifetime, 14543);
// ---- Week 3 ----
// Mon: emergency fund ($2,000/month essentials, $400/month saved at 4%, 7% invested, $3,000 on a 24% card at $150)
const ef = o => MC.emergencyFund({ spend: 2000, months: 6, saved: 0, monthly: 400, cashRate: .04, investReturn: .07, shock: 3000, apr: .24, pay: 150, ...o });
check("ef 6m target", ef({}).target, 12000, 0); check("ef 6m months", ef({}).months, 29, 0); check("ef 3m months", ef({ months: 3 }).months, 15, 0);
check("ef 12m months", ef({ months: 12 }).months, 55, 0); check("ef hold 6m", ef({}).holdYear, 360); check("ef hold 3m", ef({ months: 3 }).holdYear, 180);
check("ef hold 12m", ef({ months: 12 }).holdYear, 720); check("ef 10y gap", ef({}).tenYear, 6226); check("ef card interest", ef({}).cardInterest, 870);
check("ef card months", ef({}).cardMonths, 26, 0); check("ef cash 0% hold", ef({ cashRate: 0 }).holdYear, 840); check("ef saved 1000", ef({ saved: 1000 }).months, 27, 0);
// Tue: $500/month side income, $6,000 debt at 24% with a $200 regular payment, 7% return, 5 years
const sh = o => MC.sideHustle({ side: 500, years: 5, ret: .07, debt: 6000, apr: .24, payment: 200, ...o });
check("sh spend net", sh({}).spend.net, 2850); check("sh debt net", sh({}).debt.net, 40972); check("sh invest net", sh({}).invest.net, 38646);
check("sh debt interest", sh({}).debt.interest, 649); check("sh slow interest", sh({}).invest.interest, 3255);
check("sh debt free", sh({}).debt.free, 10, 0); check("sh slow free", sh({}).invest.free, 47, 0); check("sh earned", sh({}).earned, 30000, 0);
check("sh 8% debt", sh({ apr: .08 }).debt.net, 41575); check("sh 8% invest", sh({ apr: .08 }).invest.net, 41491);
check("sh 5% debt", sh({ apr: .05 }).debt.net, 41677); check("sh 5% invest", sh({ apr: .05 }).invest.net, 41834);
check("sh no debt invest", sh({ debt: 0, payment: 0 }).invest.net, 35796);
// Wed: instalments on a $1,200 item
const ins = o => MC.instalment({ price: 1200, months: 24, apr: .25, fee: 0, late: 0, lateFee: 0, saveRate: 0, ...o });
check("ins payment", ins({}).payment, 64); check("ins total", ins({}).total, 1537); check("ins extra", ins({}).extra, 337);
check("ins extra pct x10", ins({}).extraPct * 1000, 281); check("ins save months", ins({}).saveMonths, 19, 0);
check("ins 36m 30%", ins({ months: 36, apr: .3 }).total, 1834); check("ins 36m 30% pay", ins({ months: 36, apr: .3 }).payment, 51);
check("ins 36% 24m", ins({}).byApr(.36), 1701); check("ins 0% 4 pay", ins({ months: 4, apr: 0 }).payment, 300, 0);
check("ins 0% 2 late", ins({ months: 4, apr: 0, late: 2, lateFee: 10 }).total, 1220, 0); check("ins fee 49", ins({ fee: 49 }).total, 1586);
// Thu: lifestyle creep ($3,000 take-home, 5% raises, $300 saved, half of each raise, 7%)
const lc = o => MC.lifestyleCreep({ pay: 3000, raise: .05, years: 10, save: 300, share: .5, ret: .07, ...o });
check("lc spend all", lc({}).a, 51925); check("lc save half", lc({}).b, 109840); check("lc gap", lc({}).gap, 57914);
check("lc last pay", lc({}).lastPay, 4654); check("lc spend A", lc({}).spendA, 4354); check("lc spend B", lc({}).spendB, 3527); check("lc save B", lc({}).saveB, 1127);
check("lc put in A", lc({}).putA, 36000, 0); check("lc year-1 spending", lc({ years: 1 }).spendA, 2700, 0); check("lc 3% gap", lc({ raise: .03 }).gap, 33005); check("lc 3% B", lc({ raise: .03 }).b, 84931);
check("lc 20y A", lc({ years: 20 }).a, 156278); check("lc 20y B", lc({ years: 20 }).b, 530281); check("lc save all", lc({ share: 1 }).b, 167754);
// Fri: irregular income buffer ($3,000 average, example pattern, 20% tax set aside, $2,200 salary)
const bf = o => MC.incomeBuffer({ avg: 3000, swing: 1, tax: .2, salary: 2200, start: 0, months: 12, ...o });
check("bf steady", bf({}).steady, 2400); check("bf need", bf({}).need, 2080); check("bf short", bf({}).short, 8, 0); check("bf below", bf({}).below, 6, 0);
check("bf low income", Math.min(...bf({}).points.map(p => p.income)), 900); check("bf high income", Math.max(...bf({}).points.map(p => p.income)), 5100);
check("bf start 2080 end", bf({ start: 2080 }).end, 4480); check("bf start 2080 low", bf({ start: 2080 }).low, 0); check("bf start 2080 short", bf({ start: 2080 }).short, 0, 0);
check("bf 2400 need", bf({ salary: 2400 }).need, 2880); check("bf 2400 short", bf({ salary: 2400, start: 2080 }).short, 6, 0);
check("bf 2600 24m end", bf({ salary: 2600, start: 2080, months: 24 }).end, -2720); check("bf swing 50", bf({ swing: .5 }).need, 800); check("bf swing 150", bf({ swing: 1.5 }).need, 3400);
check("bf tax pot", bf({}).taxPot, 7200);
// Sat: currency A loses value vs B (example rates; 10,000 units of B, 5 years, A 10%, B 3%, 2% each way)
const cs = o => MC.currencySavings({ amount: 10000, years: 5, dep: .2, aRate: .1, bRate: .03, cost: .02, ...o });
check("cs A 20%", cs({}).a, 5277); check("cs B", cs({}).b, 11134); check("cs real x1000", cs({}).real * 1000, -120); check("cs breakeven x1000", cs({}).breakEven * 1000, 287);
check("cs A 0%", cs({ dep: 0 }).a, 16105); check("cs A 5%", cs({ dep: .05 }).a, 12462); check("cs A 10%", cs({ dep: .1 }).a, 9510); check("cs be 10% x1000", cs({ dep: .1 }).breakEven * 1000, 144);
check("cs A 30%", cs({ dep: .3 }).a, 2707); check("cs A at 25% interest", cs({ aRate: .25 }).a, 10000); check("cs 10y A", cs({ years: 10 }).a, 2785); check("cs 10y B", cs({ years: 10 }).b, 12907);
// Sun: wedding ($34,000 = The Knot 2026 Real Weddings Study, US 2025 average; $8,000 smaller wedding example)
const wd = o => MC.weddingCost({ big: 34000, small: 8000, years: 10, ret: .07, borrowed: 0, apr: .15, loanMonths: 36, ...o });
check("wd diff", wd({}).diff, 26000, 0); check("wd 10y", wd({}).invested, 52251); check("wd 20y", wd({ years: 20 }).invested, 105007); check("wd 30y", wd({ years: 30 }).invested, 211029);
check("wd 5%", wd({ ret: .05 }).invested, 42822); check("wd loan pay", wd({ borrowed: 10000 }).loanPay, 347); check("wd loan interest", wd({ borrowed: 10000 }).interest, 2480);
check("wd true cost", wd({ borrowed: 10000 }).trueCost, 36480); check("wd borrow invested", wd({ borrowed: 10000 }).invested, 54717); check("wd 15k", wd({ small: 15000 }).invested, 38184);
// ---- Week 4 ----
// Mon: rent on $3,000 take-home, $1,500 everything else, 20% saving goal, invested 5 years at 7%
const ra = o => MC.rentAfford({ pay: 3000, share: .3, other: 1500, target: .2, years: 5, ret: .07, ...o });
check("ra rent 30%", ra({}).rent, 900, 0); check("ra left 30%", ra({}).left, 600, 0); check("ra rate x100", ra({}).rate * 100, 20, 0); check("ra invested", ra({}).invested, 42956);
check("ra 40% rent", ra({ share: .4 }).rent, 1200, 0); check("ra 40% left", ra({ share: .4 }).left, 300, 0); check("ra 40% invested", ra({ share: .4 }).invested, 21478);
check("ra 50% left", ra({ share: .5 }).left, 0, 0); check("ra 25% left", ra({}).shares[0].left, 750, 0); check("ra 35% left", ra({}).shares[2].left, 450, 0);
check("ra max rent 20%", ra({}).maxRent, 900, 0); check("ra max rent 10%", ra({ target: .1 }).maxRent, 1200, 0); check("ra other 1800", ra({ other: 1800 }).left, 300, 0);
// Tue: FIRE ($4,000 take-home, 25% saved, 5% real return, 4% withdrawal)
const fi = o => MC.fireNumber({ pay: 4000, rate: .25, saved: 0, ret: .05, wr: .04, ...o });
check("fi target", fi({}).target, 900000, 0); check("fi save", fi({}).save, 1000, 0); check("fi spend", fi({}).spend, 3000, 0); check("fi months", fi({}).months, 375, 0);
check("fi 50% target", fi({ rate: .5 }).target, 600000, 0); check("fi 50% months", fi({ rate: .5 }).months, 196, 0); check("fi 10% years x10", fi({}).byRate[0].years * 10, 503);
check("fi 20% years", fi({}).byRate[1].years, 36); check("fi 30% years", fi({}).byRate[2].years, 27); check("fi 50% years", fi({}).byRate[4].years, 16);
check("fi saved 20k months", fi({ saved: 20000 }).months, 356, 0); check("fi 3% months", fi({ ret: .03 }).months, 473, 0); check("fi 3.5% wr", fi({ wr: .035 }).target, 1028571);
// Wed: $8 a day, 7 days a week, 20 years, 7%
const hb = o => MC.dailyHabit({ daily: 8, days: 7, years: 20, ret: .07, rise: 0, ...o });
check("hb per year", hb({}).perYear, 2920, 0); check("hb spent", hb({}).spent, 58400); check("hb invested", hb({}).invested, 126759); check("hb growth", hb({}).growth, 68359);
check("hb 5 days spent", hb({ days: 5 }).spent, 41714); check("hb 5 days inv", hb({ days: 5 }).invested, 90542); check("hb rise 3% spent", hb({ rise: .03 }).spent, 78461);
check("hb rise 3% inv", hb({ rise: .03 }).invested, 159199); check("hb 30y spent", hb({ years: 30 }).spent, 87600); check("hb 30y inv", hb({ years: 30 }).invested, 296860); check("hb 5%", hb({ ret: .05 }).invested, 100018);
// Thu: $50,000 education goal at 18, birth vs age 8, 6%
const ed = o => MC.educationFund({ target: 50000, startA: 0, startB: 8, endAge: 18, ret: .06, ...o });
check("ed birth", ed({}).a.monthly, 129); check("ed age 8", ed({}).b.monthly, 305); check("ed put birth", ed({}).a.put, 27882); check("ed put 8", ed({}).b.put, 36612);
check("ed growth birth", ed({}).a.growth, 22118); check("ed growth 8", ed({}).b.growth, 13388); check("ed late w/ early", ed({}).lateWithEarly, 21154); check("ed age 13", ed({ startB: 13 }).b.monthly, 717);
check("ed 20k birth", ed({ target: 20000 }).a.monthly, 52); check("ed 20k 8", ed({ target: 20000 }).b.monthly, 122); check("ed 4% birth", ed({ ret: .04 }).a.monthly, 158); check("ed 4% 8", ed({ ret: .04 }).b.monthly, 340);
// Fri: break-even ($2,000 fixed, $25 price, $10 per sale, 200 sales, $5,000 start-up)
const be = o => MC.breakEven({ fixed: 2000, price: 25, unit: 10, sales: 200, startup: 5000, ...o });
check("be margin", be({}).margin, 15, 0); check("be units", be({}).units, 134, 0); check("be profit", be({}).profit, 1000, 0); check("be payback", be({}).payback, 5, 0);
check("be $30 units", be({ price: 30 }).units, 100, 0); check("be $30 profit", be({ price: 30 }).profit, 2000, 0); check("be $30 payback", be({ price: 30 }).payback, 3, 0);
check("be $12 units", be({ unit: 12 }).units, 154, 0); check("be $12 profit", be({ unit: 12 }).profit, 600, 0); check("be $12 payback", be({ unit: 12 }).payback, 9, 0);
check("be 150 profit", be({ sales: 150 }).profit, 250, 0); check("be 150 payback", be({ sales: 150 }).payback, 20, 0);
// Sat: holiday spending on a card ($1,500 at 24%, min = interest + 1%, $150 fixed, 3 months); $890 = NRF 2025 survey average ($890.49), rounded down
const hc = o => MC.holidayCard({ spend: 1500, apr: .24, fixed: 150, clearMonths: 3, ...o });
check("hc min months", hc({}).min.months, 114, 0); check("hc min interest", hc({}).min.interest, 1887); check("hc min total", hc({}).minTotal, 3387); check("hc first min", hc({}).firstMin, 45, 0);
check("hc fixed months", hc({}).fixed.months, 12, 0); check("hc fixed interest", hc({}).fixed.interest, 191); check("hc clear pay", hc({}).clearPay, 520); check("hc clear interest", hc({}).clearInterest, 60);
check("hc save monthly", hc({}).saveMonthly, 125, 0); check("hc 890 months", hc({ spend: 890 }).min.months, 63, 0); check("hc 890 interest", hc({ spend: 890 }).min.interest, 667);
check("hc 30% months", hc({ apr: .3 }).min.months, 125, 0); check("hc 30% interest", hc({ apr: .3 }).min.interest, 2518);
// Sun: real hourly wage ($3,000 take-home, 40 h x 48 weeks, 1.5 h commute x 5 days, 2.5 h extra, $300 costs)
const rw = o => MC.realWage({ pay: 3000, hours: 40, weeks: 48, commute: 1.5, days: 5, extra: 2.5, costs: 300, ...o });
check("rw paper x100", rw({}).paper * 100, 1875, 0.5); check("rw real x100", rw({}).real * 100, 1350, 0.5); check("rw drop x100", rw({}).drop * 100, 28);
check("rw commute hours", rw({}).commuteHours, 360, 0); check("rw costs year", rw({}).costsYear, 3600, 0); check("rw $5 minutes", rw({}).minutes(5), 22);
check("rw remote x100", rw({ commute: 0, costs: 100 }).real * 100, 1706, 0.5); check("rw 2h x100", rw({ commute: 2 }).real * 100, 1286, 0.5);
check("rw 2 days x100", rw({ days: 2, costs: 150 }).real * 100, 1566, 0.5);
console.log(failed ? `${failed} FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
