"""`/tools` and `/am/tools`: the list of free tools."""

from appointment.growth.tools import page

no_cache = 1


def get_context(context):
    page.build(context, "")
    return context
