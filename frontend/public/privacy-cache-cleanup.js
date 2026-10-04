// These caches belonged to older Appointment workers and could contain session data.
const appointmentPrivateCaches = new Set([
  "html-cache", "api-cache", "static-data-cache", "schedule-pages-cache",
]);
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => appointmentPrivateCaches.has(name)).map(name => caches.delete(name)),
  )));
});
