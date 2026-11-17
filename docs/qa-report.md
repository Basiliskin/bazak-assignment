# QA report

<!-- eval:start -->
## Live eval

`npm run eval` · model `gpt-6-luna` · real DummyJSON Catalog · 2026-11-17 15:42 · **6/6 cases passed**

Rules: R1 real Products · R2 Assumption + question · R3 off-catalog reported · R4 one group per intent · R5 follow-up cheaper · R6 price limit · R7 ≤ 4 cards · R9 in stock · reply has text.

| Case | Request | Groups | Checks | Time |
|---|---|---|---|---|
| plain | show me smartphones | Smartphones (4 of 15) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R4 | 3.5 s |
| price | a phone under $500 | Phones under $500 (4 of 12) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R4 · ✅ R6 | 4.0 s |
| ambiguous | something cheap and cool | Affordable picks (4 of 190) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R2 | 7.5 s |
| off-catalog | a flight to Tokyo | Travel bags for a Tokyo trip (0 of 0) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R3 | 7.2 s |
| multi-intent | a phone under $500 and a lipstick | Phones under $500 (4 of 12); Lipsticks (1 of 1) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R4 · ✅ R6 | 4.2 s |
| follow-up | show me men's watches, most expensive first → show me cheaper ones | Men's watches — cheaper than $8,999.98 (2 of 2) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R4 · ✅ R5 | 8.7 s |

No failures.
<!-- eval:end -->
