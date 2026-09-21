"""Print edit-modal form values from a DOM snapshot for the update diagnosis.

usage: python3 p3b_extract_dom.py /abs/path/dom.html
"""

import re
import sys

html = open(sys.argv[1], encoding="utf-8").read()

for needle in ("edit-time-trigger", "Start Time", "Duration"):
    idx = html.find(needle)
    if idx < 0:
        print("== %s: NOT FOUND" % needle)
        continue
    snippet = html[max(0, idx - 150) : idx + 400]
    print("== %s context ==" % needle)
    print(re.sub(r"\s+", " ", snippet)[:600])
    print()

for match in re.finditer(r"<select[^>]*>.*?</select>", html, re.S):
    select = match.group(0)
    if "duration" in select.lower() or re.search(r">\s*(15|30|45|60)\s*min", select, re.I):
        print("== duration select ==")
        print(re.sub(r"\s+", " ", select)[:500])
        print()

print("duration_tokens:", {"15 min": html.count("15 min"), "30 min": html.count("30 min"), "45 min": html.count("45 min"), "60 min": html.count("60 min")})
print("has_Update_failed:", "Update failed" in html)
print("has_Appointment_updated:", "Appointment updated!" in html)
