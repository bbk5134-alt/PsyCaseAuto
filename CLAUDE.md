# CLAUDE.md — PsyCaseAuto

> 정신건강의학과 Case Conference 보고서 자동화 프로젝트.
> 이 파일은 이 프로젝트 폴더에서 Claude Code 시작 시 자동 로드됩니다.

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **What** | 환자 면담 기록/녹음본 → Case Conference 보고서 작성 자동화 |
| **Who** | 정신건강의학과 전공의 (R1~R4), 모바일 중심 사용 |
| **Where** | 개인 핫스팟 환경 (병원 네트워크 미사용) |
| **How** | n8n 워크플로우 → Railway 배포, AI 초안 → 전공의 검토/수정 |

**최우선 품질 기준**: Hallucination 절대 방지 — 면담에 없는 내용을 지어내지 않는 것.

---

## 폴더 구조

```
psychiatric interview automation/
├── CLAUDE.md                 ← 이 파일
├── .claude/
│   └── settings.local.json
├── docs/                     ← 설계·참조 문서
│   ├── PROJECT_PLAN_v2.md    ← SSoT (전체 설계)
│   ├── PROGRESS_LOG.md       ← 세션별 진척 기록
│   └── system_prompt_case_conference.md  ← AI 프롬프트 원본
├── config/
│   └── psych_terms_dictionary.json      ← 정신과 용어 교정 사전
├── n8n_workflows/            ← n8n JSON 워크플로우
│   ├── wf1b_stt_pipeline.json           ← WF1-B (STT, 활성)
│   ├── wf3_error_workflow.json          ← WF3 (에러 처리)
│   ├── wf_telegram_ping_test.json
│   └── wf_gdrive_init.json
├── frontend/                 ← Netlify 배포 대상
│   └── psychiatric_interview_checklist_v2.html
├── Dockerfile
├── railway.toml
├── .env.example              ← 환경변수 Single Source
└── .gitignore
```

---

## 핵심 의사결정 (확정 — 재논의 금지)

| # | 결정 | 이유 |
|---|------|------|
| D-01 | 데이터 수집(WF1)과 보고서 생성(WF2) 별도 워크플로우 | 면담은 여러 번, 보고서는 종합 1회 |
| D-02 | 보고서 12개 섹션을 순차적으로 각각 별도 AI 호출 | Lost-in-the-Middle 방지, Hallucination 감소 |
| D-03 | 저장소는 Google Drive (JSON 파일) | Sheets 셀 크기 제한 회피 |
| D-06 | 환자 식별은 코드 기반 (PT-YYYY-NNN) | 개인정보보호, 실명 사용 금지 |
| D-08 | STT는 OpenAI Whisper API | 한국어 성능 우수 |
| D-11 | 체크리스트 프론트엔드는 커스텀 HTML (Netlify) | 모바일 최적화, FCAB 태깅 |
| D-12 | Present Illness는 FCAB 구조 | Fact→Cognition→Affect→Behavior |

> 전체 의사결정 로그: `docs/PROJECT_PLAN_v2.md` §2 참조.

---

## 현재 진행 상태

| WF | 이름 | 상태 | 비고 |
|----|------|:----:|------|
| WF3 | Error Workflow | ✅ 완료 | Telegram 에러 알림 |
| WF1-B | STT 녹음 파이프라인 | ✅ 완료 | End-to-End 테스트 통과, 활성 |
| WF1-A | 설문지 경로 | ⬜ 미착수 | HTML Webhook 수신 → GDrive 저장 |
| WF2 Stage 3-1 | 데이터 수집 프레임워크 | ✅ 완료 | Telegram→GDrive→JSON파싱→병합, E2E 테스트 통과 (23노드) |
| WF2 Stage 3-2 | 12섹션 보고서 생성 | 🔴 진행 예정 | Claude Sonnet 4 → 12개 Sub-WF 순차 호출 → DOCX |

> 세션별 상세 기록: `docs/PROGRESS_LOG.md` 참조.

---

## 기술 스택

| 구성요소 | 기술 | 비고 |
|---------|------|------|
| 워크플로우 엔진 | n8n (Railway 배포) | 기존 결혼준비AI와 인스턴스 공유 |
| STT | OpenAI Whisper API (gpt-4o-transcribe) | `n8n HTTP Request` 노드 |
| AI 보고서 | Claude Sonnet 4 | 섹션별 Sub-WF |
| 저장소 | Google Drive (JSON/DOCX) | OAuth2 연동 완료 |
| 트리거/알림 | Telegram Bot (PsyCaseAuto 전용) | 별도 봇 토큰 |
| 프론트엔드 | HTML (Netlify) | 면담 체크리스트 |

---

## 작업 시 필수 참조

| 작업 | 참조 문서 |
|------|----------|
| 전체 설계·아키텍처 확인 | `docs/PROJECT_PLAN_v2.md` |
| 이전 세션 작업 내용 확인 | `docs/PROGRESS_LOG.md` |
| AI 프롬프트 (Mode A/B) 확인 | `docs/system_prompt_case_conference.md` |
| n8n 설계 규칙 | `~/.claude/skills/n8n-custom/` (글로벌 skill) |
| 환경변수 목록 | `.env.example` |

---

## 이 프로젝트의 특수 규칙

1. **Hallucination 방지가 최우선**: 모든 AI 노드 프롬프트에 Anti-Hallucination 규칙 최상단 배치. `source_ref` 태깅 필수.
2. **환자 데이터 보호**: 실명 사용 금지, 코드 기반 식별(PT-YYYY-NNN), STT 후처리에서 실명 자동 치환.
3. **동시성 제한**: `maxConcurrency: 1` — 환자 데이터 혼선 방지.
4. **Telegram 봇 분리**: 이 프로젝트 전용 `$env.TELEGRAM_BOT_TOKEN_PSYCH` 사용 (결혼준비AI 봇과 분리).
5. **FFmpeg 사용 불가**: Railway n8n에서 child_process 차단됨. 단일 파일(≤24MB) 경로만 구현.

---

## 변경 규칙

- `docs/PROJECT_PLAN_v2.md`의 의사결정(§2)은 확정 사항. 변경 시 반드시 사용자와 논의 후 해당 문서를 먼저 업데이트.
- 이 `CLAUDE.md`는 프로젝트 구조·상태 변경 시 사용자 요청으로만 수정.
- 코드보다 기획이 먼저. 요구사항 → 설계 → 구현 순서.
