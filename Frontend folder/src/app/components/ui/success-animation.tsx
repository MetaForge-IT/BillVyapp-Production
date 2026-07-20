// @ts-ignore
import confetti from "canvas-confetti";

const COLORS = [
  "#d4af37", "#f59e0b", "#10b981", "#3b82f6",
  "#ec4899", "#8b5cf6", "#ef4444", "#ffffff",
  "#22c55e", "#f97316",
];

export function triggerConfetti() {
  // Initial center blast
  confetti({
    particleCount: 120,
    spread: 100,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.55 },
    colors: COLORS,
    shapes: ["square", "circle"],
    scalar: 1.2,
    gravity: 0.9,
    drift: 0,
  });

  // Delayed second burst
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 80,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.5 },
      colors: COLORS,
      shapes: ["square"],
      scalar: 0.9,
    });
  }, 180);

  // Sides streams
  const end = Date.now() + 2800;
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 65,
      startVelocity: 50,
      origin: { x: 0, y: 0.65 },
      colors: COLORS,
      shapes: ["square", "circle"],
      scalar: 1.1,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 65,
      startVelocity: 50,
      origin: { x: 1, y: 0.65 },
      colors: COLORS,
      shapes: ["square", "circle"],
      scalar: 1.1,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  setTimeout(frame, 100);
}
