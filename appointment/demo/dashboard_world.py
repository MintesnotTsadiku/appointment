"""First-use demo Insights configurations; never replace a user's saved dashboard."""
from datetime import timedelta
import frappe
from appointment.scheduler import analytics, dashboard_config, membership

VERSION = 1


def configure(state):
    from appointment.demo import showcase

    if state.get('dashboard_world', {}).get('version') == VERSION:
        return False
    created = []
    today = frappe.utils.getdate()
    cohort_range = dict(start=str(today-timedelta(days=200)), end=str(today), basis='appointment')
    for persona in state['personas']:
        frappe.set_user(persona['email'])
        for key, business in state['businesses'].items():
            scope = membership.workspace_for(business['organization'])
            if not scope or dashboard_config.load(business['organization'],'insights'):
                continue
            report = analytics.overview(business['organization'],30)
            preset = 'reception' if scope['role']=='Receptionist' else {'selam':'freelancer','bloom':'hairstylist','tena':'clinic','abugida':'consultant'}.get(key,'general')
            ids = ['total','completed','cancelled','no_show_rate','booking_trend','services','sources','lead_time',
                   'actual_duration','arrival_punctuality','service_delay','reception_queue_wait','agreed_value',
                   'recorded_payments','retention_30','retention_60','retention_90','cohorts','walk_ins_waiting','queue_wait']
            placements = []
            for metric in ids:
                if metric not in report['metrics']:
                    continue
                chart = 'bar' if metric in {'booking_trend','services','sources'} else 'table' if metric=='cohorts' else 'value'
                placement = dict(id=metric, chart=chart, span=2 if metric=='booking_trend' else 1)
                if metric.startswith('retention_') or metric=='cohorts':
                    placement['filters']=cohort_range
                placements.append(placement)
            dashboard_config.save(business['organization'],'insights',frappe.as_json(dict(version=1,preset=preset,widgets=placements)))
            default = frappe.db.get_value('DefaultValue', {'parent':persona['email'],'defkey':dashboard_config._key(business['organization'],'insights')}, 'name')
            if not default:
                frappe.throw('The saved demo preference was not found; rolling back the seed phase.')
            showcase.remember(state,'DefaultValue',default)
            created.append(dict(user=persona['email'], organization=business['organization']))
    frappe.set_user('Administrator')
    state['dashboard_world'] = dict(version=VERSION, created=created, existing_preferences_preserved=True)
    return True


def upgrade():
    from appointment.demo import showcase
    with showcase.locked():
        state = showcase.load_state()
        changed = configure(state)
        showcase.write_state(state)
        frappe.db.commit()
        return dict(changed=changed, dashboards_created=len(state['dashboard_world']['created']), existing_preferences_preserved=True)
