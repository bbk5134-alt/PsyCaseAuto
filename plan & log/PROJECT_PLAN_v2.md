# 정신건강의학과 Case Conference 보고서 자동화 — 종합 기획안

> **프로젝트명**: PsyCaseAuto (Psychiatry Case Conference Automation)
> **버전**: v1.0
> **최종 수정**: 2026-03-27
> **작성 목적**: Claude Code 작업 시 맥락 유지를 위한 단일 참조 문서 (Single Source of Truth)

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
| D-09 | DOCX 변환은 n8n Code 노드에서 docx-js 라이브러리 사용 | JSON → DOCX 변환 자동화 | 2026-03-27 |
| D-10 | 수정 전/후 보고서 모두 Google Drive에 보관 | 추후 프롬프트 개선을 위한 피드백 루프 데이터 확보 | 2026-03-27 |
| D-11 | 면담 체크리스트 프론트엔드는 커스텀 HTML (Netlify 배포) | n8n Form Trigger보다 UX 우수, 모바일 최적화, FCAB 태깅, 메모 기능 | 2026-03-29 |
| D-12 | Present Illness 서술은 FCAB 구조 적용 | 원본 보고서 문체 분석 결과: Fact→Cognition→Affect→Behavior 순서가 일관 | 2026-03-29 |
| D-13 | 에러 처리는 3단계 분류 (RETRYABLE / FATAL / WARN_AND_CONTINUE) | 에러 종류에 따라 재시도/즉시중단/경고후계속 구분 필요 | 2026-03-29 |
| D-14 | WF1-A는 HTML Webhook 수신 + n8n Form Trigger 이중 지원 | HTML이 주 인터페이스, n8n Form은 백업 경로 | 2026-03-29 |

---

## 3. 시스템 아키텍처 전체 설계

```
┌─────────────────────────────────────────────────────────────────────┐
│                        전체 시스템 구조도                            │
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
│  │  ┌─ 섹션 1: Identifying Data ──┐           │                      │
│  │  ├─ 섹션 2: Chief Problems ────┤           │                      │
│  │  ├─ 섹션 3: Informants ────────┤           │                      │
│  │  ├─ 섹션 4: Present Illness ───┤ Sub-WF    │                      │
│  │  ├─ 섹션 5: Past/Family Hx ────┤ × 12     │                      │
│  │  ├─ 섹션 6: Personal History ──┤           │                      │
│  │  ├─ 섹션 7: MSE ──────────────┤           │                      │
│  │  ├─ 섹션 8: Mood Chart ────────┤           │                      │
│  │  ├─ 섹션 9: Dx Formulation ────┤           │                      │
│  │  ├─ 섹션 10: Progress Notes ───┤           │                      │
│  │  ├─ 섹션 11: Case Formulation ─┤ ← 앞 섹션 │                      │
│  │  └─ 섹션 12: Psychodynamic ────┘   결과 참조│                      │
│  │        ↓                                   │                      │
│  │  [JSON 병합] → [Hallucination 검증]        │                      │
│  │        ↓                                   │                      │
│  │  [JSON → DOCX 변환]                        │──→ /PsyCaseAuto/     │
│  │        ↓                                   │    {환자코드}/        │
│  │  [Google Drive 저장]                       │    reports/          │
│  │        ↓                                   │    draft_v1.docx     │
│  │  [Telegram 응답: 완성 링크]                 │                      │
│  └───────────────────────────────────────────┘                      │
│                                                                     │
│  ┌───────────────────────────────────────────┐                      │
│  │  워크플로우 3: Error Workflow               │                      │
│  │  [Error Trigger] → [메시지 구성] → [Telegram]│                     │
│  └───────────────────────────────────────────┘                      │
│                                                                     │
│  ┌───────────────────────────────────────────┐                      │
│  │  인프라                                    │                      │
│  │  - Railway: n8n 호스팅 (고정 Webhook URL)  │                      │
│  │  - Google Drive: 데이터 저장               │                      │
│  │  - OpenAI API: Whisper STT + GPT-4o/Claude │                      │
│  │  - Telegram Bot: 트리거 + 알림             │                      │
│  └───────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 워크플로우 1: 데이터 수집

### 4-A. 설문지 경로 (Google Form → JSON 저장)

#### 트리거
- Google Form 제출 시 Webhook으로 데이터 수신
- 또는: n8n Form Trigger 노드로 자체 설문지 구현

#### 노드 구성

```
[Form Trigger / Webhook]
  ↓
[입력 검증 (Code)]          — 필수 필드(환자코드, 나이, 성별) 확인
  ↓
[데이터 정규화 (Code)]      — 타임스탬프 추가, 필드명 표준화
  ↓
[Google Drive: JSON 저장]   — 경로: /PsyCaseAuto/{환자코드}/interviews/form_{날짜}.json
  ↓
[응답 반환]                 — "면담 데이터 저장 완료"
```

#### 저장 JSON 스키마 (설문지 경로)

```json
{
  "data_type": "form_interview",
  "patient_code": "PT-2023-001",
  "interview_number": 1,
  "interview_date": "2023-09-18",
  "interviewer": "R2",
  "created_at": "2023-09-18T14:30:00+09:00",
  "sections": {
    "identifying_data": {
      "sex": "F",
      "age": 31,
      "birth_place": "서울시 은평구",
      "residence": "경기도 김포시",
      "education": "대졸",
      "occupation": "주부",
      "marital_status": "기혼",
      "religion": "기독교",
      "socioeconomic_status": "상",
      "premorbid_personality": "어린시절부터 밝고 외향적..."
    },
    "chief_problems": [
      {
        "symptom": "우울감",
        "duration": "1년 7개월",
        "onset_detail": "남편과의 갈등 후 시작",
        "informant": "환자"
      }
    ],
    "present_illness_notes": "(자유 텍스트 — 전공의가 면담 중 작성한 메모)",
    "past_history": { "...": "..." },
    "personal_history": { "...": "..." },
    "mse_observations": { "...": "..." }
  }
}
```

### 4-B. 녹음 경로 (음성 파일 → STT → JSON 저장)

#### 트리거
- Webhook: `multipart/form-data`로 음성 파일 수신
- 전공의가 HTML 업로드 폼 또는 iOS 단축어(Shortcuts)로 파일 전송

#### 노드 구성

```
[Webhook: 파일 업로드]
  ↓
[파일 크기 확인 (Code)]     — 25MB 초과 시 청크 분할 경로로 분기
  ↓
[IF: 25MB 이하?]
  ├─ YES → [Whisper API 단일 호출]
  └─ NO  → [FFmpeg 청크 분할 (10분 단위)] → [Loop: Whisper API] → [결과 병합]
  ↓
[STT 후처리 (Code)]
  ├─ 발화자 분리 (의사/환자/보호자)
  ├─ 정신과 용어 사전 기반 교정
  └─ STT 불명확 구간 태깅
  ↓
[Google Drive: 원본 음성 저장]  — /PsyCaseAuto/{환자코드}/audio/
  ↓
[Google Drive: STT JSON 저장]  — /PsyCaseAuto/{환자코드}/interviews/stt_{날짜}.json
  ↓
[Telegram 응답: "STT 변환 완료"]
```

#### 저장 JSON 스키마 (STT 경로)

```json
{
  "data_type": "stt_interview",
  "patient_code": "PT-2023-001",
  "interview_number": 2,
  "interview_date": "2023-09-19",
  "created_at": "2023-09-19T15:00:00+09:00",
  "stt_model": "whisper-1",
  "audio_duration_minutes": 65,
  "transcript": {
    "full_text": "(전체 STT 텍스트)",
    "segments": [
      {
        "speaker": "doctor",
        "text": "언제부터 우울하셨어요?",
        "start_time": "00:01:23",
        "end_time": "00:01:26"
      },
      {
        "speaker": "patient",
        "text": "음... 한 1년? 1년 반? 전부터요.",
        "start_time": "00:01:27",
        "end_time": "00:01:32"
      },
      {
        "speaker": "unknown",
        "text": "[STT_UNCLEAR: 알 수 없는 부분]",
        "start_time": "00:05:10",
        "end_time": "00:05:15",
        "confidence": "low"
      }
    ]
  },
  "post_processing": {
    "terms_corrected": [
      {"original": "에스시탈로프람", "corrected": "escitalopram"},
      {"original": "리튬", "corrected": "lithium"}
    ],
    "unclear_segments_count": 3
  }
}
```

#### STT 발화자 분리 로직

Whisper API는 기본적으로 화자 분리(diarization)를 지원하지 않습니다. 대안:

1. **방법 A (권장)**: STT 변환 후 AI로 발화자 분리
   - Whisper로 전체 텍스트 변환 → 별도 AI 노드에서 "의사/환자/보호자" 분리
   - 프롬프트: "다음 면담 녹취록에서 발화자를 구분하세요. 질문하는 쪽이 의사, 답변하는 쪽이 환자입니다."

2. **방법 B**: pyannote.audio 등 전용 화자 분리 모델 사용
   - 정확도 높지만 별도 서버 필요 → Railway에 추가 서비스 배포 필요
   - v2에서 고려

#### 정신과 용어 교정 사전 (Code 노드에서 사용)

```javascript
const PSYCH_TERMS_MAP = {
  // 약물명
  "에스시탈로프람": "escitalopram",
  "에스시탈": "escitalopram",
  "렉사프로": "escitalopram",
  "리튬": "lithium",
  "트라조돈": "trazodone",
  "알프라졸람": "alprazolam",
  "자낙스": "alprazolam",
  "클로나제팜": "clonazepam",
  "리보트릴": "clonazepam",
  
  // 증상/용어
  "환청": "auditory hallucination",
  "환시": "visual hallucination",
  "망상": "delusion",
  "조현병": "schizophrenia",
  "양극성": "bipolar",
  "경계선": "borderline",
  
  // 구어체 → 임상 용어
  "잠을 못 자요": "불면 (insomnia)",
  "입맛이 없어요": "식욕 저하 (decreased appetite)",
  "죽고 싶어요": "자살사고 (suicidal ideation)",
  "목소리가 들려요": "환청 (auditory hallucination)",
  "살이 빠졌어요": "체중 감소 (weight loss)"
};
```

---

## 5. 워크플로우 2: 보고서 생성

### 트리거

Telegram 메시지로 트리거합니다.

```
전공의 → Telegram Bot: "PT-2023-001 보고서"
```

#### 메시지 파싱 규칙

```javascript
// Telegram 메시지 파싱 (Code 노드)
const message = $input.first().json.message.text;
const match = message.match(/^(PT-\d{4}-\d{3})\s*(보고서|report)/i);

if (!match) {
  return [{
    json: {
      error: "invalid_command",
      message: "형식: 'PT-YYYY-NNN 보고서' (예: PT-2023-001 보고서)"
    }
  }];
}

const patientCode = match[1];
```

### 노드 구성 (전체 흐름)

```
[Telegram Trigger]
  ↓
[메시지 파싱 (Code)]         — 환자코드 추출
  ↓
[Google Drive: 면담 파일 목록 조회]  — /PsyCaseAuto/{환자코드}/interviews/*.json
  ↓
[IF: 면담 파일 존재?]
  ├─ NO → [Telegram 응답: "해당 환자의 면담 데이터가 없습니다"]
  └─ YES ↓
[모든 면담 JSON 로드 (Loop)]
  ↓
[데이터 병합 (Code)]         — 모든 면담을 하나의 통합 데이터로
  ↓
[토큰 수 추정 (Code)]       — 대략 글자수 ÷ 2 ≈ 토큰 수 (한국어)
  ↓
[IF: 토큰 > 80,000?]        — Claude Sonnet 4 컨텍스트의 ~40% 기준
  ├─ YES → [면담별 사전 요약 (Sub-WF)] → 요약본으로 대체
  └─ NO  → 원본 그대로 사용
  ↓
[섹션별 순차 생성 (Sub-WF × 12)]  ← 아래 상세 설명
  ↓
[JSON 병합 (Code)]
  ↓
[Hallucination 검증 (AI)]   — 원본에 없는 정보 교차 검증
  ↓
[JSON → DOCX 변환 (Code)]   — docx-js 라이브러리
  ↓
[Google Drive 저장]          — /PsyCaseAuto/{환자코드}/reports/draft_{날짜}.docx
  ↓
[Telegram 응답: "보고서 완성" + Google Drive 링크]
```

### 섹션별 순차 생성 상세 설계

**왜 섹션별로 나누는가:**
1. LLM의 Lost-in-the-Middle 현상 방지 — 입력이 길면 중간 정보를 놓침
2. Hallucination 감소 — 각 AI 호출이 하나의 명확한 태스크에만 집중
3. 디버깅 용이 — 어떤 섹션에서 문제가 생겼는지 즉시 파악 가능
4. 실패 격리 — 한 섹션이 실패해도 다른 섹션에 영향 없음

#### 섹션별 Sub-workflow 호출 순서

```
Phase 1: 독립 섹션 (앞 섹션 결과 불필요)
─────────────────────────────────────────
  1. Identifying Data       — 입력: 면담 데이터
  2. Chief Problems         — 입력: 면담 데이터
  3. Informants             — 입력: 면담 데이터
  4. Past/Family History    — 입력: 면담 데이터
  5. Personal History       — 입력: 면담 데이터
  6. MSE                    — 입력: 면담 데이터
  7. Mood Chart             — 입력: 면담 데이터 + Progress Notes 원본
  8. Progress Notes         — 입력: 면담 데이터

Phase 2: 의존 섹션 (앞 섹션 결과 필요)
─────────────────────────────────────────
  9. Present Illness        — 입력: 면담 데이터 + Chief Problems 결과 (시간축 참조)
 10. Diagnostic Formulation — 입력: Chief Problems + MSE + Present Illness 결과
 11. Case Formulation       — 입력: 모든 Phase 1 결과 요약
 12. Psychodynamic          — 입력: Personal History + Present Illness + Case Formulation 결과
```

#### 각 Sub-workflow의 공통 구조

```
[Execute Workflow Trigger]
  ↓
[입력 수신 (Code)]           — 면담 데이터 + 해당 섹션 지시사항
  ↓
[AI Agent: 섹션 생성]        — 섹션 전용 시스템 프롬프트
  ↓
[출력 검증 (Code)]           — JSON 스키마 검증, 필수 필드 확인
  ↓
[return 결과]
```

#### Phase 1 vs Phase 2 처리

```javascript
// 메인 워크플로우의 섹션 순차 생성 로직 (Code 노드)
const interviewData = $input.first().json.merged_data;
const results = {};

// Phase 1: 독립 섹션 (병렬 처리 가능하지만, 안정성 위해 순차 권장)
const phase1Sections = [
  'identifying_data', 'chief_problems', 'informants',
  'past_family_history', 'personal_history', 'mse',
  'mood_chart', 'progress_notes'
];

for (const section of phase1Sections) {
  results[section] = await executeSubWorkflow(section, { interviewData });
}

// Phase 2: 의존 섹션 (반드시 순차)
results.present_illness = await executeSubWorkflow('present_illness', {
  interviewData,
  chief_problems: results.chief_problems
});

results.diagnostic_formulation = await executeSubWorkflow('diagnostic_formulation', {
  chief_problems: results.chief_problems,
  mse: results.mse,
  present_illness: results.present_illness
});

results.case_formulation = await executeSubWorkflow('case_formulation', {
  interviewData,
  all_phase1: summarize(results)  // Phase 1 결과 요약본
});

results.psychodynamic = await executeSubWorkflow('psychodynamic', {
  personal_history: results.personal_history,
  present_illness: results.present_illness,
  case_formulation: results.case_formulation
});
```

### 면담 데이터 사전 요약 (토큰 초과 시)

면담을 5회 이상 하면 전체 텍스트가 수십만 토큰이 될 수 있습니다.

```
[토큰 초과 감지]
  ↓
[Loop: 각 면담 파일]
  ↓
[AI: "이 면담에서 12개 섹션별 관련 정보만 추출하세요"]
  ↓
[면담별 요약 JSON 저장]
  ↓
[요약본들을 병합하여 보고서 생성 입력으로 사용]
```

요약 시 시스템 프롬프트:

```
당신은 정신건강의학과 면담 기록 분석가입니다.
다음 면담 기록에서 Case Conference 보고서 12개 섹션에 해당하는 정보만 추출하세요.
원문을 그대로 인용하세요. 추론하거나 요약하지 마세요.
각 정보에 정보 제공자(환자/보호자/관찰)를 태깅하세요.
```

---

## 6. 워크플로우 3: Error Workflow

```
[Error Trigger]
  ↓
[에러 메시지 구성 (Code)]
  - 워크플로우 이름
  - 에러 발생 노드
  - 에러 메시지
  - 타임스탬프 ($now.toISO())
  - 입력 데이터 요약 (환자코드만, 면담 내용 제외 — 개인정보보호)
  ↓
[Telegram 발송]
  - 전공의에게 에러 알림
  - "WF1 오류: STT 변환 실패 (PT-2023-001, 2026-03-27 14:30)"
```

### 에러 메시지 템플릿

```javascript
const errorMsg = `⚠️ PsyCaseAuto 오류 발생

워크플로우: ${$execution.workflow.name}
노드: ${$execution.errorNode?.name || 'unknown'}
시간: ${$now.toFormat('yyyy-MM-dd HH:mm')}
환자: ${$execution.data?.patientCode || 'N/A'}
오류: ${$execution.errorMessage?.substring(0, 200)}

상세 로그는 n8n 대시보드에서 확인하세요.`;
```

### 에러 분류 체계 (3단계)

```javascript
const ERROR_STRATEGIES = {
  RETRYABLE: [              // 재시도 (최대 3회, exponential backoff)
    'WHISPER_API_ERROR',    // STT 변환 실패
    'CLAUDE_API_ERROR',     // AI 보고서 생성 실패
    'GOOGLE_DRIVE_ERROR',   // Drive 저장 실패
    'NETWORK_TIMEOUT',      // 네트워크 타임아웃
  ],
  FATAL: [                  // 즉시 실패 → Telegram 알림 + 중단
    'UNAUTHORIZED',         // API 키 만료/무효
    'SESSION_MISMATCH',     // 환자코드 불일치
    'INSUFFICIENT_DATA',    // 면담 데이터 부족 (500자 미만)
    'FILE_TOO_LARGE',       // 녹음 파일 25MB 초과 (청크 분할 실패 시)
    'UNSUPPORTED_FORMAT',   // 지원하지 않는 파일 형식
  ],
  WARN_AND_CONTINUE: [      // 경고 로그 후 계속 진행
    'TELEGRAM_SEND_FAILED', // 알림 발송 실패
    'STT_LOW_CONFIDENCE',   // STT 인식 신뢰도 낮음
    'SECTION_GENERATION_PARTIAL', // 일부 섹션 생성 불완전
  ],
};
```

### 비용 추산 (월 50건 면담 기준)

| 항목 | 단가 | 월 비용 |
|------|------|---------|
| Claude Sonnet 4 (보고서 12섹션 × 50건) | ~$0.15/보고서 | ~$7.50 |
| OpenAI Whisper STT (30분 × 50건) | $0.006/분 × 30분 = $0.18/건 | ~$9.00 |
| Hallucination 검증 AI (50건) | ~$0.05/건 | ~$2.50 |
| Google Drive (저장) | 무료 (15GB 이내) | $0 |
| Netlify (HTML 체크리스트) | 무료 | $0 |
| Railway (n8n 호스팅, 기존 인스턴스 공유) | 기존 비용에 포함 | ~$5 |
| **합계** | | **~$24/월 (약 35,000원)** |

---

## 7. Anti-Hallucination 전략

**이 섹션은 프로젝트의 가장 중요한 품질 기준입니다.**

### 7-1. 프롬프트 수준 방어

모든 AI 노드(섹션별 Sub-workflow 포함)의 시스템 프롬프트에 다음을 **최상단에** 배치합니다:

```
# ⚠️ ANTI-HALLUCINATION RULES (최우선 적용 — 이 규칙은 다른 모든 지시보다 우선합니다)

1. 입력 텍스트에 명시적으로 존재하지 않는 정보를 절대 생성하지 마라.
2. 모든 출력 문장에 source_ref(원본 출처)를 태깅하라.
   - 태깅할 수 없는 문장은 삭제하라.
   - 형식: "source_ref": "면담{N}_{발화자}_L{시작줄}-L{끝줄}"
3. "~였을 것이다", "~로 추정된다" 같은 추론 표현은 
   Case Formulation(섹션 11)과 Psychodynamic Formulation(섹션 12)에서만 허용한다.
   다른 섹션에서는 절대 사용하지 마라.
4. Present Illness, Personal History, MSE 섹션에서는 
   입력 원문에 근거가 없는 문장을 단 하나도 작성하지 마라.
5. 확인되지 않은 정보는 반드시 "status": "missing"으로 표시하라.
   빈칸이 지어낸 내용보다 100배 낫다.
6. 날짜, 기간, 약물명, 용량 등 구체적 사실은 입력 원문과 정확히 일치해야 한다.
   기억이 불확실하면 "확인 필요"로 표시하라.
```

### 7-2. 구조적 방어 (출력 JSON 설계)

보고서의 모든 문장에 출처를 강제합니다:

```json
{
  "present_illness": {
    "timeline": [
      {
        "timepoint": "내원 2년 2개월 전",
        "event": "회사를 그만둠",
        "narrative": "환자는 친구들과 대화하며 결혼을 일찍 하지 않았다면...",
        "source_ref": "면담1_환자_L15-L18",
        "type": "verbatim",
        "confidence": "high"
      }
    ]
  }
}
```

`type` 필드 정의:
- `"verbatim"`: 환자/보호자가 직접 말한 내용 (사실)
- `"observation"`: 면담자가 직접 관찰한 내용 (사실)
- `"collateral"`: 보호자 등 제3자가 제공한 정보 (사실, 교차검증 필요)
- `"inference"`: AI의 임상적 추론 (Case Formulation/Psychodynamic에서만 허용)

### 7-3. 후처리 검증 노드

보고서 생성 후, 별도 AI 호출로 교차 검증합니다:

```
시스템 프롬프트:
"당신은 의료 보고서 팩트체커입니다.
[원본 면담 데이터]와 [생성된 보고서]를 비교하여,
보고서에 포함되어 있지만 원본에 근거가 없는 내용을 모두 찾아내세요.

확인 항목:
1. 원본에 없는 날짜, 기간이 보고서에 있는가?
2. 원본에 없는 약물명, 용량이 보고서에 있는가?
3. 원본에 없는 증상, 진단명이 보고서에 있는가?
4. 원본에 없는 가족관계, 인물이 보고서에 있는가?
5. Present Illness나 Personal History에 추론 표현이 있는가?

결과를 JSON으로 반환:
{
  "hallucination_detected": true/false,
  "issues": [
    {
      "section": "present_illness",
      "problematic_text": "...",
      "reason": "원본에 해당 날짜 언급 없음",
      "severity": "high"
    }
  ]
}
"
```

### 7-4. 방어 계층 요약

```
Layer 1: 프롬프트 규칙          — "생성하지 마라" 명시적 지시
Layer 2: 출력 구조 강제         — source_ref 필수 태깅
Layer 3: 섹션별 분리 생성       — 컨텍스트 축소로 환각 감소
Layer 4: 후처리 팩트체크        — 별도 AI로 교차 검증
Layer 5: 전공의 최종 검토       — 인간의 최종 판단 (가장 중요)
```

---

## 8. AI 시스템 프롬프트

시스템 프롬프트는 별도 파일로 관리합니다.

- **Mode A (면담 체크리스트)**: `system_prompt_mode_a_checklist.md`
- **Mode B (보고서 생성 — 섹션별)**: `system_prompt_mode_b_section_{N}.md` × 12

상세 프롬프트 내용은 `system_prompt_case_conference.md` 파일을 참조하세요.

### 섹션별 프롬프트 핵심 차이

| 섹션 | 핵심 지시 | 특수 규칙 |
|------|----------|----------|
| 1. Identifying Data | 인적사항 추출 | 개인정보 비식별화 필수 |
| 2. Chief Problems | 주호소 + remote/recent onset | DSM-5-TR 용어로 변환 |
| 3. Informants | 정보 제공자별 신뢰도 | 관찰 기반 서술 |
| 4. Present Illness | **시간순 정렬이 핵심** | "내원 N개월 전" 정규화, 문체 규칙 엄격 |
| 5. Past/Family Hx | 과거력, 가족력, 투약 | 약물명/용량 정확히 |
| 6. Personal History | 발달 단계별 서술 | 환자 나이에 따라 단계 조정 |
| 7. MSE | 9개 하위 항목 | 표준 평가 용어 사용, 관찰 기반 |
| 8. Mood Chart | 시점별 기분 데이터 | 시각화용 숫자 데이터 추출 |
| 9. Dx Formulation | 진단 후보 제시 | "최종 진단은 전공의 판단" 명시 |
| 10. Progress Notes | SOAP 형식 | 날짜별 분리, HD# 자동 계산 |
| 11. Case Formulation | 4P 모델 | `"confidence": "draft"` 필수 |
| 12. Psychodynamic | 역동적 공식화 | `"confidence": "draft"` + `"requires_review": true` |

---

## 9. STT 처리 전략

### Whisper API 호출 설정

```javascript
// n8n HTTP Request 노드 설정
const formData = new FormData();
formData.append('file', audioBuffer, { filename: 'interview.m4a' });
formData.append('model', 'whisper-1');
formData.append('language', 'ko');
formData.append('response_format', 'verbose_json');  // 타임스탬프 포함
formData.append('prompt', 
  'escitalopram lithium trazodone alprazolam clonazepam ' +
  '우울감 자살사고 환청 환시 망상 양극성 경계선 ' +
  'PHQ-9 C-SSRS BDI BAI MDQ ' +
  '정신건강의학과 정신상태검사 현병력 개인력'
);
```

`prompt` 파라미터에 자주 등장하는 전문용어를 넣으면 Whisper의 인식률이 크게 향상됩니다.

### 긴 녹음 파일 처리 (25MB 초과)

```
[파일 크기 확인]
  ↓
[IF: > 25MB]
  ├─ YES → [Code: FFmpeg로 10분 청크 분할]
  │         → [Loop: 각 청크를 Whisper API 호출]
  │         → [Code: 결과 병합 (타임스탬프 연속 조정)]
  └─ NO  → [단일 Whisper API 호출]
```

FFmpeg 청크 분할 (n8n Code 노드):

```javascript
// Railway의 n8n 컨테이너에 FFmpeg이 설치되어 있어야 함
// Docker 이미지에 ffmpeg 추가 필요
const { execSync } = require('child_process');

// 10분(600초) 단위로 분할
execSync(`ffmpeg -i /tmp/input.m4a -f segment -segment_time 600 -c copy /tmp/chunk_%03d.m4a`);
```

### STT 품질 보증

| 상황 | 처리 |
|------|------|
| 인식 불가 구간 | `"[STT_UNCLEAR: 원본]"` 태깅 |
| 전문용어 오인식 | 용어 사전 기반 자동 교정 |
| 발화자 불분명 | `"speaker": "unknown"` 태깅 |
| 소음/잡음 구간 | `"confidence": "low"` 표시 |

---

## 10. 보고서 구조

원본 Case Conference 보고서(`20230927_Case_conference_R2_임지원_mdd_.docx`)에서 추출한 12개 섹션 구조입니다.

### 섹션 목록

```
I.   Identifying Data (인적사항)
II.  Chief Problems and Durations (주호소 및 기간)
     + Informants & Reliability (정보 제공자 및 신뢰도)
III. Present Illness (현병력)
IV.  Past History and Family History (과거력 및 가족력)
     + Family Pedigree (가계도)
V.   Personal History (개인력)
     - Prenatal and Perinatal
     - Early Childhood (출생~3세)
     - Middle Childhood (3~11세)
     - Late Childhood (~18세)
     - Adulthood
VI.  Mental Status Examination (정신상태검사)
     1. General Appearance, Attitude, Behaviors
     2. Mood and Affect
     3. Speech Characteristics
     4. Perception
     5. Thought Content and Process
     6. Sensorium and Cognition
     7. Impulsivity (자살/타해 위험성)
     8. Judgment and Insight
     9. Reliability
     + Mood Chart
VII. Diagnostic Formulation (진단적 공식화)
VIII.Progress Notes (경과 기록 — SOAP × N일)
IX.  Family History — 사회사업팀 (별도)
X.   심리팀 (별도)
XI.  Case Formulation (사례 공식화 — 4P 모델)
XII. Psychodynamic Formulation (정신역동적 공식화)
```

### Present Illness 문체 규칙 — FCAB 프레임워크 (원본 분석 기반)

원본 보고서에서 추출한 문체 패턴. **모든 Present Illness 문장은 FCAB 구조를 따릅니다:**

```
FCAB = Fact → Cognition → Affect → Behavior

[Fact]      객관적 사건/상황: "남편이 내조에 집중해 달라고 하자"
[Cognition] 환자의 해석/사고: "환자는 남편이 자신의 능력을 무시한다는 생각에"
[Affect]    감정 반응:        "우울 및 절망감 악화되어"
[Behavior]  행동 결과:        "한달 뒤 한 local PY에 내원하여 치료받기 시작했다고 한다."
```

**서술 규칙:**
```
1. 3인칭 서술: "환자는 ~했다고 한다"
2. 간접화법: "~라는 생각에", "~하는 마음에"
3. 시점 표기: "내원 N년 N개월 전"
4. FCAB 순서 엄격 적용 (위 예시 참조)
5. 정보 제공자 표기: "By. 환자", "By. 환자, 환자의 남편"
6. 관계 표기: "환부", "환모", "환자의 남편" (실명 사용 금지)
```

**FCAB 검증 규칙 (AI 출력 검증 시):**
- Cognition이 없는 문장은 경고 (환자의 해석이 누락됨)
- Fact가 없는 Cognition은 Hallucination 의심 (촉발 사건 없이 사고만 서술)
- 한 단락 내 4개 요소가 모두 있으면 `"fcab_compliance": true`

### MSE 표준 용어

```
Mood:    depressed / euthymic / elevated / irritable / anxious
Affect:  appropriate / inappropriate / broad / restricted / flat / labile
Speech:  rate (slow/moderate/rapid), tone (low/moderate/high), 
         productivity (poverty/moderate/pressured), spontaneity (+/-)
Insight: 1. Complete denial
         2. Slight awareness + externalization
         3. Awareness but blaming external factors
         4. Awareness that illness is due to something unknown in the patient
         5. Intellectual insight
         6. True emotional insight
```

---

## 11. 데이터 모델

### Google Drive 폴더 구조

```
/PsyCaseAuto/
  ├── config/
  │   ├── psych_terms_dictionary.json    — 정신과 용어 교정 사전
  │   └── report_template.json           — 보고서 JSON 템플릿
  │
  ├── PT-2023-001/                       — 환자별 폴더 (코드 기반)
  │   ├── interviews/
  │   │   ├── form_2023-09-18.json       — 설문지 면담 데이터
  │   │   ├── stt_2023-09-19.json        — STT 변환 면담 데이터
  │   │   ├── stt_2023-09-22.json
  │   │   └── stt_2023-09-25.json
  │   ├── audio/
  │   │   ├── interview_2023-09-19.m4a   — 원본 녹음 파일
  │   │   └── interview_2023-09-22.m4a
  │   ├── reports/
  │   │   ├── draft_2023-09-27_v1.json   — AI 생성 초안 (JSON)
  │   │   ├── draft_2023-09-27_v1.docx   — AI 생성 초안 (DOCX)
  │   │   └── final_2023-09-27.docx      — 전공의 수정 완료본
  │   └── logs/
  │       └── hallucination_check_2023-09-27.json — 팩트체크 결과
  │
  └── PT-2023-002/
      └── ...
```

### 환자 코드 체계

```
PT-{연도}-{순번 3자리}
예: PT-2023-001, PT-2024-015

코드 ↔ 실명 매핑은 병원 내부에서만 관리 (이 시스템에 포함하지 않음)
```

---

## 12. 보안 및 개인정보보호

### 원칙

1. **실명 사용 금지**: 시스템 내 모든 데이터에서 환자 실명 대신 코드(PT-YYYY-NNN) 사용
2. **관계 표기**: 환부, 환모, 환자의 남편, 환자의 동생 등 관계로만 표기
3. **자동 비식별화**: STT 결과에 실명이 포함된 경우 자동 치환
4. **Google Drive 접근 제한**: 전공의 개인 Google 계정의 Drive만 사용
5. **전송 암호화**: 모든 API 통신은 HTTPS

### STT 실명 자동 치환 로직

```javascript
// STT 후처리 Code 노드
function deidentify(text, knownNames) {
  let result = text;
  
  // 알려진 이름 치환
  for (const [name, relation] of Object.entries(knownNames)) {
    result = result.replaceAll(name, relation);
  }
  
  // 3글자 한국 이름 패턴 치환 (선택적)
  // 주의: 오탐 가능성 있으므로 기본 비활성화
  // result = result.replace(/[가-힣]{2,4}(씨|님|환자)/g, '환자$1');
  
  return result;
}

// 사용 예
const knownNames = {
  "김영희": "환자",      // 전공의가 사전에 입력
  "이철수": "환자의 남편",
  "박미숙": "환모"
};
```

---

## 13. 배포 환경

### Railway 설정

```yaml
# railway.toml
[deploy]
  startCommand = "n8n start"

[build]
  dockerfilePath = "Dockerfile"
```

```dockerfile
# Dockerfile
FROM n8nio/n8n:latest

# FFmpeg 설치 (STT 청크 분할용)
USER root
RUN apk add --no-cache ffmpeg
USER node

# 환경변수
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_PORT=5678
ENV GENERIC_TIMEZONE=Asia/Seoul
ENV N8N_DEFAULT_BINARY_DATA_MODE=filesystem
ENV N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

### 필수 환경변수 (Railway Variables)

```
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<secure_password>
N8N_ENCRYPTION_KEY=<auto_generated>
GENERIC_TIMEZONE=Asia/Seoul
N8N_DEFAULT_BINARY_DATA_MODE=filesystem

# 외부 서비스 키
OPENAI_API_KEY=sk-...              # Whisper STT + GPT-4o
ANTHROPIC_API_KEY=sk-ant-...       # Claude (선택)
TELEGRAM_BOT_TOKEN=...             # Telegram Bot
GOOGLE_DRIVE_CREDENTIALS=...       # Google Drive OAuth

# 앱 설정
PATIENT_DRIVE_ROOT_FOLDER_ID=...   # Google Drive 루트 폴더 ID
```

### Railway 배포 후 확인사항

- [ ] Webhook URL 고정 확인 (Railway 커스텀 도메인 또는 기본 도메인)
- [ ] Telegram Bot Webhook 연결
- [ ] Google Drive OAuth 토큰 정상 발급
- [ ] 타임존 Asia/Seoul 설정 확인
- [ ] n8n 대시보드 로그인 정상

### Netlify 배포 (HTML 체크리스트)

```
배포 방법:
1. app.netlify.com/drop 접속
2. psychiatric_interview_checklist.html 드래그
3. Site settings → Site protection → Password 설정
4. 전공의에게 URL + 비밀번호 전달

업데이트 방법:
- 같은 사이트에 수정된 파일 다시 드래그

HTML → n8n 연결:
- HTML의 Webhook 설정에 Railway n8n의 WF1-A Webhook URL 입력
- X-Webhook-Secret 헤더로 인증
```

---

## 14. 실수 방지 체크리스트

### 개발 단계

- [ ] Error Workflow(WF3) 가장 먼저 생성
- [ ] 모든 워크플로우 Settings에 `errorWorkflow` ID 연결
- [ ] 환경변수로 API 키, 폴더 ID 관리 (`$env` 사용)
- [ ] 하드코딩된 chatId, 파일 경로 없는지 확인
- [ ] 타임존 설정 (`Asia/Seoul`)
- [ ] 동시성 제한 (`maxConcurrency: 1`) — 환자 데이터 혼선 방지
- [ ] 모든 AI 프롬프트에 Anti-Hallucination 규칙 포함
- [ ] STT 전처리 노드에 빈 입력 처리 (`alwaysOutputData: true`)
- [ ] Sub-workflow에 `executeWorkflowTrigger` v1 사용 (v1.1 아님)
- [ ] 노드 참조 시 `.first().json` 사용 (`.item` 아님)
- [ ] 타임스탬프는 `$now.toISO()` 사용 (`new Date()` 아님)

### 배포 단계

- [ ] Railway Webhook URL 고정 확인
- [ ] Google Drive 토큰 refresh 설정
- [ ] Telegram Bot Webhook 정상 연결
- [ ] Error Workflow 테스트 (의도적 에러 발생 → Telegram 알림 확인)
- [ ] 워크플로우 JSON 정기 백업 설정

### 운영 단계

- [ ] 워크플로우 JSON을 매주 Google Drive에 Export
- [ ] Hallucination 검증 결과 주간 리뷰
- [ ] STT 용어 교정 사전 월간 업데이트
- [ ] CHANGELOG 매 수정 시 업데이트

### 테스트 시나리오 (구현 완료 후 전수 검증)

| # | 시나리오 | 입력 | 기대 결과 |
|---|---------|------|----------|
| T-01 | 정상: 체크리스트 70% + 메모 | HTML 체크리스트 제출 | Google Drive JSON 저장 + 응답 |
| T-02 | 정상: 녹음 30분 | m4a 파일 업로드 | STT → JSON 저장 + Telegram 알림 |
| T-03 | 정상: 보고서 생성 | "PT-2024-001 보고서" | 12섹션 JSON + DOCX + Drive 링크 |
| T-04 | 엣지: 면담 5회 토큰 초과 | 면담 5개 합산 80K+ 토큰 | 사전 요약 → 보고서 생성 |
| T-05 | 엣지: STT 저품질 | 소음 많은 녹음 | [STT_UNCLEAR] 태깅 + confidence: low |
| T-06 | 에러: 면담 데이터 없음 | "PT-9999-999 보고서" | Telegram "해당 환자 데이터 없음" |
| T-07 | 에러: 불충분한 입력 | 43자 메모만 | 부분 보고서 + Mode A 안내 |
| T-08 | 에러: 파일 25MB 초과 | 대용량 녹음 | FFmpeg 청크 분할 → 순차 STT |
| T-09 | 에러: API 타임아웃 | Claude API 지연 | 3회 재시도 → 실패 시 Telegram 알림 |
| T-10 | 보안: 실명 포함 STT | 환자 실명 포함 텍스트 | 자동 치환 + privacy_action 로깅 |

---

## 15. 알려진 위험 및 대응 계획

### 위험 1: 환자 개인정보 유출

| 항목 | 내용 |
|------|------|
| **위험도** | 높음 |
| **시나리오** | STT 텍스트에 실명, 주소, 전화번호가 포함된 채 Google Drive에 저장 |
| **대응** | STT 후처리에서 실명 자동 치환, 코드 기반 식별 체계, Google Drive 접근 제한 |
| **잔여 위험** | 자동 치환 누락 가능 → 전공의가 저장 전 검토 |

### 위험 2: AI Hallucination으로 인한 오진 유도

| 항목 | 내용 |
|------|------|
| **위험도** | 높음 |
| **시나리오** | AI가 면담에 없는 증상/진단을 보고서에 포함 → 전공의가 검토 없이 발표 |
| **대응** | 4계층 방어 (프롬프트 → 출력구조 → 팩트체크 → 인간검토), `source_ref` 강제 |
| **잔여 위험** | 전공의가 검토를 건너뛸 가능성 → Case Formulation/Psychodynamic에 `"⚠️ 반드시 검토 필요"` 표시 |

### 위험 3: STT 오인식으로 인한 의미 왜곡

| 항목 | 내용 |
|------|------|
| **위험도** | 중간 |
| **시나리오** | "자살사고 없음"이 "자살사고 있음"으로 잘못 인식 |
| **대응** | STT 불명확 구간 태깅, confidence 점수 표시, 용어 사전 교정 |
| **잔여 위험** | 완벽한 해결 불가 → STT 결과를 전공의가 검토하도록 안내 |

### 위험 4: 토큰 한계로 인한 정보 누락

| 항목 | 내용 |
|------|------|
| **위험도** | 중간 |
| **시나리오** | 면담 5회 이상 시 전체 텍스트가 모델 컨텍스트 초과 |
| **대응** | 토큰 초과 시 면담별 사전 요약 → 요약본으로 보고서 생성 |
| **잔여 위험** | 요약 과정에서 세부 정보 손실 → 중요 정보 누락 가능 |

### 위험 5: Google Drive / OpenAI API 인증 만료

| 항목 | 내용 |
|------|------|
| **위험도** | 낮음 |
| **시나리오** | OAuth 토큰 만료로 워크플로우 중단 |
| **대응** | Error Workflow에서 인증 오류 감지 시 Telegram 알림, refresh token 설정 |
| **잔여 위험** | 자동 복구 불가 → 수동으로 재인증 필요 |

---

## 16. 구현 로드맵

### Phase 1: 기반 구축 (Week 1)

```
[ ] Railway에 n8n 배포 + FFmpeg 설치
[ ] Telegram Bot 생성 + Webhook 연결
[ ] Google Drive OAuth 설정 + 폴더 구조 생성
[ ] Error Workflow (WF3) 구현 + 테스트
[ ] 정신과 용어 교정 사전 (psych_terms_dictionary.json) 초안 작성
```

### Phase 2: 데이터 수집 (Week 2)

```
[ ] WF1-A: 설문지 경로 구현 (Form/Webhook → JSON → Google Drive)
[ ] WF1-B: 녹음 경로 구현 (Webhook → Whisper STT → 후처리 → Google Drive)
[ ] STT 발화자 분리 로직 구현
[ ] STT 용어 교정 로직 구현
[ ] 실명 자동 비식별화 로직 구현
[ ] 테스트: 실제 면담 시나리오 3개로 end-to-end 테스트
```

### Phase 3: 보고서 생성 (Week 3-4)

```
[ ] WF2: Telegram 트리거 + 메시지 파싱
[ ] WF2: Google Drive에서 환자 면담 데이터 조회/병합
[ ] WF2: 토큰 초과 판별 + 사전 요약 Sub-WF
[ ] 섹션별 Sub-WF 12개 구현
    [ ] 섹션 1-8 (Phase 1: 독립)
    [ ] 섹션 9-12 (Phase 2: 의존)
[ ] Hallucination 검증 노드 구현
[ ] JSON → DOCX 변환 로직 구현
[ ] 테스트: 원본 보고서와 AI 생성 보고서 비교
```

### Phase 4: 안정화 + 피드백 (Week 5)

```
[ ] 실사용 테스트 (여자친구 피드백 반영)
[ ] 프롬프트 튜닝 (실제 보고서 품질 기반)
[ ] 에러 케이스 대응 보강
[ ] 문서화 최종 정리
[ ] 피드백 루프 구조 구축 (수정 전/후 보고서 보관)
```

---

## 부록 A: n8n 노드 타입 참조

| 용도 | 노드 타입 | 비고 |
|------|----------|------|
| Webhook | `n8n-nodes-base.webhook` | Railway 고정 URL |
| Telegram 수신 | `n8n-nodes-base.telegramTrigger` | Bot Token 필요 |
| Telegram 발송 | `n8n-nodes-base.telegram` | |
| Google Drive | `n8n-nodes-base.googleDrive` | OAuth2 |
| AI Agent | `@n8n/n8n-nodes-langchain.agent` | Claude/GPT 모두 지원 |
| LLM (직접 호출) | `@n8n/n8n-nodes-langchain.lmChatAnthropic` | Claude Sonnet 4 |
| HTTP Request | `n8n-nodes-base.httpRequest` | Whisper API 호출용 |
| Code | `n8n-nodes-base.code` | JS 실행 |
| Switch | `n8n-nodes-base.switch` | 분기 |
| IF | `n8n-nodes-base.if` | 조건 |
| Loop | `n8n-nodes-base.splitInBatches` | 반복 |
| Sub-WF 트리거 | `n8n-nodes-base.executeWorkflowTrigger` | v1 사용 |
| Sub-WF 호출 | `n8n-nodes-base.executeWorkflow` | |
| Error Trigger | `n8n-nodes-base.errorTrigger` | |
| Form Trigger | `n8n-nodes-base.formTrigger` | 자체 설문 |

## 부록 B: 참조 파일 목록

| 파일 | 용도 |
|------|------|
| `PROJECT_PLAN.md` | 이 문서 — 종합 기획안 (Single Source of Truth) |
| `system_prompt_case_conference.md` | Mode A/B 시스템 프롬프트 상세 |
| `psychiatric_interview_checklist.html` | 면담 체크리스트 (Netlify 배포, FCAB 태깅, Webhook 전송) |
| `20230927_Case_conference_R2_임지원_mdd_.docx` | 원본 보고서 샘플 (보고서 구조 참조용) |
| `config/psych_terms_dictionary.json` | 정신과 용어 교정 사전 (STT 후처리용) |
| `PROGRESS_LOG.md` | 세션별 작업 진척 기록 |

---

> **Claude Code 작업 시 주의사항**: 이 문서의 의사결정(섹션 2)은 확정 사항입니다. 구현 중 변경이 필요하면 반드시 사용자와 논의 후 이 문서를 먼저 업데이트하세요. 코드보다 기획이 먼저입니다.
