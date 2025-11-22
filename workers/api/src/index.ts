import { Hono } from "hono";
import type { Env } from "./env";
import { cors } from "./middleware/cors";
import { logger } from "./middleware/logger";

// Import all routes
import attendance_id from "./routes/attendance.[id";
import attendance from "./routes/attendance";
import auth_login from "./routes/auth.login";
import auth_logout from "./routes/auth.logout";
import auth_me from "./routes/auth.me";
import auth_register from "./routes/auth.register";
import billing_id from "./routes/billing.[id";
import billing from "./routes/billing";
import classes_id from "./routes/classes.[id";
import classes from "./routes/classes";
import consultations_id from "./routes/consultations.[id";
import consultations from "./routes/consultations";
import exams_id from "./routes/exams.[id";
import exams from "./routes/exams";
import expenses_id from "./routes/expenses.[id";
import expenses from "./routes/expenses";
import teacher_salaries from "./routes/teacher_salaries";
import homework_id from "./routes/homework.[id";
import homework from "./routes/homework";
import lessons_id from "./routes/lessons.[id";
import lessons from "./routes/lessons";
import migrate from "./routes/migrate";
import overview from "./routes/overview";
import rooms_id from "./routes/rooms.[id";
import rooms from "./routes/rooms";
import schedules_id from "./routes/schedules.[id";
import schedules from "./routes/schedules";
import seats_status from "./routes/seats.status";
import seats_id from "./routes/seats.[id";
import seats from "./routes/seats";
import settings from "./routes/settings";
import students_id from "./routes/students.[id";
import students from "./routes/students";
import teachers_id from "./routes/teachers.[id";
import teachers from "./routes/teachers";
import teachers_overview from "./routes/teachers.overview";
import teachers_assign_students from "./routes/teachers.assign-students.[id";
import teachers_modal from "./routes/teachers.modal.[id";
import test_env from "./routes/test_env";

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", logger());
app.use("*", cors());

// Health check
app.get("/", (c) => {
  return c.json({
    name: "Goldpen API Workers",
    version: "1.0.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
    routes: 37,
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// API Routes (34개 전체)
app.route("/api/attendance/:id", attendance_id);
app.route("/api/attendance", attendance);
app.route("/api/auth/login", auth_login);
app.route("/api/auth/logout", auth_logout);
app.route("/api/auth/me", auth_me);
app.route("/api/auth/register", auth_register);
app.route("/api/billing/:id", billing_id);
app.route("/api/billing", billing);
app.route("/api/classes/:id", classes_id);
app.route("/api/classes", classes);
app.route("/api/consultations/:id", consultations_id);
app.route("/api/consultations", consultations);
app.route("/api/exams/:id", exams_id);
app.route("/api/exams", exams);
app.route("/api/expenses/:id", expenses_id);
app.route("/api/expenses", expenses);
app.route("/api/teacher_salaries", teacher_salaries);
app.route("/api/homework/:id", homework_id);
app.route("/api/homework", homework);
app.route("/api/lessons/:id", lessons_id);
app.route("/api/lessons", lessons);
app.route("/api/migrate", migrate);
app.route("/api/overview", overview);
app.route("/api/rooms/:id", rooms_id);
app.route("/api/rooms", rooms);
app.route("/api/schedules/:id", schedules_id);
app.route("/api/schedules", schedules);
app.route("/api/seats/status", seats_status);
app.route("/api/seats/:id", seats_id);
app.route("/api/seats", seats);
app.route("/api/settings", settings);
app.route("/api/students/:id", students_id);
app.route("/api/students", students);
app.route("/api/teachers/overview", teachers_overview);
app.route("/api/teachers/:id/assign-students", teachers_assign_students);
app.route("/api/teachers/:id/modal", teachers_modal);
app.route("/api/teachers/:id", teachers_id);
app.route("/api/teachers", teachers);
app.route("/api/test-env", test_env);

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found", path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);

  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
      ...(c.env.ENVIRONMENT !== "production" && { stack: err.stack }),
    },
    500,
  );
});

export default app;
