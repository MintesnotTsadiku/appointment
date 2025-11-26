frappe.listview_settings["Booking Event"] = {
	add_fields: ["starts_on", "ends_on"],
	onload: function () {
		frappe.route_options = {
			status: "Open",
		};
	},
};
