---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

---

### 세션 27 — s34-a2 v2 시스템 프롬프트 적용 (2026-04-03)

#### 작업 배경

세션 26 수정(s34-a1 원문 전체 전달) 이후 첫 E2E 결과인 `hallucination_check_20260403_1410.json` (7 issues, context_truncated: false) 에 대해 Claude.ai QC 실시.

#### QC 결과 검토 (77/100, Pass — 보정 후)

Claude.ai 원점수: 73/100 (Fail) → **77/100 (Pass)** 로 보정.

보정 사유: QC 채점 프롬프트가 `absence_assumption`을 비표준 type으로 오분류하여 A-3(-2점), D-1(-2점) 감점. 세션 25에서 공식 5번째 type으로 등록된 사항이므로 해당 감점 취소.

| 섹션 | 점수 | 주요 이슈 |
|------|------|-----------|
| A 정확성 | 13/20 → 15/20 | FP 1건 (Issue 7: S06 Goal-directed — STT에 "목표 지향적" 명시) |
| B 완전성 | 16/20 | FN 2건: FN-1 S07 Mood Chart 입원용어, FN-2 S06 Preoccupation 추론 |
| C 유용성 | 16/20 | severity 구분 있음 |
| D 프롬프트 준수 | 16/20 → 18/20 | absence_assumption 사용 정상, 3단계 탐색 경로 기재 정상 |
| E 임상 안전 | 17/20 | FN-1 치료 세팅 오류 미탐지 — 임상적으로 중요 |

#### 이슈 원인 분석

| 이슈 | 근본 원인 | v2 해결책 |
|------|-----------|-----------|
| FP Issue 7 (Goal-directed) | 프롬프트에 MSE 섹션 교차확인 규칙 없음 | "MSE 섹션 교차확인 의무" 절 추가 |
| FN-1 (Mood Chart 입원 용어) | 치료 세팅 검증 규칙 없음 | "FP 방어 5 (실질 FN 방지 규칙)" 추가 |
| FN-2 (Preoccupation 추론) | 기존 inference_unmarked 규칙 범위 내 — 탐지 실패 | v2 직접 해결 없음 (모니터링) |

#### 모델 업그레이드 검토

Gemini 2.5 Flash → Pro 업그레이드 타당성 분석:
- **결론: 현 단계 불필요**. FN-1은 규칙 부재가 원인 → 프롬프트 수정이 우선.
- Pro 업그레이드 검토 시점: v2 적용 후 E2E 재채점에서 75점+ 미달 시.
- gemini-3.1-pro-preview 모델명은 지식 컷오프 기준 존재 불확실 → 사용 전 n8n에서 유효성 테스트 필요.

#### s34-a2 v2 프롬프트 적용

Claude.ai 수정본(`s34-a2_system_prompt_v2.md`) 검토 후 수정 없이 n8n WF2 "Hallucination 검증 AI Agent" 노드에 직접 적용.

**v1 대비 v2 변경사항**:
1. MSE 섹션 교차확인 의무 절 신규 추가 (FP 방어용)
2. severity_distortion 적용 예시 표 확장 (6가지, 치료 세팅 왜곡 포함)
3. FP 방어 5: 치료 세팅 용어 검증 절 신규 추가 (실질 FN 방지 규칙)
4. severity major 예시에 "치료 세팅 오기" 추가
5. severity_distortion 치료 세팅 왜곡 예시 추가

n8n MCP `n8n_update_partial_workflow` 적용 완료 (operationsApplied: 1, saved: true).

프롬프트 파일: `docs/prompts/s34-a2_system_prompt_v2.md` 저장 완료.

#### 다음 작업

- s34-a1 핀 데이터 해제 후 E2E 재실행 → Halluc check QC 재채점 (목표 75점+)

---

### 세션 28~29 — s34-a2 v3 프롬프트 + parse_error 버그 수정 (2026-04-05)

#### 작업 배경

세션 27 이후 E2E 실행 시 s34-a3 `검증 결과 통합`에서 반복적인 parse_error 발생:
1. `Bad control character` → LangChain OUTPUT_PARSING_FAILURE
2. `Unterminated string` (응답 잘림)

#### 버그 수정 이력

| 단계 | 원인 | 수정 |
|------|------|------|
| s34-a2 ReAct parser 실패 | Gemini가 ` ```json ` fence 출력 → LangChain 파싱 실패 | Conversational Agent → **Tools Agent** 전환 (`parameters.agent: "toolsAgent"`) |
| s34-a3 응답 잘림 (3888자) | `modelName` 미설정 → 구버전 모델 default (토큰 한계 낮음) | (이미 이전에 modelName, maxOutputTokens 설정되어 있었음 — 별도 수정 불필요) |
| s34-a3 응답 잘림 (4543~5147자) | `maxOutputTokens: 16384` 이나 Gemini 2.5 Flash thinking 토큰이 출력 예산 소비 | `maxOutputTokens: 65536` (Gemini 2.5 Flash 최대값)으로 상향 |
| s34-a3 fence stripping 오류 | regex `\`\`\`json\\n?` 에서 MCP JSON 인코딩 이중 이스케이프 | string 메서드(`startsWith`, `substring`, `endsWith`)로 교체 |
| s34-a3 JSON 불완전 파싱 | 잘린 JSON으로 인한 `Unterminated string` | maxOutputTokens 65536 상향으로 해결 |

#### s34-a2 v3 시스템 프롬프트 적용

**v2 대비 v3 변경사항**:
1. **FP 방어 6** 신규: NSSI(비자살적 자해)와 SA(자살 시도) 구분 — 5항목 체크리스트, 3가지 판정 규칙, 4가지 예시
2. **FP 방어 7** 신규: 섹션 배치 오류 ≠ Hallucination 규칙
3. 기존 FP 방어 1~5 및 JSON 출력 규칙 유지

n8n MCP `patchNodeField` → `parameters.options.systemMessage` 적용 완료.
파일: `docs/prompts/s34-a2_system_prompt_v3.md` 저장 완료.

#### QC 결과 (v3 적용 후)

**E2E 실행**: parse_error: false ✅, sections_checked: S01~S10 ✅, 13건 탐지

Claude.ai QC 채점:
- 원점수: **87/100** → 보정 후 **89/100** (absence_assumption 재차 오분류 감점 취소)
- 판정: **Pass** (목표 80점+ 달성)
- 이전 v2 대비: 77 → 89 (+12pt)
- NSSI/SA FP 완전 해소 ✅

| 기준 | 점수(보정) | 주요 변동 |
|------|:---:|------|
| A 정확성 | 18/20 | FP 1건 (Issue 3 알코올) — v3.1 FP 방어 8로 해소 예정 |
| B 완전성 | 18/20 | FN 2건 모두 minor |
| C 유용성 | 18/20 | 부재 가정 수정 방향 부족 |
| D 프롬프트 준수도 | 19/20 | absence_assumption 오분류(채점 오류) |
| E 임상 안전성 | 18/20 | NSSI/SA 정확 분류 ✅ |

#### s34-a2 v3.1 프롬프트 적용 (FP 방어 8 추가)

**QC 수정 사안 검토 결과**:
- MEDIUM #1 (absence_assumption 공식화): 이미 v3에 포함 — 불필요
- **MEDIUM #2 (물질 사용 FP 방어)**: ✅ 적용
- LOW #3, #4: 보류

**FP 방어 8 내용**: 임상적으로 유의미하지 않은 물질 사용(알코올 1회/월 미만 소주 1-2잔, 카페인 1-2잔/일 등)을 "none"으로 기재한 경우 FP로 처리.

n8n MCP `patchNodeField` → `parameters.options.systemMessage` 적용 완료.
파일: `docs/prompts/s34-a2_system_prompt_v3.md` (v3.1 내용 포함) 업데이트 완료.

#### 현재 s34-a2-gemini 노드 설정값

| 파라미터 | 값 |
|---------|---|
| modelName | `models/gemini-2.5-flash` (default) |
| maxOutputTokens | 65536 |
| temperature | 0.1 |
| safetySettings | 4개 카테고리 모두 BLOCK_NONE |
| agent type | Tools Agent |

#### 다음 작업 (Tier 4)

- Step 4-3b [추론] 태그 CSS (선택) → 세션 30에서 완료
- 2분할 병렬 처리: 실환자 데이터 테스트 후 QC 재평가 시 필요하면 적용

---

### 세션 30 — Step 4-3b [추론] 태그 CSS 구현 (2026-04-05)

#### 작업 내용

s34-c4 (`HTML 보고서 변환`) 노드에 `[추론]...[/추론]` 태그 CSS 스타일링 구현.

**변경 사항 3개:**

| # | 위치 | 변경 내용 |
|---|------|---------|
| 1 | CSS (inline in `let h`) | `.inference { color: #888; font-style: italic; }` + `@media print { .inference { display: none; } }` 추가 |
| 2 | `toHtml()` 함수 | `withUnderline` 다음에 `withInference` 체인 추가: `[추론](.*?)[\/추론]` → `<span class="inference">$1</span>` |
| 3 | Progress Notes 전용 루프 | 동일 `withInference` 변환 추가 (기존 `withUnderline` 체인 이후) |

**적용 결과:**
- 화면 표시: 회색(#888) 이탤릭체
- 인쇄 시: `display: none` (숨김)
- 적용 범위: 전체 섹션(toHtml) + Progress Notes 루프

n8n MCP `updateNode` → `parameters.jsCode` 전체 교체 완료 (7072 → 7445 chars, +373 chars)

#### 다음 작업

- Step 4-6: 실사용 테스트 (실환자 녹음 → WF1-B → WF2 → §18 전공의 수정 E2E)
- v2 적용 후 FP Issue 7 해소 확인 + FN-1 탐지 여부 확인

---

### 세션 31 — Step 4-3b 정적 검증 (2026-04-05)

#### 작업 내용

세션 30에서 MCP `updateNode`로 적용한 Step 4-3b 변경사항이 n8n 실제 노드에 반영되어 있는지 정적 확인.

**검증 방법**: `n8n_get_workflow` (WF2: `LiN5bKslyWtZX6yG`) → s34-c4 노드 `parameters.jsCode` 직접 검색.

**검증 결과:**

| 항목 | 확인 내용 | 결과 |
|------|---------|:----:|
| CSS `.inference` | `.inference { color: #888; font-style: italic; }` | ✅ |
| CSS `@media print` | `@media print { .inference { display: none; } }` | ✅ |
| `withInference` — toHtml() | `[추론](.*?)[\/추론]` → `<span class="inference">$1</span>` | ✅ |
| `withInference` — Progress Notes 루프 | 동일 변환 + `// Step 4-3b` 주석 포함 | ✅ |

**판정**: E2E 실행 불필요. `[추론]` 태그 실제 렌더링은 Step 4-6 실환자 데이터에서 자연 검증.

#### 다음 작업

- Step 4-6: 실환자 녹음 → WF1-B → WF2 → §18 전공의 수정 E2E

---

### 세션 26 — s34-a1 원문 절단 버그 수정 (2026-04-03)

#### 발견 경위

n8n UI에서 Hallucination 검증 AI Agent(s34-a2) 입력 패널 확인 중 `[원본 면담 기록 — 절단됨]` 및 `context_truncated: true` 발견. Hallucination 검증이 원문 없이 진행되고 있던 것으로 의심되어 조사.

#### 원인 분석

`s34-a1` ("Hallucination 검증 준비") jsCode에 하드코딩된 **6000자 제한**:

```javascript
// 기존 (버그)
const truncated = originalText.length > 6000;
const sourceText = originalText.substring(0, 6000) + (truncated ? '\n\n[... 원문 절단됨]' : '');
const keysToCheck = truncated ? [5개 섹션] : FACTUAL_SECTION_KEYS;
```

실제 원문 크기:
- 초진 면담 (stt_20260320): ~15,000자
- 경과 면담 (stt_20260328): ~11,000자
- **합계 ~26,000자 중 6,000자(23%)만 전달**

`wf2-n18` (면담 데이터 병합)은 `full_text_for_ai`에 최대 500,000자를 보존하고 있었으나, s34-a1에서 6,000자로 슬라이싱됨.

#### 이전 검증 결과 신뢰도 영향

| 섹션 | 원문 포함 여부 | 기존 검증 신뢰도 |
|------|-------------|---------------|
| S01~S03 (Identifying/Chief/Informants) | ✅ 포함 | 신뢰 가능 |
| S04 Past/Family History | ❌ 누락 | 불신뢰 |
| S05~S07 (Personal/MSE/Mood) | ❌ 누락 | 불신뢰 |
| S08 Progress Notes | ❌ 경과 면담 전체 누락 | 불신뢰 |
| S09 Present Illness | ⚠️ 일부 | 부분 신뢰 |
| S10 Diagnostic Formulation | ❌ 누락 | 불신뢰 |

→ **Gemini가 원문 없이 보고서 내부 논리만으로 판정**해온 것으로 추정.

#### 수정 내용 (WF2 s34-a1, MCP 적용)

```javascript
// 수정 후
const truncated = false;                    // 6000자 제한 제거
const sourceText = originalText;            // 전체 원문 전달
const keysToCheck = FACTUAL_SECTION_KEYS;   // 항상 10개 섹션
```

Gemini 2.5 Flash 1M 토큰 컨텍스트 지원 — ~26,000자(≈8,700 토큰)은 처리 가능 범위.

n8n MCP `n8n_update_partial_workflow` 적용 완료 (operationsApplied: 1, saved: true).

#### 다음 작업

- s34-a1 핀 데이터 해제 후 E2E 재실행 → 전체 원문 기반 Hallucination 검증 확인
- QC 재채점으로 실질적인 사실정확성(B항목) 점수 재검증

---

### 세션 25 — Step 4-0/4-1/4-2 완료 (2026-04-03)

#### 작업 내용

| Step | 내용 | 결과 |
|------|------|------|
| 4-0 | p2-merge Safety 배너 수정 | ✅ |
| 4-1 | HTML→Docs 변환 검증 | ✅ (docx 변환 서식 이상 없음) |
| 4-2 | §18 운용 문서 보완 | ✅ |

#### Step 4-0: p2-merge Safety 배너 수정 (CRITICAL)

**문제**: S06 프롬프트(Fix 1)에서 `meta.alert: 'HIGH_SUICIDE_RISK'` 출력하지만 p2-merge 코드가 `suicide_risk === '상'`만 체크 → 배너 미출력.

**수정 내용** (WF2 `Phase 2 결과 병합` 노드):
```javascript
// 변경 전
const alert = (mseData?.impulsivity?.suicide_risk === '상' ||
               mseData?.impulsivity?.suicidal_plan === true)
  ? 'HIGH_SUICIDE_RISK' : null;

// 변경 후
const s06Meta = phase1Results.mental_status_exam?.meta;
const alert = (mseData?.impulsivity?.suicide_risk === '상' ||
               mseData?.impulsivity?.suicidal_plan === true ||
               s06Meta?.alert === 'HIGH_SUICIDE_RISK')
  ? 'HIGH_SUICIDE_RISK' : null;
```

n8n MCP로 WF2 적용 완료 (operationsApplied: 1).

#### Step 4-2: §18 운용 문서 보완

PROJECT_PLAN_v3.1.md → **rev.3** 업데이트:

- **T1**: Halluc 경고 대응 절 신규 추가
  - fabricated_fact 우선 처리 원칙
  - 발표 직전 최소 처리 가이드 (fabricated_fact만 + `[확인 필요]`)
  - context_truncated 경고 문구
- **T2**: 모바일 수정 한계 절 신규 추가
  - 환경별(모바일/PC) 권장 작업 표
  - 모바일 최소 체크리스트 4개 항목
- **T3**: draft_ 접두어 규칙 — 기존 §18에 이미 존재 (P-07), 추가 불필요
- §19-3 해당 항목 "완료" 상태로 업데이트

#### 다음 작업

- Step 4-3: Hallucination 시스템 프롬프트 업그레이드 (Claude.ai에서 설계 후 n8n 적용)

---

### 세션 24 — Tier 3 QC 검증 + Hallucination QC 검증 + Tier 4 구조화 (2026-04-03)

#### 배경

세션 23에서 5개 Fix + Gemini Flash 전환 후 E2E 실행한 `draft_20260403_1410_v1.html`에 대해 QC 2건(보고서 QC + Hallucination check QC) 검증.

#### QC #1: 보고서 QC (86.5/100, A등급, PASS)

| 항목 | Tier 2 (Sonnet) | Tier 3 (Gemini) | 차이 |
|------|:-:|:-:|:-:|
| A (형식) | — | 51/60 | — |
| B (사실정확) | — | 23/25 | — |
| C (임상품질) | — | 12.5/15 | — |
| **총점** | 91 | 86.5 | **-4.5** (5pt 이내) |

**미해결 이슈 (Tier 4 이관)**:

| 이슈 | 원인 | 조치 |
|------|------|------|
| HIGH_SUICIDE_RISK 배너 미출력 | p2-merge `meta.alert` 미참조 (CRITICAL) | Step 4-0 |
| S02 첫 증상 번호+영문명 누락 | Gemini 프롬프트 이행률 낮음 | 모니터링 |
| S02 Onset Remote/Recent 미구분 | Gemini P4 규칙 미이행 | 모니터링 |
| S08 첫 노트 헤더 누락 | Gemini Fix 3 미이행 | 모니터링 |
| S07 Mood Chart 입원 용어 | 외래/입원 분기 미구현 | Step 4-3 이후 |

#### QC #2: Hallucination Check QC (58/100, Fail)

Hallucination check(`hallucination_check_20260403_1410.json`, 21건) 자체의 품질 평가.

| 기준 | 점수 | 주요 감점 |
|------|------|-----------|
| A 정확성 | 7/20 | FP 4건: STT 경과 원문 미확인(#6), MSE 표준 변환 과분류(#7), placeholder 과분류(#13-14) |
| B 완전성 | 11/20 | 5/10 섹션만 커버, Alcohol "none" FN, anhedonia 추가 FN |
| C 유용성 | 12/20 | severity 구분 부재 |
| D 프롬프트 준수 | 14/20 | informant_error/severity_distortion 미사용 |
| E 임상 안전 | 14/20 | Alcohol FN, 날짜 오류 심각성 미분류 |

**구조적 원인**: `context_truncated: true` → Gemini Flash context window 한계로 전체 섹션 탐색 불가
**시스템 프롬프트 수정 필요**: 7건 권고 → Tier 4 Step 4-3에 기록

#### Tier 3 판정

- QC 86.5/100 (A등급) — Tier 2 대비 -4.5pt → **5pt 이내, Gemini 롤백 불필요**
- E2E 비용 ~$0.62 (Tier 2 ~$1.1 대비 ~45% 절감) → 비용 목표 달성
- **Tier 3 완료 선언**, 잔여 이슈는 Tier 4로 이관

#### Q&A 기록

- Q1-1 (완성도 로직): 현 단계 변경 불필요, Tier 4에서 섹션별 상태 표시(방안 A) 검토
- Q1-2 (Safety 배너): p2-merge에 `meta.alert` 체크 추가 필수 → Step 4-0 CRITICAL
- Q2 (Halluc Gemini 설정): 사용자가 수동으로 temperature 0.1 설정 완료
- Q4 (Tier 4 기록): milestone.md에 Step 4-0~4-6 구조화, Step 4-4/4-5 보류 처리

#### 다음 작업

- Tier 4 Step 4-0: p2-merge Safety 배너 수정 (CRITICAL, 다음 E2E 전 필수)
- Tier 4 Step 4-3: Hallucination 시스템 프롬프트 업그레이드 (Claude.ai에서 설계)

---

### 세션 23 — QC 검토 + 5개 수정 + Gemini Tier 3 교체 (2026-04-03)

#### 배경

`draft_20260403_1224_v1.html` QC 결과 (91/100, Grade A) 3개 CRITICAL 이슈 확인 후 일괄 수정.

#### QC 결과 요약 (91/100)

| 이슈 | 중요도 | 원인 분석 | 판정 |
|------|--------|-----------|------|
| S11/S12 raw JSON 렌더링 | CRITICAL | HTML 변환 노드 extractNarrative 미처리 | 실제 버그 ✅ |
| HIGH SUICIDE RISK 플래그 부재 | CRITICAL | Safety 트리거 조건 불충분 (과거 자해+수동SI 미포함) | 트리거 확장 필요 ✅ |
| S02 onset 역전 | HIGH | P4 fallback 미작동 (역전 감지 후 Onset 전환 불이행) | 강화 필요 ✅ |

#### 수정 완료 (5건)

| Fix | 대상 | 내용 | 방법 |
|-----|------|------|------|
| P7 | HTML s34-c4 노드 | extractNarrative: 코드펜스 제거 + regex fallback (S11/S12) | n8n MCP |
| Fix 1 | S06 프롬프트 | Safety 트리거 확장: 자해이력+SI(+) 조합 → HIGH_SUICIDE_RISK | 파일+n8n |
| Fix 2 | S02 프롬프트 | P4 fallback 강화: 역전 즉시 강제 Onset 단독 전환, 역전 출력 절대 금지 | 파일+n8n |
| Fix 3 | S08 프롬프트 | 첫 번째 노트 헤더 절대 규칙 명시 (예외 없음, 헤더 없이 S) 시작 금지) | 파일+n8n |
| Tier 3 | S01~S04, S06, S07 | Claude Sonnet 4 → Gemini 2.5 Flash Preview 교체 (비용 ~45% 절감 목표) | n8n MCP |

#### Gemini 교체 상세

| Sub-WF | WF ID | 결과 |
|--------|-------|------|
| S01 | `nJLVKGu1Ngh9C3pl` | ✅ |
| S02 | `TifgZTXdSNW9Gtlh` | ✅ |
| S03 | `J0EvW4lNbKGLo157` | ✅ |
| S04 | `StjkISptQwFHl5Ws` | ✅ |
| S06 | `Qp0IXqsbounP2X1l` | ✅ |
| S07 | `5wWj9DLBB1z1r9Fr` | ✅ |

- credential: `xyQSdt2V3UhYvrcF` (Google Gemini PaLM API)
- 모델: `models/gemini-2.5-flash-preview-04-17`
- S05, S08~S12: Claude Sonnet 4 유지

#### 다음 작업

- 핀 제거 (S01~S08, S11, S12) → E2E 재실행 → QC
- D-09: Gemini 교체 후 QC 필수, 5점+ 하락 시 롤백

---


---

> **아카이브**: 세션 8~13 → `docs/PROGRESS_LOG_archive_s08-s13.md`
> **아카이브**: 세션 13~22 → `docs/PROGRESS_LOG_archive_s13-s22.md`
> **D-번호 canonical**: `docs/PROJECT_PLAN_v3.1.md` §2가 유일한 권위입니다.
