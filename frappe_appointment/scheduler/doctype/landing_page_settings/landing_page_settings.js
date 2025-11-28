// Copyright (c) 2025, minte and contributors
// For license information, please see license.txt

frappe.ui.form.on("Landing Page Settings", {
    refresh(frm) {
        // Add "Populate All Defaults" button
        frm.add_custom_button(__('Populate All Defaults'), function() {
            frappe.confirm(
                __('This will populate all empty fields with default values. Existing values will not be overwritten. Continue?'),
                function() {
                    frappe.call({
                        method: 'frappe_appointment.scheduler.doctype.landing_page_settings.landing_page_settings.populate_all_defaults',
                        freeze: true,
                        freeze_message: __('Populating defaults...'),
                        callback: function(r) {
                            if (r.message && r.message.success) {
                                frappe.show_alert({
                                    message: __('Populated {0} fields with default values', [r.message.updated_fields]),
                                    indicator: 'green'
                                });
                                frm.reload_doc();
                            }
                        }
                    });
                }
            );
        }, __('Actions'));

        // Add "Choose Color Preset" button
        frm.add_custom_button(__('Choose Color Theme'), function() {
            show_color_preset_dialog(frm);
        }, __('Actions'));
    }
});


function show_color_preset_dialog(frm) {
    // Fetch available presets
    frappe.call({
        method: 'frappe_appointment.scheduler.doctype.landing_page_settings.landing_page_settings.get_color_presets',
        callback: function(r) {
            if (r.message) {
                const presets = r.message;
                
                // Create a beautiful dialog
                let d = new frappe.ui.Dialog({
                    title: __('Choose Color Theme'),
                    size: 'large',
                    fields: [
                        {
                            fieldtype: 'HTML',
                            fieldname: 'preset_grid'
                        }
                    ],
                    primary_action_label: __('Apply Selected'),
                    primary_action(values) {
                        const selected = d.$wrapper.find('.preset-card.selected').data('preset-id');
                        if (!selected) {
                            frappe.msgprint(__('Please select a color theme'));
                            return;
                        }
                        
                        frappe.call({
                            method: 'frappe_appointment.scheduler.doctype.landing_page_settings.landing_page_settings.apply_color_preset',
                            args: { preset_id: selected },
                            freeze: true,
                            freeze_message: __('Applying color theme...'),
                            callback: function(r) {
                                if (r.message && r.message.success) {
                                    frappe.show_alert({
                                        message: __('Applied theme: {0}', [r.message.preset_name]),
                                        indicator: 'green'
                                    });
                                    d.hide();
                                    frm.reload_doc();
                                }
                            }
                        });
                    }
                });

                // Build preset cards HTML
                let html = `
                    <style>
                        .preset-grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                            gap: 16px;
                            padding: 8px;
                        }
                        .preset-card {
                            border: 2px solid var(--border-color);
                            border-radius: 12px;
                            padding: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            background: var(--card-bg);
                        }
                        .preset-card:hover {
                            border-color: var(--primary);
                            transform: translateY(-2px);
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        }
                        .preset-card.selected {
                            border-color: var(--primary);
                            background: var(--subtle-accent);
                            box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
                        }
                        .preset-header {
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            margin-bottom: 12px;
                        }
                        .preset-colors {
                            display: flex;
                            gap: 6px;
                        }
                        .color-dot {
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            border: 2px solid rgba(255,255,255,0.2);
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        }
                        .preset-name {
                            font-weight: 600;
                            font-size: 14px;
                            color: var(--text-color);
                        }
                        .preset-description {
                            font-size: 12px;
                            color: var(--text-muted);
                            margin-top: 8px;
                        }
                        .preset-badge {
                            display: inline-block;
                            font-size: 10px;
                            padding: 2px 8px;
                            border-radius: 10px;
                            background: var(--primary);
                            color: white;
                            margin-left: auto;
                        }
                    </style>
                    <div class="preset-grid">
                `;

                presets.forEach((preset, index) => {
                    const isFirst = index === 0;
                    html += `
                        <div class="preset-card ${isFirst ? 'selected' : ''}" data-preset-id="${preset.id}">
                            <div class="preset-header">
                                <div class="preset-colors">
                                    <div class="color-dot" style="background: ${preset.preview_colors.primary}"></div>
                                    <div class="color-dot" style="background: ${preset.preview_colors.secondary}"></div>
                                    <div class="color-dot" style="background: ${preset.preview_colors.background}"></div>
                                </div>
                                ${isFirst ? '<span class="preset-badge">Current</span>' : ''}
                            </div>
                            <div class="preset-name">${preset.name}</div>
                            <div class="preset-description">${preset.description}</div>
                        </div>
                    `;
                });

                html += '</div>';

                d.fields_dict.preset_grid.$wrapper.html(html);

                // Add click handlers
                d.$wrapper.find('.preset-card').on('click', function() {
                    d.$wrapper.find('.preset-card').removeClass('selected');
                    $(this).addClass('selected');
                });

                d.show();
            }
        }
    });
}
