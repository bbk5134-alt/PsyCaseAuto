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
| **How** | n8n 워크플로우 → Railway 배포, AI 초안 → 전공의 검토/수정 → 발표용 완성 (§18) |

**최우선 품질 기준**: ① Hallucination 절대 방지 ② Gold Standard와 동일한 형식 출력

---

## 폴더 구조

```
psychiatric interview automation/
├── CLAUDE.md
├── docs/
│   ├── PROJECT_PLAN_v3.1.md        ← SSoT (전체 설계, D-01~D-32)
│   ├── PROGRESS_LOG.md             ← 세션별 진척 기록
│   ├── milestone.md                ← 단계별 작업 계획 (Tier 1~4, Step 단위)
│   ├── system_prompt_quality_check_v2.md  ← QC 채점 프롬프트 (100점, v2.0)
│   ├── WF4_QA_SCRIPT_PLAN_v0.2.md  ← WF4 Q&A 대본 자동화 기획안
│   └── prompts/                    ← 섹션별 Sub-WF 프롬프트 (v3.1 Dual-Layer)
│       └── system_prompt_section_01.md ~ section_12.md  ← 12개 완성
├── config/
│   └── psych_terms_dictionary.json
├── n8n_workflows/
│   ├── wf1b_stt_pipeline.json
│   ├── wf2_main_report.json        ← WF2 메인 (72노드)
│   ├── sub_wf_s01_s08.json
│   └── sub_wf_s09_s12.json
├── frontend/
│   └── psychiatric_interview_checklist_v2.html
├── test_data/PT-2026-001/interviews/
│   ├── stt_20260320.json           ← 초진 면담 mock
│   └── stt_20260328.json           ← 경과 면담 mock
└── .env.example                    ← 환경변수 Single Source
```

---

## 핵심 의사결정 (확정 — 재논의 금지)

> **전체 D-01~D-32**: `docs/PROJECT_PLAN_v3.1.md` §2가 유일한 canonical 소스.
> 아래는 작업 시 가장 자주 참조하는 핵심 결정만 발췌.

| # | 결정 |
|---|------|
| D-02 | 12개 섹션 각각 별도 AI 호출 (Lost-in-Middle 방지) |
| D-21 | Sub-WF 출력: Dual-Layer (narrative + structured + meta). narrative에 JSON 태그 금지 |
| D-26 | Phase 2 릴레이: 의존 데이터 null 방어 필수 (`?.` + `[SYSTEM NOTE]` fallback) |
| D-29 | AI 호출: AI Agent 노드 사용 (HTTP Request 직접 호출 금지) |
| D-31 | n8n `__rl` ResourceLocator 필드는 도트 표기법 업데이트 불가 → Code 노드 출력에서 전달 |
| D-32 | WF2 Pin 대상: Execute Workflow 노드만 (Drive·Telegram·외부 API 노드 Pin 금지) |
| D-33 | MCP로 노드 업데이트 후 n8n UI에서 WF 수동 저장 금지 — UI 저장 시 MCP 변경사항 덮어씌워짐 |

---

## 현재 진행 상태

| 항목 | 상태 | 비고 |
|------|:----:|------|
| WF3 Error Workflow | ✅ | Telegram 에러 알림 |
| WF1-B STT 파이프라인 | ✅ | E2E 통과 |
| WF1-A 설문지 경로 | ⬜ | 보류 — Tier 4 Step 4-4 |
| WF2 보고서 생성 (72노드) | ✅ | E2E 완료, HTML 정상 저장 |
| Sub-WF 프롬프트 12개 (Dual-Layer) | ✅ | 완성 |
| Tier 1: s34-c4 HTML 변환 수정 | ✅ | 세션 14 |
| Tier 2: 프롬프트 미세 조정 + QC 90.5/A | ✅ | 세션 15~22 |
| Tier 3: Gemini Flash 전환 + QC 86.5/A | ✅ | 세션 23~24, E2E ~$0.62 |
| Tier 5: GS2 E2E + Phase 3 프롬프트 수정 | ✅ | 세션 35~54, Fix-O/P/Q/R 최종 완료 |
| s34-a1 원문 크기 모니터링 | ✅ | 세션 55, silent failure 방지 |
| WF4 Q&A 대본 자동화 | 🟡 Stage 0 v0.2.1 완성 | GS1/GS2 QC 통과 — P-5 여자친구 검토 대기 (`docs/prompts/wf4_stage0_v0.2.1.md`) |
| **다음 작업** | 🟢 | **실사용 대기** or P-5 검토 후 Tier 6 WF4 구현 |

> QC 세부 결과: `docs/PROGRESS_LOG.md` 참조. 구 세션 기록: `docs/archieve(이전 log)/` 참조.

---

## 기술 스택

| 구성요소 | 기술 |
|---------|------|
| 워크플로우 엔진 | n8n (Railway 배포, 결혼준비AI 인스턴스 공유) |
| STT | OpenAI gpt-4o-transcribe (`n8n HTTP Request`) |
| AI 보고서 생성 | Claude Sonnet 4 (AI Agent 노드, 섹션별 Sub-WF) |
| AI Halluc 검증 | Gemini 2.5 Flash (AI Agent 노드, 10섹션) |
| 저장소 | Google Drive (JSON/HTML, OAuth2 완료) |
| 트리거/알림 | Telegram Bot (PsyCaseAuto 전용, 2단계 알림) |
| 프론트엔드 | HTML (Netlify, 면담 체크리스트) |

---

## 워크플로우 & 자격증명 레지스트리

| 워크플로우 | ID |
|-----------|-----|
| WF3 Error Workflow | `4ox2lxKl1st6pUkY` |
| WF1-B STT Pipeline | `XElVH6RbgWCGZcjO` |
| WF2 보고서 생성 메인 | `LiN5bKslyWtZX6yG` |

| 자격증명 | ID | 용도 |
|---------|-----|------|
| Telegram | `8T0Q83WRhTEEdvSL` | PsyCaseAuto Bot |
| Google Drive | `fcKtWyui68XESQND` | Drive 읽기/쓰기 |
| Anthropic | `RiXuEl0fGr0aAGNz` | Claude API |

---

## 작업 시 필수 참조

| 작업 | 참조 문서 |
|------|----------|
| **다음 할 일 확인** | `docs/milestone.md` (Tier 1~4, Step 단위) |
| 전체 설계·아키텍처 | `docs/PROJECT_PLAN_v3.1.md` |
| 이전 세션 작업 내용 | `docs/PROGRESS_LOG.md` |
| 섹션별 Sub-WF 프롬프트 | `docs/prompts/system_prompt_section_XX.md` |
| QC 채점 프롬프트 | `docs/system_prompt_quality_check_v2.md` |
| 전공의 보고서 수정 절차 | `docs/PROJECT_PLAN_v3.1.md` §18 |
| 알려진 제약·위험 | `docs/PROJECT_PLAN_v3.1.md` §15, §19 |
| 환경변수 목록 | `.env.example` |
| WF4 Q&A 대본 기획안 | `docs/WF4_QA_SCRIPT_PLAN_v0.2.md` |

---

## 이 프로젝트의 특수 규칙

1. **Hallucination 방지 최우선**: 모든 AI 프롬프트에 Anti-Hallucination 규칙 최상단 배치. `source_ref` 태깅 필수. narrative에 source_ref 노출 금지.
2. **Dual-Layer Output**: Sub-WF는 반드시 `narrative` + `structured` + `meta` 동시 반환. narrative에 JSON 구조 사용 금지.
3. **Phase 2 null 방어 (D-26)**: S09~S12 릴레이에서 의존 섹션 null 검증 + `[SYSTEM NOTE]` fallback.
4. **환자 데이터 보호**: 실명 사용 금지, 코드 기반 식별 (PT-YYYY-NNN).
5. **동시성 제한**: `maxConcurrency: 1` — 환자 데이터 혼선 방지.
6. **Telegram 봇 분리**: `$env.TELEGRAM_BOT_TOKEN_PSYCH` (결혼준비AI 봇과 별도).
7. **FFmpeg 사용 불가**: Railway n8n에서 child_process 차단. ≤24MB 단일 파일만.
8. **AI Agent 노드 필수 (D-29)**: Sub-WF AI 호출은 반드시 AI Agent 노드. HTTP Request 직접 호출 금지.
9. **모델 변경 시 QC 필수**: Claude/Gemini 모델 교체 후 반드시 QC 재실행. 5점+ 하락 시 롤백.

---

## 변경 규칙

- `docs/PROJECT_PLAN_v3.1.md` §2 의사결정은 확정. 변경 시 사용자 논의 후 해당 문서 먼저 업데이트.
- 이 `CLAUDE.md`는 프로젝트 구조·상태 변경 시 사용자 요청으로만 수정.
- 코드보다 기획이 먼저. 요구사항 → 설계 → 구현 순서.
