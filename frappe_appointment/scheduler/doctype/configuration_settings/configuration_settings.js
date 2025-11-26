// Copyright (c) 2025, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Configuration Settings', {
	refresh: function(frm) {
		// Clear any existing auto-refresh timer
		if (frm._auto_refresh_timer) {
			clearTimeout(frm._auto_refresh_timer);
			frm._auto_refresh_timer = null;
		}
		
		// Auto-refresh log every 3 seconds ONLY when generation is actively in progress
		// Check for "Starting" but NOT for completion indicators to avoid infinite loops
		if (frm.doc.demo_generation_log) {
			const log = frm.doc.demo_generation_log;
			const is_starting = log.includes('Starting') || log.includes('Generating') || log.includes('Creating');
			const is_complete = log.includes('completed') || log.includes('Finished') || log.includes('Error') || log.includes('success');
			
			// Only auto-refresh if generation is in progress and not complete
			if (is_starting && !is_complete) {
				// Set a flag to prevent multiple timers
				if (!frm._is_refreshing) {
					frm._is_refreshing = true;
					frm._auto_refresh_timer = setTimeout(() => {
						frm._is_refreshing = false;
						frm.reload_doc();
					}, 3000); // Increased to 3 seconds to reduce load
				}
			} else {
				// Generation complete, stop auto-refresh
				frm._is_refreshing = false;
			}
		}
	},

	btn_generate_demo_data: function(frm) {
		// Show confirmation dialog
		frappe.confirm(
			'Generate demo data with the selected options?',
			() => {
				// User confirmed
				frappe.show_alert({
					message: __('Starting demo data generation...'),
					indicator: 'blue'
				}, 5);

				// Reload document first to get latest version
				frm.reload_doc().then(() => {
					// Set the button field value and save
					frm.set_value('btn_generate_demo_data', 1);
					frm.save().then(() => {
						// Reload after 3 seconds to show initial log
						// The refresh handler will continue auto-refreshing if needed
						setTimeout(() => {
							frm.reload_doc();
						}, 3000);
					}).catch((err) => {
						// Handle concurrency error gracefully
						if (err.message && err.message.includes('modified after')) {
							frappe.show_alert({
								message: __('Document was updated. Reloading...'),
								indicator: 'orange'
							}, 3);
							frm.reload_doc().then(() => {
								// Retry after reload
								frm.set_value('btn_generate_demo_data', 1);
								frm.save();
							});
						} else {
							frappe.show_alert({
								message: __('Error: ' + (err.message || 'Unknown error')),
								indicator: 'red'
							}, 5);
						}
					});
				});
			},
			() => {
				// User cancelled
				frappe.show_alert({
					message: __('Demo data generation cancelled'),
					indicator: 'orange'
				}, 3);
			}
		);
	},

	btn_delete_demo_data: function(frm) {
		// Show warning dialog
		frappe.warn(
			'Delete Demo Data?',
			'This will permanently delete all demo data (organizations, providers, services, locations, appointments). This action cannot be undone.',
			() => {
				// User confirmed deletion
				frappe.show_alert({
					message: __('Starting demo data deletion...'),
					indicator: 'orange'
				}, 5);

				// Reload document first to get latest version
				frm.reload_doc().then(() => {
					// Set the button field value and save
					frm.set_value('btn_delete_demo_data', 1);
					frm.save().then(() => {
						// Reload after 3 seconds to show initial log
						// The refresh handler will continue auto-refreshing if needed
						setTimeout(() => {
							frm.reload_doc();
						}, 3000);
					}).catch((err) => {
						// Handle concurrency error gracefully
						if (err.message && err.message.includes('modified after')) {
							frappe.show_alert({
								message: __('Document was updated. Reloading...'),
								indicator: 'orange'
							}, 3);
							frm.reload_doc().then(() => {
								// Retry after reload
								frm.set_value('btn_delete_demo_data', 1);
								frm.save();
							});
						} else {
							frappe.show_alert({
								message: __('Error: ' + (err.message || 'Unknown error')),
								indicator: 'red'
							}, 5);
						}
					});
				});
			},
			'Continue',
			false // isAsync
		);
	}
});
