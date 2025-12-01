// 이메일 초대 발송 유틸리티
// Resend API를 사용하여 초대 이메일을 발송합니다.

const RESEND_API_KEY = process.env.RESEND_API_KEY

interface InvitationEmailParams {
  to: string
  orgName: string
  role: string
  token: string
  inviterName?: string
  expiresAt: string
}

const roleLabels: Record<string, string> = {
  owner: '관리자',
  manager: '매니저',
  teacher: '강사'
}

// Resend API 응답 타입 정의
interface ResendApiResponse {
  id?: string
  message?: string
}

// 초대 이메일 HTML 템플릿 생성
function generateInvitationEmailHtml(params: InvitationEmailParams): string {
  const { orgName, role, token, inviterName, expiresAt } = params
  const roleLabel = roleLabels[role] || role
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://goldpen.kr'}/invite/${token}`
  const expiresDate = new Date(expiresAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${orgName} 팀 초대</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- 헤더 -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #eee;">
              <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px 24px; border-radius: 8px;">
                <span style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 1px;">GoldPen</span>
              </div>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center;">
                🎉 ${orgName}에 초대되었습니다!
              </h1>

              ${inviterName ? `
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #666; text-align: center;">
                <strong>${inviterName}</strong>님이 회원님을 팀에 초대했습니다.
              </p>
              ` : ''}

              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #666; font-size: 14px;">기관</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${orgName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #666; font-size: 14px;">역할</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="display: inline-block; background-color: #e8f4fd; color: #1976d2; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500;">
                        ${roleLabel}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #666; font-size: 14px;">유효기간</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="color: #1a1a1a; font-size: 14px;">${expiresDate}까지</span>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0 0 24px 0; font-size: 15px; color: #666; line-height: 1.6; text-align: center;">
                아래 버튼을 클릭하여 초대를 수락하고<br/>
                계정을 생성해 주세요.
              </p>

              <!-- CTA 버튼 -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${inviteUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                  초대 수락하기
                </a>
              </div>

              <p style="margin: 0; font-size: 13px; color: #999; text-align: center;">
                버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #667eea; text-align: center; word-break: break-all;">
                ${inviteUrl}
              </p>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #999; text-align: center;">
                본 이메일은 ${orgName}의 관리자가 발송한 초대 이메일입니다.
              </p>
              <p style="margin: 0; font-size: 13px; color: #999; text-align: center;">
                초대를 요청하지 않았다면 이 이메일을 무시해 주세요.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #bbb; text-align: center;">
                © ${new Date().getFullYear()} GoldPen. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// 초대 이메일 텍스트 버전 생성
function generateInvitationEmailText(params: InvitationEmailParams): string {
  const { orgName, role, token, inviterName, expiresAt } = params
  const roleLabel = roleLabels[role] || role
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://goldpen.kr'}/invite/${token}`
  const expiresDate = new Date(expiresAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `
${orgName}에 초대되었습니다!

${inviterName ? `${inviterName}님이 회원님을 팀에 초대했습니다.\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 초대 정보
• 기관: ${orgName}
• 역할: ${roleLabel}
• 유효기간: ${expiresDate}까지

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

아래 링크를 클릭하여 초대를 수락하고 계정을 생성해 주세요:

${inviteUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

본 이메일은 ${orgName}의 관리자가 발송한 초대 이메일입니다.
초대를 요청하지 않았다면 이 이메일을 무시해 주세요.

© ${new Date().getFullYear()} GoldPen. All rights reserved.
`
}

// Resend API로 이메일 발송
export async function sendInvitationEmail(params: InvitationEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error('[Email] RESEND_API_KEY가 설정되지 않았습니다')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  const { to, orgName, role } = params
  const roleLabel = roleLabels[role] || role

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'GoldPen <noreply@goldpen.kr>',
        to: [to],
        subject: `[GoldPen] ${orgName}에서 ${roleLabel}(으)로 초대했습니다`,
        html: generateInvitationEmailHtml(params),
        text: generateInvitationEmailText(params)
      })
    })

    const data = await response.json() as ResendApiResponse

    if (!response.ok) {
      console.error('[Email] Resend API 에러:', data)
      return { success: false, error: data.message || 'Email send failed' }
    }

    return { success: true, messageId: data.id }
  } catch (error) {
    console.error('[Email] 이메일 발송 실패:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// 이메일 내용 미리보기 (디버깅용)
export function previewInvitationEmail(params: InvitationEmailParams): { html: string; text: string; subject: string } {
  const roleLabel = roleLabels[params.role] || params.role
  return {
    html: generateInvitationEmailHtml(params),
    text: generateInvitationEmailText(params),
    subject: `[GoldPen] ${params.orgName}에서 ${roleLabel}(으)로 초대했습니다`
  }
}
