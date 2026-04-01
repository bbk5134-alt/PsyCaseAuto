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

**최우선 품질 기준**:
1. **Hallucination 절대 방지** — 면담에 없는 내용을 지어내지 않는 것
2. **형식 재현도** — Gold Standard(원본 보고서)와 동일한 형식 출력

---

## 폴더 구조

```
psychiatric interview automation/
├── CLAUDE.md                 ← 이 파일
├── .claude/
│   └── settings.local.json
├── docs/                     ← 설계·참조 문서
│   ├── PROJECT_PLAN_v3.md    ← SSoT (전체 설계, v3)
│   ├── PROGRESS_LOG.md       ← 세션별 진척 기록
│   ├── system_prompt_case_conference.md  ← AI 프롬프트 원본 (Mode A/B)
│   ├── quality_check_prompt.md          ← QC 채점 프롬프트 (100점)
│   └── prompts/              ← 섹션별 Sub-WF 프롬프트 (v3 Dual-Layer)
│       ├── system_prompt_section_01.md  ~ section_12.md  ← 제작 예정
├── config/
│   └── psych_terms_dictionary.json      ← 정신과 용어 교정 사전
├── n8n_workflows/            ← n8n JSON 워크플로우
│   ├── wf1b_stt_pipeline.json           ← WF1-B (STT, 활성)
│   ├── wf2_main_report.json             ← WF2 메인 (71노드, 활성)
│   ├── sub_wf_s01_s08.json              ← Sub-WF S01~S08 백업
│   ├── sub_wf_s09_s12.json              ← Sub-WF S09~S12 백업
│   ├── wf3_error_workflow.json          ← WF3 (에러 처리)
│   ├── wf_telegram_ping_test.json
│   └── wf_gdrive_init.json
├── frontend/                 ← Netlify 배포 대상
│   └── psychiatric_interview_checklist_v2.html
├── test_data/                ← E2E 테스트용 mock 데이터
│   └── PT-2026-001/
│       ├── UPLOAD_GUIDE.md
│       └── interviews/
│           ├── stt_20260320.json        ← 초진 면담 mock
│           └── stt_20260328.json        ← 경과 면담 mock
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
| D-02 | 보고서 12개 섹션을 각각 별도 AI 호출 | Lost-in-the-Middle 방지, Hallucination 감소 |
| D-03 | 저장소는 Google Drive (JSON 파일) | Sheets 셀 크기 제한 회피 |
| D-06 | 환자 식별은 코드 기반 (PT-YYYY-NNN) | 개인정보보호, 실명 사용 금지 |
| D-12 | Present Illness는 FCAB 구조 | Fact→Cognition→Affect→Behavior |
| D-21 | HTML 보고서 출력 (DOCX 아닌) | Railway n8n에 docx npm 없음 |
| **D-22** | **Sub-WF 출력은 Dual-Layer (narrative + structured + meta)** | **형식은 생성 단계에서 해결. HTML 변환은 narrative를 이어 붙이기만** |
| **D-23** | **Quality Check는 수동 QA. WF2 Halluc Check 대체 안 함** | **목적 다름: Halluc=안전(자동), QC=형식(수동)** |

> 전체 의사결정 로그 (D-01 ~ D-27): `docs/PROJECT_PLAN_v3.md` §2 참조.

---

## 현재 진행 상태

| WF | 이름 | 상태 | 비고 |
|----|------|:----:|------|
| WF3 | Error Workflow | ✅ 완료 | Telegram 에러 알림 |
| WF1-B | STT 녹음 파이프라인 | ✅ 완료 | E2E 통과, 활성 |
| WF1-A | 설문지 경로 | ⬜ 미착수 | HTML Webhook → GDrive 저장 |
| WF2 | 보고서 생성 메인 | ✅ 기능 완료 | 71노드, 4단계 알림, E2E 통과 |
| — | Sub-WF 프롬프트 v3 | 🔴 **진행 중** | Dual-Layer 전환 필요 (12개) |
| — | Quality Check | ✅ 1차 완료 | 44.5/100 (C등급) → 프롬프트 개선 필요 |

### Quality Check 결과 (2026-04-01)

| 대분류 | 만점 | 득점 |
|--------|:----:|:----:|
| A. 형식 충실도 | 60 | 16.5 (27.5%) |
| B. 사실 정확성 | 25 | 20 (80%) |
| 합계 | 100 | 44.5 (C등급) |

**근본 원인**: Sub-WF가 JSON 데이터 구조를 반환 → HTML 변환으로는 임상 산문 재현 불가
**해결**: Dual-Layer Output (D-22) — narrative 필드에 Gold Standard 형식 산문 직접 생성

> 세션별 상세 기록: `docs/PROGRESS_LOG.md` 참조.

---

## 기술 스택

| 구성요소 | 기술 | 비고 |
|---------|------|------|
| 워크플로우 엔진 | n8n (Railway 배포) | 기존 결혼준비AI와 인스턴스 공유 |
| STT | OpenAI gpt-4o-transcribe | `n8n HTTP Request` 노드 |
| AI 보고서 | Claude Sonnet 4 (HTTP Request) | 섹션별 Sub-WF, Dual-Layer 출력 |
| AI 검증 | Claude Haiku 4.5 | Hallucination 검증 (10섹션) |
| 저장소 | Google Drive (JSON/HTML) | OAuth2 연동 완료 |
| 트리거/알림 | Telegram Bot (PsyCaseAuto 전용) | 4단계 알림 (시작→P1완료→1차완성→2차검증) |
| 프론트엔드 | HTML (Netlify) | 면담 체크리스트 |

---

## 워크플로우 & 자격증명 레지스트리

| 워크플로우 | ID | 상태 |
|-----------|-----|------|
| WF3 Error Workflow | `4ox2lxKl1st6pUkY` | ✅ 활성 |
| WF1-B STT Pipeline | `XElVH6RbgWCGZcjO` | ✅ 활성 |
| WF2 보고서 생성 메인 | `LiN5bKslyWtZX6yG` | ✅ 활성 |

| 자격증명 | ID | 용도 |
|---------|-----|------|
| Telegram | `8T0Q83WRhTEEdvSL` | PsyCaseAuto Bot |
| Google Drive | `fcKtWyui68XESQND` | Drive 읽기/쓰기 |
| Anthropic | `RiXuEl0fGr0aAGNz` | Claude API (HTTP Request 헤더) |

---

## 작업 시 필수 참조

| 작업 | 참조 문서 |
|------|----------|
| 전체 설계·아키텍처 | `docs/PROJECT_PLAN_v3.md` |
| 이전 세션 작업 내용 | `docs/PROGRESS_LOG.md` |
| AI 프롬프트 원본 (Mode A/B) | `docs/system_prompt_case_conference.md` |
| 섹션별 Sub-WF 프롬프트 (v3) | `docs/prompts/system_prompt_section_XX.md` |
| Quality Check 채점 프롬프트 | `docs/quality_check_prompt.md` |
| n8n 설계 규칙 | 프로젝트 내 `n8n_워크플로우_스킬.md` |
| 환경변수 목록 | `.env.example` |

---

## 이 프로젝트의 특수 규칙

1. **Hallucination 방지가 최우선**: 모든 AI 프롬프트에 Anti-Hallucination 규칙 최상단 배치. `source_ref` 태깅 필수.
2. **Dual-Layer Output**: Sub-WF는 반드시 `narrative` (임상 산문) + `structured` (JSON 데이터) + `meta` (품질 메타)를 동시 반환. narrative에 JSON 구조 사용 금지.
3. **환자 데이터 보호**: 실명 사용 금지, 코드 기반 식별(PT-YYYY-NNN), STT 후처리에서 실명 자동 치환.
4. **동시성 제한**: `maxConcurrency: 1` — 환자 데이터 혼선 방지.
5. **Telegram 봇 분리**: `$env.TELEGRAM_BOT_TOKEN_PSYCH` (결혼준비AI 봇과 분리).
6. **FFmpeg 사용 불가**: Railway n8n에서 child_process 차단. ≤24MB 단일 파일만.
7. **Anthropic API 호출**: HTTP Request 노드 + `x-api-key` / `anthropic-version: 2023-06-01` 헤더 (전용 credential 노드 아님).

---

## 당면 과제 (세션 9)

12개 Sub-WF 프롬프트를 Dual-Layer 구조로 전면 재설계. QC 최하위 섹션 우선:

| 우선순위 | 섹션 | QC 점수 | 핵심 변경 |
|---------|------|---------|----------|
| 1 | S08 Progress Notes | 0/5 | SOAP + S) 구어체 원문 |
| 2 | S02 Chief Problems | 0.5/5 | 번호+영문증상명 + Remote/Recent onset |
| 3 | S04 Past/Family Hx | 0.5/4 | 6개 번호항목 + 투약 형식 |
| 4 | S09 Present Illness | 3/12 | 4단락+ FCAB 연속 산문 |
| 5 | S12 Psychodynamic | 2.5/6 | 3단락+ 연속 산문 + 전문용어 |

---

## 변경 규칙

- `docs/PROJECT_PLAN_v3.md`의 의사결정(§2)은 확정 사항. 변경 시 반드시 사용자와 논의 후 해당 문서를 먼저 업데이트.
- 이 `CLAUDE.md`는 프로젝트 구조·상태 변경 시 사용자 요청으로만 수정.
- 코드보다 기획이 먼저. 요구사항 → 설계 → 구현 순서.
