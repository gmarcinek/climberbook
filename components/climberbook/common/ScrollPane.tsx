"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./ScrollPane.module.css";

type ScrollPaneProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  viewportClassName?: string;
  viewportStyle?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  thumbColor?: string;
  thumbHoverColor?: string;
};

function joinClasses(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function ScrollPane({
  children,
  className,
  style,
  viewportClassName,
  viewportStyle,
  contentClassName,
  contentStyle,
  thumbColor = "#99999933",
  thumbHoverColor = "#999999",
}: ScrollPaneProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [thumbMetrics, setThumbMetrics] = useState({
    visible: false,
    height: 0,
    offset: 0,
  });

  useEffect(() => {
    const viewportNode = viewportRef.current;
    const contentNode = contentRef.current;

    if (!viewportNode || !contentNode) {
      return;
    }

    const updateThumb = () => {
      const { clientHeight, scrollHeight, scrollTop } = viewportNode;
      const maxScrollTop = scrollHeight - clientHeight;

      if (clientHeight <= 0 || maxScrollTop <= 1) {
        setThumbMetrics({ visible: false, height: 0, offset: 0 });
        return;
      }

      const nextThumbHeight = Math.max(
        (clientHeight / scrollHeight) * clientHeight,
        24,
      );
      const travel = clientHeight - nextThumbHeight;
      const nextOffset = travel <= 0 ? 0 : (scrollTop / maxScrollTop) * travel;

      setThumbMetrics({
        visible: true,
        height: nextThumbHeight,
        offset: nextOffset,
      });
    };

    updateThumb();

    viewportNode.addEventListener("scroll", updateThumb, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateThumb();
    });

    resizeObserver.observe(viewportNode);
    resizeObserver.observe(contentNode);

    return () => {
      viewportNode.removeEventListener("scroll", updateThumb);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={joinClasses(styles.root, className)}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={viewportRef}
        className={joinClasses(styles.viewport, viewportClassName)}
        style={viewportStyle}
      >
        <div
          ref={contentRef}
          className={joinClasses(styles.content, contentClassName)}
          style={contentStyle}
        >
          {children}
        </div>
      </div>

      {thumbMetrics.visible && (
        <div className={styles.indicator} aria-hidden="true">
          <div
            className={styles.thumb}
            style={{
              height: thumbMetrics.height,
              transform: `translateY(${thumbMetrics.offset}px)`,
              background: isHovered ? thumbHoverColor : thumbColor,
            }}
          />
        </div>
      )}
    </div>
  );
}
