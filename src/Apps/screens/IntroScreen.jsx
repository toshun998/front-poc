// ========== INTRO画面 ==========
import { BrainShower } from "./BrainShower";
import kobusiImg from "../../Images/kobusi.png";
import light1Img from "../../Images/light1.png";
import light2Img from "../../Images/light2.png";
/**
 * イントロ / ホーム画面
 * @param {object} props
 * @param {string} props.stage - アニメーション段階 ("intro"|"moveUp"|"done")
 * @param {function} props.setView - 画面切り替え
 * @param {function} props.setGateOpen - 設定モーダル開閉
 * @param {function} props.setStep - ステップ切り替え
 * @param {string} props.teamName - チーム名
 */
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
        width: 120,        // ← サイズ変更（px）
        height: "auto",
        marginLeft: -20,   // ← 左に移動（マイナスで左）
        marginRight: 12,
    }}
/>
                <h1 className="introTitle">知性を灯せ！</h1>
            </div>

            <div className="homeContent">
                <h1 className="mainTitle">
                    思考アスレチック<span className="tm">®</span>
                </h1>
                <h2 className="subTitle seq">
                    <span className="word delay1">気づいて、</span>
                    <span className="word delay2">協働し、</span>
                    <span className="word delay3">調べる</span>
                </h2>

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
            </div>
        </div>
    );
}
