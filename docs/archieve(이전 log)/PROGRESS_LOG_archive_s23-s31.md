# PROGRESS_LOG Archive — 세션 23~31

> **기간**: 2026-04-03 ~ 2026-04-05
> **주요 성과**: Tier 3 완료(Gemini Flash 전환), Tier 4 Step 4-0~4-3b 완료, Halluc 프롬프트 v3.1, QC 89/100
> **원본 출처**: PROGRESS_LOG.md에서 아카이브 이관 (세션 32, 2026-04-05)

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

---

### 세션 24 — Tier 3 QC 검증 + Hallucination QC 검증 + Tier 4 구조화 (2026-04-03)

#### QC #1: 보고서 QC (86.5/100, A등급, PASS)

| 항목 | Tier 2 (Sonnet) | Tier 3 (Gemini) | 차이 |
|------|:-:|:-:|:-:|
| A (형식) | — | 51/60 | — |
| B (사실정확) | — | 23/25 | — |
| C (임상품질) | — | 12.5/15 | — |
| **총점** | 91 | 86.5 | **-4.5** (5pt 이내) |

#### QC #2: Hallucination Check QC (58/100, Fail)

| 기준 | 점수 | 주요 감점 |
|------|------|-----------|
| A 정확성 | 7/20 | FP 4건: STT 경과 원문 미확인, MSE 표준 변환 과분류 |
| B 완전성 | 11/20 | 5/10 섹션만 커버 |
| C 유용성 | 12/20 | severity 구분 부재 |
| D 프롬프트 준수 | 14/20 | informant_error/severity_distortion 미사용 |
| E 임상 안전 | 14/20 | Alcohol FN, 날짜 오류 심각성 미분류 |

**구조적 원인**: `context_truncated: true` → s34-a1 6000자 제한 (세션 26에서 수정)

#### Tier 3 판정: PASS — Gemini 롤백 불필요, E2E ~$0.62

---

### 세션 25 — Step 4-0/4-1/4-2 완료 (2026-04-03)

| Step | 내용 | 결과 |
|------|------|------|
| 4-0 | p2-merge Safety 배너: `s06Meta?.alert === 'HIGH_SUICIDE_RISK'` 조건 추가 | ✅ |
| 4-1 | HTML→Docs 변환 검증: 서식 손실 없음 | ✅ |
| 4-2 | §18 운용 문서 보완 (Halluc 경고, 모바일 한계, 체크리스트) | ✅ |

---

### 세션 26 — s34-a1 원문 절단 버그 수정 (2026-04-03)

**버그**: s34-a1에서 원문 6000자 하드코딩 제한 → 전체 26,000자 중 23%만 Gemini에 전달.
**수정**: `truncated = false`, `sourceText = originalText`, `keysToCheck = FACTUAL_SECTION_KEYS` (항상 10개).

---

### 세션 27 — s34-a2 v2 시스템 프롬프트 적용 (2026-04-03)

Halluc QC 77/100 (보정) 기반 v2 적용:
1. MSE 섹션 교차확인 의무
2. severity_distortion 예시 확장
3. FP 방어 5: 치료 세팅 용어 검증

---

### 세션 28~29 — s34-a2 v3 프롬프트 + parse_error 버그 수정 (2026-04-05)

#### 버그 수정

| 수정 | 내용 |
|------|------|
| Tools Agent 전환 | Conversational Agent → Tools Agent (ReAct parser 우회) |
| maxOutputTokens 65536 | Gemini thinking 토큰 예산 소비 문제 해결 |
| fence stripping | regex → string 메서드 교체 |

#### s34-a2 v3/v3.1 프롬프트

- v3: FP 방어 6 (NSSI/SA 구분), FP 방어 7 (섹션 배치 오류)
- v3.1: FP 방어 8 (임상적 미유의 물질 사용)

#### QC: 89/100 (보정), Pass

| 파라미터 | 값 |
|---------|---|
| modelName | `models/gemini-2.5-flash` |
| maxOutputTokens | 65536 |
| temperature | 0.1 |
| agent type | Tools Agent |

---

### 세션 30 — Step 4-3b [추론] 태그 CSS 구현 (2026-04-05)

s34-c4에 `[추론]...[/추론]` → `<span class="inference">` 변환 구현:
- CSS: `.inference { color: #888; font-style: italic; }` + `@media print { display: none; }`
- 적용 위치: toHtml() + Progress Notes 루프 (2곳)
- n8n MCP `updateNode` 적용 (7072 → 7445 chars)

---

### 세션 31 — Step 4-3b 정적 검증 (2026-04-05)

n8n 노드에서 4개 항목 정적 검증 완료 (CSS 2개 + withInference 2개). E2E 불필요.
