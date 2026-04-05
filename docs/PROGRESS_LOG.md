---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

---

### 세션 35 — Step 5-0 + Step 5-1: QC v2.1 + GS2 구조 분석 (2026-04-06)

#### Step 5-0 완료: QC 프롬프트 v2.1

`system_prompt_quality_check_v2.md` v2.0 → v2.1 업데이트:
- **C-2 FP 채점 기준**에 `absence_assumption` TP/FP 구분 표 추가
  - TP: STT 원문에 해당 항목 언급 없는데 "none"/"(-)"로 단정 기재 → Halluc Check 정당 탐지
  - FP: 원문에 "없다" 명시 or 임상 맥락상 당연 → Halluc Check 오탐
- **Constraint 10** 신규 추가: "absence_assumption은 FP가 아니다" 명시 (세션 27·29 반복 오류 재발 방지)

---

#### Step 5-1 완료: GS2 구조 분석 + 프롬프트 커버리지 갭

##### 5-1a. GS1 vs GS2 섹션별 구조 비교

| 섹션 | GS1 (MDD, R2) | GS2 (Bipolar I+AUD, R1) | 주요 차이 |
|------|:---:|:---:|----------|
| I. Identifying Data | 10줄, By. 환자/남편/환모 | 10줄, By. 환자/환모/언니 | 정보원 구성 상이 (남편→언니) |
| II. Chief Problems | 15줄, 3증상, Remote/Recent | 20줄, 4증상, Onset/Aggravation | **Aggravation 필드 신규** |
| Informants & Reliability | 4줄, 3명 | 7줄, 3명 | GS2 더 상세 |
| III. Present Illness | 산문 5단락 | 산문 3단락 | 형식 유사 |
| IV. Past History | 12줄 (Lipase 1건) | 17줄 | **AUD 세부 항목 신규**: Binge drinking 빈도·양, Last drinking, Smoking 연수, Lab finding 4건, 가족력 2개 진단 |
| V. Personal History | 15줄 | 15줄 (내용 훨씬 상세) | 분량 유사하나 서술 밀도 높음 |
| VI. MSE | 48줄, 항목 1~6 + Mood chart | 54줄, **항목 1~9** | **7. Impulsivity 섹션 신규** (자살위험도 중, 위협 행동 중) |
| VII. Diagnostic Formulation | 단일 진단 1줄 | **3개 진단 3줄** | Bipolar I + AUD + Alcohol withdrawal — 다중 진단 형식 |
| VIII. Progress (GS2 "III." 오타) | 50줄, HD#2/5/8, 진단적 평가 1회 | 76줄, HD#2/6/7/10, 진단적 평가 반복 | 진단적 평가 블록 여러 Note에 걸쳐 반복 |
| IX/X. SW·심리팀 | 비어있음 | 비어있음 | 동일 |
| XI. Case Formulation | 26줄, BPS+강약점 | 28줄, BPS+Strength+P4+Bio/Psycho/Social/Prognosis | GS2 세부 구조 더 완전 |
| XII. Psychodynamic | 4줄 (짧음) | **9줄, 산문 7단락** | GS2 훨씬 상세한 산문 |

**GS2 입원 시 scale**: `BDI 6 / BAI 19 / MDQ 8+ / AUDIT 33` (GS1: `BDI 35 / BAI 34 / MDQ 4개`)
- GS2 MDQ 표기: `8+` (GS1은 `4개`) → 표기 방식 상이
- GS2 AUDIT 추가 (AUD 케이스 특유)

##### 5-1b/c. 프롬프트 커버리지 갭 목록

| # | 섹션 | 갭 내용 | 리스크 | 조치 방향 |
|---|------|---------|:------:|----------|
| G-1 | **S10** | 다중 진단(3개) 형식 미규정. 현재 "주진단명 한 줄" 규칙만 있음. Bipolar I + AUD + Withdrawal 3줄 출력 방식 없음 | **HIGH** | S10 프롬프트에 다중 진단 형식 추가 |
| G-2 | **S02** | `Aggravation)` 필드 미규정. 현재 Remote/Recent 이분법만 있음. 증상 지속 중 악화 시점 별도 표기 패턴 없음 | **MID** | S02 Constraints에 Aggravation) 패턴 추가 |
| G-3 | **S08** | ① 입원 시 scale에 AUDIT 미규정 (AUD 케이스) ② MDQ 표기 방식 불일치 (`4개` vs `8+`) ③ 진단적 평가 블록(선택적) 미규정 | **MID** | QC 후 점수 보고 대기, 필요 시 S08 수정 |
| G-4 | **S09** | AUD 타임라인 서술 방식 미규정. 현재 GS1(MDD) 예시만 있음. 음주량 증가 경과 특유의 서술 패턴 없음 | **MID** | Step 5-7(조건부) 대기 |
| G-5 | **S04** | Last drinking 날짜, Smoking 연수 세부 형식 불명확. alcohol_substance 항목은 있으나 빈도·양 상세 형식 예시 없음 | **MID** | QC 채점 후 감점 여부 확인 |
| G-6 | **S11** | GS2 Case Formulation에 `Strength` 항목 명시. S11 프롬프트 반영 여부 미확인 | **LOW** | Step 5-5 E2E 후 출력 확인 |
| G-7 | **S12** | GS2 산문 7단락 vs GS1 4줄 — 길이 차이 큼. S12 프롬프트가 짧은 출력으로 학습된 경우 과소 출력 가능성 | **LOW** | Step 5-6 QC 채점 후 확인 |

> **G-1(S10 다중 진단)이 유일한 HIGH 리스크** — Step 5-5 E2E 전 수정 권장

##### 5-1d. 여자친구 확인 필요 항목 (최종 3건)

| # | 항목 | 현재 상태 | 확인 필요 이유 | S08 수정 여부 영향 |
|---|------|----------|--------------|-----------------|
| Q-1 | **Progress Notes 진단적 평가 블록** | 제작자 유추: trait 의심 시 선택적 시행 | GS1·GS2 모두 존재 → 표준 블록인 듯하나 미확인 | ⭐ S08 프롬프트 수정 여부 결정 |
| Q-2 | **Personal History 상세도** | 제작자 유추: 케이스별 필요 시 | GS2가 GS1보다 현저히 상세 — 표준 기준 불명확 | S05 길이 기준 설정 |
| Q-3 | **다중 진단 표기 순서·형식** | 미확인 | GS2: `Bipolar I / AUD / Alcohol withdrawal` 3줄 — 이 순서(주진단→동반→급성)가 표준인지 | S10 수정 방향 결정 |

---

### 세션 33 — s34-a2 systemMessage 구조 분석 + passed 기준 추가 (2026-04-05)

#### 배경

이전 세션에서 비행기 탑승으로 작업 중단 → 데스크탑 Claude Code가 s34-a2 수정을 시도했으나 중단. 해당 수정사항(Claude.ai 검토본)이 현재 n8n에 적용되어 있는지 점검.

#### 조사 결과: 예상과 다른 구조 발견

n8n WF2 s34-a2 노드에 **systemMessage가 2개** 존재함:

| 필드 위치 | 내용 | n8n 실제 사용 여부 |
|----------|------|:-----------------:|
| `parameters.options.systemMessage` | v3.md 내용 (올바른 섹션 매핑) | **YES (실제 작동)** |
| `parameters.systemMessage` | 구버전 ([개선 1-7], 잘못된 섹션 매핑) | NO (dead field) |

#### 제안된 변경사항 검토 결과

Claude.ai가 제안한 7개 변경사항 중 **6개 이미 적용**, 1개만 누락:

| 항목 | 상태 |
|------|:----:|
| 섹션 매핑 수정 (S04=Past/Family, S07=Mood Chart, S09=Present Illness) | ✅ 이미 적용 |
| FP 방어 6 (NSSI/SA 구분) | ✅ 이미 적용 |
| severity_distortion 하향 변조 탐지 | ✅ 이미 적용 |
| context_truncated 우선순위 정정 (S09, S04, S06) | ✅ 이미 적용 |
| FP 방어 8 (물질 사용) | ✅ 이미 적용 |
| **`passed` 명시적 판정 기준** | ❌ **누락 → 이번에 추가** |

#### 적용 내용 (s34-a2 시스템 프롬프트 v3.1 패치)

`passed` 판정 기준 명시 추가:
- `passed: false` — critical 또는 major 이슈 1개 이상
- `passed: true` — issues 비어 있거나 minor만 존재
- 적용: `docs/prompts/s34-a2_system_prompt_v3.md` + n8n WF2 s34-a2 노드 (`patchNodeField` 성공)

#### E2E 판단: 불필요

보고서 생성 로직 변경 없음. 기존 암묵적 규칙의 명시화(additive). GS2 E2E(Step 5-5) 시 자연스럽게 검증됨.

---

### 세션 32 — GS2 추가 의사결정 + 아카이브 정리 (2026-04-05)

#### 배경

사용자 여자친구(정신건강의학과 R1)가 **본인이 직접 작성한** Case Conference 보고서(`260401_Case conference_R1_문혜린.docx`)를 제공. 기존 Golden Standard (GS1: `20230927_Case conference_R2_임지원(mdd).docx`)에 추가하여 **2-case 검증 체계** 구축 검토.

#### GS2 분석 결과

| 항목 | GS1 (임지원 R2, MDD) | GS2 (문혜린 R1, Bipolar+AUD) |
|------|---------------------|----------------------------|
| 글자 수 | 17,546자 / 199줄 | 21,227자 / 251줄 |
| 작성자 | R2 (타인) | **R1 (사용자 본인)** ⭐ |
| 주 진단 | MDD, 단일 삽화 | **Bipolar I (manic) + AUD severe** |
| 정보제공자 | 2명 (환자, 어머니) | **3명** (환자, 어머니, 언니) + 각각 reliability |
| Present Illness | 비교적 단순, 선형 서사 | **매우 복잡** (알코올, 성문제, 부부갈등, 법적 이슈) |
| Past History | 간략 | **상세** (Lab findings, 알코올 금단 경련, 다수 내과) |
| Personal History | 요약형 | **발달단계별 매우 상세** (Early~Adult 각 2000자+) |
| MSE | 우울 양상 | **Bipolar manic** (pressured speech, grandiosity, lability) |
| Progress Notes | SOAP 형식 | SOAP + **"진단적 평가" 블록** (Cluster B trait) |
| 섹션 구조 | I~XII 완비 | I~XII 완비 (동일) |

#### 핵심 의사결정

| # | 결정 | 근거 |
|---|------|------|
| D-34 | GS2를 두 번째 Golden Standard로 추가 | Contamination-free 검증 + 진단 다양성 + 작성자 신뢰도 |
| D-35 | GS2 기반 Mock 면담 JSON 제작 필요 | 보고서만으로는 WF 테스트 불가, 역공학 필요 |
| D-36 | Mock에 노이즈 정보 5~10% 추가 | 보고서 1:1 대응 방지 → AI 정보 선별 능력 검증 |
| D-37 | 프롬프트 수정은 GS2 QC < 75점일 때만 | 양쪽 GS 모두 regression 통과 필수 |
| D-38 | Step 4-6(실환자 테스트) 전에 GS2 E2E 먼저 | 실환자 투입 전 시스템 약점 사전 파악 |

#### Contamination 분석

| 항목 | 설명 |
|------|------|
| **현재 문제** | QC 90.5(Tier 2), 86.5(Tier 3), 89(Halluc v3.1) — 모두 GS1(PT-2026-001)로 측정 |
| **편향** | 12개 프롬프트가 이 데이터에 맞춰 반복 튜닝 → 점수 과대추정(overfit) |
| **GS2 가치** | 프롬프트 개발에 전혀 노출 안 된 **진정한 out-of-sample 테스트** |
| **예상** | GS2 기반 QC는 GS1 대비 **5~15점 하락** 가능 — 이것이 실제 성능 |

#### 프롬프트 커버리지 갭 예상

| 섹션 | 리스크 | 이유 |
|------|--------|------|
| S02 (Chief Problems) | 중 | 3명 정보원 각각 기재 → 형식 차이 가능 |
| S06 (MSE) | 중 | Manic features 어휘가 프롬프트 예시에 충분한지 미확인 |
| S08 (Progress Notes) | 높음 | "진단적 평가" 서브블록 → 현재 프롬프트에 규정 없음 |
| S09 (Diagnostic Formulation) | 높음 | Bipolar 감별 추론 필요 + Cluster B 고려 |

#### GS2 문서 특이사항

1. **Progress Notes "III. Progress"**: 번호가 III로 표기 (VII 또는 VIII이어야 정상) — 오타일 가능성, 여자친구 확인 필요
2. **진단적 평가 블록**: GS 표준 형식인지 vs 이 케이스 특유의 추가인지 확인 필요
3. **날짜 타임라인**: 입원 추정일 2026-03-17~18 (Lab), MSE 2026-03-25, 보고서 2026-04-01

#### 아카이브 정리

- 세션 23~31 → `docs/PROGRESS_LOG_archive_s23-s31.md` 이관
- milestone.md → Tier 1~4 완료 항목 압축, Tier 5 (GS2) 세부 단계 추가

#### 다음 작업

- Tier 5 Step 5-1: GS2 vs GS1 구조 분석 + 프롬프트 커버리지 확인

---

> **아카이브**: 세션 8~13 → `docs/PROGRESS_LOG_archive_s08-s13.md`
> **아카이브**: 세션 13~22 → `docs/PROGRESS_LOG_archive_s13-s22.md`
> **아카이브**: 세션 23~31 → `docs/PROGRESS_LOG_archive_s23-s31.md`
> **D-번호 canonical**: `docs/PROJECT_PLAN_v3.1.md` §2가 유일한 권위입니다.
