"""Location reception state with explicit effective UTC events."""
import json
from datetime import datetime, timezone
import frappe
from frappe import _
from appointment.scheduler import membership, booking_access


@frappe.whitelist(methods=['POST'])
def set_state(location: str, state: str):
    doc=frappe.get_doc('Location',location)
    workspace=membership.workspace_for(doc.organization)
    if doc.independent_provider:
        from appointment.scheduler.independent import require_owner
        require_owner(doc.independent_provider)
        workspace={'is_manager':True,'role':'Owner'}
    if not workspace or not (workspace['is_manager'] or workspace['role']=='Receptionist' and any(scope['organization']==doc.organization and (not scope['locations'] or doc.name in scope['locations']) for scope in booking_access.reception_scope())):
        frappe.throw(_('This reception location is outside your scope.'),frappe.PermissionError)
    if state not in {'Open','Closed'}:
        frappe.throw(_('Choose Open or Closed.'))
    frappe.db.sql('select name from tabLocation where name=%s for update',location)
    doc.reload()
    if doc.reception_state==state:
        return {'state':state,'events':len(json.loads(doc.reception_events or '[]'))}
    events=json.loads(doc.reception_events or '[]')
    events.append(dict(type='reception-state',state=state,previous=doc.reception_state or 'Unconfigured',actor=frappe.session.user,timestamp=datetime.now(timezone.utc).isoformat(),sequence=len(events)))
    # Both server-owned fields are one write in the current transaction.
    frappe.db.set_value('Location',location,{'reception_state':state,'reception_events':json.dumps(events)},update_modified=False)
    return {'state':state,'events':len(events)}
