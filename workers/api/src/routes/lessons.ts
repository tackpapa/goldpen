import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { sendNotification, createLessonReportMessage } from "../lib/notifications";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapLesson = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  class_id: row.class_id,
  teacher_id: row.teacher_id,
  student_id: row.student_id,
  lesson_date: row.lesson_date,
  lesson_time: row.lesson_time,
  duration_minutes: row.duration_minutes,
  subject: row.subject,
  content: row.content,
  student_attitudes: row.student_attitudes,
  comprehension_level: row.comprehension_level || "medium",
  homework_assigned: row.homework_assigned,
  next_lesson_plan: row.next_lesson_plan,
  parent_feedback: row.parent_feedback,
  director_feedback: row.director_feedback,
  final_message: row.final_message,
  notification_sent: row.notification_sent,
  notification_sent_at: row.notification_sent_at,
  attendance: row.attendance || [],
  homework_submissions: row.homework_submissions || {},
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * GET /api/lessons
 * returns lessons + scheduledClasses + monthly/comprehension stats
 */
app.get("/", async (c) => {
  try {
    const url = new URL(c.req.url);
    const targetDate =
      url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const targetDay = new Date(targetDate).getDay(); // 0-6
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    const { lessons, stats, schedules } = await withClient(
      c.env,
      async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM lessons WHERE org_id = $1 ORDER BY lesson_date DESC, created_at DESC LIMIT 500`,
          [DEMO_ORG],
        );
        const lessons = rows.map(mapLesson);

        // monthly progress (group by month)
        const monthly = await client.query(
          `
        SELECT to_char(lesson_date, 'YYYY-MM') AS month, COUNT(*)::int AS lessons
        FROM lessons
        WHERE org_id = $1
        GROUP BY 1
        ORDER BY 1
        `,
          [DEMO_ORG],
        );

        // comprehension trend by week (ISO week)
        const comp = await client.query(
          `
        SELECT to_char(lesson_date, 'IYYY-IW') AS week,
               SUM(CASE WHEN comprehension_level='high' THEN 1 ELSE 0 END)::int AS high,
               SUM(CASE WHEN comprehension_level='medium' THEN 1 ELSE 0 END)::int AS medium,
               SUM(CASE WHEN comprehension_level='low' THEN 1 ELSE 0 END)::int AS low
        FROM lessons
        WHERE org_id = $1
        GROUP BY 1
        ORDER BY 1
        `,
          [DEMO_ORG],
        );

        // scheduled classes derived from classes.schedule jsonb
        const schedRes = await client.query(
          `SELECT c.id, c.name, c.schedule, c.subject, c.teacher_id, t.name AS teacher_name
         FROM classes c
         LEFT JOIN teachers t ON t.id = c.teacher_id
         WHERE c.org_id = $1`,
          [DEMO_ORG],
        );

        const schedules: any[] = [];
        schedRes.rows.forEach((r: any) => {
          const scheduleArr = Array.isArray(r.schedule) ? r.schedule : [];
          scheduleArr.forEach((s: any) => {
            if (!s) return;
            const dayMatch =
              s.day === targetDay ||
              s.day === dayNames[targetDay] ||
              s.day === dayNames[targetDay] + "요일";
            if (!dayMatch) return;
            schedules.push({
              id: `${r.id}-${s.start_time || ""}`,
              class_id: r.id,
              class_name: r.name,
              lesson_time:
                s.start_time && s.end_time
                  ? `${s.start_time}-${s.end_time}`
                  : "",
              teacher_name: r.teacher_name || "",
              teacher_id: r.teacher_id,
              class_type: s.class_type || "1:다수",
              students: s.students || [],
            });
          });
        });

        return {
          lessons,
          stats: {
            monthlyProgressData: monthly.rows.map((r: any) => ({
              month: r.month,
              planned: r.lessons, // 계획 데이터 없으므로 동일 값 사용
              lessons: r.lessons,
            })),
            comprehensionTrendData: comp.rows.map((r: any) => ({
              week: r.week,
              high: r.high,
              medium: r.medium,
              low: r.low,
            })),
          },
          schedules,
        };
      },
    );

    return c.json({
      lessons,
      scheduledClasses: schedules,
      monthlyProgressData: stats.monthlyProgressData,
      comprehensionTrendData: stats.comprehensionTrendData,
    });
  } catch (error: any) {
    console.error("[lessons] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/lessons
 * expects lesson form payload
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      class_id = null,
      teacher_id = null,
      student_id = null,
      lesson_date,
      lesson_time = "",
      duration_minutes = null,
      subject = "",
      content = "",
      student_attitudes = "",
      comprehension_level = "medium",
      homework_assigned = "",
      next_lesson_plan = "",
      parent_feedback = "",
      director_feedback = "",
      final_message = "",
      notification_sent = false,
      attendance = [],
      homework_submissions = {},
    } = body || {};

    if (!lesson_date) return c.json({ error: "lesson_date is required" }, 400);

    const lesson = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        INSERT INTO lessons (
          org_id, class_id, teacher_id, student_id,
          lesson_date, lesson_time, duration_minutes,
          subject, content, student_attitudes, comprehension_level,
          homework_assigned, next_lesson_plan, parent_feedback, director_feedback,
          final_message, notification_sent, attendance, homework_submissions
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        RETURNING *
        `,
        [
          DEMO_ORG,
          class_id,
          teacher_id,
          student_id,
          lesson_date,
          lesson_time,
          duration_minutes,
          subject,
          content,
          student_attitudes,
          comprehension_level,
          homework_assigned,
          next_lesson_plan,
          parent_feedback,
          director_feedback,
          final_message,
          notification_sent,
          attendance,
          homework_submissions,
        ],
      );

      const lessonData = rows[0] ? mapLesson(rows[0]) : null;

      // 수업 리포트 알림 발송 (notification_sent가 true인 경우)
      if (lessonData && notification_sent && student_id) {
        try {
          // 학생 정보 조회
          const studentRes = await client.query(
            `SELECT s.*, o.name as org_name, c.name as class_name
             FROM students s
             JOIN organizations o ON o.id = s.org_id
             LEFT JOIN classes c ON c.id = $1
             WHERE s.id = $2`,
            [class_id, student_id]
          );

          if (studentRes.rows[0]) {
            const student = studentRes.rows[0];
            const message = createLessonReportMessage(
              student.org_name,
              student.name,
              student.class_name || subject || "수업",
              lesson_date,
              content,
              homework_assigned
            );

            await sendNotification(client, c.env, {
              orgId: DEMO_ORG,
              orgName: student.org_name,
              studentId: student_id,
              studentName: student.name,
              type: "lesson_report",
              classId: class_id,
              className: student.class_name,
              recipientPhone: student.parent_phone,
              message,
              metadata: { lesson_id: lessonData.id, lesson_date, subject, content },
            });
          }
        } catch (notifError) {
          console.error("[lessons] notification error:", notifError);
          // 알림 실패해도 레슨 저장은 성공
        }
      }

      return lessonData;
    });

    return c.json({ lesson }, lesson ? 201 : 500);
  } catch (error: any) {
    console.error("[lessons] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
