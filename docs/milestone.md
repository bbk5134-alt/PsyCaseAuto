전체 구조를 파악했습니다. Claude.ai 요청 단위로 자를 최적 지점을 설계하겠습니다.

---

## PsyCaseAuto — Claude.ai 연동 마일스톤 로드맵

### 설계 원칙

| 원칙 | 이유 |
|------|------|
| Claude.ai 세션당 **2개 이하** 프롬프트 제작 | 집중력 유지, 섹션 간 혼선 방지 |
| 섹션별 **QC 점수 + 구조 유사성** 기준으로 묶음 | 비슷한 형식 규칙을 한 번에 처리 |
| **공통 템플릿 먼저** → 각 섹션 프롬프트 | 스키마 불일치(P-02) 방지 |
| Claude Code 검증 구간은 **파일 생성 후 + E2E 전** | 프롬프트 구조 확인 후 n8n 투입 |

---

### 📍 Milestone 0 — 공통 Dual-Layer 템플릿 제작 *(Claude.ai → Claude Code)*

**Claude.ai 요청 내용**
```
PsyCaseAuto Sub-WF용 공통 Dual-Layer 시스템 프롬프트 템플릿을 제작해줘.
포함 요소:
1. Anti-Hallucination Rules 블록 (narrative에 JSON 태그·source_ref·기계적 태그 절대 금지)
2. Dual-Layer JSON 출력 스키마 (narrative/structured/meta 구조, 키명 확정)
3. 6-element 프롬프트 구조 헤더 (Role → Anti-Halluc → 형식 규칙 → Task → Gold Standard → Output Format)
4. JSON 안전 규칙 (큰따옴표 이스케이프 지시)
5. Error Handling 공통 블록 (누락 정보 → [정보 없음] 처리)
```

**Claude Code 작업**: `docs/prompts/00_common_template.md` 저장  
**✅ 검증 포인트**: Dual-Layer JSON 스키마 키명 확정 → 이후 모든 프롬프트에 동일 키 사용 여부 확인

---

### 📍 Milestone 1 — S08 Progress Notes *(Claude.ai → Claude Code)*

**Claude.ai 요청 내용**
```
S08 Progress Notes 섹션 Dual-Layer 프롬프트 제작 (QC 0/5, 최우선)
핵심 형식 요구사항:
- SOAP 구조 (S:/O:/A:/P: 헤더)
- S) 항목: 환자 구어체 원문 직접 인용
- O) 항목: 객관적 관찰 + 임상 해석
- 날짜 HD#(입원 일수) 포함
Gold Standard 발췌: [원본 보고서 S08 부분 붙여넣기]
Mock 면담 데이터: [stt_20260320.json + stt_20260328.json full_text]
```

**Claude Code 작업**: `docs/prompts/system_prompt_section_08.md` 저장  
**✅ 검증 포인트**: SOAP 구조 + 구어체 원문 인용 형식 확인

---

### 📍 Milestone 2 — S02 Chief Problems + S04 Past/Family Hx *(Claude.ai → Claude Code)*

**Claude.ai 요청 내용**
```
S02 Chief Problems (QC 0.5/5) + S04 Past/Family Hx (QC 0.5/4) Dual-Layer 프롬프트 2개 제작
S02 핵심 형식:
- 번호 목록 + 영문 증상명 병기 (예: 1. 우울감 (Depressed mood))
- Remote onset / Recent onset 구분
S04 핵심 형식:
- 6개 번호 항목 (내과/수술/알레르기/약물/알코올흡연/가족력)
- 투약 형식: 약물명 + 용량 + 기간
Gold Standard 발췌: [S02 + S04 부분]
```

**Claude Code 작업**: `section_02.md`, `section_04.md` 저장  
**✅ 검증 포인트**: 번호 항목 형식, 키명이 Milestone 0 스키마와 일치하는지

---

### 📍 Milestone 3 — S03 Informants + S01 Identifying Data *(Claude.ai → Claude Code)*

**Claude.ai 요청 내용**
```
S03 Informants (QC 0.5/3) + S01 Identifying Data (QC 1/5) Dual-Layer 프롬프트 2개
S03 핵심 형식:
- 서술형 평가 3문장+
- Reliable / Partially reliable / Unreliable 판정 + 근거
S01 핵심 형식:
- 항목:값 줄 나열 (코드명, 연령, 성별, 직업, 의뢰처 등)
- 병전 성격 서술형 산문 (별도 단락)
Gold Standard 발췌: [S01 + S03 부분]
```

**Claude Code 작업**: `section_01.md`, `section_03.md` 저장  
**✅ 검증 포인트**: 항목:값 형식 vs 서술형 분리 구조 확인

---

### 📍 Milestone 4 — S05 Personal History + S06 MSE *(Claude.ai → Claude Code)*

**Claude.ai 요청 내용**
```
S05 Personal History (QC 1/5) + S06 MSE (1.5/5) Dual-Layer 프롬프트 2개
S05 핵심 형식:
- 5단계 소제목 (출생·아동기 / 청소년기 / 대학·대학원 / 직업력 / 연애·가족관계)
- 각 소제목 아래 서술형 산문
S06 핵심 형식:
- 9개 항목 (외모/행동/말/기분/정동/사고흐름/사고내용/지각/인지기능/충동조절)
- 각 항목: (+/-) 표기 + 세부 설명
- Mood: 주관적 진술 인용, Affect: 객관적 기술
Gold Standard 발췌: [S05 + S06 부분]
```

**Claude Code 작업**: `section_05.md`, `section_06.md` 저장  
**✅ 검증 포인트**: MSE (+/-) 표기법 + 9개 항목 완전성

---

### 📍 Milestone 5 — S09 Present Illness *(Claude.ai → Claude Code)* ⚠️ 단독

**Claude.ai 요청 내용**
```
S09 Present Illness (QC 3/12) Dual-Layer 프롬프트 제작 (단독 — 가장 복잡)
핵심 형식:
- FCAB 구조: Facts → Cognition → Affect → Behavior
- 4단락+ 연속 산문 (번호 목록 금지)
- 상대 시점 표현 ("6개월 전", "이별 직후" 등, 절대 날짜 최소화)
- 촉발 사건 → 진행 과정 → 현재 상태 흐름
Gold Standard 발췌: [S09 부분 — 가장 긴 섹션]
Mock 면담 데이터: [양쪽 면담 full_text]
```

**Claude Code 작업**: `section_09.md` 저장  
**✅ 검증 포인트**: FCAB 흐름 + 연속 산문 (JSON 구조 없음) + 상대 시점 표현

---

### 📍 Milestone 6 — S07 Mood Chart + S10 Diagnostic Formulation *(Claude.ai → Claude Code)*

**Claude.ai 요청 내용**
```
S07 Mood Chart (QC 1.5/2) + S10 Diagnostic Formulation (QC 2.5/3) 프롬프트 2개
S07 핵심 형식:
- 0-10 척도 수치 데이터 표 형식
- 복수 면담일 시계열 비교 (초진 vs 경과)
S10 핵심 형식:
- 진단명 한 줄 먼저 (DSM-5-TR 코드 포함)
- 감별 진단 간결하게 이후
Gold Standard 발췌: [S07 + S10 부분]
```

**Claude Code 작업**: `section_07.md`, `section_10.md` 저장  
**✅ 검증 포인트**: 수치 데이터 표 형식, DSM-5 코드 포함 여부

---

### 📍 Milestone 7 — S11 Case Formulation + S12 Psychodynamic *(Claude.ai → Claude Code)*

**Claude.ai 요청 내용**
```
S11 Case Formulation (QC 3/5) + S12 Psychodynamic (QC 2.5/6) 프롬프트 2개
※ 이 두 섹션은 AI 추론 허용 (type:inference 명시 조건)
S11 핵심 형식:
- 4P 모델: Predisposing / Precipitating / Perpetuating / Protective
- Treatment Plan: 구체적 치료 권고 (약물명/치료 접근법)
S12 핵심 형식:
- 3단락+ 연속 산문: 핵심 갈등 → 방어 기제 → 전이/역전이
- 고도 전문 용어 사용 (Object Relations, Transference 등)
- 추론 문장에 [type:inference] 명시
Gold Standard 발췌: [S11 + S12 부분]
```

**Claude Code 작업**: `section_11.md`, `section_12.md` 저장  
**✅ 검증 포인트**: type:inference 태그 규칙 + 4P 구조 완전성

---

### 📍 Milestone 8 — n8n 노드 업데이트 + E2E 테스트 *(Claude Code 전담)*

**Claude Code 작업 (세션 10)**

| 순서 | 작업 | 디버깅 포인트 |
|:----:|------|--------------|
| 1 | Halluc 검증 노드: HTTP Request → AI Agent + Gemini Flash | 응답 형식 JSON 확인 |
| 2 | Sub-WF S01~S08: 프롬프트 교체 + AI Agent 전환 | Phase 1 E2E 실행 확인 |
| 3 | **⚠️ E2E 1차 테스트** (Phase 1만) | 8개 섹션 JSON 파싱 성공 여부 |
| 4 | Sub-WF S09~S12: 프롬프트 교체 + AI Agent 전환 | D-26 null 방어 코드 확인 |
| 5 | HTML 변환 노드 단순화 (escapeHtml + \n→\<br\>) | HTML 렌더링 확인 |
| 6 | **⚠️ E2E 2차 테스트** (전체 + HTML→Docs 변환) | 서식 유지도 확인 |

---

### 📍 Milestone 9 — QC 2차 채점 *(Claude.ai → Claude Code)*

**Claude.ai 요청 내용**
```
QC 채점 프롬프트(quality_check_prompt.md) + Gold Standard + AI 생성 보고서 업로드
→ 100점 만점 채점 결과 + 최하위 3개 섹션 수정 가이드 요청
```

**Claude Code 작업**: QC 결과 JSON 저장, 최하위 섹션 프롬프트 수정  
**✅ 검증 포인트**: 60점+ 달성 여부 (미달 시 Milestone 1~7 반복)

---

### 📍 Milestone 10 — Gemini 비교 테스트 *(Claude Code 전담)*

**조건**: Claude 기준선 QC 확보 후 (D-28 변수 분리 원칙)

| 작업 | 내용 |
|------|------|
| Gemini Pro 전환 | Sub-WF Chat Model → `gemini-3.1-pro-preview` |
| 동일 입력 E2E | 같은 mock 데이터, 같은 프롬프트로 비교 실행 |
| QC 3차 비교 채점 | Claude vs Gemini 점수 비교 |
| 모델 확정 | 높은 점수 모델로 고정 (동점 시 Claude 유지) |

---

### 전체 일정 요약

```
[Claude.ai] M0 공통 템플릿
     ↓
[Claude Code] 파일 저장
     ↓
[Claude.ai] M1 S08 → [Claude.ai] M2 S02+S04 → [Claude.ai] M3 S03+S01
     ↓                      ↓                         ↓
[Claude Code] 각 파일 저장 (12개 완성 후 →)
     ↓
[Claude Code] M8 n8n 업데이트 + E2E 테스트
     ↓  (E2E 통과 후)
[Claude.ai] M9 QC 2차 채점
     ↓  (60점+ 후)
[Claude Code] M10 Gemini 비교
```

---

### Claude.ai 요청 시 항상 첨부할 공통 컨텍스트

Claude.ai에 각 요청을 보낼 때 **매번** 포함해야 하는 항목:

| 첨부물 | 내용 |
|--------|------|
| `00_common_template.md` | M0에서 만든 공통 스키마 (Milestone 0 이후) |
| Gold Standard 해당 섹션 발췌 | 원본 보고서(.docx)에서 해당 섹션 텍스트 복사 |
| Mock 면담 데이터 | `stt_20260320.json` + `stt_20260328.json`의 `full_text` 필드 |
| QC 피드백 | 해당 섹션의 QC 점수 + 감점 이유 |

---

**시작점**: Milestone 0부터 진행하시겠습니까? Claude.ai에 보낼 M0 요청 프롬프트를 지금 작성해 드릴 수 있습니다.