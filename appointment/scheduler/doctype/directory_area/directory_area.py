from frappe.model.document import Document

from appointment.growth.directory import clean_slug


class DirectoryArea(Document):
    def validate(self):
        self.slug = clean_slug(self.slug or self.area_name)
        self.city = " ".join((self.city or "").split()).title()
        self.city_am = " ".join((self.city_am or "").split())
