from datetime import datetime, timedelta

import pytz
from dateutil import parser
from frappe.utils import convert_utc_to_system_timezone, get_datetime_str
from frappe.utils.data import get_date_str, get_system_timezone

weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


def get_today_min_max_time(date: datetime):
    """Retrieve the current day's start and end time in UTC format.

    Args:
    date (datetime): date

    Returns:
    list: Date start and end time
    """
    time_min = datetime(date.year, date.month, date.day, 0, 0, 0)
    time_max = datetime(date.year, date.month, date.day, 23, 59, 59)

    time_min_str = time_min.isoformat() + "Z"
    time_max_str = time_max.isoformat() + "Z"

    return [time_max_str, time_min_str]


def get_utc_datatime_with_time(date: datetime, time: str) -> datetime:
    """Function to generate a datetime object for a given date and time.

    Args:
    date (datetime): Date
    time (str): Time

    Returns:
    datetime: Updated datetime object
    """
    system_timezone = pytz.timezone(get_system_timezone())
    local_datetime = system_timezone.localize(datetime.strptime(f"{get_date_str(date)} {time}", "%Y-%m-%d %H:%M:%S"))
    return local_datetime.astimezone(pytz.utc)


def convert_timezone_to_utc(date_time: str, time_zone: str) -> datetime:
    """Helper function to convert a given datetime string to a datetime object with the specified time zone.

    Args:
    date_time (str): Datetime string
    time_zone (str): Time zone

    Returns:
    datetime: Datetime object
    """
    local_datetime = parser.parse(date_time).astimezone(pytz.timezone(time_zone))
    return local_datetime.astimezone(pytz.utc)


def convert_datetime_to_utc(date_time: datetime) -> datetime:
    """Converts the given datetime object to a UTC timezone datetime object.

    Args:
    date_time (datetime): Datetime Object

    Returns:
    datetime: Updated Object
    """
    system_timezone = pytz.timezone(get_system_timezone())
    local_datetime = system_timezone.localize(date_time)
    return local_datetime.astimezone(pytz.utc)


def convert_utc_datetime_to_timezone(date_time: datetime, timezone: str) -> datetime:
    """Converts the given datetime object to a UTC timezone datetime object."""
    return date_time.astimezone(pytz.timezone(timezone))


def get_weekday(date_time: datetime) -> str:
    date = date_time.date()
    return weekdays[date.weekday()]


def utc_to_sys_time(time: str) -> str:
    return get_datetime_str(convert_utc_to_system_timezone(datetime.fromisoformat(time).replace(tzinfo=None)))


def utc_to_given_time_zone(utc_datetime: datetime, time_zone_offset: str) -> str:
    # utc_date_time = datetime.datetime.strptime(utc_string, "%Y-%m-%d %H:%M:%S%z")

    converted_datetime = utc_datetime.astimezone(pytz.FixedOffset(int(time_zone_offset)))

    return converted_datetime


def compare_end_time_slots(current_slot, next_slot):
    current_slot, next_slot = get_time_slots_utc(current_slot), get_time_slots_utc(next_slot)

    if current_slot["start_time"] != next_slot["start_time"]:
        return cmp_items(current_slot["start_time"], next_slot["start_time"])

    return cmp_items(current_slot["end_time"], next_slot["end_time"])


def get_time_slots_utc(slot):
    return {
        "start_time": get_datetime_str(convert_timezone_to_utc(slot["start"]["dateTime"], slot["start"]["timeZone"])),
        "end_time": get_datetime_str(convert_timezone_to_utc(slot["end"]["dateTime"], slot["end"]["timeZone"])),
    }


def cmp_items(a, b):
    if a > b:
        return 1
    elif a == b:
        return 0
    else:
        return -1


def get_date_start_end_time_for_given_timezone(date_str: str, timezone_offset: str):
    date = datetime.strptime(date_str, "%Y-%m-%d")
    timezone = pytz.FixedOffset(int(timezone_offset))
    start_time = timezone.localize(datetime(date.year, date.month, date.day, 0, 0, 0))
    end_time = start_time + timedelta(days=1) - timedelta(seconds=1)

    return start_time, end_time


def update_time_of_datetime(dt: datetime, new_time: timedelta):
    total_seconds = new_time.total_seconds()
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)

    return dt.replace(hour=hours, minute=minutes, second=seconds)


def duration_to_string(duration):
    seconds = int(duration)
    minutes = seconds // 60
    hours = minutes // 60
    rest_minutes = minutes % 60

    duration_str = ""
    if hours:
        duration_str += f"{hours} hour{'s' if hours > 1 else ''}"
    if rest_minutes:
        duration_str += f" {rest_minutes} minute{'s' if rest_minutes > 1 else ''}"

    duration_str = duration_str.strip()
    return duration_str


def format_time_in_user_format(dt: datetime, time_format: str = "12h", timezone: str = None) -> str:
    """
    Format datetime according to user's preferred time format.
    
    Args:
        dt (datetime): Datetime object (can be timezone-aware or naive)
        time_format (str): Format preference - "12h", "24h", or "ethiopian"
        timezone (str): Optional timezone string (e.g., "Africa/Addis_Ababa")
    
    Returns:
        str: Formatted time string
    """
    # Convert to timezone if provided
    if timezone:
        if dt.tzinfo is None:
            # Assume UTC if naive
            dt = pytz.utc.localize(dt)
        dt = dt.astimezone(pytz.timezone(timezone))
    elif dt.tzinfo is None:
        # If no timezone provided and datetime is naive, use system timezone
        system_tz = pytz.timezone(get_system_timezone())
        dt = system_tz.localize(dt)
    
    if time_format == "ethiopian":
        return format_ethiopian_time(dt)
    elif time_format == "24h":
        return dt.strftime("%H:%M")
    else:  # Default to 12h
        return dt.strftime("%I:%M %p")


def format_ethiopian_time(dt: datetime) -> str:
    """
    Convert standard datetime to Ethiopian time format.
    Ethiopian time starts at 6 AM (sunrise) as 12:00
    6 AM - 12 PM = ጠዋት (morning)
    12 PM - 6 PM = ከሰዓት (afternoon, "from hour")
    6 PM - 12 AM = ምሽት (evening)
    12 AM - 6 AM = ሌሊት (night)
    
    Args:
        dt (datetime): Datetime object (should be timezone-aware)
    
    Returns:
        str: Formatted Ethiopian time string (e.g., "ሰዓት 3:00 ጠዋት")
    """
    standard_hour = dt.hour
    minute = dt.minute
    
    # Ethiopian time calculation
    ethiopian_hour = standard_hour - 6
    if ethiopian_hour < 0:
        ethiopian_hour += 12
    
    # If ethiopian_hour is 0, make it 12 (Ethiopian convention)
    if ethiopian_hour == 0:
        ethiopian_hour = 12
    elif ethiopian_hour > 12:
        ethiopian_hour -= 12
    
    # Determine period based on standard time
    if standard_hour >= 0 and standard_hour < 6:
        period = "ሌሊት"  # Night (12 AM - 6 AM)
    elif standard_hour >= 6 and standard_hour < 12:
        period = "ጠዋት"  # Morning (6 AM - 12 PM)
    elif standard_hour >= 12 and standard_hour < 18:
        period = "ከሰዓት"  # Afternoon (12 PM - 6 PM) - literally "from hour"
    else:
        period = "ምሽት"  # Evening (6 PM - 12 AM)
    
    minute_str = str(minute).zfill(2)
    return f"ሰዓት {ethiopian_hour}:{minute_str} {period}"
