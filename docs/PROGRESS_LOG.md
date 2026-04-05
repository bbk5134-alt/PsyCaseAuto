---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

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
