"""Managed browser smoke suite for the isolated content runtime."""
import frappe
from appointment.tests.content_browser_bootstrap import SITE, ALLOWED_SITES


def suites():
    site = frappe.local.site
    if site not in ALLOWED_SITES or not frappe.conf.get('worktree_development'):
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
        'environment':{'allowed_sites':[site], 'allowed_base_urls':['http://127.0.0.11:34340'],
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
    templates = {**runtime, 'suite_id':'content-templates', 'title':'Certified content template matrix',
        'spec_path':'qa/content-templates.spec.mjs', 'config_path':'qa/content-templates.config.mjs',
        'fixture_adapter':'appointment.tests.showcase_browser_fixture.adapter',
        'scenarios':[{'scenario_id':f'certified-{key}-{width}-{mode}',
            'title':f'{key} {width} {mode}', 'page_family':'content-templates',
            'credential_capability':'frappe.role:Provider', 'mutation_level':'read-only',
            'playwright_pattern':f'certified-{key}-{width}-{mode}', 'required_artifacts':['screenshot']}
            for key in ('selam','bloom','meron','abugida','tena')
            for width in ('desktop','mobile') for mode in ('light','dark')]}
    accessibility = {**templates, 'suite_id': 'content-accessibility', 'title': 'Public accessibility and performance gates',
        'spec_path': 'qa/content-accessibility.spec.mjs', 'config_path': 'qa/content-accessibility.config.mjs',
        'scenarios': [{'scenario_id': f'gates-{key}-{width}-{mode}', 'title': f'{key} {width} {mode}',
            'page_family': 'content-gates', 'credential_capability': 'frappe.role:Provider',
            'mutation_level': 'read-only', 'playwright_pattern': f'gates-{key}-{width}-{mode}',
            'required_artifacts': ['screenshot']}
            for key in ('selam', 'bloom', 'meron', 'abugida', 'tena')
            for width, mode in (('desktop', 'light'), ('mobile', 'dark'))]}
    individual = {**website, 'suite_id': 'individual-owner', 'title': 'Independent owner website setup',
        'spec_path': 'qa/individual-owner.spec.mjs', 'config_path': 'qa/individual-owner.config.mjs',
        'fixture_adapter': 'appointment.tests.solo_browser_fixture.adapter',
        'scenarios': [{'scenario_id': 'independent-owner-journey', 'title': 'Independent owner journey',
            'page_family': 'website-setup', 'credential_capability': 'frappe.role:Provider',
            'mutation_level': 'exact-cleanup', 'playwright_pattern': 'independent-owner-journey',
            'required_artifacts': ['screenshot']}]}
    if site == "meet-beta-content-restore.localhost":
        recovery = {**website, 'suite_id': 'content-recovery', 'title': 'Restored public routes and consent',
            'spec_path': 'qa/content-recovery.spec.mjs', 'config_path': 'qa/content-recovery.config.mjs',
            'fixture_adapter': 'appointment.tests.recovery_browser_fixture.adapter',
            'scenarios': [{'scenario_id': 'recovered-public-routes-and-consent', 'title': 'Recovered public routes and consent',
                'page_family': 'content-recovery', 'credential_capability': 'frappe.role:Provider',
                'mutation_level': 'fixture-only', 'playwright_pattern': 'recovered-public-routes-and-consent',
                'required_artifacts': ['screenshot']}]}
        return [recovery]
    production = {**templates, 'suite_id': 'content-production', 'title': 'Production public security and worker upgrade',
        'spec_path': 'qa/content-production.spec.mjs', 'config_path': 'qa/content-production.config.mjs',
        'scenarios': [{'scenario_id': 'production-security-and-cache-upgrade',
            'title': 'Production security and cache upgrade', 'page_family': 'content-production',
            'credential_capability': 'frappe.role:Provider', 'mutation_level': 'read-only',
            'playwright_pattern': 'production-security-and-cache-upgrade', 'required_artifacts': ['screenshot']}]}
    homepage = {**runtime, 'suite_id':'homepage-analytics', 'title':'Configurable homepage and navigation',
        'spec_path':'qa/homepage-analytics.spec.mjs', 'config_path':'qa/homepage-analytics.config.mjs',
        'fixture_adapter':'appointment.tests.homepage_browser_fixture.adapter',
        'scenarios':[{'scenario_id':'homepage-matrix','title':'Homepage matrix','page_family':'homepage',
            'credential_capability':'frappe.role:Provider','mutation_level':'exact-cleanup',
            'playwright_pattern':'homepage-matrix','required_artifacts':['screenshot']}]}
    homepage_independent = {**homepage, 'suite_id':'homepage-independent', 'title':'Independent homepage and booking regression',
        'spec_path':'qa/homepage-independent.spec.mjs','config_path':'qa/homepage-independent.config.mjs',
        'fixture_adapter':'appointment.tests.homepage_independent_fixture.adapter',
        'scenarios':[{'scenario_id':'independent-homepage','title':'Independent homepage','page_family':'homepage',
            'credential_capability':'frappe.role:Provider','mutation_level':'exact-cleanup',
            'playwright_pattern':'independent-homepage','required_artifacts':['screenshot']}]}
    homepage_demo = {**homepage, 'suite_id':'homepage-demo', 'title':'Seeded homepage visual comparison',
        'spec_path':'qa/homepage-demo.spec.mjs','config_path':'qa/homepage-demo.config.mjs',
        'fixture_adapter':'appointment.tests.homepage_demo_fixture.adapter',
        'scenarios':[{'scenario_id':'seeded-homepage','title':'Seeded homepage','page_family':'homepage',
            'credential_capability':'frappe.role:Provider','mutation_level':'exact-cleanup',
            'playwright_pattern':'seeded-homepage','required_artifacts':['screenshot']}]}
    internal = {**homepage_demo, 'suite_id':'internal-appearance', 'title':'Personal internal application appearance',
        'spec_path':'qa/internal-appearance.spec.mjs', 'config_path':'qa/internal-appearance.config.mjs',
        'fixture_adapter':'appointment.tests.internal_appearance_fixture.adapter',
        'scenarios':[{'scenario_id':'internal-appearance','title':'Internal appearance matrix','page_family':'settings',
            'credential_capability':'frappe.role:Provider','mutation_level':'exact-cleanup',
            'playwright_pattern':'internal-appearance','required_artifacts':['screenshot']}]}
    shell = {**internal, 'suite_id':'codex-shell', 'title':'Codex palette, workspace shell and profile',
        'spec_path':'qa/codex-shell.spec.mjs', 'config_path':'qa/codex-shell.config.mjs',
        'scenarios':[{'scenario_id':'codex-shell','title':'Codex shell matrix','page_family':'settings',
            'credential_capability':'frappe.role:Provider','mutation_level':'exact-cleanup',
            'playwright_pattern':'codex-shell','required_artifacts':['screenshot']}]}
    return [shell, internal, homepage_demo, homepage, homepage_independent, runtime, website, templates, accessibility, production] if site == SITE else [runtime, website, individual]
