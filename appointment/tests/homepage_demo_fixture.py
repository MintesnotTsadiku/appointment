"""Normal demo-owner logins with exact restoration of navigation preferences."""
import json
import frappe
from appointment.demo import showcase
from appointment.tests.showcase_browser_fixture import ShowcaseBrowserFixture


class HomepageDemoFixture(ShowcaseBrowserFixture):
    def prepare(self, *, request):
        result = super().prepare(request=request)
        state = showcase.load_state()
        users = [business['owner'] for business in state['businesses'].values()]
        preferences = {user: frappe.defaults.get_user_default('appointment:navigation:v1', user=user) for user in users}
        result['fixture_identity']['navigation'] = preferences
        result['fixture_identity']['appearance'] = {user: frappe.defaults.get_user_default('appointment:appearance:v1', user=user) for user in users}
        return result

    def provide_execution_context(self, *, fixture_identity, request):
        state = showcase.load_state()
        world = []
        for key, business in state['businesses'].items():
            persona = next(persona for persona in state['personas'] if persona['email'] == business['owner'])
            world.append(dict(key=key, name=business['name'], organization=business['organization'],
                              email=persona['email'], password=persona['password']))
        return {'environment': {'HOMEPAGE_DEMO_WORLD': json.dumps(world)}}

    def cleanup(self, *, fixture_identity, request):
        for user, value in fixture_identity['navigation'].items():
            frappe.defaults.clear_default(key='appointment:navigation:v1', parent=user)
            if value:
                frappe.defaults.set_user_default('appointment:navigation:v1', value, user=user)
        for user, value in fixture_identity.get('appearance', {}).items():
            frappe.defaults.clear_default(key='appointment:appearance:v1', parent=user)
            if value is not None:
                frappe.defaults.set_user_default('appointment:appearance:v1', value, user=user)
            frappe.clear_cache(user=user)
        frappe.db.commit()
        return dict(ok=True, message='Exact navigation and appearance preferences restored.')


adapter = HomepageDemoFixture()
