// Checks the calculators reproduce the numbers used in the week 1 scripts.
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
// Sunday
const b = MC.budget(4000, .5, .3, .2, .07);
check("save 10y", b.in10, 138468); check("save 30y", b.in30, 975977);
console.log(failed ? `${failed} FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
