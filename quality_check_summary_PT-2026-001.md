# Quality Check 결과 요약 — PT-2026-001

> 검사일: 2026-04-01 | Gold Standard: 20230927_Case_conference_R2_임지원_mdd_.docx

---

## 종합 판정

| 항목 | 만점 | 득점 | 비율 |
|------|:----:|:----:|:----:|
| A. 형식 충실도 | 60 | 16.5 | 27.5% |
| B. 사실적 정확성 | 25 | 20 | 80.0% |
| C. Hallucination 검증 | 15 | 8 | 53.3% |
| **합계** | **100** | **44.5** | **44.5%** |

### 등급: C — 다수 프롬프트 수정 후 재생성 필요

---

## 핵심 발견

### 잘한 점 (B등급 — 사실 정확성 80%)
- 원본 면담의 **핵심 사실(인적사항, 약물, 증상, 가족력)을 정확히 추출**
- 환자 실명 노출 없음, 자살 위험도 축소 기재 없음
- source_ref 태깅으로 출처 추적 가능

### 근본적 문제 (A등급 — 형식 충실도 27.5%)

**전체 출력이 JSON 데이터 구조이다.** Gold Standard는 사람이 읽는 임상 보고서 문서인데, AI 초안은 프로그래밍용 데이터 구조로 출력됨. 이것이 모든 형식 문제의 근원.

---

## 섹션별 점수

| 섹션 | 만점 | 득점 | 핵심 문제 |
|------|:----:|:----:|----------|
| A01. Identifying Data | 5 | 1 | JSON key-value → '항목 : 값' 줄 나열 필요 |
| A02. Chief Problems | 5 | 0.5 | 번호+영문 증상명 + Remote/Recent onset 형식 부재 |
| A03. Informants | 3 | 0.5 | 서술형 평가 대신 1줄 요약 |
| **A04. Present Illness** | **12** | **3** | **1단락 narrative + JSON timeline → 4단락+ 연속 산문 FCAB 필요** |
| A05. Past/Family Hx | 4 | 0.5 | 6개 번호 항목 형식 + 투약 형식 부재 |
| A06. Personal History | 5 | 1 | 5단계 발달 소제목 + 서술형 산문 부재 |
| A07. MSE | 5 | 1.5 | 9개 항목 + (+/-) 표기 + Mood/Affect 표준 형식 부재 |
| A08. Mood Chart | 2 | 1.5 | 데이터는 있으나 일부 시점 수치 누락 |
| **A09. Progress Notes** | **5** | **0** | **SOAP 형식 완전 부재. S) 구어체 원문 없음** |
| A10. Diagnostic Formulation | 3 | 2.5 | 형식은 양호, 약간 과도하게 상세 |
| A11. Case Formulation | 5 | 3 | 4P 구조 있으나 Treatment Plan 구체성 부족 |
| **A12. Psychodynamic** | **6** | **2.5** | **narrative + JSON 이중 구조 → 연속 산문만 필요** |

---

## 최우선 수정 대상 3개

### 1위: Progress Notes (0/5점)
**현재**: JSON 구조 (treatment_response, clinical_changes 등)
**필요**: 날짜별 SOAP 형식. S)에 환자 1인칭 구어체 **원문 그대로 인용**

```
2026. 03. 28. (경과 면담)
S) 수면제 덕분에 잠은 조금 더 자는 것 같아요. 5-6시간은 되는 것 같은데,
   자고 나도 개운하진 않아요...
   저는 항상 혼자 있는 게 무서웠어요...
O) Mood: depressed, not irritable, sl. anxious
   Affect: restricted, sad, reactive
   의존 욕구와 버려짐 공포 사이의 갈등이 반복적으로 관찰됨.
P) Medication: escitalopram 10-0-0-0mg / zolpidem 0-0-0-5mg
```

### 2위: Present Illness (3/12점)
**현재**: 1개 단락 narrative + JSON timeline 배열
**필요**: 4개+ 단락의 연속 산문, FCAB 패턴, "내원 N개월 전" 상대 시점

```
내원 6개월 전, 5년간 사귀던 남자친구와 이별한 환자는 처음에는
이별 반응이라는 생각에 별다른 조치 없이 지냈으나 점차 수면 문제가
심해지기 시작했다고 한다. 환자는 자신이 너무 의존적이어서
상대방이 지쳐 떠난 것이라는 생각에 자괴감이 들어...
```

### 3위: Chief Problems (0.5/5점)
**현재**: JSON 구조
**필요**: 번호+영문 증상명 + Remote/Recent onset

```
1. Depressed mood
  - 하루 중 대부분 그리고 거의 매일 지속되는 우울 기분
By. 환자, 환자의 어머니
Remote onset) 내원 6개월 전
Recent onset) 내원 당시 지속 중
```

---

## 프롬프트 전체 개선 방향

### 모든 섹션 공통 지시사항 (최상단 추가)
```
⚠️ 출력 형식 규칙 (최우선 적용)
1. 출력은 반드시 사람이 읽는 임상 보고서 텍스트로 작성하라.
2. JSON 구조, 키-값 쌍, 배열 형식을 절대 사용하지 마라.
3. 예시 보고서의 정확한 형식을 따르라.
4. 각 섹션의 [형식 예시]를 그대로 모방하라.
```

### 섹션별 핵심 수정 사항

| 섹션 | 수정 핵심 |
|------|----------|
| Identifying Data | '항목 : 값' 줄 나열 + 병전 성격 서술형 + By. 표기 |
| Chief Problems | 번호.영문 증상명 + Remote/Recent onset 형식 |
| Informants | 정보제공자별 3문장+ 서술형 평가 + Reliable 판정 |
| Present Illness | 4단락+ 연속 산문 + FCAB + 상대 시점 |
| Past/Family Hx | 6개 번호 항목 + 투약 형식 |
| Personal History | 5단계 소제목 + 서술형 산문 |
| MSE | 9개 번호 항목 + (+/-) 형식 + 표준 용어 |
| Progress Notes | SOAP 형식 + S) 구어체 원문 + O) 관찰/해석 |
| Diagnostic Formulation | 간결한 진단명 한 줄 먼저 |
| Case Formulation | 4P 표 형식 + Treatment Plan 구체화 |
| Psychodynamic | 3단락+ 연속 산문 + 고도 전문용어 |

---

## Hallucination Check 평가 (8/15점)

| 항목 | 결과 |
|------|------|
| False Positive 1건 | 나이 31세 검증 — 실제 오류 아님 |
| False Negative 1건 | PI timeline affect 추론 삽입 미감지 |
| 검증 범위 | 3개 섹션만 검증 — MSE, Dx Formulation 등 누락 |

**Hallucination Check 프롬프트 개선 필요**: 검증 범위를 12개 전체 섹션으로 확대하고, type: inference 미표시된 추론적 문장 감지에 집중하라.
