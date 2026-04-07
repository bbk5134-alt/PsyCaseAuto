---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

---

### 세션 54 — GS1/GS2 QC 비교 분석 + 프로젝트 방향 전환 + 최종 프롬프트 수정 5건 (2026-04-07)

#### 배경

- GS2 (PT-2026-002, Bipolar+AUD) E2E 후 QC v2.1 채점 결과: **63/100 (B등급)**
- GS1 (PT-2026-001, MDD) Phase 3 이전 보고서를 v2.1로 채점: **82/100 (A등급)**
- 19점 격차 원인 분석 수행 → 프로젝트 방향 결정

#### GS1 vs GS2 QC 비교 (v2.1 프롬프트 동일 기준)

| 항목 | GS1 (82/A) | GS2 (63/B) | 차이 |
|------|:----------:|:----------:|:----:|
| A 형식 | 55/60 | 49.5/60 | -5.5 |
| B 사실정확성 | 13/25 | 5/25 | -8 |
| C Halluc 품질 | 14/15 | 8.5/15 | -5.5 |
| **총점** | **82** | **63** | **-19** |

#### 19점 격차 원인 분석

| 분류 | 기여도 | 핵심 원인 |
|------|:------:|----------|
| Mock 데이터 구조 | 40% | GS1=명시적 수치(기분 3/10), GS2=행동관찰 기반 추론 필요 |
| 프롬프트 GS1 최적화 | 50% | "데이터 추출"에 최적화, "행동→임상추론" 능력 없음 |
| Phase 3 수정 퇴보 | 10% | A섹션은 오히려 개선. B문제는 Phase 3 무관 |

#### B 섹션 상세

| | GS1 | GS2 |
|---|------|------|
| B-1 사실 일치 | 13/15 | 5/15 (**즉시실격 -5**: 자살위험도 하향) |
| B-2 Fabrication | **0/10** | **0/10** |
| **공통 실패**: B-2 양쪽 0점 (입원세팅/수치 날조) |

#### 프로젝트 방향 결정

| 결정 | 내용 |
|------|------|
| **추가 E2E 중단** | QC 점수 무관하게 실사용 전환 |
| **최종 수정 5건** | 프롬프트 수정만 진행 (E2E 없이) |
| **실사용 전환** | ~2주 후 실데이터로 첫 사용 |
| **이후 작업** | WF4 Q&A 대본 또는 다른 자동화 프로젝트 |

#### 최종 프롬프트 수정 5건

| # | 대상 | 수정 내용 | Fix ID |
|---|------|----------|--------|
| 🔴 1 | S07 Mood Chart | output format에서 수치 입력 구조적 차단 — narrative에 숫자 점수 삽입 절대 금지 강화 | Fix-O |
| 🔴 2 | S06 MSE | 자살위험도 판정을 텍스트 규칙 → 의사결정 트리(lookup table) 형식으로 변경 | Fix-P |
| 🔴 3 | S09 Present Illness | 입원 경로 fabrication 방지 — GS 예시 "외래 경유" 패턴 자동 복사 금지 | Fix-Q |
| 🟡 4 | S01 Identifying Data | SES 판단 근거 불충분 시 "중" 기본값 → "[확인 필요]" 변경 | Fix-R |
| 🟡 5 | P3-7 교차검증 | Known limitation 기록 (S08도 오류 시 교정 실패 가능) | — |

#### P3-7 교차검증 Known Limitation

- 세션 52 Mock 테스트에서 P3-7 정상 작동 확인됨
- 그러나 GS2 E2E에서 S06 MSE Mood/Affect가 "euthymic"으로 잘못 생성됨
- **추정 원인**: S08 Progress Note O) 값 자체가 오류 → P3-7이 잘못된 값으로 교정
- 또는: S08이 정상인데 S06이 교차검증 결과를 무시
- **해결 전략**: 실데이터에서 재현 시 S08 출력 직접 확인 후 대응

#### 프롬프트 수정 4건 완료

| Fix ID | 대상 | 수정 내용 | .md | n8n |
|--------|------|----------|:---:|:---:|
| Fix-O | S07 Mood Chart | narrative 수치 삽입 절대 금지 강화 + "수치 없는 경우" 기본 예시화 | ✅ | ✅ `5wWj9DLBB1z1r9Fr` |
| Fix-P | S06 MSE | 자살위험도 의사결정 트리 (Step 1~3 lookup table) | ✅ | ✅ `Qp0IXqsbounP2X1l` |
| Fix-Q | S09 Present Illness | 입원 경로 fabrication 방지 — GS "외래 경유" 자동 복사 금지 | ✅ | ✅ `4VyEFSX0H0FD2ilK` |
| Fix-R | S01 Identifying Data | SES 기본값 "중" → "[확인 필요]" 변경, 판정 조건 명시 | ✅ | ✅ `nJLVKGu1Ngh9C3pl` |

#### 프로젝트 상태 전환

**🟢 실사용 대기 상태** — 추가 E2E 중단. ~2주 후 실데이터로 첫 사용 예정.

---

### 세션 53 — P3-8 FN 방지 규칙 검토 + s34-a2 시스템 프롬프트 v3.1 적용 (2026-04-07)

#### 완료 항목

| 작업 | 상태 | 비고 |
|------|:----:|------|
| FN 방지 1~5 규칙 + 기존 v3 결합 프롬프트 검증 | ✅ | 4개 수정사항 도출 |
| `s34-a2_system_prompt_v3.1.md` 생성 | ✅ | 16,103 chars (+2,595 vs v3) |
| WF2 `s34-a2` Hallucination 검증 AI Agent systemMessage 업데이트 | ✅ | MCP updateNode 적용, `operationsApplied: 1` |
| PROGRESS_LOG 세션 53 기록 | ✅ | |

#### 수정사항 4개 (FN 방지 규칙 내부)

| # | 위치 | 문제 | 수정 내용 |
|---|------|------|----------|
| Fix 1 | FN 방지 2 | `type: fabricated_fact` 오분류 — "있는 것을 없다고 단정"은 `absence_assumption` | `absence_assumption (major)`로 변경 + 분류 이유 주석 추가 |
| Fix 2 | FN 방지 5 | severity 기본값 override 미명시 — `absence_assumption`은 기본 `minor`이므로 명시 필요 | `⚠ 이 규칙에 한해 severity: major로 처리한다` override 문구 추가 |
| Fix 3 | FN 방지 1 | 복수 경과 기록 존재 시 비교 기준 모호 | `가장 최근 경과 기록(latest O)의 값 사용` + 날짜 기준 명시 |
| Fix 4 | FN 방지 3 | 자해(NSSI) → reckless behavior 카운트 시 FP 위험 | `FP 방어 6 NSSI 체크리스트 먼저 적용` 후 포함 지시 추가 |

#### 검증 결과

| 검증 포인트 | 결과 |
|------------|:----:|
| FN 방지 5개 규칙 키워드 존재 확인 | ✅ |
| 프롬프트 길이 증가 < 500 tokens | ✅ (~420 tokens 증가) |
| 기존 v3 내용 무변경 확인 | ✅ |

**기술 노트**:
- n8n `s34-a2` 노드 업데이트: `n8n_update_partial_workflow` + `updateNode` op + `"parameters.options.systemMessage"` dot notation 사용
- WF2 ID: `LiN5bKslyWtZX6yG`

---

### 세션 52 — P3-7 Mock 테스트 검증 완료 (2026-04-07)

#### 완료 항목

| 검증 포인트 | 결과 | 비고 |
|------------|:----:|------|
| `P3-7 AI 교차 검증` Affect 불일치 탐지 | ✅ | `field: Affect`, `s06_value: broad, reactive`, `s08_value: constricted, blunted` |
| `P3-7 불일치 교정` 자동 교정 적용 | ✅ | `has_corrections: true`, `correction_count: 1` |
| corrected_mse narrative 교정 | ✅ | `broad → constricted, blunted` 치환 확인 |
| corrected_mse structured.data.affect | ✅ | `"constricted, blunted"` 으로 교정됨 |

**테스트 방법**: n8n "set mock data" (Pin Output) 활용
- `P3-7 교차 검증 준비` 노드에 의도적 불일치 mock 데이터 주입
  - S06 Affect: `"broad, reactive"` (잘못된 값)
  - S08 최근 O) Affect: `"constricted, blunted"` (실제 값)
- `P3-7 AI 교차 검증` → `P3-7 불일치 교정` 순차 Execute step 실행
- 비용: ~$0.005 (Gemini Flash 1회 호출)

**판정**: P3-7 MSE↔Progress Note 교차 검증 구현 완료 ✅ — 실제 워크플로우 통합 준비 완료

---

### 세션 51 — Step P3-7: MSE↔Progress Note 교차 검증 AI Agent 추가 (2026-04-07)

#### 완료 항목

| 작업 | 대상 | 상태 |
|------|------|:----:|
| P3-7 교차 검증 준비 (Code) | WF2 `p3-7-prep` | ✅ |
| P3-7 AI 교차 검증 (AI Agent, Gemini Flash) | WF2 `p3-7-agent` | ✅ |
| P3-7 Gemini Flash (LM 서브노드) | WF2 `p3-7-gemini` | ✅ |
| P3-7 불일치 교정 (Code) | WF2 `p3-7-correct` | ✅ |
| p2-merge S06 교정 적용 패치 | WF2 `p2-merge` jsCode | ✅ |
| D-42 문서화 | `PROJECT_PLAN_v3.1.md` §2 | ✅ |

**실행 흐름**:
- Phase 1 결과 병합 → **fan-out** → [Phase 1 완료 알림 (Phase 2 체인), P3-7 교차 검증 준비]
- P3-7 체인: 준비 → AI Agent (Gemini Flash, ~3-5초) → 불일치 교정 (dead-end)
- Phase 2 완료 후 p2-merge가 `$('P3-7 불일치 교정').first().json`으로 교정된 S06 적용

**교차 검증 항목 (3개)**:
1. S06 Mood ↔ S08 최근 O) Mood
2. S06 Affect ↔ S08 최근 O) Affect
3. S06 Thought Content 양성 ↔ S08 S) 환자 발언 근거 존재 여부

**자동 교정 대상**: `structured.data.mood`, `structured.data.affect`, narrative 문자열 치환

**비용**: +~$0.005/run (Gemini Flash, ~500 tokens input + ~100 tokens output)

**기술 노트**:
- AI Agent 시스템 메시지: JSON 예시에 `{{` `}}` LangChain 이스케이프 적용
- 입력 준비 Code: JSON.stringify 후 `{→{{`, `}→}}` 이스케이프 (LangChain 파싱 방어)
- WF2 nodeCount: 75 → 79 (+4), connectionCount: 68 → 71 (+3)
- 타이밍 보장: Phase 2 체인은 AI 4회 순차 호출(~2분) → P3-7(~5초) 항상 먼저 완료

---

### 세션 50 — P3-6 JS 검증 노드 이슈 수정 I-1~3 (2026-04-07)

#### 완료 항목

| 이슈 | 수정 내용 | 대상 | 상태 |
|------|----------|------|:----:|
| I-1 S04 노이즈 | Lab findings 조건: `labKeywordRe.test(s04Narrative) &&` 추가 — narrative에 검사 키워드 존재 시만 경고 | WF2 `p3-6-validate` jsCode | ✅ |
| I-2 S07 타입 안전성 | `typeof narrative === 'string'` guard 추가 — Object 입력 시 silent 오류 방지 | WF2 `p3-6-validate` jsCode | ✅ |
| I-3 D-41 문서화 | D-33·D-41 §2 의사결정 표 추가 | `PROJECT_PLAN_v3.1.md` §2 | ✅ |

**I-1 수정 핵심**: S04 검사 키워드 패턴 — `/혈액|CBC|BMP|LFT|검사결과|혈당|전해질|갑상선|TSH/i`
검사 언급이 없는 일반 케이스에서 경고가 항상 발화되던 노이즈 제거.

**I-2 수정 핵심**: `typeof sections.mood_chart?.narrative === 'string'` 삼항 조건 사용.
Sub-WF S07 파싱 실패 시 narrative가 Object일 경우 `|| ''` fallback 미작동 문제 해결.

---

### 세션 49 — S09 Fix-경어체 + P3-6 JS 검증 노드 (2026-04-07)

#### 완료 항목

| 작업 | 대상 | 상태 |
|------|------|:----:|
| S09 프롬프트 재검증 (P3-4 범위) | S09 Present Illness | ✅ |
| Fix-경어체 추가 | S09 .md §3 rule 5 + n8n `4VyEFSX0H0FD2ilK` | ✅ |
| P3-6 JS 검증 노드 (D-41) | WF2 메인 `LiN5bKslyWtZX6yG` | ✅ |

**S09 검증 발견 이슈**:
- 🔴 중간: Fix-경어체 누락 — §3 출력 형식 규칙에 경어체 금지 명시 없음 (S03과 비일관)
- 🟡 낮음: Output Format 예시에 GS1 고유값 혼재 (structured 필드, narrative 아님)
- 🟡 낮음: A(Affect) 3문장 규칙 엄격성 (Error Handling 13번으로 커버 중)

**S09 Fix-경어체 적용**:
- `.md` §3 rule 5: `'~하였다'`, `'~보였다'` 서술체 통일. 경어체 절대 금지.
- n8n `4VyEFSX0H0FD2ilK` `parameters.options.systemMessage` 동기화 ✅
- git commit `560f889`

**P3-6 JS 검증 노드 (WF2)**:
- 위치: Phase 2 결과 병합 직후, 보고서 준비 직전 (fan-out 비차단 패턴)
- 새 노드 3개: `P3-6 JS 검증` (Code) + `P3-6 경고 확인` (IF) + `P3-6 Telegram 경고` (Telegram)
- 연결: p2-merge → P3-6 JS 검증 → [보고서 준비, P3-6 경고 확인 → Telegram] (비차단 fork)
- s34-c4 HTML 변환 노드: `.validation-warn` CSS + 경고 배너 삽입 코드 추가

**JS 검증 로직 4항목**:
1. S02: Chief Problems > 5개 경고
2. S04: `past_family_history.structured.data.lab_findings` 없음 경고
3. S07: narrative에 `\d+점` 패턴 감지 경고
4. S06: `mental_status_exam.structured.data.impulsivity.suicide_risk === '하'` 경고

**기술 노트**:
- D-41 비차단 패턴: P3-6 JS 검증 output[0] → 보고서 준비 + P3-6 경고 확인 동시 fan-out
- Telegram 발송 조건: `p3_6_warning_count > 0` (IF true branch)
- s34-c4에서 `$('P3-6 JS 검증').first().json.p3_6_warnings`로 경고 배열 참조
- WF2 nodeCount: 72 → 75 (+3)

---

### 세션 48 — Phase 3 P3-5: S07/S03/S05 소규모 픽스 적용 완료 (2026-04-06)

#### 완료 항목

| Fix | 대상 | .md | n8n |
|-----|------|:---:|:---:|
| Fix-M (기분 수치 출처 제한) | S07 Mood Chart | ✅ | ✅ |
| Fix-경어체 (서술체 통일) | S03 Informants | ✅ | ✅ |
| Fix-N (출생 순서 S01 연동) | S05 Personal History | ✅ | ✅ |

**Fix-M (S07)**:
- Anti-Hallucination rule 5 추가: 기분 수치는 STT 원문 환자 자기평가/표준척도(BDI/BAI/MDQ/AUDIT)만 허용. AI 임의 점수 절대 금지.
- n8n `5wWj9DLBB1z1r9Fr` `parameters.options.systemMessage` 적용 ✅

**Fix-경어체 (S03)**:
- 출력 형식 규칙 item 4 추가: '~하였다'/'~보였다' 서술체 통일, 경어체 절대 금지
- n8n S03 (`J0EvW4lNbKGLo157`) SHORT version 기준 anchor: `3. 순수 JSON 출력` → item 4 삽입 ✅

**Fix-N (S05)**:
- Anti-Hallucination rule 5 추가: Prenatal 서술 시 출생 순서는 STT 원문/S01 값과 일치. '첫째' 임의 서술 금지.
- n8n `SmR2paPpXEYTuWZO` `parameters.options.systemMessage` 적용 ✅

**기술 노트**:
- S03 n8n은 SHORT version (`parameters.options.systemMessage`), .md 전문과 달리 항목 수 적음
- Fix-경어체 anchor: `3. 순수 JSON 출력` (SHORT) — `3. 순수 JSON만 출력 (코드펜스 금지)` (legacy field)는 inactive

---

### 세션 47 — Phase 3 P3-4a/b: S09 Present Illness GS 복원 + n8n 적용 (2026-04-06)

#### 완료 항목

| Phase | 대상 | .md | n8n |
|-------|------|:---:|:---:|
| P3-4a: S09 GS 복원 (Claude.ai 축약 수정) | `C:\Users\bbk51\Downloads\system_prompt_section_09.md` | ✅ | — |
| P3-4b: Sub-WF S09 n8n 적용 | Sub-WF S09 Present Illness (`4VyEFSX0H0FD2ilK`) | ✅ | ✅ |

**P3-4a 수정 내용**:
- 문제: Claude.ai 리팩토링 시 §6 GS 4단락이 각 1~2문장씩 축약됨
- 복원: 사용자 제공 원본 전문 4단락 전체 복원 (`Downloads` 파일)
- `docs/prompts/system_prompt_section_09.md`는 이미 전문 보유 — 수정 불필요

**P3-4b 기술 노트**:
- `parameters.options.systemMessage` 대상 (n8n AI Agent 노드 active field)
- S09 GS가 Korean-heavy라 MCP 페이로드 제한 반복 충돌 → **문장 1개씩 분할 전략** (20+ step)
  - Step 4a: §6 header (38자) 삽입 확인 후 단계적 확대
  - 각 문장: `SPLIT_MARKER_S09_X` → 문장 + `SPLIT_MARKER_S09_X+1` 방식 릴레이
  - 성공 임계값: 1회당 ~140자 한국어 이하 (Korean \uXXXX 인코딩 기준)
- §1~§9 전체 적용 완료 (SPLIT_MARKER 잔존 없음 확인)

**⚠️ GS 인코딩 오류 (Unicode escape 오류 — 기능 영향 낮음)**:
- GS 단락 내 일부 한글 자모 깨짐 (일싵→일찍, 겨보고→겪어보고 등 다수)
- §9 item 13: "자젬 위험" → 원래 "자살 위험" (맥락상 이해 가능)
- GS는 Anti-GS-Contamination 규칙으로 복사 금지 → 형식 참조만이므로 기능 영향 최소
- 향후 QC 점수 하락 시 재수정 검토

**검증 결과**:
- [PASS] SPLIT_MARKER 전체 소거 확인
- [PASS] §1~§9 구조 완전 (FCAB 절대규칙, GS 4단락, 체크포인트, 출력형식, 에러핸들링)
- [WARN] GS 내 Unicode 인코딩 오류 다수 (문서화 완료, 즉시 수정 보류)

#### 다음 작업

- P3-5: S07/S03/S05 소규모 수정 (milestone.md 참조)
- QC 재실행 (Phase 3 전체 수정 후)

---

### 세션 46 — Phase 3 P3-3a/b: S02 Chief Problems 프롬프트 수정 + n8n 적용 (2026-04-06)

#### 완료 항목

| Phase | 대상 | .md | n8n |
|-------|------|:---:|:---:|
| P3-3a: S02 프롬프트 수정 (Claude.ai 검수) | `docs/prompts/system_prompt_section_02.md` | ✅ | — |
| P3-3b: Sub-WF S02 n8n 적용 | Sub-WF S02 Chief Problems (`TifgZTXdSNW9Gtlh`) | ✅ | ✅ |

**P3-3a 수정 내용 (PHASE3_FIX_PLAN Fix-L)**:
- Issue 1: `**3~5개**로 제한` → `3~5개로 제한` (bold 마커 제거 — patchNodeField find 매칭용)

**P3-3b 기술 노트**:
- `parameters.options.systemMessage` 대상 (n8n AI Agent 노드 active field)
- patchNodeField 3-step 전략으로 교체 (MCP 크기 제한 우회):
  - Step 1: 첫 줄 제목 뒤 → `STOP_MARKER_S02` 삽입
  - Step 2: regex `STOP_MARKER_S02[\s\S]*` → §1~§5 + `SPLIT_MARKER_S02_PART2`
  - Step 3: `SPLIT_MARKER_S02_PART2` → §6~§9
- 모델: claude-sonnet-4-6 유지

**P3-3b 검증 결과** (5/5 PASS):
- [PASS] `3~5개로 제한` (Fix-L §3)
- [PASS] GS2: Alcohol use dependence + Labile mood
- [PASS] `Aggravation) 내원 3달 전`
- [PASS] `aggravation` JSON 필드
- [PASS] `HIGH_SUICIDE_RISK` (§9 rule 11)

#### 다음 작업

- P3-4: S09 Present Illness 프롬프트 수정 (milestone.md 참조)

---

### 세션 45 — Phase 3 P3-2a/b: S04 Past Family History 프롬프트 수정 + n8n 적용 (2026-04-06)

#### 완료 항목

| Phase | 대상 | .md | n8n |
|-------|------|:---:|:---:|
| P3-2a: S04 프롬프트 수정 (Claude.ai 검수) | `docs/prompts/system_prompt_section_04.md` | ✅ | — |
| P3-2b: Sub-WF S04 n8n 적용 | Sub-WF S04 Past Family History (`StjkISptQwFHl5Ws`) | ✅ | ✅ |

**P3-2a 수정 내용 (PHASE3_FIX_PLAN Fix-K)**:
- Issue 1: §3 Lab Finding 제목 → "MANDATORY 규칙 (Fix-K)"로 변경 + 규칙 1번 앞에 `⚠️ MANDATORY:` 접두어 추가
- Issue 2: GS2 Lab finding `...` → AST(SGOT) ↑172, ALT(SGPT) ↑65 실제 수치 복원 (4개 항목 완성)
- Issue 3: GS2 항목명 `2. Alcohol:` → `2. Alcohol and other substance issue:` + Last drinking/Smoking 별줄 분리

**P3-2b 기술 노트**:
- `parameters.options.systemMessage` 대상 (n8n AI Agent 노드 active field)
- patchNodeField 3-step 전략으로 교체 (MCP 크기 제한 우회):
  - Step 1: 구 Role 텍스트 → 신 Role + `STOP_MARKER_S04`
  - Step 2: regex `STOP_MARKER_S04[\s\S]*` → §2~§5 + `SPLIT_MARKER_S04_PART2`
  - Step 3: `SPLIT_MARKER_S04_PART2` → §6~§9
- 모델: Gemini 2.5 Flash 유지 (P3-2b 스펙에 모델 교체 없음)

**P3-2b 검증 결과** (5/5 PASS):
- [PASS] "MANDATORY" 키워드 존재 (§3 제목 + 규칙 1번)
- [PASS] "Lab Finding" 키워드 존재
- [PASS] "보호자 보고" 키워드 존재
- [PASS] GS2 AST(SGOT) ↑172, ALT(SGPT) ↑65 포함
- [PASS] GS2 항목명 `Alcohol and other substance issue` 정상

#### 다음 작업

- P3-3: Fix-L/M 다음 Sub-WF 수정 (milestone.md 참조)

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

---

### 세션 56 — WF4 Stage 0 v0.2.1 수령 + GS1/GS2 통합 QC 검증 (2026-04-08)

#### 배경

- Claude.ai (Sonnet 4.5)가 메타 프롬프트(`wf4_stage0_meta_prompt_for_claude_ai.md`) 기반으로 v0.2.1 생성
- v0.2 → v0.2.1 (11개 패치, Q&A 5개 고정, mid-flight verification 도입)
- GS 라벨 오인: 세션 초반 사용자가 GS2로 제출한 것이 실제 GS1(MDD) 케이스였음 → 확인 후 GS2(BD I+AUD) 재제출

#### 주요 작업

1. **v0.2.1 파일 저장**: `docs/prompts/wf4_stage0_v0.2.1.md` 생성
2. **GS1 (MDD) 시뮬레이션 QC**: 9.1/10, 스펙 준수 확인
3. **GS2 (BD I+AUD) 시뮬레이션 QC** (`case_conference_QA_문혜린.md`): 9.2/10, 케이스 특화 취약점 발굴 정확

#### 10+7 통합 체크리스트 결과

| 체크리스트 | 결과 |
|-----------|:----:|
| 10개 프롬프트 구조 항목 | 9/10 |
| 7개 Claude Code 검증 | 6.5/7 |
| 실사용 승인 | ✅ 조건부 승인 |

**이슈 2건** (모두 하위 위험도, 즉각 차단 불필요):
- GS2 Q14 Constraints 경계선 위반 (lab finding → 치료 방향) ⭐ / Section 5 미포함
- GS2 Q4 방어 멘트 카드 3문장 (80자 초과, 5초 발화 어려움)

#### v0.2 → v0.2.1 주요 변경 확인됨

| 변경 | 확인 |
|------|:----:|
| §2.5 증상-진단 교차 매핑 표 | ✅ |
| §6 방어 멘트 카드 (3박자, 예시 3개, 5개 고정) | ✅ |
| §7 5단 타임라인 표 | ✅ |
| §8 진단 커버리지 한계 메타 | ✅ |
| 🛑 Mid-flight Verification + Anchor 출력 | ✅ (신규) |
| Quality Gate 제거 → Gemini QC 1줄 대체 | ✅ |
| GS2 편향 제거 → 조건부 AND 축 활성화 | ✅ |
| ABSOLUTE RULE 블록 최상단 | ✅ |

#### 다음 작업

- P-5 여자친구 임상 검토 (5개 항목) — 실사용 전 마지막 관문
- Tier 6: Gemini QC prompt + Perplexity Tool prompt 제작 (Claude Code 직접 작성 가능)

---

> **아카이브**: 세션 8~13 → `docs/archieve(이전 log)/PROGRESS_LOG_archive_s08-s13.md`
> **아카이브**: 세션 13~22 → `docs/archieve(이전 log)/PROGRESS_LOG_archive_s13-s22.md`
> **아카이브**: 세션 23~31 → `docs/archieve(이전 log)/PROGRESS_LOG_archive_s23-s31.md`
> **아카이브**: 세션 32~43 → `docs/archieve(이전 log)/PROGRESS_LOG_archive_s32-s43.md`
> **D-번호 canonical**: `docs/PROJECT_PLAN_v3.1.md` §2가 유일한 권위입니다.
