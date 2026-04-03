# PsyCaseAuto — Milestone v2 (세션 14~)

> **작성일**: 2026-04-02 | **최종 업데이트**: 2026-04-03
> **기준**: PROJECT_PLAN_v3.1 rev.2
> **이전 Milestone**: M0~M10 (프롬프트 Dual-Layer 재설계 + n8n 전환) — **전체 완료**

---

## 현재 상태 요약

| 항목 | 상태 |
|------|------|
| 12개 Sub-WF 프롬프트 (Dual-Layer) | ✅ 완성 |
| AI Agent 노드 전환 (D-29) | ✅ 완료 |
| Halluc → Gemini Flash (D-30) | ✅ 완료 |
| **Tier 1: s34-c4 HTML 변환 수정** | ✅ 완료 (세션 14) |
| **Tier 2: 프롬프트 미세 조정 (5섹션)** | ✅ 완료 (세션 15~19) |
| **QC 2차: 90.5/100 (A등급)** | ✅ 달성 — Tier 3 진행 가능 |
| E2E 재실행 (S08~S12 + 후처리) | ✅ 완료 (~$0.53) |
| **Tier 2 추가 수정 (P3/P4/P5 + n8n 반영)** | ✅ 완료 (세션 22) |
| **Tier 3: Gemini Flash 전환 + QC** | ✅ 완료 (세션 23~24, 86.5/100 A등급) |
| **다음 작업** | 🔴 **Tier 4: Step 4-0 Safety 배너 수정 (CRITICAL)** |

---

## 미완료 항목 (Tier 3~4 대상)

| # | 항목 | 출처 | 상태 |
|---|------|------|------|
| 1 | Gemini Flash 전환 (S01~S04, S06, S07) | §21 | 미시행 |
| 2 | QC 3차 채점 (E2E 결과물 기반) | — | 🔴 다음 세션 |
| 3 | HTML→Docs 변환 E2E 검증 (위험 8) | §15, §16 | 미검증 |
| 4 | WF1-A 설문지 경로 구현 | §4, §16 | 미착수 |
| 5 | Gemini Pro vs Claude Sonnet QC 비교 | §21 | 미시행 |
| 6 | 실사용 테스트 + §18 전공의 수정 경로 검증 | §16 Phase 5 | 미시행 |
| 7 | [추론] 태그 CSS 스타일링 구현 | 세션 13 | 미확정 |
| 8 | Queue Mode 검토 | §5 P-10 | 미검토 |
| 9 | §18 운용 문서 보완 (Halluc 경고 지침, 모바일 한계) | §19-3 | 미작성 |

---

## 설계 원칙

| 원칙 | 이유 |
|------|------|
| **Tier = 우선순위 + 의존성** | Tier 1 → 2 → 3 → 4 순서로 진행 |
| **Step = Claude Code 1세션 단위** | AI 집중력 유지, 디버깅 가능 시점에서 끊기 |
| **Step 내 Task ≤ 5개** | 컨텍스트 과부하 방지 |
| **각 Step에 ✅ 검증 포인트** | 다음 Step 진행 전 반드시 확인 |
| **Claude.ai → Claude Code 역할 분리** | 프롬프트 다듬기(ai) → 적용(code) |

---

## ~~Tier 1~~ ✅ 완료 (세션 14, 2026-04-02)

s34-c4 HTML 변환 수정: `[U]` 태그 변환, "After:"→"Affect:" 오타, 섹션 번호 맵(sectionMap) 수정. E2E Execution 472 통과.

---

## ~~Tier 2~~ ✅ 완료 (세션 15~19, 2026-04-02~03)

**목표 달성**: QC 90.5/100 (A등급, 목표 75점+ 초과)

| Step | 내용 | 결과 |
|------|------|------|
| 2-1 | S06 MSE: Mood/Affect 어휘 표준화, Insight 7단계, Impulsivity 형식 | ✅ |
| 2-2 | S08 Progress Notes: 입원(HD#) vs 외래(OPD#) 구분 규칙 | ✅ |
| 2-3 | S02: 상대시점 강화, Onset 단독 조건 / S09: Affect 3문장+ | ✅ |
| 2-4 | S01: 병전성격 서술형 (간접화법 산문, 단어 나열 금지) | ✅ |
| 2-5 | n8n 일괄 반영 + E2E | ✅ |
| 2-6 | QC 2차 채점 90.5/100 + A-9 HTML 버그 수정 + SA/자해 구분 규칙 | ✅ |

**추가 버그 수정 (세션 19)**:
- `Hallucination 검증 준비`: `hallucination_check_input` 중괄호 이스케이프
- `Hallucination 검증 AI Agent`: System Message `{`→`{{` 이스케이프 (LangChain 오류 해소)

---

## ~~Tier 3~~ ✅ 완료 (세션 23~24, 2026-04-03)

**결과**: QC 86.5/100 (A등급) — Tier 2 대비 -4.5점 (5점 이내, 롤백 불필요)
**비용**: E2E ~$0.62/run (Tier 2 ~$1.1 대비 ~45% 절감)

| Step | 내용 | 결과 |
|------|------|------|
| 3-1 | S01~S04 → Gemini 2.5 Flash | ✅ |
| 3-2 | S06, S07 → Gemini 2.5 Flash | ✅ |
| 3-3 | E2E + QC 비교 (91→86.5, -4.5pt) | ✅ PASS |

**잔여 이슈 (Tier 4에서 처리)**:
- p2-merge Safety 배너: `meta.alert` 미참조 → HIGH_SUICIDE_RISK 배너 미출력 (CRITICAL)
- S02 첫 증상 번호/영문명 누락, Onset Remote/Recent 미구분 (Gemini 프롬프트 이행률 낮음)
- S08 첫 노트 헤더 누락 (Gemini 프롬프트 이행률 낮음)
- S07 Mood Chart 입원 용어 잔류 (외래/입원 분기 미구현)

---

## Tier 4 — Phase 4~5 잔여 작업 (장기)

> **전제**: Tier 3 완료 ✅ | **순서 유연** | 자세한 설계는 Tier 3 완료 후 Claude.ai에서 develop

### Step 4-0: p2-merge Safety 배너 수정 (CRITICAL, 최우선)

p2-merge Code 노드에서 `s06Meta.alert === 'HIGH_SUICIDE_RISK'` 조건 추가. 다음 E2E 전 반드시 적용.

### Step 4-1: HTML→Docs 변환 검증 (위험 8)

| Task | 내용 |
|------|------|
| T1 | E2E 생성된 HTML을 Google Drive에서 Docs로 변환 (우클릭 → Docs로 열기) |
| T2 | 서식 유지 확인: 표, 들여쓰기, 특수문자(`<u>`, 볼드), 섹션 구분 |
| T3 | 심각한 서식 손실 시 대안: 브라우저 Ctrl+P → PDF |

### Step 4-2: §18 운용 문서 보완

| Task | 내용 |
|------|------|
| T1 | §18에 Halluc 경고 시 행동 지침 추가 |
| T2 | §18에 모바일 수정 한계 명시 |
| T3 | draft_ 수정 실수 방지 (`[수정금지]` 접두어) |

### Step 4-3: Hallucination 검증 시스템 프롬프트 업그레이드

QC 결과(58/100 Fail) 기반. Claude.ai에서 설계 후 n8n 적용.

| 개선 항목 | 우선순위 |
|----------|---------|
| 다중 원문(초진+경과) 순차 탐색 절차 명시화 | HIGH |
| MSE 표준 임상 용어 변환 FP 방어 규칙 | HIGH |
| severity 필드 도입 (critical/major/minor) | HIGH |
| 전체 섹션 커버리지 의무화 (S01~S10) | HIGH |
| "부재에서의 추론" absence_assumption 별도 분류 | MEDIUM |
| placeholder 표기 FP 방어 | MEDIUM |
| Sub-WF 번호 ↔ 보고서 섹션 매핑표 포함 | LOW |

### Step 4-3b: [추론] 태그 CSS (선택)

s34-c4에서 `[추론]...[/추론]` → `<span class="inference">` 변환 + 회색 이탤릭 CSS + 인쇄 시 숨김.

### Step 4-4: WF1-A 설문지 경로 — **보류**

> 보류 사유: 설문지 제출 즉시 WF2 실행 시 토큰 소모 과다. 운용 절차 확립 후 재검토.

체크리스트 HTML → Webhook → GDrive JSON → WF2 병합. 별도 Milestone 문서 권장.

### Step 4-5: Gemini Pro vs Sonnet QC 비교 — **보류**

> 보류 사유: 현재 E2E 비용 ~$0.62로 허용 범위. 추가 절감 필요성 낮음.

### Step 4-6: 실사용 테스트 (Phase 5)

실제 환자 녹음 → WF1-B → WF2 → 전공의 §18 절차 수정 → 피드백 수집.

---

## 전체 진행 순서

```
✅ Tier 1 (s34-c4 HTML 수정)
✅ Tier 2 (프롬프트 5섹션 + QC 90.5/A등급)
✅ Tier 3 (Gemini Flash 전환, QC 86.5/A등급, -4.5pt 이내)
🔴 Tier 4 (Step 4-0 Safety 배너 → 4-1~4-6)  ← 현재 위치
```

---

## Claude.ai 요청 시 항상 첨부할 공통 컨텍스트

| 첨부물 | 내용 |
|--------|------|
| 해당 섹션 프롬프트 `.md` 전문 | 수정 대상 프롬프트 |
| Gold Standard 해당 섹션 발췌 | `.docx`에서 해당 섹션 텍스트 복사 |
| QC 감점 사유 | PROGRESS_LOG의 QC 검증 분석에서 해당 항목 |
| QC 프롬프트 v2.0 (선택) | 채점 기준 참조용 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-02 | v2 신규 작성 — M0~M10 완료 후, QC 검증 분석 기반 Tier 1~4 재구성 |
| 2026-04-03 | 완료 Tier 1·2 압축, 현재 상태 업데이트 (QC 90.5/A, Tier 3 대기), 미완료 항목 갱신 |
| 2026-04-03 | Tier 2 추가 수정: P3(S07 자해 구분) + P4(S02 Onset 역전 방지) + P5(S09 GS오염 금지) — QC 98/100, n8n 3개 Sub-WF 반영 완료 |
| 2026-04-03 | Tier 3 완료: Gemini Flash 6섹션 전환, 5개 Fix, E2E ~$0.62, QC 86.5/100 (A등급, -4.5pt 이내). Tier 4 구조화 + Step 4-0(Safety CRITICAL) 추가, Step 4-4/4-5 보류 |
