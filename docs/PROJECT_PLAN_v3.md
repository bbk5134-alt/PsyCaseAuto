# 정신건강의학과 Case Conference 보고서 자동화 — 종합 기획안

> **프로젝트명**: PsyCaseAuto (Psychiatry Case Conference Automation)
> **버전**: v3.0
> **최종 수정**: 2026-04-01
> **작성 목적**: Claude Code 작업 시 맥락 유지를 위한 단일 참조 문서 (Single Source of Truth)
> **변경 이력**: v1.0(2026-03-27) → v2.0(2026-03-29) → v3.0(2026-04-01, Dual-Layer 출력 + QC 전략 추가)

---

## 목차

1. [프로젝트 개요 (5W1H)](#1-프로젝트-개요)
2. [핵심 의사결정 로그](#2-핵심-의사결정-로그)
3. [시스템 아키텍처 전체 설계](#3-시스템-아키텍처-전체-설계)
4. [워크플로우 1: 데이터 수집](#4-워크플로우-1-데이터-수집)
5. [워크플로우 2: 보고서 생성](#5-워크플로우-2-보고서-생성)
6. [워크플로우 3: Error Workflow](#6-워크플로우-3-error-workflow)
7. [Anti-Hallucination 전략](#7-anti-hallucination-전략)
8. [AI 시스템 프롬프트 (Mode A & B)](#8-ai-시스템-프롬프트)
9. [STT 처리 전략](#9-stt-처리-전략)
10. [Case Conference 보고서 구조 (원본 기반)](#10-보고서-구조)
11. [데이터 모델 및 저장 구조](#11-데이터-모델)
12. [보안 및 개인정보보호](#12-보안-및-개인정보보호)
13. [배포 환경](#13-배포-환경)
14. [실수 방지 체크리스트](#14-실수-방지-체크리스트)
15. [알려진 위험 및 대응 계획](#15-알려진-위험-및-대응-계획)
16. [구현 로드맵](#16-구현-로드맵)
17. [Quality Check 전략](#17-quality-check-전략)

---

## 1. 프로젝트 개요

### 5W1H

| 항목 | 내용 |
|------|------|
| **What** | 환자 면담 기록/녹음본을 토대로 Case Conference 보고서 작성 자동화 |
| **Why** | ① 면담 시 질문 항목 누락 방지 ② 수기 타이핑 시간 절감 ③ 시간순 사건 배열 자동화 ④ 매일 병원 잔류 기록 정리 시간 단축 |
| **Who** | 정신건강의학과 전공의 (R1~R4) |
| **When** | 환자 면담 후 기록 작성 시, Case Conference 준비 시 |
| **Where** | 개인 모바일 핫스팟 환경에서 사용 (병원 네트워크 미사용) |
| **How** | n8n 워크플로우 → Railway 배포, AI 초안 → 전공의 검토/수정 |

### 핵심 기대

- AI가 초안을 작성하면 전공의가 **소폭 수정만으로** 사용 가능한 수준
- **Hallucination 절대 방지**: 면담에 없는 내용을 지어내지 않는 것이 품질의 최우선 기준
- **형식 재현도**: Gold Standard(원본 보고서)와 동일한 형식으로 출력해야 함 — 내용이 좋아도 형식이 안 맞으면 사용 불가
- 면담 데이터 수집과 보고서 생성을 **분리**: 면담은 여러 번, 보고서는 종합하여 1회

---

## 2. 핵심 의사결정 로그

아래 의사결정들은 확정된 사항입니다. 구현 시 재논의하지 않습니다.

| # | 결정 사항 | 이유 | 확정일 |
|---|----------|------|--------|
| D-01 | 데이터 수집(WF1)과 보고서 생성(WF2)을 별도 워크플로우로 분리 | 면담은 여러 번, 보고서는 모든 면담을 종합하여 작성해야 함 | 2026-03-27 |
| D-02 | 보고서는 12개 섹션을 순차적으로 각각 별도 AI 호출로 생성 | LLM의 Lost-in-the-Middle 현상 방지, Hallucination 감소 | 2026-03-27 |
| D-03 | 저장소는 Google Drive (JSON 파일) | Google Sheets 셀 크기 제한(50,000자) 회피, 면담 텍스트가 길어질 수 있음 | 2026-03-27 |
| D-04 | 보고서 생성 트리거는 Telegram 메시지 | 병원에서 모바일로 바로 사용 가능, 직관적 | 2026-03-27 |
| D-05 | 네트워크는 개인 핫스팟/모바일 사용 | 병원 네트워크 보안 정책 우회 | 2026-03-27 |
| D-06 | 환자 식별은 코드 기반 (PT-YYYY-NNN) | 개인정보보호, 실명 사용 금지 | 2026-03-27 |
| D-07 | AI 모델은 Claude Sonnet 4 또는 GPT-4o | n8n AI Agent 노드 호환, 비용 대비 성능 | 2026-03-27 |
| D-08 | STT는 OpenAI Whisper API 사용 | 한국어 인식 성능 우수, n8n HTTP Request 노드로 호출 가능 | 2026-03-27 |
| D-09 | ~~DOCX 변환은 n8n Code 노드에서 docx-js 라이브러리 사용~~ → **HTML 변환 후 GDrive 자동 변환** | Railway n8n에 docx npm 미설치, NODE_FUNCTION_ALLOW_EXTERNAL 미설정 | 2026-04-01 |
| D-10 | 수정 전/후 보고서 모두 Google Drive에 보관 | 추후 프롬프트 개선을 위한 피드백 루프 데이터 확보 | 2026-03-27 |
| D-11 | 면담 체크리스트 프론트엔드는 커스텀 HTML (Netlify 배포) | n8n Form Trigger보다 UX 우수, 모바일 최적화, FCAB 태깅, 메모 기능 | 2026-03-29 |
| D-12 | Present Illness 서술은 FCAB 구조 적용 | 원본 보고서 문체 분석 결과: Fact→Cognition→Affect→Behavior 순서가 일관 | 2026-03-29 |
| D-13 | 에러 처리는 3단계 분류 (RETRYABLE / FATAL / WARN_AND_CONTINUE) | 에러 종류에 따라 재시도/즉시중단/경고후계속 구분 필요 | 2026-03-29 |
| D-14 | WF1-A는 HTML Webhook 수신 + n8n Form Trigger 이중 지원 | HTML이 주 인터페이스, n8n Form은 백업 경로 | 2026-03-29 |
| **D-15** | **Railway n8n에서 FFmpeg 사용 불가** | child_process 차단 + executeCommand 미지원. ≤24MB 단일 파일만 처리 | 2026-03-29 |
| **D-16** | **STT 엔진은 gpt-4o-transcribe** | whisper-1 대비 정확도 향상, response_format: json 사용 | 2026-03-29 |
| **D-17** | **Phase 1(섹션 1-8)은 팬아웃 구조, Phase 2(섹션 9-12)는 순차** | 독립 섹션은 병렬 가능(Queue Mode 전환 시 즉시 효과), 의존 섹션은 순차 필수 | 2026-04-01 |
| **D-18** | **WF2 Telegram 알림은 4단계** | 시작→Phase1완료→1차완성(보고서링크)→2차검증(Halluc결과) | 2026-04-01 |
| **D-19** | **Drive 저장을 Halluc 검증보다 먼저 실행** | 검증 실패해도 보고서는 전달되어야 함 | 2026-04-01 |
| **D-20** | **Hallucination 검증 모델: claude-haiku-4-5-20251001** | 속도·비용 우선. 검증 실패 시에도 보고서 진행 (onError: continueRegularOutput) | 2026-04-01 |
| **D-21** | **HTML 보고서 출력 (DOCX 아닌)** | Railway n8n에 docx npm 없음. HTML을 GDrive upload 시 convert 옵션으로 Docs 변환 가능 | 2026-04-01 |
| **D-22** | **Sub-WF 출력은 Dual-Layer (narrative + structured)** | narrative는 Gold Standard 형식 산문, structured는 프로그래밍용 JSON. 형식 품질은 생성 단계에서 해결 | 2026-04-01 |
| **D-23** | **Quality Check는 WF2 내 자동화가 아닌 별도 수동 QA 프로세스** | Gold Standard 필요, Sonnet/Opus급 모델 필요, 프롬프트 튜닝 사이클에서만 실행 | 2026-04-01 |
| **D-24** | **DOCX 변환 불가 → HTML 폴백** | Railway n8n에 `docx` npm 미설치 | 2026-04-01 |
| **D-25** | **Hallucination 검증은 사실 기반 6개 섹션만** | Case Formulation, Psychodynamic은 추론 허용 영역 | 2026-04-01 |
| **D-26** | **Hallucination 검증 실패해도 보고서 저장 진행** | `onError: continueRegularOutput`, `parse_error: true`로 Telegram 표시 | 2026-04-01 |
| **D-27** | **GDrive 바이너리 데이터: 파일별 별도 직렬화→업로드** | GDrive upload 노드가 바이너리를 passthrough하지 않음 | 2026-04-01 |

---

## 3. 시스템 아키텍처 전체 설계

```
┌─────────────────────────────────────────────────────────────────────┐
│                        전체 시스템 구조도 (v3)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────┐                      │
│  │  워크플로우 1: 데이터 수집 (반복 실행)      │                      │
│  │                                           │                      │
│  │  A. 설문지 경로                            │                      │
│  │  [HTML 체크리스트(Netlify)] → [Webhook] → 정규화 │                 │
│  │  [n8n Form (백업)]  ─────────→↗           │                      │
│  │                               ↓            │                      │
│  │                        [Google Drive 저장]  │──→ /PsyCaseAuto/     │
│  │                               ↑            │    {환자코드}/        │
│  │  B. 녹음 경로                              │    interviews/       │
│  │  [Webhook: 파일] → [STT] → [발화자 분리]   │    interview_N.json  │
│  │                      ↓                     │                      │
│  │               [용어 후처리]                 │                      │
│  └───────────────────────────────────────────┘                      │
│                                                                     │
│  ┌───────────────────────────────────────────┐                      │
│  │  워크플로우 2: 보고서 생성 (필요 시 1회)    │                      │
│  │                                           │                      │
│  │  [Telegram: "PT-2023-001 보고서"]          │                      │
│  │        ↓                                   │                      │
│  │  [Google Drive에서 해당 환자 면담 전체 조회] │                      │
│  │        ↓                                   │                      │
│  │  [면담 데이터 병합 (Code)]                  │                      │
│  │        ↓                                   │                      │
│  │  [토큰 초과 시 면담별 사전 요약]            │                      │
│  │        ↓                                   │                      │
│  │  ┌── Phase 1: 독립 섹션 (팬아웃) ──┐       │                      │
│  │  │ S01~S08 (8개 Sub-WF 동시 실행)  │       │                      │
│  │  │ → Dual-Layer 출력:              │       │                      │
│  │  │   narrative (산문) + structured  │       │                      │
│  │  └────────────┬────────────────────┘       │                      │
│  │               ↓ Merge                       │                      │
│  │  ┌── Phase 2: 의존 섹션 (순차) ────┐       │                      │
│  │  │ S09→S10→S11→S12                 │       │                      │
│  │  │ (앞 섹션 narrative 참조)         │       │                      │
│  │  └────────────┬────────────────────┘       │                      │
│  │               ↓                             │                      │
│  │  [보고서 준비] → [JSON+HTML 저장] → [1차 알림]│                     │
│  │        ↓                                   │                      │
│  │  [Hallucination 검증 (Haiku)]              │                      │
│  │        ↓                                   │                      │
│  │  [Log 저장] → [2차 검증 알림]               │                      │
│  └───────────────────────────────────────────┘                      │
│                                                                     │
│  ┌───────────────────────────────────────────┐                      │
│  │  워크플로우 3: Error Workflow               │                      │
│  │  [Error Trigger] → [메시지 구성] → [Telegram]│                     │
│  └───────────────────────────────────────────┘                      │
│                                                                     │
│  ┌───────────────────────────────────────────┐                      │
│  │  QA 프로세스 (수동)                         │                      │
│  │  Gold Standard + AI 초안 → Quality Check   │                      │
│  │  → 섹션별 점수 → Sub-WF 프롬프트 수정       │                      │
│  └───────────────────────────────────────────┘                      │
│                                                                     │
│  ┌───────────────────────────────────────────┐                      │
│  │  인프라                                    │                      │
│  │  - Railway: n8n 호스팅 (고정 Webhook URL)  │                      │
│  │  - Google Drive: 데이터 저장               │                      │
│  │  - Anthropic API: Claude Sonnet 4 (보고서) │                      │
│  │  - OpenAI API: gpt-4o-transcribe (STT)     │                      │
│  │  - Telegram Bot: 트리거 + 알림             │                      │
│  └───────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 워크플로우 1: 데이터 수집

> **v2.0 대비 변경 없음** — §4 전체를 PROJECT_PLAN_v2.md에서 그대로 유지

---

## 5. 워크플로우 2: 보고서 생성

### WF2 현황

| 항목 | 값 |
|------|-----|
| **Workflow ID** | `LiN5bKslyWtZX6yG` |
| **총 노드 수** | 71 |
| **Sub-WF 수** | 12개 (S01~S12) |
| **상태** | Stage 3-4 완료, 프롬프트 튜닝 필요 |

### 전체 흐름 (4단계)

```
Stage 1: 트리거 + 데이터 로드
  Telegram Trigger → 메시지 파싱 → 유효성 검사
  → 환자 폴더 검색 → interviews 폴더 → 파일 목록 조회
  → 파일 내용 로드 → JSON 파싱 → 면담 데이터 병합
  → 토큰 초과 확인 → 생성 시작 알림

Stage 2: 12섹션 AI 생성
  Phase 1 (팬아웃): S01~S08 (독립 섹션)
    → Phase 1 결과 병합 → Phase 1 완료 알림
  Phase 2 (순차): S09→S10→S11→S12 (의존 섹션)
    → Phase 2 결과 병합

Stage 3: 저장 + 알림
  보고서 준비 → reports/logs 폴더 확보
  → JSON 직렬화→저장 → HTML 변환→저장
  → 1차 완성 알림 (보고서 링크 포함)

Stage 4: Hallucination 검증
  검증 준비 → API 호출 (Haiku) → 결과 통합
  → Log 저장 → 2차 검증 알림
```

### Sub-WF 출력: Dual-Layer 구조 (D-22)

**v3.0의 핵심 변경사항.** 각 Sub-WF가 JSON과 산문을 동시에 반환합니다.

```json
{
  "section_id": "S04",
  "section_name": "present_illness",
  "status": "complete",
  "confidence": "high",

  "narrative": "내원 6개월 전, 5년간 사귀던 남자친구와 이별한 환자는 처음에는 이별 반응이라는 생각에 별다른 조치 없이 지냈으나 점차 수면 문제가 심해지기 시작했다고 한다...(연속 산문 4단락+)",

  "structured": {
    "timeline": [
      {
        "timepoint": "내원 6개월 전",
        "event": "남자친구와 이별",
        "source_ref": "면담1_환자_L15-L22",
        "type": "verbatim"
      }
    ]
  },

  "meta": {
    "missing_items": [],
    "fcab_compliance": true,
    "informant_sources": ["환자", "환자의 어머니"],
    "requires_review": false
  }
}
```

**역할 분리:**

| 필드 | 용도 | 소비자 |
|------|------|--------|
| `narrative` | HTML/DOCX 변환에 직접 삽입 | HTML 변환 노드 (`s34-c4`) |
| `structured` | Hallucination 검증, source_ref 추적 | Halluc Check 노드 (`s34-a1`) |
| `meta` | 누락 항목 탐지, 품질 메트릭 | 완성 알림 노드 (`s34-c6`) |

**이 구조의 장점:**
1. HTML 변환 노드는 `narrative`를 이어 붙이기만 하면 됨 → 복잡한 `v()` 함수 불필요
2. 형식 품질은 **Sub-WF 프롬프트에서 통제** → 변환 로직이 아닌 생성 로직에서 해결
3. `structured`로 프로그래밍적 검증 가능 → Halluc Check가 source_ref를 파싱 가능
4. n8n 파이프라인의 JSON 데이터 흐름은 그대로 유지

### 섹션별 Sub-workflow 호출 순서

```
Phase 1: 독립 섹션 (앞 섹션 결과 불필요, 팬아웃)
─────────────────────────────────────────
  S01. Identifying Data       — 입력: 면담 데이터
  S02. Chief Problems         — 입력: 면담 데이터
  S03. Informants             — 입력: 면담 데이터
  S04. Past/Family History    — 입력: 면담 데이터
  S05. Personal History       — 입력: 면담 데이터
  S06. MSE                    — 입력: 면담 데이터
  S07. Mood Chart             — 입력: 면담 데이터
  S08. Progress Notes         — 입력: 면담 데이터

Phase 2: 의존 섹션 (앞 섹션 결과 필요, 순차)
─────────────────────────────────────────
  S09. Present Illness        — 입력: 면담 + S02(Chief Problems).narrative
  S10. Diagnostic Formulation — 입력: S02 + S06(MSE) + S09 narrative
  S11. Case Formulation       — 입력: Phase 1 전체 narrative 요약
  S12. Psychodynamic          — 입력: S05 + S09 + S11 narrative
```

### 각 Sub-workflow의 공통 구조 (v3)

```
[Execute Workflow Trigger]
  ↓
[입력 수신 (Code)]           — 면담 데이터 + 해당 섹션 지시사항
  ↓
[AI Agent: 섹션 생성]        — HTTP Request (Claude Sonnet 4)
  │                            시스템 프롬프트: 형식 규칙 + Gold Standard 예시 + Anti-Halluc
  │                            사용자 프롬프트: 면담 데이터 + (Phase 2의 경우) 앞 섹션 narrative
  ↓
[출력 파싱 (Code)]           — JSON 파싱, narrative/structured/meta 분리
  ↓
[출력 검증 (Code)]           — narrative 존재 여부, 필수 필드 확인
  ↓
[return 결과]                — Dual-Layer JSON
```

### HTML 변환 로직 (v3 — narrative 기반)

```javascript
// s34-c4: HTML 보고서 변환 (v3 — 대폭 단순화)
const sections = $('보고서 준비').first().json.final_report.sections;
const meta = $('보고서 준비').first().json.final_report.metadata;

const sectionOrder = [
  { key: 'identifying_data', title: 'I. Identifying Data' },
  { key: 'chief_problems', title: 'II. Chief Problems and Durations' },
  { key: 'informants_reliability', title: 'III. Informants & Reliability' },
  { key: 'present_illness', title: 'IV. Present Illness' },
  { key: 'past_family_history', title: 'V. Past History and Family History' },
  { key: 'personal_history', title: 'VI. Personal History' },
  { key: 'mse', title: 'VII. Mental Status Examination' },
  { key: 'mood_chart', title: 'VIII. Mood Chart' },
  { key: 'diagnostic_formulation', title: 'IX. Diagnostic Formulation' },
  { key: 'progress_notes', title: 'X. Progress Notes' },
  { key: 'case_formulation', title: 'XI. Case Formulation' },
  { key: 'psychodynamic', title: 'XII. Psychodynamic Formulation' },
];

let body = '';
for (const { key, title } of sectionOrder) {
  const sec = sections[key];
  if (!sec) continue;
  body += `<h2>${title}</h2>\n`;
  // narrative를 그대로 삽입 — 변환 로직 불필요
  body += `<div class="section-content">${(sec.narrative || '[미생성]').replace(/\n/g, '<br>')}</div>\n`;
  if (sec.meta?.requires_review) {
    body += `<p class="review-warning">⚠️ 전공의 검토 필수</p>\n`;
  }
}
// ... HTML wrapper + CSS
```

---

## 6. 워크플로우 3: Error Workflow

> **v2.0 대비 변경 없음** — §6 전체를 PROJECT_PLAN_v2.md에서 그대로 유지.
> WF3 ID: `4ox2lxKl1st6pUkY`

---

## 7. Anti-Hallucination 전략

**이 섹션은 프로젝트의 가장 중요한 품질 기준입니다.**

### 7-1. 프롬프트 수준 방어 (Layer 1)

모든 Sub-WF AI 프롬프트의 **최상단**에 배치:

```
# ⚠️ ANTI-HALLUCINATION RULES (최우선 적용)

1. 입력 텍스트에 명시적으로 존재하지 않는 정보를 절대 생성하지 마라.
2. 모든 structured 출력에 source_ref(원본 출처)를 태깅하라.
   - 형식: "source_ref": "면담{N}_{발화자}_L{시작줄}-L{끝줄}"
3. narrative에서도 추론 표현("~였을 것이다")은
   Case Formulation(S11)과 Psychodynamic(S12)에서만 허용.
4. 확인되지 않은 정보는 narrative에 포함하지 말고
   meta.missing_items에 기재하라.
5. 날짜, 기간, 약물명, 용량 등 구체적 사실은 입력 원문과 정확히 일치해야 한다.
```

### 7-2. 구조적 방어 — Dual-Layer Output (Layer 2)

narrative와 structured의 분리가 Hallucination 방어를 강화합니다:
- `structured.source_ref`: 모든 사실에 원본 출처 태깅 → 프로그래밍적 검증 가능
- `structured.type`: verbatim / observation / collateral / inference 구분
- narrative에는 source_ref가 노출되지 않음 → 보고서 가독성 유지

### 7-3. 섹션별 분리 생성 (Layer 3)

D-02 결정 — 12개 Sub-WF로 분리하여 각 AI 호출이 하나의 태스크에만 집중.

### 7-4. 후처리 Hallucination Check (Layer 4)

WF2 Stage 4에서 Haiku로 자동 검증. **v3 개선 사항:**
- 검증 대상: 사실 기반 **전체 10개 섹션** (기존 3개 → 확대)
  - 제외: S11(Case Formulation), S12(Psychodynamic) — 추론 허용 영역
- 검증 방식: `structured` 필드의 `source_ref`를 원본 면담과 대조
- False Positive 감소: 프롬프트에 "나이 계산, 상대 시점 변환 등은 합리적 변환이므로 오류로 지적하지 마라" 명시

### 7-5. Quality Check (Layer 5) — 수동 QA

프롬프트 튜닝 사이클에서만 실행. §17 참조.

### 7-6. 전공의 최종 검토 (Layer 6)

인간의 최종 판단 — 가장 중요한 방어층.

### 방어 계층 요약

```
Layer 1: 프롬프트 규칙          — "생성하지 마라" 명시적 지시
Layer 2: Dual-Layer 출력       — narrative/structured 분리, source_ref 강제
Layer 3: 섹션별 분리 생성       — 컨텍스트 축소로 환각 감소
Layer 4: 후처리 Halluc Check   — Haiku로 자동 교차 검증 (10개 섹션)
Layer 5: Quality Check         — Gold Standard 대비 형식/내용 감사 (수동)
Layer 6: 전공의 최종 검토       — 인간의 최종 판단
```

---

## 8. AI 시스템 프롬프트

### v3 프롬프트 설계 원칙 — "형식은 생성 단계에서 해결"

**기존 문제**: Sub-WF가 JSON 데이터 구조를 반환 → HTML 변환 노드에서 산문으로 변환 시도 → 변환 불가능 → 형식 충실도 27.5%

**v3 해결**: 각 Sub-WF 프롬프트에 **Gold Standard 예시를 직접 포함**하여 narrative를 올바른 형식으로 생성하게 함.

### 프롬프트 공통 구조 (12개 Sub-WF 모두 적용)

```
# Role
[섹션별 전문가 역할]

# ⚠️ ANTI-HALLUCINATION RULES
[Layer 1 규칙 — 위 §7-1 참조]

# ⚠️ 출력 형식 규칙 (최우선 적용)
1. narrative 필드는 사람이 읽는 임상 보고서 텍스트로 작성하라.
2. narrative에 JSON 구조, 키-값 쌍, 배열 형식을 절대 사용하지 마라.
3. [형식 예시]를 정확히 모방하라.

# Task
[섹션별 구체적 작업]

# 형식 예시 (Gold Standard — 이것이 정답 형식)
[해당 섹션의 Gold Standard 원본에서 추출한 예시]

# Output Format
반드시 아래 JSON 구조로 반환하라:
{
  "narrative": "(Gold Standard 형식의 임상 보고서 텍스트)",
  "structured": { ... },
  "meta": { "status": "complete|partial|missing", ... }
}
```

### 섹션별 핵심 형식 규칙 + Gold Standard 예시

> **각 섹션의 상세 프롬프트는 별도 파일 `system_prompt_section_XX.md` (12개)로 관리.**
> 아래는 각 섹션의 narrative 형식 핵심 요약.

| 섹션 | narrative 형식 핵심 | Gold Standard 패턴 예시 |
|------|---------------------|------------------------|
| S01 Identifying Data | `항목 : 값` 줄 나열 + 병전 성격 서술형 + `By. 정보제공자` | `성별/나이 : F/31 (2녀 중 첫째)` |
| S02 Chief Problems | `번호. 영문증상명` + `-설명` + `By.` + `Remote/Recent onset)` | `1. Depressed mood\n  - 하루 중 대부분~\nBy. 환자\nRemote onset) 내원 1년 7개월 전` |
| S03 Informants | 정보제공자별 3문장+ 서술형 + `- Reliable` | `환자: 과거에 있었던 일과 자신의 생각~했다. - Reliable` |
| **S09 Present Illness** | **4단락+ 연속 산문, FCAB, 간접화법, 상대 시점** | `내원 2년 2개월 전에 회사를 그만 둔 환자는~이라는 생각에~했다고 한다.` |
| S04 Past/Family Hx | `1.~6.` 번호 항목 + 투약 `약물명 용량-용량-용량-용량mg` | `6. Current medication: escitalopram 10-0-0-0mg` |
| S05 Personal History | 5단계 소제목 + 서술형 산문 | `Prenatal and perinatal\n환모는~했다고 한다.` |
| S06 MSE | 9개 번호항목 + `(+)/(-)` + `자살의 위험성: 상/중/하` | `2. Mood: depressed, not irritable, sl. anxious` |
| S07 Mood Chart | 시점별 기분 수치 + 핵심 사건 | 차트 데이터 (narrative = 텍스트 요약, structured = 수치 배열) |
| **S08 Progress Notes** | **SOAP 형식 + S) 1인칭 구어체 원문** | `2023. 09. 19. (HD #2)\nS) 저는 항상 사랑을 많이 받고 자랐어요.` |
| S10 Diagnostic Formulation | 간결한 진단명 한 줄 + 감별 근거 | `Major depressive disorder, recurrent episode, severe` |
| S11 Case Formulation | 4P 표 + Treatment Plan 서술 | Predisposition(Bio/Psycho/Social) 구조 |
| **S12 Psychodynamic** | **3단락+ 연속 산문 + 고도 전문용어** | `구강기적 욕구~false self-adaptation~인 것으로 생각된다` |

---

## 9. STT 처리 전략

### 현재 구현 (v3 — Railway 환경)

| 항목 | 값 |
|------|-----|
| STT 엔진 | `gpt-4o-transcribe` (D-16) |
| response_format | `json` |
| 최대 파일 크기 | 24MB (FFmpeg 불가, D-15) |
| 발화자 분리 | 미구현 (`speaker: "unidentified"`) |
| 용어 교정 | `psych_terms_dictionary.json` 기반 |

> §9 나머지(Whisper API 설정, 품질 보증 등)는 v2.0 내용 유지

---

## 10. 보고서 구조

> **v2.0 대비 변경 없음** — FCAB 프레임워크, MSE 표준 용어 등 §10 전체 유지

---

## 11. 데이터 모델

### Google Drive 폴더 구조 (v3)

```
/PsyCaseAuto/
  ├── config/
  │   ├── psych_terms_dictionary.json    — 정신과 용어 교정 사전
  │   └── report_template.json           — 보고서 JSON 템플릿
  │
  ├── PT-2026-001/                       — 환자별 폴더
  │   ├── interviews/
  │   │   ├── stt_20260320.json          — STT 면담 (초진)
  │   │   └── stt_20260328.json          — STT 면담 (경과)
  │   ├── audio/
  │   │   └── audio_20260320.m4a         — 원본 녹음
  │   ├── reports/
  │   │   ├── draft_20260401_1242_v1.json  — AI 초안 (JSON, Dual-Layer)
  │   │   └── draft_20260401_1242_v1.html  — AI 초안 (HTML, narrative 기반)
  │   └── logs/
  │       └── hallucination_check_20260401_1242.json
  │
  └── PT-2026-002/
      └── ...
```

> §11 나머지(환자 코드 체계 등)는 v2.0 유지

---

## 12~15. 보안 / 배포 / 실수방지 / 위험

> v2.0 내용 유지. 추가 위험:

### 위험 6: AI 출력 형식 불일치 (v3 신규)

| 항목 | 내용 |
|------|------|
| **위험도** | 중간 |
| **시나리오** | Sub-WF AI가 narrative를 JSON 구조로 반환하거나, Gold Standard 형식을 따르지 않음 |
| **대응** | ① 프롬프트에 Gold Standard 예시 직접 포함 ② 출력 검증 Code 노드에서 narrative 존재/형식 체크 ③ Quality Check로 주기적 형식 감사 |
| **잔여 위험** | AI 모델 업데이트 시 형식 regression 가능 → QC 재실행 필요 |

---

## 16. 구현 로드맵

### Phase 1: 기반 구축 ✅ (2026-03-27)

```
[x] Railway에 n8n 배포
[x] Telegram Bot 생성 + Webhook 연결
[x] Google Drive OAuth 설정 + 폴더 구조 생성
[x] Error Workflow (WF3) 구현 + 테스트
[x] 정신과 용어 교정 사전 초안 작성
```

### Phase 2: 데이터 수집 — 부분 완료 (2026-03-29)

```
[ ] WF1-A: 설문지 경로 (HTML Webhook → JSON → Google Drive)
[x] WF1-B: 녹음 경로 (Webhook → STT → Drive 저장)
[ ] STT 발화자 분리 로직 (v2에서 고려)
[x] STT 용어 교정 (psych_terms_dictionary.json)
[ ] 실명 자동 비식별화 로직
```

### Phase 3: 보고서 생성 — Stage 3-4 완료, 프롬프트 튜닝 필요 (현재)

```
[x] WF2 Stage 1-2: 트리거→데이터 로드→12섹션 생성 (71노드)
[x] WF2 Stage 3-4: Halluc 검증→저장→알림
[x] E2E 테스트 (PT-2026-001 Mock 데이터)
[ ] ★ Sub-WF 12개 프롬프트 전면 재설계 (Dual-Layer Output)
[ ] ★ HTML 변환 노드 단순화 (narrative 기반)
[ ] ★ Hallucination Check 프롬프트 개선 (10섹션 확대)
[ ] Quality Check 첫 라운드 (Gold Standard 대비 재채점)
```

### Phase 4: 프롬프트 튜닝 사이클

```
[ ] Sub-WF 프롬프트 v2 적용 → E2E 재테스트
[ ] Quality Check 2차 → 점수 비교
[ ] 점수 미달 섹션 3차 수정
[ ] 목표: A등급(75점+) 도달
```

### Phase 5: 안정화 + 피드백

```
[ ] WF1-A 설문지 경로 완성
[ ] 실사용 테스트 (여자친구 피드백)
[ ] 실제 환자 데이터로 검증 (비식별화 후)
[ ] Queue Mode 전환 검토 (성능 최적화)
[ ] 피드백 루프 구조 구축
```

---

## 17. Quality Check 전략 (v3 신규)

### 목적

AI 초안이 Gold Standard(원본 보고서)와 **동일한 형식**으로 출력되는지 평가하고, 점수가 낮은 섹션의 프롬프트를 개선하기 위한 피드백을 생성합니다.

### 운용 방식

| 항목 | 내용 |
|------|------|
| **실행 시점** | 프롬프트 튜닝 시에만 수동 실행. 매 보고서 자동 실행 아님 |
| **실행 방법** | Claude.ai 대화에서 직접 실행 (Gold Standard DOCX + AI 초안 JSON 업로드) |
| **필요 모델** | Claude Sonnet 4 이상 (형식 분석에 고급 추론 필요) |
| **채점 체계** | A(형식 60점) + B(사실 25점) + C(Halluc Check 15점) = 100점 |
| **합격 기준** | 75점+ = A(소폭 수정 후 발표 가능) |

### Hallucination Check와의 관계

| | Hallucination Check (WF2 내) | Quality Check (수동) |
|---|---|---|
| **자동화** | ✅ 매 보고서 자동 | ❌ 프롬프트 튜닝 시 수동 |
| **목적** | 팩트 오류 감지 (안전) | 형식 충실도 평가 (품질) |
| **모델** | Haiku (비용 우선) | Sonnet+ (정확도 우선) |
| **Gold Standard** | 불필요 | 필수 |
| **교체 불가** | 목적이 다름 — 둘 다 유지 |

### Quality Check 프롬프트

별도 파일 `quality_check_prompt.md`로 관리. 100점 만점 채점 체계:
- A. 섹션별 형식 충실도 (60점) — 12개 섹션 × 개별 배점
- B. 사실적 정확성 (25점) — 원본 면담 대비 교차 검증
- C. Hallucination Check 실효성 (15점) — FP/FN 분석

### 튜닝 사이클

```
1. Sub-WF 프롬프트 수정
2. PT-2026-001로 E2E 실행
3. AI 초안 + Gold Standard → Quality Check 실행
4. 섹션별 점수 확인 → 최하위 3개 섹션 프롬프트 재수정
5. 반복 (목표: 75점+)
```

---

## 부록: 참조 파일 목록

| 파일 | 위치 | 용도 |
|------|------|------|
| `PROJECT_PLAN_v3.md` | `docs/` | 이 문서 — 종합 기획안 (Single Source of Truth) |
| `PROGRESS_LOG.md` | `docs/` | 세션별 작업 진척 기록 |
| `system_prompt_case_conference.md` | `docs/` | Mode A/B 시스템 프롬프트 상세 |
| `quality_check_prompt.md` | `docs/` | Quality Check 채점 프롬프트 (100점 만점) |
| `system_prompt_section_XX.md` × 12 | `docs/prompts/` | 섹션별 Sub-WF AI 프롬프트 (v3 Dual-Layer) |
| `psychiatric_interview_checklist_v2.html` | `frontend/` | 면담 체크리스트 (Netlify 배포) |
| `psych_terms_dictionary.json` | `config/` | 정신과 용어 교정 사전 |
| `20230927_Case_conference_R2_임지원_mdd_.docx` | (외부) | Gold Standard 보고서 |

## 부록: 워크플로우 & 자격증명 레지스트리

| 워크플로우 | ID | 상태 |
|-----------|-----|------|
| WF3 Error Workflow | `4ox2lxKl1st6pUkY` | ✅ 활성 |
| WF1-B STT Pipeline | `XElVH6RbgWCGZcjO` | ✅ 활성 |
| WF2 보고서 생성 메인 | `LiN5bKslyWtZX6yG` | ✅ 활성 (프롬프트 튜닝 필요) |
| Sub-WF S01~S12 | 별도 ID 12개 | ✅ 활성 |

| 자격증명 | ID | 용도 |
|---------|-----|------|
| Telegram | `8T0Q83WRhTEEdvSL` | PsyCaseAuto Bot |
| Google Drive | `fcKtWyui68XESQND` | Drive 읽기/쓰기 |
| Anthropic | `RiXuEl0fGr0aAGNz` | Claude API |

> **n8n 노드 타입, 연결 형식, 표현식 참조**: `/mnt/skills/user/n8n-workflow-design/SKILL.md` 참조

---

> **Claude Code 작업 시 주의사항**: 이 문서의 의사결정(섹션 2)은 확정 사항입니다. 구현 중 변경이 필요하면 반드시 사용자와 논의 후 이 문서를 먼저 업데이트하세요. 코드보다 기획이 먼저입니다.
