-- Add CHECK constraint for user role validation
ALTER TABLE "users" ADD CONSTRAINT "valid_user_role" CHECK ("role" IN ('OPERATOR', 'MANAGER', 'ADMIN', 'QUALITY_ASSURANCE'));