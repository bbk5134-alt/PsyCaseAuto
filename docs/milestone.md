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
| **다음 작업** | 🔴 **Tier 3: Gemini Flash 모델 전환** |

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

## Tier 3 — Gemini Flash 모델 전환 (비용 ~45% 절감)

> **목표**: E2E 비용 ~$0.53 → ~$0.30
> **전제**: Tier 2 QC 기준선 확보 ✅
> **대상**: S01~S04, S06, S07 → Gemini 2.5 Flash

### Step 3-1: S01~S04 Chat Model 전환

| Task | 내용 |
|------|------|
| T1 | Google Gemini credential ID 확인 (Halluc 검증용으로 이미 설정됨) |
| T2 | Sub-WF S01 Chat Model: `lmChatAnthropic` → `lmChatGoogleGemini` + `gemini-2.5-flash-preview` |
| T3 | Sub-WF S02 동일 전환 |
| T4 | Sub-WF S03 동일 전환 |
| T5 | Sub-WF S04 동일 전환 |

**✅ 검증**: 4개 Sub-WF에서 Gemini Flash 모델 설정 확인

---

### Step 3-2: S06 + S07 Chat Model 전환

| Task | 내용 |
|------|------|
| T1 | Sub-WF S06 Chat Model → Gemini 2.5 Flash |
| T2 | Sub-WF S07 Chat Model → Gemini 2.5 Flash |

**✅ 검증**: 2개 Sub-WF 모델 설정 확인

---

### Step 3-3: E2E + QC 비교

| Task | 내용 |
|------|------|
| T1 | WF2 전체 E2E 실행 (Flash 6섹션 + Sonnet 6섹션) |
| T2 | HTML 출력 확인: Flash 섹션 품질 육안 검토 |
| T3 | Claude.ai에서 QC 채점 (Tier 2 QC와 동일 조건) |
| T4 | Tier 2 QC 점수 vs Tier 3 QC 점수 비교 |
| T5 | 5점+ 하락 섹션 있으면 해당 섹션만 Sonnet 복귀 |

**✅ 검증**: Flash 전환 후 QC 점수 5점 이내 하락 허용. 초과 시 해당 섹션 Sonnet 복귀.
**비용**: E2E ~$0.30 + QC(Claude.ai 무료)

---

## Tier 4 — Phase 4~5 잔여 작업 (장기)

> **전제**: Tier 3 완료 후 | **순서 유연**

### Step 4-1: HTML→Docs 변환 검증 (위험 8)

| Task | 내용 |
|------|------|
| T1 | E2E 생성된 HTML을 Google Drive에서 Docs로 변환 (우클릭 → Docs로 열기) |
| T2 | 서식 유지 확인: 표, 들여쓰기, 특수문자(`<u>`, 볼드), 섹션 구분 |
| T3 | 심각한 서식 손실 시 대안: 브라우저 Ctrl+P → PDF |

**✅ 검증**: Docs 변환 후 12섹션 모두 읽기 가능 + 주요 서식 유지

### Step 4-2: §18 운용 문서 보완

| Task | 내용 |
|------|------|
| T1 | §18에 Halluc 경고 시 행동 지침 추가 |
| T2 | §18에 모바일 수정 한계 명시 |
| T3 | draft_ 수정 실수 방지 (`[수정금지]` 접두어) |

### Step 4-3: [추론] 태그 CSS (선택)

s34-c4에서 `[추론]...[/추론]` → `<span class="inference">` 변환 + 회색 이탤릭 CSS + 인쇄 시 숨김.

### Step 4-4: WF1-A 설문지 경로 (Phase 5, 대규모)

체크리스트 HTML → Webhook → GDrive JSON → WF2 병합. 별도 Milestone 문서 권장.

### Step 4-5: Gemini Pro vs Sonnet QC 비교 (선택)

S01~S12 전체 Gemini Pro 전환 → 동일 Mock E2E → QC 비교 → 높은 점수 모델 확정.

### Step 4-6: 실사용 테스트 (Phase 5)

실제 환자 녹음 → WF1-B → WF2 → 전공의 §18 절차 수정 → 피드백 수집.

---

## 전체 진행 순서

```
✅ Tier 1 (s34-c4 HTML 수정)
✅ Tier 2 (프롬프트 5섹션 + QC 90.5/A등급)
🔴 Tier 3 (Gemini Flash 전환, Step 3-1 → 3-2 → 3-3)  ← 현재 위치
   ↓
   Tier 4 (장기, Step 4-1~4-6)
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
