# Phase 3 Fix Plan — QC 61점 → 80점+ 복구 계획 (최종본)

> **작성일**: 2026-04-06 | **최종 수정**: 2026-04-07
> **기준**: QC PT-2026-002 결과 61/100 (Grade B)
> **목표**: GS2 QC 80점+ 달성 (A: 49→55, B: 6→18, C: 6→10)
> **⚠️ 현황**: **P3-1~P3-8 전체 완료 (세션 44~54)** — 이 문서는 완료된 계획의 참고 기록용
> **원칙**: AI 집중력 유지를 위해 1세션 = 1노드 수정. 같은 노드 Fix는 반드시 묶음.

---

## 확정 의사결정

| # | 결정 사항 | 결정 | 근거 |
|---|----------|------|------|
| D-39 | S06 모델 전환 | **Sonnet 전환** | 감점 25.5점 중 16점이 S06. 임상 판단에 Flash 부족 |
| D-40 | 교차 검증 불일치 시 처리 | **자동 교정** | O) 값이 면담자 직접 관찰이라 항상 우선. 사용자 판단 불필요 |
| D-41 | JS 경고 처리 방식 | **Telegram 알림 (비차단)** + HTML 경고 배너 | WF 중단 불필요. 전공의 최종 검토 시 참고 |
| D-42 | S09 리팩토링 | **진행** | 7.5K tokens — 2번째로 비대. 예방적 축소 |

---

## 감점 원인 요약 (11건)

| 순위 | 문제 | 감점 | 원인 노드 | Fix ID | 원인 유형 |
|:----:|------|:----:|:---------:|:------:|:---------:|
| 1 | MSE Affect 날조 (appropriate vs labile) | -5 (B-2) | S06 | Fix-G | 모델 + 프롬프트 |
| 2 | Paranoid ideation (-) 오기재 | -5 (B-2) + FN | S06 | Fix-H | 프롬프트 (코딩 예시 부재) |
| 3 | 자살위험성 '하' (GS '중') | -5 (B-1) + FN | S06 | Fix-I | 프롬프트 (규칙 강제력 부족) |
| 4 | Lab finding 'none' (보호자 보고 무시) | -1 (B-1) + FN | S04 | Fix-K | 프롬프트 (Lost in Middle) |
| 5 | Mood irritable 오기재 | -1 (B-1) + FN | S06 | Fix-G | 모델 |
| 6 | Chief Problems 8개 과다 (GS 4개) | -2 (A02) | S02 | Fix-L | 프롬프트 (상한선 부재) |
| 7 | 기분 수치 9점/7점 날조 | -1 (A08) | S07 | Fix-M | 프롬프트 |
| 8 | 경어체 혼재 | -1 (A03) | S03 | Fix-경어체 | 프롬프트 |
| 9 | 첫째 오기재 (실제 둘째) | FN | S05 | Fix-N | 모델 |
| 10 | Grandiosity 항목 누락 | FN | S06 | Fix-J | 프롬프트 (항목 분리 미규정) |
| 11 | Halluc Check FN 5건 | -9 (C) | S34-a2 | Fix-O | 프롬프트 |

---

## 작업 구조 원칙

```
1세션 = 같은 노드 수정은 반드시 묶음 (AI 집중력 유지)
각 Step 완료 후 반드시 ✅ 검증 포인트 확인
Claude.ai = 프롬프트 리팩토링 (긴 문서, 임상 예시 생성)
Claude Code = n8n 적용 + JS/AI 노드 추가 + 검증
```

---

## Step 순서 (우선순위 + 노드 묶음)

---

### Step P3-1: S06 프롬프트 리팩토링 + Sonnet 전환 ⭐ 최우선

> **Fix 포함**: Fix-G, Fix-H, Fix-I, Fix-J (모두 S06)
> **예상 복구**: B 카테고리 +12~15점, C +2점 (전체 복구의 60%)
> **비용 영향**: E2E $0.062 → $0.18 (+$0.12/run, S06 Sonnet)

#### P3-1a: Claude.ai — S06 프롬프트 리팩토링

| 항목 | 내용 |
|------|------|
| **담당** | Claude.ai |
| **모델** | Opus 또는 Sonnet (어느 쪽이든 가능) |
| **목표** | 6.7K → 4.5K 이하 압축 + Fix-G/H/I/J 본문 통합 |

**첨부 파일 (4개)**:

| # | 파일 | 경로 | 이유 |
|---|------|------|------|
| 1 | S06 현재 프롬프트 | `docs/prompts/system_prompt_section_06.md` | 수정 대상 |
| 2 | QC 결과 | `Downloads/quality_check_PT-2026-002_20260406.json` | 감점 상세 |
| 3 | Halluc Check 결과 | `Downloads/hallucination_check_20260406_1459.json` | FN 목록 |
| 4 | AI 초안 HTML | `Downloads/draft_20260406_1459_v1.html` | 실제 오류 확인 |

**Claude.ai에 줄 프롬프트**:

```
이 S06 MSE 프롬프트를 리팩토링해줘.

## 목표
- 현재 6.7K tokens → 4.5K 이하로 압축
- 기존 Fix-C/D/3에서 프롬프트 말미에 append된 규칙들을 본문 해당 위치로 이동·병합
- 아래 4개 Fix를 본문에 통합
- 중복 규칙 제거

## Fix-G: MSE-Progress Note 교차 검증 (MANDATORY)
프롬프트 최상단 Anti-Hallucination 바로 아래 "절대 위반 불가 Top 5" 블록으로 배치:
1. Mood/Affect 값 기재 전에 경과 면담 Progress Note O) 란의 관찰값을 먼저 확인
2. MSE Mood/Affect는 가장 최근 경과 면담 O) 값과 일치시킬 것. 불일치 시 O) 값 우선.
3. Thought Content 각 항목은 STT 원문에서 근거 행동/발언을 찾고,
   근거 있으면 (+), 없으면 '평가 불가'로 기재. 근거 없이 (-) 기재 금지.

## Fix-H: Paranoid ideation 코딩 예시
Thought Content 섹션에 삽입:
- Paranoid ideation (+) 예시:
  배우자의 삭제된 결제 내역을 특정 물건 구매와 연결하여 외도를 확신하는 경우
  주변인의 일상적 행동을 적대적 의도로 해석하는 경우
→ 망상 수준이 아니더라도 의심·확신 패턴이 있으면 (+)

## Fix-I: 자살위험성 판정 로직
Impulsivity 섹션의 기존 규칙 대체:
- '하': 자살사고 없고 reckless behavior 없음
- '중': 자살사고 부인해도 reckless behavior 2개+ (무분별한 성관계, 폭음, 충동적 금전/행동 등)
- '상': 자살사고/계획 존재 또는 시도 이력
※ 환자 자기보고만으로 '하' 부여 절대 금지

## Fix-J: Grandiosity vs Grandiose delusion 분리
Thought Content 항목에 추가:
- Grandiosity (+/-): 과대 사고, 비현실적 자기평가 (절주 확신, 취업 확신 등)
- Grandiose delusion (+/-): 망상 수준 (초자연적 능력 등)
두 항목은 별개. Grandiosity 없이 Grandiose delusion만 기재 금지.

## "절대 위반 불가 Top 5" 블록 (Anti-Hallucination 바로 아래 신설)
1. Affect는 Progress Note O) 값 우선
2. Thought Content에 근거 없이 (-) 금지 — '평가 불가' 사용
3. 자살위험성은 reckless behavior 포함 종합 판정
4. Grandiosity와 Grandiose delusion 분리 기재
5. 검사 미시행 항목은 'not tested' 기재

## 참고
- 첨부된 QC에서 B-2 Fabrication 감점 10점이 모두 S06
- Halluc Check FN 5건 중 4건이 S06
- 기존 JSON 스키마, Error Handling, 체크리스트는 보존할 것
```

**✅ P3-1a 검증 포인트**:
- [ ] 프롬프트 길이 ≤ 4.5K tokens
- [ ] Fix-G/H/I/J 4개 내용 모두 포함
- [ ] "절대 위반 불가 Top 5" 블록 존재 (Anti-Hallucination 바로 아래)
- [ ] 기존 Fix-C/D/3 내용이 본문에 병합 (말미 append 잔재 없음)
- [ ] JSON 스키마, Error Handling, 체크리스트 보존

---

#### P3-1b: Claude Code — S06 n8n 적용 + Sonnet 전환

| 항목 | 내용 |
|------|------|
| **담당** | Claude Code |
| **대상 WF** | `Qp0IXqsbounP2X1l` (Sub-WF S06 MSE) |
| **노드명** | "AI 보고서 생성" |
| **작업 1** | `updateNode`로 `parameters.options.systemMessage` 전체 교체 |
| **작업 2** | AI Agent 노드 모델을 Gemini Flash → Claude Sonnet 4로 변경 |

**Sonnet 전환 방법**: AI Agent 노드의 credential을 Anthropic (`RiXuEl0fGr0aAGNz`)으로, 모델을 `claude-sonnet-4-20250514`로 변경.

**✅ P3-1b 검증 포인트**:
- [ ] `n8n_get_workflow`로 systemMessage에 "절대 위반 불가 Top 5" 키워드 존재
- [ ] "Progress Note O)" 키워드 존재
- [ ] "reckless behavior" 키워드 존재
- [ ] "Grandiosity (+/-)" 키워드 존재
- [ ] 모델이 Claude Sonnet으로 변경되었는지 확인
- [ ] 프롬프트 크기가 이전(6.7K)보다 작음

---

### Step P3-2: S04 프롬프트 리팩토링 + Fix-K

> **Fix 포함**: Fix-K (Lab finding 강제)
> **예상 복구**: B-1 +1~2점

#### P3-2a: Claude.ai — S04 프롬프트 리팩토링

| 항목 | 내용 |
|------|------|
| **담당** | Claude.ai (**P3-1a와 같은 세션에서 연속 처리**) |
| **목표** | 4.4K → 3.5K 이하 + Fix-K 통합 |

**첨부 파일 (2개)**:

| # | 파일 | 경로 |
|---|------|------|
| 1 | S04 현재 프롬프트 | `docs/prompts/system_prompt_section_04.md` |
| 2 | QC 결과 | (이미 P3-1a에서 첨부) |

**Claude.ai에 줄 프롬프트**:

```
이어서 S04 Past/Family History 프롬프트도 리팩토링해줘.

## 목표
- 4.4K → 3.5K 이하 압축
- Fix-B에서 append된 규칙들을 본문에 병합
- Fix-K 통합

## Fix-K: Lab Finding 추출 (MANDATORY — 절대 규칙)
Anti-Hallucination 바로 아래 배치:

STT 원문에서 '수치', '높다', '검사', 'lab', '간', '알코올' 등
검사 관련 키워드를 검색하라. 보호자 발언도 포함.
- 구체적 수치가 있으면 그대로 기재
- 구체적 수치 없이 '높다/이상' 등 정성적 보고만 있으면
  '[보호자 보고] 간 수치 상승' 형태로 기재
- 'none'은 모든 면담 기록에서 검사 관련 언급이
  단 하나도 없을 때만 기재 가능
- 'none'으로 기재하기 전에 반드시 모든 informant 발언을 재검색
```

**✅ P3-2a 검증 포인트**:
- [ ] 프롬프트 ≤ 3.5K tokens
- [ ] "MANDATORY" Lab finding 규칙이 최상단에 존재
- [ ] 기존 GS2 예시 (CK, γ-GT, AST, ALT), 알코올 분류 규칙 보존

---

#### P3-2b: Claude Code — S04 n8n 적용

| 항목 | 내용 |
|------|------|
| **대상 WF** | `StjkISptQwFHl5Ws` (Sub-WF S04) |
| **방법** | `updateNode`로 전체 교체 |

**✅ P3-2b 검증 포인트**:
- [ ] systemMessage에 "MANDATORY" + "Lab Finding" 키워드 존재
- [ ] "보호자 보고" 키워드 존재

---

### Step P3-3: S02 프롬프트 리팩토링 + Fix-L

> **Fix 포함**: Fix-L (Chief Problems 상한선)
> **예상 복구**: A02 +2점

#### P3-3a: Claude.ai — S02 프롬프트 리팩토링

| 항목 | 내용 |
|------|------|
| **담당** | Claude.ai (**P3-1a, P3-2a와 같은 세션에서 연속 처리**) |
| **목표** | 5.3K → 4K 이하 + Fix-L 통합 |

**첨부 파일**: `docs/prompts/system_prompt_section_02.md` (이미 세션에 컨텍스트 있으면 생략 가능)

**Claude.ai에 줄 프롬프트**:

```
이어서 S02 Chief Problems 프롬프트도 리팩토링해줘.

## 목표
- 5.3K → 4K 이하 압축
- Fix-A에서 append된 규칙들을 본문에 병합
- Fix-L 통합

## Fix-L: Chief Problems 상한선
출력 규칙에 삽입:

Chief Problems는 3~5개로 제한하라.
- 5개 초과 시 유사 증상을 상위 행동 범주로 통합
- DSM 증상 기준 나열이 아닌, 관찰 가능한 핵심 행동 문제 위주로 선별
- 각 Chief Problem 설명은 1~2줄 이내로 간결하게 작성
- GS 참고: 일반적으로 3~4개가 적정
```

#### P3-3b: Claude Code — S02 n8n 적용

| 대상 WF | `TifgZTXdSNW9Gtlh` (Sub-WF S02) |

---

### Step P3-4: S09 프롬프트 리팩토링 (예방적)

> **Fix 포함**: 직접 Fix 없음. 크기 축소 + 구조 개선
> **목표**: 7.5K → 5K 이하

#### P3-4a: Claude.ai — S09 프롬프트 리팩토링

| 항목 | 내용 |
|------|------|
| **담당** | Claude.ai (**가능하면 P3-1~3과 같은 세션, 불가능하면 별도 세션**) |
| **목표** | 7.5K → 5K 이하 |

**첨부 파일**: `docs/prompts/system_prompt_section_09.md`

**Claude.ai에 줄 프롬프트**:

```
마지막으로 S09 Present Illness 프롬프트를 리팩토링해줘.

## 목표
- 7.5K → 5K 이하 압축
- 중복 규칙 제거
- FCAB 구조 규칙을 더 명확하고 간결하게 재작성
- 기존 기능/예시는 보존하되, 장황한 설명을 압축

## 추가 개선
- FCAB 패턴 필수 적용을 "절대 규칙" 수준으로 격상:
  "모든 사건 서술에 Cognition 요소(~라는 생각에, ~하는 마음에)를 포함.
   Cognition 없는 사건 서술은 불완전한 것으로 간주."
- 현재 QC에서 FCAB 준수율 40~50%로 감점되고 있으므로,
  FCAB 위반 사례와 교정 사례를 각 1개씩 추가
```

#### P3-4b: Claude Code — S09 n8n 적용

| 대상 WF | (S09 Sub-WF ID 확인 필요 — Claude Code에서 `n8n_list_workflows` 조회) |

**✅ P3-4 검증 포인트**:
- [ ] 프롬프트 ≤ 5K tokens
- [ ] FCAB "절대 규칙" 블록 존재
- [ ] 기존 GS1/GS2 예시 보존

---

### Step P3-5: S07/S03/S05 소규모 수정 (1세션 묶음)

> **Fix 포함**: Fix-M (S07), Fix-경어체 (S03), Fix-N (S05)
> **예상 복구**: +2.5점

**담당**: Claude Code (직접 patchNodeField — Claude.ai 불필요)
**이유**: 각 1~2줄 추가이므로 Claude.ai에 프롬프트 리팩토링 요청할 필요 없음

| Fix | 노드 | WF ID | 추가할 규칙 | 삽입 위치 |
|-----|------|-------|-----------|----------|
| Fix-M | S07 Mood Chart | (확인 필요) | `기분 수치는 STT 원문에서 환자가 직접 보고한 자기평가 수치 또는 표준화된 척도(BDI/BAI/MDQ/AUDIT 등) 결과만 기재. AI가 임의로 점수를 부여하는 것은 절대 금지. 수치 없으면 '구체적 기분 수치 보고 없음'으로 기재.` | Anti-Hallucination 하단 |
| Fix-경어체 | S03 Informants | (확인 필요) | `문체는 '~하였다', '~보였다' 서술체로 통일. '~하였습니다', '~되었습니다' 등 경어체 금지.` | 출력 규칙 섹션 |
| Fix-N | S05 Personal History | (확인 필요) | `출생 순서는 S01 Identifying Data의 '~녀 중 ~째' 값과 반드시 일치시킬 것. '첫째 때 젖몸살이 심해서 둘째인 환자는...' 같은 문장에서 '첫째'를 환자로 오인하지 말 것.` | Early Childhood 섹션 |

**✅ P3-5 검증 포인트**:
- [ ] S07: "임의로 점수" 키워드 존재
- [ ] S03: "경어체 금지" 키워드 존재
- [ ] S05: "출생 순서" 키워드 존재

---

### Step P3-6: JS 후처리 검증 노드 추가 (WF2 메인)

> **AI Agent 사용 안 함** — 순수 JavaScript Code 노드
> **비용**: $0

| 항목 | 내용 |
|------|------|
| **담당** | Claude Code |
| **위치** | WF2 메인 (`LiN5bKslyWtZX6yG`), p2-merge 직전 |
| **노드 타입** | Code 노드 (JavaScript) |
| **경고 처리** | (D-41) Telegram 비차단 알림 + HTML 경고 배너 |

**JS 노드 검증 로직**:

```javascript
// 입력: S02, S04, S06, S07 출력 (structured JSON)
const warnings = [];

// 1. Chief Problems 개수 (S02)
const cpCount = s02?.structured?.chief_problems?.length || 0;
if (cpCount > 5) {
  warnings.push(`S02: Chief Problems ${cpCount}개 — 5개 이하 권장`);
}

// 2. Lab finding 'none' 경고 (S04)
const labFinding = s04?.structured?.past_history?.lab_finding;
if (labFinding === 'none' || labFinding === null) {
  warnings.push('S04: Lab finding none — STT에서 검사 관련 언급 재확인 필요');
}

// 3. 기분 수치 근거 확인 (S07)
const moodNarrative = s07?.narrative || '';
if (/\d+점/.test(moodNarrative)) {
  warnings.push('S07: 기분 수치 감지 — STT 원문 근거 확인 필요');
}

// 4. 자살위험성 '하' 경고 (S06)
const suicideRisk = s06?.structured?.impulsivity?.suicide_risk;
if (suicideRisk === '하' || suicideRisk === 'low') {
  warnings.push('S06: 자살위험성 "하" — reckless behavior 포함 재평가 필요');
}

return { warnings, warningCount: warnings.length };
```

**경고 출력 방식**:
1. **Telegram 알림** (비차단): 경고가 1건 이상이면 Telegram으로 경고 목록 전송. WF는 중단 없이 계속 진행.
2. **HTML 경고 배너**: s34-c4에서 HTML 생성 시, warnings 배열이 있으면 보고서 상단에 `⚠️ AI 자동 검증 경고` 배너 삽입.

**✅ P3-6 검증 포인트**:
- [ ] Code 노드 생성 완료
- [ ] 테스트 데이터로 warnings 배열 정상 생성
- [ ] Telegram 알림 노드 연결
- [ ] s34-c4 HTML에 경고 배너 삽입 로직 추가

---

### Step P3-7: MSE ↔ Progress Note 교차 검증 노드 추가 (WF2 메인)

> **AI Agent 노드 (Gemini Flash)** — 짧은 프롬프트
> **비용**: +$0.005/run
> **처리 방식**: (D-40) 자동 교정

| 항목 | 내용 |
|------|------|
| **담당** | Claude Code (프롬프트도 직접 작성 — ~500 tokens로 짧음) |
| **위치** | WF2 메인, p2-merge 직전 (S06 + S08 출력 모두 완료 후) |
| **노드 타입** | AI Agent 노드 (Gemini 2.5 Flash) |
| **모델** | Gemini Flash (비용 최소화) |

**교차 검증 프롬프트** (~500 tokens):

```
당신은 정신과 보고서의 내부 일관성을 검증하는 검증자입니다.

두 섹션의 값을 비교하여 불일치를 탐지하세요.

[S06 MSE 출력]
{s06_structured_json}

[S08 Progress Notes 출력]
{s08_structured_json}

=== 검증 항목 ===
1. S06 Mood 값 ↔ S08 가장 최근 날짜의 O) Mood 값
2. S06 Affect 값 ↔ S08 가장 최근 날짜의 O) Affect 값
3. S06 Thought Content 양성(+) 소견 ↔ S08 S) 환자 발언에 근거 존재 여부

=== 출력 형식 (JSON만) ===
{
  "mismatches": [
    {
      "field": "Affect",
      "s06_value": "appropriate, adequate, broad",
      "s08_value": "constricted, reactive, incongruent",
      "recommended": "s08 값 우선 적용"
    }
  ]
}

불일치 없으면: {"mismatches": []}
```

**자동 교정 로직** (교차 검증 노드 → Code 노드):

```javascript
// 교차 검증 결과에서 불일치가 있으면 S06 structured를 자동 교정
const result = crossValidation.mismatches;
if (result.length > 0) {
  for (const m of result) {
    // S06 structured에서 해당 필드를 S08 값으로 교체
    s06.structured[m.field] = m.s08_value;
    // narrative에서도 해당 값 교체 (문자열 치환)
    s06.narrative = s06.narrative.replace(m.s06_value, m.s08_value);
  }
}
```

**⚠️ 실행 순서 의존성**:
- S06(Phase 1)과 S08(Phase 1)은 **병렬 실행** → 둘 다 완료된 후에만 교차 검증 가능
- 현재 WF2 구조: Phase 1 병렬 → p2-merge → Phase 2 순차
- **교차 검증 노드 위치**: p2-merge 직전 또는 p2-merge 내부
- Claude Code가 WF2 구조를 확인하여 최적 위치 결정

**✅ P3-7 검증 포인트**:
- [ ] AI Agent 노드 생성 + 프롬프트 적용
- [ ] 자동 교정 Code 노드 생성 + 연결
- [ ] 테스트: 의도적으로 S06 Affect를 잘못 설정 → 교차 검증이 탐지하고 교정하는지

---

### Step P3-8: S34-a2 Halluc Check 프롬프트 보강 — Fix-O

> **예상 복구**: C 카테고리 +3~5점

#### P3-8a: S34-a2 현재 프롬프트 추출

| 항목 | 내용 |
|------|------|
| **담당** | Claude Code |
| **작업** | WF2 메인의 S34-a2 노드에서 현재 systemMessage 추출 → 파일로 저장 |

#### P3-8b: Claude.ai — Halluc Check 프롬프트 보강

| 항목 | 내용 |
|------|------|
| **담당** | Claude.ai (별도 세션 또는 P3-1~4와 같은 세션) |

**첨부 파일**:

| # | 파일 |
|---|------|
| 1 | S34-a2 현재 프롬프트 (P3-8a에서 추출) |
| 2 | Halluc Check 결과 JSON |
| 3 | QC 결과 JSON (C 카테고리 FN 목록) |

**Claude.ai에 줄 프롬프트**:

```
Halluc Check 프롬프트에 FN 방지 규칙 5개를 추가해줘.
현재 FN 5건이 발생했고, "존재하는 양성 소견 누락" + "등급 적절성 미평가" 유형.
프롬프트 길이 증가를 최소화 — 규칙당 2줄 이내.

=== 추가할 교차 검증 규칙 ===
1. MSE Mood/Affect 값 ↔ Progress Note O) 값: 불일치 시 flag
2. Thought Content (+/-) 각 항목 ↔ STT 행동 증거:
   증거 있는데 (-)이면 flag (특히 Paranoid ideation, Grandiosity)
3. 자살위험성 등급 ↔ reckless behavior 목록:
   reckless behavior 2개+인데 '하'이면 flag
4. 출생 순서 ↔ S01 형제 정보: 불일치 시 flag
5. MSE 항목 완전성: GS 형식에서 기대되는 항목(Grandiosity 포함) 중
   누락된 것이 있으면 flag
```

#### P3-8c: Claude Code — S34-a2 n8n 적용

**✅ P3-8 검증 포인트**:
- [ ] FN 방지 5개 규칙 키워드 존재
- [ ] 프롬프트 길이 증가 < 500 tokens

---

### Step P3-9: E2E 재실행 + QC

> **전제**: P3-1 ~ P3-8 모두 완료

| Task | 내용 | 담당 |
|------|------|------|
| P3-9a | **적용 검증 (E2E 전)**: 변경된 5개 Sub-WF의 실제 systemMessage 스팟 체크 | Claude Code |
| P3-9b | WF2 E2E 실행 (PT-2026-002) | Claude Code |
| P3-9c | S06 MSE 출력 즉시 확인 — Affect 값이 Progress Note O)와 일치하는지 | Claude Code |
| P3-9d | HTML 전체 출력 + Halluc JSON 확인 | Claude Code |
| P3-9e | GS2 QC 채점 | Claude.ai |
| P3-9f | 점수 기록 + Phase 3 효과 정량화 | Claude Code |

**P3-9a 스팟 체크 항목** (E2E 전 필수):

| Sub-WF | WF ID | 확인 키워드 |
|--------|-------|-----------|
| S06 | `Qp0IXqsbounP2X1l` | "절대 위반 불가 Top 5", 모델=Sonnet |
| S04 | `StjkISptQwFHl5Ws` | "MANDATORY", "보호자 보고" |
| S02 | `TifgZTXdSNW9Gtlh` | "3~5개로 제한" |
| S09 | (확인 필요) | "FCAB", 크기 < 5K |
| S34-a2 | (WF2 내부 노드) | "reckless behavior", "Grandiosity" |

**Claude.ai QC 시 첨부할 파일 (6개)**:

| # | 파일 | 이유 |
|---|------|------|
| 1 | E2E 출력 HTML | AI 초안 |
| 2 | E2E 출력 Halluc JSON | Halluc Check 결과 |
| 3 | GS2 보고서 원본 | Gold Standard |
| 4 | QC 프롬프트 | `docs/system_prompt_quality_check_v2.md` |
| 5 | STT 초진 JSON | 사실 확인용 |
| 6 | STT 경과 JSON | 사실 확인용 |

**✅ P3-9 검증 포인트**:
- [ ] GS2 QC 총점 ≥ 75점 (현재 61 → 목표 80+)
- [ ] B 카테고리 ≥ 15/25 (현재 6)
- [ ] C 카테고리 ≥ 10/15 (현재 6)
- [ ] Halluc Check FN ≤ 2건 (현재 5건)
- [ ] Affect 날조 해소 확인 (B-2 = 0점 감점)

---

### Step P3-10: GS1 Regression 테스트

> **조건**: P3-9 QC 75점+ 달성 시 진행

| Task | 내용 | 담당 |
|------|------|------|
| P3-10a | WF2 E2E 실행 (PT-2026-001 Pin 데이터) | Claude Code |
| P3-10b | GS1 QC 채점 | Claude.ai |
| P3-10c | GS1 점수 ≥ 80 확인 (이전 86.5) | — |

**허용 기준**: GS1 점수 5점 이하 하락 (86.5 → 81.5+)

---

## 세션 배치 계획

### Claude.ai 세션 (2회)

| 세션 | Step | 작업 | 첨부 파일 |
|:----:|------|------|----------|
| **ai-1** | P3-1a + P3-2a + P3-3a + P3-4a | S06/S04/S02/S09 프롬프트 리팩토링 4개 | S06.md, S04.md, S02.md, S09.md, QC JSON, Halluc JSON, draft HTML |
| **ai-2** | P3-8b + P3-9e | Halluc Check 보강 + QC 채점 | S34-a2 프롬프트, E2E 출력물, GS2 원본, STT 2개 |

### Claude Code 세션 (3회)

| 세션 | Step | 작업 |
|:----:|------|------|
| **cc-1** | P3-1b + P3-2b + P3-3b + P3-4b + P3-5 | 4개 Sub-WF 프롬프트 적용 + S07/S03/S05 소규모 수정 |
| **cc-2** | P3-6 + P3-7 + P3-8a + P3-8c | JS 검증 노드 + 교차 검증 노드 + Halluc Check 적용 |
| **cc-3** | P3-9 + P3-10 | E2E + QC 결과 기록 + Regression |

### 실행 순서 (의존성 반영)

```
ai-1 (프롬프트 4개 리팩토링)
  ↓
cc-1 (n8n 적용 4개 + 소규모 3개)
  ↓
cc-2 (JS/교차검증 노드 추가 + S34-a2 프롬프트 추출)
  ↓
ai-2 (Halluc Check 보강 프롬프트)
  ↓
cc-3 (Halluc Check 적용 + E2E + QC)
  ↓
ai-2 계속 (QC 채점)
  ↓
cc-3 계속 (GS1 Regression)
```

---

## 비용 요약

| 항목 | 변경 전 | 변경 후 | 차이 |
|------|:-------:|:------:|:----:|
| S06 모델 | Gemini Flash | Claude Sonnet 4 | +$0.12/run |
| 교차 검증 노드 | 없음 | Gemini Flash | +$0.005/run |
| JS 검증 노드 | 없음 | Code (JS) | $0 |
| **E2E 총 비용** | **$0.062** | **$0.19** | **+$0.13** |
| 월 10건 | $0.62 | $1.90 | +$1.28 |

---

## 사용자 안내 사항

### 반드시 알아야 할 사항 (2가지)

**1. 이번 Phase 3의 핵심은 "규칙 추가"가 아니라 "프롬프트 구조 개선"**

지금까지 QC 감점 → 규칙 append → 프롬프트 팽창 → 준수율 하락의 악순환이었습니다. 이번에는 4개 프롬프트를 **리팩토링하여 크기를 줄이면서** Fix를 통합합니다. 향후에도 Fix 추가 시 append가 아닌 본문 병합을 원칙으로 합니다.

**2. Phase 3 후에도 QC 75점 미달 시 모델 전략 재검토 필요**

S06 Sonnet + 프롬프트 리팩토링으로도 75점 미달이면, 문제의 원인이 "프롬프트"가 아니라 "태스크 자체의 복잡도"일 수 있습니다. 그 경우:
- S04, S02도 Sonnet 전환 검토 (비용 $0.19 → ~$0.55)
- 또는 현재 QC 기준의 난이도가 GS2(Bipolar+AUD)에 대해 과도한지 QC 프롬프트 자체 재검토

### 추천 사항 (2가지)

**1. Claude.ai 프롬프트 리팩토링 시 4개를 1세션에서 순차 처리**

S06 → S04 → S02 → S09 순서로 같은 세션에서 처리하면:
- QC 결과와 감점 패턴의 컨텍스트가 공유되어 일관성 향상
- 세션 4회 → 1회로 축소
- 단, Claude.ai 컨텍스트가 부족하면 S06/S04를 1세션, S02/S09를 1세션으로 분할

**2. E2E 전에 S06 단독 테스트를 먼저**

전체 E2E($0.19)를 돌리기 전에, S06 Sub-WF만 단독 실행하여 MSE 출력이 개선되었는지 확인하면 비용을 아낄 수 있습니다. 감점의 60%가 S06이므로, S06만 확인해도 방향성 판단 가능.

### 개선하면 좋을 사항 (2가지)

**1. 프롬프트 버전 헤더 도입**

리팩토링 완료 후 각 프롬프트 파일 상단에 버전 메타데이터 추가:
```markdown
<!-- v3.2 | P3-1 (2026-04-07) | 4.5K tokens | Fixes: G/H/I/J 통합 -->
```
향후 어떤 Fix가 어디에 적용되었는지 추적 가능.

**2. QC 프롬프트 v2.1 업데이트 (P3-9 이후)**

현재 QC 프롬프트가 GS1(MDD) 기반 튜닝이라, Bipolar 특유 항목(manic features, AUD) 채점 기준이 부족할 수 있습니다. Phase 3 완료 후 QC 프롬프트도 GS2 항목을 반영하여 업데이트 권장.

### 사용자가 놓칠 수 있는 사항 (2가지)

**1. Fix-B(S04)가 이전 E2E에서 실제 적용되었는지 미검증**

세션 43에서 `updateNode`로 교체했는데, E2E 결과에서 Lab finding이 여전히 `none`입니다. P3-9a 스팟 체크에서 반드시 S04 systemMessage를 직접 읽어 "MANDATORY" 키워드 존재를 확인해야 합니다.

**2. 교차 검증 노드의 WF2 구조 의존성**

교차 검증은 S06(Phase 1) + S08(Phase 1) 모두 완료 후 실행 필요. 현재 WF2에서 Phase 1 → p2-merge 구조이므로, 교차 검증 노드는 p2-merge **이전** 또는 **내부**에 배치해야 합니다. 기존 72노드 WF2의 연결 구조 수정이 필요할 수 있습니다.

---

## Fix-Plan 체크리스트 (전체 감점 항목 포함 확인)

| # | 감점 항목 | Fix ID | Step | 포함? |
|---|----------|--------|------|:-----:|
| 1 | MSE Affect 날조 | Fix-G | P3-1 | ✅ |
| 2 | Paranoid ideation 오류 | Fix-H | P3-1 | ✅ |
| 3 | 자살위험성 하향 | Fix-I | P3-1 | ✅ |
| 4 | Lab finding none | Fix-K | P3-2 | ✅ |
| 5 | Mood irritable 오류 | Fix-G | P3-1 | ✅ |
| 6 | Chief Problems 과다 | Fix-L | P3-3 | ✅ |
| 7 | 기분 수치 날조 | Fix-M | P3-5 | ✅ |
| 8 | 경어체 혼재 | Fix-경어체 | P3-5 | ✅ |
| 9 | 첫째 오기재 | Fix-N | P3-5 | ✅ |
| 10 | Grandiosity 누락 | Fix-J | P3-1 | ✅ |
| 11 | Halluc Check FN 5건 | Fix-O | P3-8 | ✅ |
| 12 | S09 FCAB 준수율 부족 | 리팩토링 | P3-4 | ✅ |
| 13 | 프롬프트 팽창 (S06 6.7K) | 리팩토링 | P3-1 | ✅ |
| 14 | 프롬프트 팽창 (S09 7.5K) | 리팩토링 | P3-4 | ✅ |
| 15 | MSE↔ProgressNote 불일치 | 교차 검증 노드 | P3-7 | ✅ |
| 16 | 형식 검증 자동화 | JS 노드 | P3-6 | ✅ |

**전체 16개 항목 모두 Plan에 포함 확인 완료.**
