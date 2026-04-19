"""
End-to-end test + debug for Issue Files.
Tests load, normalize, and reconciliation with timing and result validation.

Usage:
    python test_issue_files.py
"""
import sys
import time
import traceback
from collections import Counter

sys.path.insert(0, __file__.rsplit("\\", 1)[0])

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(message)s",
    datefmt="%H:%M:%S",
)

FILE_A = r"Issue Files\ICICI 27741 - Books.xlsx"
FILE_B = r"Issue Files\ICICI 27741 - Bank Statement .xlsx"
MAX_ALLOWED_SECONDS = 60

PASS = "\u2705"
FAIL = "\u274c"
WARN = "\u26a0\ufe0f"


def section(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print('=' * 60)


def assert_ok(condition, msg):
    if not condition:
        print(f"{FAIL}  ASSERTION FAILED: {msg}")
        sys.exit(1)
    print(f"{PASS}  {msg}")


def main():
    from reconciliation.config import ReconciliationConfig
    from reconciliation.normalizer import DataNormalizer
    from reconciliation.matcher import ReconciliationEngine

    config = ReconciliationConfig()
    norm = DataNormalizer(config)
    engine = ReconciliationEngine(config)

    # ── Step 1: Load & Normalize ──────────────────────────────
    section("STEP 1 — Load & Normalize")

    results = {}
    for label, path in [("A", FILE_A), ("B", FILE_B)]:
        t0 = time.time()
        try:
            df_raw = norm.load_file(path)
            elapsed_load = time.time() - t0
            print(f"[{label}] load_file:   {len(df_raw):,} rows  |  "
                  f"cols: {list(df_raw.columns)}  |  {elapsed_load:.2f}s")

            t1 = time.time()
            df_norm = norm.normalize(df_raw, company_label=label)
            elapsed_norm = time.time() - t1
            print(f"[{label}] normalize:   {len(df_norm):,} rows  |  {elapsed_norm:.2f}s")

            if len(df_norm) > 0:
                date_min = df_norm['transaction_date'].min()
                date_max = df_norm['transaction_date'].max()
                debit_sum = df_norm['debit_amount'].sum()
                credit_sum = df_norm['credit_amount'].sum()
                print(f"[{label}] date range: {date_min.date()} → {date_max.date()}")
                print(f"[{label}] totals:     debit={debit_sum:,.2f}  credit={credit_sum:,.2f}")
                print(f"[{label}] sample rows:")
                print(df_norm[['transaction_date', 'debit_amount', 'credit_amount',
                               'description']].head(3).to_string(index=False))

            assert_ok(len(df_norm) > 0,
                      f"Company {label} normalized to {len(df_norm)} rows (must be > 0)")
            results[label] = df_norm

        except Exception as exc:
            print(f"{FAIL}  Company {label} failed: {exc}")
            traceback.print_exc()
            sys.exit(1)

    df_a, df_b = results["A"], results["B"]

    # ── Step 2: Timed Reconciliation ──────────────────────────
    section("STEP 2 — Timed Reconciliation")
    print(f"Running reconcile({len(df_a):,} A rows  ×  {len(df_b):,} B rows) ...")

    t0 = time.time()
    try:
        rec = engine.reconcile(df_a, df_b)
    except Exception as exc:
        print(f"{FAIL}  reconcile() raised: {exc}")
        traceback.print_exc()
        sys.exit(1)

    elapsed = time.time() - t0
    print(f"Completed in {elapsed:.2f}s")
    assert_ok(elapsed <= MAX_ALLOWED_SECONDS,
              f"Elapsed {elapsed:.1f}s ≤ {MAX_ALLOWED_SECONDS}s limit")

    # ── Step 3: Result Validation ─────────────────────────────
    section("STEP 3 — Results")

    matched    = rec.get("matched", [])
    exceptions = rec.get("exceptions", [])
    duplicates = rec.get("duplicates", [])
    summary    = rec.get("summary", {})

    # Summary table
    print("\n--- Summary ---")
    for k, v in summary.items():
        print(f"  {k}: {v}")

    # Match breakdown by type
    print("\n--- Matches by Type ---")
    by_type = Counter(m['Match_Type'] for m in matched)
    for mt, cnt in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {mt}: {cnt}")

    # Match breakdown by layer
    print("\n--- Matches by Layer ---")
    by_layer = Counter(m['Matching_Layer'] for m in matched)
    for layer, cnt in sorted(by_layer.items()):
        print(f"  {layer}: {cnt}")

    # Exception breakdown
    print("\n--- Exceptions by Category ---")
    by_cat = Counter(e['Category'] for e in exceptions)
    for cat, cnt in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {cnt}")

    # Top matched rows
    if matched:
        print("\n--- Top 10 Matched Rows ---")
        for m in matched[:10]:
            print(f"  [{m['Matching_Layer']}] "
                  f"A:{m['A_Date']} {m['A_Debit'] or m['A_Credit']:>12,.2f}  ↔  "
                  f"B:{m['B_Date']} {m['B_Debit'] or m['B_Credit']:>12,.2f}  "
                  f"conf={m['Confidence_Score']:.0f}%  diff={m['Amount_Difference']:.2f}")

    # Top unmatched A
    unmatched_a = [e for e in exceptions if e['Company'] == 'A']
    unmatched_b = [e for e in exceptions if e['Company'] == 'B']
    if unmatched_a:
        print(f"\n--- Top 10 Unmatched Company A (of {len(unmatched_a)}) ---")
        for e in unmatched_a[:10]:
            print(f"  {e['Transaction_Date'][:10]}  {e['Net_Amount']:>12,.2f}  "
                  f"{e['Description'][:60]}")

    if unmatched_b:
        print(f"\n--- Top 10 Unmatched Company B (of {len(unmatched_b)}) ---")
        for e in unmatched_b[:10]:
            print(f"  {e['Transaction_Date'][:10]}  {e['Net_Amount']:>12,.2f}  "
                  f"{e['Description'][:60]}")

    if duplicates:
        print(f"\n{WARN}  Duplicates detected: {len(duplicates)} "
              f"({Counter(d['Company'] for d in duplicates)})")

    # ── Step 4: Final Assertions ──────────────────────────────
    section("STEP 4 — Assertions")
    assert_ok('summary' in rec,          "Result contains 'summary'")
    assert_ok('matched' in rec,          "Result contains 'matched'")
    assert_ok('exceptions' in rec,       "Result contains 'exceptions'")
    ma = summary.get('Match Rate A (%)', 0)
    mb = summary.get('Match Rate B (%)', 0)
    print(f"  Match rate  A={ma}%  B={mb}%")

    section("ALL CHECKS PASSED")
    print(f"  Total time: {elapsed:.2f}s  |  "
          f"Matches: {len(matched)}  |  Exceptions: {len(exceptions)}")


if __name__ == "__main__":
    main()
