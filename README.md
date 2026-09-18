<div align="center">
<img src="appointment/public/appointment-logo.png" height="128" alt="Appointment">
<h2>Appointment</h2>
   Frappe scheduling app for organizations, providers, locations and public booking.
</div>
<br>
<div align="center">
<img src="appointment/public/featured-image.png" width="1050" alt="Appointment">
</div>

## Key Features

- **Google Calendar Integration**: Syncs with Google Calendar to prevent scheduling conflicts.
- **ERPNext Leave Integration**: Blocks time slots based on ERPNext leave records.
- **Zoom & Google Meet Integration**: Auto-generates meeting links for Zoom and Google Meet.
- **Rescheduling Support**: Enables participants to reschedule meetings easily.


## Installation

Run the following command to install the app.

```bash
bench get-app git@github.com:rtCamp/frappe-appointment.git
bench --site [site-name] install-app appointment
bench --site [site-name] migrate
bench restart
```

For local development, check out our dev-tool for seamlessly building Frappe apps: [frappe-manager](https://github.com/rtCamp/Frappe-Manager)  
NOTE: If using `frappe-manager`, you might require to `fm restart` to provision the worker queues.

## System Setup
Visit the detailed [System Setup Guide](https://github.com/rtCamp/frappe-appointment/wiki/System-Setup) on wiki.

## Documentation

Please refer to our [Wiki](https://github.com/rtCamp/frappe-appointment/wiki/) for details.

## Contribution Guide

Please read [contribution.md](./CONTRIBUTING.md) for details.

## License

This project is licensed under the [AGPLv3 License](./LICENSE).
