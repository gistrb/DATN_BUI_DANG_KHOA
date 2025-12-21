from django.utils import timezone
from datetime import time, timedelta
from zoneinfo import ZoneInfo

WORK_START_TIME = time(8, 30)
WORK_END_TIME = time(17, 30)
LUNCH_START = time(12, 0)
LUNCH_END = time(13, 30)
EARLY_THRESHOLD = timedelta(hours=1)

def get_vietnam_now():
    return timezone.localtime(timezone.now(), timezone=ZoneInfo('Asia/Ho_Chi_Minh'))

def is_leaving_early(check_out_time):
    if check_out_time.time() < LUNCH_START:
        return True
    if LUNCH_START <= check_out_time.time() <= LUNCH_END:
        return False
    from datetime import datetime
    end_time = datetime.combine(check_out_time.date(), WORK_END_TIME)
    end_time = timezone.make_aware(end_time, timezone=ZoneInfo('Asia/Ho_Chi_Minh'))
    if check_out_time < end_time - EARLY_THRESHOLD:
        return True
    return False
