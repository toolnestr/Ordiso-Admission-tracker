-- Capture why an applicant was rejected, for the rejection PDF report.
alter table applicants add column if not exists rejection_reason text;
