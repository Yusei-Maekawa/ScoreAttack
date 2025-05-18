// スコアの初期値を0で定義
let currentScore = 0;

// 問題開始時刻を格納する変数（正解時に使う）
let questionStartTime = null;

let questions = [];
let currentQuestionIndex = 0;

// テスト時
const MAX_QUESTIONS = 3;

// 本番時（リリース時はこの値を80に変更）
/*
const MAX_QUESTIONS = 80;
*/

// カテゴリごとのファイルパス
const categoryFileMap = {
  fe: "questionDatas/questions_fe_sample.json",
  ip: "questionDatas/questions_ip_sample.json",
  ap: "questionDatas/question_ap.json", // ←ここを修正
  ag: "questionDatas/questions_ag_sample.json"
};

// ゲーム開始時にカテゴリに応じて問題を読み込む
function startGame() {
  const category = document.getElementById('category-select').value;
  fetch(categoryFileMap[category])
    .then(response => response.json())
    .then(data => {
      questions = data;
      currentQuestionIndex = 0;
      startCountdown(startQuestion);
    });
}

/**
 * スコアを画面に表示する関数
 */
function updateScoreDisplay() {
  document.getElementById('score-display').textContent = `スコア: ${currentScore}点`; // 現在スコアを反映
}

/**
 * 問題をスタートし、開始時刻を記録する
 */
function startQuestion() {
  // 問題がなければ何もしない
  if (!questions.length) return;

  if (currentQuestionIndex >= MAX_QUESTIONS) {
    endGame();
    return;
  }

  // ランダムに1問選ぶ（または順番に出したい場合はcurrentQuestionIndexを使う）
  const q = questions[Math.floor(Math.random() * questions.length)];
  // const q = questions[currentQuestionIndex++ % questions.length]; // 順番に出す場合

  // 問題文と選択肢をセット
  document.getElementById('question-container').style.display = 'block';
  document.getElementById('question-text').textContent = q.question;

  const choicesDiv = document.getElementById('choices');
  choicesDiv.innerHTML = ''; // 前の選択肢をクリア

  q.choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.onclick = () => {
      if (idx === q.correct) {
        simulateCorrect();
      } else {
        simulateWrong();
      }
    };
    choicesDiv.appendChild(btn);
  });

  // 問題開始時刻を記録
  questionStartTime = performance.now();
}

/**
 * 問題に正解したときの処理
 */
function simulateCorrect() {
  if (!questionStartTime) return; // 開始前なら無視

  const now = performance.now(); // 現在時刻を取得
  const elapsed = now - questionStartTime; // 経過時間（ミリ秒）

  const maxScorePerQuestion = 60000; // 1問あたりの最大スコア（60秒＝60000ミリ秒）
  const gained = Math.max(0, Math.floor(maxScorePerQuestion - elapsed)); // 時間が短いほど高得点（マイナスにはしない）

  const previousScore = currentScore; // 現在のスコアを保存
  currentScore += gained; // 合計スコア更新

  // 表示をアニメーション付きで更新
  animateScoreChange(previousScore, currentScore);

  createFlyingScore(gained); // 💥ここで加点を飛ばす

  // ポップアップ加点表示 ＋ 音＋○描写
  showResult({ isCorrect: true, scoreGain: gained });

  questionStartTime = null; // 次の問題に備えてリセット

  // ✅ 自動で次の問題をスタート
  startQuestion();
}

/**
 * 問題に不正解だったときの処理
 */
function simulateWrong() {
  showResult({ isCorrect: false }); // ×アニメーションと音再生
  questionStartTime = null; // 次の問題に備えてリセット
  // ✅ 自動で次の問題をスタート
  startQuestion();
}

/**
 * 正解・不正解のアニメーション＋音＋加点表示
 * @param {boolean} isCorrect - 正解ならtrue
 * @param {number} scoreGain - 正解時の加点数
 */
function showResult({ isCorrect, scoreGain = 0 }) {
  const overlay = document.getElementById('result-overlay'); // オーバーレイ領域
  const symbol = document.getElementById('result-symbol'); // SVGの描画対象
  const scoreText = document.getElementById('score-change'); // 加点表示エリア
  const correctSound = document.getElementById('correct-sound'); // 正解音
  const wrongSound = document.getElementById('wrong-sound'); // 不正解音

  symbol.innerHTML = ''; // 前回の〇×を消去

  if (isCorrect) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); // SVGの○作成
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "40");
    circle.setAttribute("stroke-width", "10");
    circle.setAttribute("fill", "none");
    circle.setAttribute("class", "draw");
    symbol.appendChild(circle); // SVGに○追加

    scoreText.textContent = `+${scoreGain}点`; // 加点表示
    correctSound.play(); // 正解音再生
    overlay.className = 'correct'; // 緑色指定
  } else {
    ['line1', 'line2'].forEach((id, idx) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line"); // SVGの×線作成
      line.setAttribute("x1", idx === 0 ? "20" : "80");
      line.setAttribute("y1", "20");
      line.setAttribute("x2", idx === 0 ? "80" : "20");
      line.setAttribute("y2", "80");
      line.setAttribute("stroke-width", "10");
      line.setAttribute("fill", "none");
      line.setAttribute("class", "draw");
      symbol.appendChild(line); // SVGに×線追加
    });

    scoreText.textContent = ''; // 不正解は加点表示なし
    wrongSound.play(); // 不正解音再生
    overlay.className = 'wrong'; // 赤色指定
  }

  // アニメーションを再適用（再表示のためのリセット）
  scoreText.style.animation = 'none';
  void scoreText.offsetWidth;
  scoreText.style.animation = '';

  overlay.style.opacity = 1; // オーバーレイを表示

  // 一定時間後に非表示に戻す
  setTimeout(() => {
    overlay.style.opacity = 0;
  }, 1000);
}

// アニメーションしながらスコアを加算して表示する
function animateScoreChange(from, to) {
  const duration = 500; // アニメーション時間（ms）
  const startTime = performance.now(); // 開始時間

  function update() {
    const now = performance.now(); // 現在時刻
    const elapsed = now - startTime; // 経過時間
    const progress = Math.min(elapsed / duration, 1); // 進捗（0〜1）

    const currentDisplay = Math.floor(from + (to - from) * progress); // 補間値

    // カンマ付きでスコア表示
    document.getElementById('score-display').textContent = `スコア: ${formatWithCommas(currentDisplay)}点`;

    if (progress < 1) {
      requestAnimationFrame(update); // 次のフレームで更新
    }
  }

  update(); // 開始
}

// 数字にカンマを入れる（例: 123456 → "123,456"）
function formatWithCommas(number) {
  return number.toLocaleString('ja-JP'); // 日本語スタイルでカンマ付け
}

// +○○点が画面に浮かんで、スコアに飛んでいく演出
function createFlyingScore(scoreGain) {
  const fly = document.createElement('div'); // 新しい要素を作る
  fly.className = 'score-fly';               // CSSクラスを適用
  fly.textContent = `+${formatWithCommas(scoreGain)}点`; // 加点内容

  // 表示位置（中央に表示、またはボタン付近などに調整可能）
  fly.style.right = '40px';   // 右端からの位置
  fly.style.top = '70px';     // 上端からの位置
  fly.style.left = 'auto';    // 左端は自動調整
  fly.style.transform = 'translateY(0)';  // 初期位置

  document.body.appendChild(fly); // 画面に追加

  // アニメーションが終わったら自動で削除
  setTimeout(() => {
    document.body.removeChild(fly);
  }, 1000); // CSSアニメーション時間と揃える
}

// スタートボタンを押したときの処理
function startCountdown(callback) {
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownText = document.getElementById('countdown-text');
  let count = 3;
  countdownOverlay.style.display = 'flex';
  countdownText.textContent = count;

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownText.textContent = count;
    } else {
      clearInterval(timer);
      countdownOverlay.style.display = 'none';
      if (typeof callback === 'function') callback();
    }
  }, 1000);
}

function endGame() {
  document.getElementById('question-container').style.display = 'none';
  const resultArea = document.getElementById('result-area');
  const resultMsg = document.getElementById('result-message');
  resultMsg.textContent = `ゲーム終了！あなたのスコアは${currentScore}点です`;
  resultArea.style.display = 'block';
}



