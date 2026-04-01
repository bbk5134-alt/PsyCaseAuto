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

### 세션 5D — Stage 3-3: Phase 2 Sub-WF S09~S12 생성 + WF2 Main 업데이트 (2026-04-01)

#### 생성된 Sub-WF

| Sub-WF | 이름 | n8n ID | 의존 입력 |
|--------|------|--------|----------|
| S09 | Present Illness (FCAB) | `4VyEFSX0H0FD2ilK` | `dep_chief_problems` |
| S10 | Diagnostic Formulation (DSM-5-TR) | `6sRG5BX5uBhcRtj1` | `dep_chief_problems`, `dep_mse`, `dep_present_illness` |
| S11 | Case Formulation (4P 모델) | `xnJZXam1BZB7Iypu` | `dep_phase1_summary` |
| S12 | Psychodynamic Formulation | `Hq4QhEKT48aPShWb` | `dep_personal_history`, `dep_present_illness`, `dep_case_formulation` |

#### Phase 2 vs Phase 1 차이점

| 항목 | Phase 1 (S01~S08) | Phase 2 (S09~S12) |
|------|-------------------|-------------------|
| 실행 방식 | 병렬 팬아웃 | **직렬 순차** (의존 관계) |
| max_tokens | 4096 | **6144** |
| Anti-Hallucination | 기본 | **강화** (추론/사실 구분 필수) |
| confidence 기본값 | medium | **draft** (S11, S12) |
| 의존 데이터 | 없음 (독립) | dep_* 필드로 이전 섹션 참조 |
| 토큰 절단 | 없음 | S11: 8000자, S12: 6000자 |

#### WF2 Main 구조 변경

| 변경 | 내용 |
|------|------|
| NoOp 삭제 | `Phase 2 연결 지점 (Stage 3-3 이후)` 제거 |
| 새 노드 10개 추가 | S09~S12 릴레이(Code) × 4 + 실행(Execute WF) × 4 + Phase 2 결과 병합(Code) + Stage 3-4 NoOp |
| Phase 1 결과 병합 업데이트 | `phase1_results` (section_name 기준 keyed 객체) 추가 — Phase 2 의존 접근용 |
| 총 노드 수 | 41 → **50** |
| 적용된 operations | 22개 (removeNode 1 + updateNode 1 + addNode 10 + addConnection 10) |

#### Phase 2 직렬 체인 레이아웃

```
Phase 1 결과 병합 [4720,352]
  → S09 입력 전달 [4944,352] → 섹션9 생성 [5168,352]
  → S10 입력 전달 [5392,352] → 섹션10 생성 [5616,352]
  → S11 입력 전달 [5840,352] → 섹션11 생성 [6064,352]
  → S12 입력 전달 [6288,352] → 섹션12 생성 [6512,352]
  → Phase 2 결과 병합 [6736,352] → Stage 3-4 연결 지점 [6960,352]
```

#### Phase 2 결과 병합 출력 주요 필드

- `all_sections`: 12개 섹션 전부 (Phase 1 + Phase 2)
- `quality_metrics`: complete/partial/missing 카운트, completeness_score (0~1)
- `alert`: `HIGH_SUICIDE_RISK` 플래그 (MSE impulsivity 기반)

#### 확정 기술 결정

| 결정 | 내용 |
|------|------|
| D-21 | Phase 2 직렬 연결: S09→S10→S11→S12. 각 섹션이 이전 섹션 결과에 의존하므로 병렬 불가 |
| D-22 | 릴레이 Code 노드 패턴: Execute Workflow typeVersion 1은 fields.values 미지원 → Phase 1과 동일하게 릴레이 Code 노드에서 데이터 조립 후 전달 |
| D-23 | Phase 1 결과 병합에 `phase1_results` keyed 객체 추가: Phase 2 릴레이 노드가 `$('Phase 1 결과 병합').first().json.phase1_results.chief_problems` 형식으로 접근 |

#### Stage 3-3 Phase 2 상태: ✅ 완료

---

## ⚠️ 기술 부채 — 프로젝트 완료 후 최적화 항목

### [PERF-01] n8n Queue Mode 전환 (병렬 실행 진짜 병렬화)

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-04-01 (세션 5C E2E 테스트) |
| **현상** | Phase 1 팬아웃 구조(병렬)임에도 실제 실행은 S01→S02→…→S08 순차 처리 |
| **원인** | n8n **Regular Mode** 기본 동작 — 팬아웃 브랜치를 순차적으로 처리 |
| **현재 소요 시간** | ~37초 (8섹션 순차 Claude API 호출) |
| **Queue Mode 전환 시 예상** | ~4~6초 (8섹션 진짜 병렬 실행) |
| **전환 조건** | Railway에 Redis 추가 + `EXECUTIONS_MODE=queue` 환경변수 + `n8n worker` 프로세스 추가 배포 |
| **현재 결정** | 37초는 케이스 컨퍼런스 용도로 허용 가능 → 프로젝트 완성 후 성능 최적화 단계에서 적용 |
| **우선순위** | 🟡 낮음 (기능 정상, 속도만 이슈) |

> **프로젝트 완료 시 알림**: Queue Mode 전환 검토. 워크플로우 구조는 이미 병렬 팬아웃으로 설계되어 있어 인프라 변경만으로 즉시 적용 가능.

---

### 세션 5E — E2E 테스트용 PT-2026-001 Mock 데이터 제작 (2026-04-01)

#### 생성 파일

| 파일 | 면담 유형 | 날짜 | 워드 수 | 경로 |
|------|----------|------|---------|------|
| `stt_20260320.json` | 초진 (initial) | 2026-03-20 | ~4,312 | `test_data/PT-2026-001/interviews/` |
| `stt_20260328.json` | 경과 (followup) | 2026-03-28 | ~3,187 | `test_data/PT-2026-001/interviews/` |
| `UPLOAD_GUIDE.md` | — | — | — | `test_data/PT-2026-001/` |

#### Mock 데이터 설계 기준

- **형식**: WF1-B `STT 결과 정리` 노드 출력(`sttResult`) 구조 그대로 사용
- **환자 프로파일**: PT-2026-001, 31세 여, 주요우울장애 중등도-중증 + 범불안장애 공존 가능
- **12섹션 커버리지**: 모든 섹션에서 추출 가능한 정보 포함 (인적 사항, 주호소, 개인력, MSE, 현병력, 정신역동)
- **자살 사고 포함**: 수동적 자살사고, 1회 자해 이력 → S06 MSE의 충동성 중등도 → `HIGH_SUICIDE_RISK` 플래그 미발동 예상 (테스트 확인 필요)
- **Google Drive 업로드 경로**: `PsyCaseAuto/PT-2026-001/interviews/`

#### WF2 파싱 경로

```
stt_YYYYMMDD.json (GDrive) → 파일 내용 로드 → extractFromFile → interview_data = sttResult
→ 면담 데이터 병합 (fallback: JSON.stringify(iv) 경로)
→ full_text_for_ai = 두 면담 JSON 직렬화 concat → Phase 1/2 AI 호출
```

> `iv.transcript?.full_text` 조건 미충족 시 `JSON.stringify(iv)` fallback 경로 사용.
> full_text 포함 전체 sttResult가 AI 입력으로 전달됨 — 기능상 문제 없음.

#### E2E 테스트 절차

1. `test_data/PT-2026-001/interviews/` 파일 2개를 Google Drive `PsyCaseAuto/PT-2026-001/interviews/` 에 수동 업로드
2. WF2 Main (`LiN5bKslyWtZX6yG`) 활성화
3. PsyCaseAuto Telegram 봇 → `PT-2026-001 보고서` 전송
4. Phase 1 (S01~S08) + Phase 2 (S09~S12) 정상 실행 확인

---

### 세션 6 — WF2 Stage 3-4 완성 (2026-04-01)

#### 구현 내용

| 구간 | 노드 수 | 내용 |
|------|---------|------|
| A — Hallucination 검증 | 3 | 검증 준비(Code) → API 호출(HTTP Request, claude-haiku-4-5) → 결과 통합(Code) |
| B — Drive 폴더 준비 | 8 | reports/logs 서브폴더 검색 → IF 분기 → 없으면 생성 → ID 확정 |
| C — 파일 저장 | 7 | JSON 직렬화→저장, Log 직렬화→저장, HTML 변환→저장 |
| D — 완성 알림 | 1 | 메시지 구성(Code) → Telegram 전송 |

#### 주요 설계 결정

| 결정 | 내용 |
|------|------|
| D-24 | DOCX 변환 불가 → HTML 폴백. Railway n8n에 `docx` npm 미설치, `NODE_FUNCTION_ALLOW_EXTERNAL` 미설정. Word에서 HTML 열기 가능 |
| D-25 | Hallucination 검증 모델: `claude-haiku-4-5-20251001` (속도·비용 우선). 검증 대상은 사실 기반 6개 섹션만 (Case Formulation, Psychodynamic 제외) |
| D-26 | Hallucination 검증 API `onError: continueRegularOutput` — 검증 실패해도 보고서 저장 진행. `parse_error: true`로 Telegram에 표시 |
| D-27 | GDrive 바이너리 데이터: 각 파일별 별도 직렬화 Code 노드 사용. GDrive upload 노드가 바이너리를 passthrough하지 않으므로 순차적 직렬화→업로드 패턴 |

#### WF2 최종 구조

| 항목 | 값 |
|------|-----|
| 총 노드 수 | **68** |
| 총 연결 수 | 62 |
| Stage 3-4 추가 노드 | 19 (NoOp 1개 제거, 19개 추가) |
| 출력 파일 | `reports/draft_YYYYMMDD_v1.json` + `draft_YYYYMMDD_v1.html` + `logs/hallucination_check_YYYYMMDD.json` |

#### 노드 흐름 (Stage 3-4)

```
Phase 2 결과 병합
  → Hallucination 검증 준비 → 검증 API (Haiku) → 검증 결과 통합
  → reports 서브폴더 검색 → reports 폴더 확인 (IF)
      ├─ true  → reports 폴더 ID 확정
      └─ false → reports 폴더 생성 → reports 폴더 ID 확정
  → logs 서브폴더 검색 → logs 폴더 확인 (IF)
      ├─ true  → logs 폴더 ID 확정
      └─ false → logs 폴더 생성 → logs 폴더 ID 확정
  → JSON 초안 직렬화 → JSON 초안 저장 (GDrive)
  → Log 직렬화 → Hallucination 로그 저장 (GDrive)
  → HTML 보고서 변환 → HTML 보고서 저장 (GDrive)
  → 완성 메시지 구성 → 완성 알림 (Telegram)
```

#### Telegram 완성 알림 포함 정보

- 환자코드, HIGH_SUICIDE_RISK 경고 (해당 시)
- 품질 지표: 완성/부분/누락 섹션 수, 완성도 %
- Hallucination 검증 결과: 이슈 없음 / 경미 / 심각 / 실패
- GDrive 링크: HTML 초안, JSON 원본
- AI 초안 면책 문구

#### WF2 Stage 3-4 상태: ✅ 완료

---

### 세션 7 — WF2 Stage 3-4 디버깅 FIX-1~FIX-4 (2026-04-01)

#### 근거

WF2 E2E 테스트 (Execution #332) 결과 발견된 버그 수정. 상세: `docs/WF2_IMPROVEMENT_PLAN_v2.md` 세션 A 참조.

#### 수정 이력

| # | 노드 (ID) | 문제 | 수정 |
|---|-----------|------|------|
| FIX-1 | Hallucination 검증 API (`s34-a2`) | `specifyBody: "json"` 있으나 `jsonBody` 파라미터 누락 → 빈 body POST → API 400 에러 | `jsonBody` 추가 — Haiku 모델 + system_prompt + hallucination_check_input 참조 |
| FIX-2a | 완성 알림 (`s34-d1`) | `parse_mode: "Markdown"`이 GDrive URL 내 `_`를 italic으로 해석 → Telegram 400 에러 | `parse_mode` 제거, plain text 전송 |
| FIX-2b | 완성 메시지 구성 (`s34-c6`) | Markdown `*bold*`, `[link](url)` 문법 사용 | 모든 Markdown 문법 제거, plain text로 변경 |
| FIX-3 | HTML 보고서 변환 (`s34-c4`) | `v()` 함수 `String(obj)` → `[object Object]` | 재귀적 v() 함수: 배열→`;` 조인, 객체→`key: value` 조인, META_KEYS 자동 필터 |
| FIX-4 | HTML 보고서 변환 (`s34-c4`) | Case Formulation 4P 배열에서 `JSON.stringify(i)` → 메타데이터 노출 | `v(i)` 호출로 교체, META_KEYS(`source_ref`, `type`, `confidence`, `factual`, `informant_source`) 자동 제거 |

#### v() 함수 변경 상세

```javascript
// 변경 ��
const v = (x) => (x != null && x !== 'missing' && x !== '') ? String(x) : '';

// 변경 후
const META_KEYS = new Set(['source_ref', 'type', 'confidence', 'factual', 'informant_source']);
const v = (x) => {
  if (x == null || x === 'missing' || x === '') return '';
  if (typeof x === 'string') return x;
  if (typeof x === 'number' || typeof x === 'boolean') return String(x);
  if (Array.isArray(x)) return x.map(i => v(i)).filter(Boolean).join('; ');
  if (typeof x === 'object') {
    return Object.entries(x)
      .filter(([k]) => !META_KEYS.has(k) && x[k] != null)
      .map(([k, val]) => { const rendered = v(val); return rendered ? `${k}: ${rendered}` : ''; })
      .filter(Boolean).join(', ');
  }
  return String(x);
};
```

#### FIX-5~FIX-7 추가 수정

| # | 노드 (ID) | 문제 | 수정 |
|---|-----------|------|------|
| FIX-5 | 섹션1~12 보고서 생성 (12개 executeWorkflow) | `onError` 미설정 → Sub-WF 실패 시 Merge 무한 대기 | 12개 모두 `onError: "continueRegularOutput"` 추가 |
| FIX-6 | Phase 1 결과 병합 → S09 입력 전달 | 4분+ 무응답 → 진행 여부 불명 | `Phase 1 완료 알림` (s34-mid-alert) Telegram 노드 삽입. 생성 시작 알림에 "예상 소요: 4~5분" 추가 |
| FIX-7 | 검증 결과 통합 (`s34-a3`) | 동일 날짜 2회 실행 시 파일명 중복 | `dateStr` 포맷 `yyyyMMdd` → `yyyyMMdd_HHmm` |

#### STRUCT-1: Drive 선저장 구조 변경

| 항목 | 내용 |
|------|------|
| **변경 배경** | Hallucination 검증 실패 시 보고서 전달도 지연 → Drive 저장을 검증 앞으로 이동 |
| **새 노드** | `보고서 준비` (s34-prep, Code) — dateStr, 파일명, draft_report 생성. `1차 완성 알림` (s34-alert1, Telegram) — 보고서 파일 링크 포함 |
| **제거 연결** | Phase 2 병합→Halluc 준비, 검증 통합→reports 검색, JSON 저장→Log 직렬화, Log 저장→HTML 변환, HTML 저장→완성 메시지 |
| **새 연결** | Phase 2 병합→보고서 준비→reports 검색, JSON 저장→HTML 변환→HTML 저장→1차 알림→Halluc 준비, 검증 통합→Log 직렬화→Log 저장→완성 메시지(2차) |
| **코드 참조 변경** | 8개 노드: `$('검증 결과 통합')` → `$('보고서 준비')`, `$('Log 직렬화')` → `$('보고서 준비')` 등 |
| **총 노드 수** | 69 → **71** (보고서 준비 + 1차 완성 알림 추가) |

새 흐름:
```
Phase 2 결과 병합 → 보고서 준비 → reports/logs 폴더 체인
  → JSON 직렬화 → JSON 저장 → HTML 변환 → HTML 저장
  → 1차 완성 알림 (보고서 링크 포함)
  → Hallucination 검증 준비 → 검증 API → 검증 결과 통합
  → Log 직렬화 → Log 저장
  → 2차 검증 알림 (완성 메시지 구성 → 완성 알림)
```

Telegram 알림 구조:
```
[1] 생성 시작 알림 — "예상 소요: 4~5분"
[2] Phase 1 완료 알림 — "8/8 섹션, Phase 2 진행 중..."
[3] 1차 완성 알림 — "보고서 저장 완료, 검증 진행 중..."
[4] 2차 검증 알림 — "Hallucination 검증 완료, 이슈 N건"
```

#### STRUCT-2: patient_folder_id 체인 전달

| 노드 (ID) | 변경 |
|-----------|------|
| 면담 데이터 병합 (wf2-n18) | return에 `patient_folder_id: $('환자 폴더 ID 확정').first().json.patient_folder_id` 추가 |
| Phase 1 결과 병합 (p1-merge) | return에 `patient_folder_id: mergedData.patient_folder_id` 추가 |
| Phase 2 결과 병합 (p2-merge) | return에 `patient_folder_id: $('면담 데이터 병합').first().json.patient_folder_id` 추가 |
| 보고서 준비 (s34-prep) | `$('환자 폴더 ID 확정')` → `$('Phase 2 결과 병합')` 변경 |

검증: Stage 3-4 영역에서 `환자 폴더 ID 확정` 원거리 참조 **0건** 확인 ✅

#### STRUCT-3: chat_id 보안 제거

- `보고서 준비`의 `draftReport` 객체에 `chat_id` 미포함 확인 ✅ (STRUCT-1에서 이미 해결)
- `JSON 초안 직렬화`는 `ctx.final_report`만 직렬화 → GDrive JSON에 `chat_id` 없음 ✅

#### E2E 재테스트 결과 (2026-04-01 12:37~12:42)

| 항목 | 결과 |
|------|------|
| Telegram 알림 4개 | ✅ 시작 → Phase 1 완료 → 1차 완성 → 2차 검증 |
| GDrive 폴더 생성 | ✅ reports/, logs/ |
| JSON 초안 저장 | ✅ `draft_20260401_1242_v1.json` (시각 포함) |
| HTML 보고서 저장 | ❌ **미생성** — HTML 변환 출력에 `reports_folder_id` 누락 |
| Hallucination 검증 | ⚠️ `parse_error: false` (FIX-1 성공), 3건 low/medium (false positive 의심) |
| Halluc 로그 저장 | ✅ `hallucination_check_20260401_1242.json` |
| 완성도 | 79% (이전 88% — Sub-WF 결과 변동) |
| 비용 | $1.88/일 (디버깅 포함 6~8회 실행) |

발견된 버그:
- **P-1 (Critical)**: HTML 변환 노드가 `$('보고서 준비')` 참조 → `reports_folder_id` 없음 → GDrive upload 실패
- **P-2**: Haiku Hallucination 검증 false positive — 원본 6000자 절단, 프롬프트 빈약
- 상세: 세션 8에서 수정 예정

#### 세션 7 상태: ✅ FIX-1~7 + STRUCT-1~3 완료 (P-1 HTML 버그 잔존)

---

## 다음 세션 예정 작업

| 순서 | 내용 |
|------|------|
| **[최우선]** | E2E 재테스트 (PT-2026-001 Mock 데이터) — 디버깅 가이드 참조 |
| WF1-A | 설문지 경로 (Form Trigger → GDrive JSON 저장) |
| HTML→Docs | GDrive upload 시 convert 옵션으로 HTML→Docs 자동 변환 |
| Sub-WF AI 노드 전환 | 13개 HTTP Request → Basic LLM Chain (n8n UI 수동 권장) |

---

> **환경변수 전체 목록**: `.env.example` 파일 참조 (Single Source — 이 파일에서 중복 관리하지 않음)

PROGRESS_LOG — 세션 8 추가 내용

기존 PROGRESS_LOG.md 말미(§ 다음 세션 예정 작업)를 이 내용으로 교체


세션 8 — Quality Check 분석 + 아키텍처 결정 (2026-04-01)
Quality Check 결과 요약
대분류만점득점비율A. 형식 충실도6016.527.5%B. 사실 정확성252080.0%C. Halluc Check 실효성15853.3%합계10044.544.5% (C등급)
근본 원인 분석
사실 추출은 양호(80%)하나 형식 재현이 실패(27.5%). 원인:

Sub-WF가 JSON 데이터 구조(key-value)를 반환
HTML 변환 노드(s34-c4)의 v() 함수로는 JSON→임상 산문 변환 본질적으로 불가
형식 품질은 변환 단계가 아닌 생성 단계에서 해결해야 함

아키텍처 결정
#결정근거D-22Sub-WF 출력을 Dual-Layer (narrative + structured + meta)로 전환형식은 생성 단계에서 해결. HTML 변환은 narrative를 이어 붙이기만D-23Quality Check는 별도 수동 QA 프로세스. WF2 Halluc Check 대체 안 함목적 다름(안전 vs 품질), Gold Standard 필요, 비용 높음
산출물
파일용도quality_check_PT-2026-001.json첫 QC 결과 (C등급, 44.5/100)quality_check_summary_PT-2026-001.mdQC 결과 요약 + 섹션별 수정 가이드quality_check_prompt.mdQC 채점 시스템 프롬프트 (100점 만점)PROJECT_PLAN_v3.md종합 기획안 v3 (Dual-Layer, QC 전략 반영)
세션 8 상태: ✅ 분석 완료, 구현은 다음 세션

다음 세션 예정 작업
[최우선] 세션 9: Sub-WF 프롬프트 Dual-Layer 전환 (12개)
목표: 12개 Sub-WF의 AI 프롬프트를 v3 Dual-Layer Output 구조로 전면 재설계
작업 범위: 프롬프트 제작만. 워크플로우 변경은 별도 세션.
작업 순서 (우선순위 기반 — QC 최하위 섹션 먼저)
순위Sub-WFQC 점수핵심 변경1S08 Progress Notes0/5SOAP + S) 구어체 원문 + O) 관찰해석 + 날짜HD#2S02 Chief Problems0.5/5번호+영문증상명 + Remote/Recent onset3S04 Past/Family Hx0.5/46개 번호항목 + 투약 형식4S03 Informants0.5/3서술형 평가 3문장+ + Reliable 판정5S01 Identifying Data1/5항목:값 줄 나열 + 병전성격 서술형6S05 Personal History1/55단계 소제목 + 서술형 산문7S06 MSE1.5/59개 항목 + (+/-) + Mood/Affect 표준8S09 Present Illness3/124단락+ 연속 산문 + FCAB + 상대시점9S12 Psychodynamic2.5/63단락+ 연속 산문 + 고도 전문용어10S10 Diagnostic Formulation2.5/3간결 진단명 한 줄 먼저 (현재 양호)11S11 Case Formulation3/5Treatment Plan 구체화12S07 Mood Chart1.5/2수치 데이터 보완 (현재 양호)
각 프롬프트 필수 포함 요소
1. Anti-Hallucination Rules (최상단)
2. 출력 형식 규칙 ("narrative는 임상 보고서 텍스트, JSON 금지")
3. Gold Standard 예시 (해당 섹션의 실제 원본 보고서 발췌)
4. Output Format (Dual-Layer JSON 스키마)
5. Error Handling (누락 정보 처리)
산출물

system_prompt_section_01.md ~ system_prompt_section_12.md (12개 파일)
각 파일: 해당 Sub-WF의 HTTP Request 노드에 투입할 시스템 프롬프트


세션 10: WF2 노드 업데이트 + E2E 재테스트
선행 조건: 세션 9 프롬프트 12개 완성
작업내용Sub-WF 프롬프트 교체12개 Sub-WF의 HTTP Request 노드에 v3 프롬프트 적용HTML 변환 노드 단순화s34-c4를 narrative 기반 단순 이어붙이기로 교체Halluc Check 프롬프트 개선검증 대상 10섹션 확대, FP 감소 지시 추가E2E 테스트PT-2026-001 Mock → 보고서 생성 → QC 2차 채점

세션 11+: 잔여 작업
작업우선순위WF1-A 설문지 경로🟡 중간HTML→Docs GDrive convert 옵션🟡 중간Sub-WF AI 노드 HTTP→Basic LLM Chain 전환🟢 낮음 (n8n UI 수동)Queue Mode 전환 (성능 최적화)🟢 낮음실사용 테스트Phase 5

알려진 이슈
P-1 (Resolved by Design): HTML 변환 reports_folder_id 누락

세션 7 발견: HTML 변환 노드가 $('보고서 준비') 참조 시 reports_folder_id 누락
v3 해결: Dual-Layer 전환 시 HTML 변환 로직 전면 교체 예정 → 이 버그는 자연 해소

P-2 (Open): Haiku Hallucination 검증 false positive

원본 6000자 절단, 프롬프트 빈약 → 세션 10에서 개선 예정

P-3 (Open): Phase 1 팬아웃 순차 실행 (37초)

Queue Mode 전환 시 4~6초로 개선 가능 → Phase 5에서 검토



환경변수 전체 목록: .env.example 참조