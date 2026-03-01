// ========== 音声入力フック ==========
import { useEffect, useRef, useState } from "react";

export function useSpeechInput(onResult) {
    const recognitionRef = useRef(null);
    const [listening, setListening] = useState(false);

    useEffect(() => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("このブラウザは音声認識に対応していません");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = "ja-JP";
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            onResult(text);
            setListening(false);
        };

        recognition.onend = () => setListening(false);
        recognition.onerror = (err) => {
            console.error("SpeechRecognition error:", err);
            setListening(false);
        };

        recognitionRef.current = recognition;
    }, [onResult]);

    const startListening = () => {
        if (!recognitionRef.current) {
            alert("このブラウザは音声入力に対応していません");
            return;
        }
        setListening(true);
        recognitionRef.current.start();
    };

    return { listening, startListening };
}
