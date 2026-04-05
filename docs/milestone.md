# PsyCaseAuto — Milestone v3 (세션 32~)

> **작성일**: 2026-04-05 | **최종 업데이트**: 2026-04-05
> **기준**: PROJECT_PLAN_v3.1 rev.3 + D-34~D-38 (GS2 추가 의사결정)
> **이전 Milestone**: v2 Tier 1~4 (세션 14~31) — **Step 4-3b까지 완료**

---

## 현재 상태 요약

| 항목 | 상태 |
|------|------|
| 12개 Sub-WF 프롬프트 (Dual-Layer) | ✅ 완성 |
| WF2 보고서 생성 (72노드) + E2E | ✅ 완료 |
| Halluc 검증 프롬프트 v3.1 (FP 방어 1~8) | ✅ 완료 |
| QC 최종: 보고서 86.5/100, Halluc 89/100 | ✅ (GS1 기준, overfit 가능) |
| **다음 작업** | 🔴 **Tier 5: GS2 추가 + Contamination-free 검증** |

---

## 완료 항목 (Tier 1~4) — 압축

> **상세**: `docs/PROGRESS_LOG_archive_s23-s31.md` 및 이전 아카이브 참조

| Tier | 내용 | QC | 세션 |
|------|------|:--:|:----:|
| 1 | s34-c4 HTML 변환 수정 ([U] 태그, sectionMap) | — | 14 |
| 2 | 프롬프트 미세조정 5섹션 + QC 2차 | 90.5/A | 15~22 |
| 3 | Gemini Flash 전환 (6섹션, ~$0.62/run) | 86.5/A | 23~24 |
| 4-0 | p2-merge Safety 배너 (`HIGH_SUICIDE_RISK`) | — | 25 |
| 4-1 | HTML→Docs 변환 검증 | — | 25 |
| 4-2 | §18 운용 문서 보완 (Halluc 경고, 모바일 한계) | — | 25 |
| 4-3 | Halluc 프롬프트 v3.1 + 원문 절단 수정 + parse_error 수정 | 89/A | 25~29 |
| 4-3b | [추론] 태그 CSS (회색 이탤릭 + 인쇄 숨김) + 정적 검증 | — | 30~31 |

**보류 중 항목**:
- Step 4-4 (WF1-A 설문지 경로): 토큰 소모 과다 → 영구 보류
- Step 4-5 (Gemini Pro vs Sonnet QC 비교): 현재 비용 허용 범위 → 영구 보류
- Step 4-6 (실사용 테스트): **Tier 5 완료 후** 진행 (D-38)

---

## 설계 원칙

| 원칙 | 이유 |
|------|------|
| **Tier = 우선순위 + 의존성** | Tier 1 → 2 → 3 → 4 → 5 순서로 진행 |
| **Step = Claude Code 1세션 단위** | AI 집중력 유지, 디버깅 가능 시점에서 끊기 |
| **Step 내 Task ≤ 5개** | 컨텍스트 과부하 방지 |
| **각 Step에 ✅ 검증 포인트** | 다음 Step 진행 전 반드시 확인 |
| **Claude.ai → Claude Code 역할 분리** | 프롬프트 다듬기(ai) → 적용(code) |
| **2-case regression (D-37)** | 프롬프트 변경 시 GS1 + GS2 양쪽 75점+ 통과 필수 |

---

## Tier 5 — GS2 Golden Standard 추가 + Contamination-free 검증

> **전제**: Tier 4 Step 4-3b 완료 ✅
> **목표**: GS2(Bipolar+AUD) 기반 out-of-sample E2E → 시스템 실제 일반화 성능 측정
> **의사결정**: D-34~D-38 (PROGRESS_LOG 세션 32 참조)

### Step 5-0: QC 프롬프트 v2.1 준비 (Step 5-6 전 필수)

> **역할**: Claude Code (파일 수정)
> **예상 소요**: Step 5-1과 동일 세션 가능
> **근거**: Claude.ai QC에서 `absence_assumption` 오분류가 세션 27, 29에서 반복 → 3회째 반복 방지

| Task | 내용 |
|------|------|
| 5-0a | `system_prompt_quality_check_v2.md`에 `absence_assumption`을 공식 5번째 type으로 명시 |
| 5-0b | 판정 예시 2~3개 추가 (부재 가정의 FP/TP 구분) |

**✅ 검증 포인트**: QC 프롬프트 내 absence_assumption 언급 + 예시 존재

---

### Step 5-1: GS2 구조 분석 + 프롬프트 커버리지 점검 ← 현재 위치

> **역할**: Claude Code (분석) + 사용자 (여자친구 확인 요청)
> **예상 소요**: 1세션

| Task | 내용 | 담당 |
|------|------|------|
| 5-1a | GS2 vs GS1 섹션별 구조 비교 (I~XII, 형식·길이·항목 차이) | Claude Code |
| 5-1b | 12개 프롬프트에서 Bipolar/AUD/다중정보원 커버리지 점검 | Claude Code |
| 5-1c | 커버리지 갭 목록 작성 (빈칸 = 프롬프트 미규정 영역) | Claude Code |
| 5-1d | 여자친구 확인 필요 항목 정리 → 전달 | 사용자 |

**여자친구 확인 필요 항목 (예상)**:
- Progress Notes "진단적 평가" 블록: **모든 Case Conference의 표준 형식인가, 이 케이스 특유인가?** ⭐ (S08 프롬프트 수정 여부 결정)
- "III. Progress" 번호 오류: 오타인가 의도적인가?
- Personal History 상세도: R1 표준인가, 이 케이스가 특별히 상세한 것인가?

**✅ 검증 포인트**:
- 갭 목록 완성 (섹션별 리스크 high/mid/low 분류)
- 여자친구 확인 요청 항목 정리 (3~5개 이내)

---

### Step 5-2: Mock 면담 JSON 생성 — 초진

> **역할**: Claude.ai (구어체 생성) → Claude Code (JSON 구조화 + 배치)
> **예상 소요**: 1세션
> **핵심 제약 (D-36)**: 노이즈 정보 5~10% 추가, 보고서 문장 그대로 복사 금지

| Task | 내용 | Hallucination 방지 |
|------|------|-------------------|
| 5-2a | GS2 I~VI + MSE → 초진 면담 구어체 역공학 | GS2 원문 대조 필수 |
| 5-2b | 환자·어머니·언니 3명 면담 세그먼트 분리 | 정보원별 reliability 반영 |
| 5-2c | 노이즈 정보 추가 (보고서 미수록 사항 5~10%) | 추가 항목 목록화 |
| 5-2d | Manic episode 특성 반영 (pressured speech, circumstantiality) | GS2 MSE 참조 |
| 5-2f | **대화 형태 설계**: 환자가 질문에 직접 답하지 않고 돌려 말하는 패턴, 비선형 주제 전환 반영. 단순 정보 나열이 아닌 실제 면담 대화 흐름으로 구성 | GS2 MSE circumstantiality(+) |
| 5-2e | PT-2026-002 코드 부여 + `stt_YYYYMMDD.json` 포맷 준수 | 기존 PT-001 구조 참조 |

**✅ 검증 포인트**:
- JSON 파싱 성공 (`JSON.parse` 에러 없음)
- `full_text` 4000~6000자 (너무 짧으면 AI 입력 불충분)
- 환자 구어체 자연스러움 (임상 용어 대신 일상 표현 사용)
- WF1-B 입력 형식 호환 확인 (data_type, patient_code, interview_type 필드)

---

### Step 5-3: Mock 면담 JSON 생성 — 경과

> **역할**: Claude.ai → Claude Code
> **예상 소요**: Step 5-2와 동일 세션 가능 (총량에 따라 분리)

| Task | 내용 | Hallucination 방지 |
|------|------|-------------------|
| 5-3a | GS2 Progress Notes (HD#2, HD#6 등) → 경과 면담 역공학 | 날짜·HD# 정합성 필수 |
| 5-3b | 보호자 면담 포함 (특히 언니 — GS2에서 가장 상세한 정보원) | GS2 Informants 참조 |
| 5-3c | 날짜 타임라인 검증 (입원일 ~03-17, MSE 03-25, 보고서 04-01) | Lab dates 역산 |
| 5-3d | JSON 구조 검증 + test_data 배치 | PT-001 구조 참조 |

**✅ 검증 포인트**:
- 2개 JSON (초진 + 경과) 모두 파싱 성공
- `test_data/PT-2026-002/interviews/` 폴더에 정상 배치
- 날짜 정합성: 초진 ≤ 경과 면담 ≤ MSE ≤ 보고서 날짜

---

### Step 5-4: Mock JSON 임상 검수 (여자친구)

> **역할**: 사용자 (여자친구에게 전달 + 피드백 수집)
> **예상 소요**: 대기 시간 포함 1~3일 (모바일 중심 사용자)
> **⚠️ 이 Step은 사용자 주도 — Claude Code 대기**

| Task | 내용 | 담당 |
|------|------|------|
| 5-4a | Mock JSON 모바일 전달 (Telegram 또는 카톡) | 사용자 |
| 5-4b | 검수 기준: "실제 이 환자 면담이면 이런 대화 가능한가?" | 여자친구 |
| 5-4c | 특히 Manic episode 환자 말투 (pressured, tangential) 현실성 | 여자친구 |
| 5-4d | 피드백 수집 → 반영 수정 | Claude Code |

**✅ 검증 포인트**:
- 여자친구 "대체로 괜찮다" 승인
- 치명적 임상 오류 없음 확인 (증상-진단 불일치, 타임라인 모순 등)

---

### Step 5-5: WF2 E2E 실행 (GS2 데이터)

> **역할**: Claude Code (Pin 교체 + 실행 + 확인)
> **예상 소요**: 1세션
> **비용**: ~$0.62/run

| Task | 내용 | 디버깅 포인트 |
|------|------|-------------|
| 5-5a | WF2 Execute Workflow 노드 Pin 데이터 교체 (PT-001 → PT-002) | Pin JSON 형식 호환 |
| 5-5b | E2E 실행 (WF2 Manual Trigger) | Execution 에러 확인 |
| 5-5c | HTML 출력 검증: 12섹션 모두 생성, 형식 이상 없음 | s34-c4 출력 확인 |
| 5-5d | Halluc check 검증: `parse_error: false`, `sections_checked: S01~S10` | s34-a2/a3 출력 확인 |
| 5-5e | 출력 파일 Google Drive 저장 확인 | Drive 노드 에러 확인 |

**✅ 검증 포인트**:
- HTML 파일 정상 생성 (빈 섹션 없음)
- Halluc check JSON: `parse_error: false`
- n8n Execution 상태: Success (에러 노드 없음)

**예상 이슈 (디버깅 대비)**:
- S08 "진단적 평가" 블록 미생성 또는 SOAP A란 혼합
- S02 3명 정보원 형식 처리 오류
- S05 Personal History 과도하게 긴 입력 → 요약 품질 저하
- S09 Bipolar 감별 추론 불충분

---

### Step 5-6: GS2 QC 채점 (Claude.ai)

> **역할**: Claude.ai (QC 채점) → Claude Code (기록)
> **예상 소요**: 1세션

| Task | 내용 | 기준 |
|------|------|------|
| 5-6a | 보고서 QC: AI 초안 vs GS2 섹션별 비교 | `system_prompt_quality_check_v2.md` |
| 5-6b | Halluc check QC: halluc JSON 품질 평가 | 기존 5개 기준 (A~E) |
| 5-6c | Contamination gap 정량화: GS1 vs GS2 점수 차이 분석 | |
| 5-6d | 감점 패턴 분류 (프롬프트 갭 vs 모델 한계 vs 데이터 특성) | |

**✅ 검증 포인트**:
- 보고서 QC 점수 기록 (목표: 75점+)
- Halluc QC 점수 기록 (목표: 75점+)
- GS1-GS2 점수 차이 분석 → Contamination 영향 정량화
- 감점 패턴 3개 이상 구체적 기록

---

### Step 5-7: 프롬프트 수정 (조건부)

> **조건**: GS2 QC < 75점일 때만 진행
> **역할**: Claude.ai (설계) → Claude Code (n8n 적용)
> **핵심 제약 (D-37)**: GS1 + GS2 양쪽 regression 통과 필수

| Task | 내용 | 담당 |
|------|------|------|
| 5-7a | 감점 패턴별 수정안 도출 (Claude.ai) | Claude.ai |
| 5-7b | 프롬프트 수정 → n8n 적용 (Claude Code) | Claude Code |
| 5-7c | GS1 E2E 재실행 → QC (regression) | Claude Code + Claude.ai |
| 5-7d | GS2 E2E 재실행 → QC (개선 확인) | Claude Code + Claude.ai |

**✅ 검증 포인트**:
- GS1 QC ≥ 75 AND GS2 QC ≥ 75 (양쪽 통과)
- GS1 점수 하락 5점 이내 (seesaw 효과 방지)
- 모델 변경은 프롬프트 수정으로 해결 안 될 때만 검토

---

### Step 5-8: 2-case regression framework 구축

> **역할**: Claude Code
> **예상 소요**: Step 5-6 또는 5-7과 동일 세션 가능

| Task | 내용 |
|------|------|
| 5-8a | GS1/GS2 Pin 데이터 세트 정리 (각각 Execute Workflow 노드 Pin) |
| 5-8b | regression test 절차 문서화: "프롬프트 변경 → GS1 E2E + GS2 E2E → 양쪽 75+" |
| 5-8c | QC 점수 이력 테이블 초기화 (GS1/GS2 × 보고서/Halluc 4칸) |

**✅ 검증 포인트**:
- 절차 문서 완성 (milestone 또는 PROJECT_PLAN에 기록)
- Pin 데이터 세트 2개 존재 확인

---

## 이후 작업 (Tier 5 이후)

### Step 4-6: 실사용 테스트 (Phase 5) — Tier 5 완료 후 (~2주 후)

> **전제**: GS2 기반 E2E + QC 75점+ 달성
> **역할**: 사용자 (실환자 녹음 제공) → WF1-B → WF2 → §18 전공의 수정
> **시점**: 새 환자 내원 예정 (~2주 후)

**사전 준비 (실환자 E2E 전 완료 필수)**:
- Railway 인스턴스 분리 검토: 결혼준비AI와 PsyCaseAuto 공유 → 실환자 데이터 보안 고려
- 전공의 온보딩 1회 (~30분): Telegram→GDrive→Docs 수정→내보내기 전체 워크스루
- s34-a1 원문 크기 모니터링 추가: `originalText.length` Telegram 알림 포함 (silent failure 방지)

실제 환자 녹음 → WF1-B STT → WF2 보고서 생성 → 전공의 §18 절차 검증 → 피드백 수집.

---

## 전체 진행 순서

```
✅ Tier 1 (s34-c4 HTML 수정)
✅ Tier 2 (프롬프트 5섹션 + QC 90.5/A)
✅ Tier 3 (Gemini Flash 전환, QC 86.5/A, ~$0.62/run)
✅ Tier 4 Step 4-0~4-3b (Safety 배너, Halluc v3.1, [추론] CSS)
🔴 Tier 5 Step 5-0 QC v2.1 준비 + Step 5-1 GS2 구조 분석 ← 현재 위치
⬜ Tier 5 Step 5-2~5-3 Mock 면담 JSON 생성
⬜ Tier 5 Step 5-4 여자친구 임상 검수
⬜ Tier 5 Step 5-5 WF2 E2E (GS2)
⬜ Tier 5 Step 5-6 GS2 QC + Contamination gap
⬜ Tier 5 Step 5-7 프롬프트 수정 (조건부: QC < 75)
⬜ Tier 5 Step 5-8 2-case regression framework
⬜ Step 4-6 실사용 테스트
```

---

## Golden Standard 레지스트리

| ID | 파일 | 진단 | 작성자 | 상태 |
|----|------|------|--------|------|
| GS1 | `20230927_Case conference_R2_임지원(mdd).docx` | MDD | R2 임지원 | ✅ 활용 중 (PT-2026-001) |
| GS2 | `260401_Case conference_R1_문혜린.docx` | Bipolar I + AUD | R1 문혜린 (사용자 본인) | 🔴 Mock 생성 대기 |

---

## Claude.ai 요청 시 항상 첨부할 공통 컨텍스트

| 첨부물 | 내용 |
|--------|------|
| 해당 섹션 프롬프트 `.md` 전문 | 수정 대상 프롬프트 |
| Gold Standard 해당 섹션 발췌 | `.docx`에서 해당 섹션 텍스트 복사 |
| QC 감점 사유 | PROGRESS_LOG의 QC 검증 분석에서 해당 항목 |
| QC 프롬프트 v2.0 (선택) | 채점 기준 참조용 |
| **GS2 해당 섹션 (Tier 5~)** | 2-case 비교 시 GS2 발췌도 첨부 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-05 | v3 신규 작성 — v2 Tier 1~4 완료 항목 압축, Tier 5 GS2 세부 단계 추가 (Step 5-1~5-8) |
| 2026-04-05 | D-34~D-38 의사결정 기록 (GS2 추가, Mock 노이즈, regression 기준, 실환자 테스트 순서) |
| 2026-04-05 | Claude.ai 평가 검토 반영: Step 5-0 QC v2.1 추가, Mock 대화 형태 설계(5-2f), Step 4-6 사전 준비(인스턴스 분리·온보딩·원문 모니터링) |
