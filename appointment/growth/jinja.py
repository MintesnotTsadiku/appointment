"""Template helpers registered in hooks `jinja.methods`."""

from appointment.growth.brand import brand
from appointment.growth.settings import growth


def platform_brand() -> dict:
    return brand()


def growth_settings() -> dict:
    return growth()
