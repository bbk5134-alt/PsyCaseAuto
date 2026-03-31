# PT-2026-001 E2E 테스트용 Mock 데이터 업로드 가이드

## 파일 구성

| 파일 | 면담 유형 | 면담 날짜 | 워드 수 |
|------|----------|----------|---------|
| `interviews/stt_20260320.json` | 초진 (initial) | 2026-03-20 | ~4,312 |
| `interviews/stt_20260328.json` | 경과 (followup) | 2026-03-28 | ~3,187 |

## Google Drive 업로드 절차

1. Google Drive 접속 → `PsyCaseAuto/` 폴더 이동
2. `PT-2026-001/` 폴더 생성 (없으면)
3. `PT-2026-001/` 안에 `interviews/` 폴더 생성
4. `interviews/` 폴더 안에 두 JSON 파일 업로드:
   - `stt_20260320.json`
   - `stt_20260328.json`

최종 경로:
```
PsyCaseAuto/
└── PT-2026-001/
    └── interviews/
        ├── stt_20260320.json
        └── stt_20260328.json
```

> **주의**: WF2가 검색하는 폴더명은 정확히 `interviews` (소문자, 복수형) 이어야 합니다.

## E2E 테스트 실행

1. n8n에서 `PsyCaseAuto — WF2 보고서 생성 메인` 워크플로우 **활성화**
2. PsyCaseAuto Telegram 봇에 메시지 전송:
   ```
   PT-2026-001 보고서
   ```
3. 예상 응답 흐름:
   - ✅ "보고서 생성 시작..." 알림
   - Phase 1: S01~S08 순차 생성 (약 2-3분)
   - Phase 2: S09~S12 순차 생성 (약 2-3분)
   - ✅ 완료 알림 (Stage 3-4 구현 후)

## Mock 데이터 설계 포인트

### 12개 섹션 커버리지
| 섹션 | 주요 테스트 내용 |
|------|----------------|
| S01 Identifying Data | 31세 여, 프리랜서, PT-2026-001 |
| S02 Chief Problems | 우울감·불면·수동적 자살사고 (6개월) |
| S03 Informants | 본인 + 어머니, 신뢰도 양호 |
| S04 Past/Family Hx | 충수염 수술, 2021년 GAD, 외할머니 우울 가족력 |
| S05 Personal Hx | 외할머니 주 양육, 성취 압박, 5년 연애 이별 |
| S06 MSE | 정신운동 지연, restricted affect, 수동적 자살사고, 충동성 중등도 |
| S07 Mood Chart | 1-4/10 범위, 초진→경과 소폭 개선 |
| S08 Progress Notes | 초진→1주 경과, Escitalopram 반응 초기 |
| S09 Present Illness | FCAB: 이별 촉발 → 우울 삽화 진행, 1회 자해 이력 |
| S10 Diagnostic | MDD 중등도-중증 + GAD 공존 가능성, DSM-5-TR |
| S11 Case Formulation | 4P 모델: 의존 욕구/대상상실 취약성, 이별 촉발 |
| S12 Psychodynamic | 핵심 갈등(의존 vs 버려짐 공포), 방어기제, 전이 |

### HIGH_SUICIDE_RISK 플래그 테스트
- MSE 충동성 "중등도" → `suicide_risk: '상'` 아님 → 플래그 **미발동** 예상
- 만약 플래그 테스트를 원하면 S06 섹션 MSE 결과에서 `impulsivity.suicide_risk: '상'` 반환 여부 확인

## 파일 형식 참조

WF1-B `STT 결과 정리` 노드 출력 형식과 동일:
```json
{
  "data_type": "stt_transcript",
  "patient_code": "PT-2026-001",
  "interview_date": "YYYY-MM-DD",
  "interviewer": "...",
  "interview_type": "initial | followup",
  "created_at": "ISO 8601",
  "audio_file": "audio_YYYYMMDD.m4a",
  "stt_engine": "gpt-4o-transcribe",
  "language": "ko",
  "duration_seconds": number | null,
  "word_count": number,
  "segments": [],
  "full_text": "..."
}
```
