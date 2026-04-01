# 정신건강의학과 Case Conference 보고서 자동화 — 종합 기획안

> **프로젝트명**: PsyCaseAuto (Psychiatry Case Conference Automation)
> **버전**: v3.1 rev.2
> **최종 수정**: 2026-04-01
> **작성 목적**: Claude Code 작업 시 맥락 유지를 위한 단일 참조 문서 (Single Source of Truth)
> **변경 이력**: v1.0(2026-03-27) → v2.0(2026-03-29) → v3.0(2026-04-01) → v3.1(2026-04-01, 아키텍처 감사 반영) → **v3.1 rev.2(2026-04-01, 6단계 평가 반영)**
> **v3.1 변경 요약**: 보고서 수정 가이드 신규(§18), 결정 번호 정리(§2), Phase 2 null 방어(§5 D-26), HTML escape(§5 D-27), Telegram 알림 축소(D-17), 모델 업데이트 대응(§15 D-28), WF1-A 의존성 명시(§4)
> **rev.2 추가**: AI Agent 노드 전환 계획(D-29, §20), Gemini 모델 채택 계획(D-30, §21), 비판적 평가 반영(§19 알려진 제약 + 위험 9 + Phase 1 팬아웃 명확화 + Halluc 절단 방어)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요) | 2. [의사결정 로그](#2-핵심-의사결정-로그) | 3. [아키텍처](#3-시스템-아키텍처) | 4. [WF1 데이터 수집](#4-워크플로우-1) | 5. [WF2 보고서 생성](#5-워크플로우-2) | 6. [WF3 Error](#6-워크플로우-3) | 7. [Anti-Hallucination](#7-anti-hallucination) | 8. [AI 프롬프트](#8-ai-프롬프트) | 9. [STT](#9-stt) | 10. [보고서 구조](#10-보고서-구조) | 11. [데이터 모델](#11-데이터-모델) | 12-14. [보안/배포/실수방지](#12-14-보안-배포-실수방지) | 15. [위험](#15-위험) | 16. [로드맵](#16-로드맵) | 17. [Quality Check](#17-quality-check) | 18. [보고서 수정 가이드](#18-보고서-수정-가이드) | **19. [알려진 제약](#19-알려진-제약-및-유의사항) | 20. [AI Agent 전환](#20-ai-agent-노드-전환-계획-d-29) | 21. [Gemini 모델](#21-google-gemini-모델-레지스트리-d-30)**

---

## 1. 프로젝트 개요

### 5W1H

| 항목        | 내용                                               |
| --------- | ------------------------------------------------ |
| **What**  | 환자 면담 기록/녹음본을 토대로 Case Conference 보고서 작성 자동화     |
| **Why**   | ① 질문 누락 방지 ② 수기 타이핑 절감 ③ 시간순 자동 배열 ④ 기록 정리 시간 단축 |
| **Who**   | 정신건강의학과 전공의 (R1~R4)                              |
| **When**  | 환자 면담 후 기록 작성 시, Case Conference 준비 시            |
| **Where** | 개인 모바일 핫스팟 환경 (병원 네트워크 미사용)                      |
| **How**   | n8n 워크플로우 → Railway 배포, AI 초안 → 전공의 검토/수정        |

### 핵심 기대

- AI 초안 → 전공의 **소폭 수정만으로** 사용 가능
- **Hallucination 절대 방지**: 면담에 없는 내용을 지어내지 않는 것이 최우선
- **형식 재현도**: Gold Standard와 동일한 형식 — 내용이 좋아도 형식이 안 맞으면 사용 불가
- 면담 수집과 보고서 생성 **분리**: 면담은 여러 번, 보고서는 종합 1회
- **전공의 최종 사용까지의 전체 경로 보장** (§18 참조)

---

## 2. 핵심 의사결정 로그

> **v3.1**: 이 표가 **결정 번호의 유일한 canonical 소스**. 향후 새 결정은 여기서만 번호 할당.

| #        | 결정 사항                         | 이유                               | 확정일   |
| -------- | ----------------------------- | -------------------------------- | ----- |
| D-01     | WF1/WF2 분리                    | 면담 여러 번, 보고서 1회                  | 03-27 |
| D-02     | 12개 섹션 별도 AI 호출               | Lost-in-the-Middle 방지, Halluc 감소 | 03-27 |
| D-03     | 저장소: Google Drive (JSON)      | Sheets 셀 크기 제한 회피                | 03-27 |
| D-04     | 트리거: Telegram 메시지             | 모바일 직관적 사용                       | 03-27 |
| D-05     | 네트워크: 개인 핫스팟                  | 병원 보안 정책 우회                      | 03-27 |
| D-06     | 환자 식별: PT-YYYY-NNN            | 개인정보보호                           | 03-27 |
| D-07     | AI: Claude Sonnet 4           | 비용 대비 성능                         | 03-27 |
| D-08     | STT: gpt-4o-transcribe        | 한국어 성능 우수                        | 03-29 |
| D-09     | ~~DOCX~~ → HTML → GDrive Docs | docx npm 미설치                     | 04-01 |
| D-10     | 수정 전/후 보고서 모두 보관              | 피드백 루프 확보                        | 03-27 |
| D-11     | 체크리스트: HTML (Netlify)         | UX 우수, 모바일 최적화                   | 03-29 |
| D-12     | Present Illness: FCAB 구조      | 원본 문체 분석 결과                      | 03-29 |
| D-13     | 에러: 3단계 분류                    | RETRYABLE/FATAL/WARN             | 03-29 |
| D-14     | WF1-A: HTML + n8n Form 이중     | HTML 주, Form 백업                  | 03-29 |
| D-15     | FFmpeg 불가 (Railway)           | child_process 차단, ≤24MB만         | 03-29 |
| D-16     | Phase 1 팬아웃, Phase 2 순차       | 독립↔의존 분리                         | 04-01 |
| **D-17** | **Telegram 알림 2단계** (시작+완성)   | 4단계는 노이즈. 검증은 완성에 통합             | 04-01 |
| D-18     | Drive 저장 → Halluc 검증 순서       | 검증 실패해도 보고서 전달                   | 04-01 |
| D-19     | Halluc 모델: Haiku              | 속도·비용 우선                         | 04-01 |
| D-20     | HTML → GDrive convert Docs    | docx npm 없음                      | 04-01 |
| D-21     | Sub-WF: Dual-Layer 출력         | narrative(산문)+structured(JSON)   | 04-01 |
| D-22     | QC: 별도 수동 프로세스                | Gold Standard 필요, 튜닝 시만          | 04-01 |
| D-23     | Halluc 검증: 10개 섹션             | S11/S12 추론 허용 제외                 | 04-01 |
| D-24     | Halluc 실패해도 저장 진행             | onError: continueRegularOutput   | 04-01 |
| D-25     | GDrive: 파일별 직렬화→업로드           | passthrough 불가                   | 04-01 |
| **D-26** | **Phase 2 릴레이: null 검증 필수**   | S02 실패→S09 undefined 방지          | 04-01 |
| **D-27** | **HTML 변환: escape 처리**        | `<>&` 렌더링 깨짐 방지                  | 04-01 |
| **D-28** | **모델 업데이트 시 QC 필수 재실행**       | 형식 regression 감지                 | 04-01 |
| **D-29** | **Sub-WF AI 호출: HTTP Request → AI Agent 노드 전환 (세션 10)** | 모델 교체 용이성, CLAUDE.md 절대 규칙 준수 | 04-01 |
| **D-30** | **Halluc 검증: Haiku → Gemini Flash 전환 검토** | Google AI Studio 크레딧 활용, 비용↓ | 04-01 |

---

## 3. 시스템 아키텍처

> v3.0 아키텍처 다이어그램 유지. v3.1 변경: 전공의 수정 경로(§18) 추가, Telegram 알림 2단계 반영.

---

## 4. 워크플로우 1: 데이터 수집

> v2.0 §4 내용 유지.
> 
> ⚠️ **WF1-A 미완성 유의**: 현재 WF1-B(STT)만 가능. 체크리스트 기반 구조화 입력 불가 → AI 정보추출 난이도↑, Halluc 위험↑. **WF1-A 완성은 보고서 품질 향상의 숨은 전제 조건.**

---

## 5. 워크플로우 2: 보고서 생성

### WF2 현황

| 항목          | 값                        |
| ----------- | ------------------------ |
| Workflow ID | `LiN5bKslyWtZX6yG`       |
| 총 노드 수      | 71                       |
| Sub-WF      | 12개 (S01~S12)            |
| 상태          | Stage 3-4 완료, 프롬프트 튜닝 필요 |

### 전체 흐름

```
Stage 1: Telegram → 데이터 로드 → 알림①(시작)
Stage 2: Phase 1(팬아웃 S01-S08) → Phase 2(순차 S09-S12, D-26 null 방어)
Stage 3: JSON+HTML 저장(D-27 escape)
Stage 4: Halluc 검증(Haiku) → Log 저장 → 알림②(완성+검증 통합)
```

### Telegram 알림 (D-17 — 2단계)

| #   | 내용                                        |
| --- | ----------------------------------------- |
| ①   | 🔄 생성 시작 — "예상 소요: 4~5분"                  |
| ②   | ✅ 완성 — 보고서 링크 + 품질 지표 + Halluc 결과 + 면책 문구 |

> 기존 4단계 노드는 비활성화(disable) 보관. 디버깅 시 재활성화 가능.

### Dual-Layer 출력 (D-21)

```json
{
  "narrative": "(Gold Standard 형식 산문)",
  "structured": {"source_ref": "면담1_환자_L15", "type": "verbatim"},
  "meta": {"status": "complete", "requires_review": false}
}
```

### Phase 2 null 방어 (D-26)

```javascript
// 모든 Phase 2 릴레이에 적용
const dep = phase1.phase1_results?.chief_problems?.narrative
  || '[S02 미생성 — 해당 정보 없이 작성. 누락은 meta.missing_items에 기재]';
```

### HTML 변환 (D-27)

```javascript
const escapeHtml = (s) => s ? String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>') : '';
// narrative를 escape 후 <br> 변환하여 삽입
```

### 섹션 호출 순서

```
Phase 1 (팬아웃): S01~S08
Phase 2 (순차): S09(+S02) → S10(+S02,S06,S09) → S11(+Phase1요약) → S12(+S05,S09,S11)
```

### Phase 1 실행 방식 명확화 (P-10)

> "팬아웃"은 n8n에서 8개 Execute Workflow 노드를 병렬 **배치**한다는 의미.
> 실제 실행 속도는 Queue Mode 설정에 따라 달라짐:

| 모드 | 실제 동작 | 소요 시간 |
|------|----------|----------|
| Queue Mode **미사용** (현재) | 8개 순차 실행 | ~37초 |
| Queue Mode **사용** (Phase 5 검토) | 병렬 실행 | ~5초 |

### Sub-WF 공통: Trigger → 입력 → Claude API → 파싱(+fallback) → 검증 → return

---

## 6. 워크플로우 3: Error Workflow

> v2.0 유지. ID: `4ox2lxKl1st6pUkY`

---

## 7. Anti-Hallucination 전략

```
Layer 1: 프롬프트 규칙 (narrative에 기계적 태그 금지 추가)
Layer 2: Dual-Layer 출력 (narrative/structured 분리)
Layer 3: 섹션별 분리 생성
Layer 4: Halluc Check (10섹션, FN 감소 지시 추가)
Layer 5: Quality Check (수동 QA)
Layer 6: 전공의 최종 검토
```

### Layer 4 v3.1 개선

- 기존: source_ref 대조만
- 추가: "type: inference 미표시된 추론 문장 탐지. S11/S12 외 발견 시 issue 보고"
- FP 감소: "나이 계산, 상대 시점 변환, generic↔brand 치환은 합리적 변환"

### Layer 4 구현 주의사항 (P-04)

> ⚠️ Halluc Check 모델(Haiku/Gemini Flash)의 컨텍스트 제한으로 **면담 원문이 절단**되면 FP 급증.

```
대응:
1. 면담 원문이 Halluc 검증 모델 컨텍스트의 60%를 초과하면 경고
2. 초과 시: 검증 대상을 5개 핵심 섹션으로 축소 (S01, S04, S06, S08, S09)
3. Haiku → Gemini Flash 전환 시 컨텍스트 한도 재확인 필요
```

---

## 8. AI 시스템 프롬프트

### 프롬프트 공통 구조

```
# Role → # Anti-Halluc Rules → # 출력 형식 규칙
  (narrative에 JSON/source_ref/기계적 태그 금지)
→ # Task → # 형식 예시 (Gold Standard) → # Output Format (Dual-Layer JSON)
  (따옴표 escape 지시 포함)
```

> 섹션별 상세: `system_prompt_section_XX.md` × 12 (별도 파일)
> 형식 예시표: v3.0 §8 참조 (변경 없음)

---

## 9~14. STT / 보고서구조 / 데이터 / 보안 / 배포 / 실수방지

> v3.0 내용 유지.

### §11 데이터 모델 — reports/ 폴더에 final_* 추가

```
reports/
  ├── draft_*_v1.json   — AI 원본 (수정 금지)
  ├── draft_*_v1.html   — AI 원본 HTML (수정 금지)
  └── final_*.docx      — 전공의 수정 완료본 (§18)
```

---

## 15. 알려진 위험

> v2 위험 1~5 + v3 위험 6 유지.

### 위험 7: 모델 업데이트 Regression (v3.1)

대응: D-28 — 모델 변경 후 E2E + QC 필수 재실행. 해결 불가 시 이전 모델 pin.

### 위험 8: HTML→Docs 서식 손실 (v3.1)

대응: Phase 4에서 변환 E2E 검증. 심각 시 아래 대안 경로 순서로 검토:
1. HTML을 브라우저에서 직접 인쇄(Ctrl+P → PDF)
2. Google Apps Script로 HTML→Docs 변환 제어
3. Plain text + 수동 서식

### 위험 9: Hallucination Check False Negative (rev.2)

| 항목 | 내용 |
|------|------|
| **위험도** | 높음 |
| **시나리오** | type:inference 미표시 추론 문장을 Halluc Check가 통과시킴 → 전공의가 추론을 사실로 오인 |
| **대응** | Layer 4 프롬프트에 FN 탐지 지시 추가 (§7 Layer 4 v3.1 개선 항목) + P-04 원문 절단 방어 |
| **잔여 위험** | S11/S12 외 섹션에서 추론이 발생해도 완전히 차단 불가 → 전공의 최종 검토(Layer 6) 필수 |

---

## 16. 구현 로드맵

### Phase 3 — 현재 위치 (★ 미완료 항목)

```
[x] WF2 Stage 1-4 (71노드)
[ ] ★ 12개 프롬프트 Dual-Layer 재설계
[ ] ★ HTML 변환 단순화 (D-27 escape)
[ ] ★ Halluc Check 개선 (10섹션 + FN 감소)
[ ] ★ Phase 2 null 방어 (D-26)
[ ] ★ Telegram 2단계 축소 (D-17)
[ ] QC 첫 라운드
```

### Phase 4 — 프롬프트 튜닝 + AI Agent 전환

```
[ ] 프롬프트 v2 → E2E → QC 2차 (Claude 기준선 확보)
[ ] ★ HTML→Docs 변환 E2E (위험 8)
[ ] Sub-WF HTTP Request → AI Agent 노드 전환 (D-29, §20)
[ ] Gemini Flash로 Halluc 검증 대체 테스트 (D-30)
[ ] QC 비교: Claude Sonnet vs Gemini Pro (같은 프롬프트 기준)
[ ] 목표 75점+ (2~3회 사이클)
```

> ⚠️ Claude 기준선 QC 확보 전 모델 전환 금지 (변수 분리 원칙)

### Phase 5 — 안정화

```
[ ] WF1-A 완성 (품질 전제 조건)
[ ] 실사용 테스트 + §18 검증
[ ] 실제 환자 데이터 (Mock vs 실데이터 차이 주의)
[ ] Queue Mode 검토
```

---

## 17. Quality Check 전략

| 항목    | 내용                                       |
| ----- | ---------------------------------------- |
| 실행 시점 | 튜닝 시 + 모델 업데이트 시 (D-28)                  |
| 방법    | Claude.ai에 Gold Standard + AI 초안 업로드     |
| 채점    | A(형식 60) + B(사실 25) + C(Halluc 15) = 100 |
| 합격    | 75점+ (A등급)                               |

튜닝 사이클: 프롬프트 수정 → E2E → QC → 최하위 3개 재수정 → 반복

---

## 18. 보고서 수정 가이드 (전공의용) — v3.1 신규

### 전체 경로

```
Telegram 완성 알림 → GDrive 링크 클릭 → Docs 편집
→ DOCX 다운로드/인쇄 → reports/final_YYYYMMDD.docx 저장
```

### 절차

1. **알림 확인**: Telegram ②에서 GDrive HTML 링크 클릭
2. **Docs 변환**: GDrive에서 HTML 열면 Docs 자동 변환. 안 되면 우클릭→Docs로 열기
3. **검토/수정**:
   - ⚠️ 표시 섹션(S11, S12) 집중
   - Halluc issue 항목 확인
   - 날짜/약물명/용량 교차 확인
   - 진단명 최종 확정
4. **내보내기**: Docs → 파일 → 다운로드 → .docx (또는 직접 인쇄)
5. **저장**: `reports/final_YYYYMMDD.docx` — draft_ 파일은 절대 수정 금지

### 파일 규칙

| 접두어       | 의미      | 수정  |
| --------- | ------- |:---:|
| `draft_*` | AI 원본   | ❌   |
| `final_*` | 전공의 완성본 | ✅   |

### draft_ 파일 수정 실수 방지 (P-07)

> ⚠️ GDrive에서 HTML을 Docs로 열면 편집 가능 상태가 됩니다.
> `draft_*` 파일을 실수로 수정하면 AI 원본이 손상됩니다.

권장 조치:
- GDrive 업로드 시 `draft_*` 파일을 **뷰어(Viewer)** 권한으로 공유
- 또는 파일명 앞에 `[수정금지]` 접두어 추가 (예: `[수정금지]draft_20260401_v1.html`)
- WF2 실패 시 대안: ① 면담 텍스트를 Claude.ai에 직접 업로드하여 수동 생성 ② 이전 보고서 템플릿 복사 후 수기 작성

---

## 19. 알려진 제약 및 유의사항 (rev.2 신규)

### 19-1. 알려진 제약

| 제약 | 내용 | 영향 | 해소 조건 |
|------|------|------|----------|
| **WF1-A 미완성** | 구조화된 체크리스트 입력 경로 없음. 전체 데이터가 비정형 STT 텍스트 | AI 정보 추출 난이도↑, Halluc 위험↑ (체크리스트 대비). QC 75점 달성 어려울 수 있음 | Phase 5에서 WF1-A 완성 |
| **Gold Standard 1건** | MDD 환자 1건만 존재. 다른 진단군(조현병, 양극성, 경계성인격장애 등) 미검증 | 프롬프트가 MDD 형식에 과적합 가능 | 최소 3개 진단군 Gold Standard 추가 |
| **HTML→Docs 변환 미검증** | 표, 들여쓰기, 특수문자 서식 유지 여부 테스트 미완료 | 전공의에게 깨진 문서 전달 가능 | 세션 10 E2E |
| **HTTP Request AI 호출** | 현재 Sub-WF가 HTTP Request로 Claude 직접 호출 → CLAUDE.md 절대규칙 예외 상태 | 모델 교체 어려움, 설계 불일치 | 세션 10 AI Agent 노드 전환(D-29) |

> ⚠️ WF1-A 완성 전까지 S01(Identifying Data), S04(Past/Family Hx) 같은 구조화 정보 의존 섹션 품질이 낮을 수 있음.
> QC 75점 목표는 WF1-A 완성 전에는 현실적으로 65점으로 하향 조정 권장.

### 19-2. 구현 단계 유의사항

**Dual-Layer 프롬프트 전환 시 흔히 발생하는 실수:**

1. **narrative에 JSON 태그 혼입**: AI가 narrative 필드에 `"source_ref": "..."` 같은 태그를 포함시키는 경우. 프롬프트 최상단에 "narrative는 순수 임상 산문. JSON 키·중괄호·source_ref 태그 절대 금지" 명시 필수.

2. **narrative 내 큰따옴표 미이스케이프 (P-01)**: AI 생성 narrative에 `"환자는 "죽고 싶다"고 했다"` 같은 큰따옴표가 있으면 전체 Dual-Layer JSON 파싱 실패. 대응: ① 프롬프트에 `\"` 이스케이프 지시 ② Code 노드에 try-catch + 정규식 기반 JSON 복구 fallback 구현. 최후 수단으로 AI 응답 전체를 narrative로 취급하는 "raw fallback" 모드 추가.

3. **12개 프롬프트 간 출력 키 이름 불일치 (P-02)**: 프롬프트 개별 수정 시 `chief_problems` vs `chiefProblems` 같은 키 불일치 발생 → D-26 null 방어 경로 파손. 대응: Dual-Layer JSON 스키마 템플릿을 먼저 확정하고 12개 파일 모두에 동일 스키마 참조 헤더 삽입.

4. **onError 누락**: Sub-WF Execute Workflow 노드에 `onError: continueRegularOutput` 미설정 시 한 섹션 실패가 WF2 전체를 중단. → WF2_IMPROVEMENT_PLAN_v2의 FIX-5 참조.

5. **Phase 2 fallback 문자열 오해**: D-26 fallback 메시지("[S02 미생성 — ...]")가 AI user message에 삽입될 때, AI가 이를 면담 데이터로 오해하지 않도록 `[SYSTEM NOTE: ...]` 형식으로 구분.

**HTML 변환 엣지 케이스:**

6. **escapeHtml 범위**: 현재 `& < >` 3개만 처리. narrative 내 큰따옴표(`"`)는 JSON 필드로 이미 이스케이프되므로 HTML 수준에서 추가 처리 불필요. 단, 약물 용량 표기에서 `<10mg`, `>50mg` 같은 패턴이 HTML에서 올바르게 렌더링되는지 확인.

7. **줄바꿈 처리**: narrative의 `\n` → `<br>`, `\n\n` → `</p><p>` 변환 로직을 HTML 변환 노드에 명시. 현재 미구현 확인 필요.

### 19-3. 운용 단계 유의사항

| 마찰 포인트 | 내용 | 대응 |
|------------|------|------|
| **대기 시간 5분** | Phase 1+2 합산. 당직 중 체감 | Telegram ① 알림에 "예상 5분" 명시로 기대치 관리 |
| **Halluc 경고 대응 부재** | 보고서 받고 발표 급한데 Halluc 경고 시 행동 지침 없음 | §18에 "Halluc issue 발견 시: ① 해당 문장 삭제 ② [확인 필요] 표시 후 발표" 추가 필요 |
| **모바일 보고서 수정 한계** | 12섹션 분량을 모바일 Docs에서 수정은 비현실적 | §18에 "모바일: Halluc 이슈 확인 + 진단명 검토만. 상세 수정은 PC에서" 명시 |
| **Drive 용량** | 음성 파일(~20MB/건) 위주로 ~700건 후 15GB 한도 도달 | 음성 파일 정기 아카이빙 전략 필요 (Phase 5) |

### 19-4. 확장성 유의사항

- **다른 진단군**: 12섹션 구조는 정신건강의학과 Case Conference 특화. 다른 과 확장 시 섹션 정의를 설정 파일로 외부화하는 근본적 구조 변경 필요.
- **환자 수 증가**: 현재 평면 폴더 구조는 환자 100명까지 무난. 이후 GDrive 파일 목록 조회 성능 저하 가능.
- **모델 교체 주기**: Claude/Gemini 모델 업데이트 시 D-28 필수 적용 + 12개 프롬프트 호환성 검증(~30분/회).

---

## 20. AI Agent 노드 전환 계획 (D-29) (rev.2 신규)

### 배경

현재 Sub-WF 12개 + Halluc 검증 노드가 HTTP Request로 Claude API를 직접 호출 중.
CLAUDE.md 절대 규칙(AI Agent 노드 필수)에 불일치 상태.
세션 10에서 일괄 전환 예정.

### 전환 대상

| 대상 | 수량 | 전환 우선순위 | 비고 |
|------|:----:|:-----------:|------|
| Sub-WF S01~S12 AI 호출 | 12개 | 세션 10 | 프롬프트 재설계(세션 9) 후 |
| Halluc 검증 노드 | 1개 | **즉시 가능** | Gemini Flash 동시 대체 가능(D-30) |

### 전환 구조

```
[Execute Workflow Trigger]
  ↓
[입력 수신 (Code)]
  ↓
[AI Agent 노드]  ← system_prompt_section_XX.md 내용 → System Message 필드
      ↓
  [Chat Model]  ← Google Gemini Pro / Claude Sonnet (선택)
      ↓
[출력 파싱 + Dual-Layer 검증 (Code)]
  ↓
[return 결과]
```

### 기술적 주의사항

1. **System Message 이식**: HTTP Request의 `messages[0].content(system)` → AI Agent의 "System Message" 필드에 그대로 복사.

2. **JSON 출력 강제 방법**:
   - Gemini 사용 시: Chat Model 서브노드 → `response_mime_type: "application/json"` 설정 (**권장**)
   - Claude 사용 시: 프롬프트에 "반드시 JSON만 출력" 지시 + Output Parser 노드 연결

3. **예외 근거 기재**: 기존 HTTP Request 노드의 Notes에 전환 완료 시 삭제 예정임을 명시.
   ```
   [Notes 예시]
   "예외 상태: D-29 계획에 따라 세션 10에서 AI Agent 노드로 교체 예정.
   임시 HTTP Request 유지 이유: 세션 9 프롬프트 재설계 중 변수 분리"
   ```

4. **max_tokens / temperature**: AI Agent → Chat Model 서브노드 → Advanced Options에서 동일하게 설정.

5. **변수 분리 원칙**: 세션 9(프롬프트 변경)와 세션 10(노드 전환)을 분리하여 QC 점수 변화 원인을 식별 가능하게 유지.

### 세션 10 전환 순서

```
1. Halluc 검증 노드 → AI Agent + Gemini Flash (먼저, 가장 단순)
2. Sub-WF S01~S08 전환 (Phase 1, 독립 섹션)
3. E2E 테스트 (Phase 1 섹션만)
4. Sub-WF S09~S12 전환 (Phase 2, 의존 섹션)
5. D-26 null 방어 코드 재확인
6. 전체 E2E 테스트
```

---

## 21. Google Gemini 모델 레지스트리 (D-30) (rev.2 신규)

### 사용 가능한 Gemini 모델 (Google AI Studio 확인 기준, 2026-04-01)

| 모델명 | 포지션 | PsyCaseAuto 용도 |
|--------|--------|-----------------|
| `gemini-3.1-pro-preview` | 최고 품질 | Sub-WF 보고서 생성 (Claude Sonnet 대체 후보) |
| `gemini-3-pro-preview` | 고품질 | Sub-WF 보고서 생성 (대체 후보 2순위) |
| `gemini-3.1-flash-preview` | 빠름·저비용 | **Halluc 검증 (Haiku 대체 1순위)** |
| `gemini-3-flash-preview` | 빠름·저비용 | Halluc 검증 (대체 2순위) |
| `gemini-3.1-flash-lite-preview` | 초경량 | 단순 파싱용 (보고서 생성에는 부적합) |
| `gemini-3.1-flash-live-preview` | 실시간 스트리밍 | PsyCaseAuto에 불필요 |
| `gemini-3.1-flash-image-preview` | 이미지 입출력 | PsyCaseAuto에 불필요 |
| `gemini-flash-latest` | 최신 Flash alias | 안정성 불명확, 프로덕션 주의 |

### 전환 전략

```
단계 1 (세션 10 즉시): Halluc 검증 → gemini-3.1-flash-preview
단계 2 (세션 11):      Sub-WF 보고서 → gemini-3.1-pro-preview 테스트
단계 3 (QC 비교):      Claude Sonnet QC 점수 vs Gemini Pro QC 점수 비교
단계 4:                높은 점수 모델로 확정 (동점 시 Claude 유지)
```

> ⚠️ **변수 분리 원칙**: Claude 기준선 QC(세션 11 1차) 확보 전 보고서 생성 모델 전환 금지.
> Gemini Flash 적용(Halluc 검증)은 보고서 품질과 무관하므로 즉시 가능.

### Google AI Studio 크레딧 현황

| 항목 | 내용 |
|------|------|
| 크레딧 잔액 | ₩467,993 (~$340) |
| 월 예상 소비 | ~₩15,000~20,000 (Gemini Flash Halluc 검증만) |
| 예상 소진 | 약 23~31개월 |
| 우선 활용 | Halluc 검증(Haiku 대체) → QC 비교 테스트 |

### n8n Credential 설정

- Google Gemini Chat Model 사용 시: n8n의 **Google Gemini(PaLM) API** credential 필요
- API Key: Google AI Studio → API Keys에서 발급
- n8n Chat Model 노드: `Google Gemini Chat Model` → Model Name에 위 표의 모델명 입력

---

## 부록

### 워크플로우 레지스트리

| WF        | ID                 | 상태             |
| --------- | ------------------ | -------------- |
| WF3 Error | `4ox2lxKl1st6pUkY` | ✅              |
| WF1-B STT | `XElVH6RbgWCGZcjO` | ✅              |
| WF2 메인    | `LiN5bKslyWtZX6yG` | ✅ (프롬프트 튜닝 필요) |
| S01~S12   | 별도 12개             | ✅              |

### 자격증명

| 이름           | ID                 | 비고 |
| ------------ | ------------------ |----|
| Telegram     | `8T0Q83WRhTEEdvSL` | PsyCaseAuto Bot |
| Google Drive | `fcKtWyui68XESQND` | Drive 읽기/쓰기 |
| Anthropic    | `RiXuEl0fGr0aAGNz` | Claude HTTP Request (→ D-29 전환 후 AI Agent로 대체) |
| Google Gemini | 미설정 (세션 10 추가 예정) | AI Studio API Key, `Google Gemini(PaLM) API` credential |

### 참조 파일

| 파일                                          | 용도            |
| ------------------------------------------- | ------------- |
| `PROJECT_PLAN_v3.1.md`                      | 종합 기획안 (SSOT) |
| `PROGRESS_LOG.md`                           | 작업 진척 기록      |
| `quality_check_prompt.md`                   | QC 채점 프롬프트    |
| `system_prompt_section_XX.md` × 12          | 섹션별 프롬프트      |
| `20230927_Case_conference_R2_임지원_mdd_.docx` | Gold Standard |

---

> **Claude Code 주의**: §2 의사결정은 확정. 변경 시 사용자 논의 후 이 문서 먼저 업데이트. 코드보다 기획이 먼저.
