# WF2 개선 계획 v2 — Claude Code 구현 가이드

> 작성일: 2026-04-01
> 근거: WF2 E2E 테스트 (Execution #332, 4분 26초) + 코드 리뷰
> 대상 WF: `LiN5bKslyWtZX6yG` (PsyCaseAuto — WF2 보고서 생성 메인, 68노드)
> 상태: **즉시 시행**

---

## 읽기 전 필수 확인

Claude Code는 작업 시작 전 반드시 아래 파일을 로드하세요:

| 파일 | 용도 |
|------|------|
| `PROGRESS_LOG.md` | 현재까지의 세션 기록, 기술 결정 D-01~D-27, 노드 ID 참조 |
| `n8n_워크플로우_스킬.md` | n8n 구현 규칙 (`.first().json`, 타임스탬프, 하드코딩 금지 등) |
| `system_prompt_case_conference.md` | Mode B 출력 JSON 스키마 (섹션별 content 구조 참조) |

---

## 작업 단위 요약 (10개, 난이도순)

| # | 작업 | 난이도 | 수정 대상 | 세션 분리 |
|---|------|:------:|----------|:---------:|
| FIX-1 | Hallucination API jsonBody 누락 수정 | 극하 | WF2 Main `s34-a2` | 세션 A |
| FIX-2 | Telegram parse_mode 제거 | 극하 | WF2 Main `s34-d1`, `s34-c6` | 세션 A |
| FIX-3 | HTML v() 함수 [object Object] 수정 | 하 | WF2 Main `s34-c4` | 세션 A |
| FIX-4 | 메타데이터 필터링 (source_ref 등) | 하 | WF2 Main `s34-c4` | 세션 A |
| FIX-5 | Execute WF 노드 onError 추가 (8개) | 하 | WF2 Main `p1-exec-s01`~`s08` | 세션 A |
| FIX-6 | 중간 진행 알림 추가 | 하 | WF2 Main (노드 1개 추가) | 세션 A |
| FIX-7 | 파일명 중복 방지 (시각 추가) | 극하 | WF2 Main `s34-a3` | 세션 A |
| STRUCT-1 | Drive 선저장 구조 변경 | 중 | WF2 Main Stage 3-4 재배선 | 세션 B |
| STRUCT-2 | patient_folder_id 체인 전달 | 중 | WF2 Main 다수 노드 | 세션 B |
| STRUCT-3 | chat_id 보안 제거 (저장 JSON) | 하 | WF2 Main `s34-a3` | 세션 B |

**세션 분리 기준**: 세션 A (코드 수정 7개, 30분 이내) → E2E 테스트 → 세션 B (구조 변경 3개, 30분)

---

## 세션 A: 즉시 수정 (FIX-1 ~ FIX-7)

---

### FIX-1: Hallucination API jsonBody 누락 수정

#### 문제

`Hallucination 검증 API` 노드 (id: `s34-a2`)에 `specifyBody: "json"` 설정은 있지만 **`jsonBody` 파라미터가 아예 없음**. Anthropic API에 빈 body를 POST → 400 에러 → `onError: continueRegularOutput`으로 흘러감 → `parse_error: true`.

#### 원인

노드 생성 시 body 내용을 빠뜨림. 이전 `Hallucination 검증 준비` 노드에서 `system_prompt`과 `hallucination_check_input`을 만들어놓았으나 API 노드에서 이를 참조하지 않음.

#### 수정 내용

`Hallucination 검증 API` 노드 (`s34-a2`)의 parameters에 `jsonBody` 추가:

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.anthropic.com/v1/messages",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "x-api-key", "value": "={{ $env.ANTHROPIC_API_KEY }}" },
        { "name": "anthropic-version", "value": "2023-06-01" },
        { "name": "content-type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2048, system: $('Hallucination 검증 준비').first().json.system_prompt, messages: [{ role: 'user', content: $('Hallucination 검증 준비').first().json.hallucination_check_input }] }) }}",
    "options": { "timeout": 60000 }
  }
}
```

#### 검증

- [ ] WF2 수동 실행 → `Hallucination 검증 API` 노드 출력에서 `content[0].text`에 JSON 문자열 존재 확인
- [ ] `검증 결과 통합` 노드 출력에서 `parse_error: false` 확인

#### ⚠️ 주의

`specifyBody: "json"` + `jsonBody` 조합에서 n8n이 자동으로 JSON.stringify를 한 번 더 할 수 있음. 만약 "이중 직렬화" 오류가 발생하면 대안:

```
"specifyBody": "string",
"body": "={{ JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2048, system: $('Hallucination 검증 준비').first().json.system_prompt, messages: [{ role: 'user', content: $('Hallucination 검증 준비').first().json.hallucination_check_input }] }) }}"
```

이 경우 `content-type` 헤더는 유지해야 함.

---

### FIX-2: Telegram parse_mode 제거

#### 문제

`완성 알림` 노드 (id: `s34-d1`)의 `parse_mode: "Markdown"`이 GDrive `webViewLink` URL 내의 `_` 문자를 Markdown italic으로 해석 → **Telegram API가 메시지 전송을 거부** (400 Bad Request). 워크플로우 자체는 성공으로 기록되지만 알림이 안 옴.

#### 수정 내용

**수정 1**: `완성 알림` 노드 (id: `s34-d1`)에서 parse_mode 제거:

```json
{
  "parameters": {
    "chatId": "={{ $json.chat_id }}",
    "text": "={{ $json.message_text }}",
    "additionalFields": {
      "disable_web_page_preview": true
    }
  }
}
```

`"parse_mode": "Markdown"` 행을 `additionalFields`에서 삭제.

**수정 2**: `완성 메시지 구성` 노드 (id: `s34-c6`)의 jsCode에서 Markdown 문법 제거:

```javascript
// 변경 전
'✅ *' + ctx.patient_code + '* 보고서 생성 완료'
'[HTML 초안](' + docxLink + ')'

// 변경 후
'✅ ' + ctx.patient_code + ' 보고서 생성 완료'
'HTML 초안: ' + docxLink
'JSON 원본: ' + jsonLink
```

전체 교체 jsCode:

```javascript
const ctx = $('Log 직렬화').first().json;
const check = ctx.hallucination_check;
const qm = ctx.quality_metrics;
const docxLink = $input.first().json.webViewLink || '(링크 없음)';
const jsonLink = ctx.json_webViewLink || '(링크 없음)';

let alertLine = '';
if (ctx.alert === 'HIGH_SUICIDE_RISK') alertLine = '\n🚨 HIGH SUICIDE RISK 감지 — 즉시 안전 평가 필요\n';

let hallucLine = '';
if (check.parse_error) hallucLine = '⚠️ Hallucination 검증 실패 — 수동 검토 필요';
else if (check.hallucination_detected && check.high_severity_count > 0) hallucLine = '🔴 심각 이슈 ' + check.high_severity_count + '건 — 보고서 검토 필수';
else if (check.issues_count > 0) hallucLine = '🟡 경미 이슈 ' + check.issues_count + '건';
else hallucLine = '🟢 Hallucination 이슈 없음';

const text = '✅ ' + ctx.patient_code + ' 보고서 생성 완료'
  + alertLine
  + '\n\n📊 품질'
  + '\n완성: ' + qm.sections_complete + '/12 | 부분: ' + qm.sections_partial + ' | 누락: ' + qm.sections_missing
  + '\n완성도: ' + Math.round(qm.completeness_score * 100) + '%'
  + '\n\n🔍 Hallucination 검증'
  + '\n' + hallucLine
  + '\n\n📂 파일'
  + '\nHTML 초안: ' + docxLink
  + '\nJSON 원본: ' + jsonLink
  + '\n\n⏱ ' + $now.toFormat('HH:mm')
  + '\n⚠️ AI 초안입니다. 반드시 검토 후 사용하세요.';

return [{ json: { chat_id: ctx.chat_id, message_text: text } }];
```

#### 검증

- [ ] Telegram에 완성 알림 메시지 정상 수신
- [ ] GDrive 링크가 URL로 표시됨 (깨지지 않음)

---

### FIX-3: HTML v() 함수 [object Object] 수정

#### 문제

`HTML 보고서 변환` 노드 (id: `s34-c4`)의 `v()` 함수가 Object/Array 타입을 처리하지 못함.
- Claude가 `education: { level: "대졸", field: "글로벌서비스학부" }` 같은 객체를 반환 → `String({...})` → `[object Object]`
- Chief Problems `content`가 배열인데 `v(s2)` 호출 시 `[object Object]` 출력

#### 수정 내용

`HTML 보고서 변환` 노드의 jsCode 최상단 `v()` 함수를 교체:

```javascript
// === 변경 전 ===
const v = (x) => (x != null && x !== 'missing' && x !== '') ? String(x) : '';

// === 변경 후 ===
const META_KEYS = new Set(['source_ref', 'type', 'confidence', 'factual', 'informant_source']);
const v = (x) => {
  if (x == null || x === 'missing' || x === '') return '';
  if (typeof x === 'string') return x;
  if (typeof x === 'number' || typeof x === 'boolean') return String(x);
  if (Array.isArray(x)) return x.map(i => v(i)).filter(Boolean).join('; ');
  if (typeof x === 'object') {
    return Object.entries(x)
      .filter(([k]) => !META_KEYS.has(k) && x[k] != null)
      .map(([k, val]) => {
        const rendered = v(val);
        return rendered ? `${k}: ${rendered}` : '';
      })
      .filter(Boolean)
      .join(', ');
  }
  return String(x);
};
```

#### 검증

- [ ] Identifying Data의 education, occupation 등이 `[object Object]` 없이 표시
- [ ] Chief Problems 목록이 정상 렌더링
- [ ] Progress Notes (배열)가 정상 렌더링

---

### FIX-4: 메타데이터 필터링

#### 문제

Case Formulation 등에서 `source_ref`, `type`, `confidence`, `factual` 필드가 본문에 그대로 노출. 가독성 심각하게 저하.

#### 수정 내용

FIX-3의 `META_KEYS` Set에 이미 포함됨. `v()` 함수가 객체를 렌더링할 때 자동 필터링.

추가로, 각 섹션별 렌더링에서 `four_p_model` 내부 배열 요소가 객체일 때의 처리를 보강. `HTML 보고서 변환` 노드의 Case Formulation 섹션:

```javascript
// === 변경 전 ===
if (Array.isArray(val)) {
  h += '<ul>';
  for (const i of val) h += `<li>${typeof i==='string'?i:JSON.stringify(i)}</li>`;
  h += '</ul>';
}

// === 변경 후 ===
if (Array.isArray(val)) {
  h += '<ul>';
  for (const i of val) h += `<li>${v(i)}</li>`;
  h += '</ul>';
}
```

#### 검증

- [ ] Case Formulation에서 `source_ref`, `type` 등이 본문에 노출되지 않음
- [ ] 4P 모델의 배열 항목이 사람이 읽을 수 있는 형태로 표시

---

### FIX-5: Execute WF 노드 onError 추가

#### 문제

`섹션1 보고서 생성` ~ `섹션8 보고서 생성` (id: `p1-exec-s01`~`p1-exec-s08`) 8개 executeWorkflow 노드에 `onError` 설정 없음. Sub-WF 자체가 실행 실패(WF ID 오류, 비활성화 등)하면 `섹션 병렬 수집` Merge 노드가 8개 입력 중 N개를 영원히 대기 → **워크플로우 무한 대기**.

#### 수정 내용

8개 노드에 `onError` 추가:

```
대상 노드 ID: p1-exec-s01, p1-exec-s02, p1-exec-s03, p1-exec-s04,
             p1-exec-s05, p1-exec-s06, p1-exec-s07, p1-exec-s08
```

각 노드에 추가:
```json
"onError": "continueRegularOutput"
```

**Phase 2 직렬 체인도 동일 적용** (4개):
```
대상 노드 ID: p2-exec-s09, p2-exec-s10, p2-exec-s11, p2-exec-s12
```

총 12개 executeWorkflow 노드에 `onError` 추가.

#### 검증

- [ ] 임의로 1개 Sub-WF 비활성화 → WF2 Main 실행 → 에러 섹션이 `status: "error"`로 포함되고 나머지 섹션 정상 완료 확인
- [ ] 테스트 후 비활성화한 Sub-WF 다시 활성화

---

### FIX-6: 중간 진행 알림 추가

#### 문제

4분+ 동안 Telegram 무응답 → 사용자(전공의)가 진행 여부 판단 불가.

#### 수정 내용

**노드 1개 추가**: `Phase 1 결과 병합` (id: `p1-merge`) → 새 `Phase 1 완료 알림` (Telegram) → `S09 입력 전달` (id: `p2-relay-s09`)

새 노드:

```json
{
  "id": "s34-mid-alert",
  "name": "Phase 1 완료 알림",
  "type": "n8n-nodes-base.telegram",
  "typeVersion": 1.2,
  "position": [4880, 240],
  "credentials": {
    "telegramApi": { "id": "8T0Q83WRhTEEdvSL", "name": "Telegram account 4" }
  },
  "parameters": {
    "chatId": "={{ $json.chat_id }}",
    "text": "={{ '📊 ' + $json.patient_code + ' Phase 1 완료 (' + $json.completed_count + '/' + $json.section_count + ' 섹션)\\n오류: ' + $json.error_count + '건\\nPhase 2 (4섹션) 진행 중... 예상 2~3분' }}",
    "additionalFields": {}
  }
}
```

**연결 변경**:
- 기존: `Phase 1 결과 병합` → `S09 입력 전달`
- 변경: `Phase 1 결과 병합` → `Phase 1 완료 알림` → `S09 입력 전달`

추가로, `생성 시작 알림` 노드 (id: `wf2-n21`)의 text에 예상 소요 시간 추가:

```javascript
// 변경 전
'시작 시각: ' + $now.toFormat('HH:mm') + '\\n섹션 생성 Sub-WF 연결 대기 중...'

// 변경 후  
'시작 시각: ' + $now.toFormat('HH:mm') + '\\n예상 소요: 4~5분. 완료 시 알림 드립니다.'
```

#### 검증

- [ ] WF2 실행 시 Phase 1 완료 후 Telegram 중간 알림 수신
- [ ] Phase 2 정상 진행 (알림 노드가 데이터 흐름을 차단하지 않음)

---

### FIX-7: 파일명 중복 방지

#### 문제

같은 날 2회 실행 시 `draft_20260401_v1.json` 이름이 동일 → GDrive에 동명 파일 2개 생성 → 추후 검증/조회 시 혼란.

#### 수정 내용

`검증 결과 통합` 노드 (id: `s34-a3`)의 jsCode에서 `dateStr` 생성 부분 수정:

```javascript
// 변경 전
const dateStr = $now.toFormat('yyyyMMdd');

// 변경 후
const dateStr = $now.toFormat('yyyyMMdd_HHmm');
```

결과 파일명 예시: `draft_20260401_1430_v1.json`, `draft_20260401_1430_v1.html`

#### 검증

- [ ] 파일명에 시각 포함 확인

---

## 세션 A 완료 후 E2E 테스트

세션 A의 7개 수정을 모두 적용한 뒤, 아래 순서로 E2E 테스트:

```
1. WF2 Main 활성화
2. Telegram → "PT-2026-001 보고서"
3. 확인 항목:
   - [ ] 생성 시작 알림 수신 (예상 소요 시간 포함)
   - [ ] Phase 1 중간 알림 수신
   - [ ] Phase 2 완료 후 완성 알림 수신
   - [ ] 완성 알림에 GDrive 링크 정상 표시 (깨지지 않음)
   - [ ] Hallucination 검증 결과: parse_error: false
   - [ ] GDrive files: JSON + HTML + hallucination_log (파일명에 시각 포함)
   - [ ] HTML 보고서: [object Object] 없음, 메타데이터 미노출
4. WF2 Main 비활성화 (테스트 완료)
```

---

## 세션 B: 구조 변경 (STRUCT-1 ~ STRUCT-3)

> 세션 A E2E 테스트 통과 후 진행

---

### STRUCT-1: Drive 선저장 구조 변경

#### 문제

현재: `Phase 2 결과 병합 → Hallucination 검증 → Drive 저장 → Telegram`
Hallucination 검증 실패 시 보고서 전달도 지연됨.

#### 변경 후 흐름

```
Phase 2 결과 병합
  → Drive 폴더 준비 (reports/logs 검색·생성)
  → JSON 초안 직렬화 → JSON 초안 저장
  → HTML 보고서 변환 → HTML 보고서 저장
  → Telegram 1차 알림 (보고서 완성, 검증은 별도)
  → Hallucination 검증 준비 → 검증 API → 검증 결과 통합
  → Log 직렬화 → Hallucination 로그 저장
  → Telegram 2차 알림 (검증 결과)
```

#### 핵심 변경

1. **Drive 폴더 준비 블록** (`s34-b1`~`s34-b6`)을 Hallucination 검증 **앞**으로 이동
2. **JSON/HTML 저장**을 Hallucination 검증 **앞**으로 이동
3. **Telegram 1차 알림** 추가 (보고서 파일 링크 포함, 검증 미완료 명시)
4. **Hallucination 검증**을 저장 **뒤**로 이동 (실패해도 보고서는 이미 저장됨)
5. **Telegram 2차 알림** 추가 (검증 결과만)

#### 연결 재배선 계획

```
[Phase 2 결과 병합]
  → [reports 서브폴더 검색] → [reports 폴더 확인] → ...→ [reports 폴더 ID 확정]
  → [logs 서브폴더 검색] → [logs 폴더 확인] → ...→ [logs 폴더 ID 확정]
  → [JSON 초안 직렬화] → [JSON 초안 저장]
  → [HTML 보고서 변환] → [HTML 보고서 저장]
  → [1차 완성 알림] (NEW)
  → [Hallucination 검증 준비] → [검증 API] → [검증 결과 통합]
  → [Log 직렬화] → [Hallucination 로그 저장]
  → [2차 검증 알림] (NEW)
```

#### 새 노드 (2개)

**1차 완성 알림** (보고서 저장 직후):
```
📄 {patient_code} 보고서 저장 완료
완성도: {completeness_score}%
HTML: {link}
JSON: {link}
⏳ Hallucination 검증 진행 중...
```

**2차 검증 알림** (검증 완료):
```
🔍 {patient_code} Hallucination 검증 완료
{검증 결과 요약}
⚠️ AI 초안입니다. 반드시 검토 후 사용하세요.
```

#### 수정 대상 노드

| 노드 | 변경 |
|------|------|
| `검증 결과 통합` (s34-a3) | `patient_folder_id` 참조 방식 변경 (체인 전달로) |
| `JSON 초안 직렬화` (s34-c1) | `$('logs 폴더 ID 확정')` 대신 `$input` 기반으로 변경 |
| `Log 직렬화` (s34-c1b) | 선행 노드 변경에 따른 참조 수정 |
| `완성 메시지 구성` (s34-c6) | 2차 검증 알림 전용으로 변경 |
| `완성 알림` (s34-d1) | 2차 검증 알림으로 변경 |

#### ⚠️ 구현 주의

1. 연결 재배선 시 **기존 연결 먼저 모두 제거 → 새 연결 추가** 순서 준수
2. 노드 rename과 rewireConnection을 같은 batch에서 하지 말 것
3. IF 분기 (reports/logs 폴더 확인)의 true/false 양쪽 경로가 ID 확정 노드로 수렴하는지 재확인
4. binary 데이터 전달: GDrive upload 노드 이후 `$input`은 GDrive 결과로 교체됨 — 이전 ctx는 원거리 참조 필요 (STRUCT-2에서 개선)

---

### STRUCT-2: patient_folder_id 체인 전달

#### 문제

`검증 결과 통합` (s34-a3)에서 `$('환자 폴더 ID 확정').first().json.patient_folder_id`로 40+ 노드 건너뛰는 원거리 참조. n8n 버전 변경 시 참조 범위 변경 위험.

#### 수정 계획

`patient_folder_id`를 데이터 흐름 체인으로 전달:

1. `면담 데이터 병합` (wf2-n18) jsCode에 추가:
```javascript
patient_folder_id: $('파일 목록 수집').first().json.patient_folder_id,
```

2. `Phase 1 결과 병합` (p1-merge) jsCode에 추가:
```javascript
patient_folder_id: mergedData.patient_folder_id,
```

3. `Phase 2 결과 병합` (p2-merge) jsCode에 추가:
```javascript
patient_folder_id: $('면담 데이터 병합').first().json.patient_folder_id,
```

4. Stage 3-4의 모든 `$('환자 폴더 ID 확정').first().json.patient_folder_id` 참조를:
   - STRUCT-1 적용 후의 직전 노드 `$input` 또는 `$json` 기반으로 변경

#### 검증

- [ ] WF2 JSON에서 `환자 폴더 ID 확정` 문자열 검색 → Stage 3-4 영역에서 0건

---

### STRUCT-3: chat_id 보안 제거

#### 문제

`검증 결과 통합` (s34-a3)에서 `finalReport`에 `patient_code`, `chat_id`가 포함된 채 GDrive JSON 파일로 저장됨. `chat_id`는 Telegram ID로 개인정보에 해당.

#### 수정 내용

`검증 결과 통합` 노드 jsCode에서 finalReport 구성 시 chat_id 제외:

```javascript
// 변경 전
const finalReport = { ...snapshot, hallucination_check: { checked_at: $now.toISO(), ...checkResult } };

// 변경 후
const { chat_id: _chatId, ...snapshotClean } = snapshot;
const finalReport = { ...snapshotClean, hallucination_check: { checked_at: $now.toISO(), ...checkResult } };
```

`chat_id`는 `json` 레벨에서 별도 전달 (기존대로):
```javascript
return [{ json: {
  patient_code: snapshot.patient_code,
  chat_id: snapshot.chat_id,  // json 레벨에서만 유지 (노드 간 전달용)
  ...
  final_report: finalReport,  // final_report 안에는 chat_id 없음
} }];
```

#### 검증

- [ ] GDrive에 저장된 `draft_*_v1.json` 파일 내용에서 `chat_id` 검색 → 0건

---

## 세션 B 완료 후 E2E 테스트

```
1. WF2 Main 활성화
2. Telegram → "PT-2026-001 보고서"
3. 확인 항목:
   - [ ] 생성 시작 알림 (예상 소요 시간)
   - [ ] Phase 1 중간 알림
   - [ ] 1차 완성 알림 (보고서 파일 링크, 검증 진행 중)
   - [ ] 2차 검증 알림 (검증 결과)
   - [ ] GDrive JSON 파일에 chat_id 미포함
   - [ ] Hallucination 검증 실패 시에도 1차 알림 + 파일 저장 정상
4. WF2 Main 비활성화
```

---

## 향후 작업 (본 계획 범위 밖)

아래 항목은 세션 A/B 완료 후 별도 계획으로 진행합니다. 본 세션에서 절대 수행하지 마세요.

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| HTML→Google Docs 변환 | GDrive upload 시 `convert: true` 옵션으로 HTML→Docs 자동 변환. Dockerfile 수정 불필요 | 🟡 중 |
| Sub-WF AI 노드 전환 | 13개 HTTP Request → Basic LLM Chain 전환. n8n UI 수동 작업 권장 | 🟡 중 |
| Telegram Inline Keyboard | 완성 알림에 "검증 실행" 버튼 추가 | 🟢 낮음 |
| Queue Mode | Railway Redis 추가 → Phase 1 진짜 병렬 실행 (37초→5초) | 🟢 낮음 |
| WF1-A 설문지 경로 | Form Trigger → GDrive JSON 저장 (미구현) | 🔴 높음 |

---

## 참조: 현재 WF2 노드 ID 맵 (Stage 3-4)

| 노드명 | ID | 용도 |
|--------|-----|------|
| Hallucination 검증 준비 | `s34-a1` | system_prompt + user message 조립 |
| Hallucination 검증 API | `s34-a2` | Claude Haiku HTTP Request |
| 검증 결과 통합 | `s34-a3` | API 응답 파싱 + final_report 조립 |
| reports 서브폴더 검색 | `s34-b1` | GDrive 검색 |
| reports 폴더 확인 | `s34-b2` | IF 분기 |
| reports 폴더 생성 | `s34-b2c` | GDrive 폴더 생성 |
| reports 폴더 ID 확정 | `s34-b3` | Code — ID 추출 |
| logs 서브폴더 검색 | `s34-b4` | GDrive 검색 |
| logs 폴더 확인 | `s34-b5` | IF 분기 |
| logs 폴더 생성 | `s34-b5c` | GDrive 폴더 생성 |
| logs 폴더 ID 확정 | `s34-b6` | Code — ID 추출 |
| JSON 초안 직렬화 | `s34-c1` | Code — binary 생성 |
| JSON 초안 저장 | `s34-c2` | GDrive upload |
| Log 직렬화 | `s34-c1b` | Code — binary 생성 |
| Hallucination 로그 저장 | `s34-c3` | GDrive upload |
| HTML 보고서 변환 | `s34-c4` | Code — HTML 생성 |
| HTML 보고서 저장 | `s34-c5` | GDrive upload |
| 완성 메시지 구성 | `s34-c6` | Code — Telegram 메시지 조립 |
| 완성 알림 | `s34-d1` | Telegram 전송 |

## 참조: 크레덴셜 ID

| 크레덴셜 | ID | 노드 사용처 |
|---------|-----|-----------|
| Telegram | `8T0Q83WRhTEEdvSL` | 모든 Telegram 노드 |
| Google Drive | `fcKtWyui68XESQND` | 모든 GDrive 노드 |
| Anthropic (환경변수) | `$env.ANTHROPIC_API_KEY` | Hallucination 검증 API |
| Error Workflow | `4ox2lxKl1st6pUkY` | WF2 settings.errorWorkflow |

---

> **Claude Code 작업 규칙**:
> 1. 세션 A와 세션 B를 절대 합치지 말 것. 세션 A 완료 → E2E 테스트 → 세션 B 순서 준수
> 2. 수정 시 n8n-mcp의 updateNode/addNode/addConnection 사용. 한 번에 1개 노드씩 수정
> 3. 노드명 변경(rename)과 연결 변경(rewire)을 같은 batch에서 하지 말 것
> 4. 모든 Code 노드 수정 후 jsCode가 유효한 JavaScript인지 문법 확인
> 5. 작업 완료 후 PROGRESS_LOG.md에 세션 기록 추가
