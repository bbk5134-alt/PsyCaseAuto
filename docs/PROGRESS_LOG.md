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

### 세션 2B — WF1-B STT 파이프라인 등록 (2026-03-29)

#### FFmpeg 환경 체크 결과

| 방법 | 결과 | 비고 |
|------|------|------|
| Code node `require('child_process')` | ❌ 차단 | @n8n/task-runner sandbox: "Module 'child_process' is disallowed" |
| `n8n-nodes-base.executeCommand` 노드 | ❌ 차단 | Railway 보안: "Unrecognized node type" (활성화 시 오류) |

**결론: Railway n8n에서 FFmpeg 사용 불가 → 단일 파일(≤24MB) 경로만 구현**

#### WF1-B 등록

| 항목 | 값 |
|------|-----|
| **ID** | `l0jeHQosObPlaUce` |
| **이름** | PsyCaseAuto — WF1-B STT 녹음 파이프라인 |
| **노드 수** | 19개 |
| **상태** | 비활성 (테스트 후 활성화 필요) |
| **Webhook URL** | `https://primary-production-b48fc.up.railway.app/webhook/psycase-audio` |
| **JSON 백업** | `n8n_workflows/wf1b_stt_pipeline.json` |

#### WF1-B 노드 구조

```
Webhook (psycase-audio)
  → 요청 검증 (Code) — PT-YYYY-NNN, audio binary 존재, 파일크기 계산
  → 파일 크기 분기 (IF)
      ├─ true (>24MB) → 크기 초과 오류 응답 (413)
      │                 [FFmpeg 청크 분할 — 자체 호스팅 환경에서 활성화 예정]
      └─ false (≤24MB) → Whisper API (openai-whisper-1, verbose_json, ko)
                        → STT 결과 정리 (Code) — segments + speaker:'unidentified'
                        → 환자 폴더 존재 확인 (GDrive, searchMethod:name)
                        → 폴더 없으면 생성? (IF)
                            ├─ true → 환자 폴더 생성 → 폴더 ID 확정
                            └─ false ──────────────→ 폴더 ID 확정
                        → audio 서브폴더 조회 (GDrive, searchMethod:name)
                        → audio 없으면 생성? (IF)
                            ├─ true → audio 폴더 생성 → audio ID 확정
                            └─ false ─────────────→ audio ID 확정
                        → 원본 오디오 저장 (GDrive upload, binary 복원)
                        → STT JSON 직렬화 (Code)
                        → STT JSON 저장 (GDrive upload)
                            ├─ Telegram 알림 (🎙 STT 변환 완료)
                            └─ Webhook 응답 (200 + 결과 JSON)
```

#### Drive 저장 구조 (WF1-B)
```
PsyCaseAuto/
  └── {patient_code}/
        └── audio/
              ├── audio_{YYYYMMDD}.{ext}   ← 원본 오디오
              └── stt_{YYYYMMDD}.json      ← STT 결과 (full_text + segments)
```

#### WF1-B 활성화 전 필수 체크
- [ ] Railway 환경변수 `OPENAI_API_KEY` 설정
- [ ] Railway 환경변수 `N8N_PAYLOAD_SIZE_MAX=50` 설정 (16MB 기본값 초과 대비)
- [ ] 소규모 오디오 파일로 end-to-end 테스트

---

### 세션 3 — WF1-B 버그 수정 + End-to-End 테스트 완료 (2026-03-29)

#### 수정 사항

| 항목 | 수정 내용 |
|------|-----------|
| `response_format` | `verbose_json` → `json` (gpt-4o-transcribe 호환) |
| STT 결과 정리 코드 | segments/duration 파싱 제거, `stt_engine: 'gpt-4o-transcribe'` 수정 |
| binary 필드명 | `audio ID 확정` 출력 `{ audio: ... }` → `{ data: ... }` (Drive 업로드 호환) |
| Whisper API 프롬프트 | 환각 방지 중립 프롬프트로 변경 |
| 워크플로우 ID | `l0jeHQosObPlaUce` → `XElVH6RbgWCGZcjO` (백업 재import) |

#### 테스트 결과
- **End-to-End 성공** ✅
- Drive 저장: `audio_20260329.m4a` + `stt_20260329.json`
- Telegram 알림 수신 ✅
- WF1-B Published (활성화 완료)

#### 알려진 이슈 (추후)
- STT 짧은 오디오 환각 문제 (실제 임상 녹음으로 검증 필요)
- HTML UI 개선 (음성만 모드 직행, 탭 수 정리)

---

## 다음 세션 예정 작업

| 순서 | 세션 | 내용 |
|------|------|------|
| 2 | WF1-A | 설문지 경로: Form Trigger → 입력 검증 → Google Drive JSON 저장 |
| 3 | WF1-B | 녹음 경로: Webhook → FFmpeg 청크 분할 → Whisper STT → 용어 교정 → Drive 저장 |
| 4 | WF2 | 보고서 생성: Telegram 트리거 → 12섹션 순차 생성 → DOCX → Drive → Telegram 응답 |

Session 4 과제 (우선순위 순)
HTML UI 개선 — 음성만 모드 시 체크리스트 탭 숨기고 바로 전송 화면, 탭 수 정리
STT 정확도 검증 — 실제 임상 면담 녹음(5분↑)으로 테스트
WF2 보고서 생성 워크플로우 설계 및 구현

---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)
