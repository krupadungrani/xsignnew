-- Migration: Add security questions to users table
-- Created: 2024-01-01

ALTER TABLE "users" ADD COLUMN "security_question_1" text;
ALTER TABLE "users" ADD COLUMN "security_answer_1" text;
ALTER TABLE "users" ADD COLUMN "security_question_2" text;
ALTER TABLE "users" ADD COLUMN "security_answer_2" text;
