// ========== BrainShower コンポーネント ==========
import { useEffect, useRef } from "react";

export function BrainShower() {
    const containerRef = useRef(null);
    const icons = ["🧠", "💡", "💭", "📘", "🎨", "🔎", "❓", "❗️", "👊"];
    const intervalRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const createBrain = () => {
            const span = document.createElement("span");
            const icon = icons[Math.floor(Math.random() * icons.length)];
            const hue = Math.floor(Math.random() * 360);

            span.textContent = icon;
            span.style.position = "absolute";
            span.style.left = `${Math.random() * 100}%`;
            span.style.top = "-10%";
            span.style.fontSize = `${18 + Math.random() * 24}px`;
            span.style.opacity = 0.6 + Math.random() * 0.4;
            span.style.filter = `drop-shadow(0 0 3px hsl(${hue}, 80%, 70%))`;
            span.style.animation = `fallBrain ${8 + Math.random() * 8}s linear`;
            span.style.transform = `rotate(${Math.random() * 360}deg)`;
            span.style.pointerEvents = "none";

            span.addEventListener("animationend", () => span.remove());

            container.appendChild(span);
        };

        intervalRef.current = setInterval(createBrain, 300);

        return () => {
            clearInterval(intervalRef.current);
        };
    }, []);

    return <div ref={containerRef} className="brain-shower" />;
}
