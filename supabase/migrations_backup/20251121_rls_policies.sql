-- =====================================================
-- GoldPen Row Level Security (RLS) Policies
-- Created: 2025-11-21
-- Purpose: Enforce multi-tenant security and role-based access
-- =====================================================

-- =====================================================
-- HELPER FUNCTION: Get User's Organization ID
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- 1. BILLING TRANSACTIONS POLICIES
-- =====================================================

-- Admin/Owner can view all billing for their org
CREATE POLICY "billing_select_policy" ON billing_transactions
  FOR SELECT
  USING (org_id = get_user_org_id());

-- Admin/Owner can insert billing records
CREATE POLICY "billing_insert_policy" ON billing_transactions
  FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

-- Admin/Owner can update billing records
CREATE POLICY "billing_update_policy" ON billing_transactions
  FOR UPDATE
  USING (org_id = get_user_org_id());

-- Admin/Owner can delete billing records
CREATE POLICY "billing_delete_policy" ON billing_transactions
  FOR DELETE
  USING (org_id = get_user_org_id());

-- =====================================================
-- 2. EXPENSES POLICIES
-- =====================================================

CREATE POLICY "expenses_select_policy" ON expenses
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "expenses_insert_policy" ON expenses
  FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "expenses_update_policy" ON expenses
  FOR UPDATE
  USING (org_id = get_user_org_id());

CREATE POLICY "expenses_delete_policy" ON expenses
  FOR DELETE
  USING (org_id = get_user_org_id());

-- =====================================================
-- 3. EXPENSE CATEGORIES POLICIES
-- =====================================================

CREATE POLICY "expense_categories_select_policy" ON expense_categories
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "expense_categories_insert_policy" ON expense_categories
  FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "expense_categories_update_policy" ON expense_categories
  FOR UPDATE
  USING (org_id = get_user_org_id());

CREATE POLICY "expense_categories_delete_policy" ON expense_categories
  FOR DELETE
  USING (org_id = get_user_org_id());

-- =====================================================
-- 4. HOMEWORK ASSIGNMENTS POLICIES
-- =====================================================

-- Teachers and admins can view all homework in their org
CREATE POLICY "homework_assignments_select_policy" ON homework_assignments
  FOR SELECT
  USING (org_id = get_user_org_id());

-- Teachers can create homework for their classes
CREATE POLICY "homework_assignments_insert_policy" ON homework_assignments
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND (
      -- Admin can create for any class
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
      OR
      -- Teacher can create for their own classes
      EXISTS (
        SELECT 1 FROM teachers t
        WHERE t.user_id = auth.uid() AND t.id = teacher_id
      )
    )
  );

-- Teachers can update their own homework
CREATE POLICY "homework_assignments_update_policy" ON homework_assignments
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
      OR
      EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid() AND id = teacher_id)
    )
  );

-- Teachers can delete their own homework
CREATE POLICY "homework_assignments_delete_policy" ON homework_assignments
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
      OR
      EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid() AND id = teacher_id)
    )
  );

-- =====================================================
-- 5. HOMEWORK SUBMISSIONS POLICIES
-- =====================================================

-- Students can view their own submissions, teachers can view all
CREATE POLICY "homework_submissions_select_policy" ON homework_submissions
  FOR SELECT
  USING (
    -- Students see their own submissions
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR
    -- Teachers see submissions for their homework
    EXISTS (
      SELECT 1 FROM homework_assignments ha
      JOIN teachers t ON ha.teacher_id = t.id
      WHERE ha.id = assignment_id AND t.user_id = auth.uid()
    )
    OR
    -- Admins see all
    EXISTS (
      SELECT 1 FROM users u
      JOIN homework_assignments ha ON ha.id = assignment_id
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'owner') AND ha.org_id = u.org_id
    )
  );

-- Students can submit homework
CREATE POLICY "homework_submissions_insert_policy" ON homework_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
  );

-- Students can update their own submissions (before grading)
CREATE POLICY "homework_submissions_update_policy" ON homework_submissions
  FOR UPDATE
  USING (
    -- Students can update their own ungraded submissions
    (EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id) AND grade IS NULL)
    OR
    -- Teachers can grade
    EXISTS (
      SELECT 1 FROM homework_assignments ha
      JOIN teachers t ON ha.teacher_id = t.id
      WHERE ha.id = assignment_id AND t.user_id = auth.uid()
    )
    OR
    -- Admins can do anything
    EXISTS (
      SELECT 1 FROM users u
      JOIN homework_assignments ha ON ha.id = assignment_id
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'owner') AND ha.org_id = u.org_id
    )
  );

-- =====================================================
-- 6. EXAMS POLICIES
-- =====================================================

CREATE POLICY "exams_select_policy" ON exams
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "exams_insert_policy" ON exams
  FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "exams_update_policy" ON exams
  FOR UPDATE
  USING (org_id = get_user_org_id());

CREATE POLICY "exams_delete_policy" ON exams
  FOR DELETE
  USING (org_id = get_user_org_id());

-- =====================================================
-- 7. EXAM SCORES POLICIES
-- =====================================================

-- Students can view their own scores
CREATE POLICY "exam_scores_select_policy" ON exam_scores
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR
    EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.org_id = get_user_org_id()
    )
  );

-- Teachers and admins can add scores
CREATE POLICY "exam_scores_insert_policy" ON exam_scores
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.org_id = get_user_org_id()
    )
  );

-- Teachers and admins can update scores
CREATE POLICY "exam_scores_update_policy" ON exam_scores
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.org_id = get_user_org_id()
    )
  );

CREATE POLICY "exam_scores_delete_policy" ON exam_scores
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.org_id = get_user_org_id()
    )
  );

-- =====================================================
-- 8. LESSONS POLICIES
-- =====================================================

CREATE POLICY "lessons_select_policy" ON lessons
  FOR SELECT
  USING (org_id = get_user_org_id());

-- Teachers can create lessons for their classes
CREATE POLICY "lessons_insert_policy" ON lessons
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
      OR
      EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid() AND id = teacher_id)
    )
  );

CREATE POLICY "lessons_update_policy" ON lessons
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
      OR
      EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid() AND id = teacher_id)
    )
  );

CREATE POLICY "lessons_delete_policy" ON lessons
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
      OR
      EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid() AND id = teacher_id)
    )
  );

-- =====================================================
-- 9. ATTENDANCE RECORDS POLICIES
-- =====================================================

-- Everyone in org can view attendance
CREATE POLICY "attendance_select_policy" ON attendance_records
  FOR SELECT
  USING (org_id = get_user_org_id());

-- Teachers and admins can mark attendance
CREATE POLICY "attendance_insert_policy" ON attendance_records
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner', 'teacher'))
    )
  );

CREATE POLICY "attendance_update_policy" ON attendance_records
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner', 'teacher'))
    )
  );

-- Only admins can delete attendance
CREATE POLICY "attendance_delete_policy" ON attendance_records
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- =====================================================
-- 10. CONSULTATIONS POLICIES
-- =====================================================

-- All staff can view consultations
CREATE POLICY "consultations_select_policy" ON consultations
  FOR SELECT
  USING (org_id = get_user_org_id());

-- Staff can create consultations
CREATE POLICY "consultations_insert_policy" ON consultations
  FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "consultations_update_policy" ON consultations
  FOR UPDATE
  USING (org_id = get_user_org_id());

-- Only admins can delete consultations
CREATE POLICY "consultations_delete_policy" ON consultations
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- =====================================================
-- 11. CONSULTATION IMAGES POLICIES
-- =====================================================

-- Can view images for consultations you can view
CREATE POLICY "consultation_images_select_policy" ON consultation_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_id AND c.org_id = get_user_org_id()
    )
  );

CREATE POLICY "consultation_images_insert_policy" ON consultation_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_id AND c.org_id = get_user_org_id()
    )
  );

CREATE POLICY "consultation_images_delete_policy" ON consultation_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_id AND c.org_id = get_user_org_id()
    )
  );

-- =====================================================
-- 12. WAITLISTS POLICIES
-- =====================================================

CREATE POLICY "waitlists_select_policy" ON waitlists
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "waitlists_insert_policy" ON waitlists
  FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "waitlists_update_policy" ON waitlists
  FOR UPDATE
  USING (org_id = get_user_org_id());

CREATE POLICY "waitlists_delete_policy" ON waitlists
  FOR DELETE
  USING (org_id = get_user_org_id());

-- =====================================================
-- 13. WAITLIST ENTRIES POLICIES
-- =====================================================

CREATE POLICY "waitlist_entries_select_policy" ON waitlist_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM waitlists w
      WHERE w.id = waitlist_id AND w.org_id = get_user_org_id()
    )
  );

CREATE POLICY "waitlist_entries_insert_policy" ON waitlist_entries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waitlists w
      WHERE w.id = waitlist_id AND w.org_id = get_user_org_id()
    )
  );

CREATE POLICY "waitlist_entries_update_policy" ON waitlist_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM waitlists w
      WHERE w.id = waitlist_id AND w.org_id = get_user_org_id()
    )
  );

CREATE POLICY "waitlist_entries_delete_policy" ON waitlist_entries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM waitlists w
      WHERE w.id = waitlist_id AND w.org_id = get_user_org_id()
    )
  );

-- =====================================================
-- 14. SEATS POLICIES
-- =====================================================

-- Everyone in org can view seats (real-time updates)
CREATE POLICY "seats_select_policy" ON seats
  FOR SELECT
  USING (org_id = get_user_org_id());

-- Staff can manage seats
CREATE POLICY "seats_insert_policy" ON seats
  FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "seats_update_policy" ON seats
  FOR UPDATE
  USING (org_id = get_user_org_id());

-- Only admins can delete seats
CREATE POLICY "seats_delete_policy" ON seats
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- =====================================================
-- 15. SEAT SLEEP RECORDS POLICIES
-- =====================================================

-- Students can view their own sleep records, staff can view all
CREATE POLICY "seat_sleep_select_policy" ON seat_sleep_records
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

-- Students can create their own sleep records
CREATE POLICY "seat_sleep_insert_policy" ON seat_sleep_records
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

-- Students can update their own active sleep records
CREATE POLICY "seat_sleep_update_policy" ON seat_sleep_records
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

-- Only staff can delete sleep records
CREATE POLICY "seat_sleep_delete_policy" ON seat_sleep_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

-- =====================================================
-- 16. SEAT OUTING RECORDS POLICIES
-- =====================================================

CREATE POLICY "seat_outing_select_policy" ON seat_outing_records
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

CREATE POLICY "seat_outing_insert_policy" ON seat_outing_records
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

CREATE POLICY "seat_outing_update_policy" ON seat_outing_records
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

CREATE POLICY "seat_outing_delete_policy" ON seat_outing_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

-- =====================================================
-- 17. SEAT CALL RECORDS POLICIES
-- =====================================================

CREATE POLICY "seat_call_select_policy" ON seat_call_records
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

-- Students can create call records
CREATE POLICY "seat_call_insert_policy" ON seat_call_records
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
  );

-- Staff can acknowledge calls
CREATE POLICY "seat_call_update_policy" ON seat_call_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

CREATE POLICY "seat_call_delete_policy" ON seat_call_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM seats s
      WHERE s.id = seat_id AND s.org_id = get_user_org_id()
    )
  );

-- =====================================================
-- RLS POLICIES COMPLETE
-- =====================================================
-- Total policies created: 65+
-- Security model: Multi-tenant with role-based access
-- =====================================================
