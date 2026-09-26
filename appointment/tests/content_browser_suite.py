"""Managed browser smoke suite for the isolated content runtime."""
import frappe
from appointment.tests.content_browser_bootstrap import SITE


def suites():
    if frappe.local.site != SITE or not frappe.conf.get('worktree_development'):
        return []
    runtime = {
        'schema_version':'browser-qa-suite/v2', 'suite_id':'content-runtime', 'app':'appointment',
        'version':'1', 'title':'Content runtime normal-user browser smoke',
        'execution_type':'playwright_test', 'spec_path':'qa/content-runtime.spec.mjs',
        'config_path':'qa/content-runtime.config.mjs', 'fixture_adapter':None,
        'runner_version':'1.58.2', 'browser_version':'145.0.7632.6',
        'scenarios':[{'scenario_id':name, 'title':name, 'page_family':'runtime',
            'credential_capability':'frappe.role:Provider', 'mutation_level':'read-only',
            'playwright_pattern':name, 'required_artifacts':['screenshot']} for name in
            ('react-desktop', 'react-mobile', 'desk-desktop', 'desk-mobile')],
        'default_cleanup_policy':'always', 'required_capabilities':[],
        'environment':{'allowed_sites':[SITE], 'allowed_base_urls':['http://127.0.0.11:34340'],
            'requires_developer_mode':True, 'allows_credentials':True,
            'allowed_modes':['deterministic']},
    }
    website = {**runtime, 'suite_id':'website-setup', 'title':'Normal-owner website setup',
        'spec_path':'qa/website-setup.spec.mjs', 'config_path':'qa/website-setup.config.mjs',
        'fixture_adapter':'appointment.tests.website_browser_fixture.adapter',
        'scenarios':[{'scenario_id':'website-owner-journey', 'title':'Website owner journey',
            'page_family':'website-setup', 'credential_capability':'frappe.role:Provider',
            'mutation_level':'exact-cleanup', 'playwright_pattern':'website-owner-journey',
            'required_artifacts':['screenshot']}]}
    return [runtime, website]
