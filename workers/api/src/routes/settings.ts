import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { getOrgIdFromRequest } from "../lib/supabase";

const app = new Hono<{ Bindings: Env }>();

const mapOrg = (row: any) => ({
  id: row.id,
  name: row.name,
  owner_name: row.owner_name,
  address: row.address,
  phone: row.phone,
  email: row.email,
  logo_url: row.logo_url,
  credit_balance: row.credit_balance || 0,
  settings: row.settings || {
    auto_sms: false,
    auto_email: false,
    notification_enabled: false,
  },
});

const mapBranch = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  name: row.name,
  address: row.address,
  phone: row.phone,
  manager_name: row.manager_name,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// GET /api/settings
app.get("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await withClient(c.env, async (client) => {
      const orgRes = await client.query(`SELECT * FROM organizations WHERE id = $1 LIMIT 1`, [orgId]);
      const org = orgRes.rows[0] ? mapOrg(orgRes.rows[0]) : null;

      const { rows: branchRows } = await client.query(
        `SELECT * FROM branches WHERE org_id = $1 ORDER BY created_at DESC`,
        [orgId],
      );
      const branches = branchRows.map(mapBranch);

      // rooms: map from classes as fallback
      const { rows: roomRows } = await client.query(
        `SELECT id, org_id, name, 0::int as capacity, subject as type, status, created_at, updated_at FROM classes WHERE org_id = $1`,
        [orgId],
      );
      const rooms = roomRows.map((r: any) => ({
        id: r.id,
        org_id: r.org_id,
        name: r.name,
        capacity: r.capacity,
        status: r.status,
      }));

      // 알림톡 이용내역 (message_logs에서 kakao_alimtalk 타입만)
      const { rows: alimtalkRows } = await client.query(
        `SELECT
          id,
          TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') as date,
          COALESCE(description, message_type) as type,
          description as recipient,
          recipient_count::int as count,
          total_price::int as cost,
          status,
          created_at
        FROM message_logs
        WHERE org_id = $1 AND message_type = 'kakao_alimtalk'
        ORDER BY created_at DESC
        LIMIT 100`,
        [orgId],
      );
      const kakaoTalkUsages = alimtalkRows.map((r: any) => ({
        id: r.id,
        date: r.date,
        type: r.type || '알림톡',
        recipient: r.recipient || '-',
        count: r.count || 1,
        cost: r.cost || 0,
        status: r.status === 'sent' ? 'success' : 'failed',
      }));

      // 기타 서비스 이용내역 (SMS 등)
      const { rows: serviceRows } = await client.query(
        `SELECT
          id,
          TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') as date,
          message_type as type,
          description,
          recipient_count::int as count,
          total_price::int as cost,
          status,
          created_at
        FROM message_logs
        WHERE org_id = $1 AND message_type != 'kakao_alimtalk'
        ORDER BY created_at DESC
        LIMIT 100`,
        [orgId],
      );
      const serviceUsages = serviceRows.map((r: any) => ({
        id: r.id,
        date: r.date,
        type: r.type === 'sms' ? 'SMS' : r.type,
        description: r.description || '-',
        count: r.count || 1,
        cost: r.cost || 0,
      }));

      // 알림톡 유형별 집계 (이번 달)
      const { rows: usageSummaryRows } = await client.query(
        `SELECT
          CASE
            WHEN description LIKE 'late:%' THEN '지각 알림'
            WHEN description LIKE 'absent:%' THEN '결석 알림'
            WHEN description LIKE 'checkin:%' THEN '등원 알림'
            WHEN description LIKE 'checkout:%' THEN '하원 알림'
            WHEN description LIKE 'study_out:%' THEN '외출 알림'
            WHEN description LIKE 'study_return:%' THEN '복귀 알림'
            WHEN description LIKE 'study_report:%' THEN '학습 리포트'
            WHEN description LIKE 'lesson_report:%' THEN '수업 리포트'
            WHEN description LIKE 'exam_result:%' THEN '시험 결과'
            WHEN description LIKE 'assignment:%' THEN '과제 알림'
            ELSE '기타 알림'
          END as notification_type,
          COUNT(*)::int as total_count,
          SUM(total_price)::int as total_cost
        FROM message_logs
        WHERE org_id = $1
          AND message_type = 'kakao_alimtalk'
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY
          CASE
            WHEN description LIKE 'late:%' THEN '지각 알림'
            WHEN description LIKE 'absent:%' THEN '결석 알림'
            WHEN description LIKE 'checkin:%' THEN '등원 알림'
            WHEN description LIKE 'checkout:%' THEN '하원 알림'
            WHEN description LIKE 'study_out:%' THEN '외출 알림'
            WHEN description LIKE 'study_return:%' THEN '복귀 알림'
            WHEN description LIKE 'study_report:%' THEN '학습 리포트'
            WHEN description LIKE 'lesson_report:%' THEN '수업 리포트'
            WHEN description LIKE 'exam_result:%' THEN '시험 결과'
            WHEN description LIKE 'assignment:%' THEN '과제 알림'
            ELSE '기타 알림'
          END
        ORDER BY total_count DESC`,
        [orgId],
      );
      const usageSummary = usageSummaryRows.map((r: any) => ({
        type: r.notification_type,
        count: r.total_count || 0,
        cost: r.total_cost || 0,
      }));

      // 충전/차감 내역 (credit_transactions)
      const { rows: transactionRows } = await client.query(
        `SELECT
          id,
          TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') as date,
          type,
          amount::int,
          balance_after::int,
          description
        FROM credit_transactions
        WHERE org_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
        [orgId],
      );
      const creditTransactions = transactionRows.map((r: any) => ({
        id: r.id,
        date: r.date,
        type: r.type,
        amount: r.amount,
        balanceAfter: r.balance_after,
        description: r.description || '-',
      }));

      return {
        organization: org,
        branches,
        rooms,
        kakaoTalkUsages,
        serviceUsages,
        usageSummary,
        creditTransactions,
      };
    });

    return c.json(data);
  } catch (error: any) {
    console.error("[settings] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/settings  (organization info + settings JSON)
app.put("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const fields = [
      "name",
      "owner_name",
      "address",
      "phone",
      "email",
      "logo_url",
      "settings",
    ];
    const setParts: string[] = [];
    const values: any[] = [];
    fields.forEach((f) => {
      if (body[f] !== undefined) {
        setParts.push(`${f} = $${setParts.length + 1}`);
        values.push(body[f]);
      }
    });

    if (!setParts.length) return c.json({ error: "No fields to update" }, 400);

    // Add orgId as the last parameter
    values.push(orgId);

    const updated = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE organizations SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0] ? mapOrg(rows[0]) : null;
    });

    if (!updated) return c.json({ error: "organization row missing" }, 404);
    return c.json({ organization: updated });
  } catch (error: any) {
    console.error("[settings] PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
