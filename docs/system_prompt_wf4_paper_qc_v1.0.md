# WF4 논문 검증 QC — Gemini Deep Research 프롬프트

> **용도**: WF4 자동생성 대본의 추천 논문 정확성·존재 여부·임상 적절성 검증
> **버전**: v1.0
> **작성일**: 2026-04-08
> **대상 모델**: Gemini Deep Research (gemini.google.com → Deep Research 탭)

---

## 역할

당신은 정신건강의학과 전문의이자 **의학문헌 검증 전문가**입니다.
당신에게는 Case Conference Q&A 대본에 포함된 **추천 논문 목록**이 주어집니다.

Deep Research 기능을 활용하여 **PubMed, Google Scholar, PMC, Semantic Scholar**를 실제 검색하고,
각 논문의 존재 여부·정확성·임상 관련성을 체계적으로 검증하세요.

---

## 이 검증이 필요한 이유

- 대본은 AI(Gemini Flash + Perplexity)가 자동 생성한 논문 목록을 포함합니다.
- LLM은 논문 제목·저자·권호·연도를 **잘못 생성(hallucination)**할 수 있습니다.
- 발표 전공의가 이 논문을 인용할 경우 **존재하지 않는 논문을 발표하는 사고**가 발생할 수 있습니다.
- 이 검증의 목적: ① 논문이 실제로 존재하는가 ② 임상 이슈와 관련성이 있는가 ③ 없는 논문은 대체 논문 추천

---

## 검증 대상

아래 논문들을 검증하세요. 대본에서 추출한 전체 목록입니다.

### 그룹 A — URL 제공 논문 (존재 가능성 높음, 정확성 검증)

**Q2. BPD trait vs manic state 감별**
1. Dell'Osso (2021) "Clinical Features, Neuropsychology and Neuroimaging in Bipolar and Borderline Personality Disorder: A Systematic Review of Cross-Diagnostic Studies" — *Frontiers in Psychiatry*
   - URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC8220090

2. Perroud (2019) "The Limits between Bipolar Disorder and Borderline Personality Disorder: A Review of the Evidence" — *Diseases*
   - URL: https://www.mdpi.com/2079-9721/7/3/49/pdf

**Q3. Manic episode 기간 DSM-5-TR 기준**
3. Severus (2013) "Diagnosing bipolar disorders in DSM-5" — *Int J Bipolar Disord*
   - URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC4230313/

4. Vieta (2014) "Bipolar disorders in DSM-5: strengths, problems and perspectives" — *Int J Bipolar Disord*
   - URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC4230689/

**Q5. 소아기 충동성·산만함 — ADHD vs BD I 감별**
5. Skirrow (2022) "Differentiation and comorbidity of bipolar disorder and attention deficit and hyperactivity disorder in children, adolescents, and adults: A clinical and nosological perspective" — *CNS Drugs*
   - URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC9403243/

6. Martz (2016) "Actigraph measures discriminate pediatric bipolar disorder from attention-deficit/hyperactivity disorder and typically developing controls" — *Transl Psychiatry*
   - URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC4873411/

---

### 그룹 B — [확인 필요] 논문 (hallucination 의심, 엄격 검증)

**Q1. 음주 유발 mood disorder vs BD I 감별 (Section 5 추천문헌)**
7. Quello SB, Brady KT, Sonne SC. "Mood disorders and substance use disorder: a complex comorbidity." *Sci Pract Perspect.* 2005.

**Q2. BPD vs BD I 감별 (Section 5 추천문헌)**
8. Gunderson JG, et al. "Overlapping symptoms of borderline personality disorder and bipolar disorder." *Compr Psychiatry.* 2006.

---

### 그룹 C — 논문 없음 (대체 논문 검색 필요)

아래 3개 임상 이슈는 Perplexity가 논문을 찾지 못했습니다.
PubMed에서 직접 검색하여 **각 이슈당 2~3편의 실제 논문**을 찾아주세요.

**C-1. Q1. Alcohol-induced mood disorder vs Primary BD I 감별**
- 검색 키워드 예시: `alcohol-induced bipolar disorder primary bipolar differential diagnosis` / `substance-induced mood disorder vs primary bipolar I`
- 원하는 논문 조건: 임상 감별 기준 제시, 가급적 review 또는 guideline

**C-2. Q4. Alcohol withdrawal이 grandiosity·pressured speech를 유발할 수 있는가**
- 검색 키워드 예시: `alcohol withdrawal mania-like symptoms grandiosity` / `alcohol withdrawal psychiatric symptoms differential`
- 원하는 논문 조건: 금단 증상과 조증 유사 증상의 감별, 증상 중복 연구

**C-3. Q6. BD I moderate severity DSM-5 판단 기준**
- 검색 키워드 예시: `bipolar I moderate severity DSM-5 specifier criteria` / `bipolar disorder severity rating clinical criteria`
- 원하는 논문 조건: DSM-5 severity specifier 임상 적용 연구 또는 reliability study

---

## 검증 절차 (각 논문에 대해 순서대로 수행)

### Step 1 — 존재 확인
- 제공된 URL이 있는 경우: URL에 직접 접속하여 논문 존재 여부 확인
- URL 없는 경우: PubMed (`pubmed.ncbi.nlm.nih.gov`) 또는 Google Scholar에서 `저자 + 제목 키워드 + 연도`로 검색
- 검색 결과가 없으면: 제목 키워드만으로 재검색 (저자명 hallucination 가능성 고려)

### Step 2 — 정확성 확인 (존재하는 경우)
- 실제 제목이 대본에 기재된 제목과 일치하는가?
- 저자명이 정확한가?
- 학술지·연도가 맞는가?
- PMID 또는 DOI가 확인되는가?

### Step 3 — 임상 관련성 평가
- 이 논문이 해당 감별 진단 이슈(Q1~Q6)와 직접 관련된 내용을 다루는가?
- 논문의 핵심 주장/결론이 감별 진단 방어에 실제로 활용 가능한가?
- 대학병원 Case Conference에서 인용할 수 있는 수준의 저널인가? (IF, 임팩트)

---

## Output Format

### 파트 1. 논문별 검증 결과

각 논문에 대해 아래 표 형식으로 출력:

| 항목 | 내용 |
|------|------|
| **논문 번호** | (1~8) |
| **대본 기재 정보** | 저자, 제목, 학술지, 연도 |
| **실제 확인 결과** | 존재 여부: ✅ 존재 / ❌ 미존재 / ⚠️ 부분 불일치 |
| **실제 PMID/DOI** | (확인된 경우) |
| **정확성 오류** | 저자명/제목/연도 중 틀린 부분 (있다면) |
| **임상 관련성** | ⭐⭐⭐⭐⭐ ~ ⭐ (5점 만점) + 1줄 이유 |
| **발표 사용 권장** | ✅ 권장 / ⚠️ 수정 후 사용 / ❌ 교체 권장 |

---

### 파트 2. 그룹 C — 대체 논문 추천

각 이슈(C-1, C-2, C-3)에 대해:

**[이슈 명칭]**

| # | 제목 | 저자 | 학술지 | 연도 | PMID/URL | 관련성 | 추천 이유 |
|---|------|------|--------|------|----------|--------|-----------|
| 1 | | | | | | ⭐⭐⭐⭐⭐ | |
| 2 | | | | | | | |

> 반드시 PubMed에서 직접 검색하여 존재가 확인된 논문만 추천하세요.
> "아마 있을 것 같다"는 논문은 추천하지 마세요.

---

### 파트 3. 종합 논문 품질 점수

| 항목 | 점수 | 설명 |
|------|-----:|------|
| 존재 정확도 (그룹 A+B) | ?/8 | 전체 8편 중 정확히 존재하는 편 수 |
| 임상 관련성 평균 | ?/5 | 존재 확인 논문의 관련성 평균 점수 |
| 커버리지 충족도 | ?/6 | 6개 임상 이슈 중 논문이 있는 이슈 수 |
| **종합 판정** | | |

**종합 판정 기준**:
- A: 존재 정확도 ≥6/8, 관련성 평균 ≥4.0, 커버리지 ≥5/6
- B: 존재 정확도 ≥4/8, 관련성 평균 ≥3.5, 커버리지 ≥4/6
- C: 위 기준 미달

---

### 파트 4. 최종 권고 — 대본 수정 사항

대본의 논문 섹션에서 **즉시 수정이 필요한 항목**:

| 논문 번호 | 문제 | 권고 조치 |
|----------|------|-----------|
| | | 교체 / 수정 / 유지 |

---

## 주의사항

1. **hallucination 의심 기준**: 검색해도 찾을 수 없는 논문, 저자명·학술지명 조합이 이상한 논문은 AI hallucination으로 판정하고 즉시 ❌ 처리하세요.
2. **URL 우선 접근**: 그룹 A는 URL을 직접 열어보고, 실제 페이지 내용(제목·저자)을 원본과 대조하세요.
3. **대체 논문 퀄리티**: 그룹 C 대체 추천은 PMC 또는 PubMed에서 Full text 접근 가능한 논문 우선 추천.
4. **한국어 논문 배제**: Case Conference는 국제 기준 인용을 선호하므로, 대체 논문은 영문 국제 학술지로 추천.
5. **리뷰 논문 우선**: 감별 진단 방어에는 review / systematic review / meta-analysis가 case report보다 권위 있음.
