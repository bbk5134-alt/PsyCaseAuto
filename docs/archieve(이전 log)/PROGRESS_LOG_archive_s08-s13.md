# PROGRESS_LOG Archive — 세션 8~13

> **아카이브 일시**: 2026-04-03
> **아카이브 범위**: 세션 8, 8.5, 8.7, 9, 9.2, 9.3, 10, 11, 13(Phase 2 QC)
> **아카이브 이유**: PROGRESS_LOG.md 용량 최적화 (51KB → ~24KB)
> **활성 로그**: `docs/PROGRESS_LOG.md` (세션 13 추가분~19)

---

### 세션 11 — M8 작업 3~6, 버그 수정 (2026-04-02)

#### 작업 내용

M8 완료 작업: 작업 3(E2E 1차), 작업 4(S09~S12 AI Agent 검증), 작업 5(HTML 노드 검증), 작업 6(E2E 2차 + 버그 수정).

| 작업 | 내용 | 상태 |
|------|------|:----:|
| 작업 3 | E2E 1차 테스트 (Phase 1) | 🔴 수동 실행 필요 (Telegram Trigger) |
| 작업 4 | S09~S12 AI Agent 전환 + D-26 null 방어 검증 | ✅ 완료 |
| 작업 5 | HTML 변환 노드(`s34-c4`) 검증 | ✅ 이미 완료 상태 확인 |
| 작업 6 | E2E 2차 테스트 → 버그 발견 및 수정 | ✅ 버그 수정 완료 |

#### 작업 4 상세: S09~S12 AI Agent 전환 검증

| Sub-WF | ID | 결과 |
|--------|-----|------|
| S09 Present Illness | `4VyEFSX0H0FD2ilK` | ✅ 이미 AI Agent (typeVersion 3.1) |
| S10 Diagnostic Formulation | `6sRG5BX5uBhcRtj1` | ✅ 이미 AI Agent (typeVersion 3.1) |
| S11 Case Formulation | `xnJZXam1BZB7Iypu` | ✅ AI Agent 교체 완료 (세션 10 연속) |
| S12 Psychodynamic Formulation | `Hq4QhEKT48aPShWb` | ✅ 이미 AI Agent (typeVersion 3.1) |

- WF2 D-26 null 방어 코드: Phase 2 relay 노드 4개 모두 `?.` optional chaining + `[SYSTEM NOTE: XXX 미생성]` fallback 확인 ✅

#### 작업 5 상세: HTML 변환 노드 (`s34-c4`) 검증

작업 문서의 `ctx.final_report?.sections` 참조는 구 설계 잔재. 현재 구현 이미 올바름:
- `ctx.final_report?.all_sections` — Phase 2 병합 출력 키와 일치 ✅
- `sec.narrative || sec.content` — Dual-Layer 읽기 ✅
- `mental_status_exam` 키 — S06 출력 → Phase 1 병합 → Phase 2 병합 → HTML 전 구간 일치 ✅
- HTML escape + `\n→<br>` 변환, `draft` 경고 배너, `HIGH_SUICIDE_RISK` 배너 모두 정상 ✅

#### 작업 6 상세: 버그 수정 — "Single '}' in template"

**증상**: WF2 E2E 실행 시 S05, S06, Hallucination 검증 AI Agent 3곳에서 `Error in 15~63ms` 발생

**근본 원인**:
- n8n Agent `typeVersion 1.x` 노드는 `options.systemMessage`를 템플릿 문자열로 파싱
- Dual-Layer 시스템 프롬프트의 Output Format 섹션에 JSON `}` 문자 존재
- n8n 파서가 `}` 를 `{{ }}` expression 닫는 기호로 오인 → "Single '}' in template" 에러
- `typeVersion 3.1` 노드는 `systemMessage`를 순수 문자열로 처리 (S01~S04, S07~S08, S09~S12 정상)

**수정 내용**:

| 노드 | 워크플로우 | 변경 |
|------|-----------|------|
| S05 Personal History Agent | `SmR2paPpXEYTuWZO` | `typeVersion: 1` → `3.1` + `promptType: "define"` 추가 |
| S06 MSE Agent | `Qp0IXqsbounP2X1l` | `typeVersion: 1` → `3.1` + `promptType: "define"` 추가 |
| Hallucination 검증 AI Agent (`s34-a2`) | WF2 `LiN5bKslyWtZX6yG` | `typeVersion: 1.7` → `3.1` |

**재발 방지**: AI Agent 노드 신규 생성/수정 시 반드시 `typeVersion: 3.1` + `promptType: "define"` 사용.

#### 세션 11 상태: 버그 수정 완료 — E2E 재실행 대기

---

### 세션 10 — M8 n8n 노드 업데이트 (2026-04-02)

#### 작업 내용

Milestone 8: n8n WF2 메인 + Sub-WF S01~S08 AI Agent 전환 및 Dual-Layer 파싱 코드 적용.

| 작업 | 대상 | 상태 | 내용 |
|------|------|:----:|------|
| 작업 1 | `s34-a2` Hallucination 검증 노드 | ✅ 완료 | HTTP Request(Haiku) → AI Agent + Gemini Flash 전환 |
| Pre-작업 2 | `s34-a1`, `s34-a3`, `s34-c6` | ✅ 완료 | 3개 노드 코드 수정 (아래 상세) |
| 작업 2 | Sub-WF S01~S08 | ✅ 완료 | AI Agent 전환 + Dual-Layer 파싱 코드 전체 적용 |

#### 작업 1 상세: Hallucination 검증 노드 전환 (WF2 `s34-a2`)

- **변경 전**: HTTP Request → `anthropic/v1/messages` (claude-haiku-4-5)
- **변경 후**: AI Agent (`conversationalAgent`) + Gemini Flash (`gemini-2.5-flash-preview`) 서브노드
- 새 노드 추가: `s34-a2-gemini` (`lmChatGoogleGemini`, `ai_languageModel` 연결)
- System Message: Hallucination 검증 전용 프롬프트 (새 Gemini JSON 출력 포맷 포함)
- User Message: `={{ $input.first().json.hallucination_check_input }}`

#### Pre-작업 2 수정: 3개 WF2 노드 코드 교체

**`s34-a1` (Hallucination 검증 준비)**
- `system_prompt` 키 제거 (AI Agent 방식에서 불필요)
- `FACTUAL_SECTION_KEYS` 10개로 확장 (기존 일부 누락 키 보완)
- 컨텍스트 절단 방어: 원문 6000자 초과 시 5개 핵심 섹션만 검증 (`context_truncated` 플래그)

**`s34-a3` (검증 결과 통합)**
- Gemini 신규 JSON 구조 파싱 (`hallucination_check.passed`, `.issues`, `.sections_checked`)
- 구 Haiku 포맷(`hallucination_detected`) 제거
- parse_error 폴백 처리 강화

**`s34-c6` (완성 메시지 구성)**
- 참조 키 교체: `hallucination_detected` → `check.passed` / `check.issues`
- `context_truncated` 플래그 반영 (Telegram 알림에 "⚡ 원문 절단" 표시)
- `sections_checked` 목록 알림에 포함

#### 작업 2 상세: Sub-WF S01~S08 AI Agent 전환

**S01~S04** (이미 AI Agent 구조, 파라미터 업데이트)

| Sub-WF | 섹션 | 적용 내용 |
|--------|------|----------|
| S01 | Identifying Data | systemMessage (전용 프롬프트), promptType: define, text 표현식, 모델 설정, Dual-Layer parse |
| S02 | Chief Problems | 동일 패턴 |
| S03 | Informants | 동일 패턴 |
| S04 | Past/Family Hx | 동일 패턴 |

**S05~S06** (HTTP Request → AI Agent 구조 교체, 8 ops)

- `입력 준비` 노드 제거 (Code 노드)
- `Claude API 호출` 노드 제거 (HTTP Request 노드)
- AI Agent 노드 신규 추가 (`@n8n/n8n-nodes-langchain.agent`)
- Claude Sonnet 모델 서브노드 신규 추가 (`lmChatAnthropic`)
- 커넥션 재구성: Trigger → Agent → Parse, Model →(ai_languageModel)→ Agent
- `출력 파싱 및 검증` Dual-Layer parse code 업데이트

| Sub-WF | 섹션 | SECTION_KEY |
|--------|------|-------------|
| S05 | Personal History | `personal_history` |
| S06 | MSE | `mental_status_exam` |

**S07~S08** (이미 AI Agent 구조, 파라미터 업데이트)

| Sub-WF | 섹션 | 노드명 | SECTION_KEY |
|--------|------|--------|-------------|
| S07 | Mood Chart | `AI 보고서 생성`, `Claude Sonnet 4`, `출력 파싱` | `mood_chart` |
| S08 | Progress Notes | 동일 구조 | `progress_notes` |

#### Dual-Layer Parse Code 공통 패턴 (전 섹션)

```javascript
const raw = $input.first().json.output || $input.first().json.text || '';
let parsed;
try {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  parsed = JSON.parse(cleaned);
} catch (e) {
  parsed = {
    [SECTION_KEY]: {
      narrative: raw,
      structured: { source_ref: 'parse_failed', type: 'raw' },
      meta: { status: 'partial', confidence: 'low', requires_review: true,
              missing_items: ['JSON 파싱 실패 — 원문 그대로 저장됨'] }
    }
  };
}
return [{ json: parsed }];
```

#### Anthropic Chat Model 설정 가이드 (세션 10 결정)

| 설정 | 권장값 | 비고 |
|------|--------|------|
| Model | Claude Sonnet 4.6 (전 섹션 통일) | Hallucination 최소화 우선 |
| Temperature | 0.1 (기본), 0.0 (단순 추출), 0.2 (S09/S11/S12) | |
| Max Tokens | 2048~8192 (섹션별) | S08/S09는 8192 |
| Top K/P | 기본값 (미설정) | |
| Enable Thinking | OFF (현재), E2E 후 S11/S12 실험 검토 | |

#### 세션 10 상태: ✅ 완료 (M8 작업 1~2 완료, 작업 3 E2E 테스트 대기)

---

### 세션 9.3 — Sub-WF 프롬프트 M7 완료, 12/12 전체 완성 (2026-04-02)

#### 작업 내용

S11 Case Formulation, S12 Psychodynamic Formulation 프롬프트 생성 및 Claude.ai 검수 후 수정 적용.
M7 완료로 12개 전체 프롬프트 파일 완성 (12/12).

| 마일스톤 | 대상 | 상태 | 산출물 |
|---------|------|:----:|--------|
| M7-1 | S11 Case Formulation | ✅ 완료 | `system_prompt_section_11.md` |
| M7-2 | S12 Psychodynamic Formulation | ✅ 완료 | `system_prompt_section_12.md` |

#### M7 산출물 상세

**S11 Case Formulation**
- 4P Bio-Psycho-Social 모델 (Predisposition / Pattern / Precipitants / Perpetuants)
- Treatment Plan: bio(medications) + psycho[] + social[] 구조
- S11 조건부 추론: Predisposition·Pattern·Perpetuants·Psycho치료 허용, Precipitants 사실 기반
- meta 불변: `requires_review = true`, `confidence = "draft"`, `type = "inference"` 고정
- Phase 2 의존: Phase 1 전체 요약 (S01~S08), `phase1_summary_available` 추적
- SECTION_KEY: `case_formulation` (D-26 snake_case 준수)

**S12 Psychodynamic Formulation**
- 3단락+ 연속 산문 (번호 목록·불릿 절대 금지)
- S12 전체 inference 허용, 추론 어미 필수 (`~했을 것이다`, `~으로 생각된다`, `~것으로 보인다`, `~것 같다`)
- 단락 1: 대상관계·Oedipal 고착·false self-adaptation (유아기~청소년기)
- 단락 2: counter-phobic defense·sexualization·repetition compulsion·triangulation (성인기)
- 단락 3: superego 갈등·dissociation·la belle indifférence·regression (현재)
- Gold Standard 원문 3단락 전체 포함
- meta 불변: `requires_review = true`, `confidence = "draft"`, `type = "inference"` 고정
- Phase 2 의존: S05 + S09 + S11

#### 세션 9.3 상태: ✅ 완료 (12/12 프롬프트 파일 전체 완성)

---

### 세션 9.2 — Sub-WF 프롬프트 M6 완료 (2026-04-02)

#### 작업 내용

S07 Mood Chart, S10 Diagnostic Formulation 프롬프트 생성.

**S07 Mood Chart 핵심 설계**
- 0-10 척도 수치화 기준 명시 (0=최악~10=최상)
- `hospital_day` 미확인 시 `admission_date` 기준 자동 계산 규칙
- `admission_scales` (BDI/BAI/MDQ) + `entries[]` 배열 + `trend` 스키마

**S10 Diagnostic Formulation 핵심 설계**
- DSM-5-TR 영문 표준 진단명 한 줄 먼저
- R/O 감별 진단: 선택적 (0~2개)
- meta 불변: `requires_review = true`, `confidence = "draft"`, `type = "inference"` 고정
- Phase 2 의존: S02 + S06 + S09

#### 세션 9.2 상태: ✅ 완료 (M6까지 완료)

---

### 세션 9 — Sub-WF 프롬프트 Dual-Layer 전환 (2026-04-01)

#### 작업 내용

12개 Sub-WF 시스템 프롬프트를 Dual-Layer 구조(narrative + structured + meta)로 전면 재설계.

**M1 산출물 — `system_prompt_section_08.md`**
- SOAP 형식: S) 구어체 원문 + [U]tag 밑줄 마킹 / O) Mood·Affect 표준 + 임상해석 볼드 / P) 약물 아침-점심-저녁-취침mg
- HD# 계산: admission_date = HD#1, 각 면담 날짜에서 offset 계산
- Gold Standard: 실제 보고서 HD#2/HD#5/HD#8 3개 노트 발췌 포함

#### 세션 9 상태: ✅ 완료 (M1 완료, M2~M8 예정)

---

### 세션 8.7 — v3.1 6단계 평가 반영 + AI Agent 전환 계획 (2026-04-01)

**평가 총점**: 84.7/100 (A등급, 조건부 승인)

#### 주요 의사결정

| D# | 결정 |
|----|------|
| D-29 | Sub-WF AI 호출: HTTP Request → AI Agent 노드 전환 |
| D-30 | Halluc 검증: Haiku → Gemini Flash 전환 |

#### 세션 8.7 상태: ✅ 완료

---

### 세션 8 — Quality Check 분석 + 아키텍처 결정 (2026-04-01)

#### Quality Check 결과 요약 (QC 1차)

| 대분류 | 만점 | 득점 | 비율 |
|--------|:----:|:----:|:----:|
| A. 형식 충실도 | 60 | 16.5 | 27.5% |
| B. 사실 정확성 | 25 | 20 | 80.0% |
| C. Halluc Check 실효성 | 15 | 8 | 53.3% |
| **합계** | **100** | **44.5** | **44.5% (C등급)** |

#### 근본 원인 및 아키텍처 결정

- Sub-WF가 JSON 데이터 구조 반환 → HTML 변환으로는 임상 산문 재현 본질적 불가
- **D-21**: Sub-WF 출력을 Dual-Layer (narrative + structured + meta)로 전환
- **D-22**: Quality Check는 별도 수동 QA (WF2 Halluc Check 대체 안 함)

#### 세션 8.5 — v3.1 아키텍처 감사 반영

| 기준 축 | 원점수 |
|---------|:------:|
| 아키텍처 일관성 | 88% |
| 기술적 실현 가능성 | 80% |
| **사용자 경험** | **50%** (최약점 — §18 수정 가이드 신규 추가) |
| Hallucination 방어 | 92% |
| **총점** | **72.8/100 (B등급)** |

**v3 → v3.1 핵심 변경**: §18 보고서 수정 가이드 신규, §19 알려진 제약 신규, D-29/D-30 추가

#### 세션 8/8.5 상태: ✅ 완료

---

### 세션 13 — Phase 2 QC, S10 버그 수정, HTML 폴더 버그 수정 (2026-04-02)

#### Phase 2 QC 결과

| 섹션 | 만점 | 득점 | 평가 |
|------|:----:|:----:|------|
| S09 Present Illness | 12 | 10.5 | 우수 |
| S10 Diagnostic Formulation | 3 | 3 | 만점 |
| S11 Case Formulation | 5 | 5 | 만점 |
| S12 Psychodynamic Formulation | 6 | 6 | 만점 |
| **Phase 2 합계** | **26** | **24.5** | **94%** |

#### S10 버그 수정

- **원인**: Sub-WF S10 LM Chat 노드 `maxTokensToSample: 2048` → API 응답 절단 → JSON.parse() 실패
- **수정**: `maxTokensToSample: 8192`

#### HTML 폴더 버그 수정

- `s34-c4` Code 노드에 `reports_folder_id` 추가

#### 세션 13 상태: ✅ 완료 (E2E HTML 정상 저장 확인)

---

> **D-번호 canonical**: `docs/PROJECT_PLAN_v3.1.md` §2가 유일한 권위입니다.
