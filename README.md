# The Money Calculator website

Calculators used on screen in the channel's videos (10 from week 1, 7 from week 2, 7 from week 3, 7 from week 4). Plain HTML/JS, no build step, works offline (Chart.js 4.4.1 is bundled as `chart.umd.js`, MIT licence).

| Tab (link with `#id`) | Video |
|---|---|
| `#start-early` | Mon: $200/month at 25 vs 35 |
| `#card` | Mon Short B: minimum payment trap |
| `#rent-buy` | Tue: rent vs buy |
| `#debt-invest` | Wed: debt or invest |
| `#ten-k` | Thu: first $10,000 |
| `#car` | Fri: car affordability |
| `#loan` | Sat: student loan payoff |
| `#fees` | Sat: 1% fund fee |
| `#raise` | Sat: raise and tax brackets |
| `#budget` | Sun: 50/30/20 |
| `#tax-timing` | W2 Mon: pay tax now or later |
| `#backtest` | W2 Tue: $100/month since 2000 (S&P 500 data, Damodaran, Jan 2026) |
| `#withdraw` | W2 Wed: how long $1M lasts |
| `#degree` | W2 Thu: master's degree ROI |
| `#inflation` | W2 Fri: inflation and savings |
| `#goal` | W2 Sat: savings goal and doubling time |
| `#pet` | W2 Sun: lifetime pet cost (ASPCA 2021) |
| `#emergency` | W3 Mon: how big an emergency fund should be |
| `#side-hustle` | W3 Tue: $500/month extra: spend, pay debt or invest |
| `#instalments` | W3 Wed: instalments / pay later vs cash |
| `#creep` | W3 Thu: lifestyle creep, spend every raise vs save half |
| `#buffer` | W3 Fri: irregular income, steady salary from a buffer |
| `#currency` | W3 Sat: saving in a currency that loses value (example rates only) |
| `#wedding` | W3 Sun: big wedding vs investing the difference (The Knot 2026 study, US) |
| `#rent` | W4 Mon: how much rent you can afford on your take-home pay |
| `#fire` | W4 Tue: your FIRE number and years to reach it by saving rate |
| `#habit` | W4 Wed: a daily habit ($8/day) over 20 years, spent vs invested |
| `#education` | W4 Thu: saving for a child's education, from birth vs age 8 |
| `#break-even` | W4 Fri: small business break-even point |
| `#holiday` | W4 Sat: holiday shopping on a credit card at the minimum (NRF 2025 survey, US) |
| `#real-wage` | W4 Sun: real hourly wage after commute and work costs |

## Use it
- Record: open `index.html` in a browser, full screen, change inputs live.
- Check: `node test.js` confirms the calculators reproduce every number in the week 1, 2, 3 and 4 scripts.
- Host free (needs Uche's account): drag the folder into Netlify Drop, or push to a GitHub repo and turn on GitHub Pages. Then put the link in every description.

## Still to add
- Email signup: replace the `#signup` link in `index.html` with the form code from your email provider.
- Affiliate links on the relevant calculators once programs approve you.
