"use client";

import { useEffect, useState } from "react";
import {
  BookOpenText,
  Newspaper,
  NotebookPen,
  ScrollText,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EmotButton } from "@/components/climberbook/common/Button";
import { Button } from "@/components/climberbook/common/Button";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import { Modal } from "@/components/climberbook/common/Modal";
import { Panel } from "@/components/climberbook/common/Panel";
import type {
  AgentFeedItemRecord,
  TrainingSummaryRecord,
} from "@/lib/climbs-db";
import styles from "./AnalyticsInsightsWall.module.css";

type InsightsResponse = {
  feedItems: AgentFeedItemRecord[];
  summaries: TrainingSummaryRecord[];
};

type WallItem =
  | { type: "summary"; createdAt: string; item: TrainingSummaryRecord }
  | { type: "feed"; createdAt: string; item: AgentFeedItemRecord };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function FeedIcon({ kind }: { kind: AgentFeedItemRecord["kind"] }) {
  if (kind === "article") return <BookOpenText size={18} aria-hidden="true" />;
  if (kind === "news") return <Newspaper size={18} aria-hidden="true" />;
  return <NotebookPen size={18} aria-hidden="true" />;
}

function MarkdownContent({ children }: { children: string }) {
  return (
    <div style={markdownStyle}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p style={markdownParagraphStyle}>{children}</p>,
          ul: ({ children }) => <ul style={markdownListStyle}>{children}</ul>,
          ol: ({ children }) => <ol style={markdownListStyle}>{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote style={markdownQuoteStyle}>{children}</blockquote>
          ),
          code: ({ children }) => (
            <code style={markdownCodeStyle}>{children}</code>
          ),
          pre: ({ children }) => <pre style={markdownPreStyle}>{children}</pre>,
          table: ({ children }) => (
            <div style={markdownTableWrapStyle}>
              <table style={markdownTableStyle}>{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th style={markdownTableHeaderStyle}>{children}</th>
          ),
          td: ({ children }) => (
            <td style={markdownTableCellStyle}>{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function AnalyticsInsightsWall() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [wallItemToDelete, setWallItemToDelete] = useState<WallItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    void fetch("/api/v1/insights")
      .then(async (response) => {
        if (!response.ok) throw new Error("insights_unavailable");
        return (await response.json()) as InsightsResponse;
      })
      .then((response) => {
        if (isCurrent) setData(response);
      })
      .catch(() => {
        if (isCurrent) setHasFailed(true);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const summaries = data?.summaries ?? [];
  const feedItems = data?.feedItems ?? [];
  const wallItems: WallItem[] = [
    ...summaries.map((item) => ({
      type: "summary" as const,
      createdAt: item.createdAt,
      item,
    })),
    ...feedItems.map((item) => ({
      type: "feed" as const,
      createdAt: item.publishedAt,
      item,
    })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  async function deleteWallItem() {
    if (!wallItemToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/v1/insights", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: wallItemToDelete.item.id,
          itemType: wallItemToDelete.type,
        }),
      });
      if (!response.ok) throw new Error("delete_failed");

      setData((current) =>
        current
          ? {
              feedItems:
                wallItemToDelete.type === "feed"
                  ? current.feedItems.filter(
                      (entry) => entry.id !== wallItemToDelete.item.id,
                    )
                  : current.feedItems,
              summaries:
                wallItemToDelete.type === "summary"
                  ? current.summaries.filter(
                      (entry) => entry.id !== wallItemToDelete.item.id,
                    )
                  : current.summaries,
            }
          : current,
      );
      setWallItemToDelete(null);
    } catch {
      setHasFailed(true);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section style={wallStyle} aria-label="Wall analiz i wiadomości">
      <div style={headingStyle}>
        <div>
          <h2 style={titleStyle}>Analizy, artykuły i wiadomości</h2>
        </div>
        <ScrollText size={22} aria-hidden="true" />
      </div>
      {hasFailed ? (
        <Panel className={styles.wallCard} padding="compact">
          <p style={mutedStyle}>Nie udało się pobrać walla analiz.</p>
        </Panel>
      ) : null}
      {!data && !hasFailed ? (
        <p style={mutedStyle}>Ładowanie wpisów...</p>
      ) : null}
      {data && summaries.length === 0 && feedItems.length === 0 ? (
        <Panel className={styles.wallCard} padding="compact">
          <p style={mutedStyle}>
            Potwierdzone podsumowania i wpisy opublikowane przez asystenta
            pojawią się tutaj.
          </p>
        </Panel>
      ) : null}
      {wallItems.map((wallItem) => {
        if (wallItem.type === "summary") {
          const summary = wallItem.item;
          return (
            <Panel
              key={`summary-${summary.id}`}
              as="article"
              className={styles.wallCard}
              padding="compact"
              gap="xs"
            >
              <div style={wallItemHeaderStyle}>
                <span style={summaryKindStyle}>
                  {summary.scope === "training"
                    ? "Podsumowanie treningu"
                    : summary.scope === "week"
                      ? "Podsumowanie tygodnia"
                      : "Podsumowanie miesiąca"}
                </span>
                <EmotButton
                  variant="ghost"
                  size="small"
                  aria-label="Usuń podsumowanie z walla"
                  title="Usuń z walla"
                  onClick={() => setWallItemToDelete(wallItem)}
                  style={wallDeleteButtonStyle}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </EmotButton>
              </div>
              <h3 style={itemTitleStyle}>{summary.content.title}</h3>
              <MarkdownContent>{summary.content.text}</MarkdownContent>
            </Panel>
          );
        }

        const feedItem = wallItem.item;
        return (
          <Panel
            key={`feed-${feedItem.id}`}
            as="article"
            className={styles.wallCard}
            padding="compact"
            gap="xs"
          >
            <div style={wallItemHeaderStyle}>
              <div style={feedMetaStyle}>
                <FeedIcon kind={feedItem.kind} />
                <span>
                  {feedItem.kind === "article"
                    ? "Artykuł"
                    : feedItem.kind === "news"
                      ? "Wiadomość"
                      : "Notatka treningowa"}
                </span>
                <time dateTime={feedItem.publishedAt}>
                  {formatDate(feedItem.publishedAt)}
                </time>
              </div>
              <EmotButton
                variant="ghost"
                size="small"
                aria-label="Usuń wpis z walla"
                title="Usuń z walla"
                onClick={() => setWallItemToDelete(wallItem)}
                style={wallDeleteButtonStyle}
              >
                <Trash2 size={16} aria-hidden="true" />
              </EmotButton>
            </div>
            <h3 style={itemTitleStyle}>{feedItem.title}</h3>
            <MarkdownContent>{feedItem.body}</MarkdownContent>
          </Panel>
        );
      })}
      {wallItemToDelete ? (
        <Modal
          labelledBy="wall-delete-confirmation-title"
          onClose={() => {
            if (!isDeleting) setWallItemToDelete(null);
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>
                Nieodwracalna akcja
              </p>
              <h2
                id="wall-delete-confirmation-title"
                style={{ margin: "4px 0 0", fontSize: "1.2rem" }}
              >
                Usunąć {wallItemToDelete.type === "summary" ? "podsumowanie" : "wpis"} z walla?
              </h2>
            </div>
            <FormActions layout="inline" marginTop="none">
              <Button
                variant="secondary"
                disabled={isDeleting}
                onClick={() => setWallItemToDelete(null)}
              >
                Anuluj
              </Button>
              <Button variant="danger" disabled={isDeleting} onClick={() => void deleteWallItem()}>
                {isDeleting ? "Usuwanie..." : "Usuń"}
              </Button>
            </FormActions>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

const wallStyle = { display: "grid", gap: "0.75rem" };
const wallDeleteButtonStyle = {
  background: "#ffffff1a",
  borderColor: "#ffffff40",
  color: "var(--theme-text)",
};
const headingStyle = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
};
const eyebrowStyle = {
  color: "var(--accent)",
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase" as const,
};
const titleStyle = { fontSize: "1.25rem", margin: "0.1rem 0 0" };
const itemTitleStyle = { fontSize: "1.75rem", margin: 0 };
const markdownStyle = {
  display: "grid",
  gap: "0.75rem",
  minWidth: 0,
};
const markdownParagraphStyle = {
  lineHeight: 1.2,
  margin: 0,
};
const markdownListStyle = {
  lineHeight: 1.55,
  margin: 0,
  paddingLeft: "1.25rem",
};
const markdownQuoteStyle = {
  borderLeft: "3px solid var(--accent)",
  color: "var(--muted)",
  margin: 0,
  paddingLeft: "0.75rem",
};
const markdownCodeStyle = {
  background: "var(--surface-strong)",
  borderRadius: "3px",
  fontFamily: "monospace",
  fontSize: "0.9em",
  padding: "0.08em 0.3em",
};
const markdownPreStyle = {
  background: "var(--surface-strong)",
  margin: 0,
  overflowX: "auto" as const,
  padding: "0.75rem",
};
const markdownTableWrapStyle = { maxWidth: "100%", overflowX: "auto" as const };
const markdownTableStyle = {
  borderCollapse: "collapse" as const,
  fontSize: "0.88rem",
  minWidth: "100%",
};
const markdownTableHeaderStyle = {
  borderBottom: "1px solid var(--border)",
  fontWeight: 700,
  padding: "0.5rem",
  textAlign: "left" as const,
  whiteSpace: "nowrap" as const,
};
const markdownTableCellStyle = {
  borderBottom: "1px solid var(--border)",
  padding: "0.5rem",
  verticalAlign: "top" as const,
};
const mutedStyle = { color: "var(--muted)", margin: 0 };
const summaryKindStyle = {
  color: "var(--component-calendar-highlight)",
  fontSize: "0.78rem",
  fontWeight: 700,
};
const wallItemHeaderStyle = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  gap: "0.75rem",
};
const feedMetaStyle = {
  alignItems: "center",
  color: "var(--muted)",
  display: "flex",
  fontSize: "0.8rem",
  gap: "0.45rem",
};
