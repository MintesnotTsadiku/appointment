from frappe.model.document import Document

from appointment.growth.directory import clean_slug


class DirectoryCategory(Document):
    def validate(self):
        self.slug = clean_slug(self.slug or self.category_name)
