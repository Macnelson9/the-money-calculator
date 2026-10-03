// Checks the calculators reproduce the numbers used in the week 1 and week 2 scripts.
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
console.log(failed ? `${failed} FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
