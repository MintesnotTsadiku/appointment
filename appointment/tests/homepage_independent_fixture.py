"""Independent homepage fixtures on the existing isolated multi-business site."""
import frappe
from appointment.tests.solo_browser_fixture import SoloBrowserFixture
from appointment.tests.content_browser_bootstrap import SITE
from appointment.scheduler.dashboard_config import _key


class IndependentHomepageFixture(SoloBrowserFixture):
    user = "homepage-independent-browser@example.test"
    def prepare(self, *, request):
        if frappe.local.site != SITE or not frappe.conf.get('worktree_development'):
            raise RuntimeError('Independent homepage acceptance requires the designated worktree site')
        if frappe.db.exists('User',self.user) or frappe.db.exists('Provider', {'user': self.user}) or frappe.db.exists('Organization', {'owner_user': self.user}):
            raise RuntimeError('Preserve the existing acceptance user workspace')
        return dict(ok=True, fixture_identity=dict(marker='WQA-homepage-independent', user=self.user, site=frappe.local.site))

    def cleanup(self, *, fixture_identity, request):
        providers = frappe.get_all('Provider', filters={'user': self.user, 'provider_name': fixture_identity['marker']}, pluck='name')
        for provider in providers:
            for dashboard in ('home', 'insights'):
                frappe.defaults.clear_default(key=_key('Provider:'+provider, dashboard), parent=self.user)
        result=super().cleanup(fixture_identity=fixture_identity, request=request)
        self._delete('Provider',frappe.get_all('Provider',filters={'user':self.user},pluck='name'))
        if frappe.db.exists('User',self.user):
            frappe.delete_doc('User',self.user,ignore_permissions=True,force=True)
        frappe.db.commit()
        return result

    def audit(self, *, fixture_identity, request):
        remaining = frappe.db.count('User',{'name':self.user}) + frappe.db.count('Provider', {'user': self.user, 'provider_name': fixture_identity['marker']})
        proxies = frappe.db.count('Organization', {'owner_user': self.user})
        return dict(ok=remaining+proxies == 0, remaining_record_count=remaining+proxies, organization_proxy_created=bool(proxies))


adapter = IndependentHomepageFixture()
