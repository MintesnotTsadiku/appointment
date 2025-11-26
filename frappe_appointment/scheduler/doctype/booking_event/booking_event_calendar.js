frappe.views.calendar["Booking Event"] = {
	field_map: {
		start: "starts_on",
		end: "ends_on",
		id: "name",
		allDay: "all_day",
		title: "subject",
		status: "event_type",
		color: "color",
	},
	style_map: {
		Public: "success",
		Private: "info",
	},
	get_events_method: "frappe_appointment.scheduler.doctype.booking_event.booking_event.get_events",
};
