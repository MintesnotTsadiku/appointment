export const API = 'appointment.scheduler.statements';

/** Download link for one month's statement as PDF or CSV. */
export function statementUrl(organization: string, month: string, fileFormat: 'pdf' | 'csv', language: string) {
  return `/api/method/${API}.download?${new URLSearchParams({ organization, month, file_format: fileFormat, language })}`;
}
