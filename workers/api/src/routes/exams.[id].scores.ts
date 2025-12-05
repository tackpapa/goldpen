/**
 * 시험 점수 API
 * - POST: 점수 등록 + 알림 발송
 * - GET: 시험별 점수 목록 조회
 */
import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { insertNotificationQueueBatch, type NotificationQueuePayload } from "../lib/notifications";

const app = new Hono<{ Bindings: Env }>();

const mapScore = (row: any) => ({
  id: row.id,
  exam_id: row.exam_id,
  student_id: row.student_id,
  score: row.score,
  rank: row.rank,
  feedback: row.feedback,
  created_at: row.created_at,
  student_name: row.student_name,
});

/**
 * GET /api/exams/:id/scores
 * 시험별 점수 목록 조회
 */
app.get("/", async (c) => {
  const examId = c.req.param("id");
  try {
    const scores = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT es.*, s.name as student_name
         FROM exam_scores es
         JOIN students s ON s.id = es.student_id
         WHERE es.exam_id = $1
         ORDER BY es.score DESC, s.name ASC`,
        [examId]
      );
      return rows.map(mapScore);
    });

    return c.json({ scores });
  } catch (error: any) {
    console.error("[exams/:id/scores] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/exams/:id/scores
 * 점수 등록 (단일 또는 일괄)
 * body: { scores: [{ student_id, score, feedback? }], send_notification?: boolean }
 * 또는: { student_id, score, feedback?, send_notification?: boolean }
 */
app.post("/", async (c) => {
  const examId = c.req.param("id");
  try {
    const body = await c.req.json();

    // 단일 점수 또는 일괄 점수 처리
    const scoresInput = body.scores || [body];
    const sendNotificationFlag = body.send_notification ?? true;

    if (!scoresInput.length || !scoresInput[0]?.student_id) {
      return c.json({ error: "student_id and score are required" }, 400);
    }

    const results = await withClient(c.env, async (client) => {
      // 시험 정보 조회
      const examRes = await client.query(
        `SELECT e.*, o.name as org_name
         FROM exams e
         JOIN organizations o ON o.id = e.org_id
         WHERE e.id = $1`,
        [examId]
      );

      if (!examRes.rows[0]) {
        throw new Error("Exam not found");
      }

      const exam = examRes.rows[0];
      const savedScores: any[] = [];

      // 점수 등록
      for (const scoreData of scoresInput) {
        // notes도 지원 (프론트엔드 호환성)
        const { student_id, score, feedback, notes } = scoreData;
        const finalFeedback = feedback || notes || null;

        // 기존 점수 확인 (UPSERT)
        const { rows } = await client.query(
          `INSERT INTO exam_scores (exam_id, student_id, score, feedback)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (exam_id, student_id)
           DO UPDATE SET score = $3, feedback = $4
           RETURNING *`,
          [examId, student_id, score, finalFeedback]
        );

        if (rows[0]) {
          savedScores.push(rows[0]);
        }
      }

      // 전체 등수 계산 (점수 내림차순)
      const allScoresRes = await client.query(
        `SELECT id, student_id, score,
                RANK() OVER (ORDER BY score DESC) as rank
         FROM exam_scores
         WHERE exam_id = $1`,
        [examId]
      );

      const totalStudents = allScoresRes.rows.length;

      // 등수 업데이트
      for (const row of allScoresRes.rows) {
        await client.query(
          `UPDATE exam_scores SET rank = $1 WHERE id = $2`,
          [row.rank, row.id]
        );
      }

      // 알림 발송 (새로 등록된 점수만)
      // notification_queue에 추가하면 Queue Worker가 1분 내에 처리
      if (sendNotificationFlag && savedScores.length > 0) {
        try {
          // 배치로 notification_queue에 추가
          const queueItems: NotificationQueuePayload[] = savedScores.map((scoreRow: any) => {
            // 해당 학생의 등수 조회
            const rankRow = allScoresRes.rows.find(
              (r: any) => r.student_id === scoreRow.student_id
            );

            return {
              student_id: scoreRow.student_id,
              exam_id: examId,
              exam_title: exam.title,
              score: scoreRow.score,
              total_score: exam.max_score || 100,
              rank: rankRow?.rank,
              total_students: totalStudents,
            };
          });

          if (queueItems.length > 0) {
            const result = await insertNotificationQueueBatch(
              client,
              exam.org_id,
              'exam_result',
              queueItems
            );
            console.log(`[exams/:id/scores] Queued ${result.insertedCount}/${queueItems.length} notifications`);
          }
        } catch (notifError) {
          console.error("[exams/:id/scores] notification queue error:", notifError);
          // 알림 실패해도 점수 저장은 성공
        }
      }

      // 최종 점수 목록 반환
      const finalScores = await client.query(
        `SELECT es.*, s.name as student_name
         FROM exam_scores es
         JOIN students s ON s.id = es.student_id
         WHERE es.exam_id = $1
         ORDER BY es.score DESC, s.name ASC`,
        [examId]
      );

      return finalScores.rows.map(mapScore);
    });

    return c.json({ scores: results }, 201);
  } catch (error: any) {
    console.error("[exams/:id/scores] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/exams/:id/scores/notify
 * 이미 저장된 점수에 대해 알림톡만 발송
 * body: { student_ids?: string[] } - 특정 학생만 발송할 경우, 없으면 전체 발송
 */
app.post("/notify", async (c) => {
  const examId = c.req.param("id");
  try {
    const body = await c.req.json().catch(() => ({}));
    const studentIds: string[] | undefined = body.student_ids;

    const result = await withClient(c.env, async (client) => {
      // 시험 정보 조회
      const examRes = await client.query(
        `SELECT e.*, o.name as org_name
         FROM exams e
         JOIN organizations o ON o.id = e.org_id
         WHERE e.id = $1`,
        [examId]
      );

      if (!examRes.rows[0]) {
        throw new Error("Exam not found");
      }

      const exam = examRes.rows[0];

      // 저장된 점수 조회 (등수 포함)
      let scoresQuery = `
        SELECT es.*, s.name as student_name,
               RANK() OVER (ORDER BY es.score DESC) as rank,
               COUNT(*) OVER () as total_students
        FROM exam_scores es
        JOIN students s ON s.id = es.student_id
        WHERE es.exam_id = $1
      `;
      const queryParams: any[] = [examId];

      // 특정 학생만 필터링
      if (studentIds && studentIds.length > 0) {
        scoresQuery += ` AND es.student_id = ANY($2)`;
        queryParams.push(studentIds);
      }

      const scoresRes = await client.query(scoresQuery, queryParams);

      if (scoresRes.rows.length === 0) {
        return { queued: 0, message: "발송할 점수가 없습니다" };
      }

      const totalStudents = parseInt(scoresRes.rows[0].total_students) || scoresRes.rows.length;

      // notification_queue에 배치 추가
      const queueItems: NotificationQueuePayload[] = scoresRes.rows.map((row: any) => ({
        student_id: row.student_id,
        exam_id: examId,
        exam_title: exam.title,
        score: row.score,
        total_score: exam.max_score || 100,
        rank: row.rank,
        total_students: totalStudents,
      }));

      const insertResult = await insertNotificationQueueBatch(
        client,
        exam.org_id,
        'exam_result',
        queueItems
      );

      console.log(`[exams/:id/scores/notify] Queued ${insertResult.insertedCount}/${queueItems.length} notifications`);

      return {
        queued: insertResult.insertedCount,
        total: queueItems.length,
        message: `${insertResult.insertedCount}명에게 알림이 예약되었습니다. 1분 내에 발송됩니다.`,
      };
    });

    return c.json(result, 200);
  } catch (error: any) {
    console.error("[exams/:id/scores/notify] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/exams/:id/scores/:scoreId
 * 개별 점수 삭제
 */
app.delete("/:scoreId", async (c) => {
  const examId = c.req.param("id");
  const scoreId = c.req.param("scoreId");

  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM exam_scores WHERE id = $1 AND exam_id = $2`,
        [scoreId, examId]
      );
      return rowCount;
    });

    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true });
  } catch (error: any) {
    console.error("[exams/:id/scores] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
