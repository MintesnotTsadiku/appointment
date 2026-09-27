"""Exact cleanup for normal-owner homepage acceptance records."""
import frappe
from appointment.tests.website_browser_fixture import WebsiteBrowserFixture
from appointment.scheduler.dashboard_config import _key
from appointment.tests.content_browser_bootstrap import USER


class HomepageBrowserFixture(WebsiteBrowserFixture):
    def prepare(self, *, request):
        result=super().prepare(request=request)
        if result.get('ok'):
            result['fixture_identity']['navigation_before']=frappe.defaults.get_user_default('appointment:navigation:v1',USER)
        return result

    def cleanup(self, *, fixture_identity, request):
        organizations=self._organizations(fixture_identity)
        for organization in organizations:
            appointments=frappe.get_all('Appointment',filters={'organization':organization},pluck='name')
            frappe.db.delete('Version',{'ref_doctype':'Appointment','docname':['in',appointments or ['']]})
            self._delete('Appointment',appointments)
            for dashboard in ('home','insights'):
                frappe.defaults.clear_default(key=_key(organization,dashboard),parent=USER)
        before=fixture_identity.get('navigation_before')
        frappe.defaults.clear_default(key='appointment:navigation:v1',parent=USER)
        if before:frappe.defaults.set_user_default('appointment:navigation:v1',before,user=USER)
        return super().cleanup(fixture_identity=fixture_identity,request=request)


adapter=HomepageBrowserFixture()
