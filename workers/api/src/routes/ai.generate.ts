import { Hono } from "hono";
import type { Env } from "../env";

const app = new Hono<{ Bindings: Env }>();

// Qwen3 30B model (FP8) - best for Korean language
const MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

interface GenerateRequest {
  type: "feedback" | "final_message";
  lesson?: {
    student_name?: string;
    class_name?: string;
    date?: string;
    content?: string;
    topic?: string;
    homework?: string;
    notes?: string;
  };
  context?: string;
}

/**
 * POST /api/ai/generate
 * Generate AI feedback or final message for lesson notes
 */
app.post("/", async (c) => {
  try {
    const ai = c.env.AI;
    if (!ai) {
      return c.json({ error: "AI binding not configured" }, 500);
    }

    const body = await c.req.json<GenerateRequest>();
    const { type, lesson, context } = body;

    if (!type) {
      return c.json({ error: "type is required (feedback or final_message)" }, 400);
    }

    let prompt: string;
    let systemPrompt: string;

    if (type === "feedback") {
      systemPrompt = `당신은 학원/교습소에서 학부모님께 보내는 수업 피드백 메시지를 따뜻하게 작성하는 전문가입니다.
항상 학부모님이 안심하시고 미소 지으실 수 있도록, 친절하고 공감 어린 존댓말을 사용합니다.
반드시 한국어로만 응답하세요.
설명, 사고 과정, 분석, 영어 문장은 절대 출력하지 마세요.
완성된 피드백 메시지만 바로 출력하세요.

피드백 형식:
- 전체적으로 따뜻하고 긍정적인 어조
- 학생의 노력·장점·성장 과정을 구체적으로 인정
- 오늘 수업에서 다룬 핵심 학습 내용을 1–2문장으로 언급
- 필요하다면 가정에서 도와주실 간단한 한 줄 제안 포함 (예: "집에서는 오늘 배운 ○○만 한 번 더 읽어봐 주세요.")
- 분량: 200~300자 내외`;

      prompt = `아래 정보를 바탕으로 학부모님께 보내는 수업 피드백 메시지를 한국어 존댓말로 바로 작성하세요.
사고 과정이나 설명 없이, 완성된 메시지만 출력하세요.

학생 이름: ${lesson?.student_name || "학생"}
수업 반: ${lesson?.class_name || ""}
수업일: ${lesson?.date || ""}
수업 내용 요약: ${lesson?.content || "수업 진행"}
${lesson?.topic ? `오늘의 주요 학습 주제: ${lesson.topic}` : ""}
${lesson?.homework ? `숙제 내용: ${lesson.homework}` : ""}
${lesson?.notes ? `추가 메모(칭찬할 점/특이 사항 등): ${lesson.notes}` : ""}`;
    } else if (type === "final_message") {
      systemPrompt = `당신은 학원/교습소에서 학부모님께 보내는 수업 안내/마무리 카카오톡 메시지를 작성하는 전문가입니다.
학부모님이 부담 없이 읽으실 수 있도록, 정중하면서도 따뜻하고 친근한 어조로 작성합니다.
반드시 한국어로만 응답하세요.
설명, 사고 과정, 분석, 영어 문장은 절대 출력하지 마세요.
완성된 안내 메시지만 바로 출력하세요.

메시지 형식:
- 정중하지만 너무 딱딱하지 않은, 부드러운 존댓말
- 오늘 수업 내용과 분위기를 짧게 요약
- 숙제나 확인 사항을 알기 쉽게 안내
- 끝에는 감사 인사나 따뜻한 한 줄 포함
- 분량: 150~250자 내외
- 카카오톡 문자 형식으로 자연스럽게 작성`;

      prompt = `아래 정보를 바탕으로 학부모님께 보내는 수업 안내 카카오톡 메시지를 한국어로 바로 작성하세요.
사고 과정이나 설명 없이, 완성된 메시지만 출력하세요.

학생 이름: ${lesson?.student_name || "학생"}
수업 반: ${lesson?.class_name || ""}
수업일: ${lesson?.date || ""}
수업 내용 요약: ${lesson?.content || "수업 진행"}
${lesson?.topic ? `오늘의 주요 학습 주제: ${lesson.topic}` : ""}
${lesson?.homework ? `숙제 내용: ${lesson.homework}` : ""}`;
    } else {
      return c.json({ error: "Invalid type. Use 'feedback' or 'final_message'" }, 400);
    }

    // @ts-ignore - Qwen3 model not in AiModels type definition
    const response = await ai.run(MODEL, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 512,
      temperature: 0.7,
      // Disable reasoning mode to get direct response in content field
      thinking: false,
    }) as Record<string, unknown>;

    console.log("[ai/generate] Raw response:", JSON.stringify(response));

    // Extract the generated text from various possible response formats
    let generatedText = "";
    if (typeof response === "string") {
      generatedText = response;
    } else if (response && typeof response === "object") {
      // Check common response formats
      if ("response" in response && typeof response.response === "string") {
        generatedText = response.response;
      } else if ("result" in response && typeof response.result === "object" && response.result !== null) {
        const result = response.result as Record<string, unknown>;
        if ("response" in result && typeof result.response === "string") {
          generatedText = result.response;
        }
      } else if ("text" in response && typeof response.text === "string") {
        generatedText = response.text;
      } else if ("content" in response && typeof response.content === "string") {
        generatedText = response.content;
      } else if ("choices" in response && Array.isArray(response.choices) && response.choices.length > 0) {
        const choice = response.choices[0] as Record<string, unknown>;
        if (choice.message && typeof choice.message === "object") {
          const message = choice.message as Record<string, unknown>;
          // Check content first
          if (typeof message.content === "string" && message.content) {
            generatedText = message.content;
          }
          // Qwen3 reasoning models put response in reasoning_content
          else if (typeof message.reasoning_content === "string" && message.reasoning_content) {
            // Extract actual response from reasoning content (usually at the end)
            const reasoning = message.reasoning_content;
            // Look for the final answer after reasoning
            const lines = reasoning.split('\n');
            // Get the last substantial content
            generatedText = lines.filter((l: string) => l.trim().length > 10).slice(-3).join('\n').trim();
            if (!generatedText) {
              generatedText = reasoning.slice(-500).trim();
            }
          }
        } else if (typeof choice.text === "string") {
          generatedText = choice.text;
        }
      }
    }

    if (!generatedText) {
      console.error("[ai/generate] Could not extract text from response:", response);
      return c.json({
        error: "Could not parse AI response",
        debug: JSON.stringify(response).slice(0, 500)
      }, 500);
    }

    return c.json({
      success: true,
      type,
      text: generatedText.trim(),
      model: MODEL,
    });
  } catch (error: unknown) {
    console.error("[ai/generate] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/ai/generate - Health check
 */
app.get("/", (c) => {
  return c.json({
    status: "ok",
    model: MODEL,
    types: ["feedback", "final_message"],
    description: "AI text generation for lesson notes",
  });
});

export default app;
