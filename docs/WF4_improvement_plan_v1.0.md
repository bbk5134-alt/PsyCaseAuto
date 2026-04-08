# WF4 개선 계획 v1.0

> **작성일**: 2026-04-09
> **최종 수정**: 2026-04-09 (세션 60 — Gemini Deep Research QC 결과 반영)
> **근거**: 세션 58~59 E2E 테스트 + Claude.ai QC (81점/B) + Gemini Deep Research 논문 검증
> **상태**: 🟢 논문 검증 완료 — 시행 조건 충족, #1-A부터 순차 시행 가능
> **참조**: `docs/PROGRESS_LOG.md` 세션 59~60

---

## Gemini Deep Research 논문 검증 결과 요약 (세션 60)

> **검증 대상**: PT-2026-002 대본 논문 8편 + Group C 공백 3건
> **검증 도구**: Gemini Deep Research (PubMed/PMC/Google Scholar 실검색)

### 종합 점수

| 항목 | 점수 | 비고 |
|------|------|------|
| 존재 정확도 | 4/8 (50%) | 4편 완벽 일치, 4편 저자·학술지 오류 |
| 임상 관련성 평균 | 4.8/5.0 | 주제 선정 능력은 우수 |
| 커버리지 충족도 | 6/6 (100%) | Group C 대체 논문 추천으로 완비 |
| **종합 판정** | **B** | 서지 오류 교정 후 A등급 가능 |

### 서지 오류 교정 목록 (PT-2026-002 대본 즉시 수정)

| 논문 | 오류 | 수정 내용 |
|------|------|-----------|
| **논문 2** | 저자 오류: Perroud → | **Sanches M.** (2019), Diseases, DOI: 10.3390/diseases7030049 |
| **논문 4** | 저자·연도 오류: Vieta 2014 → | **Angst J.** (2013), Int J Bipolar Disord, PMID: 24280140 |
| **논문 5** | 저자·학술지 오류: Skirrow, CNS Drugs → | **Comparelli A, et al.** (2022), Front Psychiatry, PMID: 35951152 |
| **논문 6** | 저자·학술지 오류: Martz, Transl Psychiatry → | **Faedda GL, et al.** (2016), J Child Psychol Psychiatry, PMID: 26801494 |
| **논문 8** | 제목 불일치 | "The **relationship** between BPD and bipolar disorder" (Overlapping → relationship) |

> 논문 1 (Dell'Osso), 3 (Severus), 7 (Quello): ✅ 완벽 일치 — 수정 불필요.

### Group C 대체 논문 확정 (PT-2026-002 대본에만 수동 삽입)

**Q1 (알코올 유발 기분장애 vs BD I 감별)**
- Farren CK & McElroy SL (2008), Int J Psychiatry Clin Pract — PMCID: PMC3730445 ⭐⭐⭐⭐⭐
- Schuckit MA et al. (2020), Front Psychiatry — DOI: 10.3389/fpsyt.2020.522228 ⭐⭐⭐⭐

**Q4 (알코올 금단 증상 vs 조증 감별)**
- Jesse S, et al. (2017), Dtsch Arztebl Int — PMCID: PMC5268336 ⭐⭐⭐⭐ ← **주 인용 권장**
- Musinguzi J, et al. (2024), EAHRJ — DOI: 10.24248/eahrj.v8i1.734 ⭐⭐⭐⭐⭐ (보조 인용)

> Musinguzi 2024는 소형 지역 학술지(EAHRJ). Jesse 2017(독일 공식 의학 저널)을 주 인용으로.

**Q6 (BD I Moderate Severity 기준)**
- APA DSM-5-TR BD Update (2022): https://www.psychiatry.org/getmedia/98fd2c17-93f0-42cd-9f41-755d77b862a5/APA-DSM5TR-BipolarIandBipolarIIDisorders.pdf ⭐⭐⭐⭐⭐

> **Vieta et al. (2018) Lancet Psychiatry 최종 판정**: PMID 30146246 실존 확인됨. 단, 실제 제목은 "Areas of uncertainties and unmet needs in bipolar disorders" — Q6 severity specifier 직접 논의 아님. **미채택**, APA 공식 문서 단독 사용.

### Group C 논문 프롬프트 하드코딩 — 미채택 (결정 B)

> **이유**: PT-2026-002 특화 논문을 Stage 0 프롬프트에 고정 삽입하면,
> 다른 진단(우울증, 조현병 등) 케이스에서 불필요한 토큰·context 소모 발생.
> **대신**: 현재 케이스 대본 HTML에만 수동 추가. WF4 프롬프트는 수정하지 않음.

---

## 시행 조건

> **✅ 완료** — Gemini Deep Research 논문 검증 결과 확인됨 (2026-04-09).
> **#1-A부터 시행 가능.**

---

## 확정 결정 항목

### #1-A. Stage 0 출력 길이 초과 → Section 5 답변 구조 변경

**원인**: Stage 0 Claude 출력이 Section 5 Q3 도중 토큰 한도 도달 → `qa_script` 자체가 잘린 채 HTML 노드에 전달됨. HTML 노드 버그가 아님.

**결정**: **상위 5개 유지 + 답변 구조 단축** (상위 3개 풀 답변 방식 미채택)

**이유**:
- 4~5위 질문(⭐⭐⭐⭐: ADHD 감별, Alcohol Withdrawal 증상 감별)도 컨퍼런스 출제 빈도 있음
- 풀 답변은 발표 중 실제로 "핵심 답변 1~3문장"만 읽힘 → DSM 대조표는 참조용
- 5개를 짧게 유지하는 것이 커버리지·길이 모두 유리

**변경 전 구조** (현재):
```
핵심 답변 (단락) → DSM-5 기준 대조 표 → 병력 근거 (bullet) → 인정 부분 → 추가 계획 → 추천 문헌
```

**변경 후 구조** (목표):
```
핵심 답변 (3~5문장) → 병력 근거 (bullet 3개 이내) → 인정 부분 (1~2문장) → 추천 문헌
```

- DSM-5 기준 대조 표: Section 5에서 제거 → Section 2.5 증상-진단 교차 매핑 표로 통합
- 추가 계획: 삭제 (발표 중 자원 낭비)
- 목표 답변 길이: Q당 150~250자 (현재 400~600자)

**적용 대상**: `docs/prompts/wf4_stage0_v0.2.1.md` Stage 0 프롬프트 Section 5 규칙

---

### #1-B. HTML 대본 가독성 — marked.js 렌더링 개선

**결정**: HTML 대본 생성 노드(n12) jsCode에 marked.js CDN 추가 → 마크다운 표를 실제 HTML `<table>`로 렌더링

**변경 내용**:
- `<head>`에 CDN 추가: `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>`
- `<pre>` raw 텍스트 방식 → `<div id="content"></div>` + `marked.parse(qa_script)` 렌더링
- 기존 CSS에 table 스타일 추가 (border-collapse, thead 배경색 등)

**적용 대상**: WF4 노드 `wf4-n12` HTML 대본 생성 jsCode

---

### #2. 논문 검색 fallback — 추가 안 함

**결정**: Perplexity Tool retry 로직 추가 안 함.

**이유**: retry 추가 시 AI Agent context 급증 → Gemini Flash Lost-in-thought 위험. 논문 미발견 케이스는 Gemini Deep Research QC 단계에서 대체 논문 추천으로 분업 유지.

---

### #3. Section 5 답변 기준 확장 — 미시행

**결정**: Section 5를 5개 이상으로 늘리지 않음. #1-A의 답변 단축으로 대응.

---

### #5. Cyclothymia 특화 로직 → 일반화 규칙으로 대체

**결정**: 케이스 특화 프롬프트 대신 아래 일반화 규칙으로 Stage 0 프롬프트에 추가.

**추가할 규칙** (Section 4/5 생성 시):
```
보고서에서 감별 배제 근거로 활용 가능한 임상 정보
(안정기·기능 보존 기간, 음성 병력, 심리검사 결과, 증상 소실 기간 등)를
자동으로 추출하여 해당 감별 진단 답변의 "인정·배제 근거" 항목에 삽입하라.
해당 정보가 없는 경우 [보고서 미명시 — 추가 병력 청취 필요]로 표기.
```

**적용 대상**: `docs/prompts/wf4_stage0_v0.2.1.md` Step 3 / Step 4 규칙

---

### #6. Perplexity 논문 서지 정확도 강화 — PMID 필수 규칙 (신규, 세션 60)

**배경**: Gemini QC 결과 8편 중 4편이 저자명·학술지 오류 (50%). "제목은 맞고 저자가 틀리는" 전형적 LLM hallucination 패턴.

**결정**: AI Agent 논문 검색 프롬프트에 아래 규칙 추가.

**추가할 규칙**:
```
[논문 서지 정보 필수 규칙]
- 논문 인용 시 반드시 PMID 또는 DOI를 함께 반환할 것
- 제1저자명은 PubMed 원문 기준으로 확인할 것
- PMID 확인 불가 시 "[PMID 미확인 — 서지 정보 검증 필요]" 태그를 논문 옆에 삽입
- 저자명과 학술지를 추정으로 채우지 말 것 (불확실하면 태그 삽입)
```

**적용 대상**: WF4 AI Agent 논문 검색 노드 시스템 프롬프트 (Perplexity Tool 사용 노드)

---

### A-2. Section 2.5 자기검증 — WF4 내부 불가

**결정**: WF4 AI Agent 내 자기검증(셀 단위 fact-check) 추가 안 함.

**이유**: 동일 모델 family의 자기 생성물 과신 + context 과부하 → 신뢰도 낮음.

**대안**: Claude.ai QC 시 Section 2.5의 `[추론]`/`?` 태그 셀만 추출하여 targeted 검증 요청.
→ `docs/system_prompt_wf4_qc_v1.0.md` A항목 체크포인트에 추가 명시 (문서만 업데이트).

---

### B-2. 보고서 수정일 명시

**결정**: Google Drive webhook 트리거 미구현 (복잡도 과다). 보고서 수정일을 HTML 대본 메타에 명시.

**변경 내용** (n12 HTML 대본 생성 노드):
```javascript
// 최신 완성본 선택 노드의 modifiedTime 사용
const modifiedTime = prev.modified_time || '미확인';
// HTML 상단 meta 영역에 삽입
`<strong>입력 보고서 수정일:</strong> ${modifiedTime}`
```

**적용 대상**: WF4 노드 `wf4-n12` HTML 대본 생성 jsCode (Telegram 알림 `wf4-n14`에도 동일 추가)

---

### C-2. 간이 비용 표시 추가

**결정**: 복잡한 토큰 추적 대신 `report_char_count` 기반 예상 비용을 Telegram 최종 알림에 추가.

**추가 로직** (n14 Telegram 알림 노드 또는 n11 diff 생성 노드):
```javascript
const chars = prev.report_char_count || 0;
const includePapers = prev.include_papers || false;
const estimatedCost = includePapers
  ? (chars / 1000 * 0.003 + 1.0).toFixed(2)
  : (chars / 1000 * 0.003 + 0.5).toFixed(2);
// Telegram 메시지에: `예상 비용: ~$${estimatedCost}`
```

**적용 대상**: WF4 노드 `wf4-n11` diff 생성 또는 `wf4-n14` 최종 Telegram 알림

---

### 건의사항. /대본 폴더 분리 저장

**결정**: WF4 HTML 대본을 `PsyCaseAuto/{patient_code}/완성본/` 대신 `PsyCaseAuto/{patient_code}/대본/`에 저장.

**추가 노드 구성**:
```
[현재 최신 완성본 선택] → [대본 폴더 조회] → {If: 폴더 존재?}
    YES → [기존 폴더 ID 사용]
    NO  → [대본 폴더 생성] → [새 폴더 ID 사용]
→ [Google Drive 저장 (대본 폴더 ID로)]
```

- 폴더명: `대본`
- 상위 폴더: `patient_folder_id` (이미 확보됨)
- 파일명 패턴: `대본_{patient_code}_{YYYYMMDD_HHmm}.html` (현재와 동일)

**적용 대상**: WF4 노드 `wf4-n13` Google Drive 저장 앞에 2~3개 노드 추가

---

## 시행 우선순위

| 순위 | 항목 | 난이도 | 예상 소요 |
|:---:|------|:------:|:--------:|
| 1 | **#1-A** Stage 0 프롬프트 답변 구조 단축 | 중 | 30분 |
| 2 | **#1-B** marked.js HTML 렌더링 | 하 | 15분 |
| 3 | **B-2** 보고서 수정일 메타 추가 | 하 | 10분 |
| 4 | **C-2** 간이 비용 표시 | 하 | 10분 |
| 5 | **#5** 일반화 배제 근거 규칙 추가 | 중 | 20분 |
| 6 | **#6** PMID 필수 규칙 추가 (신규) | 하 | 10분 |
| 7 | **건의사항** /대본 폴더 분리 저장 | 중 | 30분 |

> **미시행 항목**: #2 fallback, #3 확장, A-2 자기검증 (WF 내부)
> **케이스 한정 수동 작업**: PT-2026-002 대본 논문 서지 교정 + Group C 논문 삽입 (WF4 재실행 시 자동 반영 예정)

---

## 다음 세션 시작 조건

1. ✅ Gemini Deep Research 논문 검증 완료 (2026-04-09)
2. ✅ 검증 결과 검토 완료 — 의사결정 확정:
   - 서지 오류 4건: #1-A 프롬프트 수정 + WF4 재실행으로 자동 교정
   - Group C 논문: 프롬프트 하드코딩 미채택, 재실행 대본에 반영
   - Vieta 2018: 미채택 (내용 불일치), APA 공식 문서 단독 사용
   - PMID 필수 규칙: #6으로 추가 확정
3. **시행 우선순위 1번(#1-A)부터 순차 시행**
