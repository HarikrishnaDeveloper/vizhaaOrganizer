// Event.status values set by the backend / super admin panel:
// PENDING → APPROVED → IN_PROGRESS → COMPLETED, or REJECTED
export const EVENT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
};

export const EVENT_STATUS_LABELS = {
  PENDING: 'Pending approval',
  APPROVED: 'Confirmed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

export const eventStatusLabel = (status) => EVENT_STATUS_LABELS[status] || status || 'Scheduled';

// Suppliers enrolled so far on the event's supplier post
export const assignedSupplierCount = (event) =>
  (event?.eventPost?.enrolledMen || 0) + (event?.eventPost?.enrolledWomen || 0);
