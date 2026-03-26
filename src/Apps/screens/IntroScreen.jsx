// ========== INTRO画面 ==========
import { BrainShower } from "./BrainShower";
import light2Img from "../../Images/light2.png";

export default function IntroScreen({ stage, setView, setGateOpen, setStep, teamName }) {
    return (
        <div className={`introWrap ${stage}`}>
            {stage === "done" && <BrainShower />}

            <div className="introRow">
                <img 
                    src={light2Img} 
                    alt="ひらめき" 
                    className="punchAnim"
                    style={{
                        width: 120,
                        height: "auto",
                        marginLeft: -20,
                        marginRight: 12,
                    }}
                />
                <h1 className="introTitle">気づいて、協働し、調べる</h1>
            </div>

            <div className="homeContent">
                <h1 className="mainTitle">
                    思考アスレチック<span className="tm">®</span>
                </h1>

<div className="buttonGroup">
                    <button className="btnPrimary" onClick={() => setView("FRONT")}>
                        スタート
                    </button>
                    <button
                        className="btnSecondary"
                        onClick={() => {
                            setView("FRONT");
                            setStep(teamName ? "roster" : "join");
                            setGateOpen(true);
                        }}
                    >
                        設定から始める
                    </button>
                </div>

<p style={{
    fontSize: "10px",
    color: "#94a3b8",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 1.6,
    opacity: 0,
    transform: "translateY(20px)",
    animation: "fadeInButtons 1s ease forwards",
    animationDelay: "3s",
}}>
    本サービスはOpenAI APIを利用しています。<br />
    OpenAIによる提供・提携・推薦を受けたものではありません。
</p>
            </div>
        </div>
    );
}