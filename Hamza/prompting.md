# Prompting and How It Works in DeepWiki

DeepWiki leverages AI models to dynamically generate Wiki pages corresponding to specific source code functionalities. The technique of "prompting" essentially gives the structural framework, tone, and constraints to the AI on how to interpret and format the knowledge found in the codebase.

## Technical Explanation

Prompt engineering is implemented primarily on two different levels of the application:
1. **Frontend UI Generation Prompts:** Located in `src/utils/prompts.ts`, this utility dynamically builds the prompt strings sent to the backend. It varies the instructions based on user configurations:
   - **Language:** Prompts dictate the generation in the localized language requested by the User (e.g. `English`, `French (Français)`, or `Japanese (日本語)`).
   - **Report Type:** Depending on if the report is `Technical` or `Functional`, entirely different system behaviors are loaded. `Technical` asks for architecture, markdown elements, and Mermaid diagrams (e.g., Sequence Diagrams). `Functional` adopts the persona of a Business Analyst, generating structural Business Rules (BRs) and Use Cases (UCs) in a FEX format.
2. **Backend RAG Prompts:** Located in `api/prompts.py`, used by the Chat/Ask functionality to provide conversational Retrieval-Augmented Generation context.

## Relevant Code Snippets

### 1. Dynamic UI Generation Prompt (`src/utils/prompts.ts`)
This file returns a prompt formatted as a string interpolation based on multiple user parameters (`wikiPageTopic`, `relevantSourceFiles`, `language`, `reportType`).

```typescript
export const getWikiGenerationPrompt = (
    wikiPageTopic: string,
    relevantSourceFiles: string[],
    language: string = 'en',
    reportType: 'technical' | 'functional' = 'functional'
): string => {
    // Determine language name string
    const languageName = /* Language mapping logic... */;

    if (reportType === 'technical') {
        return \`[WIKI_GENERATION][WIKI_TOPIC:\${wikiPageTopic}]
You are an expert technical writer and software architect.
Your task is to generate a comprehensive and accurate technical wiki page...

1.  **Detailed Sections:** Break down "\${wikiPageTopic}" into logical sections...
2.  **Mermaid Diagrams:** EXTENSIVELY use Mermaid diagrams (e.g., \\\`flowchart TD\\\`, \\\`sequenceDiagram\\\`)
3.  **Source Citations:** For EVERY piece of significant information... use the exact format: \\\`Sources: [filename.ext:start_line-end_line]()\\\`
...
IMPORTANT: Generate the content in \${languageName}.
\`;
    }

    // Default to functional prompt (FEX structure)
    return \`[WIKI_GENERATION][WIKI_TOPIC:\${wikiPageTopic}]
Model's Role and Tone
You are a functional Business Analyst in a large bank.
You must produce a structured Functional Requirement Document (FEX)...
\`;
};
```

### 2. RAG Chat System Prompt (`api/prompts.py`)
This prompt is used by the conversational agent to query existing codebases, strictly defining its behavior to parse context.

```python
RAG_SYSTEM_PROMPT = r"""
You are a code assistant which answers user questions on a Github Repo.
You will receive user query, relevant context, and past conversation history.

LANGUAGE DETECTION AND RESPONSE:
- Detect the language of the user's query
- Respond in the SAME language as the user's query

FORMAT YOUR RESPONSE USING MARKDOWN:
- Use proper markdown syntax for all formatting
- For code blocks, use triple backticks with language specification
- Do NOT include ```markdown fences at the beginning or end of your answer.
"""
```
