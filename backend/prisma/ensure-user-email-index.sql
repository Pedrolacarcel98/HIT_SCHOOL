CREATE UNIQUE INDEX IF NOT EXISTS "User_role_email_non_student_key"
ON "User" ("role", "email")
WHERE "role" <> 'STUDENT';