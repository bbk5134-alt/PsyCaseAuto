# Stage 1 — Perplexity 논문 검색 워크플로우 제작 기록

> **작성일**: 2026-03-29  
> **워크플로우 ID**: `XCZpgZw5rroqOaH8`  
> **배포 환경**: Railway (`primary-production-b48fc.up.railway.app`)  
> **최종 상태**: ✅ 정상 작동 확인

---

## 1. 목적

양극성 장애(BD)와 Alcohol-induced Bipolar and Related Disorder의 **감별 진단** 대비를 위해, PubMed에서 관련 논문 10편을 자동 검색하고 그 결과를 Google Drive에 Markdown 파일로 저장하는 n8n 워크플로우.

케이스 컨퍼런스 Q&A 준비 **4단계 파이프라인의 STAGE 1**에 해당한다.

---

## 2. 설계 결정사항

### 2-1. Trigger 방식: Manual

| 옵션 | 채택 여부 | 이유 |
|------|-----------|------|
| Manual Trigger | ✅ **채택** | Stage 1은 1회성 작업. 결과 검증 후 Stage 2로 수동 진행 |
| Schedule Trigger | ❌ | 반복 실행 의미 없음 |
| Webhook | ❌ | 외부 호출 불필요 |

### 2-2. 저장소: Google Drive

| 옵션 | 채택 여부 | 이유 |
|------|-----------|------|
| Google Drive | ✅ **채택** | Perplexity 결과 영구 보존, Stage 2 (Claude Opus)에 붙여넣기 원본으로 활용 |
| n8n 내부 저장 | ❌ | 컨텍스트 윈도우 외부로 결과 반출 불가 |
| 이메일 발송 | ❌ | 수정·재활용 불편 |

저장 폴더: `PsyCaseAuto` (`1awOFEQ8U2gjCdUWv6BXN3_OGUe9CeeVv`)

### 2-3. 핵심 설계 원칙

- **할루시네이션 방지**: 검색 결과에 없는 논문 생성 절대 금지 — System Prompt에 명시
- **불확실 항목 표기**: 저자/연도/저널 중 하나라도 불확실 시 `[확인 필요]` 표기
- **5개 영역 강제 커버**: A(감별기준) · B(신경생물학) · C(알고리즘) · D(종적경과) · E(DSM한계)

---

## 3. 제작 과정

### STEP 1: 초기 설계 — HTTP Request 방식 (실패)

Claude MCP를 통해 최초 워크플로우를 생성. 당시 구조:

```
[수동 실행] → [프롬프트 빌드(Code)] → [Perplexity API 호출(HTTP Request)]
                                          ↓ (연결 끊김)
                                    [응답 파싱] → [Google Drive] → [완료 로그]
```

**발견된 문제점 4가지:**

| # | 문제 | 유형 |
|---|------|------|
| 1 | `Perplexity API 호출` 노드가 메인 플로우에서 완전히 분리된 **고아 노드** | Critical |
| 2 | `프롬프트 빌드` 노드가 만든 `requestBody`가 다음 노드와 **미연결** | Critical |
| 3 | 검증 시 `typeVersion: 4.2` → 최신 4.4로 업그레이드 필요 | Warning |
| 4 | Google Drive 노드의 `name` 필드가 resource locator 형식 미준수 | Warning |

**결론**: HTTP Request 방식은 인증 처리와 연결 구조가 복잡하여 AI Agent + Tool 방식으로 전환 결정.

---

### STEP 2: 구조 전환 — AI Agent + Perplexity Tool 방식

n8n 네이티브 Perplexity Tool 노드를 발견. 아래 구조로 전면 재설계:

```
[수동 실행]
    ↓
[AI Agent] ←─── (Model) Anthropic Chat Model (Claude Opus)
    ↓       └─── (Tool)  Message a model in Perplexity
[응답 파싱 및 파일 변환]
    ↓
[Google Drive 저장]  →  PsyCaseAuto/Stage1_Papers_YYYYMMDD_HHmm.md
    ↓
[완료 로그]
```

**이 구조를 선택한 이유:**

```
1. n8n 네이티브 노드 활용 → 인증이 Credential로 깔끔하게 관리됨
2. Claude Opus가 Orchestrator 역할
   → Perplexity 검색 결과를 포맷팅·필터링
   → System Prompt로 할루시네이션 억제 지시 가능
3. Perplexity가 Tool로서 실제 PubMed 검색 수행
   → 지식 컷오프 문제 없이 최신 논문 검색
```

---

### STEP 3: 검증 오류 수정 이력

Claude MCP `n8n_validate_workflow` 호출로 오류를 순차 수정.

**1차 검증 결과 (에러 1개):**

```
ERROR: Message a model in Perplexity
  → Invalid value for 'operation'. Must be one of: complete
  원인: typeVersion 1에서 operation 파라미터 필드명 불일치
  수정: operation: "complete" 명시 + typeVersion: 2로 업그레이드
```

**2차 검증 결과 (에러 0개, 경고 7개):**

| 경고 항목 | 처리 방법 |
|-----------|-----------|
| `Anthropic Chat Model: Not reachable from trigger` | **정상** — AI Agent의 하위 노드는 직접 연결 없음 |
| `Message a model in Perplexity: Not reachable from trigger` | **정상** — 동일 사유 |
| `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE` | Railway 환경변수 확인 필요 (실행 시 오류 없으면 설정됨) |
| Code 노드 에러 처리 없음 | 허용 — 단순 파싱 코드, 크리티컬 아님 |

---

### STEP 4: Perplexity Tool 노드 파라미터 문제 및 사용자 직접 수정

Claude MCP가 설정한 Perplexity Tool 파라미터가 실제 실행 시 작동하지 않는 문제 발생.

**문제 원인:**

```
Claude MCP가 설정한 파라미터:
  messages.message[0].content = $fromAI('query', '...')  ← 미동작

실제 n8n 자동 생성 파라미터 (정상 작동):
  messages.message[0].content = $fromAI('message0_Text', '', 'string')
  simplify = $fromAI('Simplify_Output', '', 'boolean')
```

n8n이 Perplexity Tool 노드를 AI Agent에 연결할 때 **자동으로 파라미터 이름을 재생성**하는 내부 규칙이 있었으며, 이를 MCP가 감지하지 못함.

**해결**: 사용자가 n8n UI에서 Perplexity Tool 노드를 **직접 재추가**하여 자동 생성된 파라미터로 교체 → 정상 작동 확인.

---

## 4. 최종 워크플로우 구조

### 노드 목록

| 노드명 | 타입 | 역할 | typeVersion |
|--------|------|------|-------------|
| 수동 실행 | `manualTrigger` | 워크플로우 시작 | 1 |
| AI Agent | `langchain.agent` | Orchestrator (검색 지시 + 결과 포맷팅) | 3.1 |
| Anthropic Chat Model | `langchain.lmChatAnthropic` | Claude Opus — Agent 두뇌 | 1.3 |
| Message a model in Perplexity | `perplexityTool` | PubMed 실제 검색 수행 | 1 (자동 파라미터) |
| 응답 파싱 및 파일 변환 | `code` | Agent 출력 → .md 파일 변환 | 2 |
| Google Drive 저장 | `googleDrive` | PsyCaseAuto 폴더에 업로드 | 3 |
| 완료 로그 | `set` | 다음 단계 안내 메시지 출력 | 3.4 |

### 연결 구조

```
수동 실행 ──main──▶ AI Agent ──main──▶ 응답 파싱 ──main──▶ Google Drive ──main──▶ 완료 로그
                       ▲
              ai_languageModel │ Anthropic Chat Model
              ai_tool          │ Message a model in Perplexity
```

### AI Agent System Prompt 핵심 내용

```
역할: 정신건강의학과 임상 연구 전문가

핵심 제약:
- Perplexity 검색 결과에 있는 논문 정보만 출력
- 검색 결과에 없는 내용을 추가하거나 추론: 절대 금지
- 저자명/연도/저널명/DOI 불확실 시 [확인 필요] 표기
- 빈칸 채우기 위해 논문 생성: 절대 금지

출력 형식: Markdown 표 (영역 A~E 분류 포함)
```

---

## 5. 실행 결과 확인

**실행 일시**: 2026-03-29 23:15 (KST)  
**저장 파일**: `Stage1_Papers_20260329_2315.md`

### 검색 결과 요약

| 영역 | 해당 논문 수 | 대표 논문 |
|------|------------|-----------|
| A — 감별 기준 (시간적 선후관계) | 3편 | Schuckit 1995, Weiler 1994, Strakowski 2019 |
| B — 신경생물학적 겹침 | 2편 | Hunt 2016, Hunt 2013 |
| C — 구분 알고리즘 | 2편 | Maurer 2012, Nagaraja 2024 |
| D — 종적 경과 | 4편 | McKetin 2014, Goldberg 2006, Ossola 2024 |
| E — DSM-5 기준 한계 | 2편 | Hunt 2013, Nagaraja 2024 |

**총 10편 검색 완료** (일부 항목 `[확인 필요]` 표기됨)

### 주요 확인 필요 항목

| 논문 | 불확실 항목 |
|------|------------|
| 논문 3 (Strakowski 2019) | 저널명, PMID |
| 논문 4 (Maurer 2012) | 저널명 |
| 논문 5, 6 (Hunt 2016, 2013) | 저널명, PMID |
| 논문 9 (Ossola 2024) | 저널명 |
| 논문 10 (Nagaraja 2024) | 저널명, PMID |

---

## 6. 사용 방법

### 실행 절차

```
1. Railway n8n 접속
   https://primary-production-b48fc.up.railway.app/workflow/XCZpgZw5rroqOaH8

2. "Execute workflow" 버튼 클릭

3. AI Agent가 Perplexity Tool을 사용해 PubMed 검색 수행
   (약 30-90초 소요)

4. 결과가 Google Drive PsyCaseAuto 폴더에 자동 저장됨
   파일명: Stage1_Papers_YYYYMMDD_HHmm.md

5. 파일에서 🚩 [확인 필요] 항목을 PubMed에서 직접 검증

6. 검증 완료 후 → STAGE 2 (Claude Opus 논문 요약)로 진행
```

### Credentials 설정 (최초 1회)

| Credential 이름 | 타입 | 설정값 |
|----------------|------|-------|
| `Anthropic account` | Anthropic API | API Key 입력 |
| `Perplexity account` | Perplexity API | API Key 입력 |
| `Google Drive account` | Google Drive OAuth2 | Google 계정 인증 |

---

## 7. 후속 단계 안내

```
STAGE 1 (본 워크플로우) ✅
    → PubMed 논문 10편 검색 및 Google Drive 저장

STAGE 2 (다음 단계)
    → Claude Opus에 Stage 1 결과 붙여넣기
    → 논문 10편 내용 요약 (3-4편씩 분할 처리 권장)
    → 각 논문: 연구설계 / 핵심결과 / 저자결론 / 감별포인트 / 한계점 추출

STAGE 3
    → 최종 5편 선정 (점수 기반)
    → 심층 분석

STAGE 4
    → 케이스컨퍼런스_감별진단_QA_통합본.md와 교차 적용
    → Q&A 답변 강화 및 상충 처리
```

---

## 8. 알려진 한계점 및 주의사항

```
1. Perplexity Tool 파라미터는 n8n UI에서 직접 연결할 때 자동 생성되므로
   MCP를 통한 파라미터 설정이 실제 실행 시 다를 수 있음
   → 노드 UI에서 파라미터 자동 생성 여부를 항상 확인할 것

2. 검색 결과의 정확도는 Perplexity sonar-pro 모델에 의존함
   → 반드시 PubMed에서 PMID/DOI 직접 검증 후 Stage 2 진행

3. Claude Opus의 System Prompt로 할루시네이션을 억제하지만
   완전한 방지는 불가능 — [확인 필요] 표기 항목 수동 검토 필수

4. 실행당 Perplexity API 토큰 소비량: 약 2,000-4,000 토큰 예상
```

---

*이 문서는 Claude (claude.ai) + n8n MCP를 활용한 워크플로우 제작 과정을 기록한 빌드 로그입니다.*
