"""Phone numbers for tests: random, valid Ethiopian mobile numbers that no seeded customer uses."""

import secrets


def fresh_phone(local=False):
    """A new number such as "+251911234567", or "0911234567" when `local`."""
    digits = "".join(secrets.choice("0123456789") for _ in range(8))
    return ("09" if local else "+2519") + digits
