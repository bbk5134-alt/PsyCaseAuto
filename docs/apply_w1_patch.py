import sys, json
sys.stdout.reconfigure(encoding='utf-8')

fpath = r'C:\Users\bbk51\.claude\projects\C--Users-bbk51-Desktop-Vibe-Coding-PsyCaseAuto\489a448d-9a27-443c-9e32-dd03d0e736a6\tool-results\mcp-n8n-mcp-n8n_get_workflow-1775413368507.txt'
with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

raw_val = content[63085:71314]
once = json.loads('"' + raw_val + '"')
js_code = json.loads('"' + once + '"')  # actual JavaScript

old = "    if (inner && typeof inner.narrative === 'string') return inner.narrative;"

# Build new code - each string is written exactly as desired in the JS file
# Using careful escape notation: \\ in Python string = one backslash in output
new_parts = [
    "    if (inner && typeof inner.narrative === 'string') {",
    "      let nar = inner.narrative.trim();",
    # JS regex: /^```(?:json)?\r?\n?/ and /\r?\n?```\s*$/
    # In Python string: \r = backslash+r needs \\r, \n = backslash+n needs \\n, \s = backslash+s needs \\s
    "      nar = nar.replace(/^```(?:json)?\\r?\\n?/, '').replace(/\\r?\\n?```\\s*$/, '').trim();",
    "      if (nar.startsWith('{')) {",
    "        try {",
    "          const reparsed = JSON.parse(nar);",
    "          const reinner = reparsed[key] || reparsed;",
    "          if (reinner && typeof reinner.narrative === 'string') return reinner.narrative;",
    "        } catch(e) {}",
    # JS regex: /"narrative"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/i
    # In Python: \s = \\s, \\ = \\\\, [ = [, \S = \\S
    '        const narMatch = nar.match(/"narrative"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"/i);',
    "        if (narMatch) {",
    # JSON.parse with escaped quote
    "          try { return JSON.parse('\"' + narMatch[1] + '\"'); } catch(e) {",
    # JS: .replace(/\\n/g,'\n') etc.
    # In JS regex /\\n/: the \\ is one backslash in regex, matches literal \n
    # In Python: /\\\\n/ = /\\n/ in JS
    "            return narMatch[1].replace(/\\\\n/g,'\\n').replace(/\\\\t/g,'\\t').replace(/\\\\\\\"/g,'\"').replace(/\\\\\\\\/g,'\\\\');",
    "          }",
    "        }",
    "      }",
    "      return nar;",
    "    }",
]

new_str = "\n".join(new_parts)

print("Old found:", old in js_code)
new_code = js_code.replace(old, new_str)
print("Replaced:", old not in new_code)
print("New code length:", len(new_code))

# Show the object branch using repr to verify exact chars
idx = new_code.find("if (inner && typeof inner.narrative === 'string') {")
section = new_code[idx:idx+700]
print("\n--- repr of new object branch ---")
print(repr(section))

# Save
outpath = r'C:\Users\bbk51\Desktop\Vibe Coding\PsyCaseAuto\docs\s34c4_final.js'
with open(outpath, 'w', encoding='utf-8') as f:
    f.write(new_code)
print("\nSaved to s34c4_final.js")
