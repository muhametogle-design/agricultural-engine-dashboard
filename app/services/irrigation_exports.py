"""Portable exports for persisted irrigation schedules."""

from __future__ import annotations

import csv
import io
from datetime import UTC, date, datetime, timedelta
from typing import Any

CSV_COLUMNS = (
    "advisory_id",
    "field_id",
    "crop",
    "growth_stage",
    "date",
    "action",
    "precipitation_mm",
    "precipitation_probability_pct",
    "et0_mm",
    "crop_et_mm",
    "effective_rain_mm",
    "projected_depletion_mm",
    "gross_irrigation_mm",
    "irrigation_volume_m3",
    "pump_hours",
    "ending_depletion_mm",
    "risk_flags",
)


def _csv_safe(value: Any) -> Any:
    """Prevent spreadsheet formula execution for operator-controlled labels."""
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def advisory_to_csv(advisory: dict[str, Any]) -> str:
    """Render one row per forecast day with stable, machine-readable columns."""
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=CSV_COLUMNS, lineterminator="\r\n")
    writer.writeheader()
    common = {
        "advisory_id": advisory.get("advisory_id") or "",
        "field_id": advisory.get("field_id") or "",
        "crop": advisory.get("crop") or "",
        "growth_stage": advisory.get("growth_stage") or "",
    }
    for day in advisory.get("schedule", []):
        row = {
            **common,
            **{key: day.get(key) for key in CSV_COLUMNS if key in day},
            "risk_flags": ";".join(day.get("risk_flags") or []),
        }
        writer.writerow({key: _csv_safe(value) for key, value in row.items()})
    return stream.getvalue()


def _ical_escape(value: Any) -> str:
    return str(value).replace("\\", "\\\\").replace("\n", "\\n").replace(";", "\\;").replace(",", "\\,")


def _fold_ical_line(line: str, width: int = 75) -> list[str]:
    """RFC-5545 continuation folding without splitting UTF-8 characters."""
    if len(line.encode("utf-8")) <= width:
        return [line]
    parts: list[str] = []
    remainder = line
    continuation = False
    while remainder:
        prefix = " " if continuation else ""
        budget = width - len(prefix.encode("utf-8"))
        used = 0
        count = 0
        for char in remainder:
            char_bytes = len(char.encode("utf-8"))
            if used + char_bytes > budget:
                break
            used += char_bytes
            count += 1
        parts.append(prefix + remainder[:count])
        remainder = remainder[count:]
        continuation = True
    return parts


def _utc_stamp(raw: Any) -> str:
    if isinstance(raw, datetime):
        value = raw
    elif raw:
        value = datetime.fromisoformat(str(raw))
    else:
        value = datetime.now(UTC)
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def advisory_to_ical(advisory: dict[str, Any]) -> str:
    """Render irrigation events as all-day RFC-5545 VEVENT entries."""
    advisory_id = str(advisory.get("advisory_id") or "unsaved")
    crop = str(advisory.get("crop") or "crop").replace("_", " ")
    stage = str(advisory.get("growth_stage") or "unknown").replace("_", " ")
    stamp = _utc_stamp(advisory.get("generated_at") or advisory.get("source", {}).get("retrieved_at"))
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "PRODID:-//Agri-DSS//Irrigation Advisory//EN",
        f"X-WR-CALNAME:{_ical_escape(f'Agri-DSS - {crop} irrigation')}",
    ]

    event_count = 0
    for item in advisory.get("schedule", []):
        if item.get("action") != "irrigate":
            continue
        event_day = date.fromisoformat(str(item["date"]))
        next_day = event_day + timedelta(days=1)
        volume = float(item.get("irrigation_volume_m3") or 0)
        gross = float(item.get("gross_irrigation_mm") or 0)
        pump_hours = item.get("pump_hours")
        description = f"Apply {gross:.1f} mm ({volume:.1f} m3) to {crop}; stage: {stage}"
        if pump_hours is not None:
            description += f"; estimated pump runtime: {float(pump_hours):.1f} hours"
        risks = item.get("risk_flags") or []
        if risks:
            description += f"; forecast flags: {', '.join(risks)}"
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{advisory_id}-{event_day.isoformat()}@agri-dss",
                f"DTSTAMP:{stamp}",
                f"DTSTART;VALUE=DATE:{event_day.strftime('%Y%m%d')}",
                f"DTEND;VALUE=DATE:{next_day.strftime('%Y%m%d')}",
                f"SUMMARY:{_ical_escape(f'Irrigate {crop} - {volume:.1f} m3')}",
                f"DESCRIPTION:{_ical_escape(description)}",
                "TRANSP:TRANSPARENT",
                "END:VEVENT",
            ]
        )
        event_count += 1

    if event_count == 0:
        lines.append("X-AGRI-DSS-NO-IRRIGATION:TRUE")
    lines.append("END:VCALENDAR")
    folded = [part for line in lines for part in _fold_ical_line(line)]
    return "\r\n".join(folded) + "\r\n"
