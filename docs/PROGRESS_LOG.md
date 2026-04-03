---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

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
