---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

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
