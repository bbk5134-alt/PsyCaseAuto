---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

---

### 세션 44 — Phase 3 P3-1a/b: S06 MSE 프롬프트 수정 + n8n 적용 (2026-04-06)

#### 완료 항목

| Phase | 대상 | .md | n8n |
|-------|------|:---:|:---:|
| P3-1a: S06 MSE 프롬프트 수정 (Claude.ai 검수) | `docs/prompts/system_prompt_section_06.md` | ✅ | — |
| P3-1b: Sub-WF S06 n8n 적용 + 모델 교체 | Sub-WF S06 MSE (`Qp0IXqsbounP2X1l`) | ✅ | ✅ |

**P3-1a 수정 내용 (PHASE3_FIX_PLAN Fix-G/H/I/J)**:
- Fix-G: MSE-Progress Note O) 교차 검증 mandatory, Affect 교차검증, Thought Content 근거 없이 (-) 금지
- Fix-H: Paranoid ideation 코딩 예시 추가 (결제내역 외도 확신, 적대적 의도 해석)
- Fix-I: 자살 위험성 판정 로직 — reckless behavior 포함 종합판정, 자기보고만으로 '하' 금지
- Fix-J: Grandiosity vs Grandiose delusion 분리 기재 (별개 항목)
- **추가 수정 (P3-1a 검증 중 발견)**:
  - Issue 1 [Critical]: Gold Standard §6 Sensorium and Cognition 예시 추가 (Alert, Orientation, Memory, Concentration, Abstract thinking)
  - Issue 2 [Moderate]: Thought Content 13개 항목 각각 별줄 형식으로 변경 (기존 슬래시 구분 → 각 항목 독립 행)
  - Issue 3 [Minor]: 에스컬레이션 규칙 섹션 제거 → Error Handling #10에 통합

**P3-1b 기술 노트**:
- 기존 시스템 메시지 ~16K자 → 신규 12,600자 (≈3,500 tokens)
- patchNodeField 3-step 전략으로 교체 (MCP 도구 크기 제한 우회):
  - Step 1: 헤더+Role 교체 + `STOP_MARKER_OLD_CONTENT` 삽입
  - Step 2: regex `STOP_MARKER[\s\S]*` → §3~§7 내용 + `SPLIT_MARKER_PART2`
  - Step 3: `SPLIT_MARKER_PART2` → §8~§9 Output Format + Error Handling
- 모델: Gemini 2.5 Flash → **Claude Sonnet 4** (`claude-sonnet-4-20250514`, temp 0.3, maxTokens 16384)
  - Gemini 노드 제거 (`removeNode`) + Anthropic Chat Model 노드 추가 + 연결

**P3-1b 검증 결과** (5/5 PASS):
- [PASS] "절대 위반 불가 Top 5" 키워드 존재
- [PASS] "Progress Note O)" 키워드 존재
- [PASS] "reckless behavior" 키워드 존재
- [PASS] "Grandiosity (+/-/평가 불가)" 형태로 존재 (검증 기준 `(+/-)` 포함)
- [PASS] 모델 = `claude-sonnet-4-20250514`

#### 다음 작업

- P3-2: Fix-K S04 Past Family History 추가 수정 (milestone.md 참조)

---

### 세션 43 — Phase 2 Fix-A (S02) + Fix-B (S04) n8n 적용 완료 (2026-04-06)

#### 완료 항목

| Fix | 대상 Sub-WF | .md | n8n |
|-----|-----------|:---:|:---:|
| Fix-A (전체) | S02 Chief Problems (`TifgZTXdSNW9Gtlh`) | ✅ | ✅ |
| Fix-B (전체) | S04 Past Family History (`StjkISptQwFHl5Ws`) | ✅ | ✅ |

**Fix-A 수정 내용 (S02)**:
- Rule 1: JSON literal forbidden patterns block 추가 (self-verification 포함)
- Typo fix: `기벅에` → `기록에` (Unicode U+B085 corruption 수정)
- 다중 정보원 케이스 처리 섹션 추가 (multi-informant rules)
- Onset 2-pattern → 3-pattern (Onset / Aggravation / Remote+Recent 구분)
- Aggravation vs Recent onset 선택 규칙 추가 (rule 8-1)
- GS2 예시 추가 (Alcohol use dependence + Labile mood)
- JSON: `"aggravation": null` 필드 추가, Onset field 테이블 3행화, key description 테이블 업데이트
- 체크리스트 3개 항목 신설

**Fix-B 수정 내용 (S04)**:
- `[물질명]:` → `Alcohol:` 형식 표준화
- 금단 증상 기재 위치 구분 규칙 추가 (seizure/DT → 4번 Other medical)
- Lab finding 복수 항목 기재 규칙 + GS2 Lab 예시 (CK, γ-GT, AST, ALT)
- Other medical 복수 진단 기재 규칙 + 알코올 관련 분류 기준
- Family history 복수 가족 기재 규칙 + GS2 예시 (친조부/친백부/환부/언니)
- Gold Standard 2 (GS2) 전체 예시 섹션 추가
- JSON: `last_drinking`, `smoking` 필드 추가
- 체크리스트 11개 항목으로 확장
- Anti-Hallucination Rules 상세화, 출력 규칙 보완, Error Handling 전용 규칙 추가

#### 패치 기술 노트

- Fix-A n8n: 총 9회 `patchNodeField` 적용 (일부 continueOnError 활용)
  - Unicode corruption 디버깅: U+B085 (`벅`) vs U+B85D (`록`) — 수학적 역산으로 정확한 codepoint 확인 후 수정
  - 기존 내용이 `parameters.options.systemMessage`에 있고 `parameters.systemMessage`는 별도 필드임 확인
- Fix-B n8n: `updateNode` 방식으로 `parameters.options.systemMessage` 전체 교체 (patchNodeField 실패 → bracket 문자 처리 이슈 우회)
  - 이전 세션에서 `[물질명]` find string 실패 원인 추정: patchNodeField regex 처리 가능성
  - 해결: `updateNode + updates` 오브젝트로 전체 필드 교체

#### 다음 작업

- Step 5-5: WF2 E2E 재실행 (PT-2026-002 mock JSON 투입)
- GS2 QC 비교 검증

---

### 세션 42 — Phase 2 Fix-3 (S06 MSE not tested 규칙) 적용 완료 (2026-04-06)

#### 완료 항목

| Fix | 대상 Sub-WF | 문제 | 수정 내용 | .md | n8n |
|-----|-----------|------|----------|:---:|:---:|
| Fix-3 | S06 MSE (`Qp0IXqsbounP2X1l`) | Concentration/Abstract thinking 검사 미수행 시 다른 증상(조증 등)에서 `impaired` 추론 기재 (inference_unmarked) + testing judgment를 면담 태도에서 추론 판정 | **not tested 옵션 추가** (수정1~5): Sensorium 3항목, Judgment testing, JSON 스키마 enum 확장, Error Handling 규칙 10 교체 + 규칙 11 신설(Judgment testing not tested), 키 설명 테이블 신설 | ✅ | ✅ |

#### 패치 기술 노트

- n8n S06 노드의 Error Handling rule 10이 .md보다 단순 형식 (단일 줄) → `항목명만 기재하고` 앵커로 find 성공
- `추가 키 설명` 테이블이 n8n에 미존재 → `"alert": null ... \`\`\`` 앵커로 삽입 성공
- 총 7개 find/replace 패치 (4회 n8n_update_partial_workflow 호출)

#### 남은 Phase 2 이슈

| Fix | 대상 | 내용 | 우선순위 |
|-----|------|------|:--------:|
| Fix-A | S02 | JSON 노출 방지 + 3명 정보원 형식 | 🔴 고 |
| Fix-B | S04 | Lab findings, AUD, 경련 이력 규칙 | 🔴 고 |

#### 다음 작업

- Claude.ai Session 2: Fix-A + Fix-B 수정안 제작 (S02.md, S04.md, GS2 보고서, STT 파일 첨부)
- 수정안 적용 후 Step 5-5: WF2 E2E 재실행 (PT-2026-002)

---

### 세션 41 — Phase 2 Fix-C/D 적용 완료 (2026-04-06)

#### 완료 항목

| Fix | 대상 Sub-WF | 문제 | 수정 내용 | .md | n8n active |
|-----|-----------|------|----------|:---:|:----------:|
| Fix-C | S08 (`lbr2QAXPhX80MuZG`) | GS1 MDD `not anxious` 패턴을 GS2 Bipolar 환자에 그대로 복사 → 불안 발화("소송 갈까 봐 무서운 거죠") 있음에도 `not anxious` 기재 | **Mood/Affect 서술 절대 규칙 추가**: `not [descriptor]` 는 명시적 근거 있을 때만, GS1 패턴 복사 금지, ⚠️ fabricated_fact 경고 | ✅ | ✅ |
| Fix-D | S12 (`Hq4QhEKT48aPShWb`) + s34-c4 | S12 긴 산문(3단락)에서 큰따옴표 이스케이프 미적용 시 JSON 파싱 실패 위험 + s34-c4 extractNarrative P7 regex 정지 | **S12 P-01 규칙 강화**: la belle indifférence 등 전문용어 인용 시 `\"` 이스케이프 필수 명시. s34-c4는 Step 5-7 W-1에서 이미 object-branch + 재파싱 추가 완료 | ✅ | ✅ |

#### 패치 기술 노트

- Fix-C find 앵커: `임상적 추론/해석은 O) 항목에서만 허용 (S)에 해석 혼입 금지)` — 성공
- Fix-D find 앵커: `\n1. **narrative 내 큰따옴표 이스케이프 필수 (P-01)**\n2. **JSON 키 이름 고정 (P-02)**` — 성공
- s34-c4의 P7 regex `((?:[^"\\]|\\[\s\S])*)` 는 이미 이스케이프된 따옴표를 올바르게 처리 → S12에서 이스케이프 규칙 준수 시 truncation 없음

#### Phase 1 Fix-E/F (세션 41 추가 완료)

| Fix | 대상 | 문제 | 수정 내용 | n8n |
|-----|------|------|----------|:---:|
| Fix-E | WF2 s34-a2 (`LiN5bKslyWtZX6yG`) | "내원 N개월 전" 형식이 절대 날짜의 시간 정규화임에도 fabricated_fact 오판정 가능 | **FP 방어 9 추가**: 절대 날짜→상대 기간 변환은 hallucination 아님, ±2개월 오차 허용 | ✅ |
| Fix-F | WF2 s34-a1 (`LiN5bKslyWtZX6yG`) | Sub-WF parse 실패 시 raw JSON narrative가 s34-a2에 전달되어 halluc 검증 혼란 가능 | **cleanNarrativeForCheck 함수 추가**: code fence 제거 + JSON 파싱 후 narrative 추출 후 전달 | ✅ |

#### 남은 Phase 2 이슈

| Fix | 대상 | 내용 | 우선순위 |
|-----|------|------|:--------:|
| Phase 2 | S02 | JSON 노출 + 형식 이슈 | 🔴 고 |
| Phase 2 | S04 | 추가 Past History 방어 | 🔴 고 |

#### 다음 작업

- 사용자 Phase 2 검토 후 S02/S04 수정 (Phase 2)
- 전체 완료 후 Step 5-8: WF2 E2E 재실행

---

### 세션 40 — Phase 1 Fix-1/2/4 적용 완료 (2026-04-06)

#### 배경

Halluc check (hallucination_check_20260406_0828.json, PT-2026-002)에서 8개 이슈 발견 (major 3건 + minor 5건). 세션 39에서 Step 5-8 E2E 재실행 전 주요 버그 3건 우선 수정.

**핵심 발견**: 이전 세션(37)에서 P-4/P-5 패치가 `parameters.systemMessage`(비활성)에만 적용되고 `parameters.options.systemMessage`(런타임 활성)에는 미적용됨 → 재발 원인.

#### Phase 1 수정 3건

| Fix | 대상 Sub-WF | 문제 | 수정 내용 | .md | n8n active |
|-----|-----------|------|----------|:---:|:----------:|
| Fix-2 | S03 (`J0EvW4lNbKGLo157`) | P-4가 options.systemMessage SHORT 버전에 없음 → 환모 누락 3연속 | full_text/segments 분기 + 마커 기반 발화자 식별 규칙 삽입 | ✅ | ✅ |
| Fix-4 | S04 (`StjkISptQwFHl5Ws`) | 1시간 비자발적 입원을 `none`으로 기재 | ⚠️ 핵심 규칙 + 예시("1시간만에 나왔어도 기재") 추가 | ✅ | ✅ |
| Fix-1 | S07 (`5wWj9DLBB1z1r9Fr`) | 기분 수치 날조 — P-5가 options.systemMessage에 미적용, Output Format 예시에 `N점(HD#N)` 자리표시자 잔존 | 내러티브 형식 "방향성만 서술" + ⚠️ fabricated_fact 경고 + Case A/B Output 예시 교체 | ✅ | ✅ |

#### 패치 기술 노트

- `patchNodeField` 필드명: `fieldPath` (not `field`), 값 형식: `patches: [{find, replace}]` (not `value`)
- 한글+인용부호 안의 텍스트를 find 문자열에 넣으면 MCP가 unicode-escape → 짧고 인용부호 없는 substring으로 우회 성공
- S03 options.systemMessage는 SHORT 버전 (필수포함항목 섹션 없음) → `- 실명 사용 금지\n\n## 5.` 앞에 새 섹션 삽입으로 해결

#### 남은 이슈 (Phase 2 — 사용자 검토 후 진행)

| Fix | 대상 | 내용 |
|-----|------|------|
| Fix-C | S08 | HD#2부터 시작하는 Progress Notes 형식 |
| Fix-D | s34-c4/S12 | truncation 방어 |
| Fix-E | s34-a2 | STT 날짜 혼동 방어 |
| Fix-F | 전체 | JSON 파싱 방어 표준화 |

#### 다음 작업

- 사용자 Phase 2 검토 후 Fix-C/D/E/F 적용
- Step 5-8: WF2 E2E 재실행 (사용자 n8n UI 수동 실행) → Halluc 재검증 목표 0건

---

### 세션 39 — GitHub pull + n8n 상태 동기화 확인 (2026-04-06)

#### 배경

이전 컨텍스트 소진 후 재개. GitHub origin/master에서 12개 커밋 pull (c45e412 → 1e45548). 세션 34~38 작업이 원격에 완료되어 있었음.

#### Pull 결과 요약

| 세션 | 내용 | 상태 |
|------|------|:----:|
| 34~35 | Step 5-0 (QC v2.1) + Step 5-1 (GS2 구조 분석) + Step 5-2~5-3 (Mock STT JSON) | ✅ |
| 35 | Step 5-4 여자친구 임상 검수 반영 (Mock STT 3건 수정) | ✅ |
| 36 | Step 5-5 WF2 E2E (GS2, partial pass) — S02 JSON 노출, Halluc major 2건 | ✅ |
| 37 | Step 5-7 8개 픽스 MCP 적용 (W-1, P-1~P-6, H-1) | ✅ |
| 38 | W-1a (코드펜스 방어 6개 Sub-WF) + W-1b (S03 meta 보정 + WF2 병합 노드 방어) + S02 모델 Claude Sonnet 4.6 교체 | ✅ |

#### n8n 라이브 상태 확인

| 확인 항목 | 방법 | 결과 |
|----------|------|:----:|
| S02 모델 교체 | S02 workflow structure 조회 | `Anthropic Chat Model` 연결 ✅ |
| S03 W-1a 코드펜스 방어 | S03 출력 파싱 jsCode 확인 | anchored regex + `{…}` fallback 추출 ✅ |
| S03 W-1b meta 위치 보정 | S03 출력 파싱 jsCode 확인 | 4단계 meta 끌어올림 코드 ✅ |
| 마지막 WF2 실행 | executions list | #754 success (23:24→23:29) ✅ |

#### 미확인 항목

- 실행 #754 Telegram 메시지: `오류:N건` 확인 불가 (실행 파일 크기 초과로 파싱 실패)
- WF2 Phase 1 결과 병합 노드 W-1b-2 코드: 세션 38에서 적용됐다고 기록됨, 별도 검증 미완료

#### 다음 작업

- **Step 5-8**: WF2 E2E 재실행 (사용자가 n8n UI에서 수동 실행 필요) → Telegram `오류:0건` 확인

---

### 세션 38 — S02 파싱 오류 수정 + S03 meta 위치 보정 (2026-04-06)

#### 문제 1: S02 parse_failed (코드펜스 + Gemini JSON 품질)

S02 Chief Problems sub-WF에서 연속 2회 파싱 실패 발생.

| 시도 | 오류 | 원인 | 수정 |
|------|------|------|------|
| 1차 | `parse_failed` | 코드펜스 제거 regex 불충분 | W-1a: anchored regex + `{…}` fallback 추출 |
| 2차 | `Unterminated string in JSON at position 611` | Gemini 2.5 Flash가 JSON string 내 `"` 미이스케이프 | S02 모델을 Claude Sonnet 4.6으로 교체 |

**W-1a 적용 범위** (코드펜스 방어 강화 — 6개 sub-WF):
- S02 `TifgZTXdSNW9Gtlh`, S03 `J0EvW4lNbKGLo157`, S04 `StjkISptQwFHl5Ws`
- S06 `Qp0IXqsbounP2X1l`, S07 `5wWj9DLBB1z1r9Fr`, S09 `4VyEFSX0H0FD2ilK`

**S02 모델 교체**:
- Gemini 2.5 Flash 노드 `removeNode` → Anthropic Chat Model 노드 `addNode`
- Claude Sonnet 4.6, temp 0.3, maxTokens 16384
- Credential: `anthropicApi` ID `RiXuEl0fGr0aAGNz`

#### 문제 2: Telegram "오류:1건" — S03 meta 위치 이상

WF2 E2E 실행 후 전 섹션 정상 생성됨에도 Telegram에 `오류:1건` 표시.

| 항목 | 내용 |
|------|------|
| **오류 섹션** | S03 `informants` |
| **증상** | `Phase 1 결과 병합` 노드에서 `error_count = 1` |
| **근본 원인** | AI가 `meta`를 `structured.meta`에 중첩 출력 → 최상위 `meta = {}` → `status` 없음 → error 집계 |
| **실제 상태** | `structured.meta.status = "complete"` (데이터 정상, 위치만 잘못됨) |

**수정 (W-1b — 이중 방어)**:

| # | 대상 | WF ID | 수정 내용 |
|---|------|-------|----------|
| W-1b-1 | S03 `출력 파싱` | `J0EvW4lNbKGLo157` | 4단계 추가: `structured.meta` → 최상위 `meta` 끌어올림 |
| W-1b-2 | WF2 `Phase 1 결과 병합` | `LiN5bKslyWtZX6yG` | 모든 섹션 meta 방어: ① structured.meta 끌어올림 ② 그래도 없으면 `partial` 기본값 |

**다음 작업**: Step 5-8 — WF2 E2E 재실행 (`오류:0건` 확인) + QC 재채점 (목표: 85+/A)

---

### 세션 37 — Step 5-7: 8개 픽스 MCP 적용 완료 (2026-04-06)

#### Step 5-7 결과: ALL 8 FIXES APPLIED ✅

GS2 QC 73.5/B 결과 기반 8개 수정사항을 n8n MCP를 통해 라이브 워크플로우에 적용.

| Fix | 대상 | 워크플로우 | 노드 | 내용 | 상태 |
|-----|------|-----------|------|------|:----:|
| W-1 | s34-c4 (HTML 변환) | WF2 `LiN5bKslyWtZX6yG` | HTML 보고서 변환 | extractNarrative 오브젝트 분기 코드펜스 제거 + 중첩 JSON 재파싱 | ✅ |
| P-1 | S06 MSE | `Qp0IXqsbounP2X1l` | S06 MSE Agent | MSE 경과 면담 STT 기준 + irritable 절대 규칙 | ✅ |
| P-2 | S02 Chief Problems | `TifgZTXdSNW9Gtlh` | AI 보고서 생성 | Strict extraction + Onset STT-only | ✅ |
| P-3 | S04 Past/Family Hx | `StjkISptQwFHl5Ws` | AI 보고서 생성 | AUD 형식 표준화 + Other Medical 범위 수정 | ✅ |
| P-4 | S03 Informants | `J0EvW4lNbKGLo157` | AI 보고서 생성 | All-informants STT segments 규칙 | ✅ |
| P-5 | S07 Mood Chart | `5wWj9DLBB1z1r9Fr` | AI 보고서 생성 | Anti-numeric-fabrication (수치 날조 금지) | ✅ |
| P-6 | S09 Present Illness | `4VyEFSX0H0FD2ilK` | AI 보고서 생성 | 인과 연쇄 강화 (F→C→A→B 사슬 연결 필수) | ✅ |
| H-1 | s34-a2 (Halluc 검증) | WF2 `LiN5bKslyWtZX6yG` | Hallucination 검증 AI Agent | MSE 고위험 항목 개별 STT 대조 의무 | ✅ |

**다음 작업**: Step 5-8 — GS2 재실행 + QC 재채점 (목표: 85+/A)

---

### 세션 36 — Step 5-5: WF2 E2E 실행 (GS2 데이터) (2026-04-06)

#### Step 5-5 결과: PARTIAL PASS

출력 파일: `draft_20260406_0241_v1.html` + `hallucination_check_20260406_0241.json`

##### 5-5c: HTML 섹션 검증

| 섹션 | 상태 | 비고 |
|------|:----:|------|
| I. Identifying Data | ✅ | 정상 |
| II. Chief Problems & Durations | ❌ | **raw JSON 노출** (D-21 위반) |
| III. Present Illness | ✅ | 정상 |
| IV. Past History & Family History | ✅ | 정상 |
| V. Personal History | ✅ | 정상 |
| VI. Mental Status Examination | ⚠️ | `[정보 없음]` 10회 (MSE 세부항목/처방) — Halluc 방지 fallback 정상 작동 |
| VII. Mood Chart | ✅ | 정상 |
| VIII. Progress Notes | ✅ | 정상 |
| IX. Diagnostic Formulation | ✅ | 정상 |
| X. 사회사업팀 평가 | ✅ | 의도된 placeholder ("해당 팀에서 작성") |
| XI. 심리팀 평가 | ✅ | 의도된 placeholder |
| XII. Case Formulation | ✅ | 정상 |
| XIII. Psychodynamic Formulation | ✅ | 정상 |

- PT-2026-002 코드 ✅
- `[ERROR]` / `[SYSTEM NOTE]` / `source_ref` 노출 없음 ✅

##### 5-5d: Halluc Check 검증

| 항목 | 결과 |
|------|:----:|
| `parse_error` | false ✅ |
| `sections_checked` | S01~S10 모두 ✅ |
| `context_truncated` | false ✅ |
| `passed` | **false** ❌ |

**탐지된 이슈 2건 (모두 major)**:

| # | 섹션 | type | text | 판정 근거 |
|---|------|------|------|-----------|
| 1 | S02 | fabricated_fact | `Onset) 내원 1` | "Emotional Numbness / Anhedonia" onset이 STT 원문에 없음 |
| 2 | S07 | fabricated_fact | `기분 점수 7점(HD#1)→6점(HD#7)` | 점수 수치가 STT 원문에 없음 — 환자 주관 표현을 날조 수치화 |

##### Step 5-5 종합 판정

| 검증 항목 | 결과 |
|----------|:----:|
| E2E 실행 성공 | ✅ |
| 13섹션 모두 생성 | ✅ |
| Google Drive 저장 | ✅ |
| parse_error: false | ✅ |
| Section II JSON 노출 (D-21 위반) | ❌ → **Step 5-7 수정 필요** |
| Halluc major 이슈 0건 | ❌ → **S02/S07 프롬프트 수정 필요** |

**다음 작업**: Step 5-6 GS2 QC 채점 (Claude.ai)

---

### 세션 35 — Step 5-0 + Step 5-1: QC v2.1 + GS2 구조 분석 (2026-04-06)

#### Step 5-0 완료: QC 프롬프트 v2.1

`system_prompt_quality_check_v2.md` v2.0 → v2.1 업데이트:
- **C-2 FP 채점 기준**에 `absence_assumption` TP/FP 구분 표 추가
  - TP: STT 원문에 해당 항목 언급 없는데 "none"/"(-)"로 단정 기재 → Halluc Check 정당 탐지
  - FP: 원문에 "없다" 명시 or 임상 맥락상 당연 → Halluc Check 오탐
- **Constraint 10** 신규 추가: "absence_assumption은 FP가 아니다" 명시 (세션 27·29 반복 오류 재발 방지)

---

#### Step 5-1 완료: GS2 구조 분석 + 프롬프트 커버리지 갭

##### 5-1a. GS1 vs GS2 섹션별 구조 비교

| 섹션 | GS1 (MDD, R2) | GS2 (Bipolar I+AUD, R1) | 주요 차이 |
|------|:---:|:---:|----------|
| I. Identifying Data | 10줄, By. 환자/남편/환모 | 10줄, By. 환자/환모/언니 | 정보원 구성 상이 (남편→언니) |
| II. Chief Problems | 15줄, 3증상, Remote/Recent | 20줄, 4증상, Onset/Aggravation | **Aggravation 필드 신규** |
| Informants & Reliability | 4줄, 3명 | 7줄, 3명 | GS2 더 상세 |
| III. Present Illness | 산문 5단락 | 산문 3단락 | 형식 유사 |
| IV. Past History | 12줄 (Lipase 1건) | 17줄 | **AUD 세부 항목 신규**: Binge drinking 빈도·양, Last drinking, Smoking 연수, Lab finding 4건, 가족력 2개 진단 |
| V. Personal History | 15줄 | 15줄 (내용 훨씬 상세) | 분량 유사하나 서술 밀도 높음 |
| VI. MSE | 48줄, 항목 1~6 + Mood chart | 54줄, **항목 1~9** | **7. Impulsivity 섹션 신규** (자살위험도 중, 위협 행동 중) |
| VII. Diagnostic Formulation | 단일 진단 1줄 | **3개 진단 3줄** | Bipolar I + AUD + Alcohol withdrawal — 다중 진단 형식 |
| VIII. Progress (GS2 "III." 오타) | 50줄, HD#2/5/8, 진단적 평가 1회 | 76줄, HD#2/6/7/10, 진단적 평가 반복 | 진단적 평가 블록 여러 Note에 걸쳐 반복 |
| IX/X. SW·심리팀 | 비어있음 | 비어있음 | 동일 |
| XI. Case Formulation | 26줄, BPS+강약점 | 28줄, BPS+Strength+P4+Bio/Psycho/Social/Prognosis | GS2 세부 구조 더 완전 |
| XII. Psychodynamic | 4줄 (짧음) | **9줄, 산문 7단락** | GS2 훨씬 상세한 산문 |

**GS2 입원 시 scale**: `BDI 6 / BAI 19 / MDQ 8+ / AUDIT 33` (GS1: `BDI 35 / BAI 34 / MDQ 4개`)
- GS2 MDQ 표기: `8+` (GS1은 `4개`) → 표기 방식 상이
- GS2 AUDIT 추가 (AUD 케이스 특유)

##### 5-1b/c. 프롬프트 커버리지 갭 목록

| # | 섹션 | 갭 내용 | 리스크 | 조치 방향 |
|---|------|---------|:------:|----------|
| G-1 | **S10** | 다중 진단(3개) 형식 미규정. 현재 "주진단명 한 줄" 규칙만 있음. Bipolar I + AUD + Withdrawal 3줄 출력 방식 없음 | **HIGH** | S10 프롬프트에 다중 진단 형식 추가 |
| G-2 | **S02** | `Aggravation)` 필드 미규정. 현재 Remote/Recent 이분법만 있음. 증상 지속 중 악화 시점 별도 표기 패턴 없음 | **MID** | S02 Constraints에 Aggravation) 패턴 추가 |
| G-3 | **S08** | ① 입원 시 scale에 AUDIT 미규정 (AUD 케이스) ② MDQ 표기 방식 불일치 (`4개` vs `8+`) ③ 진단적 평가 블록(선택적) 미규정 | **MID** | QC 후 점수 보고 대기, 필요 시 S08 수정 |
| G-4 | **S09** | AUD 타임라인 서술 방식 미규정. 현재 GS1(MDD) 예시만 있음. 음주량 증가 경과 특유의 서술 패턴 없음 | **MID** | Step 5-7(조건부) 대기 |
| G-5 | **S04** | Last drinking 날짜, Smoking 연수 세부 형식 불명확. alcohol_substance 항목은 있으나 빈도·양 상세 형식 예시 없음 | **MID** | QC 채점 후 감점 여부 확인 |
| G-6 | **S11** | GS2 Case Formulation에 `Strength` 항목 명시. S11 프롬프트 반영 여부 미확인 | **LOW** | Step 5-5 E2E 후 출력 확인 |
| G-7 | **S12** | GS2 산문 7단락 vs GS1 4줄 — 길이 차이 큼. S12 프롬프트가 짧은 출력으로 학습된 경우 과소 출력 가능성 | **LOW** | Step 5-6 QC 채점 후 확인 |

> **G-1(S10 다중 진단)이 유일한 HIGH 리스크** — Step 5-5 E2E 전 수정 권장

##### 5-1d. 여자친구 확인 필요 항목 (최종 3건)

| # | 항목 | 현재 상태 | 확인 필요 이유 | S08 수정 여부 영향 |
|---|------|----------|--------------|-----------------|
| Q-1 | **Progress Notes 진단적 평가 블록** | ✅ 확인: **의무적 시행**으로 결정 (필요 없으면 삭제) | 모든 케이스에 작성, 필요 없으면 삭제 | S08 프롬프트에 진단적 평가 블록 반영 필요 |
| Q-2 | **Personal History 상세도** | ✅ 확인: **GS2 기준 (상세)** 으로 결정 | 상세하게 하고 필요 없으면 삭제 | S05 GS2 기준 예시로 업데이트 필요 |
| Q-3 | **다중 진단 표기 순서·형식** | ✅ 확인: **표준 순서** — ICD/DSM 원칙 (만성 기저 질환 먼저, 급성 상태 후순위) | Bipolar I → AUD → Alcohol withdrawal 순서 표준 | S10에 다중 진단 형식·순서 원칙 추가 필요 |

---

#### Step 5-2 완료: GS2 초진 Mock STT JSON 생성 및 검증

**파일**: `test_data/PT-2026-002/interviews/stt_20260319.json`
**생성**: Claude.ai (GS2 보고서 + Step 5-2 지시 프롬프트 기반)
**검증일**: 2026-04-06

##### 검증 결과 요약

| 항목 | 기준 | 결과 | 상태 |
|------|------|------|:----:|
| patient_code | PT-2026-002 | PT-2026-002 | ✅ |
| interview_date | 2026-03-19 | 2026-03-19 | ✅ |
| interview_type | initial | initial | ✅ |
| segments | 3개 (환자/환모/언니) | 3개 모두 존재 | ✅ |
| full_text 길이 | 4,000~6,000자 | **7,229자** (초과) | ⚠️ 수용 |
| 환자 segment | — | 3,305자 (조증 특유 pressured speech) | ✅ |
| 환모 segment | — | 1,215자 | ✅ |
| 언니 segment | — | 2,554자 (정보 가장 풍부) | ✅ |
| 임상 용어 노출 | 없어야 함 | 없음 | ✅ |
| GS2 보고서 직접 복사 | 없어야 함 | 없음 | ✅ |
| GS2 핵심 사실 10건 커버 | 모두 포함 | 전 항목 확인 | ✅ |
| 노이즈 항목 | 넷플릭스 등 | 넷플릭스·나의 해방일지·소고기 장조림·전국콩쿠르 포함 | ✅ |

**7,229자 초과 수용 근거**: 정보원 3명(환자·환모·언니) + 조증 삽화 pressured speech → PT-001(초진 4,109자) 대비 자연스러운 증가. Step 5-5 E2E에서 `context_truncated` 플래그 모니터링 예정.

##### GS2 핵심 사실 10건 커버 확인

| # | 항목 | 확인 |
|---|------|:----:|
| 1 | 입원 동기 (충동성·위협행동 — 언니 거울 깸) | ✅ |
| 2 | 躁 삽화 증상 (과대사고·수면감소·충동구매·과속 운전) | ✅ |
| 3 | 음주력 (맥주 500ml×4캔/day, 최근 음주 3/18) | ✅ |
| 4 | 입원 scale (BDI 6 / BAI 19 / MDQ 8+ / AUDIT 33) | ✅ |
| 5 | 기존 약물 (Lithium 600mg, Quetiapine 25mg PRN) | ✅ |
| 6 | 과거 정신과 입원 1회 (2023년) | ✅ |
| 7 | 가족력 (父 알코올 의존, 母 우울증) | ✅ |
| 8 | 직업 (피아노 강사, 음대 졸업) | ✅ |
| 9 | 정보원 신뢰도 (환자 부분, 환모·언니 신뢰) | ✅ |
| 10 | 수면 (2~3시간/day) | ✅ |

---

#### Step 5-3 완료: GS2 경과 면담 Mock STT JSON 생성 및 검증

**파일**: `test_data/PT-2026-002/interviews/stt_20260324.json`
**생성**: Claude.ai (GS2 보고서 HD#6 + Step 5-3 지시 프롬프트 기반)
**검증일**: 2026-04-06

##### 검증 결과 요약

| 항목 | 기준 | 결과 | 상태 |
|------|------|------|:----:|
| patient_code | PT-2026-002 | PT-2026-002 | ✅ |
| interview_date | 2026-03-24 | 2026-03-24 | ✅ |
| interview_type | progress | progress | ✅ |
| segments | 2개 (환자/언니) | 2개 모두 존재 | ✅ |
| full_text 길이 | 3,500~5,500자 | **3,844자** | ✅ 범위 내 |
| 환자 segment | — | 2,390자 (sl-elevated, 초진보다 완화) | ✅ |
| 언니 segment | — | 1,453자 | ✅ |
| full_text 정합성 | segments 합산 ±10 | 3,843 → 3,844 (+1 공백) | ✅ |
| 임상 용어 노출 | 없어야 함 | 조증·pressured speech 등 9개 항목 없음 | ✅ |
| GS2 보고서 직접 복사 | 없어야 함 | 없음 (자연스럽게 변형) | ✅ |
| GS2 핵심 사실 10건 커버 | 모두 포함 | 전 항목 확인 | ✅ |
| 노이즈 항목 | 5건 | 도서관·친구면회·홈런볼·병원밥·산책 ✅ | ✅ |
| 날짜 정합성 | 초진≤경과≤MSE≤보고서 | 03-19 ≤ 03-24 ≤ 03-25 ≤ 04-01 | ✅ |

**3,844자 근거**: 2명 세그먼트(초진 7,229자 3명 대비 자연스러운 감소), 목표 범위 내.

##### GS2 HD#6 핵심 사실 10건 커버 확인

| # | 항목 | 확인 |
|---|------|:----:|
| 1 | 남편 이혼 결심 (잘 될 가능성 0) | ✅ |
| 2 | 유책배우자/소송 우려 (먼저 말 안 걸겠음) | ✅ |
| 3 | 퇴원 후 계획 (집안일 + 남편 투명인간 취급) | ✅ |
| 4 | 합의금 1,000~2,000만원 소망 | ✅ |
| 5 | 친구 돈 빌릴 의향 | ✅ |
| 6 | 취업 계획 (러쉬/컴포즈 커피 알바) | ✅ |
| 7 | 아들 무관심 ("다 크면 혼자 잘 큰다") | ✅ |
| 8 | 신체 증상 (팔 힘 빠짐, 눈 흐림, 가려움) | ✅ |
| 9 | 절주 의지 (금주 거부) | ✅ |
| 10 | 현재 기분 맑아짐 ("머리가 맑아진 느낌") | ✅ |

##### test_data 폴더 최종 구성

```
test_data/PT-2026-002/interviews/
├── stt_20260319.json  ← 초진 (7,229자, 3명 세그먼트)
└── stt_20260324.json  ← 경과 (3,844자, 2명 세그먼트)  ← 이번 추가
```

---

#### Step 5-4 완료 (Claude.ai 대체 검수): GS2 Mock STT 임상 검수 + 수정 적용

**검수 방식 변경**: 여자친구 시간 부족 → Claude.ai 임상 전문가 역할 수행으로 대체
**검수 대상**: stt_20260319.json (초진) + stt_20260324.json (경과)
**검수 결과**: passed: false (critical 오류 1건) → 수정 후 E2E 사용 가능

##### Claude.ai 검수 결과 요약

| 검수 축 | 점수 | 비고 |
|--------|:----:|------|
| 초진 조증 발화 현실성 (pressured speech) | 5/5 | 매우 자연스러움 |
| 초진 Tangential thinking | 4/5 | circumstantiality 정확. minor 속도 조정 권고 |
| 초진 AUD 첫 제시 자연성 | 5/5 | 최소화·유전 합리화·양 모호화 전형적 |
| 초진 정보원 신뢰도 표현 | 4/5 | 환모 분량 상대적으로 짧음 (minor) |
| 경과 sl-elevated 톤 완화 | 5/5 | 초진 대비 정교하게 완화됨 |
| 경과 AUD 절주 갈등 현실성 | 5/5 | severe AUD 양가감정 정확히 포착 |
| 경과 언니 신뢰도·정보 밀도 | 5/5 | GS2 기준과 정확히 부합 |
| **평균** | **4.71** | |

##### 수정 적용 내역

| 우선순위 | 파일 | 수정 내용 | 결과 |
|----------|------|----------|:----:|
| **Critical** | stt_20260319.json | `"85년생"` → `"91년생"` (F/35, 2026년 기준 역산) | ✅ |
| **Major** | stt_20260324.json | 날짜 03-24/HD#6 → 03-25/HD#7 전체 치환 + 파일명 변경 (절주 갈등·친구 면회 = HD#7 콘텐츠) | ✅ |
| **Minor** | stt_20260319.json | 클럽→혼술바 빠른 주제 전환 사이 면담자 질문 삽입 (flight of ideas → circumstantiality) | ✅ |
| **Minor** | stt_20260319.json | 환모 면담 분량 보충 | ⬜ 보류 (신규 내용 → Halluc 위험) |

##### test_data 폴더 최종 구성 (수정 후)

```
test_data/PT-2026-002/interviews/
├── stt_20260319.json  ← 초진 (3명 세그먼트, 91년생 수정)
└── stt_20260325.json  ← 경과 (2명 세그먼트, HD#7/03-25 수정)  ← 파일명 변경
```

**날짜 정합성 (수정 후)**: 03-19 ≤ **03-25** ≤ 03-25(MSE) ≤ 04-01(보고서) ✅

---

### 세션 33 — s34-a2 systemMessage 구조 분석 + passed 기준 추가 (2026-04-05)

#### 배경

이전 세션에서 비행기 탑승으로 작업 중단 → 데스크탑 Claude Code가 s34-a2 수정을 시도했으나 중단. 해당 수정사항(Claude.ai 검토본)이 현재 n8n에 적용되어 있는지 점검.

#### 조사 결과: 예상과 다른 구조 발견

n8n WF2 s34-a2 노드에 **systemMessage가 2개** 존재함:

| 필드 위치 | 내용 | n8n 실제 사용 여부 |
|----------|------|:-----------------:|
| `parameters.options.systemMessage` | v3.md 내용 (올바른 섹션 매핑) | **YES (실제 작동)** |
| `parameters.systemMessage` | 구버전 ([개선 1-7], 잘못된 섹션 매핑) | NO (dead field) |

#### 제안된 변경사항 검토 결과

Claude.ai가 제안한 7개 변경사항 중 **6개 이미 적용**, 1개만 누락:

| 항목 | 상태 |
|------|:----:|
| 섹션 매핑 수정 (S04=Past/Family, S07=Mood Chart, S09=Present Illness) | ✅ 이미 적용 |
| FP 방어 6 (NSSI/SA 구분) | ✅ 이미 적용 |
| severity_distortion 하향 변조 탐지 | ✅ 이미 적용 |
| context_truncated 우선순위 정정 (S09, S04, S06) | ✅ 이미 적용 |
| FP 방어 8 (물질 사용) | ✅ 이미 적용 |
| **`passed` 명시적 판정 기준** | ❌ **누락 → 이번에 추가** |

#### 적용 내용 (s34-a2 시스템 프롬프트 v3.1 패치)

`passed` 판정 기준 명시 추가:
- `passed: false` — critical 또는 major 이슈 1개 이상
- `passed: true` — issues 비어 있거나 minor만 존재
- 적용: `docs/prompts/s34-a2_system_prompt_v3.md` + n8n WF2 s34-a2 노드 (`patchNodeField` 성공)

#### E2E 판단: 불필요

보고서 생성 로직 변경 없음. 기존 암묵적 규칙의 명시화(additive). GS2 E2E(Step 5-5) 시 자연스럽게 검증됨.

---

### 세션 32 — GS2 추가 의사결정 + 아카이브 정리 (2026-04-05)

#### 배경

사용자 여자친구(정신건강의학과 R1)가 **본인이 직접 작성한** Case Conference 보고서(`260401_Case conference_R1_문혜린.docx`)를 제공. 기존 Golden Standard (GS1: `20230927_Case conference_R2_임지원(mdd).docx`)에 추가하여 **2-case 검증 체계** 구축 검토.

#### GS2 분석 결과

| 항목 | GS1 (임지원 R2, MDD) | GS2 (문혜린 R1, Bipolar+AUD) |
|------|---------------------|----------------------------|
| 글자 수 | 17,546자 / 199줄 | 21,227자 / 251줄 |
| 작성자 | R2 (타인) | **R1 (사용자 본인)** ⭐ |
| 주 진단 | MDD, 단일 삽화 | **Bipolar I (manic) + AUD severe** |
| 정보제공자 | 2명 (환자, 어머니) | **3명** (환자, 어머니, 언니) + 각각 reliability |
| Present Illness | 비교적 단순, 선형 서사 | **매우 복잡** (알코올, 성문제, 부부갈등, 법적 이슈) |
| Past History | 간략 | **상세** (Lab findings, 알코올 금단 경련, 다수 내과) |
| Personal History | 요약형 | **발달단계별 매우 상세** (Early~Adult 각 2000자+) |
| MSE | 우울 양상 | **Bipolar manic** (pressured speech, grandiosity, lability) |
| Progress Notes | SOAP 형식 | SOAP + **"진단적 평가" 블록** (Cluster B trait) |
| 섹션 구조 | I~XII 완비 | I~XII 완비 (동일) |

#### 핵심 의사결정

| # | 결정 | 근거 |
|---|------|------|
| D-34 | GS2를 두 번째 Golden Standard로 추가 | Contamination-free 검증 + 진단 다양성 + 작성자 신뢰도 |
| D-35 | GS2 기반 Mock 면담 JSON 제작 필요 | 보고서만으로는 WF 테스트 불가, 역공학 필요 |
| D-36 | Mock에 노이즈 정보 5~10% 추가 | 보고서 1:1 대응 방지 → AI 정보 선별 능력 검증 |
| D-37 | 프롬프트 수정은 GS2 QC < 75점일 때만 | 양쪽 GS 모두 regression 통과 필수 |
| D-38 | Step 4-6(실환자 테스트) 전에 GS2 E2E 먼저 | 실환자 투입 전 시스템 약점 사전 파악 |

#### Contamination 분석

| 항목 | 설명 |
|------|------|
| **현재 문제** | QC 90.5(Tier 2), 86.5(Tier 3), 89(Halluc v3.1) — 모두 GS1(PT-2026-001)로 측정 |
| **편향** | 12개 프롬프트가 이 데이터에 맞춰 반복 튜닝 → 점수 과대추정(overfit) |
| **GS2 가치** | 프롬프트 개발에 전혀 노출 안 된 **진정한 out-of-sample 테스트** |
| **예상** | GS2 기반 QC는 GS1 대비 **5~15점 하락** 가능 — 이것이 실제 성능 |

#### 프롬프트 커버리지 갭 예상

| 섹션 | 리스크 | 이유 |
|------|--------|------|
| S02 (Chief Problems) | 중 | 3명 정보원 각각 기재 → 형식 차이 가능 |
| S06 (MSE) | 중 | Manic features 어휘가 프롬프트 예시에 충분한지 미확인 |
| S08 (Progress Notes) | 높음 | "진단적 평가" 서브블록 → 현재 프롬프트에 규정 없음 |
| S09 (Diagnostic Formulation) | 높음 | Bipolar 감별 추론 필요 + Cluster B 고려 |

#### GS2 문서 특이사항

1. **Progress Notes "III. Progress"**: 번호가 III로 표기 (VII 또는 VIII이어야 정상) — 오타일 가능성, 여자친구 확인 필요
2. **진단적 평가 블록**: GS 표준 형식인지 vs 이 케이스 특유의 추가인지 확인 필요
3. **날짜 타임라인**: 입원 추정일 2026-03-17~18 (Lab), MSE 2026-03-25, 보고서 2026-04-01

#### 아카이브 정리

- 세션 23~31 → `docs/PROGRESS_LOG_archive_s23-s31.md` 이관
- milestone.md → Tier 1~4 완료 항목 압축, Tier 5 (GS2) 세부 단계 추가

#### 다음 작업

- Tier 5 Step 5-1: GS2 vs GS1 구조 분석 + 프롬프트 커버리지 확인

---

> **아카이브**: 세션 8~13 → `docs/PROGRESS_LOG_archive_s08-s13.md`
> **아카이브**: 세션 13~22 → `docs/PROGRESS_LOG_archive_s13-s22.md`
> **아카이브**: 세션 23~31 → `docs/PROGRESS_LOG_archive_s23-s31.md`
> **D-번호 canonical**: `docs/PROJECT_PLAN_v3.1.md` §2가 유일한 권위입니다.
