const BLOCKED = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bdocument\b/,
  /\bwindow\b/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bimport\s*\(/,
  /\bimport\s+/,
  /\bprocess\b/,
  /\bglobalThis\b/,
  /\bnavigator\b/,
];

export function extractScript(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:javascript|js|ts)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();
  else text = text.replace(/```(?:javascript|js|ts)?/gi, "").replace(/```/g, "").trim();

  const lines = text.split("\n");
  const start = lines.findIndex((line) =>
    /^(const|let|var|\/\/|return\b|function\b|for\s*\(|if\s*\(|class\b)/.test(line.trim()),
  );
  if (start > 0) text = lines.slice(start).join("\n").trim();

  text = text.replace(/^\s*export\s+default\s+/gm, "");
  text = text.replace(/^\s*export\s+/gm, "");
  text = text.replace(/^\s*import\s.+;?\s*$/gm, "");
  text = text.trim();

  if (text && !/\breturn\b/.test(text)) {
    text += "\nreturn typeof group !== 'undefined' ? group : null;";
  }
  return text;
}

export function assertSafeScript(code: string) {
  if (!code.trim()) throw new Error("Script is empty.");
  if (code.length > 20000) throw new Error("Script is too large to run.");
  for (const rule of BLOCKED) {
    if (rule.test(code)) {
      throw new Error("Generated script used a blocked API and was not run.");
    }
  }
}

export function compileModel(
  THREE: typeof import("three"),
  code: string,
): import("three").Object3D {
  const script = extractScript(code);
  assertSafeScript(script);
  const runner = new Function(
    "THREE",
    `"use strict";\n${script}`,
  ) as (THREE: typeof import("three")) => unknown;
  const result = runner(THREE);
  if (!result || typeof result !== "object" || !(result instanceof THREE.Object3D)) {
    throw new Error("Script must return a THREE.Object3D (Mesh or Group).");
  }
  return result;
}
