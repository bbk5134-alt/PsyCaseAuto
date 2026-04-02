# PsyCaseAuto — Milestone v2 (세션 14~)

> **작성일**: 2026-04-02
> **기준**: PROJECT_PLAN_v3.1 rev.2 vs PROGRESS_LOG (세션 13까지)
> **목적**: Claude.ai에서 프롬프트를 다듬은 후, Claude Code에서 누락 없이 정확하게 수행
> **이전 Milestone**: M0~M10 (프롬프트 Dual-Layer 재설계 + n8n 전환) — **전체 완료**

---

## 현재 상태 요약

| 항목 | 상태 |
|------|------|
| 12개 Sub-WF 프롬프트 (Dual-Layer) | ✅ 완성 |
| AI Agent 노드 전환 (D-29) | ✅ 완료 (S01~S12 + Halluc) |
| Halluc → Gemini Flash (D-30) | ✅ 완료 |
| E2E 테스트 (Phase 1+2) | ✅ 통과 |
| QC 1차: 55/100 → 보정 62.5/100 (C등급) | ✅ 분석 완료 |
| Phase 2 QC: 24.5/26 (94%) | ✅ 완료 |
| QC 프롬프트 v2.0 규칙 수정 (C6~C9) | ✅ 완료 |

---

## 미완료 항목 전체 목록 (PROJECT_PLAN vs PROGRESS_LOG 대조)

| # | 항목 | 출처 | 현재 상태 |
|---|------|------|----------|
| 1 | s34-c4: `[U]...[/U]` 태그가 텍스트로 노출 | QC 검증 | 미수정 |
| 2 | s34-c4: 섹션 번호 Informants 소제목, IX/X placeholder, VIII→XI jump | QC 검증 | 미수정 |
| 3 | s34-c4: "After:" → "Affect:" 오타 처리 | QC 검증 | 미수정 |
| 4 | S06 MSE: Mood/Affect 표준 어휘 + Insight 7단계 | QC 검증 Tier 2 | 미수정 |
| 5 | S08 Progress Notes: HD# → 외래 방문 구분 | QC 검증 Tier 2 | 미수정 |
| 6 | S02 Chief Problems: 절대날짜 금지, Onset 단독 조건 | QC 검증 Tier 2 | 미수정 |
| 7 | S09 Present Illness: 상대시점 + FCAB Affect 3문장+ | Phase 2 QC 권고 | 미수정 |
| 8 | S01 Identifying Data: 병전성격 서술형 강화 | QC 검증 Tier 2 | 미수정 |
| 9 | Gemini Flash 전환 (S01~S04, S06, S07) | QC 검증 Tier 4 / §21 | 미시행 |
| 10 | HTML→Docs 변환 E2E 검증 (위험 8) | §15, §16 Phase 4 | 미검증 |
| 11 | QC 전체 재채점 (프롬프트 수정 후) | §16 Phase 4 | 미시행 |
| 12 | WF1-A 설문지 경로 구현 | §4, §16 Phase 5, §19-1 | 미착수 |
| 13 | Gemini Pro vs Claude Sonnet QC 비교 | §16 Phase 4, §21 | 미시행 |
| 14 | 실사용 테스트 + §18 전공의 수정 경로 검증 | §16 Phase 5 | 미시행 |
| 15 | [추론] 태그 CSS 스타일링 구현 | 세션 13 설계 제안 | 미확정/미구현 |
| 16 | Queue Mode 검토 | §16 Phase 5, §5 P-10 | 미검토 |
| 17 | draft_ 수정 실수 방지 (viewer 권한 or 접두어) | §18 P-07 | 미구현 |
| 18 | Halluc 경고 시 행동 지침 §18 추가 | §19-3 운용 유의 | 미작성 |
| 19 | 모바일 수정 한계 §18 명시 | §19-3 운용 유의 | 미작성 |

---

## 설계 원칙

| 원칙 | 이유 |
|------|------|
| **Tier = 우선순위 + 의존성** | Tier 1 → 2 → 3 → 4 순서로 진행. 이전 Tier 완료 후 다음 |
| **Step = Claude Code 1세션 단위** | AI 집중력 유지, 디버깅 가능 시점에서 끊기 |
| **Step 내 Task ≤ 5개** | 컨텍스트 과부하 방지 |
| **각 Step에 ✅ 검증 포인트** | 다음 Step 진행 전 반드시 확인 |
| **Claude.ai → Claude Code 역할 분리** | 프롬프트 다듬기(ai) → 적용(code) |

---

## ~~Tier 1 — s34-c4 HTML 변환 노드 수정 ($0, 코드만)~~ ✅ 완료 (세션 14, 2026-04-02)

> **결과**: HTML 렌더링 3항목 모두 수정 확인. E2E Execution 472 통과.

### ~~Step 1-1~~: [U] 태그 변환 + "After:" 오타 교정 ✅

### ~~Step 1-2~~: 섹션 번호 맵(sectionMap) 수정 ✅
- Informants → h2 소제목, IX/X placeholder 추가, VIII→XI 점프 수정

### ~~Step 1-3~~: E2E 검증 (Tier 1 통합) ✅
- Execution 472 — 8항목 전체 통과

---

## Tier 2 — 프롬프트 미세 조정 (QC 점수 직접 향상)

> **목표**: QC 형식 점수 +5~10점 → 목표 75점+ 도달
> **비용**: 프롬프트 수정 $0 + E2E 1회 ~$1.10
> **방식**: Claude.ai에서 프롬프트 다듬기 → Claude Code에서 파일 저장 + n8n 업데이트

### Step 2-1: S06 MSE 프롬프트 수정 (최고 임팩트)

**실행 환경**: Claude.ai → Claude Code

**Claude.ai 요청 내용**:
```
S06 MSE 프롬프트(system_prompt_section_06.md) 수정 요청.

현재 문제:
1. Mood/Affect 어휘가 Gold Standard와 완전히 다름
2. Insight 표기가 Gold Standard 7단계 문장 형식이 아님

Gold Standard 패턴:
- Mood: depressed, not irritable, sl. anxious
- Affect: appropriate, inadequate, broad
- Insight: "Awareness that illness is due to something unknown in the patient" (7단계 중 해당 수준)

수정 요구사항:
1. §6 형식 규칙에 Mood/Affect 표준 어휘 목록 추가 (depressed/euthymic/euphoric, irritable/not irritable, anxious/sl. anxious/not anxious + appropriate/inappropriate, adequate/inadequate, broad/restricted/flat/blunted/labile)
2. Insight 7단계 문장 목록 추가 (1-Complete denial ~ 7-True emotional insight)
3. Impulsivity "자살의 위험성: 상/중/하" 형식 + SI/SA/SP/HI (+/-) 명시

첨부: 현재 system_prompt_section_06.md 전문
```

**Claude Code 작업**:

| Task | 내용 |
|------|------|
| T1 | Claude.ai에서 받은 수정 프롬프트를 `docs/prompts/system_prompt_section_06.md`에 저장 |
| T2 | n8n Sub-WF S06의 AI Agent systemMessage 업데이트 |

**✅ 검증**: 프롬프트 파일에 Mood/Affect 어휘 목록, Insight 7단계, Impulsivity 형식 존재 확인

---

### Step 2-2: S08 Progress Notes 프롬프트 수정

**실행 환경**: Claude.ai → Claude Code

**Claude.ai 요청 내용**:
```
S08 Progress Notes 프롬프트(system_prompt_section_08.md) 수정 요청.

현재 문제:
- HD# (Hospital Day) 형식이 외래 환자에게도 적용됨
- Gold Standard는 입원 환자이므로 HD# 사용이 맞으나, 외래 환자는 방문 번호 또는 날짜만 사용

수정 요구사항:
1. 입원 vs 외래 구분 규칙 추가:
   - 입원 환자 (admission_date 존재): "YYYY. MM. DD. (HD #N)" 형식
   - 외래 환자 (admission_date 없음): "YYYY. MM. DD. (OPD #N)" 또는 날짜만
2. 구분 기준: STT 데이터에 admission_date 필드 유무

첨부: 현재 system_prompt_section_08.md 전문
```

**Claude Code 작업**:

| Task | 내용 |
|------|------|
| T1 | 수정된 프롬프트를 `docs/prompts/system_prompt_section_08.md`에 저장 |
| T2 | n8n Sub-WF S08의 AI Agent systemMessage 업데이트 |

**✅ 검증**: 프롬프트에 입원/외래 구분 규칙 존재 확인

---

### Step 2-3: S02 Chief Problems + S09 Present Illness 프롬프트 수정

**실행 환경**: Claude.ai → Claude Code

**Claude.ai 요청 내용**:
```
S02 Chief Problems + S09 Present Illness 프롬프트 수정 요청 (2개).

S02 현재 문제:
1. Remote/Recent onset에서 절대 날짜 혼입
2. 단일 발병 증상에 Remote/Recent 강제 분리

S02 수정:
1. onset 표기에 절대 날짜(2026년 3월) 금지 → "내원 N개월 전" 상대시점만
2. 발병 1회: "Onset) 내원 N개월 전" 단독 허용 (Gold Standard Identity disturbance 패턴)
3. 발병 2회+: "Remote onset) / Recent onset)" 이분법 유지

S09 현재 문제 (Phase 2 QC 10.5/12):
1. Present Illness 내 절대 날짜 1곳 잔존 ("2026년 3월 20일")
2. FCAB Affect 단락이 1~2문장으로 짧음

S09 수정:
1. §4 시간축 규칙에 "절대 날짜 사용 금지. 반드시 '내원 N일/N개월 전' 형식" 강화
2. §3 FCAB 규칙에 "A(Affect) 단락 최소 3문장" 명시

첨부: 현재 section_02.md + section_09.md 전문
```

**Claude Code 작업**:

| Task | 내용 |
|------|------|
| T1 | 수정된 S02 프롬프트를 `docs/prompts/system_prompt_section_02.md`에 저장 |
| T2 | 수정된 S09 프롬프트를 `docs/prompts/system_prompt_section_09.md`에 저장 |
| T3 | n8n Sub-WF S02, S09 systemMessage 업데이트 |

**✅ 검증**: 두 프롬프트에 상대시점 규칙, Onset 단독 조건, Affect 3문장 규칙 확인

---

### Step 2-4: S01 Identifying Data 프롬프트 수정

**실행 환경**: Claude.ai → Claude Code

**Claude.ai 요청 내용**:
```
S01 Identifying Data 프롬프트(system_prompt_section_01.md) 수정 요청.

현재 문제:
- 병전 성격이 단어 나열이 아닌 서술형 산문이어야 함 (Gold Standard 패턴)

수정:
1. "병전 성격" 항목 출력 형식: "~였다고 한다" 간접화법 서술형 (최소 2문장)
2. 단어 나열 (예: "내성적, 꼼꼼함") 금지 → 문장 서술 필수

첨부: 현재 section_01.md 전문 + Gold Standard S01 발췌
```

**Claude Code 작업**:

| Task | 내용 |
|------|------|
| T1 | 수정된 프롬프트를 `docs/prompts/system_prompt_section_01.md`에 저장 |
| T2 | n8n Sub-WF S01 systemMessage 업데이트 |

**✅ 검증**: 병전성격 서술형 규칙 확인

---

### Step 2-5: n8n 일괄 반영 + E2E 테스트

**실행 환경**: Claude Code 단독

| Task | 내용 |
|------|------|
| T1 | Step 2-1~2-4에서 수정한 프롬프트가 n8n Sub-WF에 모두 반영되었는지 확인 |
| T2 | WF2 전체 E2E 실행 (Pin 없이 — 모든 Sub-WF 실행) |
| T3 | HTML 출력 다운로드/확인 |
| T4 | 주요 확인: MSE Mood/Affect 어휘, Insight 문장, HD# 외래 구분, 상대시점, Affect 단락 길이, 병전성격 서술형 |

**✅ 검증**: HTML에서 수정사항 5개 중 최소 4개 반영 확인. E2E 비용 ~$1.10

---

### Step 2-6: QC 2차 채점

**실행 환경**: Claude.ai (수동)

**Claude.ai 요청 내용**:
```
QC 2차 채점 요청.

첨부물:
1. Gold Standard docx
2. 새 AI 생성 HTML 보고서 (Step 2-5 결과물)
3. Hallucination 검증 결과 JSON
4. QC 프롬프트 (system_prompt_quality_check_v2.md — C6~C9 규칙 포함)

목표: 75점+ (A등급)
```

**Claude Code 작업**:

| Task | 내용 |
|------|------|
| T1 | QC 결과를 `docs/PROGRESS_LOG.md`에 기록 |
| T2 | 75점 미달 시: 최하위 섹션 식별 → Tier 2 반복 여부 판단 |

**✅ 검증**: QC 점수 기록 완료. 75점+ 달성 시 Tier 3 진행. 미달 시 해당 섹션 프롬프트 재수정 후 Step 2-5~2-6 반복.

---

## Tier 3 — Gemini Flash 모델 전환 (비용 ~45% 절감)

> **목표**: E2E 비용 $1.10 → ~$0.60
> **전제**: Tier 2 QC 기준선 확보 후 (변수 분리 원칙)
> **대상**: S01~S04, S06, S07 → Gemini 2.5 Flash

### Step 3-1: S01~S04 Chat Model 전환

**실행 환경**: Claude Code 단독

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

**실행 환경**: Claude Code 단독

| Task | 내용 |
|------|------|
| T1 | Sub-WF S06 Chat Model → Gemini 2.5 Flash |
| T2 | Sub-WF S07 Chat Model → Gemini 2.5 Flash |

**✅ 검증**: 2개 Sub-WF 모델 설정 확인

---

### Step 3-3: E2E + QC 비교

**실행 환경**: Claude Code (E2E) + Claude.ai (QC)

| Task | 내용 |
|------|------|
| T1 | WF2 전체 E2E 실행 (Flash 6섹션 + Sonnet 6섹션) |
| T2 | HTML 출력 확인: Flash 섹션 품질 육안 검토 |
| T3 | Claude.ai에서 QC 채점 (Tier 2 QC와 동일 조건) |
| T4 | Tier 2 QC 점수 vs Tier 3 QC 점수 비교 |
| T5 | 5점+ 하락 섹션 있으면 해당 섹션만 Sonnet 복귀 |

**✅ 검증**: Flash 전환 후 QC 점수 5점 이내 하락 허용. 초과 시 해당 섹션 Sonnet 복귀.
**비용**: E2E ~$0.60 + QC(Claude.ai 무료)

---

## Tier 4 — Phase 4~5 잔여 작업 (장기)

> **목표**: 실사용 준비 완성
> **전제**: Tier 2 QC 75점+ 달성 후

### Step 4-1: HTML→Docs 변환 검증 (위험 8)

**실행 환경**: Claude Code + 수동 확인

| Task | 내용 |
|------|------|
| T1 | E2E 생성된 HTML을 Google Drive에서 Docs로 변환 (우클릭 → Docs로 열기) |
| T2 | 서식 유지 확인: 표, 들여쓰기, 특수문자(`<u>`, 볼드), 섹션 구분 |
| T3 | 심각한 서식 손실 시 대안 경로 테스트: 브라우저 Ctrl+P → PDF |
| T4 | 결과를 PROGRESS_LOG에 기록 |

**✅ 검증**: Docs 변환 후 12섹션 모두 읽기 가능 + 주요 서식 유지

---

### Step 4-2: §18 운용 문서 보완

**실행 환경**: Claude Code 단독 (문서 수정)

| Task | 내용 |
|------|------|
| T1 | §18에 Halluc 경고 시 행동 지침 추가: "① 해당 문장 삭제 ② [확인 필요] 표시 후 발표" |
| T2 | §18에 모바일 수정 한계 명시: "모바일: Halluc 확인 + 진단명 검토만. 상세 수정은 PC" |
| T3 | draft_ 수정 실수 방지: WF2 s34-c5 업로드 시 파일명에 `[수정금지]` 접두어 추가 |

**✅ 검증**: PROJECT_PLAN_v3.1.md §18 업데이트 확인

---

### Step 4-3: [추론] 태그 시스템 구현 (선택)

**실행 환경**: Claude Code 단독

| Task | 내용 |
|------|------|
| T1 | s34-c4 HTML 변환에서 `[추론]...[/추론]` → `<span class="inference">...</span>` 변환 |
| T2 | HTML `<style>` 블록에 `.inference { color: gray; font-style: italic; }` 추가 |
| T3 | `@media print { .inference { display: none; } }` — 인쇄 시 미표시 |

**✅ 검증**: HTML에서 추론 부분 회색 이탤릭, 인쇄 시 숨겨짐

---

### Step 4-4: WF1-A 설문지 경로 구현 (Phase 5)

**실행 환경**: Claude.ai (설계) → Claude Code (구현)

> **⚠️ 대규모 작업** — 별도 Milestone 문서로 세분화 권장

| Task | 내용 |
|------|------|
| T1 | 면담 체크리스트 HTML v2 → Webhook 전송 로직 설계 |
| T2 | WF1-A: Webhook → 데이터 정규화 → GDrive JSON 저장 |
| T3 | WF2: 구조화 데이터 + STT 데이터 병합 로직 추가 |
| T4 | E2E 테스트 (체크리스트 + 녹음 동시 입력) |

**✅ 검증**: 체크리스트 입력 → GDrive 저장 → WF2에서 읽기 성공

---

### Step 4-5: Gemini Pro vs Claude Sonnet QC 비교 (선택)

**실행 환경**: Claude Code (E2E) + Claude.ai (QC)

| Task | 내용 |
|------|------|
| T1 | Sub-WF 전체(S01~S12) Chat Model → Gemini 3.1 Pro |
| T2 | 동일 Mock 데이터로 E2E 실행 |
| T3 | Claude.ai에서 QC 채점 |
| T4 | Claude Sonnet QC vs Gemini Pro QC 비교 → 높은 점수 모델 확정 |

**✅ 검증**: 모델 확정 + 근거 기록

---

### Step 4-6: 실사용 테스트 + 전공의 피드백 (Phase 5)

**실행 환경**: 수동 (전공의 참여)

| Task | 내용 |
|------|------|
| T1 | 실제 환자 면담 녹음 → WF1-B STT → WF2 보고서 생성 |
| T2 | 전공의가 §18 절차대로 Docs 수정 → final_ 저장 |
| T3 | 전공의 피드백 수집 (수정 소요 시간, 가장 수정 많이 한 섹션, UX 이슈) |
| T4 | 피드백 기반 프롬프트 추가 조정 |

**✅ 검증**: 전공의가 "소폭 수정만으로 발표 가능" 확인

---

## 전체 진행 순서

```
Tier 1 (Step 1-1 → 1-2 → 1-3)     ← $0, Claude Code만
  ↓
Tier 2 (Step 2-1~2-4: Claude.ai → Claude Code)
  ↓
Tier 2 (Step 2-5: E2E)             ← ~$1.10
  ↓
Tier 2 (Step 2-6: QC 2차)          ← 75점+ 확인
  ↓ (75점+ 달성 시)
Tier 3 (Step 3-1 → 3-2 → 3-3)     ← ~$0.60 (E2E)
  ↓
Tier 4 (Step 4-1~4-6)              ← 장기, 순서 유연
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
