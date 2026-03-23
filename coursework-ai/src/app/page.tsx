'use client';

/**
 * @file page.tsx
 * @description Root essay editor page. Owns all state and wires all components.
 *
 * @module app/page
 */

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { WritingTask, WritingResponse, EssayTone, CourseLevel, WritingRequest } from '@/lib/ai/types';
import { countWords, insertAtCursor, replaceSelection } from '@/lib/utils/text';
import { DEFAULT_WORD_TARGET } from '@/lib/utils/constants';
import EssayEditor from '@/components/EssayEditor';
import AssignmentForm from '@/components/AssignmentForm';
import TaskToolbar from '@/components/TaskToolbar';
import ActionPanel from '@/components/ActionPanel';
import OutputPanel from '@/components/OutputPanel';

// ─── Clerk conditional ────────────────────────────────────────────────────────

// NEXT_PUBLIC_* vars are inlined at build time — safe to read at module level.
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ─── Page component ───────────────────────────────────────────────────────────

export default function EditorPage() {
  // ── Document state ──────────────────────────────────────────────────────────
  const [documentText,     setDocumentText]     = useState('');
  const [documentTitle,    setDocumentTitle]     = useState('');
  const [assignmentPrompt, setAssignmentPrompt]  = useState('');
  const [thesis,           setThesis]            = useState('');
  const [tone,             setTone]              = useState<EssayTone>('academic');
  const [courseLevel,      setCourseLevel]       = useState<CourseLevel>('undergraduate');
  const [wordTarget,       setWordTarget]        = useState<number>(DEFAULT_WORD_TARGET);

  // ── Task state ──────────────────────────────────────────────────────────────
  const [activeTask,  setActiveTask]  = useState<WritingTask | null>(null);
  const [runningTask, setRunningTask] = useState<WritingTask | null>(null);
  const [userInput,   setUserInput]   = useState('');
  const [response,    setResponse]    = useState<WritingResponse | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  // ── Selection state ─────────────────────────────────────────────────────────
  // Stored as indices so handleReplace can use the correct range even after
  // the textarea loses focus when the user clicks a button in OutputPanel.
  const [hasSelection,     setHasSelection]     = useState(false);
  const [selectionStart,   setSelectionStart]   = useState(0);
  const [selectionEnd,     setSelectionEnd]     = useState(0);

  // ── Editor ref ──────────────────────────────────────────────────────────────
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const wordCount = countWords(documentText);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSelectionChange() {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    setSelectionStart(start);
    setSelectionEnd(end);
    setHasSelection(start !== end);
  }

  function handleFormChange(field: string, value: string | number) {
    switch (field) {
      case 'documentTitle':    setDocumentTitle(String(value));      break;
      case 'assignmentPrompt': setAssignmentPrompt(String(value));   break;
      case 'thesis':           setThesis(String(value));             break;
      case 'tone':             setTone(value as EssayTone);          break;
      case 'courseLevel':      setCourseLevel(value as CourseLevel); break;
      case 'wordTarget':       setWordTarget(Number(value));         break;
    }
  }

  async function handleRun() {
    if (!activeTask) return;

    // Read selection from stored state (captured on last selection event).
    const selectedText = hasSelection
      ? documentText.slice(selectionStart, selectionEnd) || undefined
      : undefined;

    setRunningTask(activeTask);
    setLoading(true);
    setError(null);

    const body: WritingRequest = {
      task:             activeTask,
      documentText:     documentText || undefined,
      selectedText,
      assignmentPrompt: assignmentPrompt || undefined,
      thesis:           thesis || undefined,
      documentTitle:    documentTitle || undefined,
      tone,
      courseLevel,
      wordTarget,
      userInput:        userInput || undefined,
    };

    try {
      const res  = await fetch('/api/ai/write', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({
        success: false,
        error: { message: `HTTP ${res.status}` },
      }));

      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Something went wrong.');
      } else {
        setResponse(json.data as WritingResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setRunningTask(null);
      setLoading(false);
    }
  }

  function handleInsert(text: string) {
    const el        = editorRef.current;
    // Use stored cursor position; fall back to end of document.
    const cursorPos = el?.selectionStart ?? documentText.length;
    const { text: newText, newCursorPos } = insertAtCursor(documentText, text, cursorPos);
    setDocumentText(newText);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }

  function handleReplace(text: string) {
    // Use the stored selection indices — these are captured when the user
    // selects text, so they remain correct even after the textarea loses focus.
    const { text: newText, newCursorPos } = replaceSelection(
      documentText,
      text,
      selectionStart,
      selectionEnd
    );
    setDocumentText(newText);
    // Clear stored selection since the range no longer maps to the new text.
    setHasSelection(false);
    setSelectionStart(newCursorPos);
    setSelectionEnd(newCursorPos);
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="coursework.ai" className="h-8 w-auto" />
          <Link href="/chat" className="text-xs text-slate-500 hover:text-indigo-600 transition-colors">
            Chat assistant →
          </Link>
        </div>
        {clerkEnabled && <ClerkUserButton />}
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left sidebar */}
        <aside className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white px-4 py-4">
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Assignment
            </p>
            <AssignmentForm
              assignmentPrompt={assignmentPrompt}
              documentTitle={documentTitle}
              thesis={thesis}
              tone={tone}
              courseLevel={courseLevel}
              wordTarget={wordTarget}
              onChange={handleFormChange}
              disabled={loading}
            />
          </section>

          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Tasks
            </p>
            <TaskToolbar
              activeTask={activeTask}
              onSelectTask={setActiveTask}
              runningTask={runningTask}
              hasSelection={hasSelection}
              disabled={loading}
            />
          </section>

          <section>
            <ActionPanel
              activeTask={activeTask}
              onRun={handleRun}
              loading={loading}
              hasSelection={hasSelection}
              userInput={userInput}
              onUserInputChange={setUserInput}
            />
          </section>
        </aside>

        {/* Right content area */}
        <main className="flex flex-1 min-w-0 gap-4 p-4 overflow-hidden">

          {/* Editor column — selection events bubble up from the textarea */}
          <div
            className="flex flex-col flex-1 min-w-0 min-h-0"
            onSelect={handleSelectionChange}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
          >
            {documentTitle && (
              <h1 className="text-base font-semibold text-slate-800 mb-2 truncate px-1">
                {documentTitle}
              </h1>
            )}
            <EssayEditor
              ref={editorRef}
              value={documentText}
              onChange={setDocumentText}
              wordCount={wordCount}
              disabled={loading}
            />
          </div>

          {/* Output column */}
          <div className="w-80 shrink-0 overflow-y-auto">
            <OutputPanel
              response={response}
              loading={loading}
              onInsert={handleInsert}
              onReplace={handleReplace}
              error={error}
            />
          </div>

        </main>
      </div>
    </div>
  );
}

// ─── Clerk UserButton (conditional) ──────────────────────────────────────────

function ClerkUserButton() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { UserButton } = require('@clerk/nextjs');
    return <UserButton afterSignOutUrl="/sign-in" />;
  } catch {
    return null;
  }
}
