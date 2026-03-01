// ========== INTRO画面 ==========
import { BrainShower } from "./BrainShower";
import kobusiImg from "../../Images/kobusi.png";

/**
 * イントロ / ホーム画面
 * @param {object} props
 * @param {string} props.stage - アニメーション段階 ("intro"|"moveUp"|"done")
 * @param {function} props.setView - 画面切り替え
 * @param {function} props.setGateOpen - 設定モーダル開閉
 */
export default function IntroScreen({ stage, setView, setGateOpen }) {
    return (
        <div className={`introWrap ${stage}`}>
            {stage === "done" && <BrainShower />}

            <div className="introRow">
                <img src={kobusiImg} alt="拳" className="punchAnim" />
                <h1 className="introTitle">知性の壁をぶち破れ！</h1>
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
