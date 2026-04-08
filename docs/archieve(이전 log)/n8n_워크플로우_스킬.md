# n8n 워크플로우 설계 스킬

> claude.ai + n8n-mcp 환경 기준. 워크플로우 생성·수정·디버깅 모든 작업에 적용.

---

## 1. 워크플로우 설계 9단계 프로세스

워크플로우 요청이 들어오면 반드시 이 순서를 따른다.

| 단계 | 작업 | 사용 도구 |
|------|------|---------|
| 1. 요구사항 분석 | 트리거·처리·출력·조건 파악 | 질문 |
| 2. 태스크 분해 | 원자 단위 작업 목록화 + 의존성 파악 | 사고 |
| 3. 노드 매핑 | 각 태스크에 최적 노드 선택 | `search_nodes` |
| 4. 노드 설정 | 파라미터 완전 구성 + 검증 | `validate_node` |
| 5. 연결 구성 | 데이터 흐름 정의 (main/branch) | 설계 |
| 6. 레이아웃 | 위치 계산 (300px 간격, 좌→우) | 계산 |
| 7. 조립 | 완전한 워크플로우 JSON 생성 | 생성 |
| 8. 검증 | 연결·표현식·설정 오류 확인 | `validate_workflow` |
| 9. 출력 | JSON + 설정 가이드 제공 | 출력 |

**설계 먼저, 코딩 나중** — 노드 연결 전 데이터 흐름을 텍스트로 먼저 정의한다.

---

## 2. n8n-mcp 핵심 도구

```
search_nodes(query)          → 노드 탐색 (서비스명·동작으로 검색)
get_node(nodeType)           → 노드 상세 정보
validate_node(nodeType, config) → 노드 설정 검증
validate_workflow(workflow)  → 전체 워크플로우 검증
search_templates(query)      → 템플릿 탐색
n8n_create_workflow(...)     → 워크플로우 직접 생성
n8n_autofix_workflow(id)     → 일반 오류 자동 수정
```

**노드 탐색 전략**:
```
서비스명:  search_nodes("slack")
동작+서비스: search_nodes("google sheets append")
트리거:   search_nodes("webhook trigger")
AI 관련:  search_nodes("openai") 또는 search_nodes("anthropic")
```

---

## 3. 절대 규칙 (위반 시 런타임 오류)

### 데이터 참조
```javascript
// ✅ 항상 .first().json 사용
$('노드명').first().json.fieldName

// ❌ .item은 병렬 처리 시 인덱스 불일치
$('노드명').item.json.fieldName
```

### 타임스탬프
```javascript
// ✅ n8n Luxon (타임존 자동 반영)
$now.toISO()
$now.toFormat('yyyy-MM-dd HH:mm:ss')

// ❌ JS Date는 항상 UTC (KST 9시간 오차)
new Date().toISOString()
```

### 하드코딩 금지
```javascript
// ✅ 환경변수 또는 플레이스홀더
$env.CHAT_ID || 'PLACEHOLDER_CHAT_ID'

// ❌ 직접 값 삽입
'7833910433'
```

### 에러 워크플로우
- **Error Workflow를 첫 번째로 만든다** (마지막이 아님)
- 모든 워크플로우 Settings → `errorWorkflow` ID 지정
- 외부 API 노드 → `onError: continueRegularOutput`

## ⚠️ AI Agent 노드 필수 패턴 (절대 규칙)

AI 기능이 필요한 워크플로우에서 **Claude API 직접 호출(HTTP Request 노드)은 금지**입니다.
반드시 **n8n 내장 AI Agent 노드**를 사용합니다.

### 올바른 구조 (항상 이 형태로)
```
[트리거] → [AI Agent 노드]
                  ↓
            Chat Model* (Google Gemini / Claude / OpenAI 중 선택)
            Memory (선택)
            Tool (Perplexity / Brave / 기타 선택)
```

### 금지 패턴

❌ HTTP Request 노드로 `POST https://api.anthropic.com/v1/messages` 직접 호출  
❌ Code 노드 안에서 fetch()로 Claude API 호출  
❌ "Claude API 호출" 같은 이름의 HTTP 노드

### AI Agent 노드를 써야 하는 이유

1. **모델 교체 용이** — Chat Model 서브노드만 바꾸면 됨
2. **Tool 확장 용이** — Perplexity, Brave 등 Tool 노드를 그래프에서 직접 연결
3. **직관적 구조** — 워크플로우 그래프에서 AI 역할이 시각적으로 명확
4. **Memory 연동** — 대화 맥락 유지가 필요할 때 Memory 서브노드 연결

### 예외 허용 조건

아래 조건을 **모두** 충족할 때만 HTTP Request 직접 호출 허용:
- AI Agent 노드가 지원하지 않는 파라미터가 반드시 필요한 경우 (예: extended thinking, 특정 beta 헤더)
- 사용자가 명시적으로 직접 호출을 요청한 경우

→ 예외 적용 시 반드시 이유를 코드 주석 또는 노드 Notes에 기재

---

## 4. 연결(Connection) 형식

```json
{
  "connections": {
    "소스노드명": {
      "main": [
        [{"node": "타겟노드명", "type": "main", "index": 0}]
      ]
    }
  }
}
```

**IF 노드 (true/false 분기)**:
```json
"IF노드": {
  "main": [
    [{"node": "True경로", "type": "main", "index": 0}],
    [{"node": "False경로", "type": "main", "index": 0}]
  ]
}
```

**주의**: connections의 키는 노드 `name` 필드 (id 아님)

---

## 5. 노드 레이아웃 기준

```
시작 위치: [250, 300]
수평 간격: 300px (노드 간)
수직 간격: 150px (병렬 경로 간)

선형:  [250,300] → [550,300] → [850,300]
분기:  IF [550,300] → True [850,200] / False [850,400]
병렬:  Merge 전 각 경로 수직 150px 간격
```

---

## 6. 워크플로우 JSON 기본 구조

```json
{
  "name": "서비스A to 서비스B",
  "nodes": [
    {
      "id": "고유ID",
      "name": "사람이 읽을 수 있는 이름",
      "type": "n8n-nodes-base.nodeType",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {}
    }
  ],
  "connections": {},
  "settings": {
    "executionOrder": "v1",
    "saveExecutionProgress": true,
    "saveManualExecutions": true,
    "saveDataErrorExecution": "all",
    "timezone": "Asia/Seoul"
  }
}
```

---

## 7. 자주 하는 실수 TOP 10

| # | 실수 | 증상 | 해결 |
|---|------|------|------|
| 1 | Error Workflow 미연결 | 오류 시 무응답 | Settings → errorWorkflow |
| 2 | `.item` vs `.first()` 혼용 | 간헐적 누락 | `.first()` 통일 |
| 3 | UTC 타임스탬프 | 9시간 오차 | `$now.toISO()` |
| 4 | 하드코딩 chatId/API키 | 환경 변경 시 수동 수정 | `$env` 사용 |
| 5 | API 노드 파라미터 위치 오류 | 필터 미적용 | n8n 문서 확인 |
| 6 | 빈 시트에서 워크플로우 중단 | 데이터 없음 오류 | `alwaysOutputData: true` |
| 7 | 같은 배치에서 rename + rewire | 연결 끊김 | rename 저장 후 별도 rewire |
| 8 | connections 키를 id로 기입 | 연결 안 됨 | name 필드 사용 |
| 9 | Sub-workflow v1.1 사용 | 활성화 오류 | `executeWorkflowTrigger` v1 |
| 10 | 워크플로우 비활성 상태 | 트리거 미동작 | Active 토글 ON |

---

## 8. 표현식 빠른 참조

```javascript
// 데이터 접근
={{$json.fieldName}}          // 현재 아이템
={{$json.user?.email}}        // 안전한 중첩 접근
={{$('노드명').first().json.field}} // 특정 노드 참조

// 시간
={{$now.toFormat('yyyy-MM-dd')}}
={{$now.plus({days: 7})}}

// 조건
={{$json.age >= 18 ? "성인" : "미성년"}}
={{$json.name || "Unknown"}}   // 기본값

// 문자열
={{`안녕하세요, ${$json.name}님`}}
={{$json.email.toLowerCase()}}

// 배열
={{$json.items.length}}
={{$json.tags.join(', ')}}
```

---

## 9. 투자 자동화 전용 설정

**구현 대상**: WF1(주간리포트) · WF2(이벤트알림) · WF3(분기점검)

**모델 API 문자열** (n8n JSON 작성 시 그대로 사용 — 이 파일이 단일 권위 출처):
```
분류·요약·판단  → claude-haiku-4-5-20251001
리포트·검증    → claude-sonnet-4-6-20250514
진단·설계      → claude-opus-4-6 (WF3 전용)
Vision 파싱    → claude-sonnet-4-6-20250514
```

> Credentials ID·사용 WF 매핑 → `n8n_아키텍처_요약 §6` 참조 (단일 권위 출처)
> 에러 처리 재시도 횟수·폴백 원칙 → `n8n_아키텍처_요약 §5` 참조