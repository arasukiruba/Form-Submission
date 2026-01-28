
import { FormStructure, Question, QuestionType } from '../types';
import { api } from './apiService';

/**
 * Robustly extracts the JSON payload from the HTML source.
 * Handles nested brackets and strings correctly to avoid regex pitfalls (like semicolons in strings).
 */
function extractFormData(html: string): any {
  const marker = 'FB_PUBLIC_LOAD_DATA_';
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) throw new Error('Could not find form data marker (FB_PUBLIC_LOAD_DATA_). Ensure this is a valid public Google Form.');

  // Find the start of the array assignment
  const startJson = html.indexOf('[', markerIndex);
  if (startJson === -1) throw new Error('Could not find start of form data array.');

  let depth = 0;
  let inString = false;
  let escape = false;
  let endJson = -1;

  // Iterate character by character to find the matching closing bracket
  for (let i = startJson; i < html.length; i++) {
    const char = html[i];
    
    // Handle escaped characters in strings
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }

    // Toggle string state
    if (char === '"') {
      inString = !inString;
      continue;
    }

    // Track bracket depth only outside of strings
    if (!inString) {
      if (char === '[') depth++;
      else if (char === ']') {
        depth--;
        if (depth === 0) {
          endJson = i + 1;
          break;
        }
      }
    }
  }

  if (endJson === -1) throw new Error('Could not find end of form data (unbalanced brackets).');

  const jsonStr = html.substring(startJson, endJson);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse extracted JSON data.');
  }
}

/**
 * Fetches and parses a public Google Form structure.
 * Uses the backend proxy to avoid CORS issues and improve reliability.
 */
export async function analyzeForm(formUrl: string): Promise<FormStructure> {
  // Extract Form ID from URL
  const formIdMatch = formUrl.match(/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (!formIdMatch) {
    throw new Error('Invalid Google Form URL format. Please use the "viewform" link.');
  }
  const formId = formIdMatch[1];
  const viewUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;

  let html = '';
  
  try {
    const result = await api.fetchFormContent(viewUrl);
    html = result.html;
  } catch (e: any) {
    console.error('Backend Fetch Error:', e);
    throw new Error(`Failed to fetch form: ${e.message}. Please check if the URL is correct and public.`);
  }

  if (!html) {
    throw new Error('Retrieved empty content from form URL.');
  }
  
  try {
    const rawData = extractFormData(html);
    const formInfo = rawData[1];
    const items = formInfo[1];
    
    const questions: Question[] = items
      .map((item: any) => {
        // Basic validation of item structure
        if (!Array.isArray(item) || item.length < 5) return null;

        const title = item[1];
        const typeId = item[3];
        const meta = item[4] && item[4][0];
        
        if (!meta) return null;
        
        const entryId = meta[0].toString();
        const required = !!meta[2];
        let type = QuestionType.UNKNOWN;
        let options: any[] | undefined = undefined;
        let scaleLimits: any = undefined;

        // Map Google Form internal type IDs
        switch (typeId) {
          case 0: type = QuestionType.SHORT_ANSWER; break;
          case 1: type = QuestionType.PARAGRAPH; break;
          case 2: type = QuestionType.MULTIPLE_CHOICE; 
            options = meta[1]?.map((opt: any) => ({ value: opt[0] }));
            break;
          case 3: type = QuestionType.DROPDOWN;
            options = meta[1]?.map((opt: any) => ({ value: opt[0] }));
            break;
          case 4: type = QuestionType.CHECKBOX;
            options = meta[1]?.map((opt: any) => ({ value: opt[0] }));
            break;
          case 5: type = QuestionType.LINEAR_SCALE;
            // Handle scale limits if available
            if (meta[3] && meta[3].length >= 2) {
              scaleLimits = { min: meta[3][0], max: meta[3][1] };
            } else {
              scaleLimits = { min: 1, max: 5 };
            }
            break;
          default: type = QuestionType.UNKNOWN;
        }

        if (type === QuestionType.UNKNOWN) return null;

        return {
          id: entryId,
          title,
          type,
          options,
          required,
          scaleLimits
        };
      })
      .filter((q: Question | null): q is Question => q !== null);

    return {
      formId,
      title: formInfo[8] || 'Untitled Form',
      description: formInfo[0] || '',
      questions
    };
  } catch (e) {
    console.error('Parsing error:', e);
    if (e instanceof Error) {
        throw new Error(`Parsing Error: ${e.message}`);
    }
    throw new Error('Failed to parse form structure.');
  }
}

/**
 * Submits data to a Google Form.
 * Since this is cross-origin, we use 'no-cors' mode.
 */
export async function submitResponse(formId: string, responses: Record<string, string | string[]>): Promise<void> {
  const submitUrl = `https://docs.google.com/forms/d/e/${formId}/formResponse`;
  const formData = new URLSearchParams();

  for (const [id, value] of Object.entries(responses)) {
    if (Array.isArray(value)) {
      value.forEach(v => formData.append(`entry.${id}`, v));
    } else {
      formData.append(`entry.${id}`, value);
    }
  }

  try {
    // We pass formData directly as body, browser sets correct headers for form-data or x-www-form-urlencoded
    await fetch(submitUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: formData 
    });
  } catch (error) {
    console.error("Submit Error:", error);
    throw new Error("Failed to submit response. Check network connection.");
  }
}
