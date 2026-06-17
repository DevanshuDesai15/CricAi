"""
Retrain the team match classifier and promote if accuracy improves.

Usage:
  python retrain.py                   # retrain and promote if better
  python retrain.py --dry-run         # report only, no artifact changes
  python retrain.py --force           # promote even if accuracy doesn't improve
  python retrain.py --league-id ipl   # target league (default: ipl)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from ml.feature_engineering import create_supabase_client, fetch_all_rows
from ml.team_predict import (
    load_metadata,
    save_artifacts,
    train_and_evaluate,
)


def bump_version(version: str) -> str:
    m = re.match(r"^(.*-v)(\d+)$", version)
    if m:
        return f"{m.group(1)}{int(m.group(2)) + 1}"
    return f"{version}-v2"


def get_live_accuracy(model_version: str) -> dict | None:
    supabase = create_supabase_client()
    rows = fetch_all_rows(
        supabase.table("team_match_prediction_audits")
        .select("was_correct")
        .eq("model_version", model_version)
        .not_.is_("resolved_at", "null")
    )
    if not rows:
        return None
    correct = sum(1 for r in rows if r["was_correct"])
    return {
        "total": len(rows),
        "correct": correct,
        "accuracy": round(correct / len(rows), 4),
    }


def retrain_and_promote(
    league_id: str = "ipl",
    dry_run: bool = False,
    force: bool = False,
) -> dict:
    current_metadata = load_metadata()
    current_version = current_metadata["model_version"]
    current_accuracy = current_metadata["metrics"]["accuracy"]
    current_log_loss = current_metadata["metrics"]["log_loss"]

    print(f"Current model : {current_version}")
    print(f"  test accuracy : {current_accuracy}")
    print(f"  test log_loss : {current_log_loss}")
    print(f"  trained on    : {current_metadata['fit_rows']} rows")

    live = get_live_accuracy(current_version)
    if live:
        print(f"  live accuracy : {live['accuracy']} ({live['correct']}/{live['total']} predictions)")
    else:
        print("  live accuracy : no resolved predictions yet")

    print("\nRetraining on latest data...")
    result = train_and_evaluate(league_id)
    new_accuracy = result["metrics"]["accuracy"]
    new_log_loss = result["metrics"]["log_loss"]
    new_version = bump_version(current_version)

    print(f"\nNew model      : {new_version}")
    print(f"  test accuracy : {new_accuracy}  (delta: {new_accuracy - current_accuracy:+.4f})")
    print(f"  test log_loss : {new_log_loss}  (delta: {new_log_loss - current_log_loss:+.4f})")
    print(f"  trained on    : {result['fit_rows']} rows")

    improved = new_accuracy > current_accuracy
    should_promote = (improved or force) and not dry_run

    if dry_run:
        print("\n[dry-run] no artifacts written")
    elif should_promote:
        save_artifacts(result, version=new_version)
        print(f"\n✓ Promoted → {new_version}")
        if not improved and force:
            print("  (forced — accuracy did not improve)")
    else:
        print(f"\n✗ Not promoted — new accuracy ({new_accuracy}) <= current ({current_accuracy})")
        print("  Use --force to promote anyway")

    return {
        "current_version": current_version,
        "new_version": new_version,
        "current_accuracy": current_accuracy,
        "new_accuracy": new_accuracy,
        "current_log_loss": current_log_loss,
        "new_log_loss": new_log_loss,
        "live_accuracy": live,
        "improved": improved,
        "promoted": should_promote,
        "dry_run": dry_run,
    }


def main():
    parser = argparse.ArgumentParser(description="Retrain team match classifier")
    parser.add_argument("--dry-run", action="store_true", help="Report only, no artifact changes")
    parser.add_argument("--force", action="store_true", help="Promote even if accuracy does not improve")
    parser.add_argument("--league-id", default="ipl")
    parser.add_argument("--json", action="store_true", help="Output result as JSON")
    args = parser.parse_args()

    report = retrain_and_promote(
        league_id=args.league_id,
        dry_run=args.dry_run,
        force=args.force,
    )

    if args.json:
        report_out = {k: v for k, v in report.items() if k != "live_accuracy"}
        report_out["live_accuracy"] = report["live_accuracy"]
        print(json.dumps(report_out, indent=2))


if __name__ == "__main__":
    main()
