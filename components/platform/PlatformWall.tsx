"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import styles from "./PlatformWall.module.css";

type Author = { id: string; displayName: string };
type Comment = {
  id: string;
  author: Author;
  body: string;
  createdAt: string;
};
type Post = {
  id: string;
  author: Author;
  body: string;
  createdAt: string;
  comments: Comment[];
};

async function getJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Operacja nie powiodła się.");
  return data;
}

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export function PlatformWall() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const loadPosts = useCallback(async () => {
    try {
      const data = await getJson<{ posts: Post[] }>(
        await fetch("/api/platform/wall", { cache: "no-store" }),
      );
      setPosts(data.posts);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Nie udało się wczytać tablicy.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((session: { user?: { id?: string } }) =>
        setCurrentUserId(session.user?.id ?? ""),
      )
      .catch(() =>
        setError("Nie udało się potwierdzić konta autora wpisu."),
      );
  }, [loadPosts]);

  const submitPost = async () => {
    const body = draft.trim();
    if (!body) return;
    try {
      await getJson(
        await fetch("/api/platform/wall", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        }),
      );
      setDraft("");
      await loadPosts();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nie udało się opublikować wpisu.",
      );
    }
  };

  const submitComment = async (postId: string) => {
    const body = commentDrafts[postId]?.trim();
    if (!body) return;
    try {
      await getJson(
        await fetch(`/api/platform/wall/${postId}/comments`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        }),
      );
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      await loadPosts();
    } catch (commentError) {
      setError(
        commentError instanceof Error
          ? commentError.message
          : "Nie udało się dodać odpowiedzi.",
      );
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await getJson(
        await fetch(`/api/platform/wall/${postId}`, { method: "DELETE" }),
      );
      await loadPosts();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Nie udało się usunąć wpisu.",
      );
    }
  };

  return (
    <section className={styles.wall} aria-labelledby="platform-wall-title">
      <div className={styles.heading}>
        <span className={styles.eyebrow}>Społeczność</span>
        <h2 id="platform-wall-title">Tablica platformy</h2>
        <p>
          Pisz publicznie do wszystkich zalogowanych użytkowników platformy.
        </p>
      </div>

      <div className={styles.composer}>
        <textarea
          value={draft}
          maxLength={2000}
          rows={3}
          placeholder="Co warto przekazać innym?"
          onChange={(event) => setDraft(event.target.value)}
        />
        <div>
          <small>{draft.length}/2000</small>
          <button type="button" disabled={!draft.trim()} onClick={submitPost}>
            <Send size={16} aria-hidden />
            Publikuj
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {isLoading && <p className={styles.empty}>Ładowanie wpisów…</p>}
      {!isLoading && posts.length === 0 && (
        <p className={styles.empty}>Napisz pierwszy wpis na tablicy.</p>
      )}

      <div className={styles.posts}>
        {posts.map((post) => (
          <article className={styles.post} key={post.id}>
            <header>
              <span className={styles.avatar}>
                {post.author.displayName.charAt(0).toUpperCase()}
              </span>
              <span>
                <strong>{post.author.displayName}</strong>
                <small>{formatTime(post.createdAt)}</small>
              </span>
              {post.author.id === currentUserId && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  aria-label="Usuń wpis"
                  onClick={() => deletePost(post.id)}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              )}
            </header>
            <p>{post.body}</p>

            {post.comments.length > 0 && (
              <div className={styles.comments}>
                {post.comments.map((comment) => (
                  <div key={comment.id}>
                    <strong>{comment.author.displayName}</strong>
                    <span>{comment.body}</span>
                    <small>{formatTime(comment.createdAt)}</small>
                  </div>
                ))}
              </div>
            )}

            <form
              className={styles.commentComposer}
              onSubmit={(event) => {
                event.preventDefault();
                void submitComment(post.id);
              }}
            >
              <MessageCircle size={16} aria-hidden />
              <input
                value={commentDrafts[post.id] ?? ""}
                maxLength={1000}
                placeholder="Dodaj odpowiedź…"
                aria-label={`Odpowiedź do wpisu ${post.author.displayName}`}
                onChange={(event) =>
                  setCommentDrafts((current) => ({
                    ...current,
                    [post.id]: event.target.value,
                  }))
                }
              />
              <button
                type="submit"
                disabled={!commentDrafts[post.id]?.trim()}
                aria-label="Opublikuj odpowiedź"
              >
                <Send size={15} aria-hidden />
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
