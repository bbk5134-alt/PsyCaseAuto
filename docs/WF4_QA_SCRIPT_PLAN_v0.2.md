# WF4 — Case Conference Q&A 대본 자동화 기획안

> **버전**: v0.2 (Claude.ai 검토 + 사용자 피드백 반영)
> **작성일**: 2026-04-06
> **상태**: 🟡 프롬프트 확정 대기 (Tier 5 완료 후 구현)
> **전제 조건**: Tier 5 완료 후 착수
> **Option**: B (Stage 0 + Perplexity 논문 목록, Option A 선회 가능)

---

## 1. 목적

| 항목 | 내용 |
|------|------|
| **What** | 전공의 수정 완성본 → 감별 진단 Q&A 대본 + 논문 추천 목록 자동 생성 |
| **Why** | 발표 전 Q&A 대비 시간 절감, 논문 검색 시간 단축 |
| **Who** | 정신건강의학과 전공의 (R1~R4) |
| **When** | 보고서 완성본(§18 수정 후) 확정 후, 발표 전 |
| **Trigger** | Telegram 수동 명령 (자동 호출 아님) |
| **입력** | 전공의 수정 완성본 (Google Docs) — WF2 초안 아님 |

---

## 2. 이전 작업 복기 + 교훈

### 이전 방식 (Claude.ai 수동, 4단계)

| Stage | 내용 | 효용 | 자동화 대상 |
|-------|------|:----:|:-----------:|
| 0 | CC 시스템 프롬프트 → 감별 Q&A 15문항 | ⭐⭐⭐⭐⭐ | ✅ 핵심 |
| 1 | Perplexity/Gemini → 논문 10편 선정 | ⭐⭐ | ✅ 축소 (핵심 질문별 논문 목록 추천) |
| 2 | 논문 10편 각각 요약 | ⭐⭐ | ✖ 생략 |
| 3 | 5편 선정 + 심층 분석 | ⭐⭐ | ✖ 생략 |
| 4 | Case 적용 + Q&A 통합 (Step A~D) | ⭐⭐⭐ | ⬜ 부분 통합 (Stage 0에 흡수) |

### 핵심 교훈

1. **대본 4.1의 실제 논문 반영도가 낮았음** — Stage 1~3의 논문 검색 결과가 최종 대본에 거의 미반영
2. **Stage 0만으로도 핵심 가치 달성 가능** — DSM-5 기준 + 병력 근거 기반 감별이 실질적 방어 논리
3. **논문은 "목록 추천"만으로도 충분** — 전공의가 목록만 받아도 논문 검색 시간 압도적 단축 (정밀 요약은 불필요)
4. **LLM 논문 hallucination 위험** — 그러나 "추천 목록" 용도이면 사용자가 직접 논문 확인하므로 리스크 수용 가능

---

## 3. 아키텍처 (Option B)

### 전체 흐름

```
[사용자] Telegram: "/대본생성 PT-2026-002"
    ↓
[WF4] Telegram Trigger
    ↓
[s1] Google Drive에서 완성 보고서 읽기
    ↓  입력: 전공의 수정 완성본 (Google Docs)
    ↓  폴더: PsyCaseAuto/{patient_code}/완성본/
    ↓  파일 선택: 해당 폴더 내 가장 최근 수정 파일
    ↓
[s2] AI Agent: Stage 0 — 감별 Q&A 생성 (15~20문항)
    ↓  Chat Model: Claude Sonnet (AI Agent 노드, D-29 준수)
    ↓  입력: 보고서 전문
    ↓  출력: JSON { questions, risk_ranking, defense_cards, cross_map }
    ↓
[s3] Gemini QC 검증 (별도 AI Agent)
    ↓  DSM-5 기준 정확성 + 병력 근거 일치 확인
    ↓  출력: pass/fail + 미달 항목 태깅 + 권고안
    ↓  fail 시: 재생성 권고 또는 보고서 수정 권고를 대본에 삽입
    ↓
[s4] Code 노드: 위험도 ⭐⭐⭐⭐ 이상 질문 추출 (3~5개)
    ↓
[s5] Switch: 논문 보강?
    ├── YES (`논문` 키워드 있음)
    │   ↓ Perplexity API: 핵심 질문별 논문 목록 + 간단 요약
    │   ↓ (정밀 검증 없이 "추천 목록" 용도)
    │   ↓ citation URL 포함
    └── NO → 바로 s6으로
    ↓
[s6] 이전 대본 존재 시 diff 생성 (Code 노드)
    ↓
[s7] HTML 대본 생성 (Code 노드)
    ↓
[s8] Google Drive 업로드 (convert to Docs)
    ↓
[s9] Telegram 알림 (Google Docs 링크 + QC 결과 요약 + diff 요약)
```

### 입력 파일 로직 (W4-08)

| 항목 | 설계 |
|------|------|
| **입력 소스** | 전공의 수정 완성본 (Google Docs) — WF2 AI 초안이 아님 |
| **폴더 구조** | `PsyCaseAuto/{patient_code}/완성본/` |
| **파일 선택** | 해당 폴더 내 `modifiedTime` 가장 최근 파일 1개 |
| **파일 형식** | Google Docs (Google Drive API로 텍스트 추출) |
| **폴더 없을 시** | Telegram 에러 알림: "해당 환자 폴더가 없습니다" |
| **파일 없을 시** | Telegram 에러 알림: "완성본 파일이 없습니다. §18 수정 후 업로드하세요" |

**선택 이유**: WF2 초안에는 오류·누락이 포함될 수 있어, 전공의가 §18 절차로 수정한 완성본이 Q&A 생성의 정확한 입력.

### 노드 구성 (예상)

| # | 노드 | 타입 | 비고 |
|---|------|------|------|
| 1 | Telegram Trigger | telegramTrigger | `/대본생성 {patient_code} [논문]` |
| 2 | 파라미터 파싱 | code | patient_code + 논문 여부 추출 |
| 3 | Google Drive 폴더 조회 | googleDrive | 환자 폴더 → 최근 파일 |
| 4 | Google Docs 텍스트 추출 | googleDrive (export) | Docs → plain text |
| 5 | AI Agent (Stage 0) | agent | 감별 Q&A 생성 |
| 5a | Chat Model (Claude Sonnet) | chatModel | Sub-node |
| 6 | AI Agent (Gemini QC) | agent | DSM-5 정확성 검증 |
| 6a | Chat Model (Gemini Flash) | chatModel | Sub-node |
| 7 | QC 결과 처리 | code | pass/fail 분기 + 미달 태깅 |
| 8 | 핵심 질문 추출 | code | 위험도 필터링 |
| 9 | Switch: 논문 보강? | switch | `논문` 키워드 분기 |
| 10 | Perplexity 논문 검색 | Sub-WF/Tool | 질문별 논문 목록 |
| 11 | 이전 대본 diff | code | 변경 사항 요약 |
| 12 | HTML 대본 생성 | code | 템플릿 |
| 13 | Google Drive 저장 | googleDrive | convert to Docs |
| 14 | Telegram 알림 | telegram | 링크 + QC + diff |

**예상 노드 수**: 18~22개

### 비용 예상

| 경로 | AI 호출 수 | 예상 비용 |
|------|:---------:|:---------:|
| Stage 0만 (Option A) | 1(생성) + 1(QC) = 2회 | ~$0.4~0.7 |
| Stage 0 + 논문 (Option B) | 1 + 1(QC) + 3(Perplexity) = 5회 | ~$1.0~1.5 |

---

## 4. 핵심 의사결정

| # | 결정 | 상태 | 비고 |
|---|------|:----:|------|
| W4-01 | Option B 채택, Option A 선회 가능 | ✅ 확정 | Telegram 파라미터로 분기 |
| W4-02 | Tier 5 완료 후 착수 | ✅ 확정 | |
| W4-03 | 출력: HTML → Google Drive (convert to Docs) | ✅ 확정 | WF2 동일 패턴 |
| W4-04 | Trigger: Telegram 수동 명령 | ✅ 확정 | 단일 명령어 `/대본생성` |
| W4-05 | 프롬프트: 동적 축 도출 방식으로 범용화 | ✅ 확정 | Claude.ai 시뮬레이션 Conditional Pass |
| W4-06 | AI Agent 노드 사용 (D-29 준수) | ✅ 확정 | |
| W4-07 | Perplexity: 논문 목록 추천 + 간단 요약 (정밀 검증 불필요) | ✅ 확정 | 사용자가 논문 직접 확인 전제 |
| W4-08 | 입력: 전공의 수정 완성본 (Google Docs, 최근 파일) | ✅ 확정 | WF2 초안 아님 |
| W4-09 | QC: Gemini Flash 별도 검증 (pass/fail + 미달 태깅) | ✅ 확정 | self-evaluation bias 방지 |
| W4-10 | 재실행 시 이전 대본과 diff 표시 | ✅ 확정 | 단일 명령어 유지 |
| W4-11 | 명령어 1개로 통합 (`/대본생성 PT-XXXX [논문]`) | ✅ 확정 | 사용자 혼란 방지 |

---

## 5. 프롬프트 설계 — Stage 0 (범용화)

### Claude.ai 시뮬레이션 결과 (v0.2 반영)

| 항목 | GS1 (MDD) | GS2 (Bipolar+AUD) |
|------|-----------|-------------------|
| 감별 축 도출 | ✅ 5축 (우울 스펙트럼, 양극성 배제, 물질, 성격장애, 증상 귀속) | ✅ 5축 (대본 4.1과 동일) |
| 핵심 취약점 | ✅ BPD 누락, AUD 누락, Lithium 근거 부족 | ✅ 시간적 중첩, 순수 단주 삽화 부재, 성격 vs 삽화 |
| 대본 4.1 대비 | 70~90% (세부 발췌량에서 차이) | 70~90% |
| Contamination | ✅ Bipolar 특화 잔재 없음 | ✅ |

### 프롬프트 필수 수정 사항 (Claude.ai 권고 반영)

| # | 수정 내용 | 반영 여부 |
|---|-----------|:---------:|
| 1 | Output에 **방어 멘트 카드** 추가 (🎤 CC에서 입으로 말하는 톤) | ✅ 반영 |
| 2 | Output에 **증상-진단 교차 매핑 표** 추가 | ✅ 반영 |
| 3 | Output에 **불확실 영역 타임라인 표** 추가 (즉시/2주/4주/관해후/외래) | ✅ 반영 |
| 4 | R/O 누락 시 fallback 규칙 추가 | ✅ 반영 (아래 참조) |
| 5 | Quality Gate → Gemini QC 분리 (self-evaluation bias 방지) | ✅ 반영 |

### R/O 누락 케이스 fallback 규칙 (신규)

> 보고서에 R/O 진단이 명시되지 않은 경우:
> Chief Problems + MSE + PI에서 증상-진단 교차 추론으로 **최소 3개 이상**의 잠재적 감별 진단을 도출하라.
> "이 보고서에서 R/O 진단이 명시되지 않았으므로, 증상 프로파일 기반으로 아래 감별 진단을 추론하였습니다" 문구 삽입.

### 범용 프롬프트 전문

> **위치**: `docs/prompts/system_prompt_wf4_stage0.md` (Tier 5 완료 후 생성)
> **현재 상태**: Claude.ai에서 초안 작성 완료 (`WF4_REVIEW_RESULT.md` Task 1 참조)
> **남은 작업**: 방어 멘트 카드 + 교차 매핑 표 + 타임라인 추가 반영 → 여자친구 임상 검토

---

## 6. Gemini QC 검증 설계 (신규 — v0.2)

### 목적

Stage 0 AI Agent(Claude Sonnet)의 출력을 **별도 모델(Gemini Flash)**로 교차 검증.
WF2의 Hallucination Check (s34-a2/a3)와 동일한 설계 철학.

### 검증 항목

| # | 검증 항목 | pass 기준 | fail 시 처리 |
|---|-----------|-----------|-------------|
| 1 | DSM-5-TR 기준 정확성 | 명백한 오류 없음 (기간, 개수 등) | `[DSM-5 검증 실패: {내용}]` 태깅 |
| 2 | 병력 근거 일치 | 보고서에 없는 내용 인용 없음 | `[근거 미확인: {내용}]` 태깅 |
| 3 | 감별 축 누락 | 확정 진단 관련 주요 감별 최소 3축 | `[축 누락 경고: {진단}]` 태깅 |
| 4 | 전체 판정 | 3개 항목 모두 pass | — |

### fail 시 사용자 대응 옵션 (Telegram 알림에 포함)

```
⚠️ QC 검증 결과: FAIL
- [DSM-5 검증 실패]: "Hypomanic episode 기간을 3일로 기재 → 4일이 정확"
- [근거 미확인]: Q3에서 "보호자가 X라고 보고"했다고 했으나 보고서에 해당 내용 없음

권고안:
1. 대본의 해당 항목을 수동으로 수정하세요
2. 보고서에 누락된 정보가 있다면 보고서를 먼저 보완 후 `/대본생성` 재실행
```

---

## 7. 논문 보강 설계 (v0.2 수정)

### 목적 변경 (v0.1 → v0.2)

| v0.1 | v0.2 |
|------|------|
| 논문 검색 → Q&A에 근거 삽입 | **논문 목록 추천 + 간단 요약** (1~2문장) |
| AI가 논문 내용을 Q&A에 통합 | 사용자가 목록을 받아 **직접 논문 확인** |
| 정확도 검증 필요 | 추천 목록 용도이므로 **정확도 검증 불필요** |

### 근거

- 여자친구는 논문 목록만 받아도 검색 시간을 압도적으로 단축 가능
- 정확도 검증은 여자친구 시간 부족으로 비현실적
- Perplexity citation URL이 포함되므로, 클릭해서 직접 확인 가능
- 부정확한 논문이 포함되더라도 "추천 목록"이므로 피해 제한적

### 출력 형식

```
📖 Q1 관련 추천 논문 (위험도 ⭐⭐⭐⭐⭐)
질문: "Substance-Induced BD vs Independent BD 감별"

1. Strakowski et al. (2005) "Bipolar disorder and alcoholism" — Lancet Psychiatry
   → 요약: AUD 동반 BD의 종적 경과와 감별 접근 [citation URL]
2. Schuckit (2006) "Comorbidity between substance use disorders and psychiatric conditions"
   → 요약: 물질 유도 기분장애의 진단 알고리즘 [citation URL]
3. ...

⚠️ 위 논문은 AI 추천 목록입니다. 반드시 원문을 직접 확인하세요.
```

---

## 8. Diff 기능 설계 (신규 — v0.2)

### 목적

보고서 수정 후 `/대본생성` 재실행 시, 이전 대본과의 변경 사항을 요약.

### 구현 방식

| 항목 | 설계 |
|------|------|
| 이전 대본 저장 위치 | `PsyCaseAuto/{patient_code}/대본/` 폴더 내 파일 |
| diff 생성 | Code 노드: 이전 대본 텍스트와 새 대본의 질문 목록 비교 |
| diff 수준 | 질문 단위 (추가/삭제/변경된 질문 목록) — 전문 diff 아님 |
| diff 표시 위치 | 대본 HTML 하단 + Telegram 알림 요약 |
| 이전 대본 없을 시 | "신규 생성" 표기, diff 생략 |

### Telegram 알림 예시

```
✅ Q&A 대본 생성 완료 (PT-2026-002)
📄 Google Docs: [링크]
🔍 QC: PASS
📊 변경 사항 (이전 대본 대비):
  + Q3 추가: "BPD와의 감별" (보고서에 r/o BPD 추가됨)
  ~ Q1 수정: 위험도 ⭐⭐⭐⭐⭐ → ⭐⭐⭐⭐ (근거 보강됨)
  - Q12 삭제: "Cyclothymia 감별" (더 이상 해당 없음)
📖 논문 추천: 미요청 (/대본생성 PT-2026-002 논문 으로 추가 가능)
```

---

## 9. Telegram 명령 설계 (v0.2 — 단일 명령어)

| 명령 | 기능 | 논문 보강 |
|------|------|:---------:|
| `/대본생성 PT-2026-002` | Stage 0 + QC + diff | ✖ |
| `/대본생성 PT-2026-002 논문` | Stage 0 + QC + diff + 논문 목록 | ✅ |

**단일 명령어 원칙 (W4-11)**: 사용자 혼란 방지. "갱신"이나 "재생성" 같은 별도 명령 없이, 항상 최신 보고서를 읽어서 전체 재생성 + diff 자동 표시.

---

## 10. 출력 형식 (v0.2 — 보강)

### HTML 대본 템플릿

```html
<h1>Case Conference Q&A 대본</h1>
<p>환자: {patient_code} | 생성일: {date} | 진단: {primary_dx}</p>
<p>입력: {보고서 파일명} (수정일: {modified_date})</p>

<h2>1. 진단 지형도</h2>
<!-- 확정/R/O/누락 가능 진단 표 + 공격 예상도 -->

<h2>2. 증상-진단 교차 매핑 표</h2>
<!-- Chief Problems × 감별 진단 교차 표 (대본 4.1 패턴) -->

<h2>3. 핵심 취약점 (3~5가지)</h2>
<!-- 보고서의 방어 최약점 -->

<h2>4. 예상 질문 (위험도 순)</h2>
<!-- 15~20문항 Q&A -->

<h2>5. 방어 멘트 카드 (즉답용) 🎤</h2>
<!-- 위험도 ⭐⭐⭐⭐+ 질문에 대해 -->
<!-- "선생님 지적에 동의합니다. 다만..." 톤으로 -->

<h2>6. 불확실 영역 + 추가 계획 (타임라인)</h2>
<!-- 즉시 / 2주 / 4주 / 관해 후 / 외래 시점별 -->

<h2>7. 논문 추천 목록</h2>
<!-- (논문 보강 시에만) 핵심 질문별 추천 논문 -->

<h2>8. QC 검증 결과</h2>
<!-- Gemini QC: pass/fail + 미달 항목 -->

<h2>9. 변경 사항 (이전 대본 대비)</h2>
<!-- diff 요약: 추가/삭제/변경 질문 -->

<div class="meta">
  <p>AI 모델: {model} | QC 모델: Gemini Flash | 비용: ~${cost}</p>
  <p class="warning">⚠️ 이 대본은 AI 초안입니다.
     DSM-5 기준은 원문을 반드시 확인하세요.
     논문 인용은 원문 확인 후 사용하세요.</p>
</div>
```

---

## 11. 개발 계획 (Tier 5 완료 후)

### 사전 준비 (Claude.ai + 사용자)

| # | 작업 | 담당 | 상태 |
|---|------|------|:----:|
| P-1 | Stage 0 범용 프롬프트 초안 | Claude.ai | ✅ 완료 |
| P-2 | GS1 시뮬레이션 (MDD) | Claude.ai | ✅ 완료 |
| P-3 | GS2 시뮬레이션 (Bipolar+AUD) | Claude.ai | ✅ 완료 |
| P-4 | 프롬프트 보강 (멘트 카드, 교차 매핑, 타임라인, fallback) | Claude.ai | ⬜ 대기 |
| P-5 | 여자친구 임상 검토 | 사용자 | ⬜ 대기 |
| P-6 | 프롬프트 확정 | Claude.ai + 사용자 | ⬜ 대기 |

### 구현 (Claude Code)

| Step | 작업 | 예상 |
|------|------|------|
| W4-1 | WF4 기본 구조 (Telegram → Google Docs 읽기 → AI Agent → Drive → 알림) | 1세션 |
| W4-2 | Stage 0 프롬프트 적용 + Gemini QC 검증 노드 추가 | 1세션 |
| W4-3 | Perplexity 논문 목록 + Switch 분기 | 1세션 |
| W4-4 | Diff 기능 + E2E 테스트 (GS1 + GS2) | 1세션 |
| W4-5 | HTML 템플릿 미세조정 + Telegram 알림 최종 | 0.5세션 |

**총 예상: 4.5~5.5세션**

---

## 12. 리스크 + 대응 (v0.2)

| 리스크 | 심각도 | 대응 |
|--------|:------:|------|
| DSM-5-TR 기준 Hallucination | 🔴 높음 | Gemini QC 검증 (W4-09) + 대본에 "원문 확인" 경고 |
| 범용 프롬프트 진단 커버리지 한계 | 🟡 중간 | GS1/GS2로 검증 완료, Schizophrenia 등은 실사용 피드백으로 보완 |
| Perplexity 논문 부정확 | 🟢 낮음 (v0.2) | "추천 목록" 용도로 정밀 검증 불필요, citation URL 직접 확인 전제 |
| 보고서 완성본 형식 차이 | 🟢 낮음 | Google Docs 텍스트 추출이므로 형식 무관 |
| 전공의 수정 완성본 미업로드 | 🟡 중간 | 파일 없을 시 Telegram 에러 알림 + §18 안내 |
| 보고서 수정 후 대본 미갱신 | 🟢 낮음 | 항상 최신 파일 읽기 + diff 자동 표시 |

---

## 13. 성공 기준

| 기준 | 목표 |
|------|------|
| Q&A 문항 수 | 15~20개 (위험도 분류 포함) |
| 감별 축 커버리지 | 확정 진단 관련 축 모두 커버 |
| Gemini QC pass rate | ≥80% (첫 생성 시) |
| 병력 근거 정확도 | 보고서에 있는 내용만 인용 |
| 논문 목록 시 citation URL 포함 비율 | ≥80% |
| 생성 시간 | Stage 0+QC: <3분, +논문: <6분 |
| 사용자 만족도 | "대본 4.1 수준" (70~90%) + 논문 목록의 검색 시간 절감 체감 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-06 | v0.1 초안 작성 (Claude Code) |
| 2026-04-06 | v0.2 — Claude.ai 검토 + 사용자 5가지 피드백 반영: 입력 소스 확정(전공의 수정본), Perplexity 목적 축소(논문 목록 추천), r/o fallback 규칙, Gemini QC 검증, diff 기능, 단일 명령어 |
