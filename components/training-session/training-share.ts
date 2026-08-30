import type {
  ClimberbookFullDatabaseBackup,
  TrainingRecord,
} from "@/lib/climbs-db";
import { toBlob } from "html-to-image";
import { formatReportedAttempts } from "./training-session.utils";

const canvasWidth = 1080;
const canvasHeight = 1350;

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines = wrapText(context, text, maxWidth);
  lines.forEach((line, index) =>
    context.fillText(line, x, y + index * lineHeight),
  );
  return y + lines.length * lineHeight;
}

function formatShareDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

function getTrainingType(training: TrainingRecord) {
  if (training.customSessionType?.trim())
    return training.customSessionType.trim();
  if (!training.surfaces.length) return "Trening wspinaczkowy";

  return training.surfaces
    .slice(0, 3)
    .map(
      (surface) =>
        (
          ({
            lina: "Wspinanie z liną",
            baldy: "Bouldering",
            moon: "MoonBoard",
            drazek: "Drążek",
            spraywall: "Spraywall",
            kilter: "Kilter Board",
            silownia: "Siłownia",
            chwytotablica: "Chwytotablica",
            campus: "Campus",
            bieznia: "Bieżnia",
            rower: "Rower",
            bieg: "Bieg",
            treking: "Trekking",
          }) as const
        )[surface],
    )
    .join(" • ");
}

function formatDuration(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return hours
    ? `${hours} godz. ${minutes ? `${minutes} min` : ""}`
    : `${minutes} min`;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("training_share_image_failed"));
    }, "image/png");
  });
}

export async function createTrainingShareImage(training: TrainingRecord) {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("training_share_canvas_unavailable");

  context.fillStyle = "#f4f1e7";
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.fillStyle = "#153d35";
  context.fillRect(0, 0, canvasWidth, 330);
  context.fillStyle = "#d66d3a";
  context.fillRect(0, 316, canvasWidth, 14);

  context.fillStyle = "#f4f1e7";
  context.font = "600 35px Georgia, serif";
  context.fillText("CLIMBERBOOK", 84, 100);
  context.fillStyle = "#b9d6c2";
  context.font = "500 26px Arial, sans-serif";
  context.fillText("DZIENNIK TRENINGOWY", 84, 145);

  context.fillStyle = "#ffffff";
  context.font = "700 62px Georgia, serif";
  drawWrappedText(context, getTrainingType(training), 84, 235, 880, 72);

  const cardX = 84;
  const cardY = 410;
  const cardWidth = 912;
  const cardHeight = 650;
  context.fillStyle = "#ffffff";
  context.fillRect(cardX, cardY, cardWidth, cardHeight);
  context.strokeStyle = "#d9d1c0";
  context.lineWidth = 2;
  context.strokeRect(cardX, cardY, cardWidth, cardHeight);

  context.fillStyle = "#697067";
  context.font = "600 24px Arial, sans-serif";
  context.fillText(formatShareDate(training.date).toUpperCase(), 132, 490);
  context.fillStyle = "#183d35";
  context.font = "700 44px Georgia, serif";
  drawWrappedText(
    context,
    training.facilityName || "Sesja wspinaczkowa",
    132,
    560,
    790,
    54,
  );

  const stats = [
    ["CZAS", formatDuration(training.durationMinutes)],
    ["KALORIE", `${Math.max(training.caloriesBurned, 0)} kcal`],
    ["WSTAWKI", formatReportedAttempts(training)],
  ];
  stats.forEach(([label, value], index) => {
    const x = 132 + index * 274;
    context.fillStyle = "#d66d3a";
    context.fillRect(x, 720, 188, 8);
    context.fillStyle = "#697067";
    context.font = "600 21px Arial, sans-serif";
    context.fillText(label, x, 774);
    context.fillStyle = "#183d35";
    context.font = "700 38px Georgia, serif";
    drawWrappedText(context, value, x, 830, 210, 45);
  });

  const grades = Object.values(training.difficultyBySurface ?? {})
    .flatMap((value) => value?.split(",") ?? [])
    .map((grade) => grade.trim())
    .filter(Boolean)
    .slice(0, 6);
  context.fillStyle = "#697067";
  context.font = "600 21px Arial, sans-serif";
  context.fillText("WYCENY", 132, 950);
  context.fillStyle = "#183d35";
  context.font = "600 30px Arial, sans-serif";
  drawWrappedText(
    context,
    grades.length ? grades.join("  •  ") : "Zapisana sesja treningowa",
    132,
    1000,
    780,
    38,
  );

  context.fillStyle = "#153d35";
  context.fillRect(0, 1170, canvasWidth, 180);
  context.fillStyle = "#f4f1e7";
  context.font = "700 35px Georgia, serif";
  context.fillText("Droga do celu zaczyna się od jednej sesji.", 84, 1254);
  context.fillStyle = "#b9d6c2";
  context.font = "500 25px Arial, sans-serif";
  context.fillText("climberbook", 84, 1304);

  return canvasToBlob(canvas);
}

function waitForFrameLoad(frame: HTMLIFrameElement) {
  return new Promise<void>((resolve, reject) => {
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.addEventListener(
      "error",
      () => reject(new Error("share_frame_failed")),
      {
        once: true,
      },
    );
  });
}

function waitForShareVisuals(frame: HTMLIFrameElement) {
  return new Promise<void>((resolve) => {
    let frames = 0;
    const check = () => {
      const document = frame.contentDocument;
      const shareImage = document?.querySelector("[data-share-image]");
      const hasCharts = document?.querySelector(".recharts-surface, svg");
      if ((shareImage && hasCharts) || frames >= 120) {
        resolve();
        return;
      }
      frames += 1;
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

async function captureShareVisual(shareUrl: string) {
  const frame = document.createElement("iframe");
  frame.src = shareUrl;
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;top:0;left:-10000px;width:520px;height:2400px;border:0;pointer-events:none;";
  document.body.append(frame);

  try {
    await waitForFrameLoad(frame);
    await waitForShareVisuals(frame);
    const shareImage =
      frame.contentDocument?.querySelector<HTMLElement>("[data-share-image]");
    if (!shareImage) return null;

    const sourceWidth = shareImage.scrollWidth;
    const sourceHeight = shareImage.scrollHeight;
    return await toBlob(shareImage, {
      backgroundColor: "#151923",
      canvasWidth: 1080,
      canvasHeight: Math.ceil((sourceHeight / sourceWidth) * 1080),
      pixelRatio: 1,
    });
  } finally {
    frame.remove();
  }
}

async function getShareImage(training: TrainingRecord, shareUrl: string) {
  try {
    const visual = await captureShareVisual(shareUrl);
    if (visual) return visual;
  } catch {
    // Continue to the server-generated fallback image.
  }

  try {
    const response = await fetch(`${shareUrl}/opengraph-image`, {
      cache: "no-store",
    });
    const image = await response.blob();
    if (response.ok && image.type === "image/png") return image;
  } catch {
    // The local canvas image remains available when the public image cannot load.
  }

  return createTrainingShareImage(training);
}

export async function downloadTrainingBackup(
  training: TrainingRecord,
  backup: ClimberbookFullDatabaseBackup,
) {
  const file = new File(
    [JSON.stringify(backup, null, 2)],
    `climberbook-trening-${training.date}-${training.time.replaceAll(":", "-")}.json`,
    { type: "application/json" },
  );
  const shareData = {
    title: "Backup treningu | Climberbook",
    text: `${getTrainingType(training)} - ${formatShareDate(training.date)}`,
    files: [file],
  };

  if (
    navigator.share &&
    (!navigator.canShare || navigator.canShare(shareData))
  ) {
    await navigator.share(shareData);
    return "shared" as const;
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 100);
  return "downloaded" as const;
}
