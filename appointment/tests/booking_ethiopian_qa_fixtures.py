"""Browser QA values for qa/manifests/growth/booking-ethiopian.yaml: today's date in the Ethiopian calendar.

No records: the manifest reads the showcases and books nothing, so there is no setup or cleanup. The values
come from the Python twin (`appointment.growth.ethiopian_calendar`), so the browser run checks the SPA's
calendar against the same conversion as the shared vectors.
"""

from appointment.growth import ethiopian_calendar as calendar

NEXT_MONTH = '[data-qa="booking-month-next"]'
# A click on the month name does nothing; it fills the steps that are not needed to reach Pagume.
STAY = '[data-qa="booking-month"]'


def browser_values(manifest=None):
    today = calendar.today_in_addis()
    local = calendar.to_ethiopian(today)
    year, month, day = local.year, local.month, local.day
    steps = 0 if month == 13 else 13 - month
    pagume_days = calendar.days_in_month(year, 13)
    pagume_last = calendar.to_gregorian(year, 13, pagume_days)
    values = {
        "qa_eth_today": today.isoformat(),
        "qa_eth_day": str(day),
        "qa_eth_month": f"{year}-{month}",
        "qa_eth_label_en": f"{calendar.weekday(today, 'en')}, {calendar.MONTHS[month - 1][1]} {day}, {year}",
        "qa_eth_label_am": f"{calendar.weekday(today, 'am')}፣ {calendar.MONTHS[month - 1][0]} {day} ቀን {year}",
        "qa_eth_month_en": f"{calendar.MONTHS[month - 1][1]} {year}",
        "qa_eth_month_am": f"{calendar.MONTHS[month - 1][0]} {year}",
        "qa_eth_pagume": f"{year}-13",
        "qa_eth_pagume_days": str(pagume_days),
        "qa_eth_pagume_last": pagume_last.isoformat(),
    }
    for index in range(1, 13):
        values[f"qa_eth_step_{index}"] = NEXT_MONTH if index <= steps else STAY
    return values
