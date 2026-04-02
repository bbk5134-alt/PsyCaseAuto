---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

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

### 세션 11 — M8 작업 3~6, 버그 수정 (2026-04-02)

#### 작업 내용

M8 완료 작업: 작업 3(E2E 1차), 작업 4(S09~S12 AI Agent 검증), 작업 5(HTML 노드 검증), 작업 6(E2E 2차 + 버그 수정).

| 작업 | 내용 | 상태 |
|------|------|:----:|
| 작업 3 | E2E 1차 테스트 (Phase 1) | 🔴 수동 실행 필요 (Telegram Trigger) |
| 작업 4 | S09~S12 AI Agent 전환 + D-26 null 방어 검증 | ✅ 완료 |
| 작업 5 | HTML 변환 노드(`s34-c4`) 검증 | ✅ 이미 완료 상태 확인 |
| 작업 6 | E2E 2차 테스트 → 버그 발견 및 수정 | ✅ 버그 수정 완료 |

#### 작업 4 상세: S09~S12 AI Agent 전환 검증

| Sub-WF | ID | 결과 |
|--------|-----|------|
| S09 Present Illness | `4VyEFSX0H0FD2ilK` | ✅ 이미 AI Agent (typeVersion 3.1) |
| S10 Diagnostic Formulation | `6sRG5BX5uBhcRtj1` | ✅ 이미 AI Agent (typeVersion 3.1) |
| S11 Case Formulation | `xnJZXam1BZB7Iypu` | ✅ AI Agent 교체 완료 (세션 10 연속) |
| S12 Psychodynamic Formulation | `Hq4QhEKT48aPShWb` | ✅ 이미 AI Agent (typeVersion 3.1) |

- WF2 D-26 null 방어 코드: Phase 2 relay 노드 4개 모두 `?.` optional chaining + `[SYSTEM NOTE: XXX 미생성]` fallback 확인 ✅

#### 작업 5 상세: HTML 변환 노드 (`s34-c4`) 검증

작업 문서의 `ctx.final_report?.sections` 참조는 구 설계 잔재. 현재 구현 이미 올바름:
- `ctx.final_report?.all_sections` — Phase 2 병합 출력 키와 일치 ✅
- `sec.narrative || sec.content` — Dual-Layer 읽기 ✅
- `mental_status_exam` 키 — S06 출력 → Phase 1 병합 → Phase 2 병합 → HTML 전 구간 일치 ✅
- HTML escape + `\n→<br>` 변환, `draft` 경고 배너, `HIGH_SUICIDE_RISK` 배너 모두 정상 ✅

#### 작업 6 상세: 버그 수정 — "Single '}' in template"

**증상**: WF2 E2E 실행 시 S05, S06, Hallucination 검증 AI Agent 3곳에서 `Error in 15~63ms` 발생

**근본 원인**:
- n8n Agent `typeVersion 1.x` 노드는 `options.systemMessage`를 템플릿 문자열로 파싱
- Dual-Layer 시스템 프롬프트의 Output Format 섹션에 JSON `}` 문자 존재
- n8n 파서가 `}` 를 `{{ }}` expression 닫는 기호로 오인 → "Single '}' in template" 에러
- `typeVersion 3.1` 노드는 `systemMessage`를 순수 문자열로 처리 (S01~S04, S07~S08, S09~S12 정상)

**수정 내용**:

| 노드 | 워크플로우 | 변경 |
|------|-----------|------|
| S05 Personal History Agent | `SmR2paPpXEYTuWZO` | `typeVersion: 1` → `3.1` + `promptType: "define"` 추가 |
| S06 MSE Agent | `Qp0IXqsbounP2X1l` | `typeVersion: 1` → `3.1` + `promptType: "define"` 추가 |
| Hallucination 검증 AI Agent (`s34-a2`) | WF2 `LiN5bKslyWtZX6yG` | `typeVersion: 1.7` → `3.1` |

**재발 방지**: AI Agent 노드 신규 생성/수정 시 반드시 `typeVersion: 3.1` + `promptType: "define"` 사용.

#### 세션 11 상태: 버그 수정 완료 — E2E 재실행 대기

---

### 세션 10 — M8 n8n 노드 업데이트 (2026-04-02)

#### 작업 내용

Milestone 8: n8n WF2 메인 + Sub-WF S01~S08 AI Agent 전환 및 Dual-Layer 파싱 코드 적용.

| 작업 | 대상 | 상태 | 내용 |
|------|------|:----:|------|
| 작업 1 | `s34-a2` Hallucination 검증 노드 | ✅ 완료 | HTTP Request(Haiku) → AI Agent + Gemini Flash 전환 |
| Pre-작업 2 | `s34-a1`, `s34-a3`, `s34-c6` | ✅ 완료 | 3개 노드 코드 수정 (아래 상세) |
| 작업 2 | Sub-WF S01~S08 | ✅ 완료 | AI Agent 전환 + Dual-Layer 파싱 코드 전체 적용 |

#### 작업 1 상세: Hallucination 검증 노드 전환 (WF2 `s34-a2`)

- **변경 전**: HTTP Request → `anthropic/v1/messages` (claude-haiku-4-5)
- **변경 후**: AI Agent (`conversationalAgent`) + Gemini Flash (`gemini-2.5-flash-preview`) 서브노드
- 새 노드 추가: `s34-a2-gemini` (`lmChatGoogleGemini`, `ai_languageModel` 연결)
- System Message: Hallucination 검증 전용 프롬프트 (새 Gemini JSON 출력 포맷 포함)
- User Message: `={{ $input.first().json.hallucination_check_input }}`

#### Pre-작업 2 수정: 3개 WF2 노드 코드 교체

**`s34-a1` (Hallucination 검증 준비)**
- `system_prompt` 키 제거 (AI Agent 방식에서 불필요)
- `FACTUAL_SECTION_KEYS` 10개로 확장 (기존 일부 누락 키 보완)
- 컨텍스트 절단 방어: 원문 6000자 초과 시 5개 핵심 섹션만 검증 (`context_truncated` 플래그)

**`s34-a3` (검증 결과 통합)**
- Gemini 신규 JSON 구조 파싱 (`hallucination_check.passed`, `.issues`, `.sections_checked`)
- 구 Haiku 포맷(`hallucination_detected`) 제거
- parse_error 폴백 처리 강화

**`s34-c6` (완성 메시지 구성)**
- 참조 키 교체: `hallucination_detected` → `check.passed` / `check.issues`
- `context_truncated` 플래그 반영 (Telegram 알림에 "⚡ 원문 절단" 표시)
- `sections_checked` 목록 알림에 포함

#### 작업 2 상세: Sub-WF S01~S08 AI Agent 전환

**S01~S04** (이미 AI Agent 구조, 파라미터 업데이트)

| Sub-WF | 섹션 | 적용 내용 |
|--------|------|----------|
| S01 | Identifying Data | systemMessage (전용 프롬프트), promptType: define, text 표현식, 모델 설정, Dual-Layer parse |
| S02 | Chief Problems | 동일 패턴 |
| S03 | Informants | 동일 패턴 |
| S04 | Past/Family Hx | 동일 패턴 |

**S05~S06** (HTTP Request → AI Agent 구조 교체, 8 ops)

- `입력 준비` 노드 제거 (Code 노드)
- `Claude API 호출` 노드 제거 (HTTP Request 노드)
- AI Agent 노드 신규 추가 (`@n8n/n8n-nodes-langchain.agent`)
- Claude Sonnet 모델 서브노드 신규 추가 (`lmChatAnthropic`)
- 커넥션 재구성: Trigger → Agent → Parse, Model →(ai_languageModel)→ Agent
- `출력 파싱 및 검증` Dual-Layer parse code 업데이트

| Sub-WF | 섹션 | SECTION_KEY |
|--------|------|-------------|
| S05 | Personal History | `personal_history` |
| S06 | MSE | `mental_status_exam` |

**S07~S08** (이미 AI Agent 구조, 파라미터 업데이트)

| Sub-WF | 섹션 | 노드명 | SECTION_KEY |
|--------|------|--------|-------------|
| S07 | Mood Chart | `AI 보고서 생성`, `Claude Sonnet 4`, `출력 파싱` | `mood_chart` |
| S08 | Progress Notes | 동일 구조 | `progress_notes` |

#### Dual-Layer Parse Code 공통 패턴 (전 섹션)

```javascript
const raw = $input.first().json.output || $input.first().json.text || '';
let parsed;
try {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  parsed = JSON.parse(cleaned);
} catch (e) {
  parsed = {
    [SECTION_KEY]: {
      narrative: raw,
      structured: { source_ref: 'parse_failed', type: 'raw' },
      meta: { status: 'partial', confidence: 'low', requires_review: true,
              missing_items: ['JSON 파싱 실패 — 원문 그대로 저장됨'] }
    }
  };
}
return [{ json: parsed }];
```

#### Anthropic Chat Model 설정 가이드 (세션 10 결정)

| 설정 | 권장값 | 비고 |
|------|--------|------|
| Model | Claude Sonnet 4.6 (전 섹션 통일) | Hallucination 최소화 우선 |
| Temperature | 0.1 (기본), 0.0 (단순 추출), 0.2 (S09/S11/S12) | |
| Max Tokens | 2048~8192 (섹션별) | S08/S09는 8192 |
| Top K/P | 기본값 (미설정) | |
| Enable Thinking | OFF (현재), E2E 후 S11/S12 실험 검토 | |

#### 세션 10 상태: ✅ 완료 (M8 작업 1~2 완료, 작업 3 E2E 테스트 대기)

---

### 세션 9.3 — Sub-WF 프롬프트 M7 완료, 12/12 전체 완성 (2026-04-02)

#### 작업 내용

S11 Case Formulation, S12 Psychodynamic Formulation 프롬프트 생성 및 Claude.ai 검수 후 수정 적용.
M7 완료로 12개 전체 프롬프트 파일 완성 (12/12).

| 마일스톤 | 대상 | 상태 | 산출물 |
|---------|------|:----:|--------|
| M7-1 | S11 Case Formulation | ✅ 완료 | `system_prompt_section_11.md` |
| M7-2 | S12 Psychodynamic Formulation | ✅ 완료 | `system_prompt_section_12.md` |

#### M7 산출물 상세

**S11 Case Formulation**
- 4P Bio-Psycho-Social 모델 (Predisposition / Pattern / Precipitants / Perpetuants)
- Treatment Plan: bio(medications) + psycho[] + social[] 구조
- S11 조건부 추론: Predisposition·Pattern·Perpetuants·Psycho치료 허용, Precipitants 사실 기반
- meta 불변: `requires_review = true`, `confidence = "draft"`, `type = "inference"` 고정
- Phase 2 의존: Phase 1 전체 요약 (S01~S08), `phase1_summary_available` 추적
- SECTION_KEY: `case_formulation` (D-26 snake_case 준수)

**S12 Psychodynamic Formulation**
- 3단락+ 연속 산문 (번호 목록·불릿 절대 금지)
- S12 전체 inference 허용, 추론 어미 필수 (`~했을 것이다`, `~으로 생각된다`, `~것으로 보인다`, `~것 같다`)
- 단락 1: 대상관계·Oedipal 고착·false self-adaptation (유아기~청소년기)
- 단락 2: counter-phobic defense·sexualization·repetition compulsion·triangulation (성인기)
- 단락 3: superego 갈등·dissociation·la belle indifférence·regression (현재)
- Gold Standard 원문 3단락 전체 포함 (Oedipal 갈등, object relations, false self-adaptation 등)
- meta 불변: `requires_review = true`, `confidence = "draft"`, `type = "inference"` 고정
- Phase 2 의존: S05 + S09 + S11, `dependent_sections_available` 가용 여부 추적
- SECTION_KEY: `psychodynamic_formulation` (D-26 snake_case 준수)

#### Claude.ai 검수에서 발견된 이슈 및 수정

| # | 파일 | 이슈 | 수정 내용 | 판정 |
|---|------|------|----------|:----:|
| 1 | S12 | 추론 어미 `"~것 같다"` 누락 (Gold Standard 단락 2에 실제 사용) | §2 규칙3, §4 문체 규칙, §5 체크포인트 3곳 모두 추가 | 수정 |
| 2 | S12 | S09 SYSTEM NOTE 처리 규칙 누락 (단락 2·3 추론의 핵심 근거) | EH 8-1 신규 추가: S09_present_illness = false, 추론 근거 축소, missing_items 기재 | 수정 |
| 3 | S11 | Anti-Halluc 규칙3 표현 | 조건부 허용 + requires_review 명시로 기능적으로 동등 | 수정 불필요 |
| 4 | S11 | `\-` 이스케이프 일관성 | Output Format + Gold Standard 양쪽 올바르게 적용됨 | 수정 불필요 |
| 5 | S11 | S08 참조 누락 우려 | EH9에 S04+S08 모두 언급됨 | 수정 불필요 |
| 6 | S12 | `~했으나` 역접절 추론 어미 예외 | Gold Standard 동일 패턴 — 역접절 예외로 인정 | 수정 불필요 |
| 7 | S11 | Strength-Pattern 관계 불명확 우려 | 3곳에서 명확히 표현됨 | 수정 불필요 |

#### 최종 프롬프트 파일 현황 (12/12 완성)

| # | 섹션 | 파일 | QC 점수 | 상태 |
|---|------|------|:-------:|:----:|
| S01 | Identifying Data | `section_01.md` | 1/5 | ✅ |
| S02 | Chief Problems | `section_02.md` | 0.5/5 | ✅ |
| S03 | Informants | `section_03.md` | 0.5/3 | ✅ |
| S04 | Past/Family Hx | `section_04.md` | 0.5/4 | ✅ |
| S05 | Personal History | `section_05.md` | 1/5 | ✅ |
| S06 | MSE | `section_06.md` | 1.5/5 | ✅ |
| S07 | Mood Chart | `section_07.md` | 1.5/2 | ✅ |
| S08 | Progress Notes | `section_08.md` | 0/5 | ✅ |
| S09 | Present Illness | `section_09.md` | 3/12 | ✅ |
| S10 | Diagnostic Formulation | `section_10.md` | 2.5/3 | ✅ |
| S11 | Case Formulation | `section_11.md` | — (신규) | ✅ |
| S12 | Psychodynamic | `section_12.md` | — (신규) | ✅ |

#### 다음 할 일

- [ ] M8: n8n 노드 업데이트 (Halluc→AI Agent+Gemini Flash, 프롬프트 교체 S01~S12, E2E)
- [ ] M9: QC 2차 (목표 60점+)
- [ ] M10: Gemini Pro 비교 테스트

#### 세션 9.3 상태: ✅ 완료 (12/12 프롬프트 파일 전체 완성, M8 대기 중)

---

### 세션 9.2 — Sub-WF 프롬프트 M6 완료 (2026-04-02)

#### 작업 내용

S07 Mood Chart, S10 Diagnostic Formulation 프롬프트 생성 및 Claude.ai 검수 후 수정 적용.
M1~M6 완료로 12개 중 10개 프롬프트 파일 완성.

| 마일스톤 | 대상 | 상태 | 산출물 |
|---------|------|:----:|--------|
| M6-1 | S07 Mood Chart | ✅ 완료 | `system_prompt_section_07.md` |
| M6-2 | S10 Diagnostic Formulation | ✅ 완료 | `system_prompt_section_10.md` |

#### M6 산출물 상세

**S07 Mood Chart**
- 0-10 척도 수치화 기준 명시 (0=최악~10=최상)
- `hospital_day` 미확인 시 `admission_date` 기준 자동 계산 규칙 (Error 7-1 신규)
- 입원 scale 출처: "면담 full_text 내 또는 경과기록(S08) 첫 줄에서 추출" 명시
- `admission_scales` (BDI/BAI/MDQ) + `entries[]` 배열 + `trend` 스키마
- meta 전용 필드: `entries_count`, `has_objective_scales`
- Phase 1 독립 섹션 (의존성 없음)

**S10 Diagnostic Formulation**
- DSM-5-TR 영문 표준 진단명 한 줄 먼저 (Gold Standard 일치)
- R/O 감별 진단: 선택적 (0~2개), `//` 주석으로 "선택적" 명시 (필수 오해 방지)
- `rule_out` / `consider` 판단 기준 표에 명시 (주요 기준 불충족 vs 일부 충족하나 확정 불가)
- AI 면책 문구 생략 불가 규칙 (§11 항상 적용)
- meta 불변 규칙: `requires_review = true`, `confidence = "draft"`, `type = "inference"` 고정
- Phase 2 의존: S02 + S06 + S09, `dependent_sections_available` 가용 여부 추적

#### Claude.ai 검수에서 발견된 이슈 및 수정

| # | 파일 | 이슈 | 수정 내용 |
|---|------|------|----------|
| 1 | S07 | hospital_day 미확인 처리 규칙 누락 | Error 7-1 추가: admission_date 기준 날짜 차이 자동 계산 |
| 2 | S07 | 입원 scale 정보 출처 불명확 | 출처 위치 명시 + null 처리 시 Error 8번 연결 |
| 3 | S10 | rule_out / consider 구분 기준 미명시 | 추가 키 설명 표에 판단 기준 행 추가 |
| 4 | S10 | Output Format 예시에 R/O BPD → 감별 진단 필수로 오해 가능 | 예시 바로 아래 `//` 주석으로 "선택적" 명시 |

#### 현재 프롬프트 파일 현황 (10/12)

| # | 섹션 | 파일 | QC 점수 | 상태 |
|---|------|------|:-------:|:----:|
| S01 | Identifying Data | `section_01.md` | 1/5 | ✅ |
| S02 | Chief Problems | `section_02.md` | 0.5/5 | ✅ |
| S03 | Informants | `section_03.md` | 0.5/3 | ✅ |
| S04 | Past/Family Hx | `section_04.md` | 0.5/4 | ✅ |
| S05 | Personal History | `section_05.md` | 1/5 | ✅ |
| S06 | MSE | `section_06.md` | 1.5/5 | ✅ |
| S07 | Mood Chart | `section_07.md` | 1.5/2 | ✅ |
| S08 | Progress Notes | `section_08.md` | 0/5 | ✅ |
| S09 | Present Illness | `section_09.md` | 3/12 | ✅ |
| S10 | Diagnostic Formulation | `section_10.md` | 2.5/3 | ✅ |
| S11 | Case Formulation | `section_11.md` | — | ⬜ |
| S12 | Psychodynamic | `section_12.md` | — | ⬜ |

#### 다음 할 일

- [ ] M7: S11 Case Formulation (`section_11.md`) — Treatment Plan 구체화
- [ ] M7: S12 Psychodynamic (`section_12.md`) — 3단락+ 연속 산문 + 고도 전문용어
- [ ] M8: n8n 노드 업데이트 (Halluc→AI Agent+Gemini Flash, 프롬프트 교체, E2E)
- [ ] M9: QC 2차 (목표 60점+)

#### 세션 9.2 상태: ✅ 완료 (M6까지 완료, M7 대기 중)

---

### 세션 9 — Sub-WF 프롬프트 Dual-Layer 전환 (2026-04-01)

#### 작업 내용

12개 Sub-WF 시스템 프롬프트를 Dual-Layer 구조(narrative + structured + meta)로 전면 재설계.
Claude.ai에서 섹션별 상세 스펙 제작 → Claude Code에서 `.md` 파일 생성하는 방식으로 진행.

| 마일스톤 | 대상 | 상태 | 산출물 |
|---------|------|:----:|--------|
| M0 | 공통 템플릿 | ✅ 완료 | `system_prompt_template_dual_layer.md` |
| M1 | S08 Progress Notes (QC 0/5) | ✅ 완료 | `system_prompt_section_08.md` |
| M2 | S02 Chief Problems + S04 Past/Family Hx | ⬜ 예정 | `section_02.md`, `section_04.md` |
| M3 | S03 Informants + S01 Identifying Data | ⬜ 예정 | `section_01.md`, `section_03.md` |
| M4 | S05 Personal History + S06 MSE | ⬜ 예정 | `section_05.md`, `section_06.md` |
| M5 | S09 Present Illness (FCAB) | ⬜ 예정 | `section_09.md` |
| M6 | S07 Mood Chart + S10 Diagnostic Formulation | ⬜ 예정 | `section_07.md`, `section_10.md` |
| M7 | S11 Case Formulation + S12 Psychodynamic | ⬜ 예정 | `section_11.md`, `section_12.md` |

#### M1 산출물 상세 — `system_prompt_section_08.md`

- SOAP 형식: S) 구어체 원문 + [U]tag 밑줄 마킹 / O) Mood·Affect 표준 + 임상해석 볼드 / P) 약물 아침-점심-저녁-취침mg
- HD# 계산: admission_date = HD#1, 각 면담 날짜에서 offset 계산
- Gold Standard: 실제 보고서 HD#2/HD#5/HD#8 3개 노트 발췌 포함
- S08 전용 Error Handling 7~10번 추가 (admission_date 미확인, 투약 없음, 면담 1건, S) 발화 선별 불가)

#### ⚠️ E2E 검증 포인트 (세션 10 필수 확인)

| # | 항목 | 내용 |
|---|------|------|
| V-01 | **HD# 계산 정확도** | Gold Standard는 HD#2/5/8 예시 사용. Mock 데이터(PT-2026-001) 기준 초진(2026-03-20)=HD#1, 경과(2026-03-28)=**HD#9**. AI 출력에서 HD#9로 계산되는지 반드시 확인. Gold Standard 날짜(2023.09.xx)가 출력에 섞이면 Hallucination. |

> **배경**: 프롬프트 § 4 Task에 HD# 계산 규칙(admission_date=HD#1, 날짜 차이+1)이 명시되어 있어 정상 동작 예상. 그러나 Gold Standard 예시 날짜와 입력 날짜가 다른 연도/범위이므로 E2E에서 실제 확인 필요.

#### 세션 9 상태: 🔴 진행 중 (M1 완료, M2~M8 예정)

---

### 세션 8.7 — v3.1 6단계 평가 반영 + AI Agent 전환 계획 (2026-04-01) — v3.1 6단계 평가 반영 + AI Agent 전환 계획 (2026-04-01)

#### 작업 내용

v2 → v3.1 6단계 체계적 평가 수행 후 발견 사항을 PROJECT_PLAN_v3.1.md에 반영 (→ v3.1 rev.2).

**평가 총점**: 84.7/100 (A등급, 조건부 승인)

#### 주요 발견 사항 및 v3.1 반영 내역

| 발견 | 심각도 | v3.1 반영 위치 |
|------|:------:|---------------|
| HTTP Request vs AI Agent 노드 불일치 | 중 | D-29 신규, §20 신규 |
| Gemini 크레딧 활용 계획 미문서화 | - | D-30 신규, §21 신규 |
| HTML→Docs 변환 대안 경로 미문서화 | 중 | §15 위험 8 보완 |
| Halluc Check FN 위험 미문서화 | 높 | §15 위험 9 신규 |
| Halluc 원문 절단 방어 미구현 | 높 | §7 Layer 4 주의사항(P-04) 신규 |
| Phase 1 팬아웃 실행 방식 불명확 | 중 | §5 Phase 1 명확화(P-10) 신규 |
| draft_ 수정 실수 방지 미문서화 | 중 | §18 P-07 신규 |
| 알려진 제약 종합 미문서화 | - | §19 신규 (제약, 구현/운용/확장 유의사항) |
| Gemini 모델 목록 미등록 | - | §21 신규 (7개 모델 레지스트리) |
| 비용 추산 미업데이트 | 하 | §21 크레딧 현황 신규 |

#### 의사결정

| D# | 결정 |
|----|------|
| D-29 | Sub-WF AI 호출: HTTP Request → AI Agent 노드 전환 (세션 10) |
| D-30 | Halluc 검증: Haiku → Gemini Flash 전환 검토 (세션 10 즉시 가능) |

#### 산출물

| 파일 | 변경 내용 |
|------|----------|
| `docs/PROJECT_PLAN_v3.1.md` | v3.1 → rev.2 업그레이드. §19~21 신규, D-29/D-30 추가, 위험 9 추가, Phase 1 명확화, Layer 4 주의사항, §18 draft_ 방지 |

#### 세션 8.7 상태: ✅ 완료

---

### 세션 8 — Quality Check 분석 + 아키텍처 결정 (2026-04-01)

#### Quality Check 결과 요약

| 대분류 | 만점 | 득점 | 비율 |
|--------|:----:|:----:|:----:|
| A. 형식 충실도 | 60 | 16.5 | 27.5% |
| B. 사실 정확성 | 25 | 20 | 80.0% |
| C. Halluc Check 실효성 | 15 | 8 | 53.3% |
| **합계** | **100** | **44.5** | **44.5% (C등급)** |

#### 근본 원인 분석

사실 추출은 양호(80%)하나 형식 재현이 실패(27.5%). 원인:

- Sub-WF가 JSON 데이터 구조(key-value)를 반환
- HTML 변환 노드(s34-c4)의 v() 함수로는 JSON→임상 산문 변환 본질적으로 불가
- 형식 품질은 변환 단계가 아닌 생성 단계에서 해결해야 함

#### 아키텍처 결정

| # | 결정 | 근거 |
|---|------|------|
| D-22 (v3.1 기준 D-21) | Sub-WF 출력을 Dual-Layer (narrative + structured + meta)로 전환 | 형식은 생성 단계에서 해결. HTML 변환은 narrative를 이어 붙이기만 |
| D-23 (v3.1 기준 D-22) | Quality Check는 별도 수동 QA 프로세스. WF2 Halluc Check 대체 안 함 | 목적 다름(안전 vs 품질), Gold Standard 필요, 비용 높음 |

> ⚠️ D-번호 canonical: `docs/PROJECT_PLAN_v3.1.md` §2가 유일한 권위입니다. 이 세션에서 사용한 D-22/D-23은 세션 내 임시 번호였으며, v3.1에서 D-21/D-22로 재배정되었습니다.

#### 산출물

| 파일 | 용도 |
|------|------|
| `quality_check_PT-2026-001.json` | 첫 QC 결과 (C등급, 44.5/100) |
| `quality_check_summary_PT-2026-001.md` | QC 결과 요약 + 섹션별 수정 가이드 |
| `quality_check_prompt.md` | QC 채점 시스템 프롬프트 (100점 만점) |
| `PROJECT_PLAN_v3.md` | 종합 기획안 v3 (Dual-Layer, QC 전략 반영) |

#### 세션 8 상태: ✅ 분석 완료, 구현은 다음 세션

---

### 세션 8.5 — v3.1 아키텍처 감사 반영 (2026-04-01)

#### 배경

v3에 대한 6단계 아키텍처 감사(평가 기준점 생성 → 세부 체크리스트 → 평가 실행 → 장단점 → 유의사항 → 잠재 문제점)를 수행하고, 발견된 문제점을 반영하여 v3 → v3.1로 업그레이드.

#### 평가 결과 요약

| 기준 축 | 원점수 | 비고 |
|---------|:------:|------|
| 아키텍처 일관성 | 88% | D-번호 충돌 1건 |
| 기술적 실현 가능성 | 80% | HTML→Docs 변환 미검증 |
| **사용자 경험** | **50%** | **수정→제출 경로 미문서화 (최약점)** |
| Hallucination 방어 | 92% | 6계층 방어, 최강점 |
| 유지보수성 | 85% | HTML 변환 단순화 호평 |
| 의사결정 추적성 | 95% | PROGRESS_LOG 기록 수준 우수 |
| 비용 효율성 | 95% | Haiku + 수동 QC 분리 합리적 |
| **총점** | **72.8/100** | **B등급, 조건부 승인** |

#### v3 → v3.1 변경사항

| 변경 | 내용 | 근거 |
|------|------|------|
| §5 Phase 2 null 방어 추가 | 의존 섹션 데이터 미존재 시 fallback 로직 명시 | P-01: S02 실패 시 S09 undefined |
| §5 HTML escape 추가 | narrative 삽입 시 HTML 특수문자 escape | 5-A: 약물명 < 등 |
| §15 위험 7~9 추가 | HTML 발표 부적합, 모델 regression, Halluc FN | P-05, 5-C, 단점 5 |
| §16 로드맵 세분화 | Phase 3~5를 세션 단위로 분해 | 단점 3 |
| §17 모델 업데이트 QC 절차 | 모델 변경 시 QC 필수 재실행 | 5-C |
| **§18 신규: 보고서 수정 가이드** | 전공의의 수정→제출 워크플로우 문서화 | **3-3 Fail (최약점 해결)** |
| **§19 신규: 알려진 제약** | WF1-A 미완성, Gold Standard 1건, Docs 변환 미검증 등 | 5-D |
| D-번호 정리 | §2가 유일한 canonical 선언 | P-07: PROGRESS_LOG와 충돌 해소 |
| Telegram 알림 이모지 강화 | 🔄⏳✅ℹ️ 시각 구분 | P-04 |

#### 산출물

| 파일 | 용도 |
|------|------|
| `PROJECT_PLAN_v3.1.md` | 종합 기획안 v3.1 Final (SSoT) |
| `CLAUDE.md` (수정) | Claude Code 프로젝트 파일 v3.1 반영 |

#### 세션 8.5 상태: ✅ 완료

---

## 다음 세션 예정 작업

### [최우선] 세션 9: Sub-WF 프롬프트 Dual-Layer 전환 (12개)

**목표**: 12개 Sub-WF의 AI 프롬프트를 v3.1 Dual-Layer Output 구조로 전면 재설계
**작업 범위**: 프롬프트 제작만. 워크플로우 변경은 별도 세션.

#### 작업 순서 (우선순위 기반 — QC 최하위 섹션 먼저)

| 순위 | Sub-WF | QC 점수 | 핵심 변경 |
|:----:|--------|:-------:|----------|
| 1 | S08 Progress Notes | 0/5 | SOAP + S) 구어체 원문 + O) 관찰해석 + 날짜HD# |
| 2 | S02 Chief Problems | 0.5/5 | 번호+영문증상명 + Remote/Recent onset |
| 3 | S04 Past/Family Hx | 0.5/4 | 6개 번호항목 + 투약 형식 |
| 4 | S03 Informants | 0.5/3 | 서술형 평가 3문장+ + Reliable 판정 |
| 5 | S01 Identifying Data | 1/5 | 항목:값 줄 나열 + 병전성격 서술형 |
| 6 | S05 Personal History | 1/5 | 5단계 소제목 + 서술형 산문 |
| 7 | S06 MSE | 1.5/5 | 9개 항목 + (+/-) + Mood/Affect 표준 |
| 8 | S09 Present Illness | 3/12 | 4단락+ 연속 산문 + FCAB + 상대시점 |
| 9 | S12 Psychodynamic | 2.5/6 | 3단락+ 연속 산문 + 고도 전문용어 |
| 10 | S10 Diagnostic Formulation | 2.5/3 | 간결 진단명 한 줄 먼저 (현재 양호) |
| 11 | S11 Case Formulation | 3/5 | Treatment Plan 구체화 |
| 12 | S07 Mood Chart | 1.5/2 | 수치 데이터 보완 (현재 양호) |

#### 각 프롬프트 필수 포함 요소

1. Anti-Hallucination Rules (최상단) — narrative에 source_ref 노출 금지 포함
2. 출력 형식 규칙 ("narrative는 임상 보고서 텍스트, JSON 금지")
3. Gold Standard 예시 (해당 섹션의 실제 원본 보고서 발췌)
4. Output Format (Dual-Layer JSON 스키마)
5. JSON 안전 규칙 (narrative 내 큰따옴표 이스케이프)
6. Error Handling (누락 정보 처리)

#### 산출물

- `system_prompt_section_01.md` ~ `system_prompt_section_12.md` (12개 파일)
- 각 파일: 해당 Sub-WF의 HTTP Request 노드에 투입할 시스템 프롬프트

### 세션 10: WF2 노드 업데이트 + E2E 재테스트

**선행 조건**: 세션 9 프롬프트 12개 완성

| 작업 | 내용 |
|------|------|
| Sub-WF 프롬프트 교체 | 12개 Sub-WF의 HTTP Request 노드에 v3.1 프롬프트 적용 |
| HTML 변환 노드 단순화 | s34-c4를 narrative 기반 단순 이어붙이기 + escapeHtml로 교체 |
| Phase 2 null 방어 추가 | S09~S12 릴레이 4개에 D-26 fallback 코드 삽입 |
| Halluc Check 프롬프트 개선 | 검증 대상 10섹션 확대, FP 감소 + FN 탐지 지시 추가 |
| E2E 테스트 | PT-2026-001 Mock → HTML 생성 성공 확인 (P-1 해소) |
| **HTML→Docs 변환 E2E** | **GDrive convert 옵션 실제 테스트, 서식 유지도 확인** |

### 세션 11+: QC 2차 + 잔여 작업

| 작업 | 우선순위 |
|------|:--------:|
| QC 2차 채점 (목표 60점+) | 🔴 높음 |
| QC 3차 (목표 75점+ A등급) | 🔴 높음 |
| WF1-A 설문지 경로 | 🟡 중간 |
| HTML→Docs GDrive convert 옵션 | 🟡 중간 |
| Sub-WF AI 노드 HTTP→Basic LLM Chain 전환 | 🟢 낮음 (n8n UI 수동) |
| Queue Mode 전환 (성능 최적화) | 🟢 낮음 |
| 실사용 테스트 | Phase 5 |

---

## 알려진 이슈

**P-1 (Resolved by Design)**: HTML 변환 reports_folder_id 누락
- 세션 7 발견: HTML 변환 노드가 `$('보고서 준비')` 참조 시 `reports_folder_id` 누락
- v3.1 해결: Dual-Layer 전환 시 HTML 변환 로직 전면 교체 예정 → 이 버그는 자연 해소
- **검증 예정**: 세션 10 E2E에서 HTML 생성 성공 확인 필요

**P-2 (Open)**: Haiku Hallucination 검증 false positive + false negative
- FP: 원본 6000자 절단, 프롬프트 빈약 → 세션 10에서 개선 예정
- FN: type:inference 미표시 추론 문장 미감지 → Halluc 프롬프트 FN 탐지 강화 (v3.1 §7-4)

**P-3 (Open)**: Phase 1 팬아웃 순차 실행 (37초)
- Queue Mode 전환 시 4~6초로 개선 가능 → Phase 5에서 검토

---

> **D-번호 canonical**: `docs/PROJECT_PLAN_v3.1.md` §2가 유일한 권위입니다. 이 PROGRESS_LOG의 세션별 임시 D-번호와 충돌 시 PROJECT_PLAN이 우선합니다.
> **환경변수 전체 목록**: `.env.example` 참조
