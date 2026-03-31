# PsyCaseAuto — 진척 로그

> 최종 수정: 2026-04-01

---

## 인프라 결정 사항

### n8n 인스턴스 공유
- 기존 Wedding Schedule Automation 프로젝트와 **동일한 Railway n8n 인스턴스** 사용
- Railway 서비스를 새로 생성하지 않음 — 비용 절감, 관리 단일화

### Telegram 봇 토큰 분리
- 각 프로젝트마다 별도 Telegram Bot 사용 (BotFather에서 각각 생성)
- 환경변수 이름으로 구분:
  ```
  TELEGRAM_BOT_TOKEN_WEDDING=...   ← 기존 웨딩 프로젝트
  TELEGRAM_BOT_TOKEN_PSYCH=...     ← PsyCaseAuto (이 프로젝트)
  ```
- n8n Code 노드에서 접근: `$env.TELEGRAM_BOT_TOKEN_PSYCH`
- n8n Telegram 노드 사용 시: Credentials에 "PsyCaseAuto Bot" 별도 등록

---

## 세션별 작업 기록

### 세션 1A — 인프라 파일 생성 (2026-03-27)

#### 생성 파일

| 파일 | 설명 |
|------|------|
| `Dockerfile` | n8nio/n8n:latest 기반, FFmpeg 설치 포함 |
| `railway.toml` | startCommand, healthcheck 설정 |
| `.env.example` | 전체 환경변수 목록 (플레이스홀더) |
| `config/psych_terms_dictionary.json` | 정신과 용어 사전 v1.0 |

#### Dockerfile 핵심 내용
```dockerfile
FROM n8nio/n8n:latest
USER root
RUN apk add --no-cache ffmpeg   # STT 긴 녹음 청크 분할용
USER node
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_PORT=5678
ENV GENERIC_TIMEZONE=Asia/Seoul
ENV N8N_DEFAULT_BINARY_DATA_MODE=filesystem
ENV N8N_BLOCK_ENV_ACCESS_IN_NODE=false  # Code 노드에서 $env 사용 필수
EXPOSE 5678
```

#### psych_terms_dictionary.json 구성
- `medications`: 약물 13종 (SSRI, 기분안정제, 항정신병약, 수면제 등)
- `clinical_terms`: 임상 용어 20종 (한국어 ↔ 영어, 약어)
- `colloquial_to_clinical`: 구어체 → 임상 용어 매핑 18종

---

### 세션 1B — WF3 Error Workflow 생성 (2026-03-27)

#### 생성 파일

| 파일 | 설명 |
|------|------|
| `n8n_workflows/wf3_error_workflow.json` | n8n import 가능한 Error Workflow |

#### 워크플로우 구조
```
Error Trigger → 에러 메시지 구성 (Code) → Telegram 발송
  [240,300]         [480,300]               [720,300]
```

#### 노드 사양

| 노드 | type | typeVersion |
|------|------|-------------|
| Error Trigger | n8n-nodes-base.errorTrigger | 1 |
| 에러 메시지 구성 | n8n-nodes-base.code | 2 |
| Telegram 발송 | n8n-nodes-base.telegram | 1.2 |

#### Telegram 발송 노드 환경변수
```javascript
chatId: $env.TELEGRAM_ADMIN_CHAT_ID   // 관리자 chat ID
```

#### n8n import 후 필수 작업
1. Import → 워크플로우 URL에서 ID 확인 (예: `/workflow/12`)
2. Telegram 발송 노드 → Credentials → "PsyCaseAuto Bot" 선택
3. 워크플로우 활성화
4. `.env`의 `ERROR_WORKFLOW_ID` 에 확인한 ID 입력
5. WF1, WF2 Settings → Error Workflow → WF3 연결

---

## 현재 파일 구조

```
psychiatric interview automation/
├── Dockerfile
├── railway.toml
├── .env.example
├── .gitignore
├── config/
│   └── psych_terms_dictionary.json
├── n8n_workflows/
│   └── wf3_error_workflow.json          ← WF3 완료
├── plan & log/
│   ├── PROJECT_PLAN.md                  ← 전체 설계 문서 (Single Source of Truth)
│   ├── PROGRESS_LOG.md                  ← 이 파일
│   └── system_prompt_case_conference.md
```

---

### 세션 1C — Telegram 핑 테스트 & Google Drive 초기화 워크플로우 (2026-03-27)

#### 생성 파일

| 파일 | 설명 |
|------|------|
| `n8n_workflows/wf_telegram_ping_test.json` | Telegram 봇 연결 확인용 핑 테스트 |
| `n8n_workflows/wf_gdrive_init.json` | Google Drive 폴더 구조 1회 초기화 |

#### wf_telegram_ping_test 구조
```
Telegram Trigger → 입력 파싱 (Code) → ping 여부 (IF)
                                           ├─ true  → 응답 — pong
                                           └─ false → 응답 — unknown
```
- "ping" 수신 시 "pong 🟢 PsyCaseAuto 연결 확인됨 (HH:mm)" 응답
- 그 외 텍스트는 안내 메시지 응답
- maxConcurrency: 1

#### wf_gdrive_init 구조
```
수동 실행 → 루트 폴더 생성 (GoogleDrive) → 서브폴더 목록 (Code)
         → 배치 순회 (SplitInBatches)
              ├─ loop  → 서브폴더 생성 (GoogleDrive) → (배치 순회로 복귀)
              └─ done  → 완료 메시지 (Telegram)
```
- 생성 폴더: PsyCaseAuto/ → config/, PT-SAMPLE/
- 완료 후 Telegram으로 루트 폴더 ID 전송 (→ PATIENT_DRIVE_ROOT_FOLDER_ID 에 저장)
- 실행 후 비활성화할 것

#### import 후 필수 작업 (1C)
1. Telegram Trigger 노드 → Credentials → "PsyCaseAuto Telegram Bot" 선택
2. GoogleDrive 노드 → Credentials → "PsyCaseAuto Google Drive" 선택
3. wf_telegram_ping_test 활성화 → Telegram에서 `ping` 전송으로 검증
4. wf_gdrive_init 수동 실행 → Telegram으로 루트 폴더 ID 수신 → `.env`의 PATIENT_DRIVE_ROOT_FOLDER_ID 업데이트

---

### 세션 2B — WF1-B STT 파이프라인 등록 (2026-03-29)

#### FFmpeg 환경 체크 결과

| 방법 | 결과 | 비고 |
|------|------|------|
| Code node `require('child_process')` | ❌ 차단 | @n8n/task-runner sandbox: "Module 'child_process' is disallowed" |
| `n8n-nodes-base.executeCommand` 노드 | ❌ 차단 | Railway 보안: "Unrecognized node type" (활성화 시 오류) |

**결론: Railway n8n에서 FFmpeg 사용 불가 → 단일 파일(≤24MB) 경로만 구현**

#### WF1-B 등록

| 항목 | 값 |
|------|-----|
| **ID** | `l0jeHQosObPlaUce` |
| **이름** | PsyCaseAuto — WF1-B STT 녹음 파이프라인 |
| **노드 수** | 19개 |
| **상태** | 비활성 (테스트 후 활성화 필요) |
| **Webhook URL** | `https://primary-production-b48fc.up.railway.app/webhook/psycase-audio` |
| **JSON 백업** | `n8n_workflows/wf1b_stt_pipeline.json` |

#### WF1-B 노드 구조

```
Webhook (psycase-audio)
  → 요청 검증 (Code) — PT-YYYY-NNN, audio binary 존재, 파일크기 계산
  → 파일 크기 분기 (IF)
      ├─ true (>24MB) → 크기 초과 오류 응답 (413)
      │                 [FFmpeg 청크 분할 — 자체 호스팅 환경에서 활성화 예정]
      └─ false (≤24MB) → Whisper API (openai-whisper-1, verbose_json, ko)
                        → STT 결과 정리 (Code) — segments + speaker:'unidentified'
                        → 환자 폴더 존재 확인 (GDrive, searchMethod:name)
                        → 폴더 없으면 생성? (IF)
                            ├─ true → 환자 폴더 생성 → 폴더 ID 확정
                            └─ false ──────────────→ 폴더 ID 확정
                        → audio 서브폴더 조회 (GDrive, searchMethod:name)
                        → audio 없으면 생성? (IF)
                            ├─ true → audio 폴더 생성 → audio ID 확정
                            └─ false ─────────────→ audio ID 확정
                        → 원본 오디오 저장 (GDrive upload, binary 복원)
                        → STT JSON 직렬화 (Code)
                        → STT JSON 저장 (GDrive upload)
                            ├─ Telegram 알림 (🎙 STT 변환 완료)
                            └─ Webhook 응답 (200 + 결과 JSON)
```

#### Drive 저장 구조 (WF1-B)
```
PsyCaseAuto/
  └── {patient_code}/
        └── audio/
              ├── audio_{YYYYMMDD}.{ext}   ← 원본 오디오
              └── stt_{YYYYMMDD}.json      ← STT 결과 (full_text + segments)
```

#### WF1-B 활성화 전 필수 체크
- [ ] Railway 환경변수 `OPENAI_API_KEY` 설정
- [ ] Railway 환경변수 `N8N_PAYLOAD_SIZE_MAX=50` 설정 (16MB 기본값 초과 대비)
- [ ] 소규모 오디오 파일로 end-to-end 테스트

---

### 세션 3 — WF1-B 버그 수정 + End-to-End 테스트 완료 (2026-03-29)

#### 수정 사항

| 항목 | 수정 내용 |
|------|-----------|
| `response_format` | `verbose_json` → `json` (gpt-4o-transcribe 호환) |
| STT 결과 정리 코드 | segments/duration 파싱 제거, `stt_engine: 'gpt-4o-transcribe'` 수정 |
| binary 필드명 | `audio ID 확정` 출력 `{ audio: ... }` → `{ data: ... }` (Drive 업로드 호환) |
| Whisper API 프롬프트 | 환각 방지 중립 프롬프트로 변경 |
| 워크플로우 ID | `l0jeHQosObPlaUce` → `XElVH6RbgWCGZcjO` (백업 재import) |

#### 테스트 결과
- **End-to-End 성공** ✅
- Drive 저장: `audio_20260329.m4a` + `stt_20260329.json`
- Telegram 알림 수신 ✅
- WF1-B Published (활성화 완료)

#### 알려진 이슈 (추후)
- STT 짧은 오디오 환각 문제 (실제 임상 녹음으로 검증 필요)
- HTML UI 개선 (음성만 모드 직행, 탭 수 정리)

---

### 세션 4 — WF2 보고서 생성 메인 프레임워크 등록 (2026-03-31)

#### 생성 파일

| 파일 | 설명 |
|------|------|
| `n8n_workflows/wf2_main_framework.json` | WF2 메인 프레임워크 JSON 백업 |

#### WF2 등록 정보

| 항목 | 값 |
|------|-----|
| **ID** | `LiN5bKslyWtZX6yG` |
| **이름** | PsyCaseAuto — WF2 보고서 생성 메인 |
| **노드 수** | 24개 |
| **상태** | 비활성 (테스트 후 활성화 필요) |
| **Trigger** | Telegram Trigger (메시지 업데이트 수신) |
| **JSON 백업** | `n8n_workflows/wf2_main_framework.json` |
| **validate 결과** | 에러 0, 경고 37 (모두 비필수 권고사항) |

#### WF2 노드 구조 (24개)

```
Telegram Trigger (wf2-n01)
  → 메시지 파싱 (Code) — PT-YYYY-NNN 보고서 패턴 추출
  → 유효성 검사 (IF) — is_valid_command boolean
      ├─ true  → 환자 폴더 검색 (GDrive, alwaysOutputData)
      │            → 환자 폴더 존재 확인 (IF)
      │                ├─ true  → 환자 폴더 ID 확정 (Code)
      │                │           → interviews 서브폴더 검색 (GDrive, alwaysOutputData)
      │                │               → interviews 폴더 존재 확인 (IF)
      │                │                   ├─ true  → 면담 파일 목록 조회 (GDrive, alwaysOutputData)
      │                │                   │           → 파일 존재 확인 (IF)
      │                │                   │               ├─ true  → 파일 목록 수집 (Code)
      │                │                   │               │           → 파일 목록 펼치기 (Code)
      │                │                   │               │           → 파일 순회 (SplitInBatches, batchSize:1)
      │                │                   │               │               ├─ loop → 파일 내용 로드 (GDrive download)
      │                │                   │               │               │         → JSON 파싱 (Code)
      │                │                   │               │               │         → [파일 순회로 복귀]
      │                │                   │               │               └─ done → 면담 데이터 병합 (Code)
      │                │                   │               │                          → 토큰 초과 확인 (IF)
      │                │                   │               │                              ├─ false(≤80K) → 생성 시작 알림 (Telegram)
      │                │                   │               │                              │                → Sub-WF 연결 지점 (NoOp) ← Stage 3-2 교체 예정
      │                │                   │               │                              └─ true(>80K) → 토큰 초과 알림 (Telegram) → 종료
      │                │                   │               └─ false → 면담 JSON 파일 없음 응답 → 종료
      │                │                   └─ false → 면담 없음 응답 → 종료
      │                └─ false → 환자 데이터 없음 응답 → 종료
      └─ false → 명령 형식 오류 응답 → 종료
```

#### 알려진 이슈 (추후 대응)

| 이슈 | 내용 | 대응 시점 |
|------|------|----------|
| Telegram Trigger typeVersion | 1.1 사용 (명세 §2 미포함 — 경고만) | Stage 3-2 이후 검토 |
| chatId 형식 | string 직접 사용 (resource locator 권고 — 동작에 문제 없음) | 필요 시 수정 |
| SplitInBatches loop 경고 | 검증기 loop 연결 경고 (실제 연결 정상) | 무시 |
| 토큰 초과 경로 | Placeholder (Telegram 응답 후 종료) | Stage 3-2 이후 구현 |

#### 피드백 반영 수정 (2026-03-31)

| # | 분류 | 수정 내용 |
|---|------|----------|
| Bug1 | 🔴 Critical | `면담 데이터 병합`: `$input.all()` → `$('JSON 파싱').all()` — done 브랜치에서 마지막 배치만 수집되는 버그 수정 |
| Bug2 | 🔴 Critical | `JSON 파싱`: binary 접근 방식 filesystem mode 호환으로 교체 (`$helpers.getBinaryDataBuffer` fallback 추가) |
| Minor3 | 🟡 Minor | `maxConcurrency: 1` — settings에 명시적으로 추가 완료 |
| Minor4 | 🟡 Minor | GDrive `searchMethod: "name"` contains 이슈 — 실제 충돌 위험 낮음, JSON `_notes`에 기록, 수정 보류 |
| 참고 | ℹ️ 조사 | Telegram 노드 'Invalid operation' 에러 6건 — `validate_node` 개별 검증 통과 확인, false positive 결론 |

#### WF2 활성화 전 필수 체크
- [x] Railway 환경변수 `PATIENT_DRIVE_ROOT_FOLDER_ID` 설정 확인 ✅
- [ ] Railway 환경변수 `TELEGRAM_ADMIN_CHAT_ID` 설정 확인
- [x] n8n에서 Telegram credential "PsyCaseAuto Telegram Bot" 연결 확인 ✅
- [x] n8n에서 Google Drive credential "PsyCaseAuto Google Drive" 연결 확인 ✅
- [ ] WF3 Error Workflow `4ox2lxKl1st6pUkY` 활성화 상태 확인

---

### 세션 5 — WF2 Stage 3-1 버그 수정 & End-to-End 테스트 완료 (2026-04-01)

#### 수정 이력 (총 7건)

| # | 노드 | 문제 | 수정 |
|---|------|------|------|
| Fix1 | 환자 폴더 검색 | `$env` in GDrive `__rl` value 미평가 → `.` 전달 → 404 | `메시지 파싱` Code에서 `root_folder_id: $env.PATIENT_DRIVE_ROOT_FOLDER_ID` 출력 → GDrive에서 `$('메시지 파싱').json.root_folder_id` 참조 |
| Fix2 | 전체 | Railway Primary `PATIENT_DRIVE_ROOT_FOLDER_ID` 오타 | 환경변수 값 수정 후 Deploy |
| Fix3 | 파일 순회 | `SplitInBatches` Done 브랜치에서 `$('JSON 파싱').all()` 미작동 (n8n 2.14.2 버그) | `SplitInBatches` 제거 → n8n 네이티브 다중 아이템 처리로 전환 |
| Fix4 | 면담 데이터 병합 | `$input.all()` 모드 + `runOnceForAllItems` 조합 수정 | `runOnceForAllItems` 명시 + `$input.all()` 사용 |
| Fix5 | JSON 파싱 | `runOnceForAllItems`에서 `$helpers` 미정의 | `runOnceForEachItem`으로 변경 |
| Fix6 | JSON 파싱 | `runOnceForEachItem`에서 `$input.first()` 금지 | `$json` / `$binary` 로 교체 |
| Fix7 | JSON 파싱 | `binaryItem.data`가 filesystem mode에서 내부 참조값 → 가비지 디코딩 | Code 노드 포기 → **`extractFromFile` (typeVersion 1.1)** 내장 노드로 교체 |

#### 최종 WF2 구조 변경 요약

| 항목 | 세션 4 | 세션 5 (현재) |
|------|--------|--------------|
| 노드 수 | 24개 | 23개 |
| 파일 순회 | SplitInBatches | 제거 (n8n 네이티브 처리) |
| JSON 파싱 | Code 노드 (binary 수동 읽기) | `extractFromFile` (destinationKey: interview_data) |
| GDrive 폴더 ID | `$env` 직접 참조 (미작동) | 메시지 파싱 Code → JSON 경유 |

#### 확정 기술 결정

| 결정 | 내용 |
|------|------|
| D-15 | `extractFromFile` 노드로 Google Drive JSON 파일 파싱 — Code 노드 binary 읽기는 filesystem mode에서 불안정 |
| D-16 | n8n GDrive `__rl` value에 `$env` 직접 참조 불가 → Code 노드 JSON 경유 필수 |

#### End-to-End 테스트 결과 (2026-04-01)

| 항목 | 결과 |
|------|------|
| Telegram 트리거 | ✅ `PT-2026-001 보고서` 수신 |
| 환자 폴더 검색 | ✅ PT-2026-001 폴더 탐색 성공 |
| interviews 폴더 | ✅ 서브폴더 탐색 성공 |
| 파일 목록 | ✅ 2개 파일 인식 |
| JSON 파싱 | ✅ interview_data 오브젝트 2건 파싱 |
| 면담 데이터 병합 | ✅ `interview_count: 2`, `estimated_tokens: 64` |
| Telegram 응답 | ✅ "🔄 보고서 생성 시작 / 면담 수: 2건 / 추정 토큰: 64" |

#### WF2 Stage 3-1 상태: ✅ 완료

#### 다음 단계
- Stage 3-2: 12개 섹션 Sub-WF 구현 (Claude Sonnet 4 API 호출)
- WF1-A: HTML 체크리스트 Webhook 수신 → Google Drive JSON 저장
- [ ] 테스트: `PT-2024-001 보고서` 형식 메시지 전송으로 정상 분기 확인

---

### 세션 5B — Stage 3-2 Phase 1 구현 (2026-04-01, 컨텍스트 이어서)

#### 완료 항목

| 항목 | 내용 |
|------|------|
| Sub-WF S01~S08 생성 | n8n_create_workflow × 8, 모두 비활성 |
| WF2 Main 업데이트 | NoOp 제거 → 8×(릴레이 Code + Execute WF) + Phase 1 병합 + Phase 2 NoOp (40노드) |

#### 생성된 Sub-WF ID 목록

| Sub-WF | 이름 | n8n ID |
|--------|------|--------|
| S01 | Identifying Data | `nJLVKGu1Ngh9C3pl` |
| S02 | Chief Problems | `TifgZTXdSNW9Gtlh` |
| S03 | Informants | `J0EvW4lNbKGLo157` |
| S04 | Past-Family History | `StjkISptQwFHl5Ws` |
| S05 | Personal History | `SmR2paPpXEYTuWZO` |
| S06 | MSE | `Qp0IXqsbounP2X1l` |
| S07 | Mood Chart | `5wWj9DLBB1z1r9Fr` |
| S08 | Progress Notes | `lbr2QAXPhX80MuZG` |

#### WF2 Main 구조 변경

| 변경 | 내용 |
|------|------|
| 기존 NoOp 제거 | `Sub-WF 연결 지점 (Stage 3-2 이후)` 삭제 |
| 새 노드 18개 추가 | S01~S08 입력 전달(Code) + 섹션1~8 보고서 생성(Execute WF) + Phase 1 결과 병합(Code) + Phase 2 연결 지점(NoOp) |
| 총 노드 수 | 23 → 40 |
| 데이터 전달 방식 | 각 Execute WF 앞 Code 릴레이 노드가 `$('면담 데이터 병합').first().json` 직접 참조 |

#### 확정 기술 결정

| 결정 | 내용 |
|------|------|
| D-17 | Execute Workflow typeVersion 1에서 입력 데이터는 연결된 이전 노드 출력 그대로 전달 → 각 Sub-WF 앞에 릴레이 Code 노드로 `면담 데이터 병합` JSON 재전달 |
| D-18 | Phase 1 결과 병합: `$('섹션X 보고서 생성').first().json`으로 8개 섹션 결과 직접 수집 |

#### Sub-WF 공통 구조

- 4노드: `Execute Workflow Trigger` → `입력 준비` (Code, Anti-Hallucination 헤더 + 섹션별 프롬프트) → `Claude API 호출` (HTTP Request, claude-sonnet-4-20250514) → `출력 파싱 및 검증` (Code)
- 모든 Sub-WF: `onError: continueRegularOutput`, `errorWorkflow: 4ox2lxKl1st6pUkY`

#### WF2 Stage 3-2 Phase 1 상태: ✅ 완료

#### 다음 단계 (Stage 3-2 Phase 2)
- S09 Formulation, S10 Diagnosis (DSM-5), S11 Treatment Plan, S12 Summary Sub-WF 생성
- WF2 Main Phase 2 연결 지점에 섹션9~12 Execute WF 체인 추가
- DOCX 변환 + Google Drive 저장 + Telegram 완료 알림

---

### 세션 5C — WF2 Phase 1 직렬 → 병렬 구조 변환 (2026-04-01, 컨텍스트 이어서)

#### 변경 배경
- 직렬 8섹션 체인: 40.451초 실측 → 병렬 전환으로 5~15초 예상
- Context 오염 없음: 각 섹션 Sub-WF가 독립 실행, 서로 참조하지 않음

#### 구조 변경 요약

| 항목 | 변경 전 (직렬) | 변경 후 (병렬) |
|------|--------------|--------------|
| 섹션1→섹션2 연결 | 직렬 체인 (8단계) | 제거 |
| 생성 시작 알림 출력 | S01 1개 | S01~S08 팬아웃 (8개 동시) |
| 섹션X → 다음 | 직렬 전달 | `섹션 병렬 수집` Merge로 수렴 |
| Merge 노드 | 없음 | `섹션 병렬 수집` (typeVersion 3.2, mode: append, numberInputs: 8) |
| Phase 1 결과 병합 코드 | `$('섹션X').first().json` × 8 | `$input.all()` + section_id 정렬 |
| 총 노드 수 | 40 | 41 |
| 연결 수 | 34 | 35 |

#### 적용된 n8n operations (44개, 원자적 적용)

| 종류 | 수 | 내용 |
|------|---|------|
| removeConnection | 8 | 직렬 섹션 간 연결 제거 |
| addNode | 1 | `섹션 병렬 수집` Merge 노드 추가 |
| moveNode | 18 | 8×(릴레이+exec) 팬아웃 배치 + Phase 1 병합 + Phase 2 |
| addConnection | 16 | 팬아웃 7 + exec→Merge 8 + Merge→Phase 1 병합 1 |
| updateNode | 1 | `Phase 1 결과 병합` jsCode → `$input.all()` 방식 |

#### 최종 팬아웃 레이아웃

```
                         ┌→ S01 입력 전달 [4100,-396] → 섹션1 보고서 생성 [4350,-396] ─(idx 0)┐
                         ├→ S02 입력 전달 [4100,-196] → 섹션2 보고서 생성 [4350,-196] ─(idx 1)┤
                         ├→ S03 입력 전달 [4100,   4] → 섹션3 보고서 생성 [4350,   4] ─(idx 2)┤
생성 시작 알림 [3840,304]─┤→ S04 입력 전달 [4100, 204] → 섹션4 보고서 생성 [4350, 204] ─(idx 3)┤→ 섹션 병렬 수집 [4620,304] → Phase 1 결과 병합 [4880,304] → Phase 2 [5120,304]
                         ├→ S05 입력 전달 [4100, 404] → 섹션5 보고서 생성 [4350, 404] ─(idx 4)┤
                         ├→ S06 입력 전달 [4100, 604] → 섹션6 보고서 생성 [4350, 604] ─(idx 5)┤
                         ├→ S07 입력 전달 [4100, 804] → 섹션7 보고서 생성 [4350, 804] ─(idx 6)┤
                         └→ S08 입력 전달 [4100,1004] → 섹션8 보고서 생성 [4350,1004] ─(idx 7)┘
```

#### 확정 기술 결정

| 결정 | 내용 |
|------|------|
| D-19 | Phase 1 병렬 팬아웃: `생성 시작 알림` 1개 출력 → 8개 릴레이 동시 실행. n8n은 동일 output[0]에 여러 destination 연결 시 자동 병렬 처리 |
| D-20 | Merge 노드 `섹션 병렬 수집` (typeVersion 3.2, mode: append, numberInputs: 8): 8개 exec 결과를 수렴. Phase 1 결과 병합에서 `$input.all()` + `section_id` 오름차순 정렬로 순서 보장 |

#### Phase 1 결과 병합 jsCode (변경 후)
```javascript
const allSections = $input.all().map(item => item.json);
allSections.sort((a, b) => (a.section_id || 0) - (b.section_id || 0));
const mergedData = $('면담 데이터 병합').first().json;
// ... error/complete 분류 후 반환
```

#### WF2 Stage 3-2 Phase 1 병렬 전환: ✅ 완료

---

## 다음 세션 예정 작업

| 순서 | 세션 | 내용 |
|------|------|------|
| **[최우선]** 테스트 | Phase 1 병렬 E2E | `PT-2026-001 보고서` 전송 → 8섹션 병렬 실행 + Merge 동작 확인 |
| 3-2 P2 | Stage 3-2 Phase 2 | S09~S12 Sub-WF 생성 + WF2 Phase 2 연결 |
| 3-3 | Stage 3-3 | DOCX 변환 + GDrive 저장 + Telegram 완료 알림 |
| WF1-A | 설문지 경로 | Form Trigger → 입력 검증 → Google Drive JSON 저장 |

---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)
