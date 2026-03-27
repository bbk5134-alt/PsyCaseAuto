# PsyCaseAuto — 진척 로그

> 최종 수정: 2026-03-27

---

## 인프라 결정 사항

### n8n 인스턴스 공유
- 기존 Wedding Schedule Automation 프로젝트와 **동일한 Railway n8n 인스턴스** 사용
- Railway 서비스를 새로 생성하지 않음 — 비용 절감, 관리 단일화

### Telegram 봇 토큰 분리
- 각 프로젝트마다 별도 Telegram Bot 사용 (BotFather에서 각각 생성)
- 환경변수 이름으로 구분:
  ```
  TELEGRAM_BOT_TOKEN_WEDDING=...   ← 기존 웨딩 프로젝트
  TELEGRAM_BOT_TOKEN_PSYCH=...     ← PsyCaseAuto (이 프로젝트)
  ```
- n8n Code 노드에서 접근: `$env.TELEGRAM_BOT_TOKEN_PSYCH`
- n8n Telegram 노드 사용 시: Credentials에 "PsyCaseAuto Bot" 별도 등록

---

## 세션별 작업 기록

### 세션 1A — 인프라 파일 생성 (2026-03-27)

#### 생성 파일

| 파일 | 설명 |
|------|------|
| `Dockerfile` | n8nio/n8n:latest 기반, FFmpeg 설치 포함 |
| `railway.toml` | startCommand, healthcheck 설정 |
| `.env.example` | 전체 환경변수 목록 (플레이스홀더) |
| `config/psych_terms_dictionary.json` | 정신과 용어 사전 v1.0 |

#### Dockerfile 핵심 내용
```dockerfile
FROM n8nio/n8n:latest
USER root
RUN apk add --no-cache ffmpeg   # STT 긴 녹음 청크 분할용
USER node
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_PORT=5678
ENV GENERIC_TIMEZONE=Asia/Seoul
ENV N8N_DEFAULT_BINARY_DATA_MODE=filesystem
ENV N8N_BLOCK_ENV_ACCESS_IN_NODE=false  # Code 노드에서 $env 사용 필수
EXPOSE 5678
```

#### psych_terms_dictionary.json 구성
- `medications`: 약물 13종 (SSRI, 기분안정제, 항정신병약, 수면제 등)
- `clinical_terms`: 임상 용어 20종 (한국어 ↔ 영어, 약어)
- `colloquial_to_clinical`: 구어체 → 임상 용어 매핑 18종

---

### 세션 1B — WF3 Error Workflow 생성 (2026-03-27)

#### 생성 파일

| 파일 | 설명 |
|------|------|
| `n8n_workflows/wf3_error_workflow.json` | n8n import 가능한 Error Workflow |

#### 워크플로우 구조
```
Error Trigger → 에러 메시지 구성 (Code) → Telegram 발송
  [240,300]         [480,300]               [720,300]
```

#### 노드 사양

| 노드 | type | typeVersion |
|------|------|-------------|
| Error Trigger | n8n-nodes-base.errorTrigger | 1 |
| 에러 메시지 구성 | n8n-nodes-base.code | 2 |
| Telegram 발송 | n8n-nodes-base.telegram | 1.2 |

#### Telegram 발송 노드 환경변수
```javascript
chatId: $env.TELEGRAM_ADMIN_CHAT_ID   // 관리자 chat ID
```

#### n8n import 후 필수 작업
1. Import → 워크플로우 URL에서 ID 확인 (예: `/workflow/12`)
2. Telegram 발송 노드 → Credentials → "PsyCaseAuto Bot" 선택
3. 워크플로우 활성화
4. `.env`의 `ERROR_WORKFLOW_ID` 에 확인한 ID 입력
5. WF1, WF2 Settings → Error Workflow → WF3 연결

---

## 현재 파일 구조

```
psychiatric interview automation/
├── Dockerfile
├── railway.toml
├── .env.example
├── .gitignore
├── config/
│   └── psych_terms_dictionary.json
├── n8n_workflows/
│   └── wf3_error_workflow.json          ← WF3 완료
├── plan & log/
│   ├── PROJECT_PLAN.md                  ← 전체 설계 문서 (Single Source of Truth)
│   ├── PROGRESS_LOG.md                  ← 이 파일
│   └── system_prompt_case_conference.md
```

---

### 세션 1C — Telegram 핑 테스트 & Google Drive 초기화 워크플로우 (2026-03-27)

#### 생성 파일

| 파일 | 설명 |
|------|------|
| `n8n_workflows/wf_telegram_ping_test.json` | Telegram 봇 연결 확인용 핑 테스트 |
| `n8n_workflows/wf_gdrive_init.json` | Google Drive 폴더 구조 1회 초기화 |

#### wf_telegram_ping_test 구조
```
Telegram Trigger → 입력 파싱 (Code) → ping 여부 (IF)
                                           ├─ true  → 응답 — pong
                                           └─ false → 응답 — unknown
```
- "ping" 수신 시 "pong 🟢 PsyCaseAuto 연결 확인됨 (HH:mm)" 응답
- 그 외 텍스트는 안내 메시지 응답
- maxConcurrency: 1

#### wf_gdrive_init 구조
```
수동 실행 → 루트 폴더 생성 (GoogleDrive) → 서브폴더 목록 (Code)
         → 배치 순회 (SplitInBatches)
              ├─ loop  → 서브폴더 생성 (GoogleDrive) → (배치 순회로 복귀)
              └─ done  → 완료 메시지 (Telegram)
```
- 생성 폴더: PsyCaseAuto/ → config/, PT-SAMPLE/
- 완료 후 Telegram으로 루트 폴더 ID 전송 (→ PATIENT_DRIVE_ROOT_FOLDER_ID 에 저장)
- 실행 후 비활성화할 것

#### import 후 필수 작업 (1C)
1. Telegram Trigger 노드 → Credentials → "PsyCaseAuto Telegram Bot" 선택
2. GoogleDrive 노드 → Credentials → "PsyCaseAuto Google Drive" 선택
3. wf_telegram_ping_test 활성화 → Telegram에서 `ping` 전송으로 검증
4. wf_gdrive_init 수동 실행 → Telegram으로 루트 폴더 ID 수신 → `.env`의 PATIENT_DRIVE_ROOT_FOLDER_ID 업데이트

---

## 다음 세션 예정 작업

| 순서 | 세션 | 내용 |
|------|------|------|
| 2 | WF1-A | 설문지 경로: Form Trigger → 입력 검증 → Google Drive JSON 저장 |
| 3 | WF1-B | 녹음 경로: Webhook → FFmpeg 청크 분할 → Whisper STT → 용어 교정 → Drive 저장 |
| 4 | WF2 | 보고서 생성: Telegram 트리거 → 12섹션 순차 생성 → DOCX → Drive → Telegram 응답 |

---

## 환경변수 전체 목록 (Railway Variables에 입력할 것)

```bash
# n8n 인증
N8N_BASIC_AUTH_USER=
N8N_BASIC_AUTH_PASSWORD=

# n8n 설정
N8N_ENCRYPTION_KEY=
GENERIC_TIMEZONE=Asia/Seoul
N8N_DEFAULT_BINARY_DATA_MODE=filesystem
N8N_BLOCK_ENV_ACCESS_IN_NODE=false

# AI API
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Telegram (PsyCaseAuto 전용)
TELEGRAM_BOT_TOKEN_PSYCH=
TELEGRAM_ADMIN_CHAT_ID=

# Google Drive
GOOGLE_DRIVE_CREDENTIALS=
PATIENT_DRIVE_ROOT_FOLDER_ID=

# 배포 후 채울 것
ERROR_WORKFLOW_ID=
```
