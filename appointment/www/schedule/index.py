import frappe

no_cache = 1

def get_context(context):
    from appointment.growth import sharing, short_links
    from appointment.public_experience.csp import encode_boot_data, shell_nonce
    from appointment.public_experience.shell_boot import shell_boot_tags

    # A former provider page address (`/schedule/p/<old>`) redirects to the current one.
    short_links.shell_redirect()
    # Link previews for provider pages (`/schedule/p/<slug>`) read Open Graph tags without running the SPA.
    context["public_meta_tags"] = sharing.shell_meta_tags()
    # A business scheduler inlines its website's design and preloads its display font (shell_boot).
    context["public_meta_tags"] += shell_boot_tags()

    context["content_shell_nonce"] = shell_nonce()
    csrf_token = frappe.sessions.get_csrf_token()
    # nosemgrep
    frappe.db.commit()
    if frappe.session.user == "Guest":
        boot = frappe.website.utils.get_boot_data()
    else:
        try:
            boot = frappe.sessions.get()
        except Exception as e:
            raise frappe.SessionBootFailed from e
    boot["push_relay_server_url"] = frappe.conf.get("push_relay_server_url")

    # add server_script_enabled in boot
    if "server_script_enabled" in frappe.conf:
        enabled = frappe.conf.server_script_enabled
    else:
        enabled = True
    boot["server_script_enabled"] = enabled
    # The SPA paints the platform brand from boot, so the first frame never shows a placeholder.
    from appointment.growth.api import public_payload

    boot["platform_brand"] = public_payload()
    boot_json = encode_boot_data(boot)

    context.update(
        {
            "build_version": frappe.utils.get_build_version(),
            "boot": boot_json,
            "csrf_token": csrf_token,
        }
    )

    context["app_name"] = boot["platform_brand"]["brand"]["product_name"]

    return context
