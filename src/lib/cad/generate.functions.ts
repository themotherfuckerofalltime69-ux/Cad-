import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { assertSafeScript, extractScript } from "@/lib/cad/compile";

export type GenerateResult = { ok: true; code: string } | { ok: false; error: string };

const SYSTEM = `You are an expert Three.js developer inside a code-CAD CNC tool.
Write JavaScript that builds a machined 3D part using the provided THREE object.
Rules:
- Output ONLY raw JavaScript. No markdown fences, no explanation.
- Do not import anything. THREE is already in scope as a parameter.
- End by returning a THREE.Object3D (Group or Mesh) with: return group;
- Use MeshStandardMaterial (metalness, roughness, color) so parts read as machined metal.
- Units are meters. Keep the part roughly inside a 3x3x3 box centered on the origin.
- Prefer CylinderGeometry, BoxGeometry, TorusGeometry, ConeGeometry, SphereGeometry, LatheGeometry, ExtrudeGeometry, Shape.
- If current model code is provided, modify that design to satisfy the request and return the FULL script.
- No network, DOM, window, document, loaders, or external assets.`;

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text ?? "");
        }
        return "";
      })
      .join("\n");
  }
  return "";
}

export const generateToolpath = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") {
      throw new Error("Missing prompt.");
    }
    const prompt =
      "prompt" in input && typeof input.prompt === "string" ? input.prompt.trim() : "";
    const currentCode =
      "currentCode" in input && typeof input.currentCode === "string" ? input.currentCode : "";
    if (prompt.length < 1 || prompt.length > 2000) {
      throw new Error("Prompt must be 1–2000 characters.");
    }
    return { prompt, currentCode: currentCode.slice(0, 12000) };
  })
  .handler(async ({ data }): Promise<GenerateResult> => {
    setResponseHeaders({ "Cache-Control": "no-store" });
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "AI is not available in this environment." };
    }

    const user = data.currentCode
      ? `Current model code:\n${data.currentCode}\n\nRequested modification:\n${data.prompt}\n\nReturn the full updated script, not a diff.`
      : data.prompt;

    const call = () =>
      fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.3,
          max_tokens: 4096,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
        }),
      });

    try {
      let res = await call();
      if (res.status === 429 || res.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        res = await call();
      }
      if (!res.ok) {
        return { ok: false, error: `xAI API error ${res.status}` };
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const raw = contentToString(body.choices?.[0]?.message?.content);
      const code = extractScript(raw);
      if (!code) return { ok: false, error: "The model returned an empty toolpath." };
      assertSafeScript(code);
      return { ok: true, code };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI generation failed.";
      return { ok: false, error: message };
    }
  });
