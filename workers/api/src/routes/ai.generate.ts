import { Hono } from "hono";
import type { Env } from "../env";

const app = new Hono<{ Bindings: Env }>();

// Qwen3 30B model (FP8) - best for Korean language
const MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

interface GenerateRequest {
  type: "feedback" | "director_feedback" | "final_message" | "alimtalk_variables";
  lesson?: {
    student_name?: string;
    class_name?: string;
    date?: string;
    content?: string;
    topic?: string;
    homework?: string;
    notes?: string;
    // 선생님 피드백과 원장님 피드백 (final_message 생성 시 종합)
    teacher_feedback?: string;
    director_feedback?: string;
    // 기관 정보
    org_name?: string;
  };
  context?: string;
}

// 뿌리오 알림톡 변수 (각 50자 이하)
interface AlimtalkVariables {
  수업요약: string;      // 오늘 배운 핵심 내용
  학습포인트: string;    // 집중한 학습 포인트
  선생님코멘트: string;  // 격려/칭찬 메시지
  원장님코멘트: string;  // 응원 메시지
  숙제내용: string;      // 구체적 숙제
  복습팁: string;        // 가정학습 조언
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
    } else if (type === "director_feedback") {
      // 원장님 피드백 생성 (선생님 피드백을 참고하여 보완적인 피드백 작성)
      systemPrompt = `당신은 학원/교습소 원장님으로서 학부모님께 보내는 추가 피드백 메시지를 작성하는 전문가입니다.
선생님의 피드백을 보완하여, 원장님 관점에서 학생의 전반적인 학습 태도, 성장 가능성, 앞으로의 방향성을 따뜻하게 전달합니다.
반드시 한국어로만 응답하세요.
설명, 사고 과정, 분석, 영어 문장은 절대 출력하지 마세요.
완성된 피드백 메시지만 바로 출력하세요.

피드백 형식:
- 원장님의 따뜻하고 격려하는 어조
- 학생의 장점과 성장 가능성을 강조
- 선생님 피드백과 중복되지 않는 보완적인 관점 제시
- 학원 차원에서의 지원이나 격려 메시지 포함
- 분량: 150~250자 내외`;

      prompt = `아래 정보를 바탕으로 원장님이 학부모님께 보내는 추가 피드백 메시지를 한국어 존댓말로 바로 작성하세요.
선생님 피드백이 있다면 참고하되, 중복되지 않는 원장님만의 관점으로 작성해주세요.
사고 과정이나 설명 없이, 완성된 메시지만 출력하세요.

수업 반: ${lesson?.class_name || ""}
수업일: ${lesson?.date || ""}
수업 내용 요약: ${lesson?.content || "수업 진행"}
${lesson?.topic ? `오늘의 주요 학습 주제: ${lesson.topic}` : ""}
${lesson?.homework ? `숙제 내용: ${lesson.homework}` : ""}
${lesson?.notes ? `학생 특이 사항: ${lesson.notes}` : ""}
${lesson?.teacher_feedback ? `선생님 피드백 (참고용): ${lesson.teacher_feedback}` : ""}`;
    } else if (type === "final_message") {
      const orgName = lesson?.org_name || "학원";

      systemPrompt = `당신은 학원/교습소에서 학부모님께 보내는 수업일지 카카오톡 메시지를 작성하는 전문가입니다.
학부모님이 자녀의 수업 상황을 충분히 이해하시고 안심하실 수 있도록, 따뜻하고 상세한 메시지를 작성합니다.

[중요 규칙]
1. 반드시 한국어로만 응답하세요.
2. 설명, 사고 과정, 분석, 영어 문장은 절대 출력하지 마세요.
3. 완성된 수업일지 메시지만 바로 출력하세요.
4. 메시지는 "학부모님"께 보내는 것입니다. "학생님 안녕하세요"가 아닙니다!
5. 학생 이름은 정확히 {{학생명}}으로 표기하세요 (시스템이 자동으로 실제 이름으로 치환합니다)
6. 본문에서 학생을 언급할 때는 반드시 "{{학생명}} 학생은", "{{학생명}} 학생이"처럼 이름 뒤에 "학생"을 붙이세요. "{{학생명}}은"처럼 이름만 단독으로 사용하지 마세요!

메시지 구성:
1. 헤더: [${orgName}] 수업일지
2. 인사말: "{{학생명}} 학부모님 안녕하세요." (반드시 학부모님!)
3. 수업 내용: 오늘 수업에서 다룬 내용 (3-4문장)
4. 선생님 피드백: 선생님이 관찰한 학생의 모습 (2-3문장) - "{{학생명}} 학생은"으로 시작
5. 원장님 말씀: 원장님의 격려 메시지 (2-3문장, 있는 경우)
6. 숙제 안내: 숙제가 있으면 명확히 안내
7. 가정 학습 팁: 복습 관련 간단한 조언 (1-2문장)
8. 마무리: 감사 인사

형식:
- 줄바꿈으로 각 섹션 구분
- 이모지 사용 금지
- 분량: 500~800자`;

      // 피드백 정보 구성
      let feedbackInfo = "";
      if (lesson?.teacher_feedback) {
        feedbackInfo += `\n\n[선생님 피드백 - 반드시 요약하여 포함]\n${lesson.teacher_feedback}`;
      }
      if (lesson?.director_feedback) {
        feedbackInfo += `\n\n[원장님 피드백 - 반드시 요약하여 포함]\n${lesson.director_feedback}`;
      }

      prompt = `아래 정보로 학부모님께 보내는 수업일지 카카오톡 메시지를 작성하세요.

[필수 규칙]
- 메시지 첫 줄: "[${orgName}] 수업일지"로 시작
- 두 번째 줄: "{{학생명}} 학부모님 안녕하세요."로 시작 (반드시 학부모님!)
- 학생 이름은 반드시 {{학생명}}으로 표기 (이중 중괄호 포함)
- 본문에서 학생을 언급할 때도 {{학생명}}으로 표기
- 학생에게 보내는 메시지가 아닙니다! 학부모님께 보내는 메시지입니다!

===== 기본 정보 =====
기관명: ${orgName}
수업 반: ${lesson?.class_name || ""}
수업일: ${lesson?.date || ""}

===== 수업 내용 =====
${lesson?.content || "수업 진행"}
${lesson?.topic ? `주요 학습 주제: ${lesson.topic}` : ""}

===== 학생 태도/특이사항 =====
${lesson?.notes || "특이사항 없음"}

===== 숙제 =====
${lesson?.homework || "숙제 없음"}${feedbackInfo}

위 내용을 종합하여 500~800자 메시지를 작성하세요.
학생 이름 부분은 반드시 {{학생명}}으로 표기하세요!`;
    } else if (type === "alimtalk_variables") {
      // 뿌리오 알림톡용 변수 생성 (각 50자 이하)
      const orgName = lesson?.org_name || "학원";

      // 엄격한 50자 제한 프롬프트
      systemPrompt = `You are a JSON generator for Korean lesson reports. OUTPUT ONLY VALID JSON.

CRITICAL RULES:
1. Each value MUST be UNDER 45 Korean characters (NOT 50, leave margin)
2. Each sentence MUST be COMPLETE - end with 요/다/세요/니다
3. NEVER use "..." or cut off mid-sentence
4. Keep it short but meaningful
5. If no director feedback provided: 원장님코멘트 = ""
6. Warm, encouraging tone in Korean

Output format (copy exactly, fill values):
{"수업요약":"","학습포인트":"","선생님코멘트":"","원장님코멘트":"","숙제내용":"","복습팁":""}`;

      // 피드백 정보 구성
      let feedbackInfo = "";
      if (lesson?.teacher_feedback) {
        feedbackInfo += `\n선생님 피드백: ${lesson.teacher_feedback}`;
      }
      if (lesson?.director_feedback) {
        feedbackInfo += `\n원장님 피드백: ${lesson.director_feedback}`;
      }

      prompt = `Generate JSON for this lesson (each value UNDER 45 chars, complete sentences):

수업반: ${lesson?.class_name || "수업"}
내용: ${lesson?.content || "수업 진행"}
숙제: ${lesson?.homework || "없음"}${feedbackInfo}

Remember: MAX 45 characters per value, complete sentences only!`;
    } else {
      return c.json({ error: "Invalid type. Use 'feedback', 'director_feedback', 'final_message', or 'alimtalk_variables'" }, 400);
    }

    // final_message와 alimtalk_variables는 더 긴 응답이 필요
    const maxTokens = type === "final_message" ? 1536 : type === "alimtalk_variables" ? 1500 : 512;

    // alimtalk_variables는 temperature 0으로 일관된 JSON 출력
    const temp = type === "alimtalk_variables" ? 0 : 0.7;

    // @ts-ignore - Qwen3 model not in AiModels type definition
    const response = await ai.run(MODEL, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: temp,
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

    // alimtalk_variables 타입일 때 JSON 파싱 및 50자 검증
    if (type === "alimtalk_variables") {
      try {
        // JSON 추출 (앞뒤 불필요한 텍스트 제거)
        let jsonText = generatedText;

        // 첫 번째 { 찾기
        const firstBrace = jsonText.indexOf('{');
        // 마지막 } 찾기
        const lastBrace = jsonText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        }

        console.log("[ai/generate] Extracted JSON:", jsonText.slice(0, 200));

        const variables = JSON.parse(jsonText) as AlimtalkVariables;

        // 빈 문자열 처리 (undefined/null을 ""로)
        const safeString = (text: string | undefined): string => {
          return text?.trim() || "";
        };

        const validatedVariables: AlimtalkVariables = {
          수업요약: safeString(variables.수업요약),
          학습포인트: safeString(variables.학습포인트),
          선생님코멘트: safeString(variables.선생님코멘트),
          원장님코멘트: safeString(variables.원장님코멘트),
          숙제내용: safeString(variables.숙제내용),
          복습팁: safeString(variables.복습팁),
        };

        // 길이 검증 결과 로깅 (50자 초과 시 경고)
        const lengths = Object.entries(validatedVariables).map(([k, v]) => {
          const warning = v.length > 50 ? " ⚠️" : "";
          return `${k}: ${v.length}자${warning}`;
        });
        console.log("[ai/generate] alimtalk_variables lengths:", lengths.join(", "));

        return c.json({
          success: true,
          type,
          variables: validatedVariables,
          model: MODEL,
        });
      } catch (parseError) {
        console.error("[ai/generate] JSON parse error:", parseError, "Text:", generatedText);
        return c.json({
          error: "Failed to parse AI response as JSON",
          debug: generatedText.slice(0, 300)
        }, 500);
      }
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
    types: ["feedback", "director_feedback", "final_message", "alimtalk_variables"],
    description: "AI text generation for lesson notes",
  });
});

export default app;
