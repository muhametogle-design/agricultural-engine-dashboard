from __future__ import annotations

import csv
import io
import uuid
from datetime import UTC, datetime

from app.services.irrigation_exports import advisory_to_csv, advisory_to_ical


def saved_advisory(*, irrigate: bool = True) -> dict:
    action = "irrigate" if irrigate else "monitor"
    return {
        "advisory_id": uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        "field_id": uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        "generated_at": datetime(2026, 8, 14, 9, 30, tzinfo=UTC),
        "crop": "pearl_millet",
        "growth_stage": "mid_season",
        "schedule": [
            {
                "date": "2026-08-15",
                "action": action,
                "precipitation_mm": 0.2,
                "precipitation_probability_pct": 10,
                "et0_mm": 5.5,
                "crop_et_mm": 5.5,
                "effective_rain_mm": 0.16,
                "projected_depletion_mm": 21.0,
                "gross_irrigation_mm": 24.7 if irrigate else 0,
                "irrigation_volume_m3": 1185.6 if irrigate else 0,
                "pump_hours": 11.9 if irrigate else None,
                "ending_depletion_mm": 0 if irrigate else 21.0,
                "risk_flags": ["high_wind"],
            }
        ],
        "source": {"retrieved_at": "2026-08-14T09:29:00Z"},
    }


def test_csv_export_has_stable_columns_and_values():
    text = advisory_to_csv(saved_advisory())
    rows = list(csv.DictReader(io.StringIO(text)))
    assert len(rows) == 1
    assert rows[0]["crop"] == "pearl_millet"
    assert rows[0]["gross_irrigation_mm"] == "24.7"
    assert rows[0]["risk_flags"] == "high_wind"
    assert rows[0]["advisory_id"] == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


def test_csv_export_neutralizes_spreadsheet_formulas():
    advisory = saved_advisory()
    advisory["crop"] = '=HYPERLINK("https://example.invalid")'
    row = next(csv.DictReader(io.StringIO(advisory_to_csv(advisory))))
    assert row["crop"].startswith("'=")


def test_ical_export_contains_all_day_irrigation_event():
    text = advisory_to_ical(saved_advisory())
    assert text.startswith("BEGIN:VCALENDAR\r\n")
    assert "BEGIN:VEVENT\r\n" in text
    assert "DTSTART;VALUE=DATE:20260815" in text
    assert "DTEND;VALUE=DATE:20260816" in text
    assert "SUMMARY:Irrigate pearl millet - 1185.6 m3" in text
    assert "estimated pump runtime: 11.9 hours" in text.replace("\r\n ", "")
    assert text.endswith("END:VCALENDAR\r\n")


def test_ical_folding_respects_75_utf8_octet_limit():
    advisory = saved_advisory()
    advisory["crop"] = "beer🌱" * 20
    lines = advisory_to_ical(advisory).split("\r\n")
    assert all(len(line.encode("utf-8")) <= 75 for line in lines)
    assert any(line.startswith(" ") for line in lines)


def test_ical_export_marks_no_irrigation_window_without_fake_event():
    text = advisory_to_ical(saved_advisory(irrigate=False))
    assert "BEGIN:VEVENT" not in text
    assert "X-AGRI-DSS-NO-IRRIGATION:TRUE" in text
