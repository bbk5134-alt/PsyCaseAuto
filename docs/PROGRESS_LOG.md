---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

---

### 세션 20 — Hallucination 검증 시스템 프롬프트 보완 (2026-04-03)

#### 배경
Claude.ai가 세션 19 E2E 결과물(`hallucination_check_20260403_0215.json`)을 STT 원문과 교차 검증하여 Hallucination 검증 시스템에 3가지 구조적 결함을 발견함. 메타 평가 점수: **68/100 (보통)**.

#### 발견된 결함 요약

| # | 결함 유형 | 원인 | 영향 |
|---|-----------|------|------|
| FP #1 | "선생님 믿어보려고요" 인용구 오탐 | 2차 면담 원문 미탐색 (초진만 확인) | 전공의 혼란 유발 |
| FN #1 | "Suicidal attempt (+)" 변조 미탐지 | 심각도 변조 탐지 규칙 부재 | **임상적 중대성 높음** — NSSI를 자살 시도로 상향 |
| 규칙 미이행 | context_truncated: true 설정했으나 10섹션 전체 검증 | "5섹션 축소" 규칙 실효성 없음 | 규칙 신뢰도 저하 |

#### 작업 내용

| 작업 | 내용 | 상태 |
|------|------|:----:|
| STT 원문 교차 검증 | FP #1 확인 (2차 면담에 인용구 존재), FN #1 확인 (NSSI→SA 변조) | ✅ 완료 |
| 수정 1: 심각도 변조 탐지 기준 추가 | Hallucination 판정 기준 4가지로 확장 + `severity_distortion` 타입 신설 | ✅ 완료 |
| 수정 2: 다중 원문 교차 탐색 절차 명시 | "모든 면담 원문 빠짐없이 교차 탐색 후 판정" + 1건이라도 확인 시 pass | ✅ 완료 |
| 수정 3: context_truncated 규칙 현실화 | "5섹션 축소" → "전 섹션 + 핵심 항목(수치/인용구/귀속) 집중" | ✅ 완료 |
| prompt-engineering 6요소 프레임워크 적용 | Role, Context, Constraints, Output Format, Error Handling, Examples | ✅ 완료 |
| n8n WF2 s34-a2 업데이트 | MCP `n8n_update_partial_workflow`, operationsApplied: 1, saved: true | ✅ 완료 |

#### 변경 사항 요약 (시스템 메시지 diff)

**추가된 판정 기준 #2 (severity_distortion)**:
```
원문에 존재하는 사실의 심각도·등급·빈도가 근거 없이 상향 또는 하향되어 기술됨
(예: 자해 → 자살 시도, 중등도 위험도 → 상, 1회 → 반복적)
```

**추가된 원문 탐색 절차 (신규 섹션)**:
```
- 제공된 모든 면담 원문(초진, 경과, 보호자 면담 등)을 빠짐없이 교차 탐색한 후 판정
- 1건의 원문에서 미발견이더라도, 다른 원문에서 확인되면 Hallucination이 아님
- 각 issue 판정 시 출처 원문 항목을 reason에 명시
```

**수정된 context_truncated 규칙**:
```
[이전] 5개 핵심 섹션으로 축소 + context_truncated: true
[이후] 전 섹션 확인 시도 + 핵심 항목(수치/인용구/귀속) 우선 확인
       + 실제 확인한 섹션만 sections_checked에 기재
```

**issues 타입 확장**: `fabricated_fact | inference_unmarked | informant_error | severity_distortion`

#### 예상 효과
- FN #1 유형(NSSI→SA 심각도 변조) 탐지 가능
- FP #1 유형(다중 원문 미탐색) 방지
- 68점 → 70점대 후반~80점대 진입 예상

#### 다음 세션
- Gemini Flash 전환 후 재 E2E 실행으로 수정된 Hallucination 검증 시스템 성능 확인
- **Tier 3 Step 3-1**: S01~S04 Chat Model → `lmChatGoogleGemini` (gemini-2.5-flash-preview)

---

### 세션 19 — Step 2-6 T4 완료 + Hallucination 검증 버그 수정 + E2E 재실행 (2026-04-03)

#### 작업 내용

| 작업 | 내용 | 상태 |
|------|------|:----:|
| T4: S06 MSE n8n 업데이트 | SA vs self-harm 구분 규칙 + `self_harm_history` 필드 반영 | ✅ 완료 |
| 버그 수정: Hallucination 검증 준비 | `hallucination_check_input` 중괄호 이스케이프 (`{`→`{{`) | ✅ 완료 |
| 버그 수정: Hallucination 검증 AI Agent | System Message JSON 예시 `{`→`{{` 이스케이프 (근본 원인) | ✅ 완료 |
| T5: E2E 재실행 (S08~S12 + 후처리) | 사용자 수동 실행 완료 | ✅ 완료 |

#### T4 상세 — S06 MSE Agent systemMessage 업데이트

- **대상 WF**: Sub-WF S06 (`Qp0IXqsbounP2X1l`), 노드: `S06 MSE Agent`
- **변경 내용**:
  - §4 Impulsivity 섹션에 자해 vs 자살시도 구분 규칙 추가
  - `structured.data.impulsivity.self_harm_history: null` Output Format에 추가
  - QC 테이블 2행 추가 (자해/SA 구분 확인 항목)
- **파일**: `docs/prompts/system_prompt_section_06.md` (16,147자)
- **MCP 결과**: operationsApplied: 1, saved: true
- **D-33**: UI 수동 저장 금지 준수

#### 신규 버그 수정 — Hallucination 검증 준비 중괄호 이스케이프

- **발견 경위**: Execution 476 (2026-04-02, 8분 40초) 오류 분석
- **오류**: `Single '}' in template.` — LangChain f-string 파서가 `JSON.stringify()` 출력의 `{}`를 템플릿 변수로 파싱
- **원인 노드**: WF2 `Hallucination 검증 준비` (Code 노드) → `hallucination_check_input`에 JSON 구조 그대로 전달
- **수정**: `userMessage.replace(/\{/g, '{{').replace(/\}/g, '}}')` 추가 (Step 2-6 P-05)
- **대상 WF**: WF2 (`LiN5bKslyWtZX6yG`), operationsApplied: 1

#### T5 E2E 실행 결과

**실행 범위**: S08~S12 pin 해제 + HTML/Drive/TG/Hallucination 후처리 전체 pin 해제
**획득 결과물**: JSON 초안, HTML 보고서, Hallucination 검증 로그 (Google Drive 저장)
**비용**: ~$0.53 (Claude Sonnet 4, S08~S12 5섹션 호출)

**E2E 중 발견·수정한 추가 버그 2건**

| 버그 | 원인 | 수정 |
|------|------|------|
| Progress Notes HTML에 raw JSON 출력 | Option A 핀 데이터가 구버전 AI 출력 (narrative에 JSON 전체 포함) | S08 unpin 재실행으로 해소 |
| Hallucination `Single '}' in template` 지속 | System Message 내 JSON 예시 블록의 `{}` → LangChain 파서 오류 | System Message `{`→`{{` 이스케이프 후 해소 |

**QC 3차 채점**: Claude 사용량 한도로 다음 세션으로 연기
**다음 세션**: 생성된 HTML·JSON·Halluc 로그 기반 QC 3차 채점 및 결과 분석

---

### 세션 18 — Step 2-6 QC 2차 채점 완료 + A-9 버그 수정 (2026-04-03)

#### QC 2차 채점 결과

| 대분류 | 득점 | 만점 | 비율 |
|--------|:----:|:----:|:----:|
| A. 형식 충실도 | 53 | 60 | 88.3% |
| B. 사실 정확성 | 23 | 25 | 92.0% |
| C. 임상 문서 품질 | 14.5 | 15 | 96.7% |
| **합계** | **90.5** | **100** | **90.5% (A등급)** |

#### 섹션별 득점 (A분류)

| 섹션 | 득점 | 만점 | 주요 감점 이유 |
|------|:----:|:----:|--------------|
| A-1 Identifying Data | 4.5 | 5 | 출생순위 표기 누락 |
| A-2 Chief Problems | 6.5 | 8 | SI Remote/Recent onset 역전, markdown 잔여물 |
| A-3 Informants | 5 | 5 | — |
| A-4 Present Illness | 11 | 12 | 마지막 문장 절대 날짜 1건 |
| A-5 Past/Family Hx | 5 | 5 | — |
| A-6 Personal History | 5 | 5 | — |
| A-7 MSE | 7.5 | 8 | Insight 단계 GS와 다름 (부분점수) |
| A-8 Diagnostic Formulation | 4 | 4 | — |
| A-9 Progress Notes | 0 | 8 | ★ 섹션 완전 누락 (HTML 변환 버그) |
| A-10 Case Formulation | 5 | 5 | — |
| A-11 Psychodynamic | 5 | 5 | — |

#### Tier 판정

90.5점 ≥ 75점 → **✅ Tier 3 진행 가능**
단, A-9 Progress Notes HTML 누락 버그(s34-c4) 수정 후 E2E 재확인 필요

#### Critical Issues

| 심각도 | 위치 | 내용 |
|--------|------|------|
| CRITICAL | A-9 Progress Notes | HTML 변환 노드에서 Progress Notes 섹션 렌더링 블록 누락 |
| HIGH | A-7 MSE Impulsivity | SA(+) 기재 — 자해(self-harm)와 자살시도(suicide attempt) 혼동 |
| HIGH | A-2 Chief Problems | SI Remote/Recent onset 시간 역전 (4개월/6개월) |
| MEDIUM | 다수 섹션 | markdown 잔여물(**...**,  \-) HTML에 리터럴 노출 |

#### 다음 작업 (이번 세션)

- s34-c4 HTML 변환 노드: Progress Notes 렌더링 블록 추가
- s34-c4: markdown 잔여물 후처리 regex 추가
- S06 MSE 프롬프트: SA vs self-harm 구분 규칙 추가 (※ A-7 MSE = S06, S07은 Mood Chart)

---

### 세션 13 — Phase 2 QC, S10 버그 수정, HTML 폴더 버그 수정 (2026-04-02)

#### 작업 내용

| 작업 | 내용 | 상태 |
|------|------|:----:|
| Phase 2 QC (S09~S12) | 섹션별 출력 검토 + QC 채점 | ✅ 완료 |
| S10 maxTokensToSample 버그 수정 | 2048 → 8192 (LM Chat 노드) | ✅ 완료 |
| HTML 보고서 폴더 저장 버그 수정 | s34-c4 Code 노드에 `reports_folder_id` 추가 | ✅ 완료 |
| E2E 전체 확인 | HTML이 PT-2026-001/reports/에 정상 저장 | ✅ 완료 |

#### Phase 2 QC 결과

| 섹션 | 만점 | 득점 | 평가 | 비고 |
|------|:----:|:----:|------|------|
| S09 Present Illness | 12 | 10.5 | 우수 | 상대시점 표현 1곳, FCAB Affect 단락 보강 필요 |
| S10 Diagnostic Formulation | 3 | 3 | 만점 | S10 버그 수정 후 재실행 |
| S11 Case Formulation | 5 | 5 | 만점 | Pin 확정 |
| S12 Psychodynamic Formulation | 6 | 6 | 만점 | Pin 확정 |
| **Phase 2 합계** | **26** | **24.5** | **94%** | |

#### S09 개선 권고 (다음 프롬프트 튜닝 시 반영)

- **절대 날짜 제거**: Present Illness 내 `2026년 3월 20일` → `내원 8일 전` 형태의 상대 시점 표현 사용
- **FCAB Affect 단락 강화**: F→C→A→B 4단락 중 A(Affect) 단락이 1~2문장으로 짧음 → 최소 3문장 이상 기술 지시 추가

#### S10 버그 수정 상세

- **증상**: `narrative`에 raw JSON string, `structured.source_ref: "parse_failed"`, JSON 중간 절단
- **원인**: Sub-WF S10 LM Chat 노드(`4a8b462f-...`) `maxTokensToSample: 2048` → API 응답 절단 → `JSON.parse()` 실패
- **수정**: AI Agent + LM Chat 노드 모두 `maxTokensToSample: 8192` (S02와 동일한 패턴)
- **대상 WF**: `6sRG5BX5uBhcRtj1` (Sub-WF S10)

#### HTML 폴더 버그 수정 상세

- **증상**: HTML 파일이 PT-XXXX/reports/ 폴더가 아닌 내 Drive 루트에 저장됨
- **근본 원인**: `s34-c2` (JSON 초안 저장, Google Drive 업로드 노드) 실행 후 `$json`이 Drive API 응답으로 덮어씌워짐 → `s34-c5`의 `$json.reports_folder_id` = `undefined`
- **시도한 방법 (실패)**: `n8n_update_partial_workflow`로 `parameters.folderId.value` 도트 표기법 업데이트 → `operationsApplied: 1` 반환했으나 실제 적용 안 됨
  - 원인: `folderId`는 `__rl: true` (ResourceLocator) 타입 — 서브 경로 도트 표기법으로 업데이트 불가능
- **최종 수정**: `s34-c4` (HTML 보고서 변환, Code 노드) return 직전에 `reports_folder_id` 명시적 추출 후 json 출력에 포함
  ```javascript
  const reports_folder_id = $('reports 폴더 ID 확정').first().json.reports_folder_id;
  return [{ json: { ...ctx, html_content: h, reports_folder_id }, binary: { ... } }];
  ```
- **결과**: HTML 파일이 PT-2026-001/reports/ 폴더에 정상 저장 확인 ✅

#### Pin 전략 확정

- **확정 원칙**: WF2에서 Pin은 **Execute Workflow 노드(Sub-WF 호출 노드)에만** 적용
- **Pin 금지**: Drive 업로드 노드, Telegram 알림 노드, 외부 API 호출 노드
- **이유**: Drive 업로드/Telegram은 매번 실제 실행해야 정상 동작, Pin하면 해당 단계 건너뜀

#### [추론] 태그 설계 제안

- **초안 HTML**: AI가 추론한 내용에 `[추론]` 태그 → 전공의 수정 편의
- **최종 HTML**: `[추론]` 태그 제거 (CSS gray italic으로 스타일링 → 인쇄 시 미표시)
- **D-21과의 관계**: D-21은 `source_ref` 태그에 관한 결정, `[추론]` 태그는 별도 UX 제안 (미확정, 다음 QC 반영 여부 검토)

#### E2E 결과 (2026-04-02 오후)

- Telegram 봇 정상 동작: Phase 1 완료 → 보고서 저장 완료 알림 수신
- HTML 파일: `PT-2026-001/reports/` 폴더 저장 확인 ✅
- JSON 초안 파일: Drive 저장 확인 ✅
- Hallucination 검증: 정상 실행 확인 ✅
- 완성도: 67~79% (Pin된 섹션 수에 따라 변동)

---

### 세션 17 — Tier 2 Step 2-4 완료: S01 프롬프트 수정 + n8n 업데이트 (2026-04-02)

#### 작업 내용

| 작업 | 내용 | 상태 |
|------|------|:----:|
| Step 2-4: S01 프롬프트 저장 | `docs/prompts/system_prompt_section_01.md` 전체 교체 (310줄) | ✅ 완료 |
| Step 2-4: S01 n8n 업데이트 | Sub-WF `nJLVKGu1Ngh9C3pl` AI Agent `AI 보고서 생성` systemMessage 교체 | ✅ 완료 |

#### S01 주요 변경사항

| 항목 | 내용 |
|------|------|
| 병전 성격 서술형 강화 | §4 규칙 8에 단어·형용사 나열 절대 금지 명시 + ❌/✅ 예시 추가 |
| 간접화법 필수 | "~이었다고 한다", "~라고 한다" 완전 문장 최소 2문장 이상 규칙 신설 |
| Gold Standard 체크포인트 | §5에 병전 성격 판단 기준 (`❌ "내성적, 꼼꼼함"` → `✅ "~이었다고 한다. ~라고 한다."`) 명시 |
| Error Handling §10 | 병전 성격 1문장 미만 시 "[정보 없음]" 처리 규칙 추가 |

#### 검증 결과

| Sub-WF | 체크 항목 | 결과 |
|--------|----------|:----:|
| S01 (`nJLVKGu1Ngh9C3pl`) | `병전 성격` 서술형 규칙 존재 (13곳) | ✅ |
| S01 | `단어·형용사 나열 절대 금지` 존재 | ✅ |
| S01 | `간접화법` 규칙 존재 | ✅ |
| S01 | 첫 줄 `# I. Identifying Data 시스템 프롬프트` | ✅ |

#### 다음 작업

- **Tier 2 Step 2-5**: n8n 일괄 반영 확인 + E2E 테스트 (S01~S09 수정 프롬프트 통합 검증)

---

### 세션 16 — Tier 2 Step 2-3 완료: S02/S09 프롬프트 수정 + n8n 업데이트 (2026-04-02)

#### 작업 내용

| 작업 | 내용 | 상태 |
|------|------|:----:|
| Step 2-3: S02 프롬프트 저장 | `docs/prompts/system_prompt_section_02.md` 전체 교체 | ✅ 완료 |
| Step 2-3: S09 프롬프트 저장 | `docs/prompts/system_prompt_section_09.md` 전체 교체 | ✅ 완료 |
| Step 2-3: S02 n8n 업데이트 | Sub-WF `TifgZTXdSNW9Gtlh` AI Agent systemMessage 교체 | ✅ 완료 |
| Step 2-3: S09 n8n 업데이트 | Sub-WF `4VyEFSX0H0FD2ilK` AI Agent systemMessage 교체 (§7 제외) | ✅ 완료 |

#### S02 주요 변경사항

| 항목 | 내용 |
|------|------|
| 절대날짜 금지 강화 | §2 규칙 4에 구체적 예시 추가 ("2023년 3월", "2026년 3월 20일" 등) |
| Onset 단독 조건 명시 | 발병 1회: `Onset)` 단독 / 발병 2회+: `Remote/Recent` 이분법 선택 테이블 추가 |
| 판단 불가 시 fallback | `Onset)` 단독 + meta.missing_items "Remote/Recent 구분 확인 필요" |
| 입력 절대날짜 처리 | Error Handling §11: 역산 변환 + narrative/structured 어디에도 원본 날짜 출력 금지 |

#### S09 주요 변경사항

| 항목 | 내용 |
|------|------|
| 절대날짜 금지 강화 | §2 규칙 4에 "내원 N일/N개월/N년 전" (N일 단위 추가) + 구체적 예시 |
| FCAB Affect 최소 3문장 | §4 A(Affect) 단락 작성 규칙 신설: 단락 내 정동 서술 최소 3문장, 1~2문장 요약 금지 |
| 체크포인트 업데이트 | §5 형식 준수 체크포인트에 "각 단락 내 정동(A) 관련 문장 최소 3개 이상" 추가 |
| Error Handling §13 신설 | Affect 서술 1~2문장 짧을 때 처리 규칙 (동일 블록 추가 서술 / "[정동 추가 확인 필요]") |

#### 검증 결과

| Sub-WF | 체크 항목 | 결과 |
|--------|----------|:----:|
| S02 (`TifgZTXdSNW9Gtlh`, versionCounter: 19) | `Onset)` 단독 텍스트 존재 | ✅ |
| S02 | `Remote onset)` 이분법 텍스트 존재 | ✅ |
| S02 | 절대날짜 금지 규칙 존재 | ✅ |
| S02 | 첫 줄 `# II. Chief Problems and Durations 시스템 프롬프트` | ✅ |
| S09 (`4VyEFSX0H0FD2ilK`, versionCounter: 14) | `내원 N일` 시간 단위 존재 | ✅ |
| S09 | `최소 3문장` Affect 규칙 존재 | ✅ |
| S09 | 절대날짜 금지 강화 존재 | ✅ |
| S09 | 첫 줄 `# III. Present Illness 시스템 프롬프트` | ✅ |
| S09 | §7 Mock 데이터 systemMessage 미포함 | ✅ |

#### Claude.ai 검토 권고 대응

> Claude.ai에서 제안한 2개 권고 사항에 대한 결정:

**권고 1: S09 "N일" 단위 추가 → S02 불일치 가능성**
- **결정**: 현 시점 S02 수정 보류
- **이유**: S02 onset은 증상 발병 시점(통상 수개월~수년 단위). "내원 5일 전 자살 충동" 같은 케이스는 S09 Suicidal ideation Recent onset(예: "내원 1개월 전")과 별개의 사건으로 S08에서 처리됨. 실제 edge case 발생 시 Step 2-5 E2E에서 확인 후 추가 수정.

**권고 2: FCAB Affect 3문장 — Gold Standard 초과 우려**
- **결정**: 현행 유지 + E2E에서 분량 모니터링
- **이유**: Gold Standard 단락 2("별거 후")는 정동 표현이 압축적이나, QC 감점 원인이 "Affect 단락 1~2문장 짧음"이었으므로 3문장 기준 유지. E2E(Step 2-5)에서 단락 분량이 Gold Standard 대비 1.5배 초과 시 "2~3문장" 완화 검토.

#### 다음 작업

- **Tier 2 Step 2-4**: S01 Identifying Data 프롬프트 수정 (Claude.ai → Claude Code)
- 준비물: Claude.ai에서 수정된 section_01.md 제공

---

### 세션 15 — Tier 2 Step 2-1 + Step 2-2 완료: S06/S08 프롬프트 수정 + n8n 업데이트 (2026-04-02)

#### 작업 내용

| 작업 | 내용 | 상태 |
|------|------|:----:|
| GitHub pull | origin/master 최신 5커밋 동기화 | ✅ 완료 |
| Step 2-1: S06 MSE 프롬프트 저장 | `docs/prompts/system_prompt_section_06.md` (531줄) 저장 | ✅ 완료 |
| Step 2-1: S06 n8n 업데이트 | Sub-WF `Qp0IXqsbounP2X1l` AI Agent systemMessage 교체 | ✅ 완료 |
| Step 2-2: S08 Progress Notes 프롬프트 저장 | `docs/prompts/system_prompt_section_08.md` (416줄) 저장 | ✅ 완료 |
| Step 2-2: S08 n8n 업데이트 | Sub-WF `lbr2QAXPhX80MuZG` AI Agent systemMessage 교체 | ✅ 완료 |

#### Step 2-1: S06 MSE 프롬프트 주요 변경사항

| 항목 | 내용 |
|------|------|
| Mood 표준 어휘 | depressed/euthymic/euphoric + irritable/not irritable + anxious/sl. anxious/not anxious (3요소 조합) |
| Affect 표준 어휘 | appropriate/inappropriate + adequate/inadequate + broad/restricted/flat/blunted/labile (3요소 조합) |
| Insight 7단계 | 1-Complete denial ~ 7-True emotional insight 전체 목록 추가 |
| Impulsivity 형식 | 6줄 고정 형식 (SI/SA/SP/HI +/- + 자살 위험도 상/중/하) |

#### Step 2-1 검증 결과 (S06, `Qp0IXqsbounP2X1l`, versionCounter: 9→10)

| 체크 | 결과 |
|------|:----:|
| "Mood 표준 어휘 목록" 존재 | ✅ |
| "Insight 7단계 전체 목록" 존재 | ✅ |
| "자살 위험도 판정 기준" 존재 | ✅ |
| 첫 줄 `# VI. Mental Status Examination 시스템 프롬프트` | ✅ |

#### Step 2-2: S08 Progress Notes 프롬프트 주요 변경사항

| 항목 | 내용 |
|------|------|
| 입원/외래 분기 | `admission_date` 필드 유무로 판정: 존재 → HD#, 없음/null → OPD# |
| OPD# 산정 기준 | 면담 배열 순서 기준 (첫 면담 = OPD #1) |
| `meta.is_outpatient` 키 추가 | 외래 환자 시 true, Output Format + Error Handling §7 업데이트 |
| P-02 준수 | `notes[].hospital_day` 키 이름 변경 없음 (OPD# 값도 동일 키에 저장) |

#### Step 2-2 검증 결과 (S08, `lbr2QAXPhX80MuZG`, versionCounter: →10)

| 체크 | 결과 |
|------|:----:|
| "OPD #N" 텍스트 존재 | ✅ |
| "is_outpatient" 텍스트 존재 | ✅ |
| "입원/외래 판정" 텍스트 존재 | ✅ |
| 첫 줄 `# VIII. Progress Notes 시스템 프롬프트` | ✅ |

#### 다음 작업

- **Tier 2 Step 2-3**: S02 Chief Problems + S09 Present Illness 프롬프트 수정 (Claude.ai → Claude Code)
- 준비물: Claude.ai에서 수정된 section_02.md + section_09.md 전문 제공

---

### 세션 14 — Tier 1 완료: s34-c4 HTML 변환 노드 수정 + E2E 검증 (2026-04-02)

#### 작업 내용

| 작업 | 내용 | 상태 |
|------|------|:----:|
| Step 1-1: [U] 태그 변환 추가 | `toHtml()`에 `[U]...[/U]` → `<u>` 정규식 변환 | ✅ 완료 |
| Step 1-1: After→Affect 오타 교정 | `nar()`에 `progress_notes` 조건 교정 로직 추가 | ✅ 완료 |
| Step 1-2: Informants h2 소제목화 | 독립 `<h1>` → Section II 아래 `<h2>` 소제목으로 변경 | ✅ 완료 |
| Step 1-2: 섹션 번호 연속성 | Mood Chart → VII, Diagnostic → VIII, VIII→XI 점프 수정 | ✅ 완료 |
| Step 1-2: IX/X placeholder 추가 | 사회사업팀·심리팀 평가 섹션 "해당 팀 작성" 안내 삽입 | ✅ 완료 |
| Step 1-3: E2E 검증 | WF2 실행(Execution 472) → HTML 8항목 전체 통과 | ✅ 완료 |

#### Tier 1 E2E 검증 결과 (Execution 472, 2026-04-02 KST 17:16)

| 항목 | 결과 |
|------|:----:|
| `[U]` 잔존 | ✅ 0건 (코드 로직 확인, 이번 Pin 데이터에 [U] 입력 없음) |
| `After:` 잔존 | ✅ 0건 (`Affect:` 1건으로 정상 교정) |
| 섹션 순서 I~XII 연속 | ✅ VIII→IX→X→XI (점프 없음) |
| Informants h2 | ✅ `<h2>Informants & Reliability</h2>` |
| IX placeholder | ✅ "IX. 사회사업팀 평가" + "본 섹션은 해당 팀에서 작성합니다" |
| X placeholder | ✅ "X. 심리팀 평가" + "본 섹션은 해당 팀에서 작성합니다" |
| XI. Case Formulation | ✅ |
| XII. Psychodynamic Formulation | ✅ |

#### 트러블슈팅 기록 (n8n MCP 업데이트 덮어쓰기 문제)

- **증상**: `n8n_update_partial_workflow` 성공 응답 후 실행 시 구 코드 출력
- **원인**: n8n UI에서 WF2를 열어 다른 작업 후 자동저장/수동저장 시 MCP 업데이트 내용이 구 버전으로 덮어씌워짐
- **확인 방법**: 업데이트 후 즉시 `n8n_get_workflow`로 jsCode 재읽기 → jsCode 길이 + 핵심 패턴 존재 확인
- **대응**: 재업데이트 후 즉시 재검증 → 정상 확인
- **교훈 (D-33 추가 권고)**: MCP로 노드 업데이트 후 **n8n UI에서 WF를 수동 저장하지 말 것** — UI 저장 시 MCP 변경사항 덮어쓰임

#### 다음 작업

- **Tier 2 Step 2-1**: S06 MSE 프롬프트 수정 (Mood/Affect 표준 어휘 + Insight 7단계)
- milestone.md Tier 2 참조

#### 비용 모니터링

- Claude Sonnet 4 API 비용: Anthropic Console에서 확인 필요 (E2E 2회 실행)
- 섹션당 Sub-WF × 12회 + Halluc 검증으로 1회 실행 시 상당한 토큰 소모 예상
- **권고**: 튜닝/테스트 시 Mock 데이터 + 일부 섹션 Pin 사용 → 비용 최소화

---

### 세션 13 (추가) — QC 채점 검증 분석 (2026-04-02)

> QC 결과(55/100 FAIL, D등급)의 타당성을 3개 문서(초안 HTML, QC 결과 JSON, Gold Standard docx) 직접 대조하여 검증함.

#### QC 점수 보정

| 항목 | QC 원본 | 보정 후 | 사유 |
|------|:-------:|:-------:|------|
| A2-3 Onset 형식 | 1/3 | 2/3 | Gold Standard에서도 단일 발병 증상에 `Onset)` 단독 표기 사용 (Identity disturbance 항목) — Remote/Recent 이분법이 필수가 아님 |
| A3-2 Reliable 표기 | 0/2 | 1.5/2 | Gold Standard 자체에서 환자 `-`, 보호자 `–` 혼용 확인됨 — AI 초안의 혼용을 일관성 위반으로 볼 수 없음 |
| A5-2 투약 형식 | 1/2 | 1.5/2 | `escitalopram 0-0-10-0mg` (QD 저녁) 은 **정확한 표기**. QC는 Gold Standard 환자(아침 복용)의 `10-0-0-0mg`을 기준으로 오채점. PT-2026-001은 QD 저녁 처방 |
| B2-3 치료 계획 | 1/2 | 2/2 | A5-2와 동일한 오류. 저녁 복용 → `0-0-10-0mg`은 Fabrication이 아님 |
| B4-2 정보 오염 | 1/2 | 2/2 | B1에서 이미 같은 오류를 감점했으므로 중복 감점. 별도 항목으로 재산정 불가 |
| C2-2 비식별화 | 0/2 | 2/2 | QC 자체 reasoning에서 "2/2 correct"로 명시했으나 점수란에 0점 기재 — 자체 모순 |
| C3-2 IX/X 누락 | 0.5/2 | 1/2 | IX(사회사업팀), X(심리팀)은 다른 의료 직군의 고유 섹션 — AI가 생성하면 안 되는 영역 (부분 인정) |

**보정 총점: 55 → 62.5/100 (C등급, 통과 기준 60점 충족)**

> 원래 QC 프롬프트에 "냉정하게 평가" 지시가 있어 엄격 채점되었음. 실제 임상 활용 가능성은 C등급이 더 정확한 반영.

#### Gold Standard 분석 — 주요 발견사항

| 항목 | Gold Standard 실제 패턴 |
|------|------------------------|
| Informants 섹션 번호 | Roman numeral 없음 — Section II (Present Illness) 아래 소제목으로만 존재 |
| Chief Problems Onset 표기 | 단일 발병 시 `Onset)` 단독 가능 (Remote/Recent 이분법은 여러 발병 시만 필수) |
| Reliable 구분자 | 환자: `-`, 보호자: `–` — **Gold Standard 자체 비일관적** |
| IX, X 섹션 | 사회사업팀(IX), 심리팀(X) — AI 생성 대상 아님. WF2에서 placeholder 처리 |
| escitalopram 표기 | Gold Standard 환자는 아침 복용 → `10-0-0-0mg`. PT-2026-001은 저녁 복용 → `0-0-10-0mg` |
| Mood/Affect 표준 어휘 | `Mood: depressed, not irritable, sl. anxious` / `Affect: appropriate, inadequate, broad` |
| Insight 표기 | "Awareness that illness is due to something unknown in the patient" (7단계 중 4단계) |
| Progress Notes 날짜 | `YYYY. MM. DD. (HD #N)` — 입원 환자용 HD# 형식 |

#### 수정 우선순위 (비용/효과 기준)

| Tier | 작업 | 대상 | 예상 QC 개선 | 비용 |
|:----:|------|------|:----------:|:----:|
| **1** | s34-c4 코드 수정: 섹션 번호, `[U]` 태그, "After:" 오타 처리 | HTML 변환 노드 | +3~5점 | $0 |
| **2** | S06 MSE 프롬프트: Mood/Affect 표준 어휘, Insight 7단계 문장 추가 | 프롬프트 수정 | +2~3점 | $0 |
| **2** | S08 Progress Notes 프롬프트: HD# → 외래 방문 번호 구분 지시 | 프롬프트 수정 | +1~2점 | $0 |
| **2** | S02 Chief Problems 프롬프트: 절대날짜 금지, `Onset)` 단독 사용 조건 추가 | 프롬프트 수정 | +1점 | $0 |
| **3** | QC 프롬프트 v2.0 규칙 수정 (4개 항목) | QC 프롬프트 | 채점 정확도↑ | $0 |
| **4** | Gemini Flash 모델 전환 (S01~S04, S06, S07) | Sub-WF 6개 | ~45% 비용 절감 | 1회 E2E 필요 |

#### 모델 최적화 권고

**목표**: 1회 E2E 비용 $1.10 → $0.60 (45% 절감)

| Sub-WF | 권장 모델 | 근거 |
|--------|----------|------|
| S01 Identifying Data | Gemini 2.5 Flash | 항목 나열 형식, 단순 추출 |
| S02 Chief Problems | Gemini 2.5 Flash | 구조화 형식, 계산 포함 |
| S03 Informants | Gemini 2.5 Flash | 서술형이나 짧은 섹션 |
| S04 Past/Family Hx | Gemini 2.5 Flash | 목록 형식, 계산 |
| S05 Personal History | Claude Sonnet 유지 | 장문 서술, 간접화법 일관성 필요 |
| S06 MSE | Gemini 2.5 Flash | 구조화 형식, 어휘 지정 가능 |
| S07 Mood Chart | Gemini 2.5 Flash | 수치 데이터 추출 |
| S08~S12 | Claude Sonnet 유지 | 임상 추론, 장문 서술 |
| Halluc 검증 | Gemini Flash 유지 (D-30) | 이미 전환 완료 |

> Google API 크레딧 잔액 46만원 기준, Flash 섹션은 사실상 무료. Sonnet 절감분은 콘솔에서 모니터링.

---

> **아카이브**: 세션 8~13 내용은 `docs/PROGRESS_LOG_archive_s08-s13.md` 참조
> **D-번호 canonical**: `docs/PROJECT_PLAN_v3.1.md` §2가 유일한 권위입니다.
> **환경변수 전체 목록**: `.env.example` 참조
