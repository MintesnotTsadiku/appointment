from frappe.model.document import Document

from appointment.scheduler.booking import creation_history, validate_document
from appointment.scheduler.booking_access import require_access


class Appointment(Document):
    def validate(self):
        validate_document(self)

    def after_insert(self):
        creation_history(self)

    def on_trash(self):
        require_access(self)
