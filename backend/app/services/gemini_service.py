"""
Gemini AI contribution analysis service.
Analyzes code quality, document contributions, and flags suspicious behavior.
"""

import json
import google.generativeai as genai
from app.config import get_settings
from typing import Optional

settings = get_settings()

# Configure the Gemini SDK
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)


# ── Prompts ─────────────────────────────────────────────────

COMMIT_ANALYSIS_PROMPT = """You are an expert code reviewer evaluating a student's commit in a university group project.
Your job is to objectively assess the quality and significance of this contribution.

**Commit Info:**
- Author: {author}
- Message: {message}
- Files changed: {files_changed}
- Lines added: {additions}
- Lines deleted: {deletions}

**Diff (truncated to 4000 chars):**
```
{diff}
```

**Evaluate on these dimensions (1–10 scale):**
1. **Significance**: Does this add meaningful functionality, fix real bugs, or is it just whitespace/formatting/renaming?
2. **Complexity**: How technically challenging is this change? Simple variable renames = 1, architectural changes = 10.
3. **Quality**: Code style, error handling, documentation, test coverage.

**Also flag suspicious patterns:**
- `trivial`: Mostly whitespace, formatting, or rename-only changes
- `copy_paste`: Large blocks of code that appear copy-pasted without understanding
- `last_minute`: Combined with timestamp context, this may indicate cramming

**Respond ONLY as valid JSON:**
{{
  "significance": <int 1-10>,
  "complexity": <int 1-10>,
  "quality": <int 1-10>,
  "overall_score": <float 0-100>,
  "flags": {{
    "trivial": <bool>,
    "copy_paste": <bool>,
    "last_minute": <bool>
  }},
  "reasoning": "<2-3 sentence explanation>"
}}"""


DOC_ANALYSIS_PROMPT = """You are evaluating a student's writing contribution to a Google Docs/Sheets/Slides document in a university group project.

**Document info:**
- Title: {title}
- Author: {author}
- Number of edits by this author: {edit_count}
- Total revisions in document: {total_revisions}
- Time span of contributions: {time_span}

**Evaluate this student's document contribution:**
1. **Volume** (1-10): How much content did they contribute relative to the document?
2. **Consistency** (1-10): Were contributions spread over time or crammed last-minute?
3. **Quality** (1-10): Based on edit patterns, does this appear to be substantive contribution?

**Respond ONLY as valid JSON:**
{{
  "volume": <int 1-10>,
  "consistency": <int 1-10>,
  "quality": <int 1-10>,
  "overall_score": <float 0-100>,
  "flags": {{
    "trivial": <bool>,
    "last_minute": <bool>
  }},
  "reasoning": "<2-3 sentence explanation>"
}}"""


class GeminiService:
    """Gemini AI analysis client for evaluating contributions."""

    def __init__(self):
        self.model_name = settings.GEMINI_MODEL
        self.model = genai.GenerativeModel(self.model_name)

    async def analyze_commit(
        self,
        author: str,
        message: str,
        diff: str,
        files_changed: int = 0,
        additions: int = 0,
        deletions: int = 0,
    ) -> dict:
        """
        Analyze a single commit using Gemini.
        Returns structured quality assessment.
        """
        prompt = COMMIT_ANALYSIS_PROMPT.format(
            author=author,
            message=message,
            diff=diff[:4000],
            files_changed=files_changed,
            additions=additions,
            deletions=deletions,
        )

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.2,  # Low temp for consistent scoring
                ),
            )
            result = json.loads(response.text)
            return {
                "significance": result.get("significance", 5),
                "complexity": result.get("complexity", 5),
                "quality": result.get("quality", 5),
                "overall_score": result.get("overall_score", 50.0),
                "flags": result.get("flags", {}),
                "reasoning": result.get("reasoning", ""),
                "model_used": self.model_name,
            }
        except Exception as e:
            # Return a neutral fallback if AI fails
            return {
                "significance": 5,
                "complexity": 5,
                "quality": 5,
                "overall_score": 50.0,
                "flags": {},
                "reasoning": f"AI analysis failed: {str(e)}",
                "model_used": self.model_name,
                "error": str(e),
            }

    async def analyze_doc_contribution(
        self,
        title: str,
        author: str,
        edit_count: int,
        total_revisions: int,
        time_span: str,
    ) -> dict:
        """
        Analyze a student's document contribution using Gemini.
        """
        prompt = DOC_ANALYSIS_PROMPT.format(
            title=title,
            author=author,
            edit_count=edit_count,
            total_revisions=total_revisions,
            time_span=time_span,
        )

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            result = json.loads(response.text)
            return {
                "volume": result.get("volume", 5),
                "consistency": result.get("consistency", 5),
                "quality": result.get("quality", 5),
                "overall_score": result.get("overall_score", 50.0),
                "flags": result.get("flags", {}),
                "reasoning": result.get("reasoning", ""),
                "model_used": self.model_name,
            }
        except Exception as e:
            return {
                "volume": 5,
                "consistency": 5,
                "quality": 5,
                "overall_score": 50.0,
                "flags": {},
                "reasoning": f"AI analysis failed: {str(e)}",
                "model_used": self.model_name,
                "error": str(e),
            }
