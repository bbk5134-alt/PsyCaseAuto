// ======================================================
// HTML 보고서 변환 노드 v2 (Dual-Layer 대응)
// D-27: escapeHtml + \n->br 변환 적용
// Step 1-1: [U] 태그 변환, After->Affect 오타 교정 추가
// Step 1-2: sectionMap 번호 수정, Informants h2, IX/X placeholder 추가
// Step 2-6: VIII. Progress Notes 섹션 추가, cleanNarrative markdown 후처리 추가
// QC fix P1 (2026-04-03): narrative JSON 문자열 파싱 후 narrative 추출
// QC fix P2 (2026-04-03): Progress Notes [U]-><u> 변환 누락 수정
// QC fix P6 (2026-04-03): h1/bold 중복 헤더 제거 (내러티브 첫 줄 섹션 제목 제거)
// QC fix P7 (2026-04-03): extractNarrative — 코드펜스 제거 + 불량 JSON regex fallback (S11/S12)
// ======================================================

const ctx = $('보고서 준비').first().json;
const sections = ctx.final_report?.all_sections || {};
const pc = ctx.patient_code || 'PT-UNKNOWN';
const ds = ctx.date_str || $now.toFormat('yyyyMMdd');

const escapeHtml = (s) => {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const cleanNarrative = (s) => {
  if (!s) return s;
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\\-\s?/gm, '')
    .replace(/^-\s?/gm, '')
    .replace(/^##\s?/gm, '');
};

// QC fix P6: 첫 줄이 섹션 제목인 경우 제거 (h1과 중복 소지)
const stripLeadingHeader = (s) => {
  if (!s) return s;
  const lines = s.split('\n');
  const firstLine = lines[0].trim();
  const headerPattern = /^(\*\*)?([IVXLCDM]+|\d+)\.\s+.(\*\*)?$|^<strong>[^<]+<\/strong>$/i;
  if (headerPattern.test(firstLine)) {
    lines.shift();
    while (lines.length > 0 && lines[0].trim() === '') lines.shift();
    return lines.join('\n');
  }
  return s;
};

const toHtml = (s) => {
  if (!s) return '<p class="miss">[정보 없음]</p>';
  const escaped = escapeHtml(s);
  const withUnderline = escaped.replace(/\[U\](.*?)\[\/U\]/gi, '<u>$1</u>');
  const withInference = withUnderline.replace(/\[추론\](.*?)\[\/추론\]/gi, '<span class="inference">$1</span>');
  const cleaned = cleanNarrative(withInference);
  return '<p>' + cleaned
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>') + '</p>';
};

// QC fix P1 + P7: narrative 추출
// P1: narrative가 JSON 문자열인 경우 파싱 후 추출
// P7: 코드펜스(```json) 제거 + JSON.parse 실패 시 regex fallback (S11/S12 대응)
const extractNarrative = (n, key) => {
  // 오브젝트로 전달된 경우 (보고서 준비 노드가 inner object를 직접 전달)
  if (typeof n === 'object' && n !== null) {
    const inner = n[key] || n;
    if (inner && typeof inner.narrative === 'string') {
      let nar = inner.narrative.trim();
      nar = nar.replace(/^```(?:json)?\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim();
      if (nar.startsWith('{')) {
        try {
          const reparsed = JSON.parse(nar);
          const reinner = reparsed[key] || reparsed;
          if (reinner && typeof reinner.narrative === 'string') return reinner.narrative;
        } catch(e) {}
        const narMatch = nar.match(/"narrative"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/i);
        if (narMatch) {
          try { return JSON.parse('"' + narMatch[1] + '"'); } catch(e) {
            return narMatch[1].replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\\"/g,'"').replace(/\\\\/g,'\\');
          }
        }
      }
      return nar;
    }
    if (typeof n.narrative === 'string') return n.narrative;
    return n; // 추출 불가 시 원본 반환
  }

  if (typeof n !== 'string') return n;

  let s = n.trim();

  // P7-1: 마크다운 코드펜스 제거 (S12: ```json\n{...}\n``` 형태)
  s = s.replace(/^```(?:json)?\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim();

  if (!s.startsWith('{')) return n;

  // P7-2: 표준 JSON.parse 시도
  try {
    const parsed = JSON.parse(s);
    const inner = parsed[key] || parsed;
    if (inner && typeof inner.narrative === 'string') {
      let nar = inner.narrative.trim();
      nar = nar.replace(/^```(?:json)?\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim();
      if (nar.startsWith('{')) {
        try {
          const reparsed = JSON.parse(nar);
          const reinner = reparsed[key] || reparsed;
          if (reinner && typeof reinner.narrative === 'string') return reinner.narrative;
        } catch(e) {}
        const narMatch = nar.match(/"narrative"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/i);
        if (narMatch) {
          try { return JSON.parse('"' + narMatch[1] + '"'); } catch(e) {
            return narMatch[1].replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\\"/g,'"').replace(/\\\\/g,'\\');
          }
        }
      }
      return nar;
    }
    if (typeof parsed.narrative === 'string') return parsed.narrative;
  } catch(e) {}

  // P7-3: JSON.parse 실패 시 regex fallback (S11: 불량 JSON 대응)
  // "narrative":"..." 값을 정규식으로 직접 추출
  const narMatch = s.match(/"narrative"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/i);
  if (narMatch) {
    try {
      return JSON.parse('"' + narMatch[1] + '"');
    } catch(e) {
      // JSON 디코딩도 실패 시 최소한의 unescape만 적용
      return narMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }

  return n;
};

const nar = (key) => {
  const sec = sections[key];
  if (!sec) return '<p class="miss">[섹션 미생성]</p>';
  let n = sec.narrative || sec.content;
  if (!n) return '<p class="miss">[narrative 없음]</p>';
  n = extractNarrative(n, key);
  // QC fix P6: 첫 줄 섹션 제목 제거
  n = stripLeadingHeader(n);
  if (key === 'progress_notes') {
    n = n.replace(/\bAfter:/g, 'Affect:');
  }
  const isDraft = sec.meta?.confidence === 'draft';
  const prefix = isDraft ? '<span class="draft">⚠️ AI 초안 — 전공의 검토 필요</span><br>' : '';
  return prefix + toHtml(n);
};

let h = '<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="UTF-8">\n<style>\n  body { font-family: Malgun Gothic, sans-serif; font-size: 11pt; margin: 2cm; line-height: 1.6; }\n  h1 { font-size: 14pt; border-bottom: 2px solid #333; margin-top: 24pt; padding-bottom: 4pt; }\n  h2 { font-size: 12pt; margin-top: 16pt; }\n  .alert { color: #c00; font-weight: bold; font-size: 13pt; border: 2px solid #c00; padding: 8px; margin: 12px 0; }\n  .draft { color: #c60; font-style: italic; font-size: 9pt; }\n  .miss { color: red; font-style: italic; }\n  .inference { color: #888; font-style: italic; }\n  @media print { .inference { display: none; } }\n  p { margin: 4pt 0; }\n</style>\n</head>\n<body>';

h += '<h1 style="text-align:center;border:none">Case Conference Report</h1>';
h += '<p style="text-align:center">환자코드: ' + escapeHtml(pc) + ' | 생성일: ' + ds.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + '</p>';

if (ctx.final_report?.alert === 'HIGH_SUICIDE_RISK') {
  h += '<div class="alert">⚠️ HIGH SUICIDE RISK — 즉시 안전 평가 필요</div>';
}

h += '<h1>I. Identifying Data</h1>';
h += nar('identifying_data');

h += '<h1>II. Chief Problems &amp; Durations</h1>';
h += nar('chief_problems');
h += '<h2>Informants &amp; Reliability</h2>';
h += nar('informants');

h += '<h1>III. Present Illness</h1>';
h += nar('present_illness');

h += '<h1>IV. Past History &amp; Family History</h1>';
h += nar('past_family_history');

h += '<h1>V. Personal History</h1>';
h += nar('personal_history');

h += '<h1>VI. Mental Status Examination</h1>';
h += nar('mental_status_exam');

h += '<h1>VII. Mood Chart</h1>';
h += nar('mood_chart');

const progressData = sections['progress_notes'];
if (progressData && progressData.narrative) {
  h += '<h1>VIII. Progress Notes</h1>';
  let pNarrative = extractNarrative(progressData.narrative, 'progress_notes');
  // QC fix P6: Progress Notes 첫 줄 섹션 제목 제거
  pNarrative = stripLeadingHeader(pNarrative);
  pNarrative = pNarrative.replace(/\bAfter:/g, 'Affect:');
  const progressLines = pNarrative.split('\n').filter(line => line.trim() !== '');
  for (const line of progressLines) {
    const escaped = escapeHtml(line);
    // QC fix P2: [U]-><u> 변환 (Progress Notes 전용 루프 누락 수정)
    const withUnderline = escaped.replace(/\[U\](.*?)\[\/U\]/gi, '<u>$1</u>');
    // Step 4-3b: [추론]-><span class="inference"> 변환
    const withInference = withUnderline.replace(/\[추론\](.*?)\[\/추론\]/gi, '<span class="inference">$1</span>');
    const cleaned = cleanNarrative(withInference);
    h += '<p>' + cleaned + '</p>';
  }
} else {
  h += '<h1>VIII. Progress Notes</h1><p>[경과 기록 없음 — 면담 데이터 확인 필요]</p>';
}

h += '<h1>IX. Diagnostic Formulation</h1>';
h += nar('diagnostic_formulation');

h += '<h1>X. 사회사업팀 평가</h1>';
h += '<p>본 섹션은 해당 팀에서 작성합니다.</p>';

h += '<h1>XI. 심리팀 평가</h1>';
h += '<p>본 섹션은 해당 팀에서 작성합니다.</p>';

h += '<h1>XII. Case Formulation</h1>';
h += nar('case_formulation');

h += '<h1>XIII. Psychodynamic Formulation</h1>';
h += nar('psychodynamic_formulation');

h += '</body></html>';

const base64 = Buffer.from(h, 'utf-8').toString('base64');
const reports_folder_id = $('reports 폴더 ID 확정').first().json.reports_folder_id;

return [{ json: { ...ctx, html_content: h, reports_folder_id }, binary: { data: { data: base64, mimeType: 'text/html', fileName: ctx.docx_filename || (pc + '_report.html') } } }];